"use client";

import { uploadStyles } from "@/app/styles/upload.styles";
import { popupStyles } from "@/app/styles/uploadSuccessPopup.styles";
import Image from "next/image";
import { useState } from "react";
import { logger } from "../../lib/logger";
import { Recipe } from "../../models/recipe";
import { styles } from "../../styles/recipe.styles";

const colors = {
  primary: "#d4a574",
  primaryLight: "#f5e6d3",
  accent: "#c9a887",
  background: "#fef9f3",
};

export default function ParsePage() {
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedToS3, setUploadedToS3] = useState(false);
  const [s3UploadSuccess, setS3UploadSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Pick an image first.");
      setTimeout(() => setError(null), 3000);
      return;
    }

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
    }
  }

  async function uploadToS3() {
    setError(null);
    setS3UploadSuccess(null);

    if (files.length === 0) {
      setError("Pick at least one image first.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUploadedToS3(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      let successCount = 0;
      const uploadResults: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        try {
          const form = new FormData();
          form.append("image", currentFile);
          logger.debug("Uploading image to S3", { fileName: currentFile.name });
          const res = await fetch("/api/upload", {
            method: "POST",
            body: form,
          });
          const data = await res.json();
          logger.debug("S3 upload response received", {
            status: res.status,
            fileName: currentFile.name,
          });

          if (!res.ok) throw new Error(data?.error ?? "Upload failed");
          uploadResults.push(currentFile.name);
          successCount++;
        } catch (uploadError) {
          logger.error("Failed to upload image", {
            fileName: currentFile.name,
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "Unknown error",
          });
        }
      }

      setS3UploadSuccess(
        `Successfully uploaded ${successCount} of ${files.length} images!`
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setTimeout(() => {
        setUploadedToS3(false);
        setS3UploadSuccess(null);
        setUploadProgress(null);
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
          <h1 style={styles.pageTitle}>S3 Uploader</h1>
          <p style={styles.pageSubtitle}>
            Upload to S3 so the image can be processed.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} style={styles.form}>
        <label style={uploadStyles.fileInputLabel}>
          <span style={uploadStyles.fileInputLabelText}>Select Images</span>
          <div
            style={uploadStyles.fileInputDropZone}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.accent;
              e.currentTarget.style.backgroundColor = colors.primaryLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.backgroundColor = colors.background;
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []);
                setFiles(selectedFiles);
                setFile(selectedFiles[0] || null);
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
              style={uploadStyles.fileInputHidden}
            />
            <div style={uploadStyles.fileInputContent}>
              <div style={uploadStyles.fileInputIcon}>📁</div>
              <div style={uploadStyles.fileInputMainText}>
                {files.length > 0
                  ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
                  : "Click to browse or drag and drop"}
              </div>
              <div style={uploadStyles.fileInputSubText}>
                PNG, JPG, JPEG up to 10MB
              </div>
            </div>
          </div>
        </label>

        {previews.length > 0 && (
          <div style={styles.previewBox}>
            <p style={styles.previewLabel}>
              Preview ({previews.length} image{previews.length > 1 ? "s" : ""})
            </p>
            <div style={uploadStyles.previewGrid}>
              {previews.map((previewUrl, idx) => (
                <div key={idx} style={uploadStyles.previewImageWrapper}>
                  <Image
                    src={previewUrl}
                    alt={`Preview ${idx + 1}`}
                    width={200}
                    height={150}
                    style={uploadStyles.previewImage}
                  />
                  <div style={uploadStyles.previewImageLabel}>
                    {files[idx]?.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={uploadStyles.buttonContainer}>
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
                  ...styles.submitButton,
                  background:
                    "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)",
                });
              }
            }}
            onMouseLeave={(e) => {
              Object.assign((e.target as HTMLButtonElement).style, {
                ...styles.submitButton,
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              });
            }}
          >
            {uploadedToS3 && uploadProgress
              ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
              : uploadedToS3
              ? "Uploading to S3..."
              : `Upload ${files.length > 0 ? files.length : ""} to S3`}
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
