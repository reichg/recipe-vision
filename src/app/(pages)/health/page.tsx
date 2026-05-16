"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const HealthPage = () => {
  const [status, setStatus] = useState<"healthy" | "unhealthy" | "unknown">(
    "unknown",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status === "ok" ? "healthy" : "unhealthy");
        setLoading(false);
      })
      .catch(() => {
        setStatus("unhealthy");
        setLoading(false);
      });
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Database Health</h1>
      <div className={styles.indicatorContainer}>
        {loading ? (
          <span className={styles.loading}>Checking...</span>
        ) : (
          <span
            className={`${styles.indicator} ${
              status === "healthy" ? styles.healthy : styles.unhealthy
            }`}
          >
            {status === "healthy" ? "Healthy" : "Unhealthy"}
          </span>
        )}
      </div>
    </div>
  );
};

export default HealthPage;
