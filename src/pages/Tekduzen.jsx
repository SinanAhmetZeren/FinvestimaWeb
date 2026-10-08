import React, { useState } from "react";
import TopBar from "../components/TopBar";
import { tekduzenRows } from "../data/tekduzenHesaplari";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// Turkish number format while typing: digits, one comma (decimal) and an optional
// leading minus only — thousands separators are added on blur, not live, to avoid
// fighting the user's cursor position while they type.
function sanitizeNumberInput(raw) {
  let s = raw.replace(/[^\d,-]/g, "");
  const neg = s.startsWith("-");
  s = s.replace(/-/g, "");
  const firstComma = s.indexOf(",");
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "");
  }
  return (neg ? "-" : "") + s;
}

function formatNumberOnBlur(raw) {
  if (!raw || raw === "-") return "";
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return "";
  return num.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function Tekduzen() {
  const [values, setValues] = useState({});

  function handleChange(code, year, value) {
    setValues((prev) => ({ ...prev, [`${code}-${year}`]: sanitizeNumberInput(value) }));
  }

  function handleBlur(code, year) {
    setValues((prev) => ({ ...prev, [`${code}-${year}`]: formatNumberOnBlur(prev[`${code}-${year}`]) }));
  }

  return (
    <div className="App">
      <header className="App-header">
        <div style={styles.pageWrap}>
          <TopBar />
          <div style={styles.page}>
            <div style={styles.app}>
              <div style={styles.hd}>
                <h3 style={styles.hdTitle}>Tekdüzen Hesap Planı</h3>
                <p style={styles.hdSubtitle}>Sadece 3 haneli hesap kodları girdi alanı içerir.</p>
              </div>

              <div style={styles.content}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.thCode}>Kod</th>
                      <th style={styles.thName}>Hesap Adı</th>
                      {YEARS.map((year) => (
                        <th key={year} style={styles.thValue}>
                          {year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tekduzenRows.map((row, i) =>
                      row.header ? (
                        <tr key={`h${i}`}>
                          <td colSpan={2 + YEARS.length} style={styles.headerRow}>
                            {row.name}
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.code + "-" + i} style={styles.row(row.level)}>
                          <td style={styles.tdCode}>{row.code}</td>
                          <td style={styles.tdName(row.level)}>{row.name}</td>
                          {YEARS.map((year) => (
                            <td key={year} style={styles.tdValue}>
                              {row.level === 3 && (
                                <input
                                  type="text"
                                  value={values[`${row.code}-${year}`] || ""}
                                  onChange={(e) => handleChange(row.code, year, e.target.value)}
                                  onBlur={() => handleBlur(row.code, year)}
                                  style={styles.input}
                                  placeholder="0,00"
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
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
    minHeight: "100vh",
    width: "100%",
  },
  page: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    padding: "0 22px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  app: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: "1180px",
    background: "var(--paper)",
    border: "1px solid var(--rule)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  hd: {
    flexShrink: 0,
    padding: "20px 22px 14px",
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
  content: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "0 22px 22px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    border: "1px solid var(--rule)",
  },
  thCode: {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--ink-2)",
    padding: "9px 12px",
    borderBottom: "1px solid var(--rule)",
    width: "80px",
    position: "sticky",
    top: 0,
    background: "var(--paper)",
  },
  thName: {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--ink-2)",
    padding: "9px 12px",
    borderBottom: "1px solid var(--rule)",
    position: "sticky",
    top: 0,
    background: "var(--paper)",
  },
  thValue: {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--ink-2)",
    padding: "9px 12px",
    borderBottom: "1px solid var(--rule)",
    width: "160px",
    position: "sticky",
    top: 0,
    background: "var(--paper)",
  },
  headerRow: {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#fff",
    background: "var(--ink)",
    padding: "8px 12px",
  },
  row: (level) => ({
    background: level === 1 ? "var(--band, #F3F6FA)" : level === 2 ? "#FAFBFC" : "#fff",
  }),
  tdCode: {
    textAlign: "left",
    fontFamily: "var(--mono, monospace)",
    fontSize: "13px",
    color: "var(--ink-2)",
    padding: "6px 12px",
    borderBottom: "1px solid var(--rule-2, #EEE)",
  },
  tdName: (level) => ({
    textAlign: "left",
    fontSize: "13px",
    fontWeight: level === 1 ? 700 : level === 2 ? 600 : 400,
    color: "var(--ink)",
    padding: "6px 12px",
    borderBottom: "1px solid var(--rule-2, #EEE)",
  }),
  tdValue: {
    textAlign: "left",
    padding: "4px 12px",
    borderBottom: "1px solid var(--rule-2, #EEE)",
  },
  input: {
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    fontSize: "13px",
    border: "1px solid var(--rule, #E1E8F0)",
    borderRadius: "3px",
    padding: "5px 8px",
    boxSizing: "border-box",
  },
};
