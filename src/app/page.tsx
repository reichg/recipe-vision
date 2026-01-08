"use client";

import { useState } from "react";
import Image from "next/image";
import { Recipe } from "./types/recipe";
import { styles } from "./styles/recipe.styles";
import { logger } from "./utils/logger";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Pick an image first.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      logger.debug("Sending image to recipe API");
      const res = await fetch("/api/recipe", { method: "POST", body: form });
      const data = await res.json();
      logger.debug("Recipe API response received", { status: res.status });

      if (!res.ok) throw new Error(data?.error ?? "Request failed");
      setResult(data.recipe as Recipe);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.main}>
      <h1 style={styles.pageTitle}>Recipe Parser</h1>
      <p style={styles.pageSubtitle}>
        Transform your recipe photos into structured data
      </p>

      <form onSubmit={onSubmit} style={styles.form}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] ?? null;
            setFile(selectedFile);

            // Create preview
            if (selectedFile) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setPreview(reader.result as string);
              };
              reader.readAsDataURL(selectedFile);
            } else {
              setPreview(null);
            }
          }}
          style={styles.fileInput}
        />

        {preview && (
          <div style={styles.previewBox}>
            <p style={styles.previewLabel}>Preview</p>
            <div style={styles.previewImageContainer}>
              <Image
                src={preview}
                alt="Preview"
                width={500}
                height={300}
                style={styles.previewImage}
              />
            </div>
          </div>
        )}

        <button
          disabled={loading}
          style={{
            ...styles.submitButton,
            ...(loading ? styles.submitButtonLoading : {}),
          }}
          onMouseEnter={(e) => {
            if (!loading)
              (e.target as HTMLButtonElement).style.backgroundColor = "#b8956f";
            (e.target as HTMLButtonElement).style.boxShadow =
              "0 6px 20px rgba(201, 168, 135, 0.3)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = "#c9a887";
            (e.target as HTMLButtonElement).style.boxShadow =
              "0 4px 15px rgba(201, 168, 135, 0.2)";
          }}
        >
          {loading ? "Processing..." : "Upload & Parse"}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      {result && (
        <div style={styles.recipeContainer}>
          <h2>{result.title}</h2>

          {result.description && (
            <p style={styles.description}>{result.description}</p>
          )}

          <div style={styles.metricsGrid}>
            {result.servings && (
              <div style={styles.metricCard}>
                <p style={styles.metricLabel}>SERVINGS</p>
                <p style={styles.metricValue}>{result.servings}</p>
              </div>
            )}
            {result.prepTimeMinutes && (
              <div style={styles.metricCard}>
                <p style={styles.metricLabel}>PREP TIME</p>
                <p style={styles.metricValue}>{result.prepTimeMinutes} min</p>
              </div>
            )}
            {result.cookTimeMinutes && (
              <div style={styles.metricCard}>
                <p style={styles.metricLabel}>COOK TIME</p>
                <p style={styles.metricValue}>{result.cookTimeMinutes} min</p>
              </div>
            )}
            {result.totalTimeMinutes && (
              <div style={styles.metricCard}>
                <p style={styles.metricLabel}>TOTAL TIME</p>
                <p style={styles.metricValue}>{result.totalTimeMinutes} min</p>
              </div>
            )}
          </div>

          {(result.tags || result.allergens) && (
            <div style={styles.tagsAllergenSection}>
              {result.tags && result.tags.length > 0 && (
                <div style={styles.allergenDivider}>
                  <p style={styles.sectionLabel}>TAGS</p>
                  <div style={styles.tagContainer}>
                    {result.tags.map((tag) => (
                      <span key={tag} style={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.allergens && result.allergens.length > 0 && (
                <div>
                  <p style={styles.sectionLabel}>ALLERGENS</p>
                  <div style={styles.tagContainer}>
                    {result.allergens.map((allergen) => (
                      <span key={allergen} style={styles.allergen}>
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={styles.contentGrid}>
            <div>
              <h3 style={styles.sectionTitle}>Ingredients</h3>
              <ul style={styles.ingredientList}>
                {result.ingredients.map((ingredient, idx) => (
                  <li key={idx} style={styles.ingredientItem}>
                    <span style={styles.ingredientName}>{ingredient.name}</span>
                    {ingredient.quantity && (
                      <span style={styles.ingredientQuantity}>
                        {ingredient.quantity} {ingredient.unit || ""}
                      </span>
                    )}
                    {ingredient.notes && (
                      <p style={styles.ingredientNotes}>{ingredient.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 style={styles.sectionTitle}>Instructions</h3>
              <ol style={styles.stepsList}>
                {result.steps.map((step, idx) => (
                  <li key={idx} style={styles.stepItem}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
