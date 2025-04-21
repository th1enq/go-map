let selectedLocation = null;
let searchTimeout = null;
let recommendMap = null; // Initialize as null to avoid undefined
let searchInput;
let suggestionsDiv;

// Function to get the JWT token from localStorage
function getAuthToken() {
    return localStorage.getItem('token');
}

// Function to show loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

// Function to hide loading overlay
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Initialize map when document is loaded
function initMap() {
    console.log('Trying to initialize map...');
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return null;
    }
    
    try {
        // Add custom CSS for location items
        if (!document.getElementById('recommend-custom-style')) {
            const style = document.createElement('style');
            style.id = 'recommend-custom-style';
            style.innerHTML = `
                .location-item {
                    display: flex;
                    margin-bottom: 10px;
                    padding: 10px;
                    border-radius: 8px;
                    background-color: #fff;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                
                .location-item:hover {
                    box-shadow: 0 3px 8px rgba(0,0,0,0.15);
                    transform: translateY(-2px);
                }
                
                .location-index {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background-color: #007AFF;
                    color: white;
                    font-weight: bold;
                    margin-right: 10px;
                    flex-shrink: 0;
                }
                
                .location-details {
                    flex: 1;
                }
                
                .location-details h5 {
                    margin-top: 0;
                    margin-bottom: 5px;
                    font-size: 15px;
                    color: #333;
                }
                
                .coordinates {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 5px;
                }
                
                .distance-badge {
                    display: inline-block;
                    background-color: #007AFF;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-top: 5px;
                }
                
                .no-results {
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
                
                /* Pulse animation for current location */
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                .current-location-marker div {
                    animation: pulse 2s infinite;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Check if map is already initialized on this container
        if (mapContainer._leaflet_id) {
            console.log('Map already initialized, using existing instance');
            
            // The _leaflet field may not be reliable, so we'll create a new one if needed
            let existingMap = null;
            try {
                existingMap = L.DomUtil.get('map')._leaflet;
            } catch (e) {
                console.log('Could not get existing map:', e);
            }
            
            if (existingMap) {
                return existingMap;
            } else {
                // Remove _leaflet_id to allow re-initialization
                delete mapContainer._leaflet_id;
            }
        }
        
        console.log('Initializing new map');
        // Initialize new map
        const newMap = L.map('map').setView([10.762622, 106.660172], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(newMap);
        
        return newMap;
    } catch (error) {
        console.error('Error initializing map:', error);
        return null;
    }
}

// Initialize map and attach listeners when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize location search elements
    searchInput = document.getElementById('location-search');
    suggestionsDiv = document.getElementById('search-suggestions');
    
    if (!searchInput || !suggestionsDiv) {
        console.error('Search input or suggestions container not found');
    } else {
        // Set up search input event listeners
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length < 3) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
                    const data = await response.json();
                    
                    suggestionsDiv.innerHTML = '';
                    if (data.length > 0) {
                        data.forEach(place => {
                            const div = document.createElement('div');
                            div.className = 'suggestion-item';
                            div.textContent = place.display_name;
                            div.onclick = () => {
                                selectedLocation = {
                                    lat: parseFloat(place.lat),
                                    lng: parseFloat(place.lon),
                                    name: place.display_name
                                };
                                searchInput.value = place.display_name;
                                suggestionsDiv.style.display = 'none';
                                if (recommendMap) {
                                    recommendMap.setView([selectedLocation.lat, selectedLocation.lng], 14);
                                    
                                    // Create a custom marker icon for selected location
                                    const selectedLocationIcon = L.divIcon({
                                        className: 'selected-location-marker',
                                        html: '<div style="background-color: #007AFF; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                                        iconSize: [22, 22],
                                        iconAnchor: [11, 11]
                                    });
                                    
                                    // Remove existing selected location marker if any
                                    if (window.selectedLocationMarker) {
                                        recommendMap.removeLayer(window.selectedLocationMarker);
                                    }
                                    
                                    // Add new marker
                                    window.selectedLocationMarker = L.marker([selectedLocation.lat, selectedLocation.lng], { 
                                        icon: selectedLocationIcon
                                    })
                                    .addTo(recommendMap)
                                    .bindPopup(selectedLocation.name)
                                    .openPopup();
                                }
                            };
                            suggestionsDiv.appendChild(div);
                        });
                        suggestionsDiv.style.display = 'block';
                    } else {
                        suggestionsDiv.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                    suggestionsDiv.style.display = 'none';
                }
            }, 300);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    }

    // Initialize the map
    recommendMap = initMap();
    
    // Set global map variables
    if (recommendMap) {
        // Update mapFunctions to use this map
        window.mapFunctions = window.mapFunctions || {};
        window.mapFunctions.searchMap = recommendMap;
        
        // Add event listeners for buttons
        const currentLocationBtn = document.getElementById('current-location-button');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', getCurrentLocation);
        }
        
        // Add event listener for search button
        const searchBtn = document.getElementById('search-button');
        if (searchBtn) {
            searchBtn.addEventListener('click', recommendMostPopular);
        }
        
        // Add event listener for similar trajectories button
        const similarTrajectoriesBtn = document.getElementById('similar-trajectories-button');
        if (similarTrajectoriesBtn) {
            similarTrajectoriesBtn.addEventListener('click', recommendBySimilarTrajectories);
        }
        
        // Set up map click handler
        recommendMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            if (window.mapFunctions?.clearCurrentRoute) {
                window.mapFunctions.clearCurrentRoute();
            }
            
            // Create a custom marker icon for selected location
            const selectedLocationIcon = L.divIcon({
                className: 'selected-location-marker',
                html: '<div style="background-color: #007AFF; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });
            
            // Remove existing selected location marker if any
            if (window.selectedLocationMarker) {
                recommendMap.removeLayer(window.selectedLocationMarker);
            }
            
            // Add temporary marker while we wait for geocoding
            window.selectedLocationMarker = L.marker([lat, lng], { 
                icon: selectedLocationIcon
            })
            .addTo(recommendMap)
            .bindPopup("Đang tìm thông tin địa điểm...")
            .openPopup();
            
            // Reverse geocode using Nominatim
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                .then(response => response.json())
                .then(data => {
                    selectedLocation = {
                        lat: lat,
                        lng: lng,
                        name: data.display_name
                    };
                    if (searchInput) {
                        searchInput.value = data.display_name;
                    }
                    
                    // Update marker popup with location name
                    if (window.selectedLocationMarker) {
                        window.selectedLocationMarker.setPopupContent(data.display_name || 'Vị trí đã chọn');
                    }
                })
                .catch(error => {
                    console.error('Error reverse geocoding:', error);
                    selectedLocation = {
                        lat: lat,
                        lng: lng,
                        name: `Vị trí (${lat.toFixed(6)}, ${lng.toFixed(6)})`
                    };
                    if (searchInput) {
                        searchInput.value = selectedLocation.name;
                    }
                    
                    // Update marker popup with fallback location name
                    if (window.selectedLocationMarker) {
                        window.selectedLocationMarker.setPopupContent(selectedLocation.name || 'Vị trí đã chọn');
                    }
                });
        });
    } else {
        console.error('Failed to initialize map');
    }
});

// Get current location
function getCurrentLocation() {
    if (!recommendMap) {
        console.error('Map not initialized yet');
        alert('Bản đồ chưa được khởi tạo. Vui lòng thử lại sau.');
        return;
    }
    
    if (navigator.geolocation) {
        showLoading();
        if (window.mapFunctions?.clearCurrentRoute) {
            window.mapFunctions.clearCurrentRoute();
        }
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Create a red marker icon for current location
                const currentLocationIcon = L.divIcon({
                    className: 'current-location-marker',
                    html: '<div style="background-color: #007AFF; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });
                
                // Remove existing current location marker if any
                if (window.currentLocationMarker) {
                    recommendMap.removeLayer(window.currentLocationMarker);
                }
                
                // Add new current location marker with a pulsing effect
                window.currentLocationMarker = L.marker([lat, lng], { 
                    icon: currentLocationIcon,
                    zIndexOffset: 1000 // Make sure it appears above other markers
                })
                .addTo(recommendMap)
                .bindPopup('Vị trí hiện tại của bạn')
                .openPopup();
                
                // Reverse geocode using Nominatim
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(response => response.json())
                    .then(data => {
                        selectedLocation = {
                            lat: lat,
                            lng: lng,
                            name: data.display_name
                        };
                        searchInput.value = data.display_name;
                        recommendMap.setView([lat, lng], 15); // Zoom closer
                        
                        // Add a proper selected location marker
                        const selectedLocationIcon = L.divIcon({
                            className: 'selected-location-marker',
                            html: '<div style="background-color: #007AFF; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                            iconSize: [22, 22],
                            iconAnchor: [11, 11]
                        });
                        
                        if (window.selectedLocationMarker) {
                            recommendMap.removeLayer(window.selectedLocationMarker);
                        }
                        
                        window.selectedLocationMarker = L.marker([lat, lng], { 
                            icon: selectedLocationIcon
                        })
                        .addTo(recommendMap)
                        .bindPopup(data.display_name || 'Vị trí đã chọn')
                        .openPopup();
                        
                        hideLoading();
                    })
                    .catch(error => {
                        console.error('Error reverse geocoding:', error);
                        selectedLocation = {
                            lat: lat,
                            lng: lng,
                            name: `Vị trí (${lat.toFixed(6)}, ${lng.toFixed(6)})`
                        };
                        searchInput.value = selectedLocation.name;
                        recommendMap.setView([lat, lng], 15);
                        
                        // Still add a marker even if geocoding fails
                        const selectedLocationIcon = L.divIcon({
                            className: 'selected-location-marker',
                            html: '<div style="background-color: #007AFF; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                            iconSize: [22, 22],
                            iconAnchor: [11, 11]
                        });
                        
                        if (window.selectedLocationMarker) {
                            recommendMap.removeLayer(window.selectedLocationMarker);
                        }
                        
                        window.selectedLocationMarker = L.marker([lat, lng], { 
                            icon: selectedLocationIcon
                        })
                        .addTo(recommendMap)
                        .bindPopup(selectedLocation.name || 'Vị trí đã chọn')
                        .openPopup();
                        
                        hideLoading();
                    });
            },
            function(error) {
                hideLoading();
                alert("Lỗi khi lấy vị trí hiện tại: " + error.message);
            },
            { 
                enableHighAccuracy: true, // Cố gắng lấy vị trí GPS chính xác nhất
                timeout: 10000, // Thời gian tối đa chờ đợi (10 giây)
                maximumAge: 0 // Không sử dụng vị trí đã lưu trong cache
            }
        );
    } else {
        alert("Trình duyệt của bạn không hỗ trợ định vị.");
    }
}

async function recommendMostPopular() {
    if (!recommendMap) {
        console.error('Map not initialized yet');
        alert('Bản đồ chưa được khởi tạo. Vui lòng thử lại sau.');
        return;
    }
    
    if (!selectedLocation) {
        alert("Vui lòng chọn một vị trí trước");
        return;
    }

    // Get auth token
    const token = getAuthToken();
    if (!token) {
        // Redirect to login page if not authenticated
        window.location.href = '/login';
        return;
    }

    // Look for either "search-results" or "results" element
    const resultsDiv = document.getElementById("results");
    if (!resultsDiv) {
        console.error("Results container not found");
        alert("Không tìm thấy khung hiển thị kết quả. Vui lòng kiểm tra cấu trúc HTML.");
        return;
    }
    resultsDiv.innerHTML = "";

    try {
        showLoading();
        
        // Clear previous search markers but keep current and selected location markers
        if (window.searchMarkers && window.searchMarkers.length > 0) {
            window.searchMarkers.forEach(marker => {
                recommendMap.removeLayer(marker);
            });
        }
        window.searchMarkers = [];
        
        // Clear current route if there is one
        if (window.currentRoute) {
            recommendMap.removeLayer(window.currentRoute);
            window.currentRoute = null;
        }
        
        let response;
        // Add Authorization header with JWT token
        response = await fetch(`/api/location/rcm/hot?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Check if response is unauthorized
        if (response.status === 401) {
            hideLoading();
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = '/login';
            return;
        }
        
        const locations = await response.json();

        if (locations.error) {
            hideLoading();
            alert(locations.error);
            return;
        }

        // Calculate distance for each location and sort by distance
        const calculateDistanceFunc = window.mapFunctions?.calculateDistance || function(lat1, lon1, lat2, lon2) {
            const R = 6371; // Radius of the earth in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            return R * c; // Distance in km
        };
        
        const locationsWithDistance = locations.map(location => {
            const distance = calculateDistanceFunc(
                selectedLocation.lat, 
                selectedLocation.lng, 
                location.latitude, 
                location.longitude
            );
            return {
                ...location,
                distance: distance
            };
        }).sort((a, b) => a.distance - b.distance);

        if (locationsWithDistance.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">Không tìm thấy địa điểm nào</div>';
            hideLoading();
            return;
        }

        // Store markers in the global array
        window.searchMarkers = [];
        
        // Create a custom pin style icon for search results
        const createPoiIcon = (index) => {
            const colors = ['#FF9500', '#34C759', '#5856D6', '#FF2D55', '#AF52DE', '#007AFF'];
            const color = colors[index % colors.length];
            
            return L.divIcon({
                className: 'poi-marker',
                html: `
                    <div style="background-color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                        <div style="background-color: ${color}; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${index + 1}</div>
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });
        };
        
        locationsWithDistance.forEach((location, index) => {
            const marker = L.marker([location.latitude, location.longitude], {
                icon: createPoiIcon(index)
            })
            .addTo(recommendMap)
            .bindPopup(`
                <div style="max-width: 250px;">
                    <strong style="font-size: 14px;">${location.name}</strong><br>
                    ${location.category ? `<span style="color: #666;"><strong>Loại:</strong> ${location.category}</span><br>` : ''}
                    ${location.tag ? `<span style="color: #666;"><strong>Thể loại:</strong> ${location.tag}</span><br>` : ''}
                    ${location.activities ? `<span style="color: #666;"><strong>Hoạt động:</strong> ${location.activities.join(', ')}</span><br>` : ''}
                    <span style="color: #007AFF; font-weight: bold; font-size: 13px;">Khoảng cách: ${(location.distance * 1000).toFixed(0)}m</span>
                </div>
            `);
            
            window.searchMarkers.push(marker);

            const resultItem = document.createElement("div");
            resultItem.className = "location-item";
            resultItem.innerHTML = `
                <div class="location-index">${index + 1}</div>
                <div class="location-details">
                    <h5>${location.name}</h5>
                    <p class="coordinates">GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}</p>
                    ${location.category ? `<p class="mb-1"><small><strong>Loại:</strong> ${location.category}</small></p>` : ''}
                    ${location.tag ? `<p class="mb-1"><small><strong>Thể loại:</strong> ${location.tag}</small></p>` : ''}
                    ${location.activities ? `<p class="mb-1"><small><strong>Hoạt động:</strong> ${location.activities.join(', ')}</small></p>` : ''}
                    <div class="distance-badge">${(location.distance * 1000).toFixed(0)}m</div>
                </div>
            `;
            resultItem.onclick = () => {
                // Keep the current location centered and zoom in
                recommendMap.setView([selectedLocation.lat, selectedLocation.lng], 16);
                marker.openPopup();
                
                // Draw route from current location to selected point
                if (selectedLocation) {
                    // Xóa tuyến đường cũ nếu có, nhưng giữ nguyên marker
                    if (window.currentRoute) {
                        recommendMap.removeLayer(window.currentRoute);
                        window.currentRoute = null;
                    }
                    
                    // Đảm bảo marker vị trí hiện tại và vị trí đã chọn vẫn hiển thị
                    if (window.currentLocationMarker && !recommendMap.hasLayer(window.currentLocationMarker)) {
                        window.currentLocationMarker.addTo(recommendMap);
                    }
                    
                    if (window.selectedLocationMarker && !recommendMap.hasLayer(window.selectedLocationMarker)) {
                        window.selectedLocationMarker.addTo(recommendMap);
                    }
                    
                    // Hiển thị thông báo đang tính toán
                    const loadingPopup = L.popup()
                        .setLatLng([selectedLocation.lat, selectedLocation.lng])
                        .setContent(`
                            <div style="text-align: center; padding: 5px;">
                                <div class="spinner-border spinner-border-sm text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <span style="margin-left: 5px;">Đang tính toán lộ trình...</span>
                            </div>
                        `)
                        .openOn(recommendMap);
                    
                    // Lấy lộ trình từ OSRM API
                    fetch(`https://router.project-osrm.org/route/v1/driving/${selectedLocation.lng},${selectedLocation.lat};${location.longitude},${location.latitude}?overview=full&geometries=geojson`)
                        .then(response => response.json())
                        .then(data => {
                            // Đóng popup tải
                            recommendMap.closePopup(loadingPopup);
                            
                            if (data.routes && data.routes.length > 0) {
                                const route = data.routes[0];
                                
                                // Chuyển đổi tọa độ từ GeoJSON (kinh độ, vĩ độ) sang Leaflet (vĩ độ, kinh độ)
                                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                                
                                // Vẽ tuyến đường với kiểu mới
                                window.currentRoute = L.polyline(routeCoordinates, {
                                    color: '#007AFF',
                                    weight: 5,
                                    opacity: 0.8,
                                    dashArray: '10, 10',
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }).addTo(recommendMap);
                                
                                // Tính toán thông tin tuyến đường
                                const distance = (route.distance / 1000).toFixed(2); // Chuyển đổi sang km với 2 số thập phân
                                const duration = Math.round(route.duration / 60); // Chuyển đổi sang phút
                                
                                // Hiển thị thông tin tuyến đường
                                L.popup()
                                    .setLatLng([selectedLocation.lat, selectedLocation.lng])
                                    .setContent(`
                                        <div style="font-family: Arial, sans-serif; max-width: 200px;">
                                            <strong style="color: #007AFF;">Thông tin lộ trình:</strong><br>
                                            <strong>Khoảng cách:</strong> ${distance} km<br>
                                            <strong>Thời gian lái xe:</strong> ${duration} phút<br>
                                            <small>(Đây là tuyến đường lái xe ngắn nhất)</small>
                                        </div>
                                    `)
                                    .openOn(recommendMap);
                                
                                // Điều chỉnh tỷ lệ bản đồ để vừa hiển thị tuyến đường và bao gồm cả marker
                                const bounds = L.latLngBounds([
                                    [selectedLocation.lat, selectedLocation.lng],
                                    [location.latitude, location.longitude],
                                    ...routeCoordinates
                                ]);
                                
                                // Phóng to vừa đủ để thấy tuyến đường
                                recommendMap.fitBounds(bounds, { 
                                    padding: [50, 50],
                                    maxZoom: 16 // Giới hạn mức zoom tối đa
                                });
                            } else {
                                // Nếu không tìm thấy tuyến đường, vẽ đường thẳng đơn giản
                                window.currentRoute = L.polyline([
                                    [selectedLocation.lat, selectedLocation.lng],
                                    [location.latitude, location.longitude]
                                ], {
                                    color: '#007AFF',
                                    weight: 5,
                                    opacity: 0.8,
                                    dashArray: '10, 10',
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }).addTo(recommendMap);
                                
                                // Tính khoảng cách đường chim bay
                                const airDistance = (location.distance * 1000).toFixed(0);
                                
                                // Hiển thị thông báo không tìm thấy tuyến đường
                                L.popup()
                                    .setLatLng([selectedLocation.lat, selectedLocation.lng])
                                    .setContent(`
                                        <div style="font-family: Arial, sans-serif; max-width: 200px;">
                                            <strong style="color: #007AFF;">Không tìm thấy tuyến đường!</strong><br>
                                            <strong>Khoảng cách đường chim bay:</strong> ${airDistance} m<br>
                                            <small>(Đây là khoảng cách trực tiếp giữa hai điểm)</small>
                                        </div>
                                    `)
                                    .openOn(recommendMap);
                            }
                        })
                        .catch(error => {
                            console.error('Lỗi khi tính toán tuyến đường:', error);
                            
                            // Đóng popup tải
                            recommendMap.closePopup(loadingPopup);
                            
                            // Vẽ đường thẳng đơn giản nếu có lỗi
                            window.currentRoute = L.polyline([
                                [selectedLocation.lat, selectedLocation.lng],
                                [location.latitude, location.longitude]
                            ], {
                                color: '#007AFF',
                                weight: 5,
                                opacity: 0.8,
                                dashArray: '10, 10',
                                lineCap: 'round',
                                lineJoin: 'round'
                            }).addTo(recommendMap);
                            
                            // Tính khoảng cách đường chim bay
                            const airDistance = (location.distance * 1000).toFixed(0);
                            
                            // Hiển thị thông báo lỗi
                            L.popup()
                                .setLatLng([selectedLocation.lat, selectedLocation.lng])
                                .setContent(`
                                    <div style="font-family: Arial, sans-serif; max-width: 200px;">
                                        <strong style="color: #007AFF;">Lỗi khi tính toán tuyến đường!</strong><br>
                                        <strong>Khoảng cách đường chim bay:</strong> ${airDistance} m<br>
                                        <small>(Đây là khoảng cách trực tiếp giữa hai điểm)</small>
                                    </div>
                                `)
                                .openOn(recommendMap);
                        });
                }
            };
            resultsDiv.appendChild(resultItem);
        });

        if (locationsWithDistance.length > 0) {
            // Create bounds that include both the selected location and all result locations
            const points = [
                [selectedLocation.lat, selectedLocation.lng],
                ...locationsWithDistance.map(loc => [loc.latitude, loc.longitude])
            ];
            const bounds = L.latLngBounds(points);
            recommendMap.fitBounds(bounds, { padding: [50, 50] });
        }
        hideLoading();
    } catch (error) {
        console.error("Error fetching locations:", error);
        hideLoading();
        alert("Đã xảy ra lỗi khi tìm kiếm địa điểm.");
    }
}

// Function to save user location and get recommendations from users with similar trajectories
async function recommendBySimilarTrajectories() {
    console.log('Recommending based on similar trajectories');
    
    showLoading();
    
    // Use the existing map instance instead of creating a new one
    if (!recommendMap) {
        console.error('Map not initialized yet');
        alert('Bản đồ chưa được khởi tạo. Vui lòng thử lại sau.');
        hideLoading();
        return;
    }
    
    // Clear existing markers
    if (window.searchMarkers) {
        window.searchMarkers.forEach(marker => recommendMap.removeLayer(marker));
    }
    
    if (window.currentLocationMarker) {
        recommendMap.removeLayer(window.currentLocationMarker);
    }
    
    if (window.selectedLocationMarker) {
        recommendMap.removeLayer(window.selectedLocationMarker);
    }
    
    if (window.currentRoute) {
        recommendMap.removeLayer(window.currentRoute);
    }
    
    window.searchMarkers = [];
    
    try {
        // Mảng màu cho các markers
        const colors = ['#34C759', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500', '#007AFF'];
        
        // Hàm tạo biểu tượng POI tùy chỉnh
        const createPoiIcon = (index) => {
            const color = colors[index % colors.length];
            return L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${color}; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; border-radius: 50%; color: white; font-weight: bold; font-size: 14px;">${index + 1}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
        };
        
        // Sử dụng vị trí hiện tại nếu có
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Đặt marker vị trí hiện tại
                    window.currentLocationMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'location-marker',
                            html: '<div class="current-location-dot"></div>',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        })
                    }).addTo(recommendMap);
                    
                    // Trung tâm bản đồ vào vị trí hiện tại
                    recommendMap.setView([lat, lng], 20);
                    
                    // Lấy các địa điểm gần vị trí hiện tại
                    const response = await fetch('/api/location/rcm/same/4', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getAuthToken()}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch recommendations');
                    }
                    
                    const data = await response.json();
                    console.log('Recommendation data:', data);
                    
                    // Hiển thị kết quả
                    const resultsDiv = document.getElementById('results');
                    resultsDiv.innerHTML = '';
                    
                    // Handle data whether it's an array directly or has a locations property
                    const locations = Array.isArray(data) ? data : (data.locations || []);
                    
                    if (!locations || locations.length === 0) {
                        resultsDiv.innerHTML = '<div class="no-results">Không tìm thấy gợi ý nào. Hãy thử đổi vị trí hoặc tiêu chí khác.</div>';
                        hideLoading();
                        return;
                    }
                    
                    // Thêm một đối tượng để lưu trữ vị trí đã chọn (sẽ dùng sau)
                    selectedLocation = { lat, lng };
                    window.selectedLocation = { lat, lng };
                    
                    // Thiết lập marker cho vị trí đã chọn (điểm bắt đầu)
                    window.selectedLocationMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'selected-location-marker',
                            html: '<div class="pulse"></div>',
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        })
                    }).addTo(recommendMap)
                    .bindPopup('<div style="text-align: center;"><strong style="color: #007AFF;">Vị trí hiện tại</strong><br><small>Điểm bắt đầu</small></div>');
                    
                    // Tính khoảng cách từ vị trí hiện tại đến các điểm gợi ý
                    const locationsWithDistance = locations.map(location => {
                        const distance = getDistance(lat, lng, location.latitude, location.longitude);
                        return { ...location, distance };
                    });
                    
                    // Sắp xếp kết quả theo khoảng cách tăng dần
                    locationsWithDistance.sort((a, b) => a.distance - b.distance);
                    
                    // Hiển thị các kết quả
                    locationsWithDistance.forEach((location, index) => {
                        const marker = L.marker([location.latitude, location.longitude], {
                            icon: createPoiIcon(index)
                        })
                        .addTo(recommendMap)
                        .bindPopup(`
                            <div style="max-width: 250px;">
                                <strong style="font-size: 14px;">${location.name}</strong><br>
                                ${location.category ? `<span style="color: #666;"><strong>Loại:</strong> ${location.category}</span><br>` : ''}
                                ${location.tag ? `<span style="color: #666;"><strong>Thể loại:</strong> ${location.tag}</span><br>` : ''}
                                ${location.activities ? `<span style="color: #666;"><strong>Hoạt động:</strong> ${location.activities.join(', ')}</span><br>` : ''}
                                <span style="color: #34C759; font-weight: bold; font-size: 13px;">Khoảng cách: ${(location.distance * 1000).toFixed(0)}m</span>
                            </div>
                        `);
                        
                        window.searchMarkers.push(marker);

                        const resultItem = document.createElement("div");
                        resultItem.className = "location-item";
                        resultItem.innerHTML = `
                            <div class="location-index" style="background-color: ${colors[index % colors.length]}">${index + 1}</div>
                            <div class="location-details">
                                <h5>${location.name}</h5>
                                <p class="coordinates">GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}</p>
                                ${location.category ? `<p class="mb-1"><small><strong>Loại:</strong> ${location.category}</small></p>` : ''}
                                ${location.tag ? `<p class="mb-1"><small><strong>Thể loại:</strong> ${location.tag}</small></p>` : ''}
                                ${location.activities ? `<p class="mb-1"><small><strong>Hoạt động:</strong> ${location.activities.join(', ')}</small></p>` : ''}
                                <div class="distance-badge" style="background-color: #34C759;">${(location.distance * 1000).toFixed(0)}m</div>
                            </div>
                        `;
                        resultsDiv.appendChild(resultItem);
                    });

                    if (locationsWithDistance.length > 0) {
                        // Create bounds that include both the selected location and all result locations
                        const points = [
                            [lat, lng], // Use direct lat, lng values instead of selectedLocation
                            ...locationsWithDistance.map(loc => [loc.latitude, loc.longitude])
                        ];
                        const bounds = L.latLngBounds(points);
                        recommendMap.fitBounds(bounds, { padding: [50, 50] });
                    }
                    
                    hideLoading();
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    hideLoading();
                    const resultsDiv = document.getElementById('results');
                    resultsDiv.innerHTML = '<div class="no-results">Không thể lấy vị trí hiện tại. Vui lòng cho phép truy cập vị trí và thử lại.</div>';
                }
            );
        } else {
            hideLoading();
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '<div class="no-results">Trình duyệt của bạn không hỗ trợ geolocation.</div>';
        }
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        hideLoading();
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '<div class="no-results">Đã xảy ra lỗi khi tải đề xuất.</div>';
    }
}

// Helper function to calculate distance between two coordinates
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Export functions for use in other files
window.searchFunctions = {
    showLoading,
    hideLoading,
    getCurrentLocation,
    recommendMostPopular,
    recommendBySimilarTrajectories
};