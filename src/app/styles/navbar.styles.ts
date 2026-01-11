import { CSSProperties } from "react";

const styles = {
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 2rem)",
    background: "linear-gradient(90deg, #232526 0%, #414345 100%)",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    gap: "clamp(0.5rem, 2vw, 1rem)",
    flexWrap: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  logo: {
    fontSize: "clamp(1.1rem, 3vw, 1.5rem)",
    fontWeight: 700,
    letterSpacing: "1px",
    cursor: "pointer",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  navLinks: {
    display: "flex",
    gap: "clamp(0.75rem, 2vw, 2rem)",
    listStyle: "none",
    margin: 0,
    padding: 0,
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "thin",
    scrollbarColor: "#fff transparent",
    flexShrink: 1,
    minWidth: 0,
  } as React.CSSProperties & {
    WebkitOverflowScrolling?: string;
    scrollbarWidth?: string;
    scrollbarColor?: string;
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    transition: "background 0.2s, color 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  linkHover: {
    background: "#fff",
    color: "#232526",
  },
} as { [key: string]: CSSProperties };

export default styles;
