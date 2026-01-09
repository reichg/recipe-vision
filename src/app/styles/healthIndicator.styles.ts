import { CSSProperties } from "react";

export const healthIndicatorStyles = {
  container: {
    position: "fixed",
    bottom: "1.5rem",
    right: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.75rem",
    fontWeight: "500",
    padding: "0.5rem 0.75rem",
    borderRadius: "9999px",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    zIndex: 9999,
  } as CSSProperties,

  statusDot: {
    width: "0.5rem",
    height: "0.5rem",
    borderRadius: "50%",
  } as CSSProperties,

  statusLabel: {
    color: "#4b5563",
  } as CSSProperties,

  statusColors: {
    ok: "#10b981", // Green
    error: "#ef4444", // Red
    loading: "#f59e0b", // Amber
  },

  animations: `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `,
};
