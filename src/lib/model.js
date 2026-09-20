/* ============================================================
   Valuator hesaplama motoru — saf fonksiyon, React'ten bağımsız.
   Başka bir ortama taşınırken taşınması gereken tek mantık budur.
   ============================================================ */

/* Sabitler — örnek vaka tabanı (anonim endüstriyel üretim şirketi) */
export const B = {
  y0rev: 18046,
  ebitdaRaw: 2831,
  dep0: 892.2,
  netDebt: 2472,
  netAssets: 5833,
  nwcPrev: 5431,
  opexRatio: 0.045,
  interest: [384.9, 307.9, 246.3, 197.1, 157.6],
  path: [0.167, 0.185, 0.198, 0.211, 0.224],
  mix: { mat: 0.7614, lab: 0.0736, ovh: 0.165 },
};

export const HIST = [
  { yr: "Y-3", rev: 13402, gm: 0.255, ebitda: 2798 },
  { yr: "Y-2", rev: 13185, gm: 0.21, ebitda: 2041 },
  { yr: "Y-1", rev: 15709, gm: 0.208, ebitda: 2521 },
];

export const DEFAULT_ASSUMPTIONS = {
  growth: 0.11, expansion: 5.7, capexPct: 0.055, nwcPct: 0.3,
  wacc: 0.125, tg: 0.03, mult: 8.2, taxRate: 0.25,
  depNew: true, sameK: true, mode: "fix", w1: 0.5, w2: 0.4, w3: 0.1,
};

export const ebitdaY0 = (addbacks) =>
  B.ebitdaRaw + addbacks.reduce((a, x) => a + (x.on ? x.v : 0), 0);

export const marginY0 = (a, addbacks) =>
  (ebitdaY0(addbacks) / B.y0rev) * (a.sameK ? 1 : 1.036);

/** Beş yıllık projeksiyon ve üç mercek değerini hesaplar. */
export function compute(base, addbacks, overrides = {}) {
  const p = { ...base, ...overrides };
  const m0 = marginY0(p, addbacks);
  const y = [];
  let rev = B.y0rev, prevNwc = B.nwcPrev, run = 0;

  for (let t = 0; t < 5; t++) {
    if (t) rev *= 1 + p.growth;
    const margin = m0 + (B.path[t] - 0.167) * (p.expansion / 5.7);
    const ebitda = rev * margin;
    const gross = rev * (margin + B.opexRatio);
    const cogs = rev - gross;
    const dep = p.depNew ? B.dep0 + run / 10 : B.dep0;
    const capex = rev * p.capexPct;
    const nwc = rev * p.nwcPct;
    y.push({
      yr: t ? `Y+${t}` : "Y0", rev, margin, ebitda, gross, opex: gross - ebitda, cogs,
      mat: cogs * B.mix.mat, lab: cogs * B.mix.lab, ovh: cogs * B.mix.ovh,
      dep, capex, nwc, dnwc: nwc - prevNwc, int: B.interest[t],
      depShown: 0, dnwcShown: 0, ebit: 0, taxAmt: 0, noplat: 0, fcf: 0, proj: true,
    });
    prevNwc = nwc; run += capex;
  }

  /* Ham model: NİS değişimi bir yıl kaymış + amortisman sabit (L7 bulgu 01 ve 03) */
  const dn = y.map((r) => r.dnwc);
  y.forEach((r, t) => {
    const uD = p.mode === "raw" ? (t < 4 ? dn[t + 1] : 0) : r.dnwc;
    const uP = p.mode === "raw" ? B.dep0 : r.dep;
    r.depShown = uP;
    r.dnwcShown = uD;
    r.ebit = r.ebitda - uP;
    r.taxAmt = Math.max(0, r.ebit - r.int) * p.taxRate;
    r.noplat = r.ebit - r.taxAmt;
    r.fcf = r.noplat + uP - r.capex - uD - r.int;
  });

  const npv = y.reduce((a, r, t) => a + r.fcf / Math.pow(1 + p.wacc, t + 1), 0);
  const tv = y[4].fcf / (p.wacc - p.tg) / Math.pow(1 + p.wacc, 5);
  const ev = p.mult * ebitdaY0(addbacks);
  return { y, npv, tv, v1: npv + tv, ev, v2: ev - B.netDebt, v3: B.netAssets };
}

/** Geçmiş yılı projeksiyon satırıyla aynı şekle getirir. */
export function histRow(h) {
  const gross = h.rev * h.gm;
  const cogs = h.rev - gross;
  const ebit = h.ebitda - B.dep0;
  const int = 420;
  return {
    yr: h.yr, rev: h.rev, gross, cogs, ebitda: h.ebitda, margin: h.ebitda / h.rev,
    opex: gross - h.ebitda, mat: cogs * B.mix.mat, lab: cogs * B.mix.lab, ovh: cogs * B.mix.ovh,
    dep: B.dep0, capex: 0, nwc: 0, dnwc: 0, int, depShown: B.dep0, dnwcShown: 0,
    ebit, taxAmt: Math.max(0, ebit - int) * 0.25, noplat: 0, fcf: 0, proj: false,
  };
}

/** Bir varsayımın değere duyarlılığı (küçük bir artışın yarattığı yüzde değişim). */
export function sensitivity(key, step, base, addbacks) {
  const v0 = compute(base, addbacks).v1;
  const v1 = compute(base, addbacks, { [key]: base[key] + step }).v1;
  return (v1 - v0) / v0;
}

export const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0;
};
