import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const TARGET_WIDTH = 900;
const SCAN_ZONE_FRACTION = 0.25;
const BLANK_ROW_THRESHOLD = 250;
const DEFAULT_SUGGESTED_PERCENT = 8;

export async function loadPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return doc;
}

// Renders the given 1-based page to an offscreen canvas and returns both a data URL
// (for display) and the canvas's 2D context (for the crop-suggestion heuristic below) —
// entirely client-side, no network round trip.
export async function renderPdfPageToCanvas(pdfDoc, pageNumber, targetWidth = TARGET_WIDTH) {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export function imageFileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Mirrors the backend's whitespace-gap heuristic (LogoRedactionHelper.cs) so the initial
// suggested crop bands work identically whether computed server-side or here.
export function analyzeCropSuggestion(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  const rowLuma = new Float64Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = rowStart + x * 4;
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    rowLuma[y] = sum / width;
  }

  return {
    topPercent: findTopGapPercent(rowLuma, height),
    bottomPercent: findBottomGapPercent(rowLuma, height),
  };
}

function findTopGapPercent(rowLuma, height) {
  const zoneEnd = Math.max(1, Math.floor(height * SCAN_ZONE_FRACTION));
  let inGap = false;
  let gapStart = -1;
  let bestGapEnd = -1;
  let bestGapLen = 0;

  for (let y = 0; y < zoneEnd; y++) {
    const isBlank = rowLuma[y] >= BLANK_ROW_THRESHOLD;
    if (isBlank && !inGap) {
      inGap = true;
      gapStart = y;
    } else if (!isBlank && inGap) {
      inGap = false;
      const gapLen = y - gapStart;
      if (gapStart > 0 && gapLen > bestGapLen) {
        bestGapLen = gapLen;
        bestGapEnd = y;
      }
    }
  }

  if (bestGapEnd <= 0) return DEFAULT_SUGGESTED_PERCENT;
  return Math.min(Math.max((bestGapEnd / height) * 100, 1), SCAN_ZONE_FRACTION * 100);
}

function findBottomGapPercent(rowLuma, height) {
  const zoneStart = Math.max(0, height - Math.floor(height * SCAN_ZONE_FRACTION));
  let inGap = false;
  let gapStart = -1;
  let bestGapStartFromBottom = -1;
  let bestGapLen = 0;

  for (let y = height - 1; y >= zoneStart; y--) {
    const isBlank = rowLuma[y] >= BLANK_ROW_THRESHOLD;
    if (isBlank && !inGap) {
      inGap = true;
      gapStart = y;
    } else if (!isBlank && inGap) {
      inGap = false;
      const gapLen = gapStart - y;
      if (gapStart < height - 1 && gapLen > bestGapLen) {
        bestGapLen = gapLen;
        bestGapStartFromBottom = height - 1 - y;
      }
    }
  }

  if (bestGapStartFromBottom <= 0) return DEFAULT_SUGGESTED_PERCENT;
  return Math.min(Math.max((bestGapStartFromBottom / height) * 100, 1), SCAN_ZONE_FRACTION * 100);
}
