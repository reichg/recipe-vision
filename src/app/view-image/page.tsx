"use client";

import { styles } from "@/app/styles/view-image.styles";
import Image from "next/image";
import { useState } from "react";
import { logger } from "../lib/logger";

export default function ViewS3ImagePage() {
  const [imageKey, setImageKey] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoadImage = async () => {
    setError(null);
    setImageUrl(null);

    if (!imageKey.trim()) {
      setError("Please enter an S3 key");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    try {
      logger.debug("Fetching image from S3", { key: imageKey });
      const res = await fetch(
        `/api/view-image?key=${encodeURIComponent(imageKey)}`
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
    <main style={styles.main}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>View S3 Image</h1>
          <p style={styles.subtitle}>
            Enter an S3 object key to retrieve and display your uploaded images
          </p>
        </div>

        <div style={styles.controlPanel}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>S3 Object Key</label>
            <input
              type="text"
              placeholder="recipes/1234567890-image.jpg"
              value={imageKey}
              onChange={(e) => setImageKey(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleLoadImage();
                }
              }}
              style={styles.input}
            />
            <p style={styles.hint}>Example: recipes/my-recipe-image.jpg</p>
          </div>

          <button
            onClick={handleLoadImage}
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.transform =
                  "translateY(-2px)";
                (e.target as HTMLButtonElement).style.boxShadow =
                  "0 6px 20px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 4px 15px rgba(102, 126, 234, 0.4)";
            }}
          >
            {loading ? (
              <span style={styles.buttonContent}>
                <span style={styles.spinner}>⏳</span> Loading...
              </span>
            ) : (
              <span style={styles.buttonContent}>
                <span>🔍</span> Load Image
              </span>
            )}
          </button>
        </div>

        {error && (
          <div style={styles.errorContainer}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {imageUrl && (
          <div style={styles.imageSection}>
            <div style={styles.imageCard}>
              <div style={styles.imageHeader}>
                <h3 style={styles.imageTitle}>Retrieved Image</h3>
                <span style={styles.badge}>✓ Loaded</span>
              </div>

              <div style={styles.imageWrapper}>
                <Image
                  src={imageUrl}
                  alt="S3 Image"
                  width={1200}
                  height={800}
                  style={styles.image}
                  onError={() => {
                    setError(
                      "Failed to load image. Check the key and CORS settings."
                    );
                    setImageUrl(null);
                  }}
                />
              </div>

              <div style={styles.metadataPanel}>
                <div style={styles.metadataRow}>
                  <span style={styles.metadataLabel}>S3 Key:</span>
                  <code style={styles.metadataValue}>{imageKey}</code>
                </div>
                <div style={styles.metadataRow}>
                  <span style={styles.metadataLabel}>URL:</span>
                  <code style={styles.metadataValue}>{imageUrl}</code>
                </div>
              </div>

              <div style={styles.actions}>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.actionButton}
                >
                  🔗 Open in New Tab
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(imageUrl);
                    alert("URL copied to clipboard!");
                  }}
                  style={styles.actionButton}
                >
                  📋 Copy URL
                </button>
              </div>
            </div>
          </div>
        )}

        {!imageUrl && !error && !loading && (
          <div style={styles.placeholder}>
            <div style={styles.placeholderIcon}>🖼️</div>
            <h3 style={styles.placeholderTitle}>No Image Loaded</h3>
            <p style={styles.placeholderText}>
              Enter an S3 object key above and click &quot;Load Image&quot; to
              view your uploaded content
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
