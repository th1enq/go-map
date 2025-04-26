import { useState, useEffect } from 'react';
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
  
  // State for trajectory
  const [trajectory, setTrajectory] = useState({
    name: '',
    method: 'manual'
  });
  
  // State for alerts
  const [alert, setAlert] = useState({ message: '', type: '' });
  
  // Map reference
  const [mapRef, setMapRef] = useState(null);
  
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
  
  // Handle map marker drag
  const handleMarkerDrag = (lat, lng) => {
    setLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };
  
  // Handle map click
  const handleMapClick = (lat, lng) => {
    setLocation(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };
  
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
              <i className="bi bi-geo-alt"></i> Add New Location
            </div>
            <div className={styles.cardBody}>
              <form onSubmit={handleLocationSubmit}>
                <div className="row">
                  <div className="col-md-6">
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
                  </div>
                  <div className="col-md-6">
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
                      </select>
                    </div>
                  </div>
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
                
                <div className={styles.formGroup}>
                  <div className={styles.map}>
                    {activeSection === 'locations' && (
                      <Map 
                        center={[location.latitude, location.longitude]} 
                        zoom={13}
                        markers={[{ 
                          position: [location.latitude, location.longitude],
                          draggable: true,
                          onDragEnd: handleMarkerDrag
                        }]}
                        onClick={handleMapClick}
                      />
                    )}
                  </div>
                  <small className="text-muted">You can also click on the map to set the coordinates</small>
                </div>
                
                <button type="submit" className={styles.buttonPrimary}>
                  <i className="bi bi-plus-circle"></i> Add Location
                </button>
              </form>
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