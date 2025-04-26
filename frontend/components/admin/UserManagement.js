import { useState, useEffect } from 'react';
import styles from '../../styles/Admin.module.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
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
    loadUsers();
  }, [pagination.currentPage]);

  // Load users function
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Calculate offset based on current page
      const offset = (pagination.currentPage - 1) * pagination.itemsPerPage;
      
      // Fetch users with pagination
      const response = await fetch(`/api/admin/users?offset=${offset}&limit=${pagination.itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      // Extract users array and total count
      let usersData = [];
      let total = 0;
      
      if (data.users && Array.isArray(data.users)) {
        usersData = data.users;
        total = data.total || usersData.length;
      } else if (Array.isArray(data)) {
        usersData = data;
        total = data.length;
      } else if (typeof data === 'object' && data !== null) {
        // If response is an object but not an array, check if any property contains an array
        for (const key in data) {
          if (Array.isArray(data[key])) {
            usersData = data[key];
            break;
          }
        }
        total = data.total || usersData.length;
      }
      
      setUsers(usersData);
      setPagination(prev => ({
        ...prev,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pagination.itemsPerPage))
      }));
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Show add user modal
  const showAddUserModal = () => {
    setCurrentUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user'
    });
    setShowModal(true);
  };

  // Show edit user modal
  const showEditUserModal = async (userId) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Fetch user data
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      
      setCurrentUser(userData);
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        password: '', // Don't populate password
        role: userData.role || 'user'
      });
      
      setShowModal(true);
    } catch (err) {
      console.error('Error loading user data:', err);
      showAlert(`Failed to load user data: ${err.message}`, 'danger');
    }
  };

  // Save user (create or update)
  const saveUser = async () => {
    try {
      // Validate form
      if (!formData.username || !formData.email || (!currentUser && !formData.password)) {
        showAlert('Please fill in all required fields', 'danger');
        return;
      }

      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Prepare request data
      const userData = {
        username: formData.username,
        email: formData.email,
        role: formData.role
      };
      
      // Only include password if it's provided
      if (formData.password) {
        userData.password = formData.password;
      }
      
      // Determine if it's a create or update operation
      const url = currentUser 
        ? `/api/admin/users/${currentUser.id}` 
        : '/api/admin/users';
      
      const method = currentUser ? 'PUT' : 'POST';

      // Make API request
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to save user');
      }

      // Close modal and reload users
      setShowModal(false);
      showAlert(`User ${currentUser ? 'updated' : 'created'} successfully`, 'success');
      loadUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      showAlert(`Failed to save user: ${err.message}`, 'danger');
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Make API request
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      showAlert('User deleted successfully', 'success');
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      showAlert(`Failed to delete user: ${err.message}`, 'danger');
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

  if (loading && users.length === 0) {
    return (
      <div className={styles.loadingSpinner}>
        <div className={styles.spinner}></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div id="users-section" className={styles.panel}>
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
        <h3 className={styles.pageTitle}>Users Management</h3>
        <button className={styles.primaryButton} onClick={showAddUserModal}>
          <i className="fas fa-plus-circle"></i> Add User
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div id="users-loading" className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading users...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', backgroundColor: '#fee2e2', color: '#b91c1c', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}><i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>Error loading users</h4>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Users table */}
      <div className={styles.tableContainer} style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            {users.length === 0 && !loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.id || 'N/A'}</td>
                  <td>{user.username || 'N/A'}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>
                    <span className={`${styles.badge} ${user.role === 'admin' ? styles.badgeDanger : styles.badgeInfo}`}>
                      {user.role === 'admin' ? <i className="fas fa-shield-alt" style={{ marginRight: '0.25rem' }}></i> : <i className="fas fa-user" style={{ marginRight: '0.25rem' }}></i>}
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</td>
                  <td>
                    <button 
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => showEditUserModal(user.id)}
                      title="Edit User"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => deleteUser(user.id)}
                      title="Delete User"
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
          <span id="users-page-info">
            Showing {startItem}-{endItem} of {pagination.totalItems} users
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
      
      {/* User Modal */}
      <div className={`${styles.modal} ${showModal ? styles.showModal : ''}`} tabIndex="-1" role="dialog">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className={styles.modalHeader}>
              <h5 className={styles.modalTitle}>
                {currentUser ? <><i className="fas fa-user-edit"></i> Edit User</> : <><i className="fas fa-user-plus"></i> Add User</>}
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
              <form onSubmit={(e) => { e.preventDefault(); saveUser(); }}>
                <div className={styles.formGroup}>
                  <label htmlFor="user-name" className={styles.formLabel}>
                    <i className="fas fa-user" style={{ marginRight: '0.5rem' }}></i>Name
                  </label>
                  <input 
                    type="text" 
                    className={styles.formInput}
                    id="user-name"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required 
                    placeholder="Enter username"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="user-email" className={styles.formLabel}>
                    <i className="fas fa-envelope" style={{ marginRight: '0.5rem' }}></i>Email
                  </label>
                  <input 
                    type="email" 
                    className={styles.formInput}
                    id="user-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter email address"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="user-password" className={styles.formLabel}>
                    <i className="fas fa-lock" style={{ marginRight: '0.5rem' }}></i>Password
                  </label>
                  <input 
                    type="password" 
                    className={styles.formInput}
                    id="user-password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!currentUser}
                    placeholder={currentUser ? "Leave empty to keep current password" : "Enter password"}
                  />
                  {currentUser && (
                    <small style={{ display: 'block', color: '#6b7280', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.25rem' }}></i>
                      Leave empty to keep current password
                    </small>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="user-role" className={styles.formLabel}>
                    <i className="fas fa-user-tag" style={{ marginRight: '0.5rem' }}></i>Role
                  </label>
                  <select 
                    className={styles.formSelect}
                    id="user-role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
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
                onClick={saveUser}
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