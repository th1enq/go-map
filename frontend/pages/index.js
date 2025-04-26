import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import Map from '../components/Map';
import MainLayout from '../layouts/MainLayout';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    // Remove token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Update login state
    setIsLoggedIn(false);
    
    // Redirect to login page
    router.push('/login');
  };

  return (
    <MainLayout>
      <div className={styles.container}>
        <Head>
          <title>Go-Map | Interactive Geospatial Application</title>
          <meta name="description" content="Go-Map is a comprehensive geospatial application for tracking, analyzing, and visualizing location data and trajectories." />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <div className={styles.main}>
          <div className={styles.hero}>
            <div className={styles.heroContent}>
              <h1>Explore the World with Go-Map</h1>
              <p>Track, analyze, and visualize location data with our comprehensive geospatial application</p>
              <div className={styles.heroBtns}>
                <Link href="/search" className={styles.primaryBtn}>
                  Start Exploring
                </Link>
              </div>
            </div>
          </div>

          <section className={styles.features}>
            <h2>Key Features</h2>
            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🔍</div>
                <h3>Location Services</h3>
                <p>Find nearby places based on your current location or any selected point on the map</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🛣️</div>
                <h3>Trajectory Management</h3>
                <p>Create, save, and visualize your movement paths using various input methods</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📍</div>
                <h3>Stay Point Detection</h3>
                <p>Automatically identify locations where users spend significant time</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>👥</div>
                <h3>Recommendation System</h3>
                <p>Get location recommendations based on similar user trajectories</p>
              </div>
            </div>
          </section>

          <section className={styles.mapPreview}>
            <h2>Interactive Map Experience</h2>
            <p>Our advanced mapping technology provides a seamless experience for exploring geographic data</p>
            <div className={styles.mapPlaceholder}>
              <Map 
                onSearchResultsUpdate={(results, category) => {
                  console.log('Search results:', results);
                }}
                onMapInitialized={() => {
                  console.log('Map has been initialized');
                }}
              />
              <style jsx global>{`
                .leaflet-container {
                  height: 400px;
                  width: 100%;
                  border-radius: 8px;
                }
              `}</style>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}