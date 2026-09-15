import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { JsonView, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { useStartExtractionJobMutation, useLazyGetExtractionJobQuery } from "../slices/AiSlice";
import TopBar from "../components/TopBar";

const POLL_INTERVAL_MS = 2000;

export default function Extract() {
  const [startExtractionJob] = useStartExtractionJobMutation();
  const [fetchJob] = useLazyGetExtractionJobQuery();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" | "json"
  const [isProcessing, setIsProcessing] = useState(false);
  const [pollFlash, setPollFlash] = useState(null); // { status, key }
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const pollTimeoutRef = useRef(null);
  const flashCounterRef = useRef(0);

  const POLL_FLASH_COLORS = {
    Pending: "#999",
    Processing: "#2EC4B6",
    Completed: "#1a9e6a",
    Failed: "#c0392b",
  };

  function flashPollStatus(status) {
    flashCounterRef.current += 1;
    setPollFlash({ status, key: flashCounterRef.current });
  }

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  function handleFileChange(e) {
    const selected = e.target.files[0];
    console.log("[Extract] File selected:", selected?.name, selected?.type, selected?.size, "bytes");
    setFile(selected);
    setResult(null);
  }

  async function pollJob(jobId) {
    console.log("[Extract] Polling job:", jobId);
    try {
      const job = await fetchJob(jobId).unwrap();
      console.log("[Extract] Job status:", job.status);
      setIsSending(false);
      flashPollStatus(job.status);

      if (job.status === "Completed") {
        setIsProcessing(false);
        setResult(job.result);
        console.log("[Extract] Job completed:", job.result);
        return;
      }

      if (job.status === "Failed") {
        setIsProcessing(false);
        console.error("[Extract] Job failed:", job.errorMessage);
        toast.error(job.errorMessage || "Failed to analyze document.");
        return;
      }

      pollTimeoutRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS);
    } catch (err) {
      setIsProcessing(false);
      console.error("[Extract] Polling failed:", err);
      toast.error(err?.data || "Failed to check extraction status.");
    }
  }

  async function handleExtract(e) {
    e.preventDefault();
    if (!file) return;
    setResult(null);
    setIsProcessing(true);
    setIsSending(true);
    setPollFlash(null);
    console.log("[Extract] Starting extraction job for:", file.name);
    try {
      const { jobId } = await startExtractionJob(file).unwrap();
      console.log("[Extract] Job created:", jobId);
      pollTimeoutRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS);
    } catch (err) {
      setIsProcessing(false);
      setIsSending(false);
      console.error("[Extract] Failed to start job:", err);
      toast.error(err?.data || "Failed to start analysis.");
    }
  }

  function handleClear() {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    setFile(null);
    setResult(null);
    setSearchTerm("");
    setIsProcessing(false);
    setIsSending(false);
    setPollFlash(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function getFilteredStatements() {
    if (!result) return [];
    if (!searchTerm.trim()) return result.statements;

    const term = searchTerm.trim().toLowerCase();
    return result.statements
      .map((statement) => ({
        ...statement,
        rows: statement.rows.filter(
          (row) =>
            row.rowType === "title" ||
            row.label.toLowerCase().includes(term) ||
            row.values.some((v) => v != null && String(v).toLowerCase().includes(term))
        ),
      }))
      .filter((statement) => statement.rows.some((row) => row.rowType !== "title"));
  }

  const filteredStatements = getFilteredStatements();

  function formatValue(value) {
    if (value == null) return "—";
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  return (
    <div className="App">
      <header className="App-header">
        <div style={styles.pageWrap}>
          <TopBar />
          <div style={styles.page}>
            <div style={styles.card}>
              <h1 style={styles.h1}>Financial Document Extractor</h1>
              <p style={styles.subtitle}>
                Upload a balance sheet, income statement, or cash flow statement — Gemini will extract it as a structured table.
              </p>

              <form onSubmit={handleExtract} style={styles.form}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.xls,.xlsx"
                  onChange={handleFileChange}
                  style={styles.hiddenInput}
                  id="doc-upload"
                />
                <label htmlFor="doc-upload" style={styles.uploadButton}>
                  {file ? file.name : "Choose Document"}
                </label>
                <button style={styles.button} type="submit" disabled={isProcessing || !file}>
                  <span style={{ opacity: isProcessing ? 0 : 1 }}>Extract</span>
                  {isProcessing && <span style={styles.spinner} />}
                </button>
                <button style={styles.clearButton} type="button" onClick={handleClear} disabled={!file && !result}>
                  Clear
                </button>
                {isSending && (
                  <span style={{ ...styles.pollIndicator, background: "#e67e22", animation: "pill-pulse 1s ease infinite" }}>
                    Starting
                  </span>
                )}
                {!isSending && pollFlash && (
                  <span
                    key={pollFlash.key}
                    style={{
                      ...styles.pollIndicator,
                      background: POLL_FLASH_COLORS[pollFlash.status] || "#666",
                    }}
                  >
                    {pollFlash.status}
                  </span>
                )}
              </form>

              {result && (
                <div style={styles.toolbar}>
                  <input
                    type="text"
                    placeholder="Search line items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                  <div style={styles.toggleGroup}>
                    <button
                      type="button"
                      style={styles.toggleButton(viewMode === "table")}
                      onClick={() => setViewMode("table")}
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      style={styles.toggleButton(viewMode === "json")}
                      onClick={() => setViewMode("json")}
                    >
                      JSON
                    </button>
                  </div>
                </div>
              )}

              {!result && <div style={styles.placeholder}>No data yet — upload a document and click Extract.</div>}

              {result && viewMode === "json" && (
                <div style={styles.jsonWrap}>
                  <JsonView data={{ statements: filteredStatements }} style={defaultStyles} />
                </div>
              )}

              {result && viewMode === "table" && (
                <div style={styles.statementsWrap}>
                  {filteredStatements.map((statement, si) => (
                    <div key={si} style={styles.statementBlock}>
                      <h2 style={styles.statementTitle}>{statement.statementType}</h2>
                      <div style={styles.tableScroll}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.thLabel}></th>
                              {statement.columns.map((col, ci) => (
                                <th key={ci} style={styles.th}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {statement.rows.map((row, ri) => {
                              if (row.rowType === "title") {
                                return (
                                  <tr key={ri}>
                                    <td colSpan={statement.columns.length + 1} style={styles.titleRow}>
                                      {row.label}
                                    </td>
                                  </tr>
                                );
                              }
                              const isSum = row.rowType === "sum";
                              return (
                                <tr key={ri}>
                                  <td style={isSum ? styles.tdLabelSum : styles.tdLabel}>{row.label}</td>
                                  {row.values.map((v, vi) => (
                                    <td key={vi} style={isSum ? styles.tdSum : styles.td}>
                                      {formatValue(v)}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {statement.footnotes && statement.footnotes.length > 0 && (
                        <div style={styles.footnotes}>
                          {statement.footnotes.map((fn, fi) => (
                            <div key={fi} style={styles.footnoteItem}>
                              <div style={styles.footnoteNote}>{fn.note}</div>
                              <div style={styles.footnoteComment}>{fn.comment}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

const styles = {
  pageWrap: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh",
    overflow: "hidden",
  },
  page: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "24px 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  card: {
    background: "#fff",
    padding: "32px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: "980px",
    textAlign: "left",
  },
  h1: {
    fontSize: "22px",
    margin: "0 0 8px",
    color: "#2C4A87",
    textAlign: "left",
  },
  subtitle: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  hiddenInput: {
    display: "none",
  },
  uploadButton: {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    color: "#2C4A87",
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "180px",
  },
  button: {
    position: "relative",
    padding: "10px 18px",
    borderRadius: "8px",
    border: "none",
    background: "#2EC4B6",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
  },
  spinner: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "16px",
    height: "16px",
    marginTop: "-8px",
    marginLeft: "-8px",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "dcf-spin 0.7s linear infinite",
  },
  clearButton: {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    color: "#c0392b",
    fontSize: "14px",
    cursor: "pointer",
  },
  pollIndicator: {
    padding: "8px 16px",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 700,
    animation: "poll-flash 2s ease forwards",
  },
  toolbar: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "200px",
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    textAlign: "left",
  },
  toggleGroup: {
    display: "flex",
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
  },
  toggleButton: (active) => ({
    padding: "9px 16px",
    border: "none",
    background: active ? "#2C4A87" : "#fff",
    color: active ? "#fff" : "#2C4A87",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  }),
  jsonWrap: {
    maxHeight: "500px",
    overflowY: "auto",
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid #eee",
    padding: "12px",
    textAlign: "left",
  },
  placeholder: {
    padding: "24px",
    textAlign: "center",
    color: "#999",
    fontSize: "13px",
    border: "1px dashed #ddd",
    borderRadius: "8px",
  },
  statementsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },
  statementBlock: {
    border: "1px solid #eee",
    borderRadius: "8px",
    overflow: "hidden",
  },
  statementTitle: {
    margin: 0,
    padding: "12px 16px",
    background: "#2C4A87",
    color: "#fff",
    fontSize: "15px",
  },
  tableScroll: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  thLabel: {
    textAlign: "left",
    padding: "8px 16px",
    borderBottom: "2px solid #eee",
    background: "#f7f8fa",
  },
  th: {
    textAlign: "right",
    padding: "8px 12px",
    borderBottom: "2px solid #eee",
    background: "#f7f8fa",
    whiteSpace: "nowrap",
  },
  titleRow: {
    padding: "8px 16px 4px",
    fontWeight: 700,
    color: "#2C4A87",
    background: "#f0f3f8",
  },
  tdLabel: {
    padding: "6px 16px",
    borderBottom: "1px solid #f5f5f5",
    whiteSpace: "nowrap",
  },
  tdLabelSum: {
    padding: "6px 16px",
    borderBottom: "1px solid #f5f5f5",
    borderTop: "1px solid #ddd",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "6px 12px",
    borderBottom: "1px solid #f5f5f5",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  tdSum: {
    padding: "6px 12px",
    borderBottom: "1px solid #f5f5f5",
    borderTop: "1px solid #ddd",
    textAlign: "right",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  footnotes: {
    padding: "12px 16px",
    background: "#fafafa",
    borderTop: "1px solid #eee",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  footnoteItem: {
    fontSize: "12.5px",
  },
  footnoteNote: {
    color: "#333",
    fontStyle: "italic",
  },
  footnoteComment: {
    color: "#2EC4B6",
    marginTop: "2px",
  },
};
