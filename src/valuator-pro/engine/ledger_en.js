import { nature } from './accounts.js';

// Ledger (bir dönemin mizanı):
// { id, year, months, label, source, company, acc: {code3: {code,name,dt,ct,db,cb}}, sub: [satırlar], totals, closed, notes[] }

export const normCode = c => String(c ?? '').trim().replace(/[\s.\-_/]+/g, ' ').replace(/\s+/g, ' ');
export const digits = c => String(c ?? '').replace(/\D/g, '');

export function trNum(v){
  if (v===null || v===undefined || v==='') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).trim();
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1,-1); }
  s = s.replace(/[^\d,.-]/g,'');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,'');
  } else if (s.includes(',')) s = s.replace(/\./g,'').replace(',','.');
  else if ((s.match(/\./g)||[]).length>1) s = s.replace(/\./g,'');
  const n = parseFloat(s);
  return isFinite(n) ? (neg?-n:n) : 0;
}

export const upTR = s => String(s||'').toLocaleUpperCase('tr-TR');
export const fold = s => upTR(s).replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ö/g,'O').replace(/Ç/g,'C').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

// rows: [{code,name,dt,ct,db,cb}] — kodlar ham halde (alt hesaplar dahil)
// GAAP: backend (GaapAccountGrouper) her satırı zaten kendi gölge koduna göre gruplamış halde
// gönderiyor — burada 3 haneye küçültüp başka koda birleştirmiyoruz, her gölge kod kendi satırı
// olarak kalıyor ve orijinal hesaplar (sources) UI'da aggregation yapmadan gösterilebilsin diye
// taşınıyor.
export function buildLedger(rows, meta = {}){
  const acc = {}, sub = [];
  const clean = rows.map(r => ({...r, code: normCode(r.code), d: digits(r.code)})).filter(r => r.d.length >= 3 && /^[1-9]/.test(r.d));
  for (const r of clean){
    acc[r.d] = { code:r.d, name:r.name||r.d, dt:+r.dt||0, ct:+r.ct||0, db:+r.db||0, cb:+r.cb||0, isManualOverride:!!r.isManualOverride, sources:r.sources||null };
    if (/^[67]/.test(r.d)) sub.push(r);
  }
  let dt=0, ct=0;
  for (const k in acc){ dt+=acc[k].dt; ct+=acc[k].ct; }
  // Kapanış: gelir tablosu hesaplarında bakiye kalmamış ve hareket var
  let isMove=0, isBal=0;
  for (const k in acc) if (k[0]==='6' && !['690','692'].includes(k)){ isMove += acc[k].dt+acc[k].ct; isBal += Math.abs(acc[k].db-acc[k].cb); }
  const closed = isMove>0 && isBal < isMove*0.001;
  return { id: meta.id || ('L'+Math.random().toString(36).slice(2,8)), year: meta.year, months: meta.months||12,
    label: meta.label||'', source: meta.source||'mizan', fileName: meta.fileName||'', company: meta.company||'',
    acc, sub, totals:{dt,ct, fileDt: meta.fileDt, fileCt: meta.fileCt}, closed, notes: meta.notes||[] };
}

// Bakiye hep Borç-Alacak (dt-ct) farkından hesaplanır, ayrı db/cb (bakiye) alanından değil —
// o alan kaynakta (Gemini ekstraksiyonunda) tutarsız gelebiliyor, dt/ct güvenilir.
export const bal = (L, code) => { const a=L.acc[String(code)]; return a ? (a.dt - a.ct) : 0; };

export function sumBal(L, from, to, ex = []){
  let s=0;
  for (const k in L.acc){ const c=+k; if (c>=from && c<=to && !ex.includes(c)) s += L.acc[k].dt - L.acc[k].ct; }
  return s;
}

// Akış (gelir tablosu) tutarı — doğal yönde pozitif
export function flow(L, code){
  const a = L.acc[String(code)]; if (!a) return 0;
  const n = nature(code), net = a.db - a.cb;
  if (Math.abs(net) > 0.5) return n==='C' ? -net : net;
  return n==='C' ? a.ct : a.dt;
}
export const sumFlow = (L, codes) => codes.reduce((s,c)=> s+flow(L,c), 0);
export const range = (a,b) => Array.from({length:b-a+1},(_,i)=>a+i);

// Alt hesaplardan amortisman (730/760/770 … "AMORTİSMAN" isimli en üst seviye)
export function depreciationFromSub(L){
  const cand = L.sub.filter(r => /AMORT/.test(fold(r.name)) && !/YANSITMA/.test(fold(r.name)) && /^7[0-8]0|^6[2-3]/.test(r.d))
    .sort((a,b)=> a.d.length-b.d.length);
  const kept = [];
  for (const r of cand) if (!kept.some(k => r.d.startsWith(k.d))) kept.push(r);
  if (!kept.length) return null;
  const val = r => { const net=(+r.db||0)-(+r.cb||0); return Math.abs(net)>0.5 ? net : (+r.dt||0); };
  const by = {cogs:0, psd:0, ga:0, rnd:0, other:0};
  for (const r of kept){
    const p = r.d.slice(0,2);
    if (p==='73'||p==='72'||p==='71'||p==='74'||p==='62') by.cogs += val(r);
    else if (p==='76') by.psd += val(r);
    else if (p==='77') by.ga += val(r);
    else if (p==='75') by.rnd += val(r);
    else by.other += val(r);
  }
  const total = by.cogs+by.psd+by.ga+by.rnd+by.other;
  return { total, by, rows: kept };
}

// Gider alt hesapları (katkı seviyeleri sınıflandırması için): 710–770 altındaki en açıklayıcı seviye
export function costSubAccounts(L){
  const out = [];
  const val = r => { const net=(+r.db||0)-(+r.cb||0); return Math.abs(net)>0.5 ? net : (+r.dt||0); };
  const sub = L.sub.filter(r => /^7[1-7]0/.test(r.d) && !/YANSITMA/.test(fold(r.name)));
  const groups = {};
  for (const r of sub){ (groups[r.d.slice(0,3)] ||= []).push(r); }
  for (const g of Object.keys(groups).sort()){
    const rows = groups[g], parent = flow(L,g) || rows.reduce((m,r)=>Math.max(m,val(r)),0);
    const lens = [...new Set(rows.map(r=>r.d.length))].sort((a,b)=>a-b);
    // En sığ ama açıklayıcı seviye: en az 2 satır, toplamı ana hesabı karşılıyor
    let pick = null;
    for (const ln of lens){
      const lvl = rows.filter(r=>r.d.length===ln);
      const cov = lvl.reduce((s,r)=>s+val(r),0);
      const ok = parent>0 && Math.abs(cov-parent)/parent < 0.02;
      if (ok && lvl.length>=2 && lvl.length<=30){ pick = lvl; break; }
      if (ok && !pick) pick = lvl;
    }
    if (!pick) pick = rows.filter(r=>r.d.length===lens[0]);
    pick.forEach(r=>out.push({parent:g, code:r.code, d:r.d, name:r.name, v:val(r)}));
  }
  return out;
}
