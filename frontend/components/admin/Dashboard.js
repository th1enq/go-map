import { useState, useEffect } from 'react';
import styles from '../../styles/Admin.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    usersCount: 0,
    locationsCount: 0,
    trajectoriesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }
        
        // Fetch dashboard statistics
        const [usersResponse, locationsResponse, trajectoriesResponse] = await Promise.all([
          fetch('/api/admin/users/count', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          }),
          fetch('/api/admin/locations/count', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          }),
          fetch('/api/admin/trajectories/count', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          })
        ]);

        // Check if responses are ok
        if (!usersResponse.ok || !locationsResponse.ok || !trajectoriesResponse.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        // Parse response data
        const usersData = await usersResponse.json();
        const locationsData = await locationsResponse.json();
        const trajectoriesData = await trajectoriesResponse.json();

        // Update state with fetched data
        setStats({
          usersCount: usersData?.count || 0,
          locationsCount: locationsData?.count || 0,
          trajectoriesCount: trajectoriesData?.count || 0,
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingSpinner}>
        <div className={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', backgroundColor: '#fee2e2', color: '#b91c1c', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}><i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>Error loading dashboard</h4>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className={styles.statValue}>{stats.usersCount}</div>
              <div className={styles.statLabel}>Total Users</div>
            </div>
            <div style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              color: '#3b82f6', 
              borderRadius: '50%', 
              width: '60px', 
              height: '60px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <i className="fas fa-users" style={{ fontSize: '1.75rem' }}></i>
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className={styles.statValue}>{stats.locationsCount}</div>
              <div className={styles.statLabel}>Total Locations</div>
            </div>
            <div style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              color: '#10b981', 
              borderRadius: '50%', 
              width: '60px', 
              height: '60px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <i className="fas fa-map-marker-alt" style={{ fontSize: '1.75rem' }}></i>
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className={styles.statValue}>{stats.trajectoriesCount}</div>
              <div className={styles.statLabel}>Total Trajectories</div>
            </div>
            <div style={{ 
              backgroundColor: 'rgba(245, 158, 11, 0.1)', 
              color: '#f59e0b', 
              borderRadius: '50%', 
              width: '60px', 
              height: '60px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <i className="fas fa-route" style={{ fontSize: '1.75rem' }}></i>
            </div>
          </div>
        </div>
      </div>
  );
}