"use client";

import { styles } from "@/app/styles/homePage.styles";
import Link from "next/link";

export default function HomePage() {
  return (
    <main style={styles.main}>
      <div style={styles.hero}>
        <h1 style={styles.title}>
          Welcome to <span style={styles.titleAccent}>Recipe Vision</span>
        </h1>
        <p style={styles.subtitle}>
          Transform your recipe photos into structured, searchable data with the
          power of AI
        </p>

        <div style={styles.ctaContainer}>
          <Link href="/parse" style={styles.primaryButton}>
            Start Parsing Recipes
          </Link>
          <Link href="/recipes" style={styles.secondaryButton}>
            View All Recipes
          </Link>
        </div>
      </div>

      <div style={styles.features}>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>📸</div>
          <h3 style={styles.featureTitle}>Upload Images</h3>
          <p style={styles.featureDescription}>
            Snap a photo of any recipe from books, magazines, or handwritten
            notes
          </p>
        </div>

        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>🤖</div>
          <h3 style={styles.featureTitle}>AI-Powered Parsing</h3>
          <p style={styles.featureDescription}>
            Advanced vision AI extracts ingredients, steps, and metadata
            automatically
          </p>
        </div>

        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>📊</div>
          <h3 style={styles.featureTitle}>Structured Data</h3>
          <p style={styles.featureDescription}>
            Get clean, organized recipes with timing, servings, tags, and
            allergen info
          </p>
        </div>
      </div>

      <div style={styles.infoSection}>
        <h2 style={styles.infoTitle}>How It Works</h2>
        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <p style={styles.stepText}>Upload a recipe image</p>
          </div>
          <div style={styles.stepArrow}>→</div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <p style={styles.stepText}>AI processes and extracts</p>
          </div>
          <div style={styles.stepArrow}>→</div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <p style={styles.stepText}>View structured recipe</p>
          </div>
        </div>
      </div>
    </main>
  );
}
