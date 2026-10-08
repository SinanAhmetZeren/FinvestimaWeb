import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { buildLedger } from './engine/ledger.js';
import { parseWorkbookFile } from './engine/parseExcel.js';
import { parsePdfFile, ledgerFromItems } from './engine/parsePdf.js';
import { buildHistory, DEFAULT_FX } from './engine/statements.js';
import { fetchFxSummary } from './engine/fxApi.js';
import { defaultAssumptions, valuate, runRate } from './engine/valuation.js';
import { runAudit } from './engine/audit.js';
import { mUsd, pc } from './ui.jsx';
import { RightColContext } from './rightColContext.js';
import { L1Inputs, L2Mapping } from './layers/Inputs.jsx';
import { L3Balance, L4Income } from './layers/Statements.jsx';
import { L5Assumptions, L6Valuation, L7Audit } from './layers/Valuation.jsx';

const LAYERS = [
  { k:'L1', n:'Girdiler', m:'Dosya alımı, kurlar' },
  { k:'L2', n:'Mizan ve eşleme', m:'Hesap planı kontrolü' },
  { k:'L3', n:'Bilanço özetleri', m:'TL, USD, oranlar' },
  { k:'L4', n:'Gelir tablosu', m:'Normalize FAVÖK' },
  { k:'L5', n:'Varsayımlar', m:'Projeksiyon sürücüleri' },
  { k:'L6', n:'Değerleme', m:'Üç yöntem' },
  { k:'L7', n:'Denetim ve çıktı', m:'Bulgular, rapor' },
];

const STORE = 'valuator-pro:v1';
const EMPTY = { company:'', ledgers:[], pdfDocs:[], monthly:[], fx:{}, partnersAsDebt:true, fxInEbitda:false,
  daOverride:{}, annualize:{}, addbacks:[], contrib:{}, asm:null, baseAsm:null, closed:[], log:[] };

function load(){ try { const s = localStorage.getItem(STORE); return s ? { ...EMPTY, ...JSON.parse(s), fx:{} } : EMPTY; } catch { return EMPTY; } }

export default function ValuatorProEngine(){
  const [st, setSt] = useState(load);
  const [layer, setLayer] = useState(() => { const s = load(); return (s.ledgers.length || s.pdfDocs.length) ? 'L3' : 'L1'; });
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [rightColEl, setRightColEl] = useState(null);
  const [railOpen, setRailOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  useEffect(() => { if (rightColEl) rightColEl.scrollTop = 0; }, [layer, rightColEl]);
  const up = useCallback(patch => setSt(s => ({ ...s, ...(typeof patch==='function' ? patch(s) : patch) })), []);
  const saveT = useRef();
  useEffect(() => {
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => { try { const { fx, ...rest } = st; localStorage.setItem(STORE, JSON.stringify(rest)); } catch { /* depolama kotası dolu */ } }, 400);
  }, [st]);

  const pdfLedgers = useMemo(() => st.pdfDocs.flatMap(d => {
    const out = [ledgerFromItems(d.items, { year:d.year, which:'cur', fileName:d.fileName, id:d.id+'c' })];
    if (d.usePrev && d.year) out.push(ledgerFromItems(d.items, { year:d.year-1, which:'prev', fileName:d.fileName, id:d.id+'p' }));
    return out;
  }), [st.pdfDocs]);

  const rawLedgers = useMemo(() => [...st.ledgers.filter(l=>l.year), ...pdfLedgers.filter(l=>l.year)], [st.ledgers, pdfLedgers]);
  const ledgers = useMemo(() => {
    const by = {};
    for (const L of rawLedgers){ const e = by[L.year]; if (!e || (e.source==='pdf' && L.source==='mizan')) by[L.year] = L; }
    return Object.values(by).sort((a,b)=>a.year-b.year);
  }, [rawLedgers]);

  const [apiFx, setApiFx] = useState(null);
  useEffect(() => { fetchFxSummary().then(setApiFx); }, []);
  const fxBase = apiFx || DEFAULT_FX;
  const fxTable = useMemo(() => { const o = {}; new Set([...Object.keys(fxBase), ...Object.keys(st.fx)]).forEach(y => o[y] = { ...(fxBase[y]||{}), ...(st.fx[y]||{}) }); return o; }, [fxBase, st.fx]);
  const hist = useMemo(() => ledgers.length ? buildHistory(ledgers, st) : [], // eslint-disable-next-line
    [ledgers, st.fx, st.partnersAsDebt, st.fxInEbitda, st.daOverride, st.annualize, st.addbacks]);
  const lastYear = hist.length ? hist[hist.length-1].year : null;
  const rr = useMemo(() => hist.length ? runRate(st.monthly, hist, fxTable, lastYear+1) : null, [st.monthly, hist, fxTable, lastYear]);

  useEffect(() => {
    if (hist.length && (!st.asm || st.asm._base !== lastYear)){
      const A = { ...defaultAssumptions(hist), _base: lastYear };
      up({ asm: A, baseAsm: A });
    }
  }, [hist, lastYear]); // eslint-disable-line

  const V = useMemo(() => { try { return (hist.length && st.asm && st.asm._base===lastYear) ? valuate(hist, st.asm, { rr }) : null; } catch(e){ console.error(e); return null; } }, [hist, st.asm, rr, lastYear]);
  const audit = useMemo(() => {
    const a = runAudit({ hist, ledgers: rawLedgers, monthly: st.monthly, V, A: st.asm, state: st });
    a.findings.forEach(f => f.closed = st.closed.includes(f.id));
    const w = { crit:2, warn:.6, info:.15 };
    a.score = Math.max(0, Math.min(10, 10 - a.findings.filter(f=>!f.closed).reduce((s,f)=>s+w[f.sev],0)));
    return a;
  }, [hist, rawLedgers, st, V]);

  const log = msg => up(s => ({ log: [{ t: new Date().toLocaleTimeString('tr-TR'), msg }, ...s.log].slice(0,40) }));

  const onFiles = async (files) => {
    setBusy(true);
    for (const f of files){
      const ext = f.name.split('.').pop().toLowerCase();
      try {
        if (ext==='pdf'){
          const r = await parsePdfFile(f);
          const doc = { id:'P'+Math.random().toString(36).slice(2,8), fileName:f.name, year:r.year, items:r.items, twoCols:r.twoCols, usePrev:false, totals:r.totals, pages:r.pages };
          up(s => ({ pdfDocs:[...s.pdfDocs, doc], company: s.company || r.company || '' }));
          const mapped = r.items.filter(i=>i.kind==='mapped').length, un = r.items.filter(i=>i.kind==='unmapped').length;
          log(`${f.name}: beyanname okundu, ${r.pages} sayfa, ${mapped} kalem eşlendi, ${un} kalem eşleme bekliyor${r.year?'':'; yıl bulunamadı, L1\'de girin'}.`);
        } else if (['xlsx','xls','xlsm','csv','ods'].includes(ext)){
          const r = await parseWorkbookFile(f);
          if (r.mizans.length) up(s => ({ ledgers: [...s.ledgers, ...r.mizans], company: s.company || r.mizans[0].company || '' }));
          if (r.monthly.length) up(s => { const key = m => m.y*100+m.m; const mp = new Map(s.monthly.map(m=>[key(m),m])); r.monthly.forEach(m=>mp.set(key(m),m)); return { monthly:[...mp.values()].sort((a,b)=>key(a)-key(b)) }; });
          if (r.fx) up(s => { const o = { ...s.fx }; for (const y in r.fx){ o[y] = { ...(o[y]||{}), ...(r.fx[y].avg?{avg:r.fx[y].avg}:{}), ...(r.fx[y].end?{end:r.fx[y].end}:{}) }; } return { fx:o }; });
          const parts = [];
          if (r.mizans.length) parts.push(`${r.mizans.length} mizan (${r.mizans.map(m=>m.year||'yıl?').join(', ')})`);
          if (r.monthly.length) parts.push(`${r.monthly.length} aylık satış satırı`);
          if (r.fx) parts.push(`${Object.keys(r.fx).length} yıllık kur`);
          log(`${f.name}: ${parts.length ? parts.join(', ')+' okundu' : 'tanınan sayfa bulunamadı'}${r.skipped.length ? `; atlanan sayfalar: ${r.skipped.slice(0,4).join(', ')}${r.skipped.length>4?'…':''}` : ''}.`);
        } else log(`${f.name}: desteklenmeyen tür. Excel (.xlsx, .xls, .csv) ya da PDF yükleyin.`);
      } catch(e){ console.error(e); log(`${f.name}: okunamadı. ${e.message}`); }
    }
    setBusy(false);
  };

  const loadSample = async () => {
    const S = (await import('./engine/sample.json')).default;
    const L = Object.entries(S.mizan).map(([y,rows]) => buildLedger(rows.map(r=>({code:r[0],name:r[1],dt:r[2],ct:r[3],db:r[4],cb:r[5]})), { year:+y, source:'mizan', fileName:`Örnek mizan ${y}`, label:`01/01/${y}-31/12/${y}` }));
    setSt({ ...EMPTY, company:'Örnek Sanayi A.Ş.', ledgers:L, monthly:S.monthly,
      addbacks:[{ id:'a1', name:'Ortak kaynaklı genel yönetim giderleri (%50)', year:2025, tl:7407497, ev:false, on:false }],
      log:[{ t:new Date().toLocaleTimeString('tr-TR'), msg:'Örnek vaka yüklendi: 2023–2025 mizanları ve 2023–2026/06 aylık satış raporu.' }] });
    setLayer('L3');
  };
  const reset = () => { if (window.confirm('Tüm dosyalar ve varsayımlar silinsin mi?')) { setSt(EMPTY); setLayer('L1'); } };

  const ctx = { st, setSt, up, hist, ledgers, rawLedgers, V, audit, fxTable, rr, onFiles, loadSample, reset, busy, setLayer, log, setPrinting };
  const done = { L1: ledgers.length>0, L2: hist.length>0 && hist.every(h=>Math.abs(h.bs.check)<Math.max(1,h.bs.TA*0.0005)), L3: hist.length>0, L4: hist.length>0, L5: !!V, L6: !!V, L7: !!V && audit.findings.every(f=>f.closed||f.sev!=='crit') };

  useEffect(() => { if (printing){ const t = setTimeout(()=>{ window.print(); setPrinting(false); }, 350); return ()=>clearTimeout(t); } }, [printing]);

  return (
    <RightColContext.Provider value={rightColEl}>
    <div className={'app vp-root'+(printing?' printing':'')}>
      <button type="button" className={'railToggle'+(railOpen?'':' collapsed')} aria-label={railOpen?'Sol paneli gizle':'Sol paneli göster'} onClick={()=>setRailOpen(v=>!v)}>{railOpen?'‹':'›'}</button>
      {railOpen && <nav className="rail" aria-label="Katmanlar">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="1" y="1" width="24" height="24" rx="5" fill="none" stroke="#B8862B" strokeWidth="1.5"/><path d="M7 8l6 11 6-11" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
          <div><b>VALUATOR</b><span>Firma değerleme motoru</span></div>
        </div>
        <ol className="layers">
          {LAYERS.map(l => (
            <li key={l.k}>
              <button className={'layer'+(done[l.k]?' ok':'')} aria-current={layer===l.k} onClick={()=>setLayer(l.k)}>
                <span className="lc">{l.k}</span>
                <span><span className="ln">{l.n}</span><span className="lm">{l.m}</span></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="rfoot">
          <div className="flow"><span>Girdi</span><i/><span>İşlem</span><i/><span>Çıktı</span></div>
          <p>Dosyalar tarayıcınızda işlenir, sunucuya gönderilmez.</p>
        </div>
      </nav>}

      <div className="main">
        <header className="top">
          <div className="case">
            <input className="cname" value={st.company} placeholder="Şirket adı" onChange={e=>up({company:e.target.value})} aria-label="Şirket adı" />
            <span className="cmeta">{hist.length ? `${hist[0].year}–${hist[hist.length-1].year} tarihsel, USD '000` : 'Henüz veri yüklenmedi'}</span>
          </div>
          {V && <div className="headline">
            <div><span className="hl">Firma değeri</span><b>{mUsd(V.ev)}</b></div>
            <div><span className="hl">Özkaynak değeri</span><b>{mUsd(V.eq)}</b></div>
            <div><span className="hl">Güven skoru</span><b className={audit.score>=7?'ok':audit.score>=4?'wn':'er'}>{audit.score.toFixed(1).replace('.',',')}</b></div>
            <div className="hide-sm"><span className="hl">WACC</span><b>{pc(V.P.w)}</b></div>
          </div>}
        </header>
        {/* Sol rail ile yinelendiği için kaldırıldı — silinmedi, gerekirse geri açılabilir.
        <div className="stepper" role="tablist">
          {LAYERS.map((l,i) => <span key={l.k} className="stepw">{i>0 && <span className="stepline"/>}<button role="tab" className={'step'+(done[l.k]?' done':'')} aria-current={layer===l.k} aria-selected={layer===l.k} onClick={()=>setLayer(l.k)}><i>{l.k}</i>{l.n}</button></span>)}
        </div>
        */}
        <main className="work">
          {printing ? <PrintReport {...ctx} /> : (
            <>
              {layer==='L1' && <L1Inputs {...ctx} />}
              {layer==='L2' && <L2Mapping {...ctx} />}
              {layer==='L3' && <L3Balance {...ctx} />}
              {layer==='L4' && <L4Income {...ctx} />}
              {layer==='L5' && <L5Assumptions {...ctx} />}
              {layer==='L6' && <L6Valuation {...ctx} />}
              {layer==='L7' && <L7Audit {...ctx} />}
            </>
          )}
        </main>
      </div>

      <button type="button" className={'rightColToggle'+(rightOpen?'':' collapsed')} aria-label={rightOpen?'Sağ paneli gizle':'Sağ paneli göster'} onClick={()=>setRightOpen(v=>!v)}>{rightOpen?'›':'‹'}</button>
      <aside className={'rightCol'+(rightOpen?'':' collapsed')} aria-label="Sağ panel" ref={setRightColEl}></aside>
    </div>
    </RightColContext.Provider>
  );
}

function PrintReport(ctx){
  return (
    <div className="report">
      <h1>{ctx.st.company || 'Firma'} değerleme raporu</h1>
      <p className="rmeta">{new Date().toLocaleDateString('tr-TR')}. Tutarlar aksi belirtilmedikçe bin USD.</p>
      <L6Valuation {...ctx} print />
      <L3Balance {...ctx} print />
      <L4Income {...ctx} print />
      <L5Assumptions {...ctx} print />
      <L7Audit {...ctx} print />
    </div>
  );
}
