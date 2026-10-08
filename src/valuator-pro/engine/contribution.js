import { costSubAccounts, fold } from './ledger.js';

export const LEVELS = {
  B: 'Değişken direkt',
  C: 'Sabit direkt',
  D: 'Endirekt değişken (saha)',
  E: 'Endirekt sabit (saha)',
  F: 'Merkezi endirekt, SG&A, finansman, amortisman',
};

export function classify(row){
  const n = fold(row.name), p = row.parent;
  if (/AMORT/.test(n)) return 'F';
  if (p==='710') return 'B';
  if (p==='720') return 'C';
  if (p==='760' || p==='770' || p==='780' || p==='750') return 'F';
  if (/FASON|SARF|KLISE|NAVLUN|ITHALAT|ENERJI|ELEKTRIK|DOGALGAZ|AMBALAJ/.test(n)) return 'B';
  if (/DIREK|MAK.*BAKIM|TEMIZLIK|GUVENLIK/.test(n)) return 'C';
  if (/YEMEK|TASIMA|SERVIS|SU GIDER|NAKLIYE/.test(n)) return 'D';
  return 'E';
}

export function contribution(h, overrides = {}){
  const base = costSubAccounts(h.L);
  const prod = base.filter(r=>/^7[1-3]/.test(r.d)).reduce((s,r)=>s+r.v,0);
  const gap = h.is.cogs - prod;
  // 62x SMM ile 7/A üretim maliyetleri arasındaki fark (ticari mal maliyeti, stok değişimi)
  if (base.length && Math.abs(gap) > 0.005*(h.is.netSales||1)) base.unshift({ parent:'62x', code:'62x − 7/A', d:'GAP', name:'Ticari mal maliyeti ve stok değişimi (62x ile 7/A farkı)', v:gap });
  const rows = base.map(r => ({ ...r, cls: overrides[r.d] || (r.d==='GAP' ? 'B' : classify(r)), auto: !overrides[r.d] }));
  const A = h.is.netSales;
  const sum = k => rows.filter(r=>r.cls===k).reduce((s,r)=>s+r.v,0);
  const B=sum('B'), C=sum('C'), D=sum('D'), E=sum('E'), Fv=sum('F');
  return { rows, A, B, C, D, E, F:Fv, k1:A-B, k2:A-B-C, k3:A-B-C-D-E, k4:A-B-C-D-E-Fv, total:B+C+D+E+Fv };
}
