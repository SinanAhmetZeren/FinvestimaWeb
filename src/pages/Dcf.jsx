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

  function handleClear() {
    setFile(null);
    setRows(makeEmptyRows(EMPTY_ROW_COUNT));
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasAnyInput = rows.some((r) => r.period.trim() || r.cashFlow.trim() || r.discountRate.trim());

  return (
    <div className="App">
      <header className="App-header">
        <div style={styles.pageWrap}>
          <TopBar />
          <div style={styles.page}>
            <div style={styles.card}>
              <h1 style={styles.h1}>DCF Calculator</h1>
              <p style={styles.subtitle}>
                Upload a CSV, or type values directly: <code>Period,CashFlow,DiscountRate</code>
              </p>

              <form onSubmit={handleUpload} style={styles.form}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={styles.hiddenInput}
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" style={styles.uploadButton}>
                  {file ? file.name : "Choose CSV"}
                </label>
                <button style={styles.button} type="submit" disabled={isLoading || !hasAnyInput}>
                  <span style={{ opacity: isLoading ? 0 : 1 }}>Calculate</span>
                  {isLoading && <span style={styles.spinner} />}
                </button>
                <button style={styles.clearButton} type="button" onClick={handleClear} disabled={!hasAnyInput && !result}>
                  Clear
                </button>
              </form>

              <div style={styles.resultWrap}>
                <div style={styles.tableScroll}>
                  <table style={styles.table}>
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
                            <td style={styles.td}>
                              <input
                                style={styles.cellInput}
                                value={row.period}
                                onChange={(e) => handleCellChange(i, "period", e.target.value)}
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                style={styles.cellInput}
                                value={row.cashFlow}
                                onChange={(e) => handleCellChange(i, "cashFlow", e.target.value)}
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                style={styles.cellInput}
                                value={row.discountRate}
                                onChange={(e) => handleCellChange(i, "discountRate", e.target.value)}
                              />
                            </td>
                            <td style={styles.td}>{computed ? computed.cumulativeDiscountFactor.toFixed(4) : "—"}</td>
                            <td style={styles.td}>{computed ? computed.presentValue.toFixed(2) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={styles.totalRow}>
                  Total PV: <span style={styles.totalValue}>{result ? result.totalPresentValue.toFixed(2) : "—"}</span>
                </div>
              </div>
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
    maxWidth: "700px",
  },
  h1: {
    fontSize: "22px",
    margin: "0 0 8px",
    color: "#2C4A87",
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
    marginBottom: "24px",
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
  resultWrap: {
    marginTop: "12px",
  },
  tableScroll: {
    maxHeight: "320px",
    overflowY: "auto",
  },
  totalRow: {
    textAlign: "right",
    marginTop: "16px",
    fontSize: "15px",
    color: "#333",
  },
  totalValue: {
    color: "#1a9e6a",
    fontWeight: 700,
    fontSize: "17px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    borderBottom: "2px solid #eee",
    padding: "8px",
  },
  td: {
    borderBottom: "1px solid #f0f0f0",
    padding: "4px 8px",
  },
  cellInput: {
    width: "100%",
    border: "1px solid transparent",
    background: "transparent",
    padding: "4px",
    borderRadius: "4px",
    fontSize: "13px",
    fontFamily: "inherit",
  },
};
