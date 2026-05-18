import { Fraunces, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { DatabaseHealthIndicator } from "../components/DatabaseHealthIndicator";
import Navbar from "../components/Navbar";
import styles from "./layout.module.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-playfair",
});
const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-lora",
});

export const metadata = {
  title: "Recipe Vision Parser",
  description: "Turn recipe photos into a searchable cooking archive.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${bodyFont.variable}`}>
      <body className={styles.body}>
        <div className={styles.shell}>
          <div className={styles.backgroundMesh} aria-hidden="true" />
          <div className={styles.backgroundGlow} aria-hidden="true" />
          <div className={styles.content}>
            <Navbar />
            {children}
          </div>
          <DatabaseHealthIndicator />
        </div>
      </body>
    </html>
  );
}
