import { DEFAULT_FX } from './statements.js';

const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:5192"
  : "https://api.finvestima.com";

function zeroFallback() {
  const out = {};
  for (const y of Object.keys(DEFAULT_FX)) {
    out[y] = { avg: 0, end: 0, source: 'error' };
  }
  return out;
}

// Fetches real USD/TRY year-average and year-end rates from FinvestimaAPI (TCMB-backed).
// On any failure, returns zeroed rows (instead of silently falling back to DEFAULT_FX)
// so a broken connection is visibly obvious rather than looking like real data.
export async function fetchFxSummary() {
  const token = localStorage.getItem("storedToken");
  if (!token) return zeroFallback();

  try {
    const res = await fetch(`${API_URL}/api/ExchangeRate/fx-summary`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return zeroFallback();

    const rows = await res.json();
    const out = {};
    for (const r of rows) {
      out[r.year] = { avg: r.avg, end: r.end, partial: r.partial, source: 'tcmb' };
    }
    return out;
  } catch {
    return zeroFallback();
  }
}
