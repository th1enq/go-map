let selectedLocation = null;
let searchTimeout = null;
let searchMap = null; // Changed from recommendMap to searchMap
let searchInput;
let suggestionsDiv;
let selectedCategory = 'all'; // Default category selection
let searchResults = []; // Store all search results for filtering

// Function to get the JWT token from localStorage
function getAuthToken() {
    return localStorage.getItem('token');
}

// Function to show loading overlay
function showLoading(customMessage) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingOverlay) {
        if (loadingText && customMessage) {
            loadingText.textContent = customMessage;
        } else if (loadingText && selectedCategory) {
            if (selectedCategory === 'all') {
                loadingText.textContent = 'Searching for all locations...';
            } else {
                // Get the display name from the button to ensure it matches what's shown in the UI
                const categoryButton = document.querySelector(`.category-btn[data-category="${selectedCategory}"]`);
                const categoryDisplayName = categoryButton ? categoryButton.textContent.trim() : selectedCategory;
                loadingText.textContent = `Searching for ${categoryDisplayName} locations...`;
            }
        }
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

// Function to display admin tab if user has admin role
function checkAdminRole() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            if (user.role === 'admin') {
                const adminNavItem = document.getElementById('admin-nav-item');
                if (adminNavItem) {
                    adminNavItem.style.display = 'block';
                }
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
}

// Handle logout
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login page
            window.location.href = '/login';
        });
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
        if (!document.getElementById('search-custom-style')) {
            const style = document.createElement('style');
            style.id = 'search-custom-style';
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
        const newMap = L.map('map').setView([10.762622, 106.660172], 18);
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
    // Check admin role for UI visibility if logged in
    const token = getAuthToken();
    if (token) {
        checkAdminRole();
        
        // Show logout button only if user is logged in
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
    } else {
        // Hide logout button if user is not logged in
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
    }
    
    // Setup logout functionality regardless
    setupLogout();
    
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
                                if (searchMap) {
                                    searchMap.setView([selectedLocation.lat, selectedLocation.lng], 18);
                                    
                                    // Create a custom marker icon for selected location
                                    const selectedLocationIcon = L.divIcon({
                                        className: 'selected-location-marker',
                                        html: '<div style="background-color: #007AFF; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                                        iconSize: [22, 22],
                                        iconAnchor: [11, 11]
                                    });
                                    
                                    // Remove existing selected location marker if any
                                    if (window.selectedLocationMarker) {
                                        searchMap.removeLayer(window.selectedLocationMarker);
                                    }
                                    
                                    // Add new marker
                                    window.selectedLocationMarker = L.marker([selectedLocation.lat, selectedLocation.lng], { 
                                        icon: selectedLocationIcon
                                    })
                                    .addTo(searchMap)
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
    searchMap = initMap();
    
    // Set global map variables
    if (searchMap) {
        // Update mapFunctions to use this map
        window.mapFunctions = window.mapFunctions || {};
        window.mapFunctions.searchMap = searchMap;
        
        // Add event listeners for buttons
        const currentLocationBtn = document.getElementById('current-location-button');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', getCurrentLocation);
        }
        
        // Add event listener for search button
        const searchBtn = document.getElementById('search-button');
        if (searchBtn) {
            searchBtn.addEventListener('click', SearchPlaces);
        }
        
        // Set up map click handler
        searchMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // Thêm console log với prefix rõ ràng để dễ nhận biết
            console.warn('🗺️ MAP CLICK EVENT:', { lat, lng });
            
            // Thêm alert để kiểm tra xem sự kiện có được kích hoạt không
            // alert(`Clicked on map at position: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            
            // Clear current route if there is one
            if (window.currentRoute) {
                searchMap.removeLayer(window.currentRoute);
                window.currentRoute = null;
            }
            
            // Create a custom marker icon for selected location with more visible and attractive design
            const selectedLocationIcon = L.divIcon({
                className: 'selected-location-marker',
                html: '<div style="background-color: #FF3B30; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            // Remove existing selected location marker if any
            if (window.selectedLocationMarker) {
                searchMap.removeLayer(window.selectedLocationMarker);
            }
            
            // Add temporary marker while we wait for geocoding
            window.selectedLocationMarker = L.marker([lat, lng], { 
                icon: selectedLocationIcon,
                zIndexOffset: 1000 // Đảm bảo marker này hiển thị phía trên các marker khác
            })
            .addTo(searchMap)
            .bindPopup("<div style='text-align: center; font-weight: bold;'>Đang tìm thông tin địa điểm...</div>")
            .openPopup();
            
            // Cập nhật selectedLocation ngay lập tức với vị trí tạm thời
            selectedLocation = {
                lat: lat,
                lng: lng,
                name: `Vị trí (${lat.toFixed(6)}, ${lng.toFixed(6)})`
            };
            
            // Log selectedLocation để kiểm tra
            console.warn('🗺️ Selected location updated:', selectedLocation);
            
            // Cập nhật input search với vị trí tạm thời
            if (searchInput) {
                searchInput.value = selectedLocation.name;
                console.log('🗺️ Search input updated with:', selectedLocation.name);
            }
            
            // Thực hiện reverse geocoding để lấy thông tin địa điểm
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                .then(response => response.json())
                .then(data => {
                    // Cập nhật thông tin địa điểm khi có kết quả geocoding
                    selectedLocation = {
                        lat: lat,
                        lng: lng,
                        name: data.display_name || `Vị trí (${lat.toFixed(6)}, ${lng.toFixed(6)})`
                    };
                    
                    // Cập nhật input search
                    if (searchInput) {
                        searchInput.value = selectedLocation.name;
                    }
                    
                    // Cập nhật nội dung popup với thông tin chi tiết hơn
                    if (window.selectedLocationMarker) {
                        window.selectedLocationMarker.setPopupContent(`
                            <div style="max-width: 250px; text-align: center;">
                                <strong style="font-size: 14px; color: #333;">${selectedLocation.name}</strong>
                                <br>
                                <span style="font-size: 12px; color: #666;">
                                    ${lat.toFixed(6)}, ${lng.toFixed(6)}
                                </span>
                                <br>
                                <button 
                                    onclick="searchFunctions.SearchPlaces()" 
                                    style="margin-top: 8px; background-color: #007AFF; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;"
                                >
                                    Tìm địa điểm gần đây
                                </button>
                            </div>
                        `);
                        window.selectedLocationMarker.openPopup();
                    }
                    
                    // Trigger search nếu cần
                    // SearchPlaces(); // Uncomment nếu muốn tự động tìm kiếm sau khi click
                })
                .catch(error => {
                    console.error('Error reverse geocoding:', error);
                    
                    // Giữ lại thông tin vị trí tạm thời nếu geocoding thất bại
                    if (window.selectedLocationMarker) {
                        window.selectedLocationMarker.setPopupContent(`
                            <div style="max-width: 250px; text-align: center;">
                                <strong style="font-size: 14px; color: #333;">${selectedLocation.name}</strong>
                                <br>
                                <span style="font-size: 12px; color: #666;">
                                    Không thể lấy thông tin chi tiết địa điểm
                                </span>
                                <br>
                                <button 
                                    onclick="searchFunctions.SearchPlaces()" 
                                    style="margin-top: 8px; background-color: #007AFF; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;"
                                >
                                    Tìm địa điểm gần đây
                                </button>
                            </div>
                        `);
                        window.selectedLocationMarker.openPopup();
                    }
                });
        });
    } else {
        console.error('Failed to initialize map');
    }
    
    // Setup category filter buttons
    setupCategoryFilters();
});

// Function to setup category filters
function setupCategoryFilters() {
    console.log('Setting up category filters...');
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    if (categoryButtons.length === 0) {
        console.error('Category buttons not found');
        return;
    }
    
    console.log(`Found ${categoryButtons.length} category buttons`);
    
    // Set initial category from active button
    const activeButton = document.querySelector('.category-btn.active');
    if (activeButton) {
        selectedCategory = activeButton.getAttribute('data-category');
        console.log('Initial category:', selectedCategory);
        
        // Update the current category indicator
        const currentCategoryElement = document.getElementById('current-category');
        if (currentCategoryElement) {
            const categoryText = activeButton.textContent.trim();
            currentCategoryElement.textContent = `Current: ${categoryText}`;
        }
    }
    
    categoryButtons.forEach(button => {
        // Remove any existing click listeners to avoid duplicates
        const clone = button.cloneNode(true);
        button.parentNode.replaceChild(clone, button);
        
        // Add new click listener
        clone.addEventListener('click', function() {
            // Get all category buttons
            const allButtons = document.querySelectorAll('.category-btn');
            
            // Remove active class from all buttons
            allButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update selected category
            selectedCategory = this.getAttribute('data-category');
            console.log('Selected category:', selectedCategory);
            
            // Update the current category indicator
            const currentCategoryElement = document.getElementById('current-category');
            if (currentCategoryElement) {
                const categoryText = this.textContent.trim();
                currentCategoryElement.textContent = `Current: ${categoryText}`;
            }
            
            // If we have a selected location, perform a new search
            if (selectedLocation) {
                SearchPlaces();
            }
        });
    });
}

// Get current location
function getCurrentLocation() {
    if (!searchMap) {
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
                    searchMap.removeLayer(window.currentLocationMarker);
                }
                
                // Add new current location marker with a pulsing effect
                window.currentLocationMarker = L.marker([lat, lng], { 
                    icon: currentLocationIcon,
                    zIndexOffset: 1000 // Make sure it appears above other markers
                })
                .addTo(searchMap)
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
                        searchMap.setView([lat, lng], 18); // Zoom closer
                        
                        // Add a proper selected location marker
                        const selectedLocationIcon = L.divIcon({
                            className: 'selected-location-marker',
                            html: '<div style="background-color: #007AFF; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                            iconSize: [22, 22],
                            iconAnchor: [11, 11]
                        });
                        
                        if (window.selectedLocationMarker) {
                            searchMap.removeLayer(window.selectedLocationMarker);
                        }
                        
                        window.selectedLocationMarker = L.marker([lat, lng], { 
                            icon: selectedLocationIcon
                        })
                        .addTo(searchMap)
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
                        searchMap.setView([lat, lng], 18);
                        
                        // Still add a marker even if geocoding fails
                        const selectedLocationIcon = L.divIcon({
                            className: 'selected-location-marker',
                            html: '<div style="background-color: #007AFF; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
                            iconSize: [22, 22],
                            iconAnchor: [11, 11]
                        });
                        
                        if (window.selectedLocationMarker) {
                            searchMap.removeLayer(window.selectedLocationMarker);
                        }
                        
                        window.selectedLocationMarker = L.marker([lat, lng], { 
                            icon: selectedLocationIcon
                        })
                        .addTo(searchMap)
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

async function SearchPlaces() {
    if (!searchMap) {
        console.error('Map not initialized yet');
        alert('Bản đồ chưa được khởi tạo. Vui lòng thử lại sau.');
        return;
    }
    
    if (!selectedLocation) {
        alert("Vui lòng chọn một vị trí trước");
        return;
    }

    // Look for either "search-results" or "results" element
    const resultsDiv = document.getElementById("search-results")
    if (!resultsDiv) {
        console.error("Results container not found");
        alert("Không tìm thấy khung hiển thị kết quả. Vui lòng kiểm tra cấu trúc HTML.");
        return;
    }
    resultsDiv.innerHTML = "";

    try {
        // Show loading overlay with category-specific message
        showLoading();
        
        // Clear previous search markers but keep current and selected location markers
        if (window.searchMarkers && window.searchMarkers.length > 0) {
            window.searchMarkers.forEach(marker => {
                searchMap.removeLayer(marker);
            });
        }
        window.searchMarkers = [];
        
        // Clear current route if there is one
        if (window.currentRoute) {
            searchMap.removeLayer(window.currentRoute);
            window.currentRoute = null;
        }
        
        // Log current category for debugging
        console.log(`[Search] Current category: ${selectedCategory}`);
        
        // Determine which API endpoint to use based on selected category
        let apiUrl;
        if (selectedCategory === 'all') {
            // For 'all' category, use the activity search endpoint
            apiUrl = `/api/location/search/activity?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`;
        } else {
            // For specific categories, use the place search with activity parameter
            apiUrl = `/api/location/search/place?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&activity=${selectedCategory}`;
        }
        
        console.log(`[Search] Using API endpoint: ${apiUrl}`);
        
        // Make the API request
        const response = await fetch(apiUrl);
        
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

        // Update the result count text
        const resultCountElem = document.getElementById('result-count');
        
        if (locationsWithDistance.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">Không tìm thấy địa điểm nào</div>';
            
            if (resultCountElem) {
                const categoryName = document.querySelector(`.category-btn[data-category="${selectedCategory}"]`)?.textContent.trim() || selectedCategory;
                if (selectedCategory === 'all') {
                    resultCountElem.textContent = 'Không tìm thấy kết quả nào';
                } else {
                    resultCountElem.textContent = `Không tìm thấy kết quả cho ${categoryName}`;
                }
            }
            
            hideLoading();
            return;
        }

        // Store search results for potential future filtering
        searchResults = locationsWithDistance;
        
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
        
        // Update the result count text
        if (resultCountElem) {
            const categoryName = document.querySelector(`.category-btn[data-category="${selectedCategory}"]`)?.textContent.trim() || selectedCategory;
            if (selectedCategory === 'all') {
                resultCountElem.textContent = `Hiển thị tất cả (${locationsWithDistance.length} kết quả)`;
            } else {
                resultCountElem.textContent = `Hiển thị ${categoryName} (${locationsWithDistance.length} kết quả)`;
            }
        }
        
        // Display results
        locationsWithDistance.forEach((location, index) => {
            // Add marker to map
            const marker = L.marker([location.latitude, location.longitude], {
                icon: createPoiIcon(index)
            })
            .addTo(searchMap)
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

            // Add item to results list
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
            
            // Add click handler for the result item
            resultItem.addEventListener('click', function() {
                // Center map on the selected location
                searchMap.setView([location.latitude, location.longitude], 18);
                marker.openPopup();
                
                // Draw route
                drawRouteBetweenPoints(selectedLocation, location);
            });
            
            resultsDiv.appendChild(resultItem);
        });

        // Adjust map bounds to show all results
        if (locationsWithDistance.length > 0) {
            // Create bounds that include both the selected location and all result locations
            const points = [
                [selectedLocation.lat, selectedLocation.lng],
                ...locationsWithDistance.map(loc => [loc.latitude, loc.longitude])
            ];
            const bounds = L.latLngBounds(points);
            searchMap.fitBounds(bounds, { padding: [50, 50] });
        }
        
        // Hide loading overlay
        hideLoading();
    } catch (error) {
        console.error("Error fetching locations:", error);
        hideLoading();
        alert("Đã xảy ra lỗi khi tìm kiếm địa điểm: " + error.message);
    }
}

// Helper function to draw route between two points
function drawRouteBetweenPoints(startPoint, endPoint) {
    // Clear existing route
    if (window.currentRoute) {
        searchMap.removeLayer(window.currentRoute);
        window.currentRoute = null;
    }
    
    // Make sure markers are visible
    if (window.currentLocationMarker && !searchMap.hasLayer(window.currentLocationMarker)) {
        window.currentLocationMarker.addTo(searchMap);
    }
    
    if (window.selectedLocationMarker && !searchMap.hasLayer(window.selectedLocationMarker)) {
        window.selectedLocationMarker.addTo(searchMap);
    }
    
    // Show loading popup
    const loadingPopup = L.popup()
        .setLatLng([startPoint.lat, startPoint.lng])
        .setContent(`
            <div style="text-align: center; padding: 5px;">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span style="margin-left: 5px;">Đang tính toán lộ trình...</span>
            </div>
        `)
        .openOn(searchMap);
    
    // Get route from OSRM API
    fetch(`https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.longitude},${endPoint.latitude}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            // Close loading popup
            searchMap.closePopup(loadingPopup);
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                
                // Convert coordinates from GeoJSON to Leaflet format
                const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Draw route
                window.currentRoute = L.polyline(routeCoordinates, {
                    color: '#007AFF',
                    weight: 5,
                    opacity: 0.8,
                    dashArray: '10, 10',
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(searchMap);
                
                // Calculate route info
                const distance = (route.distance / 1000).toFixed(2); // km
                const duration = Math.round(route.duration / 60); // minutes
                
                // Show route info popup
                L.popup()
                    .setLatLng([startPoint.lat, startPoint.lng])
                    .setContent(`
                        <div style="font-family: Arial, sans-serif; max-width: 200px;">
                            <strong style="color: #007AFF;">Thông tin lộ trình:</strong><br>
                            <strong>Khoảng cách:</strong> ${distance} km<br>
                            <strong>Thời gian lái xe:</strong> ${duration} phút<br>
                            <small>(Đây là tuyến đường lái xe ngắn nhất)</small>
                        </div>
                    `)
                    .openOn(searchMap);
                
                // Adjust map to show route
                const bounds = L.latLngBounds([
                    [startPoint.lat, startPoint.lng],
                    [endPoint.latitude, endPoint.longitude],
                    ...routeCoordinates
                ]);
                
                searchMap.fitBounds(bounds, { 
                    padding: [50, 50],
                    maxZoom: 16
                });
            } else {
                // Fall back to straight line if no route found
                window.currentRoute = L.polyline([
                    [startPoint.lat, startPoint.lng],
                    [endPoint.latitude, endPoint.longitude]
                ], {
                    color: '#007AFF',
                    weight: 5,
                    opacity: 0.8,
                    dashArray: '10, 10',
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(searchMap);
                
                // Calculate straight-line distance
                const airDistance = (endPoint.distance * 1000).toFixed(0);
                
                // Show fallback info popup
                L.popup()
                    .setLatLng([startPoint.lat, startPoint.lng])
                    .setContent(`
                        <div style="font-family: Arial, sans-serif; max-width: 200px;">
                            <strong style="color: #007AFF;">Không tìm thấy tuyến đường!</strong><br>
                            <strong>Khoảng cách đường chim bay:</strong> ${airDistance} m<br>
                            <small>(Đây là khoảng cách trực tiếp giữa hai điểm)</small>
                        </div>
                    `)
                    .openOn(searchMap);
            }
        })
        .catch(error => {
            console.error('Lỗi khi tính toán tuyến đường:', error);
            
            // Close loading popup
            searchMap.closePopup(loadingPopup);
            
            // Fall back to straight line on error
            window.currentRoute = L.polyline([
                [startPoint.lat, startPoint.lng],
                [endPoint.latitude, endPoint.longitude]
            ], {
                color: '#007AFF',
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 10',
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(searchMap);
            
            // Calculate straight-line distance
            const airDistance = (endPoint.distance * 1000).toFixed(0);
            
            // Show error popup
            L.popup()
                .setLatLng([startPoint.lat, startPoint.lng])
                .setContent(`
                    <div style="font-family: Arial, sans-serif; max-width: 200px;">
                        <strong style="color: #007AFF;">Lỗi khi tính toán tuyến đường!</strong><br>
                        <strong>Khoảng cách đường chim bay:</strong> ${airDistance} m<br>
                        <small>(Đây là khoảng cách trực tiếp giữa hai điểm)</small>
                    </div>
                `)
                .openOn(searchMap);
        });
}

// Export functions for use in other files
window.searchFunctions = {
    selectedLocation,
    showLoading,
    hideLoading,
    getCurrentLocation,
    SearchPlaces
};