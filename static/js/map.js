// Map initialization and configuration
let map = L.map('map').setView([10.762622, 106.660172], 14);
let markers = [];
let currentLocationMarker = null;
let selectedLocationMarker = null;
let currentRoute = null;

// Add gradient style for route
const routeStyle = {
    color: '#4a6bff',
    weight: 6,
    opacity: 0.8,
    dashArray: '10, 10',
    lineCap: 'round',
    lineJoin: 'round'
};

// Initialize map with OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// Create a red marker icon for current location
const currentLocationIcon = L.divIcon({
    className: 'current-location-marker',
    html: '<div style="background-color: red; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

// Create a red marker icon for selected location
const selectedLocationIcon = L.divIcon({
    className: 'selected-location-marker',
    html: '<div style="background-color: red; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

// Function to update selected location marker
function updateSelectedLocationMarker(lat, lng, name) {
    // Remove existing selected location marker if any
    if (selectedLocationMarker) {
        map.removeLayer(selectedLocationMarker);
    }
    
    // Add new selected location marker
    selectedLocationMarker = L.marker([lat, lng], { icon: selectedLocationIcon })
        .addTo(map)
        .bindPopup(name || 'Selected Location')
        .openPopup();
}

// Function to clear all markers except current location
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Function to clear current route
function clearCurrentRoute() {
    if (currentRoute) {
        map.removeLayer(currentRoute);
        currentRoute = null;
    }
}

// Function to draw route between two points
async function drawRoute(fromLat, fromLng, toLat, toLng) {
    // Remove existing route if any
    if (currentRoute) {
        map.removeLayer(currentRoute);
    }

    try {
        // Get route from OSRM
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            
            // Draw the route with the new style
            currentRoute = L.polyline(routeCoordinates, routeStyle).addTo(map);

            // Add route information to the map
            const distance = (route.distance / 1000).toFixed(1); // Convert to km
            const duration = Math.round(route.duration / 60); // Convert to minutes
            
            // Create a popup with route information
            const routeInfo = L.popup()
                .setLatLng([fromLat, fromLng])
                .setContent(`
                    <div style="font-family: Arial, sans-serif;">
                        <strong>Route Information:</strong><br>
                        Distance: ${distance} km<br>
                        Estimated time: ${duration} minutes<br>
                        <small>(This is the shortest driving route)</small>
                    </div>
                `)
                .openOn(map);
        }
    } catch (error) {
        console.error('Error drawing route:', error);
    }
}

// Function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Export functions and variables for use in other files
window.mapFunctions = {
    map,
    markers,
    currentLocationMarker,
    selectedLocationMarker,
    currentRoute,
    updateSelectedLocationMarker,
    clearMarkers,
    clearCurrentRoute,
    drawRoute,
    calculateDistance
};