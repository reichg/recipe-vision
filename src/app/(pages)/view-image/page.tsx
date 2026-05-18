"use client";

import { logger } from "@/lib/logger";
import Image from "next/image";
import { useState } from "react";
import shellStyles from "../page-shell.module.css";
import styles from "./page.module.css";

export default function ViewS3ImagePage() {
  const [imageKey, setImageKey] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Parse S3 URI and extract object key
  const parseS3Uri = (input: string): string => {
    const trimmed = input.trim();

    // Check if it's an S3 URI (s3://bucket-name/object-key)
    const s3UriMatch = trimmed.match(/^s3:\/\/[^/]+\/(.+)$/);
    if (s3UriMatch) {
      return s3UriMatch[1];
    }

    // Return as-is if not an S3 URI
    return trimmed;
  };

  const handleLoadImage = async () => {
    setError(null);
    setImageUrl(null);

    if (!imageKey.trim()) {
      setError("Please enter an S3 key");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Parse S3 URI if provided
    const parsedKey = parseS3Uri(imageKey);

    setLoading(true);
    try {
      logger.debug("Fetching image from S3", { key: parsedKey });
      const res = await fetch(
        `/api/view-image?key=${encodeURIComponent(parsedKey)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to load image");
      }

      setImageUrl(data.url);
      logger.debug("Image URL received", { url: data.url });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={shellStyles.main}>
      <div className={styles.container}>
        <div className={shellStyles.headerContainer}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Image inspector</p>
            <h1 className={shellStyles.pageTitle}>View S3 Image</h1>
            <p className={shellStyles.pageSubtitle}>
              Enter an S3 object key to retrieve and display your uploaded
              images
            </p>
          </div>
        </div>

        <div className={styles.controlPanel}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>S3 Object Key</label>
            <input
              type="text"
              placeholder="recipes/1234567890-image.jpg or s3://bucket-name/recipes/image.jpg"
              value={imageKey}
              onChange={(e) => setImageKey(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleLoadImage();
                }
              }}
              className={styles.input}
            />
            <p className={styles.hint}>
              Example: recipes/my-recipe-image.jpg or
              s3://bucket-name/recipes/my-recipe-image.jpg
            </p>
          </div>

          <button
            onClick={handleLoadImage}
            disabled={loading}
            className={`${styles.button} ${
              loading ? styles.buttonDisabled : ""
            }`}
          >
            {loading ? (
              <span className={styles.buttonContent}>
                <span className={styles.spinner}>⏳</span> Loading...
              </span>
            ) : (
              <span className={styles.buttonContent}>
                <span>🔍</span> Load Image
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className={styles.errorContainer}>
            <span className={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {imageUrl && (
          <div className={styles.imageSection}>
            <div className={styles.imageCard}>
              <div className={styles.imageHeader}>
                <h3 className={styles.imageTitle}>Retrieved Image</h3>
                <span className={styles.badge}>✓ Loaded</span>
              </div>

              <div className={styles.imageWrapper}>
                <Image
                  src={imageUrl}
                  alt="S3 Image"
                  width={1200}
                  height={800}
                  className={styles.image}
                  onError={() => {
                    setError(
                      "Failed to load image. Check the key and CORS settings.",
                    );
                    setImageUrl(null);
                  }}
                />
              </div>

              <div className={styles.metadataPanel}>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>S3 Key:</span>
                  <code className={styles.metadataValue}>
                    {parseS3Uri(imageKey)}
                  </code>
                </div>
                <div className={styles.metadataRow}>
                  <span className={styles.metadataLabel}>URL:</span>
                  <code className={styles.metadataValue}>{imageUrl}</code>
                </div>
              </div>

              <div className={styles.actions}>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.actionButton}
                >
                  🔗 Open in New Tab
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(imageUrl);
                    alert("URL copied to clipboard!");
                  }}
                  className={styles.actionButton}
                >
                  📋 Copy URL
                </button>
              </div>
            </div>
          </div>
        )}

        {!imageUrl && !error && !loading && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>🖼️</div>
            <h3 className={styles.placeholderTitle}>No Image Loaded</h3>
            <p className={styles.placeholderText}>
              Enter an S3 object key above and click &quot;Load Image&quot; to
              view your uploaded content
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
