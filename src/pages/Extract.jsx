import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { JsonView, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import {
  useStartExtractionJobMutation,
  useLazyGetExtractionJobQuery,
} from "../slices/AiSlice";
import { loadPdf, renderPdfPageToCanvas, imageFileToCanvas, analyzeCropSuggestion } from "../lib/pdfPreview";

function canvasToBase64(canvas) {
  return canvas.toDataURL("image/png").split(",")[1];
}

const POLL_INTERVAL_MS = 2000;

const POLL_FLASH_COLORS = {
  Pending: "var(--ink-3)",
  Processing: "var(--teal)",
  Completed: "var(--teal-dk)",
  Failed: "var(--red)",
};

const CROP_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

function needsCropPreview(file) {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return CROP_EXTENSIONS.some((ext) => name.endsWith(ext));
}

const DOCUMENT_TYPES = ["Balance Sheet", "Income Statement"];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

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
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [cropState, setCropState] = useState(null); // { previewImageBase64, topPercent, bottomPercent, leftPercent, rightPercent, pageCount, pagesInput }
  const [documentType, setDocumentType] = useState("");
  const [selectedYears, setSelectedYears] = useState([]);
  const fileInputRef = useRef(null);
  const pollTimeoutRef = useRef(null);
  const flashCounterRef = useRef(0);
  const pdfDocRef = useRef(null); // cached pdf.js document for instant page navigation

  function toggleYear(year) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort((a, b) => b - a)
    );
  }

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
    setCropState(null);
    pdfDocRef.current = null;
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

  async function runExtractionJob(topPercent, bottomPercent, leftPercent, rightPercent, pages) {
    setResult(null);
    setIsProcessing(true);
    setIsSending(true);
    setPollFlash(null);
    const years = selectedYears.length ? [...selectedYears].sort((a, b) => a - b).join(",") : null;
    console.log("[Extract] Starting extraction job for:", file.name, {
      topPercent,
      bottomPercent,
      leftPercent,
      rightPercent,
      pages,
      documentType,
      years,
    });
    try {
      const { jobId } = await startExtractionJob({
        file,
        topPercent,
        bottomPercent,
        leftPercent,
        rightPercent,
        pages,
        documentType,
        years,
      }).unwrap();
      console.log("[Extract] Job created:", jobId);
      pollTimeoutRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS);
    } catch (err) {
      setIsProcessing(false);
      setIsSending(false);
      console.error("[Extract] Failed to start job:", err);
      toast.error(err?.data || "Failed to start analysis.");
    }
  }

  async function handleUploadAndPreview() {
    if (!file || !needsCropPreview(file)) return;

    setIsLoadingPreview(true);
    try {
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      let canvas;
      let pageCount = 1;

      if (isPdf) {
        const pdfDoc = await loadPdf(file);
        pdfDocRef.current = pdfDoc;
        pageCount = pdfDoc.numPages;
        canvas = await renderPdfPageToCanvas(pdfDoc, 1);
      } else {
        pdfDocRef.current = null;
        canvas = await imageFileToCanvas(file);
      }

      const { topPercent, bottomPercent } = analyzeCropSuggestion(canvas);
      setCropState({
        previewImageBase64: canvasToBase64(canvas),
        topPercent,
        bottomPercent,
        leftPercent: 2,
        rightPercent: 2,
        pageCount,
        previewPage: 1,
        pagesInput: "",
      });
    } catch (err) {
      console.error("[Extract] Failed to build crop preview:", err);
      toast.error("Failed to prepare document preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  }

  // Client-side page navigation — pdf.js already has the document loaded, so this is just a
  // local render with no network round trip, unlike the previous server-rendered approach.
  async function handleViewPage(pageNum) {
    if (!pdfDocRef.current) return;
    try {
      const canvas = await renderPdfPageToCanvas(pdfDocRef.current, pageNum);
      setCropState((prev) =>
        prev ? { ...prev, previewImageBase64: canvasToBase64(canvas), previewPage: pageNum } : prev
      );
    } catch (err) {
      console.error("[Extract] Failed to render page:", err);
      toast.error("Failed to load that page.");
    }
  }

  async function handleProcessDocument() {
    if (!file) return;

    // PDFs/images must go through the crop preview first; Excel/CSV skip it entirely and
    // go straight through, exactly as before.
    if (cropState) {
      const { topPercent, bottomPercent, leftPercent, rightPercent, pagesInput } = cropState;
      setCropState(null);
      await runExtractionJob(topPercent, bottomPercent, leftPercent, rightPercent, pagesInput || null);
      return;
    }

    await runExtractionJob(null, null, null, null, null);
  }

  function handleChooseOrClear() {
    if (file) {
      handleRemoveFile();
    } else {
      fileInputRef.current?.click();
    }
  }

  function handleCropChange(patch) {
    setCropState((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleRemoveFile() {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    setFile(null);
    setResult(null);
    setSearchTerm("");
    setIsProcessing(false);
    setIsSending(false);
    setPollFlash(null);
    setCropState(null);
    pdfDocRef.current = null;
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

  const chooseDisabled = !documentType || selectedYears.length === 0;
  const uploadPreviewDisabled = !file || !needsCropPreview(file) || isProcessing || isLoadingPreview || !!cropState;
  const processDisabled = !file || isProcessing || isLoadingPreview || (needsCropPreview(file) && !cropState);

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
          <div style={styles.page}>
            <div style={styles.app}>
              <div style={styles.hd}>
                <h3 style={styles.hdTitle}>Financial Document Extractor</h3>
                <p style={styles.hdSubtitle}>Upload a balance sheet, income statement, or cash flow statement.</p>
              </div>

              <div style={styles.bar}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.xls,.xlsx"
                  onChange={handleFileChange}
                  style={styles.hiddenInput}
                  id="doc-upload"
                />

                <select
                  style={styles.select}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="">Select</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <YearsDropdown years={YEAR_OPTIONS} selected={selectedYears} onToggle={toggleYear} />

                <button type="button" style={styles.btn(chooseDisabled)} onClick={handleChooseOrClear} disabled={chooseDisabled}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                    <FileIcon color={chooseDisabled ? "var(--teal)" : "#fff"} />
                    {file ? "Clear document" : "Choose document"}
                  </span>
                </button>

                <button
                  type="button"
                  style={styles.btn(uploadPreviewDisabled)}
                  onClick={handleUploadAndPreview}
                  disabled={uploadPreviewDisabled}
                >
                  <span style={{ opacity: isLoadingPreview ? 0 : 1, display: "inline-flex", alignItems: "center", gap: "7px" }}>
                    <UploadIcon />
                    Upload and Preview
                  </span>
                  {isLoadingPreview && <span style={styles.spinner} />}
                </button>

                <button
                  type="button"
                  style={styles.btn(processDisabled)}
                  onClick={handleProcessDocument}
                  disabled={processDisabled}
                >
                  <span style={{ opacity: isProcessing ? 0 : 1, display: "inline-flex", alignItems: "center", gap: "7px" }}>
                    <UploadIcon />
                    Process Document
                  </span>
                  {isProcessing && <span style={styles.spinner} />}
                </button>

                {isLoadingPreview && (
                  <span style={{ ...styles.pill, background: "#e67e22", animation: "pill-pulse 1s ease infinite" }}>
                    Preparing preview
                  </span>
                )}
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
              </div>

              <div style={styles.docName}>{file ? file.name : "No document selected"}</div>

              <div style={styles.content}>
              {cropState && (
                <CropConfirmation
                  previewImageBase64={cropState.previewImageBase64}
                  topPercent={cropState.topPercent}
                  bottomPercent={cropState.bottomPercent}
                  leftPercent={cropState.leftPercent}
                  rightPercent={cropState.rightPercent}
                  pageCount={cropState.pageCount}
                  previewPage={cropState.previewPage}
                  isLoadingPreview={isLoadingPreview}
                  onViewPage={handleViewPage}
                  pagesInput={cropState.pagesInput}
                  onChange={handleCropChange}
                />
              )}

              {!cropState && result && viewMode === "json" && (
                <div style={styles.jsonWrap}>
                  <JsonView data={{ statements: filteredStatements }} style={defaultStyles} />
                </div>
              )}

              {!cropState && result && viewMode === "table" && (
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

// Multi-select "dropdown": a button showing the current selection that opens a checkbox list
// on click, closing when clicking elsewhere.
function YearsDropdown({ years, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const label =
    selected.length === 0
      ? "Select years"
      : [...selected]
          .sort((a, b) => a - b)
          .map((y) => `'${String(y).slice(-2)}`)
          .join(", ");

  return (
    <div ref={wrapRef} style={styles.yearsWrap}>
      <button type="button" style={styles.select} onClick={() => setOpen((v) => !v)}>
        {label}
      </button>
      {open && (
        <div style={styles.yearsMenu}>
          {years.map((year) => (
            <label key={year} style={styles.yearsMenuItem}>
              <input type="checkbox" checked={selected.includes(year)} onChange={() => onToggle(year)} />
              {year}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Crop confirmation step: shown for every PDF/image upload, never remembered across uploads.
// Four draggable lines (top/bottom/left/right) mark the bands that will be painted white
// before the document is sent to Gemini, so a printed logo/letterhead is never seen by the
// model. Controlled by the parent (Extract): the parent's main button relabels itself to
// "Process Document" and reads the current percentages when clicked — no buttons live here.
export function CropConfirmation({
  previewImageBase64,
  topPercent,
  bottomPercent,
  leftPercent,
  rightPercent,
  pageCount,
  previewPage,
  isLoadingPreview,
  onViewPage,
  pagesInput,
  onChange,
  title = "Sayfanın kenarlarını kırpmak için çizgilerin yerini ayarlayın.",
  subtitlePrefix = "Sayfa seçimi yapmak istiyorsanız ",
  subtitleCode = "1, 3, 5-7, 10-12",
  subtitleSuffix = " formatında girebilirsiniz.",
  pagesLabel = "Sayfalar",
  pagesTotalLabel = "toplam",
  allPagesLabel = "Tüm sayfalar",
  customLabel = "Özel",
  customPlaceholder = "örn. 1-3, 5",
  midSlot = null,
}) {
  const containerRef = useRef(null);
  const draggingRef = useRef(null); // "top" | "bottom" | "left" | "right" | null
  // Always read the latest values inside the move handler without needing to recreate it —
  // avoids any chance of a stale closure limiting how far a drag can travel.
  const latestRef = useRef({ topPercent, bottomPercent, leftPercent, rightPercent, onChange });
  latestRef.current = { topPercent, bottomPercent, leftPercent, rightPercent, onChange };

  const clamp = (v) => Math.max(0, Math.min(100, v));

  function handlePointerMove(e) {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = ((e.clientY - rect.top) / rect.height) * 100;
    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    const { onChange: change } = latestRef.current;

    switch (draggingRef.current) {
      case "top":
        change({ topPercent: clamp(relativeY) });
        break;
      case "bottom":
        change({ bottomPercent: clamp(100 - relativeY) });
        break;
      case "left":
        change({ leftPercent: clamp(relativeX) });
        break;
      case "right":
        change({ rightPercent: clamp(100 - relativeX) });
        break;
      default:
        break;
    }
  }

  function handlePointerUp(e) {
    draggingRef.current = null;
    e.target.releasePointerCapture?.(e.pointerId);
  }

  function startDrag(which) {
    return (e) => {
      e.preventDefault();
      draggingRef.current = which;
      e.target.setPointerCapture?.(e.pointerId);
    };
  }

  // Keep opposing lines from crossing each other.
  const safeTop = Math.min(topPercent, 98);
  const safeBottomFromTop = Math.max(100 - bottomPercent, safeTop + 1);
  const safeBottomPercent = 100 - safeBottomFromTop;

  const safeLeft = Math.min(leftPercent, 98);
  const safeRightFromLeft = Math.max(100 - rightPercent, safeLeft + 1);
  const safeRightPercent = 100 - safeRightFromLeft;

  const isAllPages = !pagesInput || !pagesInput.trim();

  return (
    <div style={cropStyles.wrap}>
      <div style={cropStyles.header}>
        {title && <h2 style={cropStyles.title}>{title}</h2>}
        <p style={cropStyles.subtitle}>
          {subtitlePrefix}
          <code style={cropStyles.subtitleCode}>{subtitleCode}</code>
          {subtitleSuffix}
        </p>
      </div>

      {pageCount > 1 && (
        <div style={cropStyles.bar}>
          <div style={cropStyles.seg}>
            <button
              type="button"
              style={{ ...cropStyles.opt, ...(isAllPages ? cropStyles.optOn : {}) }}
              onClick={() => onChange({ pagesInput: "" })}
            >
              {allPagesLabel}
            </button>
            <label style={{ ...cropStyles.opt, ...cropStyles.optCust, ...(!isAllPages ? cropStyles.optOn : {}) }}>
              {customLabel}
              <input
                type="text"
                placeholder={customPlaceholder}
                value={isAllPages ? "" : pagesInput}
                onFocus={() => { if (isAllPages) onChange({ pagesInput: "1" }); }}
                onChange={(e) => onChange({ pagesInput: e.target.value })}
                style={cropStyles.optInput}
              />
            </label>
          </div>
          {midSlot && <div style={cropStyles.midSlot}>{midSlot}</div>}
          <div style={cropStyles.pager}>
            <button
              type="button"
              style={{ ...cropStyles.nb, ...((previewPage <= 1 || isLoadingPreview) ? cropStyles.nbDisabled : {}) }}
              onClick={() => onViewPage(previewPage - 1)}
              disabled={previewPage <= 1 || isLoadingPreview}
            >
              ← Önceki
            </button>
            <span style={cropStyles.pg}>
              <b>{previewPage}.</b> sayfa / {pageCount}
            </span>
            <button
              type="button"
              style={{ ...cropStyles.nb, ...((previewPage >= pageCount || isLoadingPreview) ? cropStyles.nbDisabled : {}) }}
              onClick={() => onViewPage(previewPage + 1)}
              disabled={previewPage >= pageCount || isLoadingPreview}
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}

      <div ref={containerRef} style={cropStyles.imageWrap}>
        <img src={`data:image/png;base64,${previewImageBase64}`} alt="Document preview" style={cropStyles.image} draggable={false} />

        {/* Shaded top/bottom bands */}
        <div style={{ ...cropStyles.shade, top: 0, height: `${safeTop}%` }} />
        <div style={{ ...cropStyles.shade, bottom: 0, height: `${safeBottomPercent}%` }} />
        {/* Shaded left/right bands */}
        <div style={{ ...cropStyles.shade, left: 0, right: "auto", top: 0, bottom: 0, width: `${safeLeft}%` }} />
        <div style={{ ...cropStyles.shade, right: 0, left: "auto", top: 0, bottom: 0, width: `${safeRightPercent}%` }} />

        {/* Top drag line */}
        <div
          style={{ ...cropStyles.line, top: `${safeTop}%` }}
          onPointerDown={startDrag("top")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <span style={cropStyles.lineHandle}>Top</span>
        </div>

        {/* Bottom drag line */}
        <div
          style={{ ...cropStyles.line, top: `${100 - safeBottomPercent}%` }}
          onPointerDown={startDrag("bottom")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <span style={cropStyles.lineHandle}>Bottom</span>
        </div>

        {/* Left drag line */}
        <div
          style={{ ...cropStyles.vline, left: `${safeLeft}%` }}
          onPointerDown={startDrag("left")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div style={cropStyles.vlineMark} />
          <span style={cropStyles.vlineHandle}>Left</span>
        </div>

        {/* Right drag line */}
        <div
          style={{ ...cropStyles.vline, left: `${100 - safeRightPercent}%` }}
          onPointerDown={startDrag("right")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div style={cropStyles.vlineMark} />
          <span style={cropStyles.vlineHandle}>Right</span>
        </div>
      </div>
    </div>
  );
}

function FileIcon({ color = "var(--ink-3)" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" style={{ width: 14, height: 14, color, flexShrink: 0 }}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
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

const cropStyles = {
  wrap: {
    padding: "18px 22px 24px",
  },
  header: {
    marginBottom: "14px",
  },
  title: {
    fontSize: "17px",
    fontWeight: 700,
    letterSpacing: "-.01em",
    margin: 0,
    color: "var(--ink)",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "13.5px",
    fontWeight: 500,
    color: "var(--body, var(--ink-2))",
    marginTop: "4px",
    lineHeight: 1.5,
    textAlign: "center",
  },
  subtitleCode: {
    fontFamily: "inherit",
    fontWeight: 600,
    color: "var(--ink)",
    background: "#F1F3F6",
    padding: "1px 6px",
    borderRadius: "5px",
  },
  bar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "14px",
    flexWrap: "wrap",
    width: "806px",
    maxWidth: "100%",
    margin: "0 auto 14px",
  },
  seg: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  opt: {
    boxSizing: "border-box",
    border: "1px solid var(--teal)",
    background: "var(--teal)",
    borderRadius: "5px",
    fontFamily: "inherit",
    fontSize: "12px",
    fontWeight: 500,
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "7px 12px",
    whiteSpace: "nowrap",
  },
  optOn: {
    borderColor: "var(--teal-dk, #225F6B)",
    background: "var(--teal-dk, #225F6B)",
    color: "#fff",
  },
  optCust: {
    padding: "3px 5px 3px 12px",
  },
  optInput: {
    boxSizing: "border-box",
    width: "120px",
    height: "24px",
    lineHeight: "24px",
    border: "none",
    borderRadius: "6px",
    padding: "0 9px",
    margin: 0,
    alignSelf: "center",
    fontSize: "13.5px",
    color: "var(--ink)",
    outline: "none",
    background: "#F1F3F6",
    fontFamily: "inherit",
  },
  midSlot: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
  },
  pager: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
  },
  nb: {
    boxSizing: "border-box",
    border: "1px solid var(--teal)",
    background: "var(--teal)",
    borderRadius: "5px",
    fontFamily: "inherit",
    fontSize: "12px",
    fontWeight: 500,
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    padding: "7px 12px",
  },
  nbDisabled: {
    background: "var(--line, #D9DEE6)",
    borderColor: "var(--line, #D9DEE6)",
    color: "#fff",
    cursor: "not-allowed",
  },
  pg: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--body, var(--ink-2))",
    minWidth: "86px",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  imageWrap: {
    position: "relative",
    display: "block",
    width: "806px",
    margin: "0 auto",
    maxWidth: "100%",
    border: "1px solid var(--rule)",
    borderRadius: "3px",
    overflow: "hidden",
    userSelect: "none",
    touchAction: "none",
  },
  image: {
    display: "block",
    maxWidth: "100%",
    width: "806px",
    height: "auto",
  },
  shade: {
    position: "absolute",
    left: 0,
    right: 0,
    background: "rgba(19, 33, 31, 0.55)",
    pointerEvents: "none",
  },
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "0",
    borderTop: "2px dashed var(--teal)",
    cursor: "ns-resize",
    display: "flex",
    justifyContent: "flex-end",
  },
  lineHandle: {
    background: "var(--teal)",
    color: "#fff",
    fontSize: "10.5px",
    fontWeight: 700,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    padding: "2px 7px",
    borderRadius: "0 0 3px 3px",
    transform: "translateY(0)",
    marginRight: "10px",
  },
  vline: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "16px",
    marginLeft: "-8px",
    cursor: "ew-resize",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  vlineMark: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: "0",
    borderLeft: "2px dashed var(--gold, #B68734)",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  },
  vlineHandle: {
    background: "var(--gold, #B68734)",
    color: "#fff",
    fontSize: "10.5px",
    fontWeight: 700,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    padding: "7px 2px",
    borderRadius: "3px",
    marginBottom: "10px",
    writingMode: "vertical-rl",
    pointerEvents: "none",
  },
};

const styles = {
  pageWrap: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    overflow: "hidden",
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
    display: "flex",
    alignItems: "baseline",
    gap: "12px",
    flexWrap: "wrap",
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
    margin: 0,
  },
  bar: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 22px 0",
    flexWrap: "wrap",
  },
  hiddenInput: {
    display: "none",
  },
  select: {
    fontFamily: "inherit",
    fontSize: "13px",
    color: "var(--ink)",
    background: "#fff",
    border: "1px solid var(--rule, #E1E8F0)",
    borderRadius: "3px",
    padding: "9px 12px",
    width: "170px",
    cursor: "pointer",
    textAlign: "left",
  },
  yearsWrap: {
    position: "relative",
    display: "inline-block",
  },
  yearsMenu: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    zIndex: 20,
    background: "#fff",
    border: "1px solid var(--rule, #E1E8F0)",
    borderRadius: "3px",
    boxShadow: "0 8px 20px rgba(0,0,0,.1)",
    padding: "6px",
    minWidth: "170px",
  },
  yearsMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "var(--ink)",
    padding: "6px 8px",
    borderRadius: "3px",
    cursor: "pointer",
  },
  docName: {
    margin: "6px 0 12px 22px",
    fontSize: "12.5px",
    color: "var(--ink-3)",
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
  btn: (disabled) => ({
    position: "relative",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    width: "180px",
    flexShrink: 0,
    whiteSpace: "nowrap",
    border: "1px solid var(--teal)",
    background: disabled ? "#fff" : "var(--teal)",
    color: disabled ? "var(--teal)" : "#fff",
    fontSize: "13px",
    fontWeight: 600,
    padding: "9px 16px",
    borderRadius: "3px",
    cursor: disabled ? "not-allowed" : "pointer",
  }),
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
