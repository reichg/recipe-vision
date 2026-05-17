"use client";

import { MAX_RECIPES_PER_LLM_BATCH } from "@/schemas/recipeBatchSchema";
import { useEffect, useState } from "react";
import recipeStyles from "../recipes/recipe.module.css";
import styles from "./page.module.css";

interface ProcessResult {
  key: string;
  status: "success" | "error";
  imageCount: number;
  recipeId?: string;
  recipeTitle?: string;
  message: string;
}

interface BatchProcessSummaryResponse {
  prefix: string;
  pendingRecipeCount: number;
  maxProcessLimit: number;
  error?: string;
}

type BatchProcessEvent =
  | {
      type: "total";
      count: number;
    }
  | {
      type: "progress";
      key: string;
      index: number;
      total: number;
      message: string;
    }
  | {
      type: "result";
      result: ProcessResult;
    }
  | {
      type: "error";
      error: string;
    };

function clampSelectedLimit(limit: number, maxProcessLimit: number) {
  if (maxProcessLimit <= 0) {
    return 1;
  }

  return Math.min(Math.max(limit, 1), maxProcessLimit);
}

export default function BatchProcessPage() {
  const [s3Prefix, setS3Prefix] = useState("images/un-processed/");
  const [processing, setProcessing] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [currentFile, setCurrentFile] = useState("");
  const [currentProgressMessage, setCurrentProgressMessage] = useState("");
  const [totalFiles, setTotalFiles] = useState(0);
  const [pendingRecipeCount, setPendingRecipeCount] = useState(0);
  const [maxProcessLimit, setMaxProcessLimit] = useState(0);
  const [selectedLimit, setSelectedLimit] = useState(MAX_RECIPES_PER_LLM_BATCH);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary(prefix: string) {
    setLoadingSummary(true);

    try {
      const searchParams = new URLSearchParams();

      if (prefix) {
        searchParams.set("prefix", prefix);
      }

      const response = await fetch(
        `/api/batch-process${
          searchParams.size > 0 ? `?${searchParams.toString()}` : ""
        }`,
      );
      const data = (await response.json()) as BatchProcessSummaryResponse;

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to load batch processing summary",
        );
      }

      setPendingRecipeCount(data.pendingRecipeCount);
      setMaxProcessLimit(data.maxProcessLimit);
      setError(null);
      setSelectedLimit((currentLimit) =>
        clampSelectedLimit(currentLimit, data.maxProcessLimit),
      );
    } catch (loadError) {
      setPendingRecipeCount(0);
      setMaxProcessLimit(0);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load batch processing summary",
      );
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSummary(s3Prefix);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [s3Prefix]);

  const handleBatchProcess = async () => {
    setError(null);

    if (pendingRecipeCount === 0) {
      return;
    }

    setProcessing(true);
    setResults([]);
    setCurrentFile("");
    setCurrentProgressMessage("");
    setTotalFiles(0);

    const requestedLimit = clampSelectedLimit(selectedLimit, maxProcessLimit);

    try {
      const response = await fetch("/api/batch-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefix: s3Prefix, limit: requestedLimit }),
      });

      if (!response.ok) {
        throw new Error("Failed to start batch processing");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let bufferedChunk = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufferedChunk += decoder.decode(value, { stream: true });
        const lines = bufferedChunk.split("\n");

        bufferedChunk = lines.pop() ?? "";

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as BatchProcessEvent;

            if (data.type === "total") {
              setTotalFiles(data.count);
            } else if (data.type === "progress") {
              setCurrentFile(data.key);
              setCurrentProgressMessage(data.message);
            } else if (data.type === "result") {
              setResults((prev) => [...prev, data.result]);
            } else if (data.type === "error") {
              setError(data.error);
            }
          } catch (e) {
            console.error("Failed to parse chunk:", e);
          }
        }
      }
      const trailingChunk = bufferedChunk.trim();

      if (trailingChunk) {
        try {
          const data = JSON.parse(trailingChunk) as BatchProcessEvent;

          if (data.type === "result") {
            setResults((prev) => [...prev, data.result]);
          } else if (data.type === "error") {
            setError(data.error);
          }
        } catch (e) {
          console.error("Failed to parse trailing chunk:", e);
        }
      }
    } catch (processingError) {
      console.error("Batch processing error:", processingError);
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Unknown error",
      );
    } finally {
      setProcessing(false);
      setCurrentFile("");
      setCurrentProgressMessage("");
      await loadSummary(s3Prefix);
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const selectableLimits = Array.from(
    { length: maxProcessLimit },
    (_, index) => index + 1,
  );

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
        <div className={styles.summaryCards}>
          <div className={`${styles.summaryCard} ${styles.summaryCardPending}`}>
            <div className={styles.summaryValue}>
              {loadingSummary ? "..." : pendingRecipeCount}
            </div>
            <div className={styles.summaryLabel}>Unprocessed Recipe Groups</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {Math.min(maxProcessLimit || 0, MAX_RECIPES_PER_LLM_BATCH)}
            </div>
            <div className={styles.summaryLabel}>Max Per Run</div>
          </div>
        </div>

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

        <div className={styles.controlRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Recipes To Extract</label>
            <select
              value={clampSelectedLimit(selectedLimit, maxProcessLimit)}
              onChange={(event) => {
                setSelectedLimit(Number(event.target.value));
              }}
              disabled={
                processing || loadingSummary || pendingRecipeCount === 0
              }
              className={styles.limitSelect}
            >
              {selectableLimits.length > 0 ? (
                selectableLimits.map((limitOption) => (
                  <option key={limitOption} value={limitOption}>
                    {limitOption}
                  </option>
                ))
              ) : (
                <option value={1}>0</option>
              )}
            </select>
            <p className={styles.hint}>
              Extract up to {MAX_RECIPES_PER_LLM_BATCH} recipe groups per run.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadSummary(s3Prefix);
            }}
            disabled={loadingSummary || processing}
            className={styles.refreshButton}
          >
            Refresh Count
          </button>
        </div>

        <button
          onClick={handleBatchProcess}
          disabled={processing || loadingSummary || pendingRecipeCount === 0}
          className={`${styles.submitButton} ${
            processing || pendingRecipeCount === 0
              ? styles.submitButtonDisabled
              : ""
          }`}
        >
          {processing
            ? `Processing ${totalFiles || clampSelectedLimit(selectedLimit, maxProcessLimit)} recipe group${
                (totalFiles ||
                  clampSelectedLimit(selectedLimit, maxProcessLimit)) === 1
                  ? ""
                  : "s"
              }...`
            : pendingRecipeCount === 0
              ? "No Recipe Groups Ready"
              : `Extract ${clampSelectedLimit(selectedLimit, maxProcessLimit)} Recipe Group${
                  clampSelectedLimit(selectedLimit, maxProcessLimit) === 1
                    ? ""
                    : "s"
                }`}
        </button>

        {!loadingSummary && pendingRecipeCount === 0 && (
          <p className={styles.emptyState}>
            No unprocessed recipe groups are available for this prefix.
          </p>
        )}

        {processing && (
          <div className={styles.progressPanel} aria-live="polite">
            <p className={styles.progressText}>
              {totalFiles > 0
                ? `Processing ${results.length + 1} of ${totalFiles} recipe groups...`
                : "Finding images..."}
            </p>
            {currentProgressMessage && (
              <p className={styles.progressMessage}>{currentProgressMessage}</p>
            )}
            {currentFile && (
              <p className={styles.currentFile}>Current: {currentFile}</p>
            )}
          </div>
        )}

        {error && <p className={recipeStyles.error}>{error}</p>}

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
                    {result.recipeTitle && (
                      <div className={styles.resultTitle}>
                        {result.recipeTitle}
                      </div>
                    )}
                    <div className={styles.resultMessage}>{result.message}</div>
                    <div className={styles.resultMeta}>
                      {result.imageCount} image
                      {result.imageCount === 1 ? "" : "s"}
                      {result.recipeId ? ` • ${result.recipeId}` : ""}
                    </div>
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
