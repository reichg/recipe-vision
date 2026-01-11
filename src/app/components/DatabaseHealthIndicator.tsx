"use client";

import { useEffect, useState } from "react";
import { healthIndicatorStyles } from "../styles/healthIndicator.styles";

export function DatabaseHealthIndicator() {
  const [dbStatus, setDbStatus] = useState<"ok" | "error" | "loading">(
    "loading"
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
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    return healthIndicatorStyles.statusColors[dbStatus];
  };

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

  return (
    <div style={healthIndicatorStyles.container}>
      <span
        style={{
          ...healthIndicatorStyles.statusDot,
          backgroundColor: getStatusColor(),
          animation: dbStatus === "loading" ? "pulse 2s infinite" : "none",
        }}
      />
      <span style={healthIndicatorStyles.statusLabel}>{getStatusLabel()}</span>
      <style>{healthIndicatorStyles.animations}</style>
    </div>
  );
}
