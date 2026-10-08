import { ACCOUNTS, nature } from './accounts.js';
import { buildLedger, fold, trNum } from './ledger.js';

let pdfjsPromise = null;
async function loadPdfjs(){
  if (!pdfjsPromise){
    pdfjsPromise = (async () => {
      // Ayrıştırma ana iş parçacığında yapılır: ayrı worker dosyası gerektirmez, her barındırmada çalışır.
      const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
      window.pdfjsWorker = worker;
      return await import('pdfjs-dist/legacy/build/pdf.min.mjs');
    })();
  }
  return pdfjsPromise;
}

// PDF → satırlar (aynı y koordinatındaki metin parçaları birleştirilir)
export async function pdfToLines(file){
  const lib = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await lib.getDocument({ data, isEvalSupported:false, useSystemFonts:true }).promise;
  const lines = [];
  for (let p=1;p<=doc.numPages;p++){
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows = [];
    for (const it of tc.items){
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let row = rows.find(r => Math.abs(r.y - y) < 2.5);
      if (!row){ row = { y, items:[] }; rows.push(row); }
      row.items.push({ x, s: it.str });
    }
    rows.sort((a,b)=> b.y - a.y);
    for (const r of rows){ r.items.sort((a,b)=>a.x-b.x); lines.push({ page:p, text: r.items.map(i=>i.s).join(' ').replace(/\s+/g,' ').trim() }); }
  }
  return { lines, pages: doc.numPages };
}

const NUM_RE = /\(?-?\d{1,3}(?:\.\d{3})*,\d{2}\)?|\(?-?\d+,\d{2}\)?/g;

const SECTIONS = [
  [/DONEN VARLIKLAR/,1],[/DURAN VARLIKLAR/,2],[/KISA VADELI YABANCI KAYNAK/,3],[/UZUN VADELI YABANCI KAYNAK/,4],
  [/OZ ?KAYNAKLAR|OZSERMAYE/,5],[/GELIR TABLOSU|BRUT SATISLAR/,6]
];
const SUBS = {
  1:[[/HAZIR DEGERLER/,10],[/MENKUL KIYMETLER/,11],[/TICARI ALACAKLAR/,12],[/DIGER ALACAKLAR/,13],[/STOKLAR/,15],[/YILLARA YAYGIN/,17],[/GELECEK AYLARA AIT GIDER/,18],[/DIGER DONEN VARLIK/,19]],
  2:[[/TICARI ALACAKLAR/,22],[/DIGER ALACAKLAR/,23],[/MALI DURAN VARLIK/,24],[/MADDI OLMAYAN DURAN/,26],[/MADDI DURAN VARLIK/,25],[/OZEL TUKENME/,27],[/GELECEK YILLARA AIT GIDER/,28],[/DIGER DURAN VARLIK/,29]],
  3:[[/MALI BORCLAR/,30],[/TICARI BORCLAR/,32],[/DIGER BORCLAR/,33],[/ALINAN AVANSLAR/,34],[/YILLARA YAYGIN/,35],[/ODENECEK VERGI/,36],[/BORC VE GIDER KARSILIK/,37],[/GELECEK AYLARA AIT GELIR/,38],[/DIGER KISA VADELI/,39]],
  4:[[/MALI BORCLAR/,40],[/TICARI BORCLAR/,42],[/DIGER BORCLAR/,43],[/ALINAN AVANSLAR/,44],[/BORC VE GIDER KARSILIK/,47],[/GELECEK YILLARA AIT GELIR/,48],[/DIGER UZUN VADELI/,49]],
  5:[[/ODENMIS SERMAYE/,50],[/SERMAYE YEDEKLERI/,52],[/KAR YEDEKLERI/,54],[/GECMIS YILLAR KARLARI/,57],[/GECMIS YILLAR ZARARLARI/,58],[/DONEM NET KARI|DONEM NET ZARARI/,59]],
  6:[[/BRUT SATISLAR/,60],[/SATIS INDIRIMLERI/,61],[/SATISLARIN MALIYETI/,62],[/FAALIYET GIDERLERI/,63],[/OLAGANDISI GELIR/,67],[/OLAGANDISI GIDER/,68],[/OLAGAN GELIR/,64],[/OLAGAN GIDER/,65],[/FINANSMAN GIDERLERI/,66],[/VERGI VE DIGER YASAL/,69]],
};
const SINGLE = {57:570, 58:580};

const tok = s => fold(s).replace(/\b(UV|MODV|VE|ILE|HS|HESABI|HESAPLARI)\b/g,' ').split(' ').filter(w=>w.length>1);
function score(a,b){
  const A=new Set(tok(a)), B=new Set(tok(b)); if(!A.size||!B.size) return 0;
  let i=0; A.forEach(w=>{ if (B.has(w)) i++; else if ([...B].some(v=>v.startsWith(w.slice(0,5))||w.startsWith(v.slice(0,5)))) i+=0.7; });
  return i/Math.max(A.size,B.size);
}

export function parseStatementLines(lines, opts = {}){
  const order = opts.order || 'prevCur'; // sütun sırası: önceki → cari (GİB eki varsayılanı)
  let cls = 0, tens = 0;
  const out = [], totals = {};
  const allText = lines.slice(0,200).map(l=>l.text).join(' ');
  let year = opts.year;
  if (!year){
    const m = allText.match(/(?:D[öo]nem[i]?|Y[ıi]l[ıi]|Hesap D[öo]nemi)\D{0,25}(20\d{2})/i);
    if (m) year = +m[1];
    else { const cnt={}; (allText.match(/20\d{2}/g)||[]).forEach(y=>cnt[y]=(cnt[y]||0)+1); year = +Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0] || null; }
  }
  let company = '';
  const um = allText.match(/Unvan[ıi]\s*:?\s*([^:]{3,80}?(A\.\s?Ş\.?|LTD\.?\s?ŞT[İI]\.?|ANON[İI]M Ş[İI]RKET[İI]))/i);
  if (um) company = um[1].trim();
  for (const ln of lines){
    const nums = ln.text.match(NUM_RE) || [];
    const raw = ln.text.replace(NUM_RE,' ').replace(/\s+/g,' ').trim();
    const em = raw.match(/^\s*([IVX]+|[A-ZÇĞİÖŞÜ]|\d{1,2})[.)]\s+/);
    const enumT = !em ? 'none' : (/^[IVX]+$/.test(em[1]) && em[1].length>1) || (em[1]==='I' && /VARLIK|KAYNAK/.test(fold(raw))) ? 'roman' : /^\d/.test(em[1]) ? 'num' : 'letter';
    const label = em ? raw.slice(em[0].length).trim() : raw;
    const f = fold(label);
    let isSec = false;
    for (const [re,c] of SECTIONS) if (re.test(f) && f.length < 60 && enumT!=='num'){ cls = c; tens = 0; isSec = true; }
    if (/AKTIF.*TOPLAM|TOPLAM AKTIF|VARLIKLAR\) TOPLAMI|VARLIKLAR TOPLAMI/.test(f) && nums.length) totals.assets = nums.map(trNum);
    if (/PASIF.*TOPLAM|TOPLAM PASIF|KAYNAKLAR\) TOPLAMI/.test(f) && nums.length) totals.liabs = nums.map(trNum);
    if (isSec || !cls || label.length < 3) continue;
    // Alt başlık: harfle numaralanmış satır ya da numarasız ve kalıpla başlayan kısa satır
    let isSub = false;
    if (enumT==='letter' || (enumT==='none' && !/^(DIGER|SUPHELI|1 |2 )/.test(f))){
      for (const [re,t] of (SUBS[cls]||[])) if (re.test(f) && f.length < 75){ tens = t; isSub = true; break; }
    }
    if (!nums.length) continue;
    const vals = nums.map(n => Math.abs(trNum(n)));
    const cur = order==='prevCur' ? vals[vals.length-1] : vals[0];
    const prev = vals.length>1 ? (order==='prevCur' ? vals[vals.length-2] : vals[1]) : null;
    let code = null, sc = 0;
    if (isSub && SINGLE[tens]) { code = SINGLE[tens]; sc = 1; }
    else if (isSub && tens===59) { code = /ZARAR/.test(f) ? 591 : 590; sc = 1; }
    else if (!isSub){
      const best = pool => { let bc=null, bs=0; for (const c of pool){ const v = score(label, ACCOUNTS[c]); if (v>bs){ bs=v; bc=c; } } return [bc,bs]; };
      const all = Object.keys(ACCOUNTS).map(Number);
      // eslint-disable-next-line no-loop-func -- `best` is called synchronously in this same iteration, never stored for later
      [code, sc] = tens ? best(all.filter(c=>Math.floor(c/10)===tens)) : [null,0];
      // eslint-disable-next-line no-loop-func
      if (sc < 0.5) [code, sc] = best(all.filter(c=>Math.floor(c/100)===cls));
      if (sc < 0.5) code = null;
    }
    if (isSub && !code) { out.push({ page:ln.page, label, cur, prev, code:null, kind:'subtotal', cls, tens }); continue; }
    out.push({ page:ln.page, label, cur, prev, code, score:sc, kind: code ? 'mapped' : 'unmapped', cls, tens });
  }
  const twoCols = out.filter(o=>o.prev!=null).length > out.length*0.5;
  return { year, items: out, totals, twoCols, company };
}

export function ledgerFromItems(items, { year, which='cur', fileName='', id }){
  const rows = [];
  const by = {};
  for (const it of items){
    if (!it.code || it.kind==='subtotal' || it.excluded) continue;
    const v = which==='cur' ? it.cur : it.prev; if (v==null) continue;
    by[it.code] = (by[it.code]||0) + v;
  }
  for (const c in by){
    const n = nature(c), v = by[c];
    rows.push({ code:String(c), name: ACCOUNTS[c], dt:0, ct:0, db: n==='D'?v:0, cb: n==='C'?v:0 });
  }
  return buildLedger(rows, { id, year, months:12, source:'pdf', fileName, label: 'Beyanname '+(which==='cur'?'cari':'önceki')+' dönem' });
}

export async function parsePdfFile(file, opts={}){
  const { lines, pages } = await pdfToLines(file);
  if (!lines.length || lines.map(l=>l.text).join('').length < 50) throw new Error('PDF içinde metin katmanı yok (taranmış belge). OCR uygulanmış PDF ya da mizan Excel\'i yükleyin.');
  const res = parseStatementLines(lines, opts);
  return { ...res, pages, fileName: file.name, lineCount: lines.length };
}
