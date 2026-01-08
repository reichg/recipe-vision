import { CSSProperties } from "react";

export const layoutStyles = {
  body: {
    margin: 0,
    fontFamily: 'var(--font-lora), "Lora", serif',
    background: `
      linear-gradient(135deg, rgba(254, 245, 241, 0.95) 0%, rgba(254, 249, 243, 0.95) 50%, rgba(245, 230, 211, 0.9) 100%),
      radial-gradient(circle at 20% 80%, rgba(232, 184, 160, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(201, 168, 135, 0.08) 0%, transparent 50%)
    `,
    backgroundColor: "#fef5f1",
    minHeight: "100vh",
  } as CSSProperties,
};
