import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import MainLayout from '../layouts/MainLayout';
import styles from '../styles/Settings.module.css';

// Dynamically import the Map component with no SSR
const Map = dynamic(() => import('../components/Map'), { ssr: false });

export default function Settings() {
  const router = useRouter();
  
  // State for user data
  const [user, setUser] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: ''
  });
  
  // State for active section
  const [activeSection, setActiveSection] = useState('personal');
  
  // States for forms
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  
  // State for location form
  const [location, setLocation] = useState({
    name: '',
    category: '',
    latitude: 21.0278,
    longitude: 105.8342,
    description: ''
  });
  
  // State for OSM search
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  
  // State for input method (search or coordinates)
  const [inputMethod, setInputMethod] = useState('search');

  // State for trajectory
  const [trajectory, setTrajectory] = useState({
    name: '',
    method: 'manual'
  });
  
  // State for alerts
  const [alert, setAlert] = useState({ message: '', type: '' });
  
  // Add map reference using useRef for direct access to map methods
  const mapRef = useRef(null);
  
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

  // Check authentication on page load
  useEffect(() => {
    // Fetch user data when component mounts
    const fetchUserData = async () => {
      try {
        console.log("Fetching user authentication status...");
        
        // Call our Next.js API route which proxies to the backend
        const response = await fetch('/api/auth/status', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log("Auth status response:", response.status, response.statusText);
        
        if (!response.ok) {
          console.error("Authentication failed, redirecting to login");
          router.push('/login');
          return;
        }
        
        const data = await response.json();
        console.log("Auth data:", data);
        
        if (data && data.authenticated && data.user) {
          // Update user state with the retrieved data
          setUser({
            username: data.user.username || data.user.name || '',
            email: data.user.email || '',
            firstName: data.user.first_name || '',
            lastName: data.user.last_name || ''
          });
          
          showAlert('Welcome back!', 'success');
        } else {
          console.error("Authentication data incomplete, redirecting to login");
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showAlert('Failed to fetch user data. Please try again.', 'danger');
        router.push('/login');
      }
    };
    
    fetchUserData();
  }, [router]);
  
  // Add event listener for markerDragEnd event
  useEffect(() => {
    const handleMarkerDragEnd = (e) => {
      console.log('Marker drag end event received:', e.detail);
      const { lat, lng } = e.detail;
      
      // Update location state with the new coordinates
      setLocation(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));
      
      // Fetch location name from coordinates
      fetchLocationNameFromCoordinates(lat, lng);
    };
    
    document.addEventListener('markerDragEnd', handleMarkerDragEnd);
    
    return () => {
      document.removeEventListener('markerDragEnd', handleMarkerDragEnd);
    };
  }, []);
  
  // Add event listener for locationSelected event
  useEffect(() => {
    const handleLocationSelected = (e) => {
      console.log('Location selected event received:', e.detail);
      const { lat, lng, name } = e.detail;
      
      // Update location state with the selected location
      setLocation(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        name: name || prev.name // Keep existing name if new one is not provided
      }));
    };
    
    document.addEventListener('locationSelected', handleLocationSelected);
    
    return () => {
      document.removeEventListener('locationSelected', handleLocationSelected);
    };
  }, []);
  
  // Add event listener for clicks outside the search input
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Show alert function
  const showAlert = (message, type) => {
    setAlert({ message, type });
    
    // Clear alert after 5 seconds
    setTimeout(() => {
      setAlert({ message: '', type: '' });
    }, 5000);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        router.push('/login');
      } else {
        showAlert('Failed to logout. Please try again.', 'danger');
      }
    } catch (error) {
      console.error('Error logging out:', error);
      showAlert('Failed to logout. Please try again.', 'danger');
    }
  };
  
  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formData = {
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName
      };
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        showAlert('Profile updated successfully!', 'success');
      } else {
        showAlert('Failed to update profile. Please try again.', 'danger');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Failed to update profile. Please try again.', 'danger');
    }
  };
  
  // Handle password form submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Verify passwords match
    if (newPassword !== confirmPassword) {
      showAlert('New password and confirm password do not match', 'danger');
      return;
    }
    
    // Verify password length
    if (newPassword.length < 6) {
      showAlert('New password must be at least 6 characters long', 'danger');
      return;
    }
    
    try {
      const formData = {
        current_password: currentPassword,
        new_password: newPassword
      };
      
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        showAlert('Password changed successfully!', 'success');
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showAlert('Failed to change password. Please verify your current password and try again.', 'danger');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showAlert('Failed to change password. Please try again.', 'danger');
    }
  };
  
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
    console.log('🔍 Suggestion selected:', place);
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
  
  // Handle location form submission
  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formData = {
        name: location.name,
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        description: location.description,
        category: location.category
      };
      
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        showAlert('Location added successfully!', 'success');
        // Reset form
        setLocation({
          name: '',
          category: '',
          latitude: 21.0278,
          longitude: 105.8342,
          description: ''
        });
      } else {
        showAlert('Failed to add location. Please try again.', 'danger');
      }
    } catch (error) {
      console.error('Error adding location:', error);
      showAlert('Failed to add location. Please try again.', 'danger');
    }
  };
  
  // Handle marker drag
  const handleMarkerDrag = (lat, lng) => {
    setLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    
    // Reverse geocode to get location name
    fetchLocationNameFromCoordinates(lat, lng);
  };
  
  // Handle map click
  const handleMapClick = (lat, lng) => {
    setLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    
    // Reverse geocode to get location name
    fetchLocationNameFromCoordinates(lat, lng);
  };
  
  // Fetch location name from coordinates using Nominatim
  const fetchLocationNameFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch location details');
      }
      
      const data = await response.json();
      
      if (data && data.display_name) {
        // Create location object in the format expected by Map
        const locationObj = {
          lat: lat,
          lng: lng,
          name: data.display_name
        };
        
        // Update location state
        setLocation(prev => ({
          ...prev,
          name: data.display_name,
          latitude: lat,
          longitude: lng
        }));
        
        // Update search query if we're in search mode
        if (inputMethod === 'search') {
          setSearchQuery(data.display_name);
        }
        
        // Update map marker via map ref if available
        if (mapRef.current && typeof mapRef.current.setLocationMarker === 'function') {
          console.log('Updating marker via map ref after coordinates change');
          mapRef.current.setLocationMarker(locationObj);
        } else {
          // Fallback to event-based approach
          console.log('Updating marker via event after coordinates change');
          const setLocationEvent = new CustomEvent('setLocation', {
            detail: locationObj,
            bubbles: true
          });
          document.dispatchEvent(setLocationEvent);
        }
        
        console.log('Location updated from coordinates:', locationObj);
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
    }
  };
  
  // Update the useEffect for Map initialization
  useEffect(() => {
    // This effect runs once when the component mounts
    if (mapRef.current && location.latitude && location.longitude) {
      console.log('Setting initial map location when mapRef is ready');
      
      // Create location object in the format expected by the Map component
      const locationObj = {
        lat: location.latitude,
        lng: location.longitude,
        name: location.name || "Selected Location"
      };
      
      // Try to use the direct method first if available
      if (typeof mapRef.current.setLocationMarker === 'function') {
        console.log('Using setLocationMarker method');
        mapRef.current.setLocationMarker(locationObj);
      } else {
        // Fallback to event-based approach
        console.log('Using setLocation event');
        const setLocationEvent = new CustomEvent('setLocation', {
          detail: locationObj,
          bubbles: true
        });
        document.dispatchEvent(setLocationEvent);
      }
    }
  }, [mapRef.current, location.latitude, location.longitude, location.name]); // Run when mapRef or location changes
  
  // Render the appropriate section based on activeSection
  const renderSection = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-person"></i> Personal Information
            </div>
            <div className={styles.cardBody}>
              <form onSubmit={handleProfileSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className={styles.formGroup}>
                      <label htmlFor="username" className={styles.formLabel}>Username</label>
                      <input
                        type="text"
                        id="username"
                        className={styles.formControl}
                        placeholder="Your username"
                        value={user.username}
                        onChange={(e) => setUser({...user, username: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className={styles.formGroup}>
                      <label htmlFor="email" className={styles.formLabel}>Email</label>
                      <input
                        type="email"
                        id="email"
                        className={styles.formControl}
                        placeholder="your.email@example.com"
                        value={user.email}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6">
                    <div className={styles.formGroup}>
                      <label htmlFor="firstName" className={styles.formLabel}>First Name</label>
                      <input
                        type="text"
                        id="firstName"
                        className={styles.formControl}
                        placeholder="Your first name"
                        value={user.firstName}
                        onChange={(e) => setUser({...user, firstName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className={styles.formGroup}>
                      <label htmlFor="lastName" className={styles.formLabel}>Last Name</label>
                      <input
                        type="text"
                        id="lastName"
                        className={styles.formControl}
                        placeholder="Your last name"
                        value={user.lastName}
                        onChange={(e) => setUser({...user, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                <button type="submit" className={styles.buttonPrimary}>
                  <i className="bi bi-save"></i> Save Changes
                </button>
              </form>
            </div>
          </div>
        );
        
      case 'locations':
        return (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-geo-alt"></i> My Locations
            </div>
            <div className={styles.cardBody}>            
              <div className="tab-content mt-3">
                <div className="tab-pane fade show active" id="add-location">
                  <form onSubmit={handleLocationSubmit}>
                    <div className="row">
                      <div className="col-lg-6">
                        {/* Left column - Form inputs */}
                        <div className={styles.locationFormCard}>
                          <div className={styles.inputMethodSelector}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h5 className="m-0">Add Location</h5>
                              <div className={styles.switchContainer}>
                                <div className={`${styles.switchOption} ${inputMethod === 'search' ? styles.active : ''}`} onClick={() => setInputMethod('search')}>
                                  <i className="bi bi-search"></i> Search
                                </div>
                                <div className={`${styles.switchOption} ${inputMethod === 'coordinates' ? styles.active : ''}`} onClick={() => setInputMethod('coordinates')}>
                                  <i className="bi bi-geo"></i> Coordinates
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {inputMethod === 'search' ? (
                            <div className={styles.searchInputWrapper}>
                              <label htmlFor="locationSearch" className={styles.formLabel}>
                                <i className="bi bi-search"></i> Search Location
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
                          ) : (
                            <>
                              <div className={styles.formGroup}>
                                <label htmlFor="locationName" className={styles.formLabel}>Location Name</label>
                                <input
                                  type="text"
                                  id="locationName"
                                  className={styles.formControl}
                                  placeholder="Enter location name"
                                  value={location.name}
                                  onChange={(e) => setLocation({...location, name: e.target.value})}
                                  required
                                />
                              </div>
                              <div className="row">
                                <div className="col-md-6">
                                  <div className={styles.formGroup}>
                                    <label htmlFor="locationLatitude" className={styles.formLabel}>Latitude</label>
                                    <input
                                      type="number"
                                      step="any"
                                      id="locationLatitude"
                                      className={styles.formControl}
                                      placeholder="e.g. 21.0278"
                                      value={location.latitude}
                                      onChange={(e) => setLocation({...location, latitude: parseFloat(e.target.value)})}
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className={styles.formGroup}>
                                    <label htmlFor="locationLongitude" className={styles.formLabel}>Longitude</label>
                                    <input
                                      type="number"
                                      step="any"
                                      id="locationLongitude"
                                      className={styles.formControl}
                                      placeholder="e.g. 105.8342"
                                      value={location.longitude}
                                      onChange={(e) => setLocation({...location, longitude: parseFloat(e.target.value)})}
                                      required
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          <div className={styles.formGroup}>
                            <label htmlFor="locationCategory" className={styles.formLabel}>Category</label>
                            <select
                              id="locationCategory"
                              className={styles.formControl}
                              value={location.category}
                              onChange={(e) => setLocation({...location, category: e.target.value})}
                              required
                            >
                              <option value="">Select category</option>
                              <option value="travel">Travel</option>
                              <option value="restaurant">Restaurant</option>
                              <option value="entertainment">Entertainment</option>
                              <option value="sport">Sport</option>
                              <option value="education">Education</option>
                              <option value="shopping">Shopping</option>
                              <option value="health">Health</option>
                              <option value="business">Business</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          
                          <div className={styles.formGroup}>
                            <label htmlFor="locationDescription" className={styles.formLabel}>Description</label>
                            <textarea
                              id="locationDescription"
                              className={styles.formControl}
                              rows="3"
                              placeholder="Describe this location"
                              value={location.description}
                              onChange={(e) => setLocation({...location, description: e.target.value})}
                            ></textarea>
                          </div>
                          
                          <div className={styles.formActions}>
                            <button type="submit" className={styles.buttonPrimary}>
                              <i className="bi bi-plus-circle"></i> Add Location
                            </button>
                            <button type="button" className={styles.buttonOutline} onClick={() => {
                              setLocation({
                                name: '',
                                category: '',
                                latitude: 21.0278,
                                longitude: 105.8342,
                                description: ''
                              });
                              setSearchQuery('');
                            }}>
                              <i className="bi bi-x-circle"></i> Clear
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-lg-6">
                        {/* Right column - Map */}
                        <div className={styles.mapContainer}>
                          <div className={styles.mapHeader}>
                            <h5><i className="bi bi-pin-map"></i> Map View</h5>
                            <div className={styles.coordinates}>
                              <span>Lat: {location.latitude.toFixed(6)}</span>
                              <span>Lng: {location.longitude.toFixed(6)}</span>
                            </div>
                          </div>
                          <div className={styles.map}>
                          <Map 
                            ref={mapRef}
                            onMapInitialized={handleMapInitialized}
                          />
                          </div>
                          <div className={styles.mapHelp}>
                            <i className="bi bi-info-circle"></i> Click on the map to set location or drag the marker to adjust position
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'trajectories':
        return (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-map"></i> Add New Trajectory
            </div>
            <div className={styles.cardBody}>
              <form>
                <div className="row">
                  <div className="col-md-6">
                    <div className={styles.formGroup}>
                      <label htmlFor="trajectoryName" className={styles.formLabel}>Trajectory Name</label>
                      <input
                        type="text"
                        id="trajectoryName"
                        className={styles.formControl}
                        placeholder="Enter trajectory name"
                        value={trajectory.name}
                        onChange={(e) => setTrajectory({...trajectory, name: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className={styles.formGroup}>
                      <label htmlFor="trajectoryMethod" className={styles.formLabel}>Input Method</label>
                      <select
                        id="trajectoryMethod"
                        className={styles.formControl}
                        value={trajectory.method}
                        onChange={(e) => setTrajectory({...trajectory, method: e.target.value})}
                        required
                      >
                        <option value="manual">Manual Entry</option>
                        <option value="file">Upload GPX/KML File</option>
                        <option value="map">Draw on Map</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {trajectory.method === 'manual' && (
                  <div className={styles.formGroup}>
                    <div className={`${styles.alert} ${styles.alertInfo}`}>
                      <i className="bi bi-info-circle"></i>
                      Add trajectory points manually by clicking the "Add Point" button below.
                    </div>
                    
                    <div id="trajectory-points-container">
                      {/* Points will be added here */}
                    </div>
                    
                    <button type="button" className={styles.buttonOutline}>
                      <i className="bi bi-plus"></i> Add Point
                    </button>
                  </div>
                )}
                
                {trajectory.method === 'file' && (
                  <div className={styles.formGroup}>
                    <div className="input-group mb-3">
                      <input type="file" className={styles.formControl} id="trajectory-file" accept=".gpx,.kml,.json" />
                      <label className="input-group-text" htmlFor="trajectory-file">Upload</label>
                    </div>
                    <div className="form-text">Upload GPX, KML or JSON files containing trajectory data.</div>
                  </div>
                )}
                
                {trajectory.method === 'map' && (
                  <div className={styles.formGroup}>
                    <div className={styles.map}>
                      <Map
                        center={[location.latitude, location.longitude]}
                        zoom={13}
                      />
                    </div>
                    <div className="form-text">Click on the map to add trajectory points. Double click to complete.</div>
                  </div>
                )}
                
                <button type="submit" className={styles.buttonPrimary}>
                  <i className="bi bi-plus-circle"></i> Save Trajectory
                </button>
              </form>
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-lock"></i> Password & Security
            </div>
            <div className={styles.cardBody}>
              <form onSubmit={handlePasswordSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="currentPassword" className={styles.formLabel}>Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    className={styles.formControl}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="newPassword" className={styles.formLabel}>New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    className={styles.formControl}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword" className={styles.formLabel}>Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    className={styles.formControl}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                
                <button type="submit" className={styles.buttonPrimary}>
                  <i className="bi bi-save"></i> Change Password
                </button>
              </form>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Alert component
  const AlertComponent = () => {
    if (!alert.message) return null;
    
    const alertClass = {
      success: styles.alertSuccess,
      warning: styles.alertWarning,
      danger: styles.alertDanger,
      info: ''
    }[alert.type] || '';
    
    return (
      <div className={`${styles.alert} ${alertClass}`}>
        {alert.message}
      </div>
    );
  };
  
  return (
    <MainLayout>
      <Head>
        <title>Settings | Go Map</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>
      
      <div className={styles.settingsContainer}>
        <div className="container">
          <div className={styles.header}>
            <h1>Account Settings</h1>
            <p>Manage your account settings and preferences</p>
          </div>
          
          <div className={styles.alertContainer}>
            <AlertComponent />
          </div>
          
          <div className={styles.settingsLayout}>
            <div className={styles.sidebar}>
              <div className={styles.card}>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.username}
                  </div>
                  <div className={styles.userEmail}>{user.email}</div>
                </div>
                
                <nav>
                  <div 
                    className={`${styles.navItem} ${activeSection === 'personal' ? styles.navItemActive : ''}`}
                    onClick={() => setActiveSection('personal')}
                  >
                    <i className="bi bi-person"></i> Personal Information
                  </div>
                  <div 
                    className={`${styles.navItem} ${activeSection === 'locations' ? styles.navItemActive : ''}`}
                    onClick={() => setActiveSection('locations')}
                  >
                    <i className="bi bi-geo-alt"></i> My Locations
                  </div>
                  <div 
                    className={`${styles.navItem} ${activeSection === 'trajectories' ? styles.navItemActive : ''}`}
                    onClick={() => setActiveSection('trajectories')}
                  >
                    <i className="bi bi-map"></i> My Trajectories
                  </div>
                  <div 
                    className={`${styles.navItem} ${activeSection === 'security' ? styles.navItemActive : ''}`}
                    onClick={() => setActiveSection('security')}
                  >
                    <i className="bi bi-lock"></i> Password & Security
                  </div>
                </nav>
              </div>
            </div>
            
            <div className={styles.mainContent}>
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}