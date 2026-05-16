"use client";

import { logger } from "@/lib/logger";
import Image from "next/image";
import { useState } from "react";
import { Recipe } from "../../models/recipe";
import recipeStyles from "../recipes/recipe.module.css";
import styles from "./page.module.css";
import {
  getRecipeFromUploadResponse,
  getUploadProcessingError,
  type RecipeApiResponse,
  toRecipeResult,
  type UploadApiResponse,
} from "./upload-response";

export default function ParsePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedToS3, setUploadedToS3] = useState(false);
  const [s3UploadSuccess, setS3UploadSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (files.length === 0) {
      setError("Pick at least one image first.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const oversizedFiles = files.filter(
      (selectedFile) => selectedFile.size > 1024 * 1024,
    );

    if (oversizedFiles.length > 0) {
      setError(
        `The following image${oversizedFiles.length > 1 ? "s are" : " is"} too large (max 1024 KB):\n` +
          oversizedFiles
            .map((selectedFile) => `- ${selectedFile.name}`)
            .join("\n"),
      );
      setTimeout(() => setError(null), 4000);
      return;
    }

    try {
      const form = new FormData();
      for (const file of files) {
        form.append("images", file);
      }

      logger.debug("Sending recipe images to recipe API", {
        imageCount: files.length,
      });
      const res = await fetch("/api/recipes", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as RecipeApiResponse;
      logger.debug("Recipe API response received", { status: res.status });

      if (!res.ok) throw new Error(data?.error ?? "Request failed");
      setResult(toRecipeResult(data.id, data.recipe));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
    }
  }

  async function uploadToS3() {
    setError(null);
    setS3UploadSuccess(null);
    setResult(null);

    if (files.length === 0) {
      setError("Pick at least one image first.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check all file sizes before upload
    const oversizedFiles = files.filter((f) => f.size > 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(
        `The following image${oversizedFiles.length > 1 ? "s are" : " is"} too large (max 1024 KB):\n` +
          oversizedFiles.map((f) => `- ${f.name}`).join("\n"),
      );
      setTimeout(() => setError(null), 5000);
      return;
    }

    setUploadedToS3(true);

    try {
      const form = new FormData();

      for (const file of files) {
        form.append("images", file);
      }

      logger.debug("Uploading recipe images to S3", {
        imageCount: files.length,
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as UploadApiResponse;
      logger.debug("S3 upload response received", {
        status: res.status,
        imageCount: files.length,
      });

      if (!res.ok) throw new Error(data?.error ?? "Upload failed");

      const processingError = getUploadProcessingError(data);

      if (processingError) {
        setError(processingError);
        return;
      }

      const processedRecipe = getRecipeFromUploadResponse(data);

      if (!processedRecipe) {
        setError("Automatic processing failed after upload");
        return;
      }

      setResult(processedRecipe);

      setS3UploadSuccess(
        data?.message ??
          `Uploaded ${files.length} image${files.length === 1 ? "" : "s"} and processed the recipe successfully`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setTimeout(() => {
        setUploadedToS3(false);
        setS3UploadSuccess(null);
      }, 5000);
    }
  }

  return (
    <main className={recipeStyles.main}>
      {s3UploadSuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <div className={styles.popupIcon}>✓</div>
            <h2 className={styles.popupTitle}>Upload complete</h2>
            <p className={styles.popupMessage}>Your recipe is ready below.</p>
            <p className={styles.popupUrl}>{s3UploadSuccess}</p>
          </div>
        </div>
      )}
      <div className={recipeStyles.headerContainer}>
        <div>
          <h1 className={recipeStyles.pageTitle}>Uploader</h1>
          <p className={recipeStyles.pageSubtitle}>
            Upload one or more photos for the same recipe so they can be
            processed together.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className={recipeStyles.form}>
        <label className={styles.fileInputLabel}>
          <span className={styles.fileInputLabelText}>Select Images</span>
          <div className={styles.fileInputDropZone}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []);
                // Check for oversized files immediately
                const oversizedFiles = selectedFiles.filter(
                  (f) => f.size > 1024 * 1024,
                );
                if (oversizedFiles.length > 0) {
                  setError(
                    `The following image${oversizedFiles.length > 1 ? "s are" : " is"} too large (max 1024 KB):\n` +
                      oversizedFiles.map((f) => `- ${f.name}`).join("\n"),
                  );
                  setTimeout(() => setError(null), 5000);
                  setFiles([]);
                  setPreviews([]);
                  return;
                }
                setFiles(selectedFiles);
                setS3UploadSuccess(null);

                // Create previews for all files
                if (selectedFiles.length > 0) {
                  const previewPromises = selectedFiles.map((selectedFile) => {
                    return new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        resolve(reader.result as string);
                      };
                      reader.readAsDataURL(selectedFile);
                    });
                  });

                  Promise.all(previewPromises).then((results) => {
                    setPreviews(results);
                  });
                } else {
                  setPreviews([]);
                }
              }}
              className={styles.fileInputHidden}
            />
            <div className={styles.fileInputContent}>
              <div className={styles.fileInputIcon}>📁</div>
              <div className={styles.fileInputMainText}>
                {files.length > 0
                  ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                  : "Click to browse or drag and drop"}
              </div>
              <div className={styles.fileInputSubText}>
                PNG, JPG, JPEG up to 10MB
              </div>
            </div>
          </div>
        </label>

        {previews.length > 0 && (
          <div className={recipeStyles.previewBox}>
            <p className={recipeStyles.previewLabel}>
              Preview ({previews.length} image{previews.length > 1 ? "s" : ""})
            </p>
            <div className={styles.previewGrid}>
              {previews.map((previewUrl, idx) => (
                <div key={idx} className={styles.previewImageWrapper}>
                  <Image
                    src={previewUrl}
                    alt={`Preview ${idx + 1}`}
                    width={200}
                    height={150}
                    className={styles.previewImage}
                  />
                  <div className={styles.previewImageLabel}>
                    {files[idx]?.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.buttonContainer}>
          <button
            type="button"
            disabled={uploadedToS3}
            onClick={uploadToS3}
            className={`${styles.uploadButton} ${
              uploadedToS3 ? styles.uploadButtonDisabled : ""
            }`}
          >
            {uploadedToS3
              ? `Uploading ${files.length} image${files.length === 1 ? "" : "s"}...`
              : `Upload ${files.length > 0 ? files.length : ""}`}
          </button>
        </div>
      </form>

      {error && <p className={recipeStyles.error}>{error}</p>}

      {result && (
        <div className={recipeStyles.recipeContainer}>
          <h2>{result.title}</h2>

          {result.description && (
            <p className={recipeStyles.description}>{result.description}</p>
          )}

          <div className={recipeStyles.metricsGrid}>
            {result.servings && (
              <div className={recipeStyles.metricCard}>
                <p className={recipeStyles.metricLabel}>SERVINGS</p>
                <p className={recipeStyles.metricValue}>{result.servings}</p>
              </div>
            )}
            {result.prepTimeMinutes && (
              <div className={recipeStyles.metricCard}>
                <p className={recipeStyles.metricLabel}>PREP TIME</p>
                <p className={recipeStyles.metricValue}>
                  {result.prepTimeMinutes} min
                </p>
              </div>
            )}
            {result.cookTimeMinutes && (
              <div className={recipeStyles.metricCard}>
                <p className={recipeStyles.metricLabel}>COOK TIME</p>
                <p className={recipeStyles.metricValue}>
                  {result.cookTimeMinutes} min
                </p>
              </div>
            )}
            {result.totalTimeMinutes && (
              <div className={recipeStyles.metricCard}>
                <p className={recipeStyles.metricLabel}>TOTAL TIME</p>
                <p className={recipeStyles.metricValue}>
                  {result.totalTimeMinutes} min
                </p>
              </div>
            )}
          </div>

          {(result.tags || result.allergens) && (
            <div className={recipeStyles.tagsAllergenSection}>
              {result.tags && result.tags.length > 0 && (
                <div className={recipeStyles.allergenDivider}>
                  <p className={recipeStyles.sectionLabel}>TAGS</p>
                  <div className={recipeStyles.tagContainer}>
                    {result.tags.map((tag) => (
                      <span key={tag} className={recipeStyles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.allergens && result.allergens.length > 0 && (
                <div>
                  <p className={recipeStyles.sectionLabel}>ALLERGENS</p>
                  <div className={recipeStyles.tagContainer}>
                    {result.allergens.map((allergen) => (
                      <span key={allergen} className={recipeStyles.allergen}>
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={recipeStyles.contentGrid}>
            <div>
              <h3 className={recipeStyles.sectionTitle}>Ingredients</h3>
              <ul className={recipeStyles.ingredientList}>
                {result.ingredients.map((ingredient, idx) => (
                  <li key={idx} className={recipeStyles.ingredientItem}>
                    <span className={recipeStyles.ingredientName}>
                      {ingredient.name}
                    </span>
                    {ingredient.quantity && (
                      <span className={recipeStyles.ingredientQuantity}>
                        {ingredient.quantity} {ingredient.unit || ""}
                      </span>
                    )}
                    {ingredient.notes && (
                      <p className={recipeStyles.ingredientNotes}>
                        {ingredient.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className={recipeStyles.sectionTitle}>Instructions</h3>
              <ol className={recipeStyles.stepsList}>
                {result.steps.map((step, idx) => (
                  <li key={idx} className={recipeStyles.stepItem}>
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
