import { CSSProperties } from "react";

// Modern pastel warm color palette
const colors = {
  primary: "#d4a574", // Warm tan
  primaryLight: "#f5e6d3", // Very light warm beige
  secondary: "#e8b8a0", // Pastel salmon
  accent: "#c9a887", // Muted warm brown
  background: "#fef9f3", // Warm off-white
  border: "#ede5d9", // Soft warm gray
  text: "#5a4a3a", // Warm dark brown
  textLight: "#8b7355", // Warm medium brown
  success: "#d4c5b0", // Pastel warm green
  warning: "#e6cba8", // Pastel warm peach
};

export const styles = {
  main: {
    padding: 40,
    maxWidth: 1000,
    margin: "0 auto",
    fontFamily: "var(--font-lora)",
  } as CSSProperties,

  form: {
    display: "grid",
    gap: 16,
    marginBottom: 32,
  } as CSSProperties,

  error: {
    color: "#c97c7c",
    fontSize: 16,
    padding: "12px 16px",
    backgroundColor: "#f5e6e6",
    borderRadius: 12,
    borderLeft: `4px solid #c97c7c`,
  } as CSSProperties,

  recipeContainer: {
    marginTop: 40,
    animation: "fadeIn 0.6s ease-in",
  } as CSSProperties,

  description: {
    fontSize: 18,
    color: colors.textLight,
    marginBottom: 28,
    lineHeight: 1.7,
    fontStyle: "italic",
  } as CSSProperties,

  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    marginBottom: 32,
  } as CSSProperties,

  metricCard: {
    padding: 20,
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    border: `2px solid ${colors.border}`,
    boxShadow: "0 4px 15px rgba(212, 165, 116, 0.08)",
    transition: "all 0.3s ease",
  } as CSSProperties,

  metricLabel: {
    margin: "0 0 8px 0",
    fontSize: 11,
    fontWeight: "700",
    color: colors.textLight,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  } as CSSProperties,

  metricValue: {
    margin: 0,
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primary,
    fontFamily: "var(--font-playfair)",
  } as CSSProperties,

  tagsAllergenSection: {
    marginBottom: 32,
  } as CSSProperties,

  sectionLabel: {
    margin: "0 0 12px 0",
    fontSize: 11,
    fontWeight: "700",
    color: colors.textLight,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  } as CSSProperties,

  tagContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  } as CSSProperties,

  tag: {
    padding: "6px 14px",
    backgroundColor: colors.success,
    color: colors.text,
    borderRadius: 20,
    fontSize: 14,
    border: `1px solid ${colors.border}`,
    fontWeight: 500,
  } as CSSProperties,

  allergen: {
    padding: "6px 14px",
    backgroundColor: colors.warning,
    color: colors.text,
    borderRadius: 20,
    fontSize: 14,
    border: `1px solid ${colors.border}`,
    fontWeight: 500,
  } as CSSProperties,

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 40,
    marginBottom: 32,
  } as CSSProperties,

  sectionTitle: {
    marginBottom: 24,
    fontSize: 26,
    color: colors.primary,
    fontFamily: "var(--font-playfair)",
    fontWeight: 700,
  } as CSSProperties,

  ingredientList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  } as CSSProperties,

  ingredientItem: {
    padding: "14px 0",
    borderBottom: `1px solid ${colors.border}`,
  } as CSSProperties,

  ingredientName: {
    fontWeight: 600,
    color: colors.text,
    fontSize: 16,
  } as CSSProperties,

  ingredientQuantity: {
    color: colors.textLight,
    marginLeft: 8,
    fontSize: 14,
  } as CSSProperties,

  ingredientNotes: {
    margin: "6px 0 0 0",
    fontSize: 13,
    color: colors.textLight,
    fontStyle: "italic",
  } as CSSProperties,

  stepsList: {
    margin: 0,
    paddingLeft: 24,
  } as CSSProperties,

  stepItem: {
    marginBottom: 16,
    lineHeight: 1.8,
    color: colors.text,
    fontSize: 15,
  } as CSSProperties,

  // Header styles
  pageTitle: {
    fontSize: 42,
    fontFamily: "var(--font-playfair)",
    color: colors.primary,
    marginBottom: 8,
    fontWeight: 700,
  } as CSSProperties,

  pageSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 0,
    marginBottom: 28,
    letterSpacing: "0.5px",
  } as CSSProperties,

  // Form input styles
  fileInput: {
    padding: "14px 16px",
    border: `2px solid ${colors.border}`,
    borderRadius: 12,
    fontSize: 15,
    fontFamily: "inherit",
    backgroundColor: colors.background,
    color: colors.text,
    cursor: "pointer",
    transition: "all 0.3s ease",
  } as CSSProperties,

  // Preview box styles
  previewBox: {
    marginTop: 12,
    padding: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    border: `2px solid ${colors.border}`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  } as CSSProperties,

  previewLabel: {
    margin: "0 0 12px 0",
    fontSize: 13,
    fontWeight: 600,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  } as CSSProperties,

  previewImageContainer: {
    position: "relative",
    width: "100%",
    maxHeight: 300,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as CSSProperties,

  previewImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    height: "auto",
    borderRadius: 8,
    objectFit: "contain",
  } as CSSProperties,

  // Button styles
  submitButton: {
    padding: "14px 24px",
    backgroundColor: colors.accent,
    color: colors.background,
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(201, 168, 135, 0.2)",
  } as CSSProperties,

  submitButtonLoading: {
    backgroundColor: colors.primary,
    opacity: 0.8,
    cursor: "not-allowed",
  } as CSSProperties,

  // Nested divider style
  allergenDivider: {
    marginBottom: 12,
  } as CSSProperties,

  // Navigation and layout styles
  headerContainer: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  } as CSSProperties,

  navButtons: {
    display: "flex",
    gap: 12,
  } as CSSProperties,

  navButton: {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: "transparent",
    cursor: "pointer",
    fontWeight: 600,
  } as CSSProperties,

  recipesGrid: {
    display: "grid",
    gap: 16,
  } as CSSProperties,

  recipeCard: {
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: 16,
    background: "white",
  } as CSSProperties,

  recipeCardContent: {
    display: "flex",
    gap: 16,
    alignItems: "flex-start",
  } as CSSProperties,

  recipeCardMain: {
    flex: 1,
  } as CSSProperties,

  recipeCardTitle: {
    margin: 0,
    fontFamily: "var(--font-playfair)",
    color: colors.primary,
  } as CSSProperties,

  recipeCardMetrics: {
    marginTop: 12,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  } as CSSProperties,

  errorMessage: {
    color: "crimson",
  } as CSSProperties,

  linkStyle: {
    textDecoration: "none",
  } as CSSProperties,

  submitButtonHover: {
    backgroundColor: "#b8956f",
    boxShadow: "0 6px 20px rgba(201, 168, 135, 0.3)",
  } as CSSProperties,

  submitButtonDefault: {
    backgroundColor: colors.accent,
    boxShadow: "0 4px 15px rgba(201, 168, 135, 0.2)",
  } as CSSProperties,
};
