import { CSSProperties } from "react";

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    background: "linear-gradient(120deg, #232526 0%, #414345 100%)",
    color: "#fff",
    borderRadius: "1rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    margin: "2rem auto",
    maxWidth: "480px",
    padding: "2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    marginBottom: "2rem",
    letterSpacing: "1px",
  },
  indicatorContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80px",
  },
  indicator: {
    fontSize: "1.25rem",
    fontWeight: 600,
    padding: "0.75rem 2rem",
    borderRadius: "999px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    color: "#fff",
    letterSpacing: "1px",
    transition: "background 0.2s",
  },
  loading: {
    fontSize: "1.1rem",
    color: "#f59e0b",
    fontWeight: 500,
    letterSpacing: "1px",
  },
} as { [key: string]: CSSProperties };

export default styles;
