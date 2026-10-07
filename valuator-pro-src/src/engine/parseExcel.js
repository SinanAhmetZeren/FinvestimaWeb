import * as XLSX from 'xlsx';
import { buildLedger, trNum, fold, digits } from './ledger.js';

// Bir çalışma kitabındaki her sayfayı inceler: mizan, aylık rapor ya da kur tablosu.
export async function parseWorkbookFile(file){
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:'array', cellDates:false });
  const out = { mizans:[], monthly:[], fx:null, skipped:[], fileName:file.name };
  for (const sn of wb.SheetNames){
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header:1, raw:true, defval:null, blankrows:false });
    if (!aoa.length) continue;
    const kind = detect(aoa);
    try{
      if (kind==='mizan'){ const L = parseMizan(aoa, file.name, sn); if (L) out.mizans.push(L); }
      else if (kind==='monthly'){ out.monthly.push(...parseMonthly(aoa, sn)); }
      else if (kind==='fx'){ out.fx = mergeFx(out.fx, parseFx(aoa)); }
      else out.skipped.push(sn);
    }catch(e){ out.skipped.push(sn+' ('+e.message+')'); }
  }
  return out;
}

const cellF = v => fold(v==null?'':String(v));

function findHeader(aoa, test, maxRows=40){
  for (let i=0;i<Math.min(maxRows,aoa.length);i++){
    const row = (aoa[i]||[]).map(cellF);
    if (test(row)) return { i, row };
  }
  return null;
}

function detect(aoa){
  if (findHeader(aoa, r => r.some(c=>/KOD/.test(c)&&!/UZUNLUK/.test(c)) && r.some(c=>/BORC/.test(c)) && r.some(c=>/ALACAK/.test(c)))) return 'mizan';
  if (findHeader(aoa, r => r.some(c=>c==='YIL') && r.some(c=>c==='AY'||c==='AY NO') && r.some(c=>/CIRO|SATIS/.test(c)))) return 'monthly';
  if (findHeader(aoa, r => r.some(c=>/USD/.test(c)&&/(TRY|TL)/.test(c)) && r.some(c=>/DONEM|YIL/.test(c)))) return 'fx';
  return null;
}

export function parseMizan(aoa, fileName='', sheetName=''){
  const h = findHeader(aoa, r => r.some(c=>/KOD/.test(c)&&!/UZUNLUK/.test(c)) && r.some(c=>/BORC/.test(c)));
  const R = h.row, idx = f => R.findIndex(f);
  const col = {
    code: idx(c=>/KOD/.test(c) && !/UZUNLUK/.test(c)),
    name: idx(c=>/(ISIM|ISM|ADI|ACIKLAMA|UNVAN|TANIM)/.test(c) && !/KOD|UZUNLUK/.test(c)),
    dt: idx(c=>/BORC/.test(c) && /(TOPLAM|TUTAR|HAREKET)/.test(c) && !/BAKIYE/.test(c)),
    ct: idx(c=>/ALACAK/.test(c) && /(TOPLAM|TUTAR|HAREKET)/.test(c) && !/BAKIYE/.test(c)),
    db: idx(c=>/BORC/.test(c) && /BAKIYE/.test(c)),
    cb: idx(c=>/ALACAK/.test(c) && /BAKIYE/.test(c)),
    bal: idx(c=>/^(NET )?BAKIYE$/.test(c)),
    ba: idx(c=>/^(B ?A|B A|BORC ALACAK)$/.test(c)),
  };
  if (col.dt<0) col.dt = idx(c=>c==='BORC');
  if (col.ct<0) col.ct = idx(c=>c==='ALACAK');
  if (col.name<0) col.name = col.code+1;
  if (col.code<0) throw new Error('Hesap kodu kolonu bulunamadı');

  // Başlık: dönem ve şirket
  let title = '';
  for (let i=0;i<h.i;i++) title += ' '+(aoa[i]||[]).filter(Boolean).join(' ');
  const dr = title.match(/(\d{2})[./](\d{2})[./](\d{4})\s*[-–]\s*(\d{2})[./](\d{2})[./](\d{4})/);
  let year=null, months=12, label='';
  if (dr){ year=+dr[6]; months = (+dr[6]-+dr[3])*12 + (+dr[5]) - (+dr[2]) + 1; label = dr[0]; }
  if (!year){ const m = (sheetName+' '+fileName+' '+title).match(/20\d{2}/); if (m) year=+m[0]; }
  let comp = '';
  for (let i=0;i<h.i && !comp;i++) for (const c of (aoa[i]||[])){
    const t = String(c??'').trim();
    if (/(A\.?\s?Ş\.?|\bAŞ\b|LTD|ŞTİ|ANONİM|LİMİTED)/i.test(t) && !/M[İI]ZAN/i.test(t)){ comp = t.replace(/\s*20\d{2}\s*$/,'').trim(); break; }
  }

  const rows=[]; let fileDt, fileCt;
  for (let i=h.i+1;i<aoa.length;i++){
    const r = aoa[i]||[];
    const codeRaw = r[col.code];
    const cf = cellF(codeRaw);
    if (/TOPLAM|GENEL/.test(cf)){ fileDt = trNum(r[col.dt]); fileCt = trNum(r[col.ct]); continue; }
    if (!digits(codeRaw) || !/^\s*\d/.test(String(codeRaw))) continue;
    let dt = col.dt>=0 ? trNum(r[col.dt]) : 0, ct = col.ct>=0 ? trNum(r[col.ct]) : 0;
    let db = col.db>=0 ? trNum(r[col.db]) : null, cb = col.cb>=0 ? trNum(r[col.cb]) : null;
    if (db===null || cb===null){
      if (col.bal>=0){
        const b = trNum(r[col.bal]); const ba = col.ba>=0 ? cellF(r[col.ba]) : '';
        if (ba==='A') { db=0; cb=Math.abs(b); } else if (ba==='B') { db=Math.abs(b); cb=0; }
        else { db = b>0?b:0; cb = b<0?-b:0; }
      } else { const n=dt-ct; db=n>0?n:0; cb=n<0?-n:0; }
    }
    rows.push({ code:String(codeRaw).trim(), name:String(r[col.name]??'').trim(), dt, ct, db, cb });
  }
  if (!rows.length) return null;
  return buildLedger(rows, { year, months, label: label || sheetName, source:'mizan', fileName: fileName + (sheetName?(' › '+sheetName):''), company: comp.trim(), fileDt, fileCt });
}

function parseMonthly(aoa, sheetName){
  const h = findHeader(aoa, r => r.some(c=>c==='YIL') && r.some(c=>c==='AY'||c==='AY NO'));
  const R = h.row;
  const find = (...tests) => { for (const t of tests){ const i=R.findIndex(t); if (i>=0) return i; } return -1; };
  const c = {
    y: R.findIndex(x=>x==='YIL'),
    m: R.findIndex(x=>x==='AY'||x==='AY NO'),
    rev: find(x=>/CIRO/.test(x)&&/TL/.test(x)&&/TOPLAM/.test(x), x=>/CIRO/.test(x)&&/TL/.test(x)&&!/ R$| U$/.test(x), x=>/CIRO|NET SATIS/.test(x)&&!/USD/.test(x)),
    revUsd: find(x=>/CIRO|SATIS/.test(x)&&/USD/.test(x)),
    mat: find(x=>/(HAMMADDE|MALZEME)/.test(x)&&/(MALZEME|TOPLAM)/.test(x)&&!/CIRO/.test(x)&&!/KONTROL/.test(x), x=>/(HAMMADDE|MALZEME)/.test(x)&&!/CIRO/.test(x)),
    opex: find(x=>/OPEX|GENEL GIDER|MASRAF/.test(x)&&/TOPLAM/.test(x), x=>/OPEX|GENEL GIDER|MASRAF/.test(x)),
  };
  const out=[];
  for (let i=h.i+1;i<aoa.length;i++){
    const r=aoa[i]||[]; const y=trNum(r[c.y]), m=trNum(r[c.m]);
    if (!(y>1990&&y<2100&&m>=1&&m<=12)) continue;
    out.push({ y, m, rev: c.rev>=0?trNum(r[c.rev]):0, revUsd: c.revUsd>=0?trNum(r[c.revUsd]):0,
      mat: c.mat>=0?trNum(r[c.mat]):0, opex: c.opex>=0?trNum(r[c.opex]):0, sheet: sheetName });
  }
  return out;
}

function parseFx(aoa){
  const fx = {};
  // Aylık ortalamalar
  const h = findHeader(aoa, r => r.some(c=>c==='YIL') && r.some(c=>c==='AY') && r.some(c=>/USD/.test(c)));
  if (h){
    const R=h.row, cy=R.indexOf('YIL'), cm=R.indexOf('AY'), cv=R.findIndex(c=>/USD/.test(c)&&/ORTALAMA|TRY/.test(c));
    const acc = {};
    for (let i=h.i+1;i<aoa.length;i++){ const r=aoa[i]||[]; const y=trNum(r[cy]), m=trNum(r[cm]), v=trNum(r[cv]);
      if (y>1990 && m>=1 && m<=12 && v>0) (acc[y] ||= []).push({m,v}); }
    for (const y in acc){ const a=acc[y]; fx[y] = { avg: a.reduce((s,x)=>s+x.v,0)/a.length, end: a.sort((p,q)=>q.m-p.m)[0].v, monthly: Object.fromEntries(a.map(x=>[x.m,x.v])), months:a.length }; }
  }
  // "Dönem Sonu" özet tablosu varsa yıl sonu kurunu ondan al
  for (let i=0;i<Math.min(60,aoa.length);i++){
    const r=(aoa[i]||[]).map(cellF); const ce=r.findIndex(c=>/DONEM SONU/.test(c));
    if (ce<0) continue; let cy=-1; r.forEach((c,j)=>{ if (c==='YIL' && j<ce) cy=j; });
    if (cy<0) continue;
    for (let k=i+1;k<aoa.length;k++){ const rr=aoa[k]||[]; const y=trNum(rr[cy]), v=trNum(rr[ce]); if (!(y>1990&&y<2100&&v>0)) { if (rr[cy]==null) break; else continue; }
      fx[y] = { ...(fx[y]||{}), end:v }; }
    break;
  }
  return fx;
}
function mergeFx(a,b){ if(!a) return b; const o={...a}; for (const y in b) o[y]={...(o[y]||{}),...b[y]}; return o; }
