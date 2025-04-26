import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import MainLayout from '../layouts/MainLayout';
import styles from '../styles/Recommend.module.css';

// Dynamically import the Map component with no SSR since Leaflet requires window
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder}>Loading map...</div>,
});

export default function Recommend() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultCount, setResultCount] = useState();
  const [recommendationType, setRecommendationType] = useState('popular');
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchMarkers = useRef([]);
  const currentRoute = useRef(null);

  // Handle search input change with debouncing
  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length < 3) {
      setShowSuggestions(false);
      setSearchSuggestions([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        setSearchSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setShowSuggestions(false);
      }
    }, 300);
  };

  // Handle location suggestion selection
  const handleSuggestionSelect = (place) => {
    const location = {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      name: place.display_name
    };
    
    setSelectedLocation(location);
    setSearchQuery(place.display_name);
    setShowSuggestions(false);
    
    // Create a direct way to update the map position
    if (mapRef.current) {
      // Check if the method exists before calling it
      if (typeof mapRef.current.setLocationMarker === 'function') {
        mapRef.current.setLocationMarker(location);
      } else {
        // Fallback: Use a custom event to communicate with the Map component
        const customEvent = new CustomEvent('setLocation', { 
          detail: location 
        });
        document.dispatchEvent(customEvent);
      }
      
      // Clear previous markers
      clearMarkers();
      
      setRecommendationType('popular');
      fetchPopularRecommendations();
    } else {
      // If mapRef.current is null, set loading to false
      setLoading(false);
      console.log('🔴 Map reference not available');
    }
  };

  // Handle search button click (Most Popular)
  const handleRecommendPopular = () => {
    if (!selectedLocation) {
      alert('Please select a location first');
      return;
    }
    
    setRecommendationType('popular');
    
    if (mapRef.current) {
      clearMarkers();
      setLoading(true);
      fetchPopularRecommendations();
    }
  };

  // Handle using current location
  const handleUseCurrentLocation = () => {
    if (!isMapReady) {
      console.log('🔴 Map is not ready yet');
      return;
    }
    
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Reverse geocode the coordinates to get a place name
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
              const location = {
                lat,
                lng,
                name: data.display_name || `Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`
              };
              
              setSelectedLocation(location);
              setSearchQuery(location.name);
              
              // Try to set marker using map ref
              if (mapRef.current && mapRef.current.setCurrentLocationMarker) {
                console.log('📍 Setting current location marker:', location);
                mapRef.current.setCurrentLocationMarker(location);
              } else {
                console.log('🔴 setCurrentLocationMarker method not available, using event');
                // Fallback to custom event
                const event = new CustomEvent('setCurrentLocation', {
                  detail: location
                });
                document.dispatchEvent(event);
              }
              
              setLoading(false);
            })
            .catch(error => {
              console.error('Error reverse geocoding:', error);
              const location = {
                lat,
                lng,
                name: `Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`
              };
              
              setSelectedLocation(location);
              setSearchQuery(location.name);
              
              // Try to set marker using map ref
              if (mapRef.current && mapRef.current.setCurrentLocationMarker) {
                console.log('📍 Setting current location marker:', location);
                mapRef.current.setCurrentLocationMarker(location);
              } else {
                console.log('🔴 setCurrentLocationMarker method not available, using event');
                // Fallback to custom event
                const event = new CustomEvent('setCurrentLocation', {
                  detail: location
                });
                document.dispatchEvent(event);
              }
              
              setLoading(false);
            });
        },
        (error) => {
          setLoading(false);
          alert(`Error getting current location: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLoading(false);
      alert('Your browser does not support geolocation');
    }
  };

  // Handle for you recommendations
  const handleRecommendForYou = () => {
    if (!selectedLocation) {
      alert('Please select a location first');
      return;
    }
    
    setRecommendationType('personal');
    
    if (mapRef.current) {
      clearMarkers();
      setLoading(true);
      fetchPersonalRecommendations();
    }
  };

  // Clear markers and current route
  const clearMarkers = () => {
    if (mapRef.current) {
      // Clear previous search markers
      if (searchMarkers.current && searchMarkers.current.length > 0) {
        searchMarkers.current.forEach(marker => {
          if (mapRef.current.removeMarker) {
            mapRef.current.removeMarker(marker);
          }
        });
      }
      searchMarkers.current = [];
      
      // Clear current route
      if (currentRoute.current) {
        if (mapRef.current.removePolyline) {
          mapRef.current.removePolyline(currentRoute.current);
        }
        currentRoute.current = null;
      }
    }
  };

  // Fetch popular recommendations
  const fetchPopularRecommendations = async () => {
    if (!selectedLocation) return;

    try {
      clearMarkers();
      
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        alert('You need to be logged in to get recommendations');
        // You might want to redirect to login page here
        return;
      }

      const response = await fetch(`/api/location/rcm/hot?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        setLoading(false);
        alert('Your session has expired. Please log in again.');
        // Redirect to login
        return;
      }

      const locations = await response.json();
      
      if (locations.error) {
        setLoading(false);
        alert(locations.error);
        return;
      }

      // Calculate distance and sort by visit count
      const locationsWithDistance = locations.map(location => {
        const distance = getDistance(
          selectedLocation.lat, 
          selectedLocation.lng, 
          location.latitude, 
          location.longitude
        );
        return { ...location, distance };
      }).sort((a, b) => b.visit_count - a.visit_count);
      
      setSearchResults(locationsWithDistance);
      
      if (locationsWithDistance.length === 0) {
        setResultCount('No popular locations found');
      } else {
        setResultCount(`${locationsWithDistance.length} results`);
        
        // Display markers on map
        if (mapRef.current) {
          displayLocationsOnMap(locationsWithDistance);
        }
      }
      
      // Set loading to false after successful completion
      setLoading(false);
    } catch (error) {
      console.error('Error fetching popular recommendations:', error);
      setLoading(false);
      setResultCount('Error fetching recommendations');
    }
  };

  // Fetch personal recommendations based on similar trajectories
  const fetchPersonalRecommendations = async () => {
    if (!selectedLocation) return;

    try {
      clearMarkers();
      
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        alert('You need to be logged in to get personal recommendations');
        return;
      }
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id) {
        setLoading(false);
        alert('User information not found');
        return;
      }

      const response = await fetch(`/api/location/rcm/same/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        setLoading(false);
        alert('Your session has expired. Please log in again.');
        return;
      }

      const data = await response.json();
      
      // Handle data whether it's an array directly or has a locations property
      const locations = Array.isArray(data) ? data : (data.locations || []);
      
      if (!locations || locations.length === 0) {
        setSearchResults([]);
        setResultCount('No personalized recommendations found');
        setLoading(false);
        return;
      }

      // Calculate distance from selected location
      const locationsWithDistance = locations.map(location => {
        const distance = getDistance(
          selectedLocation.lat, 
          selectedLocation.lng, 
          location.latitude, 
          location.longitude
        );
        return { ...location, distance };
      }).sort((a, b) => a.distance - b.distance);
      
      setSearchResults(locationsWithDistance);
      setResultCount(`${locationsWithDistance.length} results`);
      
      // Display markers on map
      if (mapRef.current) {
        displayLocationsOnMap(locationsWithDistance);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching personal recommendations:', error);
      setLoading(false);
      setResultCount('Error fetching recommendations');
    }
  };

  // Display locations on map
  const displayLocationsOnMap = (locations) => {
    if (!mapRef.current || !locations || locations.length === 0) return;
    
    console.log('🔍 Displaying locations on map:', locations.length);
    
    // Create bounds that include both the selected location and all result locations
    const points = [
      [selectedLocation.lat, selectedLocation.lng],
      ...locations.map(loc => [loc.latitude, loc.longitude])
    ];
    
    // Approach 1: Try to use mapRef directly with searchNearbyPlaces method
    if (mapRef.current && typeof mapRef.current.searchNearbyPlaces === 'function') {
      console.log('🔍 Using mapRef.current.searchNearbyPlaces');
      mapRef.current.searchNearbyPlaces(selectedLocation, 'all');
      return;
    }
    
    // Approach 2: As a fallback, dispatch a custom event
    console.log('🔍 Using fallback method to show location markers');
    const searchEvent = new CustomEvent('searchNearbyPlaces', { 
      detail: { location: selectedLocation, category: 'all', results: locations },
      bubbles: true
    });
    document.dispatchEvent(searchEvent);
    
    // Approach 3: Also try to manually show each location marker 
    // if individual marker method exists or via custom event
    locations.forEach((location, index) => {
      if (mapRef.current && typeof mapRef.current.showLocationMarker === 'function') {
        mapRef.current.showLocationMarker(location);
      } else if (mapRef.current && typeof mapRef.current.addPointOfInterest === 'function') {
        // Use the existing addPointOfInterest method as a fallback
        const marker = mapRef.current.addPointOfInterest(
          location.latitude, 
          location.longitude, 
          location.name, 
          `
            <div class="${styles.popupContent}">
              <strong class="${styles.popupTitle}">${location.name}</strong><br>
              ${location.category ? `<span class="${styles.popupMeta}"><strong>Type:</strong> ${location.category}</span><br>` : ''}
              ${location.tag ? `<span class="${styles.popupMeta}"><strong>Category:</strong> ${location.tag}</span><br>` : ''}
              ${location.visit_count ? `<span class="${styles.popupMeta}"><strong>Visits:</strong> ${location.visit_count}</span><br>` : ''}
              <span class="${styles.popupDistance}">Distance: ${(location.distance * 1000).toFixed(0)}m</span>
            </div>
          `,
          index + 1
        );
        searchMarkers.current.push(marker);
      } else {
        // Last resort: use custom event
        const event = new CustomEvent('showLocation', {
          detail: location,
          bubbles: true
        });
        document.dispatchEvent(event);
      }
    });
    
    // Fit map to include all points
    if (mapRef.current && typeof mapRef.current.fitBounds === 'function') {
      mapRef.current.fitBounds(points);
    }
  };

  // Handle result item click
  const handleResultItemClick = (location) => {
    if (!mapRef.current) {
      console.log('🔴 Map reference not available');
      return;
    }
    
    try {
      console.log('🌍 Result item clicked:', location);
      console.log('🌍 Selected location:', selectedLocation);
      
      // Clear previous route
      if (currentRoute.current) {
        if (mapRef.current.removePolyline) {
          mapRef.current.removePolyline(currentRoute.current);
        }
        currentRoute.current = null;
      }
      
      // First try to use the focusLocationAndDrawRoute method if available
      if (typeof mapRef.current.focusLocationAndDrawRoute === 'function') {
        console.log('🌍 Calling focusLocationAndDrawRoute with:', selectedLocation, location);
        mapRef.current.focusLocationAndDrawRoute(selectedLocation, location);
      } 
      // Then try to use the drawRoute method if available
      else if (typeof mapRef.current.drawRoute === 'function') {
        console.log('🌍 Using drawRoute method');
        mapRef.current.drawRoute(
          selectedLocation.lat,
          selectedLocation.lng,
          location.latitude,
          location.longitude
        );
      } 
      // If neither method is available, dispatch a custom event
      else {
        console.log('🌍 No direct route drawing method available, using custom event');
        const event = new CustomEvent('focusLocationAndDrawRoute', {
          detail: { 
            startLocation: selectedLocation, 
            endLocation: location 
          },
          bubbles: true
        });
        document.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error focusing location and drawing route:', error);
    }
  };

  // Function to show route from selected location to a destination using OSRM API
  const showRouteToLocation = async (location) => {
    if (!selectedLocation) return;
    
    // Clear previous route
    if (currentRoute.current) {
      if (mapRef.current.removePolyline) {
        mapRef.current.removePolyline(currentRoute.current);
      }
      currentRoute.current = null;
    }
    
    try {
      setLoading(true);
      
      // Get route from OSRM API
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${selectedLocation.lng},${selectedLocation.lat};${location.longitude},${location.latitude}?overview=full&geometries=geojson`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Convert coordinates from GeoJSON (lng, lat) to Leaflet (lat, lng)
        const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        // Draw route with new style
        if (mapRef.current.addPolyline) {
          currentRoute.current = mapRef.current.addPolyline(routeCoordinates, {
            color: '#2563eb',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 10'
          });
        }
        
        // Calculate route info
        const distance = (route.distance / 1000).toFixed(2); // Convert to km with 2 decimal places
        const duration = Math.round(route.duration / 60); // Convert to minutes
        
        // Show route info popup
        if (mapRef.current.showPopup) {
          mapRef.current.showPopup(
            selectedLocation.lat,
            selectedLocation.lng,
            `
              <div class="${styles.routePopup}">
                <strong class="${styles.routePopupTitle}">Route Information:</strong><br>
                <div class="${styles.routePopupInfo}"><strong>Distance:</strong> ${distance} km</div>
                <div class="${styles.routePopupInfo}"><strong>Driving time:</strong> ${duration} minutes</div>
                <div class="${styles.routePopupNote}">(This is the shortest driving route)</div>
              </div>
            `
          );
        }
        
        // Fit map to show the entire route
        if (mapRef.current.fitBounds) {
          mapRef.current.fitBounds([
            [selectedLocation.lat, selectedLocation.lng],
            [location.latitude, location.longitude],
            ...routeCoordinates
          ]);
        }
      } else {
        // If no route found, draw simple straight line
        if (mapRef.current.addPolyline) {
          currentRoute.current = mapRef.current.addPolyline([
            [selectedLocation.lat, selectedLocation.lng],
            [location.latitude, location.longitude]
          ], {
            color: '#2563eb',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 10'
          });
        }
        
        // Calculate air distance
        const airDistance = (getDistance(
          selectedLocation.lat, 
          selectedLocation.lng, 
          location.latitude, 
          location.longitude
        ) * 1000).toFixed(0);
        
        // Show no route found message
        if (mapRef.current.showPopup) {
          mapRef.current.showPopup(
            selectedLocation.lat,
            selectedLocation.lng,
            `
              <div class="${styles.routePopup}">
                <strong class="${styles.routePopupTitle}">Route not found!</strong><br>
                <div class="${styles.routePopupInfo}"><strong>Air distance:</strong> ${airDistance} m</div>
                <div class="${styles.routePopupNote}">(This is the direct distance between the points)</div>
              </div>
            `
          );
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error calculating route:', error);
      setLoading(false);
      
      // Draw simple line if error
      if (mapRef.current.addPolyline) {
        currentRoute.current = mapRef.current.addPolyline([
          [selectedLocation.lat, selectedLocation.lng],
          [location.latitude, location.longitude]
        ], {
          color: '#2563eb',
          weight: 5,
          opacity: 0.8,
          dashArray: '10, 10'
        });
      }
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add event listener for location selection from map clicks
  useEffect(() => {
    const handleLocationSelected = (e) => {
      console.log('locationSelected event received in Recommend component:', e.detail);
      const location = e.detail;
      setSelectedLocation(location);
      setSearchQuery(location.name);
    };
    
    document.addEventListener('locationSelected', handleLocationSelected);
    
    return () => {
      document.removeEventListener('locationSelected', handleLocationSelected);
    };
  }, []);

  // Add event listener for setting current location
  useEffect(() => {
    const handleSetCurrentLocation = (e) => {
      console.log('setCurrentLocation event received in Recommend component:', e.detail);
      const location = e.detail;
      
      if (location) {
        setSelectedLocation(location);
        setSearchQuery(location.name);
      }
    };
    
    document.addEventListener('setCurrentLocation', handleSetCurrentLocation);
    
    return () => {
      document.removeEventListener('setCurrentLocation', handleSetCurrentLocation);
    };
  }, []);

  // Add event listener for map initialization
  useEffect(() => {
    const handleMapInitialized = (e) => {
      console.log('mapInitialized event received in Recommend component');
      setIsMapReady(true);
    };
    
    document.addEventListener('mapInitialized', handleMapInitialized);
    
    return () => {
      document.removeEventListener('mapInitialized', handleMapInitialized);
    };
  }, []);

  // Add event listener for showing location
  useEffect(() => {
    const handleShowLocation = (e) => {
      console.log('showLocation event received in Recommend component:', e.detail);
      const location = e.detail;
      
      if (location && mapRef.current) {
        // If we have a marker for this location, focus on it
        const marker = searchMarkers.current.find(m => 
          m.lat === location.latitude && m.lng === location.longitude
        );
        
        if (marker && typeof mapRef.current.focusOnMarker === 'function') {
          mapRef.current.focusOnMarker(marker);
        }
      }
    };
    
    document.addEventListener('showLocation', handleShowLocation);
    
    return () => {
      document.removeEventListener('showLocation', handleShowLocation);
    };
  }, []);

  // Helper function to calculate distance between two coordinates in kilometers
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
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

  return (
    <MainLayout title="Recommendations">
      <div className={styles.pageContainer}>
        <Head>
          <title>Smart Recommendations | Go-Map</title>
          <meta name="description" content="Get personalized location recommendations based on your preferences" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </Head>

        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Smart Recommendations</h1>
            <p>Discover places that match your interests and travel patterns</p>
          </div>
        </div>

        <div className={styles.contentContainer}>
          <div className={styles.searchPanel}>
            <div className={styles.searchInputWrapper}>
              <label htmlFor="location-search" className={styles.searchLabel}>
                <i className="fas fa-search"></i> Search Location
              </label>
              <div className={styles.searchInputContainer}>
                <input
                  ref={searchInputRef}
                  type="text"
                  id="location-search"
                  className={styles.searchInput}
                  placeholder="Enter location name (e.g. Ho Chi Minh City, Vietnam)"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestionsRef} className={styles.searchSuggestions}>
                    {suggestions.map((place, index) => (
                      <div
                        key={`${place.place_id}-${index}`}
                        className={styles.suggestionItem}
                        onClick={() => handleSuggestionSelect(place)}
                      >
                        {place.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.searchButtonsContainer}>
              <button 
                className={styles.primaryButton} 
                onClick={handleRecommendPopular}
              >
                <i className="fas fa-fire"></i>
                <span>Popular Places</span>
              </button>
              <button 
                className={styles.secondaryButton} 
                onClick={handleUseCurrentLocation}
              >
                <i className="fas fa-location-arrow"></i>
                <span>Use Current Location</span>
              </button>
              <button 
                className={styles.primaryButton} 
                onClick={handleRecommendForYou}
              >
                <i className="fas fa-user"></i>
                <span>For You</span>
              </button>
            </div>
          </div>
          
          <div className={styles.mapResultsContainer}>
            <div className={styles.mapWrapper}>
              <Map 
                ref={mapRef}
              />
            </div>
            
            <div className={styles.resultsPanel}>
              <div className={styles.resultsHeader}>
                <h3 className={styles.resultsTitle}>
                  <i className="fas fa-list"></i> Recommendations
                </h3>
                <p className={styles.resultCount}>{resultCount}</p>
              </div>
              <div className={styles.resultsContent}>
                {searchResults.length === 0 ? (
                  <div className={styles.noResults}>
                    {loading ? 'Searching...' : 'No recommendations found. Please select a location and click one of the recommendation buttons.'}
                  </div>
                ) : (
                  searchResults.map((location, index) => (
                    <div
                      key={`${location.id || index}`}
                      className={styles.locationItem}
                      onClick={() => handleResultItemClick(location)}
                    >
                      <div className={styles.locationIndex}>{index + 1}</div>
                      <div className={styles.locationDetails}>
                        <h5>{location.name}</h5>
                        <p className={styles.coordinates}>
                          <i className="fas fa-map-pin"></i> {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        </p>
                        {location.category && (
                          <p className={styles.locationMeta}>
                            <i className="fas fa-tag"></i> <strong>Type:</strong> {location.category}
                          </p>
                        )}
                        {location.tag && (
                          <p className={styles.locationMeta}>
                            <i className="fas fa-bookmark"></i> <strong>Category:</strong> {location.tag}
                          </p>
                        )}
                        {location.visit_count && (
                          <p className={styles.locationMeta}>
                            <i className="fas fa-users"></i> <strong>Visits:</strong> {location.visit_count}
                          </p>
                        )}
                        {location.activities && (
                          <p className={styles.locationMeta}>
                            <i className="fas fa-list-ul"></i> <strong>Activities:</strong> {location.activities.join(', ')}
                          </p>
                        )}
                        <div className={styles.distanceBadge}>
                          <i className="fas fa-route"></i> {(location.distance * 1000).toFixed(0)}m
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinnerContainer}>
              <div className={styles.spinner}></div>
              <div className={styles.loadingText}>
                {recommendationType === 'popular'
                  ? 'Finding popular places...'
                  : 'Finding personalized recommendations...'}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}