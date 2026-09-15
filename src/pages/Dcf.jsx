import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
import { useCalculateDcfMutation } from "../slices/DcfSlice";
import TopBar from "../components/TopBar";

const EMPTY_ROW_COUNT = 8;

function makeEmptyRows(count) {
  return Array.from({ length: count }).map(() => ({ period: "", cashFlow: "", discountRate: "" }));
}

export default function Dcf() {
  const [calculateDcf, { isLoading }] = useCalculateDcfMutation();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(makeEmptyRows(EMPTY_ROW_COUNT));
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const looksLikeHeader = isNaN(parseFloat(lines[0].split(",")[1]));
    const dataLines = looksLikeHeader ? lines.slice(1) : lines;

    return dataLines.map((line) => {
      const [period, cashFlow, discountRate] = line.split(",").map((v) => v.trim());
      return { period, cashFlow, discountRate };
    });
  }

  function handleFileChange(e) {
    const selected = e.target.files[0];
    setFile(selected);
    setResult(null);

    if (!selected) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseCsv(event.target.result);
        const padded = parsed.length < EMPTY_ROW_COUNT
          ? [...parsed, ...makeEmptyRows(EMPTY_ROW_COUNT - parsed.length)]
          : parsed;
        setRows(padded);
      } catch {
        toast.error("Could not read CSV file.");
      }
    };
    reader.readAsText(selected);
  }

  function handleCellChange(index, field, value) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setResult(null);
  }

  function rowsToCsvFile(rowsToUse) {
    const nonEmpty = rowsToUse.filter(
      (r) => r.period.trim() || r.cashFlow.trim() || r.discountRate.trim()
    );
    const csvText = ["Period,CashFlow,DiscountRate", ...nonEmpty.map((r) => `${r.period},${r.cashFlow},${r.discountRate}`)].join("\n");
    return new File([csvText], "dcf.csv", { type: "text/csv" });
  }

  async function handleUpload(e) {
    e.preventDefault();
    const hasData = rows.some((r) => r.period.trim() || r.cashFlow.trim() || r.discountRate.trim());
    if (!hasData) return;
    try {
      const csvFile = rowsToCsvFile(rows);
      const data = await calculateDcf(csvFile).unwrap();
      setResult(data);
    } catch (err) {
      toast.error(err?.data || "Failed to calculate DCF. Check your values.");
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setRows(makeEmptyRows(EMPTY_ROW_COUNT));
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasAnyInput = rows.some((r) => r.period.trim() || r.cashFlow.trim() || r.discountRate.trim());

  function formatValue(value) {
    if (value == null) return "—";
    return typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;
  }

  return (
    <div className="App">
      <header className="App-header">
        <div style={styles.pageWrap}>
          <TopBar />
          <div style={styles.page}>
            <div style={styles.app}>
              <div style={styles.hd}>
                <h3 style={styles.hdTitle}>DCF Calculator</h3>
                <p style={styles.hdSubtitle}>
                  Upload a CSV, or type values directly: <code>Period, CashFlow, DiscountRate</code>
                </p>
              </div>

              <form onSubmit={handleUpload} style={styles.bar}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={styles.hiddenInput}
                  id="csv-upload"
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
                  <label htmlFor="csv-upload" style={styles.fileChip}>
                    <FileIcon />
                    <span style={styles.fileChipName}>Choose CSV</span>
                  </label>
                )}

                <button style={styles.btn} type="submit" disabled={isLoading || !hasAnyInput}>
                  <span style={{ opacity: isLoading ? 0 : 1, display: "inline-flex", alignItems: "center", gap: "7px" }}>
                    <CalcIcon />
                    Calculate
                  </span>
                  {isLoading && <span style={styles.spinner} />}
                </button>

                {result && (
                  <span style={styles.stat}>
                    <CheckIcon />
                    Total PV {formatValue(result.totalPresentValue)}
                  </span>
                )}
              </form>

              <div style={styles.content}>
              <div style={styles.tw}>
                <table className="fin-table" style={styles.table}>
                  <caption style={styles.caption}>Cash flow inputs</caption>
                  <thead>
                    <tr>
                      <th style={styles.th}>Period</th>
                      <th style={styles.th}>Cash Flow</th>
                      <th style={styles.th}>Discount Rate</th>
                      <th style={styles.th}>Cumulative Factor</th>
                      <th style={styles.th}>Present Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const computed = result?.periods?.[i];
                      return (
                        <tr key={i}>
                          <td>
                            <input
                              style={styles.cellInput}
                              value={row.period}
                              onChange={(e) => handleCellChange(i, "period", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              style={{ ...styles.cellInput, textAlign: "right" }}
                              value={row.cashFlow}
                              onChange={(e) => handleCellChange(i, "cashFlow", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              style={{ ...styles.cellInput, textAlign: "right" }}
                              value={row.discountRate}
                              onChange={(e) => handleCellChange(i, "discountRate", e.target.value)}
                            />
                          </td>
                          <td>{computed ? computed.cumulativeDiscountFactor.toFixed(4) : "—"}</td>
                          <td>{computed ? computed.presentValue.toFixed(2) : "—"}</td>
                        </tr>
                      );
                    })}
                    {result && (
                      <tr className="key">
                        <td colSpan={4}>Total Present Value</td>
                        <td>{formatValue(result.totalPresentValue)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
function CalcIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
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
    maxWidth: "900px",
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
  stat: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12.5px",
    fontWeight: 500,
    color: "var(--ink-2)",
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
  cellInput: {
    width: "100%",
    border: "1px solid transparent",
    background: "transparent",
    padding: "4px",
    borderRadius: "3px",
    fontSize: "13px",
    fontFamily: "inherit",
    color: "var(--ink)",
  },
};
