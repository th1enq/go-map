import React from 'react';
import styles from '../../styles/Auth.module.css';

const MapBackground = () => {
  return (
    <div className={styles.mapBackground}>
      <div className={styles.mapImage}></div>
      <div className={styles.mapOverlay}></div>
    </div>
  );
};

export default MapBackground;