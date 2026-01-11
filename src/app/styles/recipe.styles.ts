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
    padding: "clamp(16px, 4vw, 40px)",
    margin: "0 auto",
    maxWidth: "100%",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "clamp(12px, 2vw, 16px)",
    marginBottom: 32,
  } as CSSProperties,

  metricCard: {
    padding: "clamp(12px, 3vw, 20px)",
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
    fontSize: "clamp(20px, 5vw, 28px)",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    gap: "clamp(20px, 4vw, 40px)",
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
    fontSize: "clamp(28px, 6vw, 42px)",
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
    padding: "clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 24px)",
    backgroundColor: colors.accent,
    color: colors.background,
    border: "none",
    borderRadius: 12,
    fontSize: "clamp(14px, 2.5vw, 16px)",
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
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "clamp(12px, 2vw, 20px)",
    marginBottom: 24,
  } as CSSProperties,

  navButtons: {
    display: "flex",
    gap: 12,
  } as CSSProperties,

  navButton: {
    padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 20px)",
    borderRadius: 8,
    border: `2px solid ${colors.primary}`,
    background: "white",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "clamp(13px, 2vw, 14px)",
    color: colors.primary,
    transition: "all 0.2s ease",
    fontFamily: "var(--font-lora)",
  } as CSSProperties,

  errorMessage: {
    color: "crimson",
  } as CSSProperties,

  // Compact recipe grid styles
  compactRecipesGrid: {
    border: "1px solid #000000",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
    gridAutoRows: "1fr",
    gap: "clamp(16px, 3vw, 24px)",
    padding: "clamp(12px, 3vw, 24px)",
  } as CSSProperties,

  noRecipesMessage: {
    gridColumn: "1 / -1",
    textAlign: "center",
  } as CSSProperties,

  compactRecipeLink: {
    textDecoration: "none",
    color: "inherit",
  } as CSSProperties,

  compactRecipeCard: {
    height: "100%",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: "clamp(12px, 2.5vw, 16px)",
    background: "white",
    display: "flex",
    flexDirection: "column",
    transition: "all 0.2s ease",
    cursor: "pointer",
    boxSizing: "border-box",
  } as CSSProperties,

  compactRecipeTitle: {
    margin: 0,
    fontFamily: "var(--font-playfair)",
    color: colors.primary,
    fontSize: 18,
    lineHeight: 1.3,
    marginBottom: 8,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textAlign: "center",
  } as CSSProperties,

  compactRecipeDescription: {
    fontSize: 13,
    color: colors.textLight,
    margin: 0,
    marginBottom: 12,
    lineHeight: 1.4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  } as CSSProperties,

  compactRecipeTagsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
    minHeight: 24,
    justifyContent: "center",
  } as CSSProperties,

  compactRecipeTag: {
    fontSize: 11,
    padding: "3px 8px",
    backgroundColor: colors.primaryLight,
    color: colors.text,
    borderRadius: 12,
    fontWeight: 500,
  } as CSSProperties,

  compactRecipeTagMore: {
    fontSize: 11,
    padding: "3px 8px",
    color: colors.textLight,
    fontWeight: 500,
  } as CSSProperties,

  compactRecipeMetricsFooter: {
    display: "flex",
    gap: 12,
    marginTop: "auto",
    paddingTop: 12,
    borderTop: `1px solid ${colors.primaryLight}`,
  } as CSSProperties,

  compactRecipeMetricItem: {
    flex: 1,
    textAlign: "center",
  } as CSSProperties,

  compactRecipeMetricLabel: {
    fontSize: 10,
    color: colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as CSSProperties,

  compactRecipeMetricValue: {
    fontSize: 16,
    fontWeight: 600,
    color: colors.primary,
    marginTop: 2,
  } as CSSProperties,

  // Pagination styles
  paginationContainer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: "clamp(8px, 2vw, 16px)",
    marginTop: 40,
    marginBottom: 20,
  } as CSSProperties,

  paginationButton: {
    padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 20px)",
    fontSize: "clamp(12px, 2vw, 14px)",
    fontWeight: 500,
    border: "none",
    borderRadius: 8,
    backgroundColor: "#667eea",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s",
  } as CSSProperties,

  paginationButtonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  } as CSSProperties,

  paginationPages: {
    display: "flex",
    flexWrap: "wrap",
    gap: "clamp(4px, 1vw, 8px)",
    alignItems: "center",
    justifyContent: "center",
  } as CSSProperties,

  paginationPageButton: {
    padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
    fontSize: "clamp(12px, 2vw, 14px)",
    border: "1px solid #ddd",
    borderRadius: 6,
    backgroundColor: "white",
    cursor: "pointer",
    transition: "all 0.2s",
  } as CSSProperties,

  paginationPageButtonActive: {
    padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
    fontSize: "clamp(12px, 2vw, 14px)",
    fontWeight: 600,
    border: "2px solid #667eea",
    borderRadius: 6,
    backgroundColor: "#f0f4ff",
    color: "#667eea",
    cursor: "pointer",
    transition: "all 0.2s",
  } as CSSProperties,

  paginationPageButtonDisabled: {
    cursor: "not-allowed",
  } as CSSProperties,

  paginationInfo: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    marginBottom: 20,
  } as CSSProperties,

  // Selection and deletion styles
  selectionControlsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "clamp(8px, 2vw, 16px)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 12,
  } as CSSProperties,

  selectAllLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: "clamp(12px, 2vw, 14px)",
  } as CSSProperties,

  selectAllCheckbox: {
    cursor: "pointer",
  } as CSSProperties,

  deleteButton: {
    padding: "clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "clamp(12px, 2vw, 14px)",
    fontWeight: 600,
  } as CSSProperties,

  deleteButtonDisabled: {
    backgroundColor: "#999",
    cursor: "not-allowed",
  } as CSSProperties,

  recipeCardWrapper: {
    position: "relative",
  } as CSSProperties,

  recipeCardCheckbox: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
    cursor: "pointer",
    width: 18,
    height: 18,
  } as CSSProperties,

  centerText: {
    textAlign: "center",
  } as CSSProperties,

  headerCentered: {
    textAlign: "center",
    width: "100%",
  } as CSSProperties,

  paginationInfoText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    marginBottom: 20,
    marginTop: 20,
  } as CSSProperties,
};
