"use client";

import Image from "next/image";
import { useState } from "react";
import { logger } from "../lib/logger";
import { styles } from "../styles/recipe.styles";
import { Recipe } from "../types/recipe";
import { popupStyles } from "@/app/styles/uploadSuccessPopup.styles";

export default function ParsePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedToS3, setUploadedToS3] = useState(false);
  const [s3UploadSuccess, setS3UploadSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Pick an image first.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      logger.debug("Sending image to recipe API");
      const res = await fetch("/api/recipes", {
        method: "POST",
        body: form,
      });
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

  async function uploadToS3() {
    setError(null);
    setS3UploadSuccess(null);

    if (!file) {
      setError("Pick an image first.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const form = new FormData();
      form.append("image", file);
      logger.debug("Uploading image to S3");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      logger.debug("S3 upload response received", { status: res.status });

      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      setS3UploadSuccess(data.url || "Image uploaded successfully!");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setUploadedToS3(true);
      setTimeout(() => {
        setUploadedToS3(false);
        setS3UploadSuccess(null);
      }, 5000);
    }
  }

  return (
    <main style={styles.main}>
      {s3UploadSuccess && (
        <div style={popupStyles.overlay}>
          <div style={popupStyles.popup}>
            <div style={popupStyles.icon}>✓</div>
            <h2 style={popupStyles.title}>Upload Successful!</h2>
            <p style={popupStyles.message}>
              Your image has been uploaded to S3
            </p>
            <p style={popupStyles.url}>{s3UploadSuccess}</p>
          </div>
        </div>
      )}
      <div style={styles.headerContainer}>
        <div>
          <h1 style={styles.pageTitle}>Recipe Parser</h1>
          <p style={styles.pageSubtitle}>
            Transform your recipe photos into structured data
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} style={styles.form}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] ?? null;
            setFile(selectedFile);
            setS3UploadSuccess(null);

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

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading ? styles.submitButtonLoading : {}),
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                Object.assign(
                  (e.target as HTMLButtonElement).style,
                  styles.submitButtonHover
                );
              }
            }}
            onMouseLeave={(e) => {
              Object.assign(
                (e.target as HTMLButtonElement).style,
                styles.submitButtonDefault
              );
            }}
          >
            {loading ? "Processing..." : "Upload & Parse"}
          </button>

          <button
            type="button"
            disabled={uploadedToS3}
            onClick={uploadToS3}
            style={{
              ...styles.submitButton,
              ...(uploadedToS3 ? styles.submitButtonLoading : {}),
              background: uploadedToS3
                ? "#6b7280"
                : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            }}
            onMouseEnter={(e) => {
              if (!uploadedToS3) {
                Object.assign((e.target as HTMLButtonElement).style, {
                  ...styles.submitButtonHover,
                  background:
                    "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)",
                });
              }
            }}
            onMouseLeave={(e) => {
              Object.assign((e.target as HTMLButtonElement).style, {
                ...styles.submitButtonDefault,
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              });
            }}
          >
            {uploadedToS3 ? "Uploading to S3..." : "Upload to S3"}
          </button>
        </div>
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
