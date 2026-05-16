"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>
          Welcome to <span className={styles.titleAccent}>Recipe Vision</span>
        </h1>
        <p className={styles.subtitle}>
          Transform your recipe photos into structured, searchable data with the
          power of AI
        </p>

        <div className={styles.ctaContainer}>
          <Link href="/upload" className={styles.primaryButton}>
            Start Parsing Recipes
          </Link>
          <Link href="/recipes" className={styles.secondaryButton}>
            View All Recipes
          </Link>
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>📸</div>
          <h3 className={styles.featureTitle}>Upload Images</h3>
          <p className={styles.featureDescription}>
            Snap a photo of any recipe from books, magazines, or handwritten
            notes
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🤖</div>
          <h3 className={styles.featureTitle}>AI-Powered Parsing</h3>
          <p className={styles.featureDescription}>
            Advanced vision AI extracts ingredients, steps, and metadata
            automatically
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>📊</div>
          <h3 className={styles.featureTitle}>Structured Data</h3>
          <p className={styles.featureDescription}>
            Get clean, organized recipes with timing, servings, tags, and
            allergen info
          </p>
        </div>
      </div>

      <div className={styles.infoSection}>
        <h2 className={styles.infoTitle}>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <p className={styles.stepText}>Upload a recipe image</p>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <p className={styles.stepText}>AI processes and extracts</p>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <p className={styles.stepText}>View structured recipe</p>
          </div>
          <div className={`${styles.stepArrow} ${styles.stepArrowHidden}`}>
            →
          </div>
        </div>
      </div>
    </main>
  );
}
