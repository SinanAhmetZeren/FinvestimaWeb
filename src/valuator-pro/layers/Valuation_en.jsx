import { useState, useEffect } from 'react';
import { Panel, Seg, Toggle, Tag, Empty, FinTable, NumField, nf, pc, mx, mUsd, Insp } from '../ui.jsx';
import { RevenueChart, FootballField, Bridge } from '../charts.jsx';
import { applyScenario, SECTOR_MULTIPLES, defaultAssumptions } from '../engine/valuation.js';
import { cogsMix } from '../engine/statements.js';
import { exportWorkbook } from '../engine/exportXlsx.js';
import { useStartComparableMultiplesMutation, useLazyGetComparableMultiplesJobQuery, useGetLatestComparableMultiplesJobQuery, useGetComparableMultiplesTableQuery, useSaveComparableMultiplesTableMutation } from '../../slices/ValuatorProSlice.js';

const noVal = <div className="left"><Empty title="Historical data required for valuation">Upload at least one year of trial balance or tax return in L1.</Empty></div>;
const COSTS = [['mat','Materials'],['lab','Direct labor'],['ovh','Manufacturing overhead (excl. D&A)'],['psd','Selling, marketing, distribution'],['ga','General and administrative'],['rnd','R&D']];

export function L5Assumptions({ hist, st, up, V, rr, print }){
  if (!hist.length || !st.asm || !V) return noVal;
  const A = st.asm, P = V.P, B = V.B;
  const setA = p => up(s => {
    const next = { ...s.asm, ...p };
    const { scenario:_s1, _base:_b1, ...nextVals } = next;
    const { scenario:_s2, _base:_b2, ...baseVals } = s.baseAsm || {};
    const isBase = JSON.stringify(nextVals) === JSON.stringify(baseVals);
    return { asm: { ...next, scenario: p.scenario ?? (isBase ? (s.baseAsm?.scenario || 'base') : 'custom') } };
  });
  const H3 = hist.slice(-3);
  const hu = h => { const u=h.usd, m=cogsMix(h), ce=Math.max(0,u.cogs-u.daCogs); return { rev:u.rev, mat:ce*m.mat, lab:ce*m.lab, ovh:ce*m.ovh, psd:Math.max(0,u.psd-u.daPsd), ga:Math.max(0,u.ga-u.daGa-u.addb), rnd:Math.max(0,u.rnd-u.daRnd), ebitda:u.ebitdaAdj, da:u.da, ebit:u.ebitdaAdj-u.da, nwc:u.nwc }; };
  const HU = H3.map(hu);
  const head = [...H3.map(h=>({ l:String(h.year), cls:'hcol' })), ...P.rows.map(r=>({ l:String(r.year)+'F', cls:'pcol' }))];
  const band = [{ l:'Actual', span:H3.length }, { l:'Projection', span:P.rows.length, cls:'pj' }];
  const row = (l, hk, pk, cls, f) => ({ l, v:[...HU.map(x=> typeof hk==='function' ? hk(x) : x[hk]), ...P.rows.map(r=> typeof pk==='function' ? pk(r) : r[pk])], cls, f });
  const rows = [
    row('Net sales','rev','rev','sub'),
    { l:'Growth', v:[...HU.map((x,i)=> i ? x.rev/HU[i-1].rev-1 : null), ...P.rows.map(r=>r.g)], f:pc, cls:'dim' },
    row('Materials (−)', x=>-x.mat, r=>-r.mat, 'kid'),
    row('Direct labor (−)', x=>-x.lab, r=>-r.lab, 'kid'),
    row('Manufacturing overhead (−)', x=>-x.ovh, r=>-r.ovh, 'kid'),
    row('Selling, marketing, distribution (−)', x=>-x.psd, r=>-r.psd, 'kid'),
    row('General and administrative (−)', x=>-x.ga, r=>-r.ga, 'kid'),
    ...(A.costs.rnd.s||A.costs.rnd.e ? [row('R&D (−)', x=>-x.rnd, r=>-r.rnd, 'kid')] : []),
    row('EBITDA (normalized)','ebitda','ebitda','hero'),
    { l:'EBITDA margin', v:[...HU.map(x=>x.ebitda/x.rev), ...P.rows.map(r=>r.margin)], f:pc, cls:'dim' },
    row('Depreciation (−)', x=>-x.da, r=>-r.da, 'kid'),
    row('EBIT', 'ebit', 'ebit', 'sub'),
    row('Tax (on EBIT) (−)', ()=>null, r=>-r.tax, 'kid'),
    row('NOPLAT', ()=>null, 'noplat', 'sub'),
    row('Capex (−)', ()=>null, r=>-r.capex, 'kid'),
    row('Net working capital', 'nwc', 'nwc', 'dim'),
    row('Change in NWC (−)', ()=>null, r=>-r.dnwc, 'kid'),
    row('Free cash flow (FCFF)', ()=>null, 'fcf', 'sum'),
    { spacer:true },
    row('Finance expense (info)', ()=>null, r=>-r.interest, 'dim'),
    row('Net income (info)', ()=>null, 'netIncome', 'dim'),
    { l:'ROIC (on opening capital)', v:[...HU.map(()=>null), ...P.rows.map(r=>r.roic)], f:pc, cls:'dim' },
  ];
  const avg = k => HU.reduce((s,x)=>s+x[k]/x.rev,0)/HU.length;
  const rng = k => [Math.min(...HU.map(x=>x[k]/x.rev)), Math.max(...HU.map(x=>x[k]/x.rev))];
  const drv = [
    ...COSTS.filter(([k])=>k!=='rnd'||A.costs.rnd.s).map(([k,n]) => ({ n:n+' / revenue', h:avg(k), r:rng(k), y0:A.costs[k].s, y1:P.rows[0][k]/P.rows[0].rev, yn:A.costs[k].e, inv:true })),
    { n:'Capex / revenue', h: HU.reduce((s,x)=>s+x.da/x.rev,0)/HU.length, r:null, y0:B.da/B.rev, y1:A.capexPct, yn:A.capexPct, note:'historical value, depreciation / revenue' },
    { n:'NWC / revenue', h:avg('nwc'), r:rng('nwc'), y0:B.nwc/B.rev, y1:A.nwcPct, yn:A.nwcPct },
  ];
  const cagr = hist.length>1 ? Math.pow(hist[hist.length-1].usd.rev/hist[0].usd.rev, 1/(hist[hist.length-1].year-hist[0].year))-1 : null;

  const body = (<>
    <Panel title="Projection" sub="$k; realized years normalized" flush>
      <FinTable head={head} band={band} rows={rows} note={`Base year ${B.year}. Cost ratios move linearly from start to target. New investments depreciate over ${A.daLife} years. ${A.midYear?'Cash flows are assumed to occur mid-year.':''}`} />
    </Panel>
    <div className="two">
      <Panel title="Revenue and EBITDA margin" sub="actual and projected"><RevenueChart data={[...H3.map((h,i)=>({ l:String(h.year), rev:HU[i].rev, margin:HU[i].ebitda/HU[i].rev })), ...P.rows.map(r=>({ l:String(r.year), rev:r.rev, margin:r.margin, proj:true }))]} /></Panel>
      <Panel title="Driver test" sub="each assumption compared against the last three years" flush>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th className="lbl">Driver</th><th className="n">Hist. avg</th><th className="n">Base year</th><th className="n">Target</th><th></th></tr></thead>
          <tbody>{drv.map(d => { const out = d.r && (d.yn < d.r[0]-0.02 || d.yn > d.r[1]+0.02); return (
            <tr key={d.n}><td className="lbl">{d.n}</td><td className="n">{pc(d.h)}</td><td className="n">{pc(d.y0)}</td><td className="n">{pc(d.yn)}</td>
              <td>{out ? <Tag c="gold">out of range</Tag> : <Tag c="green">in range</Tag>}</td></tr>); })}
            <tr><td className="lbl">Average growth</td><td className="n">{pc(cagr)}</td><td className="n">—</td><td className="n">{pc(A.growth.slice(0,A.N).reduce((s,g)=>s+g,0)/A.N)}</td><td>{cagr!=null && A.growth[0]>cagr+0.05 ? <Tag c="gold">aggressive</Tag> : <Tag c="green">reasonable</Tag>}</td></tr>
          </tbody></table></div>
      </Panel>
    </div>
  </>);
  if (print) return <div className="left">{body}</div>;
  const base = st.baseAsm || A;
  return (<>
    <div className="left">{body}</div>
    <Insp>
      <div className="ihead">Drivers <span>L5</span></div>
      <div className="iblk"><h4>Scenario and duration</h4>
        <Seg value={A.scenario} onChange={k=>up(s=>({ asm: applyScenario(s.asm, k, s.baseAsm) }))} options={[{v:'pess',l:'Pessimistic'},{v:'base',l:'Base'},{v:'opt',l:'Optimistic'}]} />
        <div className="gap" />
        <Seg value={A.N} onChange={n=>setA({N:n})} options={[{v:5,l:'5 yr'},{v:7,l:'7 yr'}]} />
        {A.scenario==='custom' && <p className="muted small">Drivers manually overridden.</p>}
      </div>
      <div className="iblk"><h4>Revenue growth (USD)</h4>
        {rr && <Toggle checked={A.y1Mode==='runrate'} onChange={v=>setA({y1Mode: v?'runrate':'growth'})} title={`Derive ${B.year+1} revenue from the monthly report`}
          desc={`${rr.months}-month actual × ${nf(A.runRateFactor||rr.factor,2)} annualization × ${nf(rr.recon,3)} trial-balance reconciliation = ${nf(rr.usd*(A.runRateFactor||rr.factor)*rr.recon)} $k`} />}
        {A.y1Mode==='runrate' && rr && <NumField label="Annualization factor" value={A.runRateFactor||rr.factor} step={0.05} digits={2} unit="x" min={1} max={12} onChange={v=>setA({runRateFactor:v})} />}
        {Array.from({length:A.N},(_,i)=> (i===0 && A.y1Mode==='runrate') ? null : (
          <NumField key={i} label={`${B.year+i+1}`} value={A.growth[i]} pct step={0.01} min={-0.5} max={1} onChange={v=>{ const g=[...A.growth]; g[i]=v; setA({growth:g}); }} />))}
        <button className="lnk" onClick={()=>setA({ growth: A.growth.map(()=>A.growth[A.y1Mode==='runrate'?1:0]) })}>Apply first value to all years</button>
      </div>
      <div className="iblk"><h4>Cost / revenue target ({B.year+A.N})</h4>
        {COSTS.filter(([k])=>k!=='rnd'||A.costs.rnd.s>0).map(([k,n]) => (
          <NumField key={k} label={<>{n}<span className="from"> base {pc(A.costs[k].s)}</span></>} value={A.costs[k].e} pct step={0.005} min={0} max={1}
            onChange={v=>setA({ costs: { ...A.costs, [k]: { ...A.costs[k], e:v } } })} />))}
        <div className="ical"><span className="k">{B.year+A.N} EBITDA margin</span><span className="v">{pc(P.rows[P.rows.length-1].margin)}</span></div>
      </div>
      <div className="iblk iblk-left"><h4>Capex, capital, tax</h4>
        <NumField label="Capex / revenue" value={A.capexPct} pct step={0.005} min={0} max={0.5} onChange={v=>setA({capexPct:v})} />
        <NumField label="NWC / revenue" value={A.nwcPct} pct step={0.01} min={-0.5} max={1} onChange={v=>setA({nwcPct:v})} />
        <NumField label="New asset life" value={A.daLife} step={1} digits={0} unit="yr" min={2} max={50} onChange={v=>setA({daLife:v})} />
        <NumField label="Existing depreciation fade" value={A.daFade} pct step={0.05} min={0} max={1} hint="Annual decay rate of depreciation on existing assets" onChange={v=>setA({daFade:v})} />
        <NumField label="Corporate tax" value={A.taxRate} pct step={0.01} min={0} max={0.5} onChange={v=>setA({taxRate:v})} />
      </div>
      <div className="iblk">
        <button className="ibtn ghost" onClick={()=>up({ asm: { ...base, scenario:'base' } })}>Reset assumptions to base</button>
        <button className="ibtn ghost" onClick={()=>{ const D = { ...defaultAssumptions(hist), _base: B.year }; up({ asm:D, baseAsm:D }); }}>Rebuild from historical data</button>
      </div>
      <div className="inote">Defaults reflect the base year as realized; margin improvement is never assumed on its own. When the target changes, the driver test compares against the historical range.</div>
    </Insp>
  </>);
}

const CM_POLL_COLORS = { Starting: 'var(--gold)', Pending: 'var(--faint)', Processing: 'var(--teal)', Completed: 'var(--green)', Failed: 'var(--red)' };
const CM_POLL_LABELS = { Starting: 'Starting…', Pending: 'Queued…', Processing: 'Researching…' };

export function L6Valuation({ hist, st, up, V, print }){
  const [startComparableMultiples] = useStartComparableMultiplesMutation();
  const [fetchComparableMultiplesJob] = useLazyGetComparableMultiplesJobQuery();
  const [cmOpen, setCmOpen] = useState(false);
  const [cmForm, setCmForm] = useState({ sectorSubSector: '', yearlySales: '', region: '', country: '' });
  const [cmRows, setCmRows] = useState(null);
  const [cmResultOpen, setCmResultOpen] = useState(false);
  const [cmError, setCmError] = useState(null);
  const [cmStatus, setCmStatus] = useState(null); // null | Starting | Pending | Processing | Completed | Failed
  const cmLoading = cmStatus === 'Starting' || cmStatus === 'Pending' || cmStatus === 'Processing';

  // L6 Comparable multiples table — persistent per task, starts empty. Rows added here (via
  // AI popup "Use" or manual entry) are only local until "Save" writes the whole table to the DB.
  const { data: cmTableData } = useGetComparableMultiplesTableQuery(st.valuationTaskId, { skip: !st.valuationTaskId });
  const [saveComparableMultiplesTable, { isLoading: cmSaving }] = useSaveComparableMultiplesTableMutation();
  const [cmTable, setCmTable] = useState([]);
  const CM_EMPTY_DRAFT = { category: '', rangeLow: '', rangeHigh: '', median: '', vintage: '', sourceBasis: '', sourceUrl: null, isEstimate: false };
  const [cmDraft, setCmDraft] = useState(CM_EMPTY_DRAFT);
  const [cmUsedAiRows, setCmUsedAiRows] = useState({}); // ai row index -> persisted row id, so the popup can show "Remove"
  const [cmSelectedRow, setCmSelectedRow] = useState(null); // selected comps row id/index — highlights row, applies its median
  const [cmZHint, setCmZHint] = useState(null); // "Impl. equity" header hover popup — {x,y} or null
  useEffect(() => { if (cmTableData) setCmTable(cmTableData); }, [cmTableData]);

  // Restore the last completed AI research on page refresh (only if no new research has run yet
  // this session — cmRows still null).
  const { data: cmLatestJob } = useGetLatestComparableMultiplesJobQuery(st.valuationTaskId, { skip: !st.valuationTaskId });
  useEffect(() => { if (cmLatestJob?.result && cmRows === null) setCmRows(cmLatestJob.result.rows); }, [cmLatestJob, cmRows]);

  // "Use"/"Remove" state isn't a stored field — it's derived by matching the AI row (category +
  // median) against the persisted table rows, so it's still correct after a page refresh.
  useEffect(() => {
    if (!cmRows) return;
    const map = {};
    cmRows.forEach((r, i) => {
      const match = cmTable.find(t => t.category === r.category && Math.abs((+t.median || 0) - (+r.median || 0)) < 0.001);
      if (match) map[i] = match.id;
    });
    setCmUsedAiRows(map);
  }, [cmRows, cmTable]);

  if (!V) return noVal;
  const A = st.asm, P = V.P, W = P.W, B = V.B;
  const editCmRow = (i, patch) => setCmTable(t => t.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const persistCmTable = async (rows) => {
    try {
      const saved = await saveComparableMultiplesTable({
        valuationTaskId: st.valuationTaskId,
        rows: rows.map(r => ({ id: r.id, category: r.category, rangeLow: +r.rangeLow || 0, rangeHigh: +r.rangeHigh || 0, median: +r.median || 0, vintage: r.vintage || '', sourceBasis: r.sourceBasis || '', sourceUrl: r.sourceUrl, isEstimate: !!r.isEstimate })),
      }).unwrap();
      setCmTable(saved);
      return saved;
    } catch (e) {
      console.error('[comparable-multiples-table] save failed', e);
      alert('Could not save: ' + (e.data || e.message || 'unknown error'));
      return null;
    }
  };
  const removeCmRow = (i) => persistCmTable(cmTable.filter((_, idx) => idx !== i));
  const saveCmDraft = async () => {
    const saved = await persistCmTable([...cmTable, cmDraft]);
    if (saved) setCmDraft(CM_EMPTY_DRAFT);
  };
  const applyAiRow = (row) => persistCmTable([...cmTable, { ...CM_EMPTY_DRAFT, ...row }]);
  const removeAiRow = async (aiIndex) => {
    const id = cmUsedAiRows[aiIndex];
    const saved = await persistCmTable(cmTable.filter(r => r.id !== id));
    if (saved) setCmUsedAiRows(m => { const n = { ...m }; delete n[aiIndex]; return n; });
  };
  const pollComparableMultiplesJob = async (jobId, { intervalMs = 2000, timeoutMs = 180000 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const job = await fetchComparableMultiplesJob(jobId).unwrap();
      console.log('[comparable-multiples] poll', job);
      setCmStatus(job.status);
      if (job.status === 'Completed') return job;
      if (job.status === 'Failed') throw new Error(job.errorMessage || 'Gemini request failed.');
      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error('The request timed out.');
  };
  const runComparableMultiples = async () => {
    setCmError(null);
    setCmStatus('Starting');
    console.log('[comparable-multiples] starting job', { ...cmForm, ebitda: V.m2.basis });
    try {
      const { jobId } = await startComparableMultiples({ valuationTaskId: st.valuationTaskId, ...cmForm, yearlySales: +cmForm.yearlySales || 0, ebitda: V.m2.basis, language: 'en' }).unwrap();
      const job = await pollComparableMultiplesJob(jobId);
      console.log('[comparable-multiples] success', job.result);
      setCmRows(job.result.rows);
      setCmUsedAiRows({});
      setCmOpen(false);
      setCmResultOpen(true);
    } catch (e) {
      console.error('[comparable-multiples] failed', e);
      setCmError(e.data || e.message || 'Gemini request failed.');
      setCmStatus('Failed');
    } finally {
      setCmStatus(s => (s === 'Failed' ? s : null));
    }
  };
  const cmField = (lbl, ph, key, numeric) => (
    <div style={{ display:'flex', flexDirection:'column', gap:5, textAlign:'left' }}>
      <label style={{ fontSize:11.5, fontWeight:600, color:'var(--navy)' }}>{lbl}</label>
      <input
        type={numeric ? 'number' : 'text'}
        style={{ width:'100%', boxSizing:'border-box', textAlign:'left', fontFamily:'var(--sans)', fontSize:12.5, border:'1px solid var(--line)', borderRadius:5, padding:'7px 9px', background:'#fff' }}
        value={cmForm[key]} placeholder={ph}
        onChange={e=>setCmForm(f=>({...f, [key]:e.target.value}))} />
    </div>
  );
  const cmModal = cmOpen && (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setCmOpen(false)}>
      <div style={{ background:'#fff', borderRadius:10, width:'min(420px, 95vw)', boxShadow:'0 20px 60px rgba(0,0,0,.3)', textAlign:'left' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--line)' }}>
          <h3 style={{ margin:0, fontSize:14, color:'var(--navy)' }}>Comparable multiples</h3>
          <button type="button" onClick={()=>setCmOpen(false)} aria-label="Close"
            style={{ border:0, background:'none', fontSize:18, lineHeight:1, cursor:'pointer', color:'var(--muted)' }}>×</button>
        </div>
        <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>
          {cmField('Sector / sub-sector', 'e.g. automotive spare parts (brake pads)', 'sectorSubSector')}
          {cmField('Yearly revenue (USD)', '', 'yearlySales', true)}
          {cmField('Region', 'e.g. EU', 'region')}
          {cmField('Country', 'e.g. Germany', 'country')}
          {cmError && <p className="muted small" style={{ color:'var(--red)', margin:0 }}>{String(cmError)}</p>}
          <button type="button" className="btn" disabled={cmLoading} onClick={runComparableMultiples} style={{
            width:'100%',
            ...(cmLoading ? {
              background: CM_POLL_COLORS[cmStatus] || 'var(--navy)', borderColor: CM_POLL_COLORS[cmStatus] || 'var(--navy)',
              animation: 'box-pulse 1.2s ease infinite',
            } : {}),
          }}>{cmLoading ? (CM_POLL_LABELS[cmStatus] || cmStatus) : 'Research'}</button>
        </div>
      </div>
    </div>
  );
  const cmResultModal = cmResultOpen && cmRows && (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setCmResultOpen(false)}>
      <div style={{ background:'#fff', borderRadius:10, width:'min(1100px, 95vw)', maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', textAlign:'left' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--line)' }}>
          <h3 style={{ margin:0, fontSize:14, color:'var(--navy)' }}>Comparable multiples (AI) — EV / EBITDA</h3>
          <button type="button" onClick={()=>setCmResultOpen(false)} aria-label="Close"
            style={{ border:0, background:'none', fontSize:18, lineHeight:1, cursor:'pointer', color:'var(--muted)' }}>×</button>
        </div>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th></th><th className="lbl">Category</th><th className="n">Range</th><th className="n">Median</th><th>Vintage</th><th className="lbl">Source/basis</th></tr></thead>
          <tbody>{cmRows.map((r,i) => (
            <tr key={i}>
              <td>{cmUsedAiRows[i] != null
                ? <button type="button" className="btn" style={{ background:'var(--teal)', borderColor:'var(--teal)', padding:'3px 10px', fontSize:11 }} disabled={cmSaving} onClick={()=>removeAiRow(i)}>Remove</button>
                : <button type="button" className="btn" style={{ padding:'3px 10px', fontSize:11 }} disabled={cmSaving} onClick={()=>applyAiRow({ category: r.category, rangeLow: r.rangeLow, rangeHigh: r.rangeHigh, median: r.median, vintage: r.vintage, sourceBasis: r.sourceBasis, sourceUrl: r.sourceUrl, isEstimate: r.isEstimate })}>Use</button>}</td>
              <td className="lbl">{r.category}</td>
              <td className="n">{mx(r.rangeLow)} – {mx(r.rangeHigh)}</td>
              <td className="n">{mx(r.median,2)}</td>
              <td>{r.vintage}</td>
              <td className="lbl">{r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noreferrer">{r.sourceBasis}</a> : r.sourceBasis}</td>
            </tr>))}</tbody>
          <tfoot><tr><td colSpan="6">Generated by Gemini — figures are AI estimates, verify before use. "Use" adds the selected row directly to the comparable multiples table and saves it.</td></tr></tfoot>
        </table></div>
      </div>
    </div>
  );
  const setA = p => up(s => ({ asm: { ...s.asm, ...p } }));
  const setW = p => setA({ wacc: { ...A.wacc, ...p } });
  const ws = A.weights.dcf + A.weights.mult + A.weights.na || 1;
  const sec = SECTOR_MULTIPLES.find(s=>s.k===A.mult.sector);
  const dcfVals = V.sens.flat().filter(isFinite);
  const ff = [
    { l:'Discounted cash flow', lo: Math.min(...dcfVals), hi: Math.max(...dcfVals), mid: V.m1.eq },
    { l:'EBITDA multiple', lo: V.m2.basis*(sec?.lo ?? A.mult.value-1)*(1-A.mult.disc) - V.nd, hi: V.m2.basis*(sec?.hi ?? A.mult.value+1)*(1-A.mult.disc) - V.nd, mid: V.m2.eq },
    { l:'Net assets', lo: Math.min(B.equity-B.intang, V.m3.eq), hi: Math.max(B.equity + (+A.na.uplift||0), V.m3.eq), mid: V.m3.eq },
  ];
  const cards = [
    { k:'dcf', n:'Discounted cash flow', ev:V.m1.ev, eq:V.m1.eq, d:`WACC ${pc(P.w)}, ${A.tvMethod==='exit' ? 'exit '+mx(A.exitMult) : 'g '+pc(A.tg)}, terminal share ${pc(V.D.tvShare,0)}` },
    { k:'mult', n:'EBITDA multiple', ev:V.m2.ev, eq:V.m2.eq, d:`${mx(A.mult.value)} × ${A.mult.basis==='fwd'?(B.year+1)+'F':B.year} EBITDA ${nf(V.m2.basis)}${A.mult.disc?`, ${nf(A.mult.disc*100)}% discount`:''}` },
    { k:'na', n:'Net assets', ev:V.m3.ev, eq:V.m3.eq, d:`${B.year} equity${A.na.uplift?` + ${nf(A.na.uplift)} fair value adj.`:''}${A.na.excludeIntang?', excl. intangibles':''}` },
  ];
  const fcfHead = P.rows.map(r=>({ l:String(r.year)+'F' }));
  const fcfRows = [
    { l:'EBITDA', v:P.rows.map(r=>r.ebitda), cls:'sub' }, { l:'Depreciation (−)', v:P.rows.map(r=>-r.da), cls:'kid' },
    { l:'EBIT', v:P.rows.map(r=>r.ebit) }, { l:'Tax (−)', v:P.rows.map(r=>-r.tax), cls:'kid' }, { l:'NOPLAT', v:P.rows.map(r=>r.noplat), cls:'sub' },
    { l:'Depreciation (+)', v:P.rows.map(r=>r.da), cls:'kid' }, { l:'Capex (−)', v:P.rows.map(r=>-r.capex), cls:'kid' }, { l:'Change in NWC (−)', v:P.rows.map(r=>-r.dnwc), cls:'kid' },
    { l:'Free cash flow (FCFF)', v:P.rows.map(r=>r.fcf), cls:'sum' },
    { l:'Discount factor', v:P.rows.map(r=>r.df), f:x=>nf(x,3), cls:'dim' }, { l:'Present value', v:P.rows.map(r=>r.pv), cls:'sub' },
    { spacer:true },
    { l:'Opening invested capital', v:P.rows.map(r=>r.icOpen), cls:'dim' }, { l:'ROIC', v:P.rows.map(r=>r.roic), f:pc, cls:'dim' }, { l:'Economic value added (EVA)', v:P.rows.map(r=>r.eva), cls:'dim' },
  ];
  const pickSens = (w, g) => setA({ tg: g, tvMethod:'gordon', wacc: { ...A.wacc, manual:true, value:w } });

  const body = (<>
    <div className="methods">
      {cards.map(c => (
        <div className="mcard" key={c.k}>
          <span className="mn">{c.n}</span>
          <b>{mUsd(c.eq)}</b><span className="ml">equity value</span>
          <span className="mev">Firm value {mUsd(c.ev)}</span>
          <span className="md">{c.d}</span>
          <span className="mw">Weight {pc(A.weights[c.k]/ws,0)}</span>
        </div>))}
      <div className="mcard hero">
        <span className="mn">Weighted result</span>
        <b>{mUsd(V.eq)}</b><span className="ml">equity value</span>
        <span className="mev">Firm value {mUsd(V.ev)}, net debt {mUsd(V.nd)}</span>
        <span className="md">Implied {mx(V.impliedMult)} EBITDA, {mx(V.impliedSales,2)} revenue. Potential goodwill {mUsd(V.goodwill)}.</span>
      </div>
    </div>
    <Panel title="Value ranges" sub="equity value; the bar shows sensitivity or comps range, the line shows the selected value">
      <FootballField items={ff} marker={V.eq} />
    </Panel>
    <Panel title="Cash flow and value bridge" sub="$k" flush>
      <FinTable head={fcfHead} rows={fcfRows} />
      <div className="pbody"><Bridge steps={[{l:'PV of cash flows',v:V.D.pvSum},{l:'PV of terminal value',v:V.D.pvTv},{l:'Firm value',v:V.D.ev,total:true},{l:'Net debt',v:-V.nd},{l:'Equity',v:V.m1.eq,total:true}]} />
        <p className="muted small">Terminal value {nf(V.D.tv)} $k ({A.tvMethod==='exit' ? `implied growth ${pc(V.D.impliedG)}` : `implied exit multiple ${mx(V.D.impliedExit)}`}). Average ROIC {pc(V.avgRoic)}, WACC {pc(P.w)}: {V.avgRoic>P.w ? 'growth is value-creating.' : 'return is below the cost of capital; growth is destroying value.'}</p></div>
    </Panel>
    <div className="two">
      <Panel title="Sensitivity: WACC and terminal growth" sub={print?'equity, $m':'click a cell to select the assumption; equity, $m'} flush>
        <div className="scroll"><table className="g sens">
          <thead><tr className="hd solo"><th className="lbl">WACC \ g</th>{V.gSteps.map(g=><th key={g} className="n">{pc(g)}</th>)}</tr></thead>
          <tbody>{V.wSteps.map((w,i)=>(<tr key={w}><td className="lbl">{pc(w)}</td>{V.sens[i].map((v,j)=>(
            <td key={j} className={'n cell'+(i===2&&j===2?' sel':'')} onClick={()=>!print && pickSens(w, V.gSteps[j])}>{isFinite(v) ? nf(v/1000,1) : '—'}</td>))}</tr>))}</tbody>
        </table></div>
      </Panel>
      <Panel title="Sensitivity: EBITDA multiple" sub="equity, $m" flush>
        <div className="scroll"><table className="g sens">
          <thead><tr className="hd solo"><th className="lbl">EBITDA base</th>{V.multSteps.map(m=><th key={m} className="n">{mx(m)}</th>)}</tr></thead>
          <tbody>{[`${B.year} normalized`, `${B.year+1}F forward`].map((l,i)=>(<tr key={l}><td className="lbl">{l}</td>{V.sensM[i].map((v,j)=><td key={j} className={'n'+(j===2&&((i===0)===(A.mult.basis!=='fwd'))?' sel':'')}>{nf(v/1000,1)}</td>)}</tr>))}</tbody>
        </table></div>
      </Panel>
    </div>
    <Panel title="Comparable multiples" sub={print?'EV / EBITDA':'click a row to apply the median; EV / EBITDA'} flush
      right={!print && <>
        {cmRows && <button type="button" className="btn" style={{ background:'var(--teal)', borderColor:'var(--teal)', padding:'3px 10px', fontSize:11 }} onClick={()=>setCmResultOpen(true)}>See results</button>}
        <button type="button" className="btn" disabled={cmLoading} onClick={()=>setCmOpen(true)} style={{
          padding:'3px 10px', fontSize:11,
          ...(cmLoading ? {
            background: CM_POLL_COLORS[cmStatus] || 'var(--navy)', borderColor: CM_POLL_COLORS[cmStatus] || 'var(--navy)',
            animation: 'box-pulse 1.2s ease infinite',
          } : {}),
        }}>{cmLoading ? (CM_POLL_LABELS[cmStatus] || cmStatus) : 'Research'}</button>
      </>}>
      <div className="scroll"><table className="g">
        <thead><tr className="hd solo"><th></th><th className="lbl">Category</th><th className="n">Low</th><th className="n">High</th><th className="n">Median</th><th className="n">
          <span style={{ cursor:'default' }}
            onMouseEnter={e=>{ const r=e.currentTarget.getBoundingClientRect(); setCmZHint({ x:r.right, y:r.top }); }}
            onMouseLeave={()=>setCmZHint(null)}>
            Impl. equity ($m)
          </span>
        </th><th>Vintage</th><th className="lbl">Source/basis</th></tr></thead>
        <tbody>
          {cmTable.map((r,i) => { const fromAi = !!(r.sourceUrl || r.sourceBasis || r.isEstimate); const sel = cmSelectedRow === (r.id || i); return (
          <tr key={r.id || i} className={'click'+(sel?' selrow':'')} onClick={()=>{ setCmSelectedRow(r.id || i); setA({ mult: { ...A.mult, sector: undefined, value: +r.median || A.mult.value } }); }}>
            <td><button type="button" className="btn" style={{ background:'var(--teal)', borderColor:'var(--teal)', padding:'3px 4px', fontSize:11, width:50, boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>{ e.stopPropagation(); removeCmRow(i); }}>Remove</button></td>
            <td className="lbl">{fromAi ? r.category : <input className="ninp" style={{ width:'100%', textAlign:'left' }} value={r.category} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{category:e.target.value})} />}</td>
            <td className="n">{fromAi ? mx(r.rangeLow) : <input className="ninp" style={{ width:60 }} type="number" step="0.1" value={r.rangeLow} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{rangeLow:e.target.value})} />}</td>
            <td className="n">{fromAi ? mx(r.rangeHigh) : <input className="ninp" style={{ width:60 }} type="number" step="0.1" value={r.rangeHigh} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{rangeHigh:e.target.value})} />}</td>
            <td className="n">{fromAi ? mx(r.median,2) : <input className="ninp" style={{ width:60 }} type="number" step="0.1" value={r.median} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{median:e.target.value})} />}</td>
            <td className="n">{nf((V.m2.basis*(+r.median||0)*(1-A.mult.disc)-V.nd)/1000,1)}</td>
            <td>{fromAi ? (r.vintage||'—') : <input className="ninp" style={{ width:70 }} value={r.vintage||''} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{vintage:e.target.value})} />}</td>
            <td className="lbl">{fromAi ? (r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>{r.sourceBasis}</a> : r.sourceBasis) : <input className="ninp" style={{ width:'100%', textAlign:'left' }} value={r.sourceBasis||''} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{sourceBasis:e.target.value})} />}</td>
          </tr>); })}
          <tr className="warnrow">
            <td><button type="button" className="btn" style={{ padding:'3px 4px', fontSize:11, width:50, boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'center' }} disabled={cmSaving || !cmDraft.category} onClick={saveCmDraft}>{cmSaving ? '…' : 'Save'}</button></td>
            <td className="lbl"><input className="ninp" style={{ width:'100%', textAlign:'left' }} placeholder="Category" value={cmDraft.category} onChange={e=>setCmDraft(d=>({...d,category:e.target.value}))} /></td>
            <td className="n"><input className="ninp" style={{ width:60 }} type="number" step="0.1" value={cmDraft.rangeLow} onChange={e=>setCmDraft(d=>({...d,rangeLow:e.target.value}))} /></td>
            <td className="n"><input className="ninp" style={{ width:60 }} type="number" step="0.1" value={cmDraft.rangeHigh} onChange={e=>setCmDraft(d=>({...d,rangeHigh:e.target.value}))} /></td>
            <td className="n"><input className="ninp" style={{ width:60 }} type="number" step="0.1" value={cmDraft.median} onChange={e=>setCmDraft(d=>({...d,median:e.target.value}))} /></td>
            <td className="n"></td>
            <td><input className="ninp" style={{ width:70 }} placeholder="Vintage" value={cmDraft.vintage} onChange={e=>setCmDraft(d=>({...d,vintage:e.target.value}))} /></td>
            <td className="lbl"><input className="ninp" style={{ width:'100%', textAlign:'left' }} placeholder="Source/basis" value={cmDraft.sourceBasis} onChange={e=>setCmDraft(d=>({...d,sourceBasis:e.target.value}))} /></td>
          </tr>
        </tbody>
        <tfoot><tr><td colSpan="8">Add rows from "Research" (AI) with "Use", or fill in the bottom row and click "Save".</td></tr></tfoot>
      </table></div>
    </Panel>
    {cmModal}
    {cmResultModal}
    {cmZHint && <div style={{ position:'fixed', left: cmZHint.x, top: cmZHint.y, transform:'translate(-100%, -100%)', marginTop:-6, background:'var(--ink)', color:'#fff', borderRadius:8, boxShadow:'0 10px 30px rgba(0,0,0,.3)', padding:'8px 10px', fontSize:11, fontWeight:400, whiteSpace:'nowrap', zIndex:300, pointerEvents:'none' }}>
      Implied equity = Median × the company's EBITDA, million USD
    </div>}
  </>);
  if (print) return <div className="left">{body}</div>;
  return (<>
    <div className="left">{body}</div>
    <Insp>
      <div className="ihead">Adjustments <span>L6</span></div>
      <div className="ihero"><div className="big">{mUsd(V.eq)}</div><div className="lb">Weighted equity value</div>
        <div className="sub">Firm value {mUsd(V.ev)}. Range {mUsd(Math.min(V.m1.eq,V.m2.eq,V.m3.eq))} – {mUsd(Math.max(V.m1.eq,V.m2.eq,V.m3.eq))}.</div></div>
      <div className="iblk iblk-left"><h4>Discount rate (WACC)</h4>
        <Toggle checked={A.wacc.manual} onChange={v=>setW({ manual:v, value: v ? W.built : A.wacc.value })} title="Enter WACC directly" desc="When off, it is computed from components." />
        {A.wacc.manual ? <NumField label="WACC" value={A.wacc.value} pct step={0.0025} min={0.01} max={0.6} onChange={v=>setW({value:v})} /> : (<>
          <NumField label="Risk-free rate (USD)" value={A.wacc.rf} pct step={0.001} min={0} max={0.2} onChange={v=>setW({rf:v})} />
          <NumField label="Market risk premium" value={A.wacc.erp} pct step={0.0025} min={0} max={0.2} onChange={v=>setW({erp:v})} />
          <NumField label="Country risk premium" value={A.wacc.crp} pct step={0.0025} min={0} max={0.2} onChange={v=>setW({crp:v})} />
          <NumField label="Unlevered beta" value={A.wacc.betaU} step={0.05} digits={2} min={0.1} max={3} onChange={v=>setW({betaU:v})} />
          <NumField label="Size and liquidity premium" value={A.wacc.size} pct step={0.0025} min={0} max={0.2} onChange={v=>setW({size:v})} />
          <NumField label="Cost of debt (USD, pre-tax)" value={A.wacc.kd} pct step={0.0025} min={0} max={0.5} onChange={v=>setW({kd:v})} />
          <NumField label="Target debt / equity" value={A.wacc.de} step={0.05} digits={2} unit="x" min={0} max={5} onChange={v=>setW({de:v})} />
          <div className="ical">
            <span className="k">Levered beta</span><span className="v">{nf(W.betaL,2)}</span>
            <span className="k">Cost of equity</span><span className="v">{pc(W.ke)}</span>
            <span className="k">After-tax cost of debt</span><span className="v">{pc(W.kdAfter)}</span>
            <span className="k">Debt weight</span><span className="v">{pc(W.wd)}</span>
            <span className="k tot">WACC</span><span className="v tot">{pc(W.value)}</span>
          </div></>)}
      </div>
      <div className="iblk iblk-left"><h4>Terminal value</h4>
        <Seg small value={A.tvMethod} onChange={v=>setA({tvMethod:v})} options={[{v:'gordon',l:'Perpetual growth'},{v:'exit',l:'Exit multiple'}]} />
        {A.tvMethod==='gordon' ? <NumField label="Terminal growth" value={A.tg} pct step={0.0025} min={-0.05} max={0.1} onChange={v=>setA({tg:v})} />
          : <NumField label="Exit EBITDA multiple" value={A.exitMult} step={0.25} digits={2} unit="x" min={1} max={30} onChange={v=>setA({exitMult:v})} />}
        <Toggle checked={A.midYear} onChange={v=>setA({midYear:v})} title="Mid-year convention" desc="Assumes cash flows are spread evenly through the year." />
      </div>
      <div className="iblk iblk-left"><h4>Market multiple</h4>
        <NumField label="EV / EBITDA" value={A.mult.value} step={0.25} digits={2} unit="x" min={0.5} max={40} onChange={v=>setA({mult:{...A.mult, value:v}})} />
        <Seg small value={A.mult.basis} onChange={v=>setA({mult:{...A.mult, basis:v}})} options={[{v:'ltm',l:`${B.year} normalized`},{v:'fwd',l:`${B.year+1}F forward`}]} />
        <NumField label="Liquidity / size discount" value={A.mult.disc} pct step={0.05} min={0} max={0.9} onChange={v=>setA({mult:{...A.mult, disc:v}})} />
      </div>
      <div className="iblk iblk-left"><h4>Net assets</h4>
        <NumField label="Fair value adjustment ($k)" value={+A.na.uplift||0} step={100} digits={0} min={-1e9} max={1e9} hint="Difference between appraised and book value of land, buildings and machinery" onChange={v=>setA({na:{...A.na, uplift:v}})} />
        <Toggle checked={A.na.excludeIntang} onChange={v=>setA({na:{...A.na, excludeIntang:v}})} title="Exclude intangible assets" desc="Rights and leasehold improvements may not retain value after a sale." />
      </div>
      <div className="iblk iblk-left"><h4>Method weights</h4>
        <NumField label="Discounted cash flow" value={A.weights.dcf} pct step={0.05} min={0} max={1} onChange={v=>setA({weights:{...A.weights, dcf:v}})} />
        <NumField label="EBITDA multiple" value={A.weights.mult} pct step={0.05} min={0} max={1} onChange={v=>setA({weights:{...A.weights, mult:v}})} />
        <NumField label="Net assets" value={A.weights.na} pct step={0.05} min={0} max={1} onChange={v=>setA({weights:{...A.weights, na:v}})} />
        {Math.abs(ws-1)>0.001 && <p className="muted small">Weights sum to {pc(ws,0)}; the result is scaled to 100%.</p>}
      </div>
      <div className="inote">The discount rate is the single strongest driver of value. Breaking it into components and documenting it strengthens your position in negotiation.</div>
    </Insp>
  </>);
}

export function L7Audit({ hist, st, up, V, audit, print, setPrinting }){
  const [flt, setFlt] = useState('all');
  const F = audit.findings.filter(f => flt==='all' || (flt==='open' && !f.closed) || (flt==='crit' && f.sev==='crit'));
  const toggle = id => up(s => ({ closed: s.closed.includes(id) ? s.closed.filter(x=>x!==id) : [...s.closed, id] }));
  const sevL = { crit:'Critical', warn:'Warn', info:'Info' };
  const body = (
    <Panel title="Audit findings" sub={`${audit.findings.filter(f=>!f.closed).length} open`} right={!print && <Seg small value={flt} onChange={setFlt} options={[{v:'all',l:'All'},{v:'open',l:'Open'},{v:'crit',l:'Critical'}]} />} flush>
      {F.length===0 ? <Empty title="No findings">No findings match this filter.</Empty> : (
        <ul className="findings">{F.map(f => (
          <li key={f.id} className={'f-'+f.sev+(f.closed?' closed':'')}>
            <div className="fh"><span className={'sev '+f.sev}>{sevL[f.sev]}</span><Tag>{f.layer}</Tag><b>{f.title}</b>
              {!print && <button className="lnk" onClick={()=>toggle(f.id)}>{f.closed ? 'Reopen' : 'Close'}</button>}</div>
            <p style={{width:'70%', marginLeft:90, marginRight:'auto', textAlign:'left'}}>{f.detail}</p><p className="fix" style={{width:'70%', marginLeft:90, marginRight:'auto', textAlign:'left'}}>{f.fix}</p>
          </li>))}</ul>)}
    </Panel>
  );
  if (print) return <div className="left">{body}</div>;
  const score = audit.score;
  return (<>
    <div className="left">{body}</div>
    <Insp>
      <div className="ihead">Output <span>L7</span></div>
      <div className="ihero"><div className="big">{score.toFixed(1)} / 10</div><div className="lb">Conditional confidence score</div>
        <div className="meter"><i style={{width: (score*10)+'%'}} className={score>=7?'ok':score>=4?'wn':'er'} /></div>
        <div className="sub">The score does not say the value is wrong; it shows where it needs to be supported by evidence.</div></div>
      <div className="iblk"><h4>Output package</h4>
        <button className="ibtn" disabled={!hist.length} onClick={()=>exportWorkbook({ company:st.company, hist, V, A:st.asm, audit })}>Download Excel workbook</button>
        <button className="ibtn ghost" disabled={!V} onClick={()=>setPrinting(true)}>Print report or save as PDF</button>
      </div>
      <div className="iblk"><h4>Actions</h4>
        <button className="ibtn ghost" onClick={()=>up({ closed: audit.findings.map(f=>f.id) })}>Close all findings</button>
        <button className="ibtn ghost" onClick={()=>up({ closed: [] })}>Reopen findings</button>
      </div>
      <div className="inote">The Excel package includes the balance sheet, income statement, USD summary, projection, valuation, assumptions and audit sheets. Closed findings appear in the report as a correction record.</div>
    </Insp>
  </>);
}
