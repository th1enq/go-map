document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        // Redirect to login page if not logged in
        window.location.href = '/login';
        return;
    }
    
    // Check if user is admin
    if (!user || user.role !== 'admin') {
        // Display unauthorized message and redirect
        showAlert('Only administrators can access this page', 'danger');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return;
    }
    
    // Set admin username in nav
    document.getElementById('admin-username').textContent = user.username || 'Admin';
    
    // Initialize UI components
    initNavigation();
    
    // Load dashboard data
    loadStatistics();
    
    // Logout button handler
    document.getElementById('logout-btn').addEventListener('click', function() {
        logout();
    });
});

// API handlers
const API = {
    // Helper function to make authenticated API calls
    async fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            // Handle expired token
            if (response.status === 401) {
                showAlert('Your session has expired. Please log in again.', 'warning');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return null;
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            console.error('API Error:', error);
            showAlert(error.message, 'danger');
            return null;
        }
    },
    
    // Users API methods
    async getUsers() {
        return this.fetchWithAuth('/api/admin/users');
    },
    
    async getUser(id) {
        return this.fetchWithAuth(`/api/admin/users/${id}`);
    },
    
    async createUser(userData) {
        return this.fetchWithAuth('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    async updateUser(id, userData) {
        return this.fetchWithAuth(`/api/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },
    
    async deleteUser(id) {
        return this.fetchWithAuth(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
    },
    
    async getUserCount() {
        return this.fetchWithAuth('/api/admin/users/count');
    },
    
    // Locations API methods
    async getLocations() {
        return this.fetchWithAuth('/api/admin/locations');
    },
    
    async getLocation(id) {
        return this.fetchWithAuth(`/api/admin/locations/${id}`);
    },
    
    async createLocation(locationData) {
        return this.fetchWithAuth('/api/admin/locations', {
            method: 'POST',
            body: JSON.stringify(locationData)
        });
    },
    
    async updateLocation(id, locationData) {
        return this.fetchWithAuth(`/api/admin/locations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(locationData)
        });
    },
    
    async deleteLocation(id) {
        return this.fetchWithAuth(`/api/admin/locations/${id}`, {
            method: 'DELETE'
        });
    },
    
    async getLocationCount() {
        return this.fetchWithAuth('/api/admin/locations/count');
    },
    
    // Trajectories API methods
    async getTrajectories() {
        return this.fetchWithAuth('/api/admin/trajectories');
    },
    
    async getTrajectory(id) {
        return this.fetchWithAuth(`/api/admin/trajectories/${id}`);
    },
    
    async getTrajectoryPoints(id) {
        return this.fetchWithAuth(`/api/admin/trajectories/${id}/points`);
    },
    
    async createTrajectory(trajectoryData) {
        return this.fetchWithAuth('/api/admin/trajectories', {
            method: 'POST',
            body: JSON.stringify(trajectoryData)
        });
    },
    
    async updateTrajectory(id, trajectoryData) {
        return this.fetchWithAuth(`/api/admin/trajectories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(trajectoryData)
        });
    },
    
    async deleteTrajectory(id) {
        return this.fetchWithAuth(`/api/admin/trajectories/${id}`, {
            method: 'DELETE'
        });
    },
    
    async getTrajectoryCount() {
        return this.fetchWithAuth('/api/admin/trajectories/count');
    }
};

// UI initialization functions
function initNavigation() {
    // Navigation tabs functionality
    const tabItems = {
        'dashboard-tab': 'dashboard-section',
        'users-tab': 'users-section',
        'locations-tab': 'locations-section',
        'trajectories-tab': 'trajectories-section'
    };
    
    // Add click event listeners to all tab items
    Object.keys(tabItems).forEach(tabId => {
        const tab = document.getElementById(tabId);
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all tabs
            Object.keys(tabItems).forEach(id => {
                document.getElementById(id).classList.remove('active');
            });
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all content sections
            Object.values(tabItems).forEach(sectionId => {
                document.getElementById(sectionId).style.display = 'none';
            });
            
            // Show selected content section
            document.getElementById(tabItems[tabId]).style.display = 'block';
            
            // Load data for the selected tab
            switch(tabId) {
                case 'users-tab':
                    loadUsers();
                    break;
                case 'locations-tab':
                    loadLocations();
                    break;
                case 'trajectories-tab':
                    loadTrajectories();
                    break;
                default:
                    loadStatistics();
                    break;
            }
        });
    });
    
    // Initialize modal handlers
    initUserModal();
    initLocationModal();
    initTrajectoryModal();
    initDeleteConfirmModal();
}

// Load dashboard statistics
async function loadStatistics() {
    try {
        // Load counts
        const [userCount, locationCount, trajectoryCount] = await Promise.all([
            API.getUserCount(),
            API.getLocationCount(),
            API.getTrajectoryCount()
        ]);
        
        // Update UI with counts
        document.getElementById('users-count').textContent = userCount ? userCount.count : 0;
        document.getElementById('locations-count').textContent = locationCount ? locationCount.count : 0;
        document.getElementById('trajectories-count').textContent = trajectoryCount ? trajectoryCount.count : 0;
    } catch (error) {
        console.error('Error loading statistics:', error);
        showAlert('Failed to load dashboard statistics', 'danger');
    }
}

// User management functions
let currentUsers = [];

function initUserModal() {
    const addUserBtn = document.getElementById('add-user-btn');
    const saveUserBtn = document.getElementById('save-user-btn');
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));
    
    // Add user button click handler
    addUserBtn.addEventListener('click', () => {
        resetUserForm();
        document.getElementById('userModalLabel').textContent = 'Add User';
        userModal.show();
    });
    
    // Save user button click handler
    saveUserBtn.addEventListener('click', async () => {
        if (!validateUserForm()) return;
        
        const userId = document.getElementById('user-id').value;
        const userData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            role: document.getElementById('role').value
        };
        
        // Add password if provided (required for new users)
        const password = document.getElementById('password').value;
        if (password) {
            userData.password = password;
        } else if (!userId) {
            showAlert('Password is required for new users', 'warning');
            return;
        }
        
        let success = false;
        
        if (userId) {
            // Update existing user
            const result = await API.updateUser(userId, userData);
            success = !!result;
        } else {
            // Create new user
            const result = await API.createUser(userData);
            success = !!result;
        }
        
        if (success) {
            userModal.hide();
            showAlert(`User ${userId ? 'updated' : 'created'} successfully`, 'success');
            loadUsers();
        }
    });
}

async function loadUsers() {
    try {
        const users = await API.getUsers();
        if (!users) return;
        
        currentUsers = users;
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Format created_at date
            const createdAt = user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A';
            
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${createdAt}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', () => editUser(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', () => confirmDeleteUser(btn.dataset.id));
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Failed to load users', 'danger');
    }
}

function resetUserForm() {
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
}

function validateUserForm() {
    const form = document.getElementById('user-form');
    return form.checkValidity() && form.reportValidity();
}

async function editUser(userId) {
    const user = currentUsers.find(u => u.id == userId);
    if (!user) return;
    
    // Populate form with user data
    document.getElementById('user-id').value = user.id;
    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email;
    document.getElementById('role').value = user.role;
    document.getElementById('password').value = ''; // Don't populate password
    
    // Update modal title
    document.getElementById('userModalLabel').textContent = 'Edit User';
    
    // Show modal
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));
    userModal.show();
}

function confirmDeleteUser(userId) {
    const user = currentUsers.find(u => u.id == userId);
    if (!user) return;
    
    // Set up confirmation modal
    document.getElementById('delete-confirm-message').textContent = 
        `Are you sure you want to delete user "${user.username}"?`;
    
    // Set up delete button handler
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    confirmDeleteBtn.onclick = async () => {
        const result = await API.deleteUser(userId);
        if (result) {
            showAlert('User deleted successfully', 'success');
            loadUsers();
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
        }
    };
    
    // Show confirmation modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    deleteModal.show();
}

// Location management functions
let currentLocations = [];

function initLocationModal() {
    const addLocationBtn = document.getElementById('add-location-btn');
    const saveLocationBtn = document.getElementById('save-location-btn');
    const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));
    
    // Add location button click handler
    addLocationBtn.addEventListener('click', () => {
        resetLocationForm();
        document.getElementById('locationModalLabel').textContent = 'Add Location';
        locationModal.show();
    });
    
    // Save location button click handler
    saveLocationBtn.addEventListener('click', async () => {
        if (!validateLocationForm()) return;
        
        const locationId = document.getElementById('location-id').value;
        const locationData = {
            name: document.getElementById('location-name').value,
            latitude: parseFloat(document.getElementById('latitude').value),
            longitude: parseFloat(document.getElementById('longitude').value)
        };
        
        let success = false;
        
        if (locationId) {
            // Update existing location
            const result = await API.updateLocation(locationId, locationData);
            success = !!result;
        } else {
            // Create new location
            const result = await API.createLocation(locationData);
            success = !!result;
        }
        
        if (success) {
            locationModal.hide();
            showAlert(`Location ${locationId ? 'updated' : 'created'} successfully`, 'success');
            loadLocations();
        }
    });
}

async function loadLocations() {
    try {
        const locations = await API.getLocations();
        if (!locations) return;
        
        currentLocations = locations;
        const tableBody = document.getElementById('locations-table-body');
        tableBody.innerHTML = '';
        
        locations.forEach(location => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${location.id}</td>
                <td>${location.name}</td>
                <td>${location.latitude.toFixed(6)}</td>
                <td>${location.longitude.toFixed(6)}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-primary edit-location" data-id="${location.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-location" data-id="${location.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-location').forEach(btn => {
            btn.addEventListener('click', () => editLocation(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-location').forEach(btn => {
            btn.addEventListener('click', () => confirmDeleteLocation(btn.dataset.id));
        });
    } catch (error) {
        console.error('Error loading locations:', error);
        showAlert('Failed to load locations', 'danger');
    }
}

function resetLocationForm() {
    document.getElementById('location-form').reset();
    document.getElementById('location-id').value = '';
}

function validateLocationForm() {
    const form = document.getElementById('location-form');
    return form.checkValidity() && form.reportValidity();
}

async function editLocation(locationId) {
    const location = currentLocations.find(l => l.id == locationId);
    if (!location) return;
    
    // Populate form with location data
    document.getElementById('location-id').value = location.id;
    document.getElementById('location-name').value = location.name;
    document.getElementById('latitude').value = location.latitude;
    document.getElementById('longitude').value = location.longitude;
    
    // Update modal title
    document.getElementById('locationModalLabel').textContent = 'Edit Location';
    
    // Show modal
    const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));
    locationModal.show();
}

function confirmDeleteLocation(locationId) {
    const location = currentLocations.find(l => l.id == locationId);
    if (!location) return;
    
    // Set up confirmation modal
    document.getElementById('delete-confirm-message').textContent = 
        `Are you sure you want to delete location "${location.name}"?`;
    
    // Set up delete button handler
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    confirmDeleteBtn.onclick = async () => {
        const result = await API.deleteLocation(locationId);
        if (result) {
            showAlert('Location deleted successfully', 'success');
            loadLocations();
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
        }
    };
    
    // Show confirmation modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    deleteModal.show();
}

// Trajectory management functions
let currentTrajectories = [];

function initTrajectoryModal() {
    const addTrajectoryBtn = document.getElementById('add-trajectory-btn');
    const trajectoryModal = new bootstrap.Modal(document.getElementById('trajectoryModal'));
    
    // Trajectory info button click handler
    addTrajectoryBtn.addEventListener('click', () => {
        showAlert('Adding trajectories through UI is not implemented. Use API directly or import data.', 'info');
    });
}

async function loadTrajectories() {
    try {
        const trajectories = await API.getTrajectories();
        if (!trajectories) return;
        
        currentTrajectories = trajectories;
        const tableBody = document.getElementById('trajectories-table-body');
        tableBody.innerHTML = '';
        
        trajectories.forEach(trajectory => {
            const row = document.createElement('tr');
            
            // Format dates
            const startTime = trajectory.start_time ? new Date(trajectory.start_time).toLocaleString() : 'N/A';
            const endTime = trajectory.end_time ? new Date(trajectory.end_time).toLocaleString() : 'N/A';
            
            row.innerHTML = `
                <td>${trajectory.id}</td>
                <td>${trajectory.user_name || `User #${trajectory.user_id}`}</td>
                <td>${startTime}</td>
                <td>${endTime}</td>
                <td>${trajectory.points_count || 0}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info view-trajectory" data-id="${trajectory.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-trajectory" data-id="${trajectory.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners for view and delete buttons
        document.querySelectorAll('.view-trajectory').forEach(btn => {
            btn.addEventListener('click', () => viewTrajectory(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-trajectory').forEach(btn => {
            btn.addEventListener('click', () => confirmDeleteTrajectory(btn.dataset.id));
        });
    } catch (error) {
        console.error('Error loading trajectories:', error);
        showAlert('Failed to load trajectories', 'danger');
    }
}

async function viewTrajectory(trajectoryId) {
    // Load trajectory details and points
    try {
        const [trajectory, points] = await Promise.all([
            API.getTrajectory(trajectoryId),
            API.getTrajectoryPoints(trajectoryId)
        ]);
        
        if (!trajectory || !points) return;
        
        // Format dates
        const startTime = trajectory.start_time ? new Date(trajectory.start_time).toLocaleString() : 'N/A';
        const endTime = trajectory.end_time ? new Date(trajectory.end_time).toLocaleString() : 'N/A';
        
        // Build details HTML
        let detailsHtml = `
            <div class="mb-4">
                <h5>Trajectory #${trajectory.id}</h5>
                <p><strong>User:</strong> ${trajectory.user_name || `User #${trajectory.user_id}`}</p>
                <p><strong>Start Time:</strong> ${startTime}</p>
                <p><strong>End Time:</strong> ${endTime}</p>
                <p><strong>Points Count:</strong> ${points.length}</p>
            </div>
        `;
        
        if (points.length > 0) {
            detailsHtml += `
                <h5>Points</h5>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Latitude</th>
                                <th>Longitude</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add first 20 points (to avoid too large modal)
            const displayPoints = points.slice(0, 20);
            displayPoints.forEach(point => {
                const timestamp = point.timestamp ? new Date(point.timestamp).toLocaleString() : 'N/A';
                detailsHtml += `
                    <tr>
                        <td>${point.latitude.toFixed(6)}</td>
                        <td>${point.longitude.toFixed(6)}</td>
                        <td>${timestamp}</td>
                    </tr>
                `;
            });
            
            if (points.length > 20) {
                detailsHtml += `
                    <tr>
                        <td colspan="3" class="text-center">
                            Showing 20 of ${points.length} points...
                        </td>
                    </tr>
                `;
            }
            
            detailsHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        // Update modal with details
        document.getElementById('trajectory-details').innerHTML = detailsHtml;
        
        // Show modal
        const trajectoryModal = new bootstrap.Modal(document.getElementById('trajectoryModal'));
        trajectoryModal.show();
    } catch (error) {
        console.error('Error loading trajectory details:', error);
        showAlert('Failed to load trajectory details', 'danger');
    }
}

function confirmDeleteTrajectory(trajectoryId) {
    const trajectory = currentTrajectories.find(t => t.id == trajectoryId);
    if (!trajectory) return;
    
    // Set up confirmation modal
    document.getElementById('delete-confirm-message').textContent = 
        `Are you sure you want to delete trajectory #${trajectory.id}?`;
    
    // Set up delete button handler
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    confirmDeleteBtn.onclick = async () => {
        const result = await API.deleteTrajectory(trajectoryId);
        if (result) {
            showAlert('Trajectory deleted successfully', 'success');
            loadTrajectories();
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
        }
    };
    
    // Show confirmation modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    deleteModal.show();
}

// Delete confirmation modal
function initDeleteConfirmModal() {
    // If ESC is pressed, reset the delete button handler
    document.getElementById('deleteConfirmModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('confirm-delete-btn').onclick = null;
    });
}

// Utility functions
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alert-container');
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHTML;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

function logout() {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    
    // Make API call to the logout endpoint
    fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok && response.status !== 404) {
            throw new Error('Logout failed');
        }
        return response.json().catch(() => ({}));
    })
    .then(data => {
        // Clear localStorage regardless of API response
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Show success message
        showAlert('Successfully logged out', 'success');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    })
    .catch(error => {
        console.error('Logout error:', error);
        
        // Still clear localStorage even if there's an API error
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/login';
    });
}