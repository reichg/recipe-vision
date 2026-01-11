import { CSSProperties } from "react";

const colors = {
  primary: "#d4a574",
  primaryLight: "#f5e6d3",
  accent: "#c9a887",
  background: "#fef9f3",
  text: "#5a4a3a",
  textLight: "#8b7355",
};

export const uploadStyles = {
  fileInputLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    cursor: "pointer",
  } as CSSProperties,

  fileInputLabelText: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    letterSpacing: "0.3px",
  } as CSSProperties,

  fileInputDropZone: {
    padding: "clamp(12px, 3vw, 16px) clamp(16px, 4vw, 20px)",
    border: `2px dashed ${colors.primary}`,
    borderRadius: 12,
    backgroundColor: colors.background,
    textAlign: "center",
    transition: "all 0.3s ease",
    position: "relative",
  } as CSSProperties,

  fileInputHidden: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    opacity: 0,
    cursor: "pointer",
  } as CSSProperties,

  fileInputContent: {
    pointerEvents: "none",
  } as CSSProperties,

  fileInputIcon: {
    fontSize: "clamp(24px, 6vw, 32px)",
    marginBottom: 8,
    color: colors.primary,
  } as CSSProperties,

  fileInputMainText: {
    fontSize: "clamp(13px, 2.5vw, 15px)",
    fontWeight: 500,
    color: colors.text,
    marginBottom: 4,
  } as CSSProperties,

  fileInputSubText: {
    fontSize: "clamp(11px, 2vw, 13px)",
    color: colors.textLight,
  } as CSSProperties,

  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))",
    gap: "clamp(12px, 2vw, 16px)",
  } as CSSProperties,

  previewImageWrapper: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
  } as CSSProperties,

  previewImage: {
    width: "100%",
    height: "auto",
    objectFit: "cover",
    borderRadius: 8,
  } as CSSProperties,

  previewImageLabel: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
  } as CSSProperties,

  buttonContainer: {
    display: "flex",
    gap: "clamp(8px, 2vw, 16px)",
    flexWrap: "wrap",
  } as CSSProperties,
};
