"use client";

import { useEffect, useState } from "react";
import styles from "./DatabaseHealthIndicator.module.css";

export function DatabaseHealthIndicator() {
  const [dbStatus, setDbStatus] = useState<"ok" | "error" | "loading">(
    "loading",
  );

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (response.ok) {
          setDbStatus("ok");
        } else {
          setDbStatus("error");
        }
      } catch {
        setDbStatus("error");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 1000 * 60 * 5); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const getStatusLabel = () => {
    switch (dbStatus) {
      case "ok":
        return "DB ✓";
      case "error":
        return "DB ✗";
      case "loading":
        return "DB...";
    }
  };

  const statusDotClass =
    dbStatus === "ok"
      ? styles.statusDotOk
      : dbStatus === "error"
        ? styles.statusDotError
        : styles.statusDotLoading;

  return (
    <div className={styles.container}>
      <span className={`${styles.statusDot} ${statusDotClass}`} />
      <span className={styles.statusLabel}>{getStatusLabel()}</span>
    </div>
  );
}
