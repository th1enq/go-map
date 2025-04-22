// Admin page initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Admin] Page loaded');
    
    // Check authentication
    if (!Auth.isLoggedIn()) {
        console.log('[Admin] User not logged in');
        Auth.handleUnauthorized();
        return;
    }

    // Check if user is admin
    if (!Auth.isAdmin()) {
        console.log('[Admin] User is not admin');
        window.location.href = '/';
        return;
    }

    // Set admin username
    const user = Auth.getCurrentUser();
    console.log('[Admin] Setting username:', user.name);
    document.getElementById('admin-username').textContent = user.name || 'Admin';

    // Initialize components
    console.log('[Admin] Initializing components');
    initNavigation();
    initModals();
    loadDashboard();
    initPaginationControls();

    // Add logout handler
    document.getElementById('logout-btn').addEventListener('click', function() {
        console.log('[Admin] Logout clicked');
        Auth.handleLogout();
    });

    document.getElementById('logout-dropdown-btn').addEventListener('click', function() {
        console.log('[Admin] Logout dropdown clicked');
        Auth.handleLogout();
    });
});

// Pagination state
const pagination = {
    users: {
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 100,
        totalItems: 0,
    },
    locations: {
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 100,
        totalItems: 0,
    },
    trajectories: {
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 100,
        totalItems: 0,
    }
};

// Navigation handling
function initNavigation() {
    console.log('[Admin] Initializing navigation');
    
    const tabs = {
        'dashboard-tab': 'dashboard-section',
        'users-tab': 'users-section',
        'locations-tab': 'locations-section',
        'trajectories-tab': 'trajectories-section'
    };

    Object.keys(tabs).forEach(tabId => {
        const tab = document.getElementById(tabId);
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[Admin] Tab clicked:', tabId);

            // Update active tab
            Object.keys(tabs).forEach(id => {
                document.getElementById(id).classList.remove('active');
            });
            this.classList.add('active');

            // Show selected section
            Object.values(tabs).forEach(sectionId => {
                document.getElementById(sectionId).style.display = 'none';
            });
            document.getElementById(tabs[tabId]).style.display = 'block';

            // Load section data
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
                    loadDashboard();
            }
        });
    });
}

// Modal handling
function initModals() {
    console.log('[Admin] Initializing modals');
    
    // User modal
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));
    document.getElementById('add-user-btn').addEventListener('click', function() {
        console.log('[Admin] Add user clicked');
        document.getElementById('userForm').reset();
        document.getElementById('userModalLabel').textContent = 'Add User';
        document.getElementById('user-id').value = '';
        userModal.show();
    });

    // Location modal
    const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));
    document.getElementById('add-location-btn').addEventListener('click', function() {
        console.log('[Admin] Add location clicked');
        document.getElementById('locationForm').reset();
        document.getElementById('locationModalLabel').textContent = 'Add Location';
        locationModal.show();
    });

    // Trajectory modal
    const trajectoryModal = new bootstrap.Modal(document.getElementById('trajectoryModal'));
    document.getElementById('add-trajectory-btn').addEventListener('click', function() {
        console.log('[Admin] Add trajectory clicked');
        document.getElementById('trajectoryForm').reset();
        document.getElementById('trajectoryModalLabel').textContent = 'Add Trajectory';
        trajectoryModal.show();
    });

    // Save user button
    document.getElementById('save-user-btn').addEventListener('click', function() {
        saveUser();
    });

    // Save location button
    document.getElementById('save-location-btn').addEventListener('click', function() {
        saveLocation();
    });

    // Save trajectory button
    document.getElementById('save-trajectory-btn').addEventListener('click', function() {
        saveTrajectory();
    });
}

// Dashboard loading
async function loadDashboard() {
    console.log('[Admin] Loading dashboard');
    try {
        const [users, locations, trajectories] = await Promise.all([
            API.fetchWithAuth('/api/admin/users/count'),
            API.fetchWithAuth('/api/admin/locations/count'),
            API.fetchWithAuth('/api/admin/trajectories/count')
        ]);

        console.log('[Admin] Dashboard data:', { users, locations, trajectories });

        document.getElementById('users-count').textContent = users?.count || 0;
        document.getElementById('locations-count').textContent = locations?.count || 0;
        document.getElementById('trajectories-count').textContent = trajectories?.count || 0;
    } catch (error) {
        console.error('[Admin] Dashboard load error:', error);
        showAlert('Failed to load dashboard data', 'danger');
    }
}

// Load users with pagination
async function loadUsers() {
    console.log('[Admin] Loading users');
    
    // Show loading indicator
    document.getElementById('users-loading').style.display = 'block';
    document.getElementById('users-table-body').innerHTML = '';
    
    try {
        // Calculate offset based on current page
        const offset = (pagination.users.currentPage - 1) * pagination.users.itemsPerPage;
        
        // Fetch users with pagination parameters
        const url = `/api/admin/users?offset=${offset}&limit=${pagination.users.itemsPerPage}`;
        console.log('[Admin] Fetching users from:', url);
        
        const response = await API.fetchWithAuth(url);
        console.log('[Admin] Users data response:', response);
        
        // Hide loading indicator
        document.getElementById('users-loading').style.display = 'none';
        
        // Defensive programming - ensure response is something we can work with
        if (!response) {
            throw new Error('Empty response from server');
        }
        
        // Extract users array from response
        let users = [];
        let total = 0;
        
        // Handle different response formats
        if (response.users && Array.isArray(response.users)) {
            users = response.users;
            total = response.total || users.length;
        } else if (Array.isArray(response)) {
            users = response;
            total = users.length;
        } else if (typeof response === 'object' && response !== null) {
            // If response is an object but not an array, check if any property contains an array
            for (const key in response) {
                if (Array.isArray(response[key])) {
                    users = response[key];
                    break;
                }
            }
            total = response.total || users.length;
        } else {
            throw new Error('Invalid response format from server');
        }
        
        // Ensure users is an array at this point
        if (!Array.isArray(users)) {
            console.error('[Admin] Failed to extract users array from response:', response);
            users = []; // Set to empty array to avoid forEach errors
        }
        
        // Update pagination state - safely
        pagination.users.totalItems = total;
        pagination.users.totalPages = Math.max(1, Math.ceil(pagination.users.totalItems / pagination.users.itemsPerPage));
        
        // Update pagination UI
        updatePaginationUI('users');
        
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }
        
        // Use traditional for loop instead of forEach for better error handling
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            if (!user) continue; // Skip any null/undefined items
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id || 'N/A'}</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.role || 'user'}</span></td>
                <td>${user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</td>
                <td>
                    <i class="bi bi-pencil-square action-btn edit-user" data-id="${user.id || ''}"></i>
                    <i class="bi bi-trash action-btn delete-user" data-id="${user.id || ''}"></i>
                </td>
            `;
            tbody.appendChild(tr);
        }
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (id) editUser(id);
            });
        });
        
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (id) deleteUser(id);
            });
        });
    } catch (error) {
        console.error('[Admin] Users load error:', error);
        document.getElementById('users-loading').style.display = 'none';
        document.getElementById('users-table-body').innerHTML = 
            `<tr><td colspan="6" class="text-center text-danger">Failed to load users: ${error.message || 'Unknown error'}</td></tr>`;
        showAlert(`Failed to load users: ${error.message || 'Unknown error'}`, 'danger');
    }
}

// Edit user
async function editUser(id) {
    console.log('[Admin] Editing user with ID:', id);
    try {
        const user = await API.fetchWithAuth(`/api/admin/users/${id}`);
        
        // Populate form
        document.getElementById('userModalLabel').textContent = 'Edit User';
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-name').value = user.username || '';
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-password').value = ''; // Don't populate password
        document.getElementById('user-role').value = user.role || 'user';
        
        // Show modal
        const userModal = new bootstrap.Modal(document.getElementById('userModal'));
        userModal.show();
    } catch (error) {
        console.error('[Admin] Edit user error:', error);
        showAlert(`Failed to load user: ${error.message}`, 'danger');
    }
}

// Delete user
async function deleteUser(id) {
    console.log('[Admin] Deleting user with ID:', id);
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        await API.fetchWithAuth(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
        
        showAlert('User deleted successfully', 'success');
        loadUsers(); // Reload users list
    } catch (error) {
        console.error('[Admin] Delete user error:', error);
        showAlert(`Failed to delete user: ${error.message}`, 'danger');
    }
}

// Save user (create or update)
async function saveUser() {
    console.log('[Admin] Saving user');
    
    // Get form data
    const userId = document.getElementById('user-id').value;
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    
    if (!name || !email || (!userId && !password)) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    try {
        // Create data object formatted for the backend
        const userData = {
            username: name,  // Renamed from 'name' to 'username' to match backend
            email: email,
            role: role
        };
        
        // Only include password if it's provided (for updates)
        if (password) {
            userData.password = password;
        }
        
        let url = '/api/admin/users';
        let method = 'POST';
        
        // If userId exists, it's an update
        if (userId) {
            url = `/api/admin/users/${userId}`;
            method = 'PUT';
        }
        
        // Make the API call
        const response = await API.fetchWithAuth(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        // Hide modal
        const userModal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
        userModal.hide();
        
        // Show success message
        showAlert(`User ${userId ? 'updated' : 'created'} successfully`, 'success');
        
        // Reload users list
        loadUsers();
    } catch (error) {
        console.error('[Admin] Save user error:', error);
        showAlert(`Failed to save user: ${error.message}`, 'danger');
    }
}

// Load locations with pagination
async function loadLocations() {
    console.log('[Admin] Loading locations');
    
    // Show loading indicator
    document.getElementById('locations-loading').style.display = 'block';
    document.getElementById('locations-table-body').innerHTML = '';
    
    try {
        // Calculate offset based on current page
        const offset = (pagination.locations.currentPage - 1) * pagination.locations.itemsPerPage;
        
        // Fetch locations with pagination parameters
        const response = await API.fetchWithAuth(`/api/admin/locations?offset=${offset}&limit=${pagination.locations.itemsPerPage}`);
        console.log('[Admin] Locations data:', response);
        
        // Hide loading indicator
        document.getElementById('locations-loading').style.display = 'none';
        
        // Update pagination state
        pagination.locations.totalItems = response.total || response.locations.length;
        pagination.locations.totalPages = Math.ceil(pagination.locations.totalItems / pagination.locations.itemsPerPage);
        
        // Update pagination UI
        updatePaginationUI('locations');
        
        // Extract locations array from response
        const locations = response.locations || response;
        
        const tbody = document.getElementById('locations-table-body');
        tbody.innerHTML = '';
        
        if (locations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No locations found</td></tr>';
            return;
        }
        
        locations.forEach(location => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${location.id}</td>
                <td>${location.name || 'N/A'}</td>
                <td>${location.category || 'N/A'}</td>
                <td>${location.latitude?.toFixed(6) || 'N/A'}</td>
                <td>${location.longitude?.toFixed(6) || 'N/A'}</td>
                <td>${location.user_id || 'N/A'}</td>
                <td>
                    <i class="bi bi-pencil-square action-btn edit-location" data-id="${location.id}"></i>
                    <i class="bi bi-trash action-btn delete-location" data-id="${location.id}"></i>
                    <i class="bi bi-geo-alt action-btn view-location" data-id="${location.id}" 
                       data-lat="${location.latitude}" data-lng="${location.longitude}"></i>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add event listeners for edit, delete and view buttons
        document.querySelectorAll('.edit-location').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editLocation(id);
            });
        });
        
        document.querySelectorAll('.delete-location').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteLocation(id);
            });
        });
        
        document.querySelectorAll('.view-location').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const lat = this.getAttribute('data-lat');
                const lng = this.getAttribute('data-lng');
                window.open(`/search?lat=${lat}&lng=${lng}&zoom=18`, '_blank');
            });
        });
    } catch (error) {
        console.error('[Admin] Locations load error:', error);
        document.getElementById('locations-loading').style.display = 'none';
        document.getElementById('locations-table-body').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">Failed to load locations. Please try again.</td></tr>';
        showAlert('Failed to load locations', 'danger');
    }
}

// Load trajectories with pagination
async function loadTrajectories() {
    console.log('[Admin] Loading trajectories');
    
    // Show loading indicator
    document.getElementById('trajectories-loading').style.display = 'block';
    document.getElementById('trajectories-table-body').innerHTML = '';
    
    try {
        // Calculate offset based on current page
        const offset = (pagination.trajectories.currentPage - 1) * pagination.trajectories.itemsPerPage;
        
        // Fetch trajectories with pagination parameters
        const response = await API.fetchWithAuth(`/api/admin/trajectories?offset=${offset}&limit=${pagination.trajectories.itemsPerPage}`);
        console.log('[Admin] Trajectories data:', response);
        
        // Hide loading indicator
        document.getElementById('trajectories-loading').style.display = 'none';
        
        // Update pagination state
        pagination.trajectories.totalItems = response.total || response.trajectories.length;
        pagination.trajectories.totalPages = Math.ceil(pagination.trajectories.totalItems / pagination.trajectories.itemsPerPage);
        
        // Update pagination UI
        updatePaginationUI('trajectories');
        
        // Extract trajectories array from response
        const trajectories = response.trajectories || response;
        
        const tbody = document.getElementById('trajectories-table-body');
        tbody.innerHTML = '';
        
        if (trajectories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No trajectories found</td></tr>';
            return;
        }
        
        trajectories.forEach(trajectory => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${trajectory.id}</td>
                <td>${trajectory.user_id}</td>
                <td>${new Date(trajectory.start_time).toLocaleString()}</td>
                <td>${new Date(trajectory.end_time).toLocaleString()}</td>
                <td>${trajectory.points_count || 0}</td>
                <td>
                    <i class="bi bi-pencil-square action-btn edit-trajectory" data-id="${trajectory.id}"></i>
                    <i class="bi bi-trash action-btn delete-trajectory" data-id="${trajectory.id}"></i>
                    <i class="bi bi-geo-alt action-btn view-trajectory" data-id="${trajectory.id}"></i>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add event listeners for edit, delete and view buttons
        document.querySelectorAll('.edit-trajectory').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editTrajectory(id);
            });
        });
        
        document.querySelectorAll('.delete-trajectory').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteTrajectory(id);
            });
        });
        
        document.querySelectorAll('.view-trajectory').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                viewTrajectory(id);
            });
        });
    } catch (error) {
        console.error('[Admin] Trajectories load error:', error);
        document.getElementById('trajectories-loading').style.display = 'none';
        document.getElementById('trajectories-table-body').innerHTML = 
            '<tr><td colspan="6" class="text-center text-danger">Failed to load trajectories. Please try again.</td></tr>';
        showAlert('Failed to load trajectories', 'danger');
    }
}

// Alert display
function showAlert(message, type = 'success') {
    console.log('[Admin] Showing alert:', message);
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Update pagination UI
function updatePaginationUI(type) {
    const state = pagination[type];
    const startItem = (state.currentPage - 1) * state.itemsPerPage + 1;
    const endItem = Math.min(startItem + state.itemsPerPage - 1, state.totalItems);
    
    // Update page info text
    document.getElementById(`${type}-page-info`).textContent = 
        `Showing ${startItem}-${endItem} of ${state.totalItems} ${type}`;
    
    // Enable/disable pagination buttons
    document.getElementById(`${type}-prev-page`).disabled = state.currentPage <= 1;
    document.getElementById(`${type}-next-page`).disabled = state.currentPage >= state.totalPages;
}

// Initialize pagination controls
function initPaginationControls() {
    // Users pagination
    document.getElementById('users-prev-page').addEventListener('click', () => {
        if (pagination.users.currentPage > 1) {
            pagination.users.currentPage--;
            loadUsers();
        }
    });
    
    document.getElementById('users-next-page').addEventListener('click', () => {
        if (pagination.users.currentPage < pagination.users.totalPages) {
            pagination.users.currentPage++;
            loadUsers();
        }
    });
    
    // Locations pagination
    document.getElementById('locations-prev-page').addEventListener('click', () => {
        if (pagination.locations.currentPage > 1) {
            pagination.locations.currentPage--;
            loadLocations();
        }
    });
    
    document.getElementById('locations-next-page').addEventListener('click', () => {
        if (pagination.locations.currentPage < pagination.locations.totalPages) {
            pagination.locations.currentPage++;
            loadLocations();
        }
    });
    
    // Trajectories pagination
    document.getElementById('trajectories-prev-page').addEventListener('click', () => {
        if (pagination.trajectories.currentPage > 1) {
            pagination.trajectories.currentPage--;
            loadTrajectories();
        }
    });
    
    document.getElementById('trajectories-next-page').addEventListener('click', () => {
        if (pagination.trajectories.currentPage < pagination.trajectories.totalPages) {
            pagination.trajectories.currentPage++;
            loadTrajectories();
        }
    });
}