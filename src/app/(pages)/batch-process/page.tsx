"use client";

import { useState } from "react";
import recipeStyles from "../recipes/recipe.module.css";
import styles from "./page.module.css";

interface ProcessResult {
  key: string;
  status: "success" | "error";
  recipeId?: string;
  error?: string;
}

export default function BatchProcessPage() {
  const [s3Prefix, setS3Prefix] = useState("images/un-processed/");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [currentFile, setCurrentFile] = useState("");
  const [totalFiles, setTotalFiles] = useState(0);

  const handleBatchProcess = async () => {
    setProcessing(true);
    setResults([]);
    setCurrentFile("");
    setTotalFiles(0);

    try {
      const response = await fetch("/api/batch-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefix: s3Prefix }),
      });

      if (!response.ok) {
        throw new Error("Failed to start batch processing");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.type === "total") {
              setTotalFiles(data.count);
            } else if (data.type === "progress") {
              setCurrentFile(data.key);
            } else if (data.type === "result") {
              setResults((prev) => [...prev, data.result]);
            }
          } catch (e) {
            console.error("Failed to parse chunk:", e);
          }
        }
      }
    } catch (error) {
      console.error("Batch processing error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setProcessing(false);
      setCurrentFile("");
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <main className={recipeStyles.main}>
      <div className={styles.header}>
        <h1 className={recipeStyles.pageTitle}>Batch Process S3 Images</h1>
        <p className={recipeStyles.pageSubtitle}>
          Process uploaded recipe-photo groups from S3 and parse each group as
          one recipe
        </p>
      </div>

      <div className={styles.panel}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            S3 Prefix (Directory Path)
          </label>
          <input
            type="text"
            value={s3Prefix}
            onChange={(e) => setS3Prefix(e.target.value)}
            placeholder="images/un-processed/"
            disabled={processing}
            className={styles.prefixInput}
          />
          <p className={styles.hint}>
            Examples: images/un-processed/, images/, or leave empty for root
            directory. Each recipe group may contain multiple photos.
          </p>
        </div>

        <button
          onClick={handleBatchProcess}
          disabled={processing}
          className={`${styles.submitButton} ${
            processing ? styles.submitButtonDisabled : ""
          }`}
        >
          {processing ? "Processing..." : "Start Batch Processing"}
        </button>

        {processing && (
          <div className={styles.progressPanel}>
            <p className={styles.progressText}>
              {totalFiles > 0
                ? `Processing ${results.length + 1} of ${totalFiles} recipe groups...`
                : "Finding images..."}
            </p>
            {currentFile && (
              <p className={styles.currentFile}>Current: {currentFile}</p>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div className={styles.results}>
            <div className={styles.summaryCards}>
              <div
                className={`${styles.summaryCard} ${styles.summaryCardSuccess}`}
              >
                <div className={styles.summaryValue}>{successCount}</div>
                <div className={styles.summaryLabel}>Successful</div>
              </div>
              <div
                className={`${styles.summaryCard} ${styles.summaryCardError}`}
              >
                <div className={styles.summaryValue}>{errorCount}</div>
                <div className={styles.summaryLabel}>Failed</div>
              </div>
            </div>

            <div className={styles.resultsList}>
              {results.map((result, idx) => (
                <div key={idx} className={styles.resultRow}>
                  <div className={styles.resultInfo}>
                    <div className={styles.resultKey}>{result.key}</div>
                    {result.error && (
                      <div className={styles.resultError}>{result.error}</div>
                    )}
                  </div>
                  <div>
                    {result.status === "success" ? (
                      <span
                        className={`${styles.resultStatus} ${styles.resultStatusSuccess}`}
                      >
                        ✓ Success
                      </span>
                    ) : (
                      <span
                        className={`${styles.resultStatus} ${styles.resultStatusError}`}
                      >
                        ✗ Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
