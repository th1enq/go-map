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

// Load users
async function loadUsers() {
    console.log('[Admin] Loading users');
    try {
        const users = await API.fetchWithAuth('/api/admin/users');
        console.log('[Admin] Users data:', users);
        
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.role || 'user'}</span></td>
                <td>${user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</td>
                <td>
                    <i class="bi bi-pencil-square action-btn edit-user" data-id="${user.id}"></i>
                    <i class="bi bi-trash action-btn delete-user" data-id="${user.id}"></i>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editUser(id);
            });
        });
        
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteUser(id);
            });
        });
    } catch (error) {
        console.error('[Admin] Users load error:', error);
        showAlert('Failed to load users', 'danger');
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

// Load locations
async function loadLocations() {
    console.log('[Admin] Loading locations');
    try {
        const locations = await API.fetchWithAuth('/api/admin/locations');
        console.log('[Admin] Locations data:', locations);
        
        const tbody = document.getElementById('locations-table-body');
        tbody.innerHTML = '';
        
        locations.forEach(location => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${location.id}</td>
                <td>${location.name}</td>
                <td>${location.address}</td>
                <td>${location.latitude}</td>
                <td>${location.longitude}</td>
                <td>
                    <i class="bi bi-pencil-square action-btn edit-location" data-id="${location.id}"></i>
                    <i class="bi bi-trash action-btn delete-location" data-id="${location.id}"></i>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add event listeners for edit and delete buttons
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
    } catch (error) {
        console.error('[Admin] Locations load error:', error);
        showAlert('Failed to load locations', 'danger');
    }
}

// Load trajectories
async function loadTrajectories() {
    console.log('[Admin] Loading trajectories');
    try {
        const trajectories = await API.fetchWithAuth('/api/admin/trajectories');
        console.log('[Admin] Trajectories data:', trajectories);
        
        const tbody = document.getElementById('trajectories-table-body');
        tbody.innerHTML = '';
        
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