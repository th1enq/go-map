import { useState, useEffect, useRef } from 'react';
import styles from '../../styles/Admin.module.css';

export default function TrajectoryManagement() {
  const [trajectories, setTrajectories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentTrajectory, setCurrentTrajectory] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    start_time: '',
    end_time: ''
  });
  
  // Map related states
  const [mapInstance, setMapInstance] = useState(null);
  const [trajectoryPoints, setTrajectoryPoints] = useState([]);
  const [trajectoryPath, setTrajectoryPath] = useState(null);
  const mapContainerRef = useRef(null);
  
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
    loadTrajectories();
    loadUsers(); // Load users for select dropdown
  }, [pagination.currentPage]);

  // Initialize map when modal is shown
  useEffect(() => {
    if (showModal && mapContainerRef.current) {
      // Initialize map after a short delay to ensure the container is rendered
      setTimeout(() => {
        initTrajectoryMap();
      }, 100);
    }
  }, [showModal]);

  // Load trajectories function
  const loadTrajectories = async () => {
    try {
      setLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Calculate offset based on current page
      const offset = (pagination.currentPage - 1) * pagination.itemsPerPage;
      
      // Fetch trajectories with pagination
      const response = await fetch(`/api/admin/trajectories?offset=${offset}&limit=${pagination.itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trajectories');
      }

      const data = await response.json();
      
      // Extract trajectories array and total count
      let trajectoriesData = [];
      let total = 0;
      
      if (data.trajectories && Array.isArray(data.trajectories)) {
        trajectoriesData = data.trajectories;
        total = data.total || trajectoriesData.length;
      } else if (Array.isArray(data)) {
        trajectoriesData = data;
        total = data.length;
      } else if (typeof data === 'object' && data !== null) {
        // If response is an object but not an array, check if any property contains an array
        for (const key in data) {
          if (Array.isArray(data[key])) {
            trajectoriesData = data[key];
            break;
          }
        }
        total = data.total || trajectoriesData.length;
      }
      
      setTrajectories(trajectoriesData);
      setPagination(prev => ({
        ...prev,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pagination.itemsPerPage))
      }));
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading trajectories:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Load users for select dropdown
  const loadUsers = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      
      // Fetch all users
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      
      // Extract users array
      let usersData = [];
      
      if (data.users && Array.isArray(data.users)) {
        usersData = data.users;
      } else if (Array.isArray(data)) {
        usersData = data;
      } else if (typeof data === 'object' && data !== null) {
        for (const key in data) {
          if (Array.isArray(data[key])) {
            usersData = data[key];
            break;
          }
        }
      }
      
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading users for dropdown:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Show add trajectory modal
  const showAddTrajectoryModal = () => {
    setCurrentTrajectory(null);
    setFormData({
      user_id: users.length > 0 ? users[0].id : '',
      start_time: formatDateTimeForInput(new Date()),
      end_time: formatDateTimeForInput(new Date(Date.now() + 3600000)) // 1 hour later
    });
    setShowModal(true);
  };

  // Show edit trajectory modal
  const showEditTrajectoryModal = async (trajectoryId) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Fetch trajectory data
      const response = await fetch(`/api/admin/trajectories/${trajectoryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trajectory data');
      }

      const trajectoryData = await response.json();
      
      setCurrentTrajectory(trajectoryData);
      setFormData({
        user_id: trajectoryData.user_id || '',
        start_time: formatDateTimeForInput(new Date(trajectoryData.start_time)) || '',
        end_time: formatDateTimeForInput(new Date(trajectoryData.end_time)) || ''
      });
      
      setShowModal(true);
    } catch (err) {
      console.error('Error loading trajectory data:', err);
      showAlert(`Failed to load trajectory data: ${err.message}`, 'danger');
    }
  };

  // Helper function to format date for datetime-local input
  const formatDateTimeForInput = (date) => {
    return date.toISOString().slice(0, 16);
  };

  // Initialize map for trajectory points
  const initTrajectoryMap = () => {
    // Check if Leaflet is available
    if (typeof window === 'undefined' || !window.L) {
      console.error('Leaflet library not found');
      return;
    }

    if (mapInstance) {
      // If map already exists, just resize it
      mapInstance.invalidateSize();
      return mapInstance;
    }

    const L = window.L;
    
    // Create a new map instance
    const map = L.map(mapContainerRef.current).setView([21.0278, 105.8342], 13);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Initialize polyline for trajectory path
    const path = L.polyline([], {
      color: 'blue',
      weight: 3
    }).addTo(map);
    
    setTrajectoryPath(path);
    setMapInstance(map);
    
    // Add click handler to add points
    map.on('click', handleMapClick);
    
    return map;
  };
  
  // Handle map click to add trajectory point
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    const now = new Date();
    
    // Create a new trajectory point
    const newPoint = {
      lat: lat,
      lng: lng,
      alt: 0,
      time: now
    };
    
    // Add to points array
    const updatedPoints = [...trajectoryPoints, newPoint];
    setTrajectoryPoints(updatedPoints);
    
    // Add marker at the clicked position
    if (mapInstance) {
      L.marker([lat, lng]).addTo(mapInstance);
      
      // Update polyline
      if (trajectoryPath) {
        trajectoryPath.setLatLngs(updatedPoints.map(p => [p.lat, p.lng]));
      }
      
      // Update form data with start/end times if first/last point
      if (updatedPoints.length === 1) {
        setFormData(prev => ({
          ...prev,
          start_time: formatDateTimeForInput(now)
        }));
      }
      
      setFormData(prev => ({
        ...prev,
        end_time: formatDateTimeForInput(now)
      }));
    }
  };
  
  // Clear trajectory points
  const clearTrajectoryPoints = () => {
    setTrajectoryPoints([]);
    
    // Clear markers from map
    if (mapInstance) {
      mapInstance.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          mapInstance.removeLayer(layer);
        }
      });
      
      // Reset polyline
      if (trajectoryPath) {
        trajectoryPath.setLatLngs([]);
      }
    }
  };

  // Save trajectory (create or update)
  const saveTrajectory = async () => {
    try {
      // Validate form
      if (!formData.user_id || !formData.start_time || !formData.end_time) {
        showAlert('Please fill in all required fields', 'danger');
        return;
      }

      // Check that end time is after start time
      if (new Date(formData.end_time) <= new Date(formData.start_time)) {
        showAlert('End time must be after start time', 'danger');
        return;
      }

      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Prepare request data
      const trajectoryData = {
        user_id: formData.user_id,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString()
      };
      
      // Add trajectory points from map if available
      if (trajectoryPoints.length > 0) {
        trajectoryData.points = trajectoryPoints.map(point => ({
          lat: point.lat,
          lng: point.lng,
          altitude: point.alt || 0,
          timestamp: point.time.toISOString()
        }));
      }
      
      // Determine if it's a create or update operation
      const url = currentTrajectory 
        ? `/api/admin/trajectories/${currentTrajectory.id}` 
        : '/api/admin/trajectories';
      
      const method = currentTrajectory ? 'PUT' : 'POST';

      // Make API request
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(trajectoryData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to save trajectory');
      }

      // Close modal and reload trajectories
      setShowModal(false);
      
      // Reset trajectory points
      setTrajectoryPoints([]);
      
      showAlert(`Trajectory ${currentTrajectory ? 'updated' : 'created'} successfully`, 'success');
      loadTrajectories();
    } catch (err) {
      console.error('Error saving trajectory:', err);
      showAlert(`Failed to save trajectory: ${err.message}`, 'danger');
    }
  };

  // Delete trajectory
  const deleteTrajectory = async (trajectoryId) => {
    if (!confirm('Are you sure you want to delete this trajectory?')) {
      return;
    }
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Make API request
      const response = await fetch(`/api/admin/trajectories/${trajectoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete trajectory');
      }

      showAlert('Trajectory deleted successfully', 'success');
      loadTrajectories();
    } catch (err) {
      console.error('Error deleting trajectory:', err);
      showAlert(`Failed to delete trajectory: ${err.message}`, 'danger');
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

  if (loading && trajectories.length === 0) {
    return (
      <div className={styles.loadingSpinner}>
        <div className={styles.spinner}></div>
        <p>Loading trajectories...</p>
      </div>
    );
  }

  return (
    <div id="trajectories-section" className={styles.panel}>
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
        <h3 className={styles.pageTitle}>Trajectories Management</h3>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div id="trajectories-loading" className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading trajectories...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', backgroundColor: '#fee2e2', color: '#b91c1c', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}><i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>Error loading trajectories</h4>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Trajectories table */}
      <div className={styles.tableContainer} style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Points Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trajectories.length === 0 && !loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No trajectories found</td>
              </tr>
            ) : (
              trajectories.map(trajectory => (
                <tr key={trajectory.id}>
                  <td>{trajectory.id || 'N/A'}</td>
                  <td>
                    <span className={styles.badge} style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                      <i className="fas fa-user" style={{ marginRight: '0.25rem' }}></i>
                      {trajectory.user_id || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <i className="fas fa-calendar-alt" style={{ marginRight: '0.5rem', color: '#6b7280' }}></i>
                    {new Date(trajectory.start_time).toLocaleString()}
                  </td>
                  <td>
                    <i className="fas fa-calendar-check" style={{ marginRight: '0.5rem', color: '#6b7280' }}></i>
                    {new Date(trajectory.end_time).toLocaleString()}
                  </td>
                  <td>
                    <span className={styles.badge} style={{ backgroundColor: '#10b981', color: 'white' }}>
                      <i className="fas fa-map-pin" style={{ marginRight: '0.25rem' }}></i>
                      {trajectory.points_count || 0}
                    </span>
                  </td>
                  <td>
                    <button 
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => showEditTrajectoryModal(trajectory.id)}
                      title="Edit Trajectory"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => deleteTrajectory(trajectory.id)}
                      title="Delete Trajectory"
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
            Showing {startItem}-{endItem} of {pagination.totalItems} trajectories
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
      
      {/* Trajectory Modal */}
      <div className={`${styles.modal} ${showModal ? styles.showModal : ''}`} tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>
                {currentTrajectory ? <><i className="fas fa-edit"></i> Edit Trajectory</> : <><i className="fas fa-plus-circle"></i> Add Trajectory</>}
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
              <form onSubmit={(e) => { e.preventDefault(); saveTrajectory(); }}>
                <div className={styles.formGroup}>
                  <label htmlFor="trajectory-user-id" className={styles.formLabel}>
                    <i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i>User
                  </label>
                  <select 
                    className={styles.formSelect}
                    id="trajectory-user-id"
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username || user.email || `User ID: ${user.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div className={styles.formGroup}>
                      <label htmlFor="trajectory-start-time" className={styles.formLabel}>
                        <i className="fas fa-calendar-alt" style={{ marginRight: '0.5rem' }}></i>Start Time
                      </label>
                      <input 
                        type="datetime-local" 
                        className={styles.formInput}
                        id="trajectory-start-time"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={styles.formGroup}>
                      <label htmlFor="trajectory-end-time" className={styles.formLabel}>
                        <i className="fas fa-calendar-check" style={{ marginRight: '0.5rem' }}></i>End Time
                      </label>
                      <input 
                        type="datetime-local" 
                        className={styles.formInput}
                        id="trajectory-end-time"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                </div>
                
                {/* Map for adding trajectory points */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem' }}></i>Add Points by Clicking on Map
                  </label>
                  <div 
                    ref={mapContainerRef} 
                    style={{ 
                      height: '300px', 
                      width: '100%', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd',
                      marginBottom: '1rem' 
                    }}
                  ></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span className={styles.formText}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                      {trajectoryPoints.length} point(s) added
                    </span>
                    <button 
                      type="button" 
                      className={styles.secondaryButton}
                      onClick={clearTrajectoryPoints}
                    >
                      <i className="fas fa-trash-alt" style={{ marginRight: '0.25rem' }}></i> Clear Points
                    </button>
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
                onClick={saveTrajectory}
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