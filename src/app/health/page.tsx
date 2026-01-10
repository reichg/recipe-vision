'use client';
import React, { useEffect, useState } from 'react';
import styles from '../styles/healthPage.styles';

const HealthPage = () => {
  const [status, setStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setStatus(data.status === 'ok' ? 'healthy' : 'unhealthy');
        setLoading(false);
      })
      .catch(() => {
        setStatus('unhealthy');
        setLoading(false);
      });
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Database Health</h1>
      <div style={styles.indicatorContainer}>
        {loading ? (
          <span style={styles.loading}>Checking...</span>
        ) : (
          <span
            style={{
              ...styles.indicator,
              background:
                status === 'healthy'
                  ? 'linear-gradient(90deg, #56ab2f 0%, #a8e063 100%)'
                  : 'linear-gradient(90deg, #e52d27 0%, #b31217 100%)',
            }}
          >
            {status === 'healthy' ? 'Healthy' : 'Unhealthy'}
          </span>
        )}
      </div>
    </div>
  );
};

export default HealthPage;
