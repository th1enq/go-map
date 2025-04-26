import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from '../styles/Map.module.css';

// Dynamically import Leaflet with no SSR
const Map = forwardRef(({ onSearchResultsUpdate, onMapInitialized }, ref) => {
  const [map, setMap] = useState(null);
  const selectedLocationMarkerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);
  const searchMarkersRef = useRef([]);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [lastSelectedCategory, setLastSelectedCategory] = useState('all');
  const [leaflet, setLeaflet] = useState(null);
  const mapInitializedRef = useRef(false); // Add a ref to track if map has been initialized
  const [selectedLocation, setSelectedLocation] = useState(null); // Add state for selected location

  // Initialize map when component mounts and only in browser environment
  useEffect(() => {
    console.log('🌍 Map component mounted');
    
    // Return early if map is already initialized to prevent double initialization
    if (mapInitializedRef.current) {
      console.log('🌍 Map already initialized, skipping initialization');
      return;
    }
    
    if (typeof window !== 'undefined') {
      // Import Leaflet dynamically only on the client side
      import('leaflet').then((L) => {
        import('leaflet/dist/leaflet.css');
        
        console.log('🌍 Window is defined, initializing map');
        setLeaflet(L);
        
        // PATCH: Fix for deprecated Mozilla mouse events in Leaflet
        // This applies a patch before the map is initialized to prevent the warnings
        if (L.Browser && L.Browser.mozilla) {
          // Override the _onPointerMove method to avoid using deprecated properties
          const originalPointerMove = L.Map.Drag.prototype._onMove;
          L.Map.Drag.prototype._onMove = function(e) {
            // Create a patched event object that doesn't trigger deprecation warnings
            const patchedEvent = Object.assign({}, e);
            // Use standard properties instead of deprecated Mozilla-specific ones
            if (e.mozPressure !== undefined) delete patchedEvent.mozPressure;
            if (e.mozInputSource !== undefined) delete patchedEvent.mozInputSource;
            return originalPointerMove.call(this, patchedEvent);
          };
          
          // Also patch tap handler if it exists
          if (L.Map.Tap) {
            const originalTapOnDown = L.Map.Tap.prototype._onDown;
            L.Map.Tap.prototype._onDown = function(e) {
              const patchedEvent = Object.assign({}, e);
              if (e.mozPressure !== undefined) delete patchedEvent.mozPressure;
              if (e.mozInputSource !== undefined) delete patchedEvent.mozInputSource;
              return originalTapOnDown.call(this, patchedEvent);
            };
          }
        }

        // Only initialize the map on the client-side
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
          console.error('🔴 Map container not found');
          return;
        }
        
        // Check if there's already a map instance in this container
        if (mapContainer._leaflet_id) {
          console.log('🌍 Map container already has a Leaflet instance, skipping initialization');
          return;
        }
        
        console.log('🌍 Creating map instance');
        const mapInstance = L.map('map', {
          // Additional options that might help with event handling
          tap: false,  // Disable tap handler completely
          bounceAtZoomLimits: false,  // Disable bounce animation at zoom limits
          trackResize: true,  // Make sure map resizes with container
        }).setView([10.762622, 106.660172], 18);
        
        console.log('🌍 Map instance created');
        mapInitializedRef.current = true; // Mark map as initialized
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);

        // Set up map click handler for location selection
        console.log('🌍 Setting up map click handler');
        mapInstance.on('click', (e) => {
          console.log('🌍 Map click event received');
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          
          console.log('🌍 Map clicked at position:', lat, lng);
          
          // Clear current route if any
          if (currentRoute) {
            mapInstance.removeLayer(currentRoute);
            setCurrentRoute(null);
          }
          
          // Clear all existing markers
          if (selectedLocationMarkerRef.current) {
            console.log('🌍 Removing old selected location marker');
            mapInstance.removeLayer(selectedLocationMarkerRef.current);
            selectedLocationMarkerRef.current = null;
          }
          
          // Clear current location marker
          if (currentLocationMarkerRef.current) {
            console.log('🌍 Removing current location marker');
            mapInstance.removeLayer(currentLocationMarkerRef.current);
            currentLocationMarkerRef.current = null;
          }
          
          // Clear all search result markers
          if (searchMarkersRef.current.length > 0) {
            console.log('🌍 Removing old search result markers');
            searchMarkersRef.current.forEach(marker => {
              mapInstance.removeLayer(marker);
            });
            searchMarkersRef.current = [];
          }
          
          // Create icon for selected location
          const selectedLocationIcon = L.divIcon({
            className: 'selected-location-marker',
            html: '<div style="background-color: #2563eb; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          
          // Add temporary marker while waiting for geocoding
          const tempMarker = L.marker([lat, lng], { 
            icon: selectedLocationIcon,
            zIndexOffset: 1000
          });
          
          // Add marker to map first
          tempMarker.addTo(mapInstance);
          
          // Then bind popup
          tempMarker.bindPopup("Đang tìm thông tin địa điểm...");
          
          // Use setTimeout to ensure marker is fully added to map
          setTimeout(() => {
            tempMarker.openPopup();
          }, 100);
          
          // Then try to get more detailed information with reverse geocoding
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
              if (data && data.display_name) {
                const location = {
                  lat: lat,
                  lng: lng,
                  name: data.display_name
                };
                
                // Update marker popup
                tempMarker.setPopupContent(`
                  <div style="max-width: 250px; text-align: center;">
                    <strong style="font-size: 14px; color: #333;">${location.name}</strong>
                    <br>
                    <span style="font-size: 12px; color: #666;">
                      ${lat.toFixed(6)}, ${lng.toFixed(6)}
                    </span>
                  </div>
                `);
                
                console.log('🌍 Got geocoded location info:', location);

                selectedLocationMarkerRef.current = tempMarker;
                
                // Create a basic location object immediately
                const basicLocation = {
                  lat: lat,
                  lng: lng,
                  name: location.name,
                };
                
                // Update the selected location state
                setSelectedLocation(basicLocation);
                
                // Create and dispatch a locationSelected event
                const locationSelectedEvent = new CustomEvent('locationSelected', {
                  detail: basicLocation,
                  bubbles: true
                });
                
                // Dispatch the event on both document and the map element for maximum compatibility
                document.dispatchEvent(locationSelectedEvent);
                if (mapInstance) {
                  mapInstance.getContainer().dispatchEvent(locationSelectedEvent);
                }
                
                console.log('🌍 Creating locationSelected event with data:', basicLocation);
              }
            })
            .catch(error => {
              console.error('Error reverse geocoding:', error);
            });
        });
        
        setMap(mapInstance);
        console.log('🌍 Map instance set in state');
        
        // Notify parent component that map is initialized
        if (onMapInitialized) {
          console.log('🌍 Calling onMapInitialized callback');
          onMapInitialized();
        }
      });
      
      // Cleanup function to destroy map on unmount
      return () => {
        if (map) {
          map.remove();
        }
      };
    }
  }, [onMapInitialized]);

  // Add event listener for setCurrentLocation event
  useEffect(() => {
    if (!map || !leaflet) return;

    const handleSetCurrentLocation = (e) => {
      console.log('🌍 setCurrentLocation event received:', e.detail);
      const location = e.detail;
      
      if (!map) {
        console.log('🔴 Map instance not available');
        return;
      }
      
      // Clear all existing markers
      if (selectedLocationMarkerRef.current) {
        console.log('🌍 Removing selected location marker');
        map.removeLayer(selectedLocationMarkerRef.current);
        selectedLocationMarkerRef.current = null;
      }
      
      if (currentLocationMarkerRef.current) {
        console.log('🌍 Removing current location marker');
        map.removeLayer(currentLocationMarkerRef.current);
        currentLocationMarkerRef.current = null;
      }
      
      if (searchMarkersRef.current.length > 0) {
        console.log('🌍 Removing search result markers');
        searchMarkersRef.current.forEach(marker => {
          map.removeLayer(marker);
        });
        searchMarkersRef.current = [];
      }
      
      // Create icon for current location with pulsing effect
      const currentLocationIcon = leaflet.divIcon({
        className: 'current-location-marker',
        html: '<div style="background-color: #34C759; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); animation: pulse 2s infinite;"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      
      // Add styles for the pulse animation if they don't exist
      if (!document.getElementById('map-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'map-pulse-style';
        style.innerHTML = `
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Add new marker
      console.log('🌍 Adding new current location marker at:', location.lat, location.lng);
      const marker = leaflet.marker([location.lat, location.lng], { 
        icon: currentLocationIcon,
        zIndexOffset: 1000
      });
      
      // Add marker to map first
      marker.addTo(map);
      
      // Then bind and open popup
      marker.bindPopup(`
        <div style="max-width: 250px; text-align: center;">
          <strong style="font-size: 14px; color: #333;">Your current location</strong>
          <br>
          <span style="font-size: 12px; color: #666;">
            ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
          </span>
        </div>
      `);
      
      // Use setTimeout to ensure marker is fully added to map
      setTimeout(() => {
        marker.openPopup();
      }, 100);
      
      currentLocationMarkerRef.current = marker;
      
      // Use setTimeout to update map view
      setTimeout(() => {
        map.setView([location.lat, location.lng], 18);
      }, 100);
      
      console.log('🌍 Current location marker set successfully');
    };

    document.addEventListener('setCurrentLocation', handleSetCurrentLocation);
    return () => {
      document.removeEventListener('setCurrentLocation', handleSetCurrentLocation);
    };
  }, [map, leaflet]);

  // Add event listener for setLocation event
  useEffect(() => {
    if (!map || !leaflet) return;

    const handleSetLocation = (e) => {
      console.log('🌍 setLocation event received:', e.detail);
      const location = e.detail;
      
      if (!map) {
        console.log('🔴 Map instance not available');
        return;
      }
      
      // Clear all existing markers
      if (selectedLocationMarkerRef.current) {
        console.log('🌍 Removing selected location marker');
        map.removeLayer(selectedLocationMarkerRef.current);
        selectedLocationMarkerRef.current = null;
      }
      
      if (currentLocationMarkerRef.current) {
        console.log('🌍 Removing current location marker');
        map.removeLayer(currentLocationMarkerRef.current);
        currentLocationMarkerRef.current = null;
      }
      
      if (searchMarkersRef.current.length > 0) {
        console.log('🌍 Removing search result markers');
        searchMarkersRef.current.forEach(marker => {
          map.removeLayer(marker);
        });
        searchMarkersRef.current = [];
      }
      
      // Create icon for selected location
      const selectedLocationIcon = leaflet.divIcon({
        className: 'selected-location-marker',
        html: '<div style="background-color: #2563eb; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      
      // Add new marker
      const marker = leaflet.marker([location.lat, location.lng], { 
        icon: selectedLocationIcon,
        zIndexOffset: 1000
      });
      
      // Add marker to map first
      marker.addTo(map);
      
      // Then bind and open popup
      marker.bindPopup(`
        <div style="max-width: 250px; text-align: center;">
          <strong style="font-size: 14px; color: #333;">${location.name}</strong>
          <br>
          <span style="font-size: 12px; color: #666;">
            ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
          </span>
        </div>
      `);
      
      // Use setTimeout to ensure marker is fully added to map
      setTimeout(() => {
        marker.openPopup();
      }, 100);
      
      selectedLocationMarkerRef.current = marker;
      
      // Create a basic location object immediately
      const locationObj = {
        lat: location.lat,
        lng: location.lng,
        name: location.name
      };
      
      // Update the selected location state
      setSelectedLocation(locationObj);
      
      // Create and dispatch a locationSelected event
      const locationSelectedEvent = new CustomEvent('locationSelected', {
        detail: locationObj,
        bubbles: true
      });
      
      // Dispatch the event on both document and the map element for maximum compatibility
      document.dispatchEvent(locationSelectedEvent);
      if (map) {
        map.getContainer().dispatchEvent(locationSelectedEvent);
      }
      
      console.log('🌍 Creating locationSelected event from setLocation with data:', locationObj);
      
      // Use setTimeout to update map view
      setTimeout(() => {
        map.setView([location.lat, location.lng], 18);
      }, 100);
    };

    document.addEventListener('setLocation', handleSetLocation);
    return () => {
      document.removeEventListener('setLocation', handleSetLocation);
    };
  }, [map, leaflet]);

  // Create a POI icon for search results
  const createPoiIcon = (index) => {
    if (!leaflet) return null;
    
    const colors = ['#FF9500', '#34C759', '#5856D6', '#FF2D55', '#AF52DE', '#2563eb'];
    const color = colors[index % colors.length];
    
    return leaflet.divIcon({
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

  // Create a location icon with a different color
  const createLocationIcon = (leaflet) => {
    return leaflet.divIcon({
      className: 'location-marker',
      html: '<div style="background-color: #FF9500; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Draw a route between two points
  const drawRouteBetweenPoints = (startLocation, endLocation) => {
    if (!map || !leaflet) return;
    
    // Clear previous route if any
    if (currentRoute) {
      map.removeLayer(currentRoute);
      setCurrentRoute(null);
    }
    
    // Create start and end coordinates
    const startCoord = [startLocation.lat || startLocation.latitude, startLocation.lng || startLocation.longitude];
    const endCoord = [endLocation.latitude, endLocation.longitude];
    
    console.log('🌍 Drawing route between', startCoord, 'and', endCoord);
    
    // Draw a simple straight line for now
    // In a real app, you would use a routing service like OSRM, Mapbox, or Google Directions
    const routeLine = leaflet.polyline([startCoord, endCoord], {
      color: '#2563eb',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10',
      lineJoin: 'round'
    }).addTo(map);
    
    setCurrentRoute(routeLine);
    
    // Fit the map to show the entire route with padding
    const bounds = leaflet.latLngBounds([startCoord, endCoord]);
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  // Expose methods to the parent component via ref
  useImperativeHandle(ref, () => {
    console.log('🌍 Exposing map methods via ref');
    return {
      setLocationMarker: (location) => {
        console.log('🌍 setLocationMarker called with:', location);
        if (!map) {
          console.log('🔴 Map instance not available');
          return;
        }
        
        // Clear all existing markers
        if (selectedLocationMarkerRef.current) {
          console.log('🌍 Removing selected location marker');
          map.removeLayer(selectedLocationMarkerRef.current);
          selectedLocationMarkerRef.current = null;
        }
        
        if (currentLocationMarkerRef.current) {
          console.log('🌍 Removing current location marker');
          map.removeLayer(currentLocationMarkerRef.current);
          currentLocationMarkerRef.current = null;
        }
        
        if (searchMarkersRef.current.length > 0) {
          console.log('🌍 Removing search result markers');
          searchMarkersRef.current.forEach(marker => {
            map.removeLayer(marker);
          });
          searchMarkersRef.current = [];
        }
        
        // Create icon for selected location
        const selectedLocationIcon = leaflet.divIcon({
          className: 'selected-location-marker',
          html: '<div style="background-color: #2563eb; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        
        // Add new marker
        const marker = leaflet.marker([location.lat, location.lng], { 
          icon: selectedLocationIcon,
          zIndexOffset: 1000
        });
        
        // Add marker to map first
        marker.addTo(map);
        
        // Then bind and open popup
        marker.bindPopup(`
          <div style="max-width: 250px; text-align: center;">
            <strong style="font-size: 14px; color: #333;">${location.name}</strong>
            <br>
            <span style="font-size: 12px; color: #666;">
              ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
            </span>
          </div>
        `);
        
        selectedLocationMarkerRef.current = marker;
        
        // Update the selected location state
        setSelectedLocation({
          lat: location.lat,
          lng: location.lng,
          name: location.name
        });
        
        // Create and dispatch a locationSelected event
        const locationSelectedEvent = new CustomEvent('locationSelected', {
          detail: {
            lat: location.lat,
            lng: location.lng,
            name: location.name
          },
          bubbles: true
        });
        
        // Dispatch the event on both document and the map element for maximum compatibility
        document.dispatchEvent(locationSelectedEvent);
        if (map) {
          map.getContainer().dispatchEvent(locationSelectedEvent);
        }
        
        // Use setTimeout to ensure marker is fully added to map
        setTimeout(() => {
          marker.openPopup();
        }, 100);
        
        // Use setTimeout to update map view
        setTimeout(() => {
          map.setView([location.lat, location.lng], 18);
        }, 100);
      },
      
      setCurrentLocationMarker: (location) => {
        console.log('🌍 setCurrentLocationMarker called with:', location);
        if (!map) {
          console.log('🔴 Map instance not available');
          return;
        }
        
        // Clear all existing markers
        if (selectedLocationMarkerRef.current) {
          console.log('🌍 Removing selected location marker');
          map.removeLayer(selectedLocationMarkerRef.current);
          selectedLocationMarkerRef.current = null;
        }
        
        if (currentLocationMarkerRef.current) {
          console.log('🌍 Removing current location marker');
          map.removeLayer(currentLocationMarkerRef.current);
          currentLocationMarkerRef.current = null;
        }
        
        if (searchMarkersRef.current.length > 0) {
          console.log('🌍 Removing search result markers');
          searchMarkersRef.current.forEach(marker => {
            map.removeLayer(marker);
          });
          searchMarkersRef.current = [];
        }
        
        // Create icon for current location with pulsing effect
        const currentLocationIcon = leaflet.divIcon({
          className: 'current-location-marker',
          html: '<div style="background-color: #34C759; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); animation: pulse 2s infinite;"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        
        // Add styles for the pulse animation if they don't exist
        if (!document.getElementById('map-pulse-style')) {
          const style = document.createElement('style');
          style.id = 'map-pulse-style';
          style.innerHTML = `
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.3); opacity: 0.7; }
              100% { transform: scale(1); opacity: 1; }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Add new marker
        console.log('🌍 Adding new current location marker at:', location.lat, location.lng);
        const marker = leaflet.marker([location.lat, location.lng], { 
          icon: currentLocationIcon,
          zIndexOffset: 1000
        });
        
        // Add marker to map first
        marker.addTo(map);
        
        // Then bind and open popup
        marker.bindPopup(`
          <div style="max-width: 250px; text-align: center;">
            <strong style="font-size: 14px; color: #333;">Your current location</strong>
            <br>
            <span style="font-size: 12px; color: #666;">
              ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
            </span>
          </div>
        `);
        
        // Use setTimeout to ensure marker is fully added to map
        setTimeout(() => {
          marker.openPopup();
        }, 100);
        
        currentLocationMarkerRef.current = marker;
        
        // Use setTimeout to update map view
        setTimeout(() => {
          map.setView([location.lat, location.lng], 18);
        }, 100);
        
        console.log('🌍 Current location marker set successfully');
      },
      
      getSelectedLocation: () => {
        // Return the current selected location if available
        return selectedLocation;
      },
      
      searchNearbyPlaces: async (location, category) => {
        if (!map || !location) return;
        
        try {
          // Clear all existing markers
          if (selectedLocationMarkerRef.current) {
            console.log('🌍 Removing selected location marker');
            map.removeLayer(selectedLocationMarkerRef.current);
            selectedLocationMarkerRef.current = null;
          }
          
          if (currentLocationMarkerRef.current) {
            console.log('🌍 Removing current location marker');
            map.removeLayer(currentLocationMarkerRef.current);
            currentLocationMarkerRef.current = null;
          }
          
          if (searchMarkersRef.current.length > 0) {
            console.log('🌍 Removing search result markers');
            searchMarkersRef.current.forEach(marker => {
              map.removeLayer(marker);
            });
            searchMarkersRef.current = [];
          }
          
          // Clear previous route
          if (currentRoute) {
            map.removeLayer(currentRoute);
            setCurrentRoute(null);
          }
          
          // Save selected category for future reference
          setLastSelectedCategory(category);
          
          // Determine which API endpoint to use based on category
          let apiUrl;
          if (category === 'all') {
            apiUrl = `/api/location/search/activity?lat=${location.lat}&lng=${location.lng}`;
          } else {
            apiUrl = `/api/location/search/place?lat=${location.lat}&lng=${location.lng}&activity=${category}`;
          }
          
          const response = await fetch(apiUrl);
          const locations = await response.json();
          
          if (locations.error) {
            console.error('API Error:', locations.error);
            onSearchResultsUpdate([], category);
            return;
          }
          
          // Calculate distance for each location
          const locationsWithDistance = locations.map(loc => {
            const distance = calculateDistance(
              location.lat,
              location.lng,
              loc.latitude,
              loc.longitude
            );
            return { ...loc, distance };
          }).sort((a, b) => a.distance - b.distance);
          
          // Create markers for search results
          const newMarkers = [];
          locationsWithDistance.forEach((loc, index) => {
            const poiIcon = createPoiIcon(index);
            
            const marker = leaflet.marker([loc.latitude, loc.longitude], {
              icon: poiIcon
            })
              .addTo(map)
              .bindPopup(`
                <div style="max-width: 250px;">
                  <strong style="font-size: 14px;">${loc.name}</strong><br>
                  ${loc.category ? `<span style="color: #666;"><strong>Type:</strong> ${loc.category}</span><br>` : ''}
                  ${loc.tag ? `<span style="color: #666;"><strong>Category:</strong> ${loc.tag}</span><br>` : ''}
                  ${loc.activities ? `<span style="color: #666;"><strong>Activities:</strong> ${loc.activities.join(', ')}</span><br>` : ''}
                  <span style="color: #2563eb; font-weight: bold; font-size: 13px;">Distance: ${(loc.distance * 1000).toFixed(0)}m</span>
                </div>
              `);
            
            newMarkers.push(marker);
          });
          
          searchMarkersRef.current = newMarkers;
          
          // Adjust map to show all markers
          if (locationsWithDistance.length > 0) {
            const points = [
              [location.lat, location.lng],
              ...locationsWithDistance.map(loc => [loc.latitude, loc.longitude])
            ];
            const bounds = leaflet.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50] });
          }
          
          // Call the callback to update parent component with results
          onSearchResultsUpdate(locationsWithDistance, category);
        } catch (error) {
          console.error('Error searching for places:', error);
          onSearchResultsUpdate([], category);
        }
      },
      
      focusLocationAndDrawRoute: (startLocation, endLocation) => {
        if (!map || !startLocation || !endLocation) return;
        
        // Focus on the selected location
        map.setView([endLocation.latitude, endLocation.longitude], 18);
        
        // Find and open the popup for this location
        searchMarkersRef.current.forEach((marker, index) => {
          const markerLatLng = marker.getLatLng();
          if (
            markerLatLng.lat.toFixed(5) === endLocation.latitude.toFixed(5) &&
            markerLatLng.lng.toFixed(5) === endLocation.longitude.toFixed(5)
          ) {
            marker.openPopup();
          }
        });
        
        // Draw route between points
        drawRouteBetweenPoints(startLocation, endLocation);
      },
      
      showLocationMarker: (location) => {
        console.log('🌍 showLocationMarker called with:', location);
        if (!map || !leaflet) {
          console.log('🔴 Map instance or leaflet not available');
          return;
        }
        
        // DO NOT clear existing markers - keep both the current location and selected location markers
        
        // Create a location icon
        const locationIcon = createLocationIcon(leaflet);
        
        // Add new marker for this specific location
        const marker = leaflet.marker([location.latitude, location.longitude], { 
          icon: locationIcon,
          zIndexOffset: 900 // Lower than main markers but still high
        });
        
        // Add marker to map
        marker.addTo(map);
        
        // Bind and open popup
        marker.bindPopup(`
          <div style="max-width: 250px;">
            <strong style="font-size: 14px;">${location.name}</strong><br>
            ${location.category ? `<span style="color: #666;"><strong>Type:</strong> ${location.category}</span><br>` : ''}
            ${location.tag ? `<span style="color: #666;"><strong>Category:</strong> ${location.tag}</span><br>` : ''}
            ${location.activities ? `<span style="color: #666;"><strong>Activities:</strong> ${location.activities.join(', ')}</span><br>` : ''}
            <span style="color: #2563eb; font-weight: bold; font-size: 13px;">Distance: ${(location.distance * 1000).toFixed(0)}m</span>
          </div>
        `);
        
        // Use setTimeout to ensure marker is fully added to map
        setTimeout(() => {
          marker.openPopup();
        }, 100);
        
        // Add to search markers so it can be cleared later if needed
        searchMarkersRef.current.push(marker);
        
        // Focus map on this marker
        map.setView([location.latitude, location.longitude], 18);
      }
    };
  }, [map, currentRoute, onSearchResultsUpdate, leaflet]);

  // Hàm tính khoảng cách giữa hai tọa độ (chuyển từ deg sang rad)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon1 - lon2);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Instead of returning the div directly, check if we're on the client side
  if (typeof window === 'undefined') {
    return <div className={styles.map}>Loading map...</div>;
  }

  return <div id="map" className={styles.map}></div>;
});

Map.displayName = 'Map';

// Export as a dynamic component with no SSR
export default dynamic(() => Promise.resolve(Map), {
  ssr: false
});