import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Layout.module.css';

export default function MainLayout({ children, title = 'Go-Map' }) {
  return (
    <div className={styles.container}>
      <Head>
        <title>{title} | Go-Map</title>
        <meta name="description" content="Go-Map is a comprehensive geospatial application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>Go-Map</h1>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>
            Home
          </Link>
          <Link href="/search" className={styles.navLink}>
            Search
          </Link>
          <Link href="/recommend" className={styles.navLink}>
            Recommendations
          </Link>
          <Link href="/settings" className={styles.navLink}>
            Settings
          </Link>
          <Link href="/login" className={styles.loginBtn}>
            Login
          </Link>
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