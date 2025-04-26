import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Layout.module.css';

export default function MainLayout({ children, title = 'Go-Map' }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({ role: null });
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    // Get user information if available
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    // Remove token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Update login state
    setIsLoggedIn(false);
    setUser({ role: null });
    
    // Redirect to login page
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>{title} | Go-Map</title>
        <meta name="description" content="Go-Map is a comprehensive geospatial application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <Link href="/">
            <h1>Go-Map</h1>
          </Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={router.pathname === '/' ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            Home
          </Link>
          <Link href="/search" className={router.pathname === '/search' ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            Search
          </Link>
          <Link href="/recommend" className={router.pathname === '/recommend' ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            Recommendations
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/settings" className={router.pathname === '/settings' ? `${styles.navLink} ${styles.active}` : styles.navLink}>
                Settings
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className={router.pathname === '/admin' ? `${styles.navLink} ${styles.active}` : styles.navLink}>
                  <span className="admin-badge">Admin</span>
                </Link>
              )}
              <a href="#" onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }} className={styles.loginBtn}>
                Logout
              </a>
            </>
          ) : (
            <Link href="/login" className={styles.loginBtn}>
              Login
            </Link>
          )}
        </nav>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Go-Map. All rights reserved.</p>
        <div className={styles.footerLinks}>
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
}