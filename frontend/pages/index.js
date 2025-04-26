import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  useEffect(() => {
    // Any client-side effects can go here
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Go-Map | Interactive Geospatial Application</title>
        <meta name="description" content="Go-Map is a comprehensive geospatial application for tracking, analyzing, and visualizing location data and trajectories." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>Go-Map</h1>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.active}>
            Home
          </Link>
          <Link href="/search">
            Search
          </Link>
          <Link href="/recommend">
            Recommendations
          </Link>
          <Link href="/settings">
            Settings
          </Link>
          <Link href="/login" className={styles.loginBtn}>
            Login
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Explore the World with Go-Map</h1>
            <p>Track, analyze, and visualize location data with our comprehensive geospatial application</p>
            <div className={styles.heroBtns}>
              <Link href="/search" className={styles.primaryBtn}>
                Start Exploring
              </Link>
              <Link href="/register" className={styles.secondaryBtn}>
                Create Account
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
            {/* Map component will be placed here */}
            <div className={styles.mapOverlay}>Coming soon: Interactive map preview</div>
          </div>
        </section>
      </main>

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