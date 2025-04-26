import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../layouts/MainLayout';
import styles from '../styles/Admin.module.css';

// Admin page components
import AdminDashboard from '../components/admin/Dashboard';
import UserManagement from '../components/admin/UserManagement';
import LocationManagement from '../components/admin/LocationManagement';
import TrajectoryManagement from '../components/admin/TrajectoryManagement';

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  
  // Check authentication and admin status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get user from localStorage
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        
        // If no token, redirect to login
        if (!token) {
          console.log('No token found, redirecting to login');
          router.push('/login');
          return;
        }
        
        // Parse user data
        const userData = userJson ? JSON.parse(userJson) : null;
        
        setUser(userData);
        
        // If user is not admin, redirect to home
        if (!userData || userData.role !== 'admin') {
          console.log('User is not admin, redirecting to home');
          router.push('/');
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p>Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.adminContainer}>
      <Head>
        <title>Admin Dashboard | Go Map</title>
        <meta name="description" content="Admin dashboard for Go Map" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>
      
      <div className={styles.adminContent}>
        {/* Sidebar */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Dashboard</h3>
          </div>
          <ul className={styles.navList}>
            <li className={styles.navItem}>
              <a 
                className={`${styles.navLink} ${activeTab === 'dashboard' ? styles.active : ''}`}
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('dashboard');
                }}
              >
                <i className={`fas fa-tachometer-alt ${styles.navIcon}`}></i>
                Dashboard
              </a>
            </li>
            <li className={styles.navItem}>
              <a 
                className={`${styles.navLink} ${activeTab === 'users' ? styles.active : ''}`}
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('users');
                }}
              >
                <i className={`fas fa-users ${styles.navIcon}`}></i>
                Users
              </a>
            </li>
            <li className={styles.navItem}>
              <a 
                className={`${styles.navLink} ${activeTab === 'locations' ? styles.active : ''}`}
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('locations');
                }}
              >
                <i className={`fas fa-map-marker-alt ${styles.navIcon}`}></i>
                Locations
              </a>
            </li>
            <li className={styles.navItem}>
              <a 
                className={`${styles.navLink} ${activeTab === 'trajectories' ? styles.active : ''}`}
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('trajectories');
                }}
              >
                <i className={`fas fa-route ${styles.navIcon}`}></i>
                Trajectories
              </a>
            </li>
            <li className={styles.navItem}>
              <a 
                className={`${styles.navLink}`}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/');
                }}
              >
                <i className={`fas fa-home ${styles.navIcon}`}></i>
                Return to Home
              </a>
            </li>
            <li className={styles.navItem}>
              <a 
                className={`${styles.navLink} ${styles.logoutLink}`}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
              >
                <i className={`fas fa-sign-out-alt ${styles.navIcon}`}></i>
                Logout
              </a>
            </li>
          </ul>
        </nav>

        {/* Main content */}
        <main className={styles.mainContent}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              {activeTab === 'dashboard' && <><i className="fas fa-tachometer-alt" style={{ marginRight: '0.5rem' }}></i>Dashboard Overview</>}
              {activeTab === 'users' && <><i className="fas fa-users" style={{ marginRight: '0.5rem' }}></i>Users Management</>}
              {activeTab === 'locations' && <><i className="fas fa-map-marker-alt" style={{ marginRight: '0.5rem' }}></i>Locations Management</>}
              {activeTab === 'trajectories' && <><i className="fas fa-route" style={{ marginRight: '0.5rem' }}></i>Trajectories Management</>}
            </h1>
            <div className={styles.pageActions}>
              <button className={styles.actionButton} onClick={() => window.location.reload()}>
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>

          <div className={styles.alertContainer}></div>

          {/* Dashboard Section */}
          {activeTab === 'dashboard' && <div className={styles.panel}><AdminDashboard /></div>}
          
          {/* Users Section */}
          {activeTab === 'users' && <div className={styles.panel}><UserManagement /></div>}
          
          {/* Locations Section */}
          {activeTab === 'locations' && <div className={styles.panel}><LocationManagement /></div>}
          
          {/* Trajectories Section */}
          {activeTab === 'trajectories' && <div className={styles.panel}><TrajectoryManagement /></div>}
        </main>
      </div>
    </div>
  );
}