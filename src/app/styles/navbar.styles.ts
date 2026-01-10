const styles = {
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 2rem",
    background: "linear-gradient(90deg, #232526 0%, #414345 100%)",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  logo: {
    fontSize: "1.5rem",
    fontWeight: 700,
    letterSpacing: "1px",
    cursor: "pointer",
  },
  navLinks: {
    display: "flex",
    gap: "2rem",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "1.1rem",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    transition: "background 0.2s, color 0.2s",
  },
  linkHover: {
    background: "#fff",
    color: "#232526",
  },
};

export default styles;
