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
    borderRadius: "clamp(0.5rem, 2vw, 1rem)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    margin: "clamp(1rem, 3vw, 2rem) auto",
    maxWidth: "min(90vw, 480px)",
    padding: "clamp(1rem, 4vw, 2rem)",
  },
  title: {
    fontSize: "clamp(1.5rem, 4vw, 2rem)",
    fontWeight: 700,
    marginBottom: "clamp(1rem, 3vw, 2rem)",
    letterSpacing: "1px",
    textAlign: "center",
  },
  indicatorContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "clamp(60px, 15vw, 80px)",
  },
  indicator: {
    fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
    fontWeight: 600,
    padding: "clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 2rem)",
    borderRadius: "999px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    color: "#fff",
    letterSpacing: "1px",
    transition: "background 0.2s",
  },
  loading: {
    fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
    color: "#f59e0b",
    fontWeight: 500,
    letterSpacing: "1px",
  },
} as { [key: string]: CSSProperties };

export default styles;
