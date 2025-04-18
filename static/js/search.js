let selectedLocation = null;
let searchTimeout = null;

// Function to show loading overlay
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

// Function to hide loading overlay
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// Initialize location search
const searchInput = document.getElementById('location-search');
const suggestionsDiv = document.getElementById('search-suggestions');

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
                        window.mapFunctions.map.setView([selectedLocation.lat, selectedLocation.lng], 14);
                        window.mapFunctions.updateSelectedLocationMarker(selectedLocation.lat, selectedLocation.lng, selectedLocation.name);
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

// Map click handler
window.mapFunctions.map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    window.mapFunctions.clearCurrentRoute(); // Clear current route when selecting new location
    
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
            window.mapFunctions.updateSelectedLocationMarker(lat, lng, data.display_name);
        })
        .catch(error => {
            console.error('Error reverse geocoding:', error);
            selectedLocation = {
                lat: lat,
                lng: lng,
                name: `Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`
            };
            searchInput.value = selectedLocation.name;
            window.mapFunctions.updateSelectedLocationMarker(lat, lng, selectedLocation.name);
        });
});

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading();
        window.mapFunctions.clearCurrentRoute(); // Clear current route when getting current location
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Remove existing current location marker if any
                if (window.mapFunctions.currentLocationMarker) {
                    window.mapFunctions.map.removeLayer(window.mapFunctions.currentLocationMarker);
                }
                
                // Add new current location marker
                window.mapFunctions.currentLocationMarker = L.marker([lat, lng], { icon: window.mapFunctions.currentLocationIcon })
                    .addTo(window.mapFunctions.map)
                    .bindPopup('Current Location');
                
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
                        window.mapFunctions.map.setView([lat, lng], 14);
                        window.mapFunctions.updateSelectedLocationMarker(lat, lng, data.display_name);
                        hideLoading();
                    })
                    .catch(error => {
                        console.error('Error reverse geocoding:', error);
                        selectedLocation = {
                            lat: lat,
                            lng: lng,
                            name: `Current Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`
                        };
                        searchInput.value = selectedLocation.name;
                        window.mapFunctions.map.setView([lat, lng], 14);
                        window.mapFunctions.updateSelectedLocationMarker(lat, lng, selectedLocation.name);
                        hideLoading();
                    });
            },
            function(error) {
                hideLoading();
                alert("Error getting location: " + error.message);
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Search places function
async function searchPlaces() {
    if (!selectedLocation) {
        alert("Please select a location first");
        return;
    }

    const category = document.getElementById("category").value;
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    try {
        showLoading();
        window.mapFunctions.clearMarkers();
        window.mapFunctions.clearCurrentRoute(); // Clear current route when searching
        
        let response;
        if (category === "will_go") {
            // Use SearchActivitiesByLocation for "Will Go" category
            response = await fetch(`/api/location/search/activity?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`);
        } else {
            // Use regular search for other categories
            response = await fetch(`/api/location/search/place?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}&activity=${category}`);
        }
        
        const locations = await response.json();

        if (locations.error) {
            hideLoading();
            alert(locations.error);
            return;
        }

        // Calculate distance for each location and sort by distance
        const locationsWithDistance = locations.map(location => {
            const distance = window.mapFunctions.calculateDistance(
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
            resultsDiv.innerHTML = '<div class="no-results">No locations found</div>';
            hideLoading();
            return;
        }

        locationsWithDistance.forEach((location) => {
            const marker = L.marker([location.latitude, location.longitude])
                .addTo(window.mapFunctions.map)
                .bindPopup(`
                    <strong>${location.name}</strong><br>
                    ${location.category ? `Category: ${location.category}` : ''}<br>
                    ${location.tag ? `Type: ${location.tag}` : ''}<br>
                    ${location.activities ? `Activities: ${location.activities.join(', ')}` : ''}
                `);
            window.mapFunctions.markers.push(marker);

            const resultItem = document.createElement("div");
            resultItem.className = "location-item";
            resultItem.innerHTML = `
                <h5>${location.name}</h5>
                <p>Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}</p>
                ${location.category ? `<p class="mb-1"><small>Category: ${location.category}</small></p>` : ''}
                ${location.tag ? `<p class="mb-1"><small>Type: ${location.tag}</small></p>` : ''}
                ${location.activities ? `<p class="mb-1"><small>Activities: ${location.activities.join(', ')}</small></p>` : ''}
                <div class="distance-badge">${(location.distance * 1000).toFixed(0)}m</div>
            `;
            resultItem.onclick = () => {
                // Keep the current location centered and zoom in
                window.mapFunctions.map.setView([selectedLocation.lat, selectedLocation.lng], 19);
                marker.openPopup();
                
                // Explicitly clear current route before drawing a new one
                window.mapFunctions.clearCurrentRoute();
                
                // Draw route from current location to selected point
                if (selectedLocation) {
                    window.mapFunctions.drawRoute(selectedLocation.lat, selectedLocation.lng, location.latitude, location.longitude);
                }
            };
            resultsDiv.appendChild(resultItem);
        });

        if (locationsWithDistance.length > 0) {
            const bounds = L.latLngBounds(locationsWithDistance.map(loc => [loc.latitude, loc.longitude]));
            window.mapFunctions.map.fitBounds(bounds, { padding: [50, 50] });
        }
        hideLoading();
    } catch (error) {
        console.error("Error fetching locations:", error);
        hideLoading();
        alert("An error occurred while fetching locations.");
    }
}

// Update category select event listener
document.getElementById('category').addEventListener('change', function() {
    window.mapFunctions.clearCurrentRoute(); // Clear current route when changing category
});

// Export functions for use in other files
window.searchFunctions = {
    selectedLocation,
    showLoading,
    hideLoading,
    getCurrentLocation,
    searchPlaces
}; 