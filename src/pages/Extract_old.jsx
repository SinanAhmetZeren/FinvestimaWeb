import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { JsonView, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { useStartExtractionJobMutation, useLazyGetExtractionJobQuery } from "../slices/AiSlice";
import TopBar from "../components/TopBar";

const POLL_INTERVAL_MS = 2000;

const POLL_FLASH_COLORS = {
  Pending: "var(--ink-3)",
  Processing: "var(--teal)",
  Completed: "var(--teal-dk)",
  Failed: "var(--red)",
};

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

  function handleRemoveFile() {
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

  const totalLineItems = result
    ? result.statements.reduce((sum, s) => sum + s.rows.filter((r) => r.rowType !== "title").length, 0)
    : 0;
  const totalPeriods = result && result.statements.length > 0 ? result.statements[0].columns.length : 0;

  function formatValue(value) {
    if (value == null) return "—";
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function lastSumIndex(rows) {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].rowType === "sum") return i;
    }
    return -1;
  }

  return (
    <div className="App">
      <header className="App-header">
        <div style={styles.pageWrap}>
          <TopBar />
          <div style={styles.page}>
            <div style={styles.app}>
              <div style={styles.hd}>
                <h3 style={styles.hdTitle}>Financial Document Extractor</h3>
                <p style={styles.hdSubtitle}>Upload a balance sheet, income statement, or cash flow statement.</p>
              </div>

              <form onSubmit={handleExtract} style={styles.bar}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.xls,.xlsx"
                  onChange={handleFileChange}
                  style={styles.hiddenInput}
                  id="doc-upload"
                />
                {file ? (
                  <span style={styles.fileChip}>
                    <FileIcon />
                    <span style={styles.fileChipName}>{file.name}</span>
                    <button type="button" style={styles.fileChipX} onClick={handleRemoveFile} aria-label="Remove">
                      <XIcon />
                    </button>
                  </span>
                ) : (
                  <label htmlFor="doc-upload" style={styles.fileChip}>
                    <FileIcon />
                    <span style={styles.fileChipName}>Choose document</span>
                  </label>
                )}

                <button style={styles.btn} type="submit" disabled={isProcessing || !file}>
                  <span style={{ opacity: isProcessing ? 0 : 1, display: "inline-flex", alignItems: "center", gap: "7px" }}>
                    <UploadIcon />
                    Extract
                  </span>
                  {isProcessing && <span style={styles.spinner} />}
                </button>

                {isSending && (
                  <span style={{ ...styles.pill, background: "#e67e22", animation: "pill-pulse 1s ease infinite" }}>
                    Starting
                  </span>
                )}
                {!isSending && pollFlash && (
                  <span
                    key={pollFlash.key}
                    style={{ ...styles.pill, background: POLL_FLASH_COLORS[pollFlash.status] || "var(--ink-3)" }}
                  >
                    {pollFlash.status}
                  </span>
                )}
                {!isSending && !pollFlash && result && (
                  <span style={styles.stat}>
                    <CheckIcon />
                    Extracted {totalPeriods} periods · {totalLineItems} line items
                  </span>
                )}

                <span style={styles.sp} />

                {result && (
                  <>
                    <span style={styles.srch}>
                      <SearchIcon />
                      <input
                        type="text"
                        placeholder="Filter line items"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.srchInput}
                      />
                    </span>
                    <span style={styles.seg}>
                      <button type="button" style={styles.segBtn(viewMode === "table")} onClick={() => setViewMode("table")}>
                        Table
                      </button>
                      <button type="button" style={styles.segBtn(viewMode === "json")} onClick={() => setViewMode("json")}>
                        JSON
                      </button>
                    </span>
                  </>
                )}
              </form>

              <div style={styles.content}>
              {!result && <div style={styles.placeholder}>No data yet — upload a document and click Extract.</div>}

              {result && viewMode === "json" && (
                <div style={styles.jsonWrap}>
                  <JsonView data={{ statements: filteredStatements }} style={defaultStyles} />
                </div>
              )}

              {result && viewMode === "table" && (
                <div style={styles.statementsWrap}>
                  {filteredStatements.map((statement, si) => {
                    const keyIdx = lastSumIndex(statement.rows);
                    return (
                      <div key={si} style={styles.tw}>
                        <table className="fin-table" style={styles.table}>
                          <caption style={styles.caption}>{statement.statementType}</caption>
                          <thead>
                            <tr>
                              <th style={styles.th}></th>
                              {statement.columns.map((col, ci) => (
                                <th key={ci} style={styles.th}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {statement.rows.map((row, ri) => {
                              if (row.rowType === "title") {
                                return (
                                  <tr className="grp" key={ri}>
                                    <td colSpan={statement.columns.length + 1}>{row.label}</td>
                                  </tr>
                                );
                              }
                              const isSum = row.rowType === "sum";
                              const isKey = ri === keyIdx;
                              return (
                                <tr className={isKey ? "key" : isSum ? "sum" : ""} key={ri}>
                                  <td>{row.label}</td>
                                  {row.values.map((v, vi) => (
                                    <td key={vi}>{formatValue(v)}</td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

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
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" style={{ width: 14, height: 14, color: "var(--ink-3)", flexShrink: 0 }}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ width: 12, height: 12 }}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M12 3v11" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 19h16" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" style={{ width: 13, height: 13, color: "var(--teal)" }}>
      <path d="M4 13l5 5L20 6" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14, color: "var(--ink-3)", flexShrink: 0 }}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
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
    overflow: "hidden",
    padding: "24px 22px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  app: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    background: "var(--paper)",
    border: "1px solid var(--rule)",
    borderRadius: "3px",
    overflow: "hidden",
    width: "100%",
    maxWidth: "1100px",
    textAlign: "left",
  },
  content: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },
  hd: {
    flexShrink: 0,
    padding: "20px 22px 0",
  },
  hdTitle: {
    fontSize: "21px",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    margin: 0,
    color: "var(--ink)",
  },
  hdSubtitle: {
    fontSize: "13.5px",
    color: "var(--ink-2)",
    marginTop: "4px",
  },
  bar: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 22px",
    flexWrap: "wrap",
  },
  hiddenInput: {
    display: "none",
  },
  fileChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "9px",
    border: "1px solid var(--rule)",
    background: "#fff",
    borderRadius: "3px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 500,
    maxWidth: "260px",
    cursor: "pointer",
    color: "var(--ink)",
  },
  fileChipName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileChipX: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "var(--ink-3)",
    padding: 0,
    display: "flex",
    fontFamily: "inherit",
  },
  btn: {
    position: "relative",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    border: "1px solid var(--teal)",
    background: "var(--teal)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    padding: "9px 16px",
    borderRadius: "3px",
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
  pill: {
    padding: "7px 14px",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "12.5px",
    fontWeight: 700,
    animation: "poll-flash 2s ease forwards",
  },
  stat: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12.5px",
    fontWeight: 500,
    color: "var(--ink-2)",
  },
  sp: {
    flex: 1,
  },
  srch: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid var(--rule)",
    background: "#fff",
    borderRadius: "3px",
    padding: "0 11px",
    height: "34px",
    width: "210px",
  },
  srchInput: {
    border: "none",
    outline: "none",
    background: "none",
    fontFamily: "inherit",
    fontSize: "13px",
    width: "100%",
    color: "var(--ink)",
  },
  seg: {
    display: "flex",
    border: "1px solid var(--rule)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  segBtn: (active) => ({
    fontFamily: "inherit",
    border: "none",
    background: active ? "var(--band)" : "#fff",
    cursor: "pointer",
    fontSize: "12.5px",
    fontWeight: active ? 600 : 500,
    color: active ? "var(--ink)" : "var(--ink-2)",
    padding: "0 13px",
    height: "34px",
  }),
  placeholder: {
    margin: "0 22px 22px",
    padding: "24px",
    textAlign: "center",
    color: "var(--ink-3)",
    fontSize: "13px",
    border: "1px dashed var(--rule)",
    borderRadius: "3px",
  },
  jsonWrap: {
    maxHeight: "500px",
    overflowY: "auto",
    overflowX: "auto",
    borderTop: "1px solid var(--rule)",
    padding: "16px 22px",
    textAlign: "left",
  },
  statementsWrap: {
    display: "flex",
    flexDirection: "column",
  },
  tw: {
    borderTop: "1px solid var(--rule)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13.5px",
  },
  caption: {
    textAlign: "left",
    fontSize: "10.5px",
    fontWeight: 600,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "var(--ink-3)",
    padding: "15px 22px 9px",
    captionSide: "top",
  },
  th: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11.5px",
    fontWeight: 500,
    color: "var(--ink-3)",
    letterSpacing: ".04em",
    borderBottom: "1px solid var(--rule)",
    padding: "7px 14px 8px",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  footnotes: {
    padding: "12px 22px",
    background: "var(--band)",
    borderTop: "1px solid var(--rule)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  footnoteItem: {
    fontSize: "12.5px",
  },
  footnoteNote: {
    color: "var(--ink-2)",
    fontStyle: "italic",
  },
  footnoteComment: {
    color: "var(--teal-dk)",
    marginTop: "2px",
  },
};
