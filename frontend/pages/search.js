import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import MainLayout from '../layouts/MainLayout';
import styles from '../styles/Search.module.css';

// Dynamically import the Map component with no SSR since Leaflet requires window
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder}>Loading map...</div>,
});

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [resultCount, setResultCount] = useState('Showing all categories');
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState(null);

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
    
    // Create a direct way to update the map position without relying on the ref methods
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
    }
  };

  // Handle search button click
  const handleSearch = () => {
    console.log('🔍 Search button clicked');
    console.log('🔍 Selected location:', selectedLocation);
    console.log('🔍 Map ref:', mapRef.current);
    
    if (!selectedLocation) {
      console.log('🔴 No location selected');
      alert('Please select a location first');
      return;
    }
    
    // Cập nhật marker và vị trí trên bản đồ
    if (mapRef.current) {
      console.log('🔍 Map ref exists, trying to set location marker');
      // Check if the method exists before calling it
      if (typeof mapRef.current.setLocationMarker === 'function') {
        console.log('🔍 Calling setLocationMarker with:', selectedLocation);
        mapRef.current.setLocationMarker(selectedLocation);
      } else {
        console.log('🔴 setLocationMarker method not available');
        // Fallback: Use a custom event to communicate with the Map component
        const customEvent = new CustomEvent('setLocation', { 
          detail: selectedLocation 
        });
        document.dispatchEvent(customEvent);
      }
    } else {
      console.log('🔴 Map ref is null');
    }
    
    // Gọi API tìm kiếm địa điểm gần đó dựa trên vị trí và danh mục đã chọn
    searchNearbyPlaces(selectedLocation, selectedCategory);
  };

  // Handle using current location
  const handleUseCurrentLocation = useCallback(async () => {
    console.log('📍 Use Current Location button clicked');
    
    if (!isMapReady) {
      console.log('🔴 Map is not ready yet');
      return;
    }
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      console.log('📍 Got current position:', position);
      
      const { latitude, longitude } = position.coords;
      
      // Get address from coordinates
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      
      console.log('📍 Got reverse geocoding result:', data);
      
      const location = {
        lat: latitude,
        lng: longitude,
        name: data.display_name
      };
      
      // Update search input
      setSearchQuery(location.name);
      setSelectedLocation(location);
      
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
    } catch (error) {
      console.error('Error getting current location:', error);
      setError('Could not get your current location. Please try again.');
    }
  }, [isMapReady]);

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  // Function to search nearby places - implementation to resolve the TypeError
  const searchNearbyPlaces = async (location, category) => {
    if (!location) return;
    
    setLoading(true);
    
    try {
      // Clear previous search results
      setSearchResults([]);
      
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
        setLoading(false);
        setSearchResults([]);
        if (category === 'all') {
          setResultCount();
        } else {
          const categoryName = getCategoryDisplayName(category);
          setResultCount();
        }
        return;
      }
      
      // Calculate distance for each location
      const locationsWithDistance = locations.map(loc => {
        const distance = getDistance(
          location.lat,
          location.lng,
          loc.latitude,
          loc.longitude
        );
        return { ...loc, distance };
      }).sort((a, b) => a.distance - b.distance);
      
      // Update results state
      setSearchResults(locationsWithDistance);
      
      if (locationsWithDistance.length === 0) {
        if (category === 'all') {
          setResultCount();
        } else {
          const categoryName = getCategoryDisplayName(category);
          setResultCount();
        }
      } else {
        if (category === 'all') {
          setResultCount(`(${locationsWithDistance.length} results)`);
        } else {
          const categoryName = getCategoryDisplayName(category);
          setResultCount(`${locationsWithDistance.length} results)`);
        }
      }
      
      setLoading(false);
      
      // QUAN TRỌNG: Đảm bảo gọi searchNearbyPlaces của map để hiển thị markers
      console.log('🔍 Calling map.searchNearbyPlaces with:', location, category);
      if (mapRef.current && typeof mapRef.current.searchNearbyPlaces === 'function') {
        // Cho phép map component xử lý kết quả để hiển thị markers
        mapRef.current.searchNearbyPlaces(location, category);
      } else {
        console.error('Map reference or searchNearbyPlaces method is not available!', mapRef.current);
      }
    } catch (error) {
      console.error('Error searching for nearby places:', error);
      setLoading(false);
      setResultCount('Error searching for places');
      setSearchResults([]);
    }
  };

  // Helper function to calculate distance between two coordinates in kilometers
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lat2 - lon1);
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

  // Handle search results update
  const handleSearchResultsUpdate = (results, category) => {
    setSearchResults(results);
    setLoading(false);
    
    if (results.length === 0) {
      if (category === 'all') {
        setResultCount('No results found');
      } else {
        const categoryName = getCategoryDisplayName(category);
        setResultCount(`No results found for ${categoryName}`);
      }
    } else {
      if (category === 'all') {
        setResultCount(`Showing all (${results.length} results)`);
      } else {
        const categoryName = getCategoryDisplayName(category);
        setResultCount(`Showing ${categoryName} (${results.length} results)`);
      }
    }
  };

  // Get display name for a category
  const getCategoryDisplayName = (category) => {
    const categories = {
      all: 'All',
      travel: 'Travel',
      restaurant: 'Restaurant',
      sport: 'Sport',
      education: 'Education',
      entertainment: 'Entertainment'
    };
    
    return categories[category] || category;
  };

  // Handle result item click
  const handleResultItemClick = (location) => {
    if (mapRef.current) {
      mapRef.current.focusLocationAndDrawRoute(selectedLocation, location);
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
      console.log('⭐ locationSelected event received in Search component:', e.detail);
      const location = e.detail;
      setSelectedLocation(location);
      setSearchQuery(location.name);
      
      // Không tự động tìm kiếm khi click vào map
      // Chỉ cập nhật vị trí đã chọn
      console.log('⭐ Location selected from map:', location);
    };

    // Log when the event listener is added
    console.log('⭐ Adding locationSelected event listeners in Search component');
    
    // Listen on both window and document for maximum compatibility
    window.addEventListener('locationSelected', handleLocationSelected);
    document.addEventListener('locationSelected', handleLocationSelected);
    
    // Add listener on map element if it exists
    const mapElement = document.getElementById('map');
    if (mapElement) {
      mapElement.addEventListener('locationSelected', handleLocationSelected);
      console.log('⭐ Also listening for locationSelected events on map element');
    } else {
      console.log('🔴 Map element not found when adding event listener');
    }
    
    return () => {
      console.log('⭐ Removing locationSelected event listeners in Search component');
      window.removeEventListener('locationSelected', handleLocationSelected);
      document.removeEventListener('locationSelected', handleLocationSelected);
      if (mapElement) {
        mapElement.removeEventListener('locationSelected', handleLocationSelected);
      }
    };
  }, []);

  // Add event listener for setCurrentLocation event
  useEffect(() => {
    const handleSetCurrentLocation = (e) => {
      console.log('📍 setCurrentLocation event received:', e.detail);
      const location = e.detail;
      
      if (mapRef.current && typeof mapRef.current.setCurrentLocationMarker === 'function') {
        console.log('📍 Setting current location marker from event:', location);
        mapRef.current.setCurrentLocationMarker(location);
      } else {
        console.log('🔴 Map ref or setCurrentLocationMarker method not available');
        // Try to get the map instance directly
        const mapElement = document.getElementById('map');
        if (mapElement) {
          console.log('📍 Found map element, dispatching event');
          const customEvent = new CustomEvent('setCurrentLocation', { 
            detail: location,
            bubbles: true
          });
          mapElement.dispatchEvent(customEvent);
        } else {
          console.log('🔴 Map element not found');
        }
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
      console.log('🌍 Map initialized event received');
      if (mapRef.current) {
        console.log('🌍 Map ref updated:', mapRef.current);
      }
    };

    document.addEventListener('mapInitialized', handleMapInitialized);
    return () => {
      document.removeEventListener('mapInitialized', handleMapInitialized);
    };
  }, []);

  // Handle map initialization
  const handleMapInitialized = useCallback(() => {
    console.log('📍 Map initialized');
    setIsMapReady(true);
  }, []);

  // Handle location selection
  const handleLocationSelected = useCallback((location) => {
    console.log('📍 Location selected:', location);
    setSelectedLocation(location);
    setSearchQuery(location.name);
  }, []);

  // Add an effect to properly handle search results and display markers
  useEffect(() => {
    // Only proceed if we have search results and a valid map reference
    if (searchResults.length > 0 && mapRef.current && selectedLocation) {
      console.log('🌍 Handling search results in effect hook');
      
      // If the map has the searchNearbyPlaces method, let it handle displaying all markers at once
      if (typeof mapRef.current.searchNearbyPlaces === 'function') {
        mapRef.current.searchNearbyPlaces(selectedLocation, selectedCategory);
      } 
      // If we need to show individual markers, use showLocationMarker if available
      else if (typeof mapRef.current.showLocationMarker === 'function') {
        searchResults.forEach(location => {
          mapRef.current.showLocationMarker(location);
        });
      } 
      // Last resort: dispatch custom events for each location
      else {
        console.log('🔴 Using fallback method to show location markers');
        searchResults.forEach(location => {
          const event = new CustomEvent('showLocation', {
            detail: location,
            bubbles: true
          });
          document.dispatchEvent(event);
        });
      }
    }
  }, [searchResults, selectedLocation, selectedCategory]);

  // Add event listener for the showLocation custom event
  useEffect(() => {
    const handleShowLocation = (e) => {
      const location = e.detail;
      
      // This is a fallback for when the map ref methods aren't accessible
      if (mapRef.current && typeof mapRef.current.showLocationMarker === 'function') {
        console.log('🌍 showLocation event received:', e.detail);
        mapRef.current.showLocationMarker(location);
      }
    };

    document.addEventListener('showLocation', handleShowLocation);
    return () => {
      document.removeEventListener('showLocation', handleShowLocation);
    };
  }, []);

  return (
    <MainLayout title="Search">
      <div className={styles.pageContainer}>
        <Head>
          <title>Smart Search | Go-Map</title>
          <meta name="description" content="Search for locations and points of interest with Go-Map" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </Head>

        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Smart Location Search</h1>
            <p>Find nearby places, explore new locations, and discover points of interest</p>
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
                onClick={() => {
                  console.log('🔍 Search button clicked from render');
                  handleSearch();
                }} 
                className={styles.primaryButton}
              >
                <i className="fas fa-map-marker-alt"></i> Search
              </button>
              <button 
                onClick={() => {
                  console.log('📍 Use Current Location button clicked from render');
                  handleUseCurrentLocation();
                }} 
                className={styles.secondaryButton}
              >
                <i className="fas fa-location-arrow"></i> Use Current Location
              </button>
            </div>
          </div>
          
          <div className={styles.categoryFilter}>
            <div className={styles.categoryHeader}>
              <h5 className={styles.categoryTitle}>Filter by Category</h5>
              <span className={styles.currentCategory}>
                {getCategoryDisplayName(selectedCategory)}
              </span>
            </div>
            <div className={styles.categoryButtons}>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === 'all' ? styles.active : ''}`}
                onClick={() => handleCategorySelect('all')}
              >
                <i className="fas fa-globe"></i> All
              </button>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === 'travel' ? styles.active : ''}`}
                onClick={() => handleCategorySelect('travel')}
              >
                <i className="fas fa-plane"></i> Travel
              </button>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === 'restaurant' ? styles.active : ''}`}
                onClick={() => handleCategorySelect('restaurant')}
              >
                <i className="fas fa-utensils"></i> Restaurant
              </button>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === 'sport' ? styles.active : ''}`}
                onClick={() => handleCategorySelect('sport')}
              >
                <i className="fas fa-running"></i> Sport
              </button>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === 'education' ? styles.active : ''}`}
                onClick={() => handleCategorySelect('education')}
              >
                <i className="fas fa-graduation-cap"></i> Education
              </button>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === 'entertainment' ? styles.active : ''}`}
                onClick={() => handleCategorySelect('entertainment')}
              >
                <i className="fas fa-film"></i> Entertainment
              </button>
            </div>
          </div>
          
          <div className={styles.mapResultsContainer}>
            <div className={styles.mapWrapper}>
              <Map 
                ref={mapRef}
                onSearchResultsUpdate={handleSearchResultsUpdate}
                onMapInitialized={handleMapInitialized}
              />
            </div>
            
            <div className={styles.resultsPanel}>
              <div className={styles.resultsHeader}>
                <h3 className={styles.resultsTitle}>
                  <i className="fas fa-list"></i> Search Results
                </h3>
                <p className={styles.resultCount}>{resultCount}</p>
              </div>
              <div className={styles.resultsContent}>
                {searchResults.length === 0 ? (
                  <div className={styles.noResults}>
                    {loading ? 'Searching...' : 'No results found. Please search for a location.'}
                  </div>
                ) : (
                  <div className={styles.locationItemsContainer}>
                    {searchResults.map((location, index) => {
                      // We'll handle all markers at once in an effect rather than on each render
                      return (
                        <div
                          key={`${location.id || index}`}
                          className={styles.locationItem}
                          onClick={() => {
                            handleResultItemClick(location);
                          }}
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
                      );
                    })}
                  </div>
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
                {selectedCategory === 'all'
                  ? 'Searching for all locations...'
                  : `Searching for ${getCategoryDisplayName(selectedCategory)} locations...`}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}