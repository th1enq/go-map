import { useState, useEffect } from 'react';
import styles from '../../styles/Admin.module.css';

export default function LocationManagement() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    category: '',
    latitude: '',
    longitude: ''
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 100,
    totalItems: 0
  });

  // Alert state
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    loadLocations();
  }, [pagination.currentPage]);

  // Load locations function
  const loadLocations = async () => {
    try {
      setLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Calculate offset based on current page
      const offset = (pagination.currentPage - 1) * pagination.itemsPerPage;
      
      // Fetch locations with pagination
      const response = await fetch(`/api/admin/locations?offset=${offset}&limit=${pagination.itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      
      // Extract locations array and total count
      let locationsData = [];
      let total = 0;
      
      if (data.locations && Array.isArray(data.locations)) {
        locationsData = data.locations;
        total = data.total || locationsData.length;
      } else if (Array.isArray(data)) {
        locationsData = data;
        total = data.length;
      } else if (typeof data === 'object' && data !== null) {
        // If response is an object but not an array, check if any property contains an array
        for (const key in data) {
          if (Array.isArray(data[key])) {
            locationsData = data[key];
            break;
          }
        }
        total = data.total || locationsData.length;
      }
      
      setLocations(locationsData);
      setPagination(prev => ({
        ...prev,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pagination.itemsPerPage))
      }));
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading locations:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Show add location modal
  const showAddLocationModal = () => {
    setCurrentLocation(null);
    setFormData({
      name: '',
      address: '',
      category: '',
      latitude: '',
      longitude: ''
    });
    setShowModal(true);
  };

  // Show edit location modal
  const showEditLocationModal = async (locationId) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Fetch location data
      const response = await fetch(`/api/admin/locations/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const locationData = await response.json();
      
      setCurrentLocation(locationData);
      setFormData({
        name: locationData.name || '',
        address: locationData.address || '',
        category: locationData.category || '',
        latitude: locationData.latitude || '',
        longitude: locationData.longitude || ''
      });
      
      setShowModal(true);
    } catch (err) {
      console.error('Error loading location data:', err);
      showAlert(`Failed to load location data: ${err.message}`, 'danger');
    }
  };

  // Save location (create or update)
  const saveLocation = async () => {
    try {
      // Validate form
      if (!formData.name || !formData.latitude || !formData.longitude) {
        showAlert('Please fill in all required fields', 'danger');
        return;
      }

      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Prepare request data
      const locationData = {
        name: formData.name,
        address: formData.address,
        category: formData.category,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      };
      
      // Determine if it's a create or update operation
      const url = currentLocation 
        ? `/api/admin/locations/${currentLocation.id}` 
        : '/api/admin/locations';
      
      const method = currentLocation ? 'PUT' : 'POST';

      // Make API request
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(locationData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to save location');
      }

      // Close modal and reload locations
      setShowModal(false);
      showAlert(`Location ${currentLocation ? 'updated' : 'created'} successfully`, 'success');
      loadLocations();
    } catch (err) {
      console.error('Error saving location:', err);
      showAlert(`Failed to save location: ${err.message}`, 'danger');
    }
  };

  // Delete location
  const deleteLocation = async (locationId) => {
    if (!confirm('Are you sure you want to delete this location?')) {
      return;
    }
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Make API request
      const response = await fetch(`/api/admin/locations/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      showAlert('Location deleted successfully', 'success');
      loadLocations();
    } catch (err) {
      console.error('Error deleting location:', err);
      showAlert(`Failed to delete location: ${err.message}`, 'danger');
    }
  };

  // Show alert message
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'success' });
    }, 5000);
  };

  // Handle pagination
  const handlePrevPage = () => {
    if (pagination.currentPage > 1) {
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
    }
  };

  const handleNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  };

  // Calculate pagination info
  const startItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const endItem = Math.min(startItem + pagination.itemsPerPage - 1, pagination.totalItems);

  if (loading && locations.length === 0) {
    return (
      <div className={styles.loadingSpinner}>
        <div className={styles.spinner}></div>
        <p>Loading locations...</p>
      </div>
    );
  }

  return (
    <div id="locations-section" className={styles.panel}>
      {/* Alert message */}
      {alert.show && (
        <div className={`${styles.alertContainer}`} style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', backgroundColor: alert.type === 'success' ? '#d1fae5' : '#fee2e2', color: alert.type === 'success' ? '#065f46' : '#b91c1c' }}>
          {alert.type === 'success' ? <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i> : <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>}
          {alert.message}
          <button 
            type="button" 
            style={{ float: 'right', background: 'transparent', border: 'none', cursor: 'pointer', color: alert.type === 'success' ? '#065f46' : '#b91c1c' }}
            onClick={() => setAlert({ show: false, message: '', type: 'success' })}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <h3 className={styles.pageTitle}>Locations Management</h3>
        <button className={styles.primaryButton} onClick={showAddLocationModal}>
          <i className="fas fa-plus-circle"></i> Add Location
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div id="locations-loading" className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading locations...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', backgroundColor: '#fee2e2', color: '#b91c1c', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}><i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>Error loading locations</h4>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Locations table */}
      <div className={styles.tableContainer} style={{ overflowX: 'auto' }}> 
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>User ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 && !loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>No locations found</td>
              </tr>
            ) : (
              locations.map(location => (
                <tr key={location.id}>
                  <td>{location.id || 'N/A'}</td>
                  <td>{location.name || 'N/A'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeInfo}`}>
                      <i className="fas fa-tag" style={{ marginRight: '0.25rem' }}></i>
                      {location.category || 'N/A'}
                    </span>
                  </td>
                  <td>{location.latitude?.toFixed(6) || 'N/A'}</td>
                  <td>{location.longitude?.toFixed(6) || 'N/A'}</td>
                  <td>{location.user_id || 'N/A'}</td>
                  <td>
                    <button 
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => showEditLocationModal(location.id)}
                      title="Edit Location"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => deleteLocation(location.id)}
                      title="Delete Location"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                    
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <div>
          <span>
            Showing {startItem}-{endItem} of {pagination.totalItems} locations
          </span>
        </div>
        <div className={styles.pagination}>
          <button 
            className={styles.pageButton}
            onClick={handlePrevPage}
            disabled={pagination.currentPage <= 1}
            style={{ opacity: pagination.currentPage <= 1 ? 0.5 : 1 }}
          >
            <i className="fas fa-chevron-left" style={{ marginRight: '0.25rem' }}></i> Previous
          </button>
          <button 
            className={styles.pageButton}
            onClick={handleNextPage}
            disabled={pagination.currentPage >= pagination.totalPages}
            style={{ opacity: pagination.currentPage >= pagination.totalPages ? 0.5 : 1 }}
          >
            Next <i className="fas fa-chevron-right" style={{ marginLeft: '0.25rem' }}></i>
          </button>
        </div>
      </div>

      {/* Modal Backdrop */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}></div>
      )}
      
      {/* Location Modal */}
      <div className={`${styles.modal} ${showModal ? styles.showModal : ''}`} tabIndex="-1" role="dialog">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>
                {currentLocation ? <><i className="fas fa-edit"></i> Edit Location</> : <><i className="fas fa-plus-circle"></i> Add Location</>}
              </h5>
              <button 
                type="button" 
                className={styles.modalCloseButton}
                onClick={() => setShowModal(false)} 
                aria-label="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={(e) => { e.preventDefault(); saveLocation(); }}>
                <div className={styles.formGroup}>
                  <label htmlFor="location-name" className={styles.formLabel}>
                    <i className="fas fa-map-signs" style={{ marginRight: '0.5rem' }}></i>Name
                  </label>
                  <input 
                    type="text" 
                    className={styles.formInput}
                    id="location-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required 
                    placeholder="Enter location name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="location-address" className={styles.formLabel}>
                    <i className="fas fa-map-marked-alt" style={{ marginRight: '0.5rem' }}></i>Address
                  </label>
                  <input 
                    type="text" 
                    className={styles.formInput}
                    id="location-address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter address"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="location-category" className={styles.formLabel}>
                    <i className="fas fa-tag" style={{ marginRight: '0.5rem' }}></i>Category
                  </label>
                  <input 
                    type="text" 
                    className={styles.formInput}
                    id="location-category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Enter category"
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div className={styles.formGroup}>
                      <label htmlFor="location-latitude" className={styles.formLabel}>
                        <i className="fas fa-arrows-alt-v" style={{ marginRight: '0.5rem' }}></i>Latitude
                      </label>
                      <input 
                        type="number" 
                        step="0.000001"
                        className={styles.formInput}
                        id="location-latitude"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter latitude"
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={styles.formGroup}>
                      <label htmlFor="location-longitude" className={styles.formLabel}>
                        <i className="fas fa-arrows-alt-h" style={{ marginRight: '0.5rem' }}></i>Longitude
                      </label>
                      <input 
                        type="number" 
                        step="0.000001"
                        className={styles.formInput}
                        id="location-longitude"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter longitude"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className={styles.modalFooter}>
              <button 
                type="button" 
                className={styles.actionButton}
                onClick={() => setShowModal(false)}
                style={{ backgroundColor: '#f3f4f6' }}
              >
                <i className="fas fa-times" style={{ marginRight: '0.25rem' }}></i> Cancel
              </button>
              <button 
                type="button" 
                className={styles.primaryButton}
                onClick={saveLocation}
              >
                <i className="fas fa-save" style={{ marginRight: '0.25rem' }}></i> Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}