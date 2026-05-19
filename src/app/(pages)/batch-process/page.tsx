"use client";

import { MAX_RECIPES_PER_LLM_BATCH } from "@/schemas/recipeBatchSchema";
import { useEffect, useId, useRef, useState } from "react";
import shellStyles from "../page-shell.module.css";
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

export { clampSelectedLimit };

export function formatRecipeGroupCount(count: number) {
  return `${count} recipe group${count === 1 ? "" : "s"}`;
}

export function getSelectableLimits(maxProcessLimit: number) {
  return Array.from(
    { length: Math.max(maxProcessLimit, 0) },
    (_, index) => index + 1,
  );
}

export function getLimitTriggerLabel({
  loadingSummary,
  maxProcessLimit,
  selectedLimit,
}: {
  loadingSummary: boolean;
  maxProcessLimit: number;
  selectedLimit: number;
}) {
  if (loadingSummary) {
    return "Loading limits...";
  }

  if (maxProcessLimit <= 0) {
    return "0 recipe groups";
  }

  return formatRecipeGroupCount(
    clampSelectedLimit(selectedLimit, maxProcessLimit),
  );
}

interface BatchLimitSelectProps {
  disabled: boolean;
  hintId: string;
  labelId: string;
  loadingSummary: boolean;
  maxProcessLimit: number;
  selectedLimit: number;
  onSelect: (limit: number) => void;
}

function BatchLimitSelect({
  disabled,
  hintId,
  labelId,
  loadingSummary,
  maxProcessLimit,
  selectedLimit,
  onSelect,
}: BatchLimitSelectProps) {
  const triggerId = useId();
  const triggerValueId = useId();
  const listboxId = useId();
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [activeLimit, setActiveLimit] = useState<number | null>(null);

  const selectableLimits = getSelectableLimits(maxProcessLimit);
  const effectiveSelectedLimit = clampSelectedLimit(
    selectedLimit,
    maxProcessLimit,
  );
  const isMenuOpen = isOpen && !disabled && selectableLimits.length > 0;

  function closeLimitMenu(restoreFocus = false) {
    setIsOpen(false);
    setActiveLimit(null);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  function openLimitMenu(nextActiveLimit = effectiveSelectedLimit) {
    if (disabled || selectableLimits.length === 0) {
      return;
    }

    setIsOpen(true);
    setActiveLimit(
      selectableLimits.includes(nextActiveLimit)
        ? nextActiveLimit
        : effectiveSelectedLimit,
    );
  }

  function moveActiveLimit(currentLimit: number, direction: 1 | -1) {
    const currentIndex = selectableLimits.indexOf(currentLimit);

    if (currentIndex === -1) {
      return;
    }

    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      selectableLimits.length - 1,
    );

    setActiveLimit(selectableLimits[nextIndex] ?? currentLimit);
  }

  function handleLimitSelection(limitOption: number) {
    onSelect(limitOption);
    closeLimitMenu(true);
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (selectorRef.current?.contains(event.target as Node)) {
        return;
      }

      closeLimitMenu();
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen || activeLimit === null) {
      return;
    }

    optionRefs.current[activeLimit]?.focus();
  }, [activeLimit, isMenuOpen]);

  return (
    <div className={styles.limitSelector} ref={selectorRef}>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-controls={isMenuOpen ? listboxId : undefined}
        aria-describedby={hintId}
        aria-expanded={isMenuOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${labelId} ${triggerValueId}`}
        className={`${styles.limitSelect} ${styles.limitSelectTrigger} ${
          isMenuOpen ? styles.limitSelectTriggerOpen : ""
        }`}
        onClick={() => {
          if (isMenuOpen) {
            closeLimitMenu();
            return;
          }

          openLimitMenu();
        }}
        onKeyDown={(event) => {
          if (
            event.key === "ArrowDown" ||
            event.key === "ArrowUp" ||
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            openLimitMenu();
          }
        }}
      >
        <span className={styles.limitSelectContent}>
          <span id={triggerValueId} className={styles.limitSelectValue}>
            {getLimitTriggerLabel({
              loadingSummary,
              maxProcessLimit,
              selectedLimit,
            })}
          </span>
          <span className={styles.limitSelectMeta}>
            {loadingSummary
              ? "Checking queued recipe groups before enabling extraction."
              : selectableLimits.length > 0
                ? `Choose how many groups to send through extraction, up to ${MAX_RECIPES_PER_LLM_BATCH} per run.`
                : "No queued recipe groups are available for this prefix."}
          </span>
        </span>
        <span className={styles.limitSelectChevron} aria-hidden="true" />
      </button>

      {isMenuOpen && (
        <ul
          id={listboxId}
          aria-labelledby={labelId}
          className={styles.limitOptions}
          role="listbox"
        >
          {selectableLimits.map((limitOption) => {
            const isActive = activeLimit === limitOption;
            const isSelected = effectiveSelectedLimit === limitOption;

            return (
              <li
                key={limitOption}
                id={`${listboxId}-option-${limitOption}`}
                ref={(node) => {
                  optionRefs.current[limitOption] = node;
                }}
                aria-selected={isSelected}
                className={`${styles.limitOption} ${
                  isActive ? styles.limitOptionActive : ""
                } ${isSelected ? styles.limitOptionSelected : ""}`}
                role="option"
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  handleLimitSelection(limitOption);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveActiveLimit(limitOption, 1);
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveActiveLimit(limitOption, -1);
                    return;
                  }

                  if (event.key === "Home") {
                    event.preventDefault();
                    setActiveLimit(selectableLimits[0] ?? limitOption);
                    return;
                  }

                  if (event.key === "End") {
                    event.preventDefault();
                    setActiveLimit(
                      selectableLimits[selectableLimits.length - 1] ??
                        limitOption,
                    );
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleLimitSelection(limitOption);
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeLimitMenu(true);
                    return;
                  }

                  if (event.key === "Tab") {
                    closeLimitMenu();
                  }
                }}
                onMouseEnter={() => {
                  setActiveLimit(limitOption);
                }}
              >
                <span className={styles.limitOptionValue}>
                  {formatRecipeGroupCount(limitOption)}
                </span>
                <span className={styles.limitOptionLabel}>
                  {limitOption === 1
                    ? "Run a focused extraction for a single recipe group."
                    : `Process ${limitOption} recipe groups in this extraction run.`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
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
  const limitLabelId = useId();
  const limitHintId = useId();

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
  const effectiveSelectedLimit = clampSelectedLimit(
    selectedLimit,
    maxProcessLimit,
  );
  const isLimitSelectionDisabled =
    processing || loadingSummary || pendingRecipeCount === 0;

  return (
    <main className={shellStyles.main}>
      <div className={shellStyles.headerContainer}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Extraction control</p>
          <h1 className={shellStyles.pageTitle}>Batch Process S3 Images</h1>
          <p className={shellStyles.pageSubtitle}>
            Turn queued recipe-photo groups into saved, searchable recipes with
            a controlled extraction run.
          </p>
        </div>

        <div className={styles.heroSummary}>
          <div className={styles.summaryCards}>
            <div
              className={`${styles.summaryCard} ${styles.summaryCardPending}`}
            >
              <div className={styles.summaryValue}>
                {loadingSummary ? "..." : pendingRecipeCount}
              </div>
              <div className={styles.summaryLabel}>
                Unprocessed Recipe Groups
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>
                {Math.min(maxProcessLimit || 0, MAX_RECIPES_PER_LLM_BATCH)}
              </div>
              <div className={styles.summaryLabel}>Max Per Run</div>
            </div>
          </div>
          <p className={styles.heroHint}>
            Use this console to drain the unprocessed queue in deliberate runs
            instead of flooding the extraction pipeline.
          </p>
        </div>
      </div>

      <div className={styles.panel}>

        <div className={styles.controlRow}>
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabel} id={limitLabelId}>
              Recipes To Extract
            </div>
            <BatchLimitSelect
              key={`limit-select-${maxProcessLimit}-${isLimitSelectionDisabled ? "disabled" : "enabled"}`}
              disabled={isLimitSelectionDisabled}
              hintId={limitHintId}
              labelId={limitLabelId}
              loadingSummary={loadingSummary}
              maxProcessLimit={maxProcessLimit}
              selectedLimit={selectedLimit}
              onSelect={setSelectedLimit}
            />
            <p className={styles.hint} id={limitHintId}>
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
          disabled={isLimitSelectionDisabled}
          className={`${styles.submitButton} ${
            processing || pendingRecipeCount === 0
              ? styles.submitButtonDisabled
              : ""
          }`}
        >
          {processing
            ? `Processing ${totalFiles || effectiveSelectedLimit} recipe group${
                (totalFiles || effectiveSelectedLimit) === 1 ? "" : "s"
              }...`
            : pendingRecipeCount === 0
              ? "No Recipe Groups Ready"
              : `Extract ${effectiveSelectedLimit} Recipe Group${
                  effectiveSelectedLimit === 1 ? "" : "s"
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

        {error && <p className={shellStyles.error}>{error}</p>}

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
