document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuthentication();

    // Navigation between sections
    setupNavigation();

    // Setup forms
    setupProfileForm();
    setupLocationForm();
    setupTrajectoryForm();
    setupPasswordForm();

    // Setup logout functionality
    document.getElementById('logout-btn').addEventListener('click', logout);
});

// Authentication check
function checkAuthentication() {
    fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = '/login';
            return null;
        }
        return response.json();
    })
    .then(data => {
        if (data) {
            // Update user info in the sidebar
            document.getElementById('user-name').textContent = data.user.name || data.user.username;
            document.getElementById('user-email').textContent = data.user.email;

            // Fill in profile form
            document.getElementById('username').value = data.user.username;
            document.getElementById('email').value = data.user.email;
            document.getElementById('first-name').value = data.user.first_name || '';
            document.getElementById('last-name').value = data.user.last_name || '';
        }
    })
    .catch(error => {
        console.error('Authentication check failed:', error);
        showAlert('Failed to verify authentication. Please try logging in again.', 'danger');
    });
}

// Setup navigation between sections
function setupNavigation() {
    const sections = {
        'personal': document.getElementById('section-personal'),
        'add-location': document.getElementById('section-add-location'),
        'add-trajectory': document.getElementById('section-add-trajectory'),
        'security': document.getElementById('section-security')
    };

    // Get all navigation items
    const navItems = document.querySelectorAll('.list-group-item');

    // Add click event to each navigation item
    navItems.forEach((item, index) => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all sections
            Object.values(sections).forEach(section => {
                section.style.display = 'none';
            });
            
            // Show the corresponding section
            switch(index) {
                case 0: // Personal Information
                    sections.personal.style.display = 'block';
                    break;
                case 1: // My Locations (Add Location)
                    sections['add-location'].style.display = 'block';
                    initLocationMap();
                    break;
                case 2: // My Trajectories (Add Trajectory)
                    sections['add-trajectory'].style.display = 'block';
                    setupTrajectoryMethodToggle();
                    break;
                case 3: // Password & Security
                    sections.security.style.display = 'block';
                    break;
            }
        });
    });
}

// Location map initialization
let locationMap, locationMarker;
function initLocationMap() {
    if (locationMap) {
        locationMap.invalidateSize();
        return;
    }
    
    // Initialize the map if not already initialized
    locationMap = L.map('location-map').setView([21.0278, 105.8342], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(locationMap);

    // Add a marker for the location
    locationMarker = L.marker([21.0278, 105.8342], {
        draggable: true
    }).addTo(locationMap);

    // Update form when marker is moved
    locationMarker.on('dragend', function(event) {
        const position = locationMarker.getLatLng();
        document.getElementById('location-latitude').value = position.lat;
        document.getElementById('location-longitude').value = position.lng;
    });

    // Click on map to set marker position
    locationMap.on('click', function(e) {
        locationMarker.setLatLng(e.latlng);
        document.getElementById('location-latitude').value = e.latlng.lat;
        document.getElementById('location-longitude').value = e.latlng.lng;
    });

    // Update marker when coordinates are changed manually
    const latInput = document.getElementById('location-latitude');
    const lngInput = document.getElementById('location-longitude');
    
    [latInput, lngInput].forEach(input => {
        input.addEventListener('change', function() {
            const lat = parseFloat(latInput.value) || 21.0278;
            const lng = parseFloat(lngInput.value) || 105.8342;
            locationMarker.setLatLng([lat, lng]);
            locationMap.panTo([lat, lng]);
        });
    });
}

// Setup trajectory input method toggle
function setupTrajectoryMethodToggle() {
    const methodSelect = document.getElementById('trajectory-method');
    const manualEntry = document.getElementById('trajectory-manual-entry');
    const fileUpload = document.getElementById('trajectory-file-upload');
    const mapDrawing = document.getElementById('trajectory-map-drawing');

    methodSelect.addEventListener('change', function() {
        // Hide all input methods
        manualEntry.style.display = 'none';
        fileUpload.style.display = 'none';
        mapDrawing.style.display = 'none';

        // Show the selected input method
        switch(this.value) {
            case 'manual':
                manualEntry.style.display = 'block';
                break;
            case 'file':
                fileUpload.style.display = 'block';
                break;
            case 'map':
                mapDrawing.style.display = 'block';
                initTrajectoryMap();
                break;
        }
    });

    // Setup add point button for manual entry
    document.getElementById('add-point-btn').addEventListener('click', addTrajectoryPoint);
}

// Add a new trajectory point for manual entry
let pointCounter = 0;
function addTrajectoryPoint() {
    const container = document.getElementById('trajectory-points-container');
    const pointId = 'point-' + pointCounter++;
    
    const pointHtml = `
        <div id="${pointId}" class="card mb-2">
            <div class="card-body py-2">
                <div class="row g-2">
                    <div class="col-md-3">
                        <input type="number" step="any" class="form-control form-control-sm" placeholder="Latitude" data-field="lat" required>
                    </div>
                    <div class="col-md-3">
                        <input type="number" step="any" class="form-control form-control-sm" placeholder="Longitude" data-field="lng" required>
                    </div>
                    <div class="col-md-3">
                        <input type="number" step="any" class="form-control form-control-sm" placeholder="Altitude" data-field="alt">
                    </div>
                    <div class="col-md-2">
                        <input type="datetime-local" class="form-control form-control-sm" data-field="time" required>
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-sm btn-danger remove-point" data-point-id="${pointId}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', pointHtml);
    
    // Add event listener to remove button
    document.querySelector(`#${pointId} .remove-point`).addEventListener('click', function() {
        document.getElementById(this.dataset.pointId).remove();
    });

    // Set current date time as default for the time field
    const now = new Date();
    const localISOTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.querySelector(`#${pointId} [data-field="time"]`).value = localISOTime;
}

// Trajectory map initialization
let trajectoryMap, trajectoryPath, trajectoryPoints = [];
function initTrajectoryMap() {
    if (trajectoryMap) {
        trajectoryMap.invalidateSize();
        return;
    }
    
    // Initialize the map
    trajectoryMap = L.map('trajectory-map').setView([21.0278, 105.8342], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(trajectoryMap);

    // Initialize the polyline for trajectory
    trajectoryPath = L.polyline([], {
        color: 'blue',
        weight: 3
    }).addTo(trajectoryMap);

    // Click to add trajectory points
    trajectoryMap.on('click', function(e) {
        addTrajectoryPointOnMap(e.latlng.lat, e.latlng.lng);
    });
}

// Add trajectory point on map
function addTrajectoryPointOnMap(lat, lng) {
    const now = new Date();
    const point = {
        lat: lat,
        lng: lng,
        alt: 0,
        time: now
    };
    
    trajectoryPoints.push(point);
    
    // Add marker
    L.marker([lat, lng]).addTo(trajectoryMap);
    
    // Update polyline
    trajectoryPath.setLatLngs(trajectoryPoints.map(p => [p.lat, p.lng]));
    
    // Pan to the point
    trajectoryMap.panTo([lat, lng]);
}

// Setup form submissions
function setupProfileForm() {
    document.getElementById('profile-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            first_name: document.getElementById('first-name').value,
            last_name: document.getElementById('last-name').value
        };
        
        fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }
            return response.json();
        })
        .then(data => {
            showAlert('Profile updated successfully!', 'success');
            // Update displayed name in sidebar
            document.getElementById('user-name').textContent = 
                formData.first_name && formData.last_name ? 
                `${formData.first_name} ${formData.last_name}` : 
                formData.username;
        })
        .catch(error => {
            console.error('Error updating profile:', error);
            showAlert('Failed to update profile. Please try again.', 'danger');
        });
    });
}

function setupLocationForm() {
    document.getElementById('add-location-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('location-name').value,
            latitude: parseFloat(document.getElementById('location-latitude').value),
            longitude: parseFloat(document.getElementById('location-longitude').value),
            description: document.getElementById('location-description').value,
            category: document.getElementById('location-category').value
        };
        
        fetch('/api/locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to add location');
            }
            return response.json();
        })
        .then(data => {
            showAlert('Location added successfully!', 'success');
            // Reset form
            document.getElementById('add-location-form').reset();
            // Reset map
            locationMarker.setLatLng([21.0278, 105.8342]);
            locationMap.panTo([21.0278, 105.8342]);
        })
        .catch(error => {
            console.error('Error adding location:', error);
            showAlert('Failed to add location. Please try again.', 'danger');
        });
    });
}

function setupTrajectoryForm() {
    document.getElementById('add-trajectory-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const method = document.getElementById('trajectory-method').value;
        let trajectoryData = null;
        
        switch(method) {
            case 'manual':
                trajectoryData = collectManualTrajectoryData();
                break;
            case 'file':
                const fileInput = document.getElementById('trajectory-file');
                if (!fileInput.files || fileInput.files.length === 0) {
                    showAlert('Please select a file to upload', 'warning');
                    return;
                }
                
                const file = fileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(event) {
                    try {
                        const fileData = event.target.result;
                        // Process file based on extension
                        if (file.name.endsWith('.json')) {
                            processJSONTrajectory(fileData);
                        } else if (file.name.endsWith('.gpx')) {
                            processGPXTrajectory(fileData);
                        } else if (file.name.endsWith('.kml')) {
                            processKMLTrajectory(fileData);
                        } else {
                            showAlert('Unsupported file format', 'danger');
                        }
                    } catch (error) {
                        console.error('Error processing file:', error);
                        showAlert('Failed to process the file. Please make sure it\'s in the correct format.', 'danger');
                    }
                };
                
                reader.readAsText(file);
                return; // The form submission will be handled by the file processing functions
                
            case 'map':
                if (trajectoryPoints.length < 2) {
                    showAlert('Please add at least 2 points to create a trajectory', 'warning');
                    return;
                }
                
                trajectoryData = {
                    name: document.getElementById('trajectory-name').value,
                    points: trajectoryPoints.map(p => ({
                        latitude: p.lat,
                        longitude: p.lng,
                        altitude: p.alt,
                        timestamp: p.time.toISOString()
                    }))
                };
                break;
        }
        
        if (trajectoryData) {
            saveTrajectory(trajectoryData);
        }
    });
}

function collectManualTrajectoryData() {
    const pointElements = document.querySelectorAll('#trajectory-points-container > div');
    if (pointElements.length < 2) {
        showAlert('Please add at least 2 points to create a trajectory', 'warning');
        return null;
    }
    
    const points = [];
    
    pointElements.forEach(element => {
        const lat = parseFloat(element.querySelector('[data-field="lat"]').value);
        const lng = parseFloat(element.querySelector('[data-field="lng"]').value);
        const alt = parseFloat(element.querySelector('[data-field="alt"]').value || 0);
        const time = element.querySelector('[data-field="time"]').value;
        
        if (isNaN(lat) || isNaN(lng)) {
            showAlert('Invalid coordinates detected. Please check your input.', 'warning');
            return null;
        }
        
        points.push({
            latitude: lat,
            longitude: lng,
            altitude: alt,
            timestamp: new Date(time).toISOString()
        });
    });
    
    return {
        name: document.getElementById('trajectory-name').value,
        points: points
    };
}

function processJSONTrajectory(fileData) {
    try {
        const jsonData = JSON.parse(fileData);
        
        // Check if the JSON has the expected format
        if (!jsonData.points || !Array.isArray(jsonData.points)) {
            showAlert('Invalid JSON format. Expected a "points" array.', 'danger');
            return;
        }
        
        const trajectoryData = {
            name: document.getElementById('trajectory-name').value,
            points: jsonData.points.map(p => ({
                latitude: p.latitude || p.lat,
                longitude: p.longitude || p.lng,
                altitude: p.altitude || p.alt || 0,
                timestamp: p.timestamp || p.time || new Date().toISOString()
            }))
        };
        
        saveTrajectory(trajectoryData);
        
    } catch (error) {
        console.error('Error processing JSON:', error);
        showAlert('Failed to parse JSON file. Please make sure it\'s valid.', 'danger');
    }
}

function processGPXTrajectory(fileData) {
    // GPX processing would be implemented here
    showAlert('GPX file processing is not yet implemented', 'warning');
}

function processKMLTrajectory(fileData) {
    // KML processing would be implemented here
    showAlert('KML file processing is not yet implemented', 'warning');
}

function saveTrajectory(trajectoryData) {
    fetch('/api/trajectories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(trajectoryData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to add trajectory');
        }
        return response.json();
    })
    .then(data => {
        showAlert('Trajectory added successfully!', 'success');
        // Reset form
        document.getElementById('add-trajectory-form').reset();
        
        // Reset trajectory points if map method was used
        if (trajectoryMap) {
            trajectoryPoints = [];
            trajectoryPath.setLatLngs([]);
            // Remove all markers
            trajectoryMap.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    trajectoryMap.removeLayer(layer);
                }
            });
        }
        
        // Clear manual points container
        document.getElementById('trajectory-points-container').innerHTML = '';
    })
    .catch(error => {
        console.error('Error adding trajectory:', error);
        showAlert('Failed to add trajectory. Please try again.', 'danger');
    });
}

function setupPasswordForm() {
    document.getElementById('password-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Verify that new password and confirm password match
        if (newPassword !== confirmPassword) {
            showAlert('New password and confirm password do not match', 'danger');
            return;
        }
        
        // Verify that new password meets minimum requirements
        if (newPassword.length < 6) {
            showAlert('New password must be at least 6 characters long', 'danger');
            return;
        }
        
        const formData = {
            current_password: currentPassword,
            new_password: newPassword
        };
        
        fetch('/api/users/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to change password');
            }
            return response.json();
        })
        .then(data => {
            showAlert('Password changed successfully!', 'success');
            // Reset form
            document.getElementById('password-form').reset();
        })
        .catch(error => {
            console.error('Error changing password:', error);
            showAlert('Failed to change password. Please verify your current password and try again.', 'danger');
        });
    });
}

function logout() {
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to logout');
        }
        // Redirect to login page
        window.location.href = '/login';
    })
    .catch(error => {
        console.error('Error logging out:', error);
        showAlert('Failed to logout. Please try again.', 'danger');
    });
}

// Utility function to show alerts
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    const alertId = 'alert-' + Date.now();
    
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // Automatically remove the alert after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}