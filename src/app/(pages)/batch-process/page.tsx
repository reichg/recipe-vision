"use client";

import { useState } from "react";
import { styles } from "../../styles/recipe.styles";

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
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setProcessing(false);
      setCurrentFile("");
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <main style={styles.main}>
      <div style={{ textAlign: "center", width: "100%" }}>
        <h1 style={styles.pageTitle}>Batch Process S3 Images</h1>
        <p style={styles.pageSubtitle}>
          Process all images from an S3 directory and parse them as recipes
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#fef9f3",
          padding: "40px",
          borderRadius: 20,
          border: "1px solid #ede5d9",
          marginTop: 20,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "#5a4a3a",
            }}
          >
            S3 Prefix (Directory Path)
          </label>
          <input
            type="text"
            value={s3Prefix}
            onChange={(e) => setS3Prefix(e.target.value)}
            placeholder="images/un-processed/"
            disabled={processing}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #ede5d9",
              borderRadius: 12,
              fontSize: 15,
              fontFamily: "inherit",
              backgroundColor: processing ? "#f5f5f5" : "white",
              color: "#5a4a3a",
            }}
          />
          <p
            style={{
              fontSize: 12,
              color: "#8b7355",
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Examples: images/un-processed/, images/, or leave empty for root
            directory
          </p>
        </div>

        <button
          onClick={handleBatchProcess}
          disabled={processing}
          style={{
            width: "100%",
            padding: "14px 24px",
            backgroundColor: processing ? "#ccc" : "#c9a887",
            color: "white",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: processing ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: processing
              ? "none"
              : "0 4px 15px rgba(201, 168, 135, 0.2)",
          }}
        >
          {processing ? "Processing..." : "Start Batch Processing"}
        </button>

        {processing && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: "#f0f4ff",
              borderRadius: 12,
              border: "1px solid #667eea",
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: "#667eea" }}>
              {totalFiles > 0
                ? `Processing ${results.length + 1} of ${totalFiles} files...`
                : "Finding images..."}
            </p>
            {currentFile && (
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: 12,
                  color: "#8b7355",
                  fontFamily: "monospace",
                }}
              >
                Current: {currentFile}
              </p>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 16,
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#d4f4dd",
                  borderRadius: 12,
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 24, fontWeight: 700, color: "#2d6a3e" }}
                >
                  {successCount}
                </div>
                <div style={{ fontSize: 12, color: "#2d6a3e" }}>Successful</div>
              </div>
              <div
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#fde8e8",
                  borderRadius: 12,
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 24, fontWeight: 700, color: "#c97c7c" }}
                >
                  {errorCount}
                </div>
                <div style={{ fontSize: 12, color: "#c97c7c" }}>Failed</div>
              </div>
            </div>

            <div
              style={{
                maxHeight: 400,
                overflowY: "auto",
                border: "1px solid #ede5d9",
                borderRadius: 12,
                backgroundColor: "white",
              }}
            >
              {results.map((result, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px 16px",
                    borderBottom:
                      idx < results.length - 1 ? "1px solid #ede5d9" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontFamily: "monospace",
                        color: "#5a4a3a",
                        marginBottom: 4,
                      }}
                    >
                      {result.key}
                    </div>
                    {result.error && (
                      <div style={{ fontSize: 11, color: "#c97c7c" }}>
                        {result.error}
                      </div>
                    )}
                  </div>
                  <div>
                    {result.status === "success" ? (
                      <span
                        style={{
                          padding: "4px 12px",
                          backgroundColor: "#d4f4dd",
                          color: "#2d6a3e",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        ✓ Success
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "4px 12px",
                          backgroundColor: "#fde8e8",
                          color: "#c97c7c",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
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
