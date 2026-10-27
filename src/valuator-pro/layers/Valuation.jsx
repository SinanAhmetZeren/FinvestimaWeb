import { useState, useEffect } from 'react';
import { Panel, Seg, Toggle, Tag, Empty, FinTable, NumField, nf, pc, mx, mUsd, Insp } from '../ui.jsx';
import { RevenueChart, FootballField, Bridge } from '../charts.jsx';
import { applyScenario, SECTOR_MULTIPLES, defaultAssumptions } from '../engine/valuation.js';
import { cogsMix } from '../engine/statements.js';
import { exportWorkbook } from '../engine/exportXlsx.js';
import { useStartComparableMultiplesMutation, useLazyGetComparableMultiplesJobQuery, useGetLatestComparableMultiplesJobQuery, useGetComparableMultiplesTableQuery, useSaveComparableMultiplesTableMutation, useSaveAssumptionsMutation } from '../../slices/ValuatorProSlice.js';

// JSON.stringify anahtar sırasına duyarlı — asm objeleri farklı sırada üretilebildiği için
// "kaydedilmişle aynı mı" kontrolü bu stabil (anahtarları sıralanmış) sürümle yapılır.
const stableStringify = v => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
};

const noVal = <div className="left"><Empty title="Değerleme için tarihsel veri gerekli">L1'de en az bir yıllık mizan ya da beyanname yükleyin.</Empty></div>;
const COSTS = [['mat','Malzeme'],['lab','Direkt işçilik'],['ovh','Genel üretim (amort. hariç)'],['psd','Pazarlama, satış, dağıtım'],['ga','Genel yönetim'],['rnd','Ar-Ge']];

export function L5Assumptions({ hist, st, up, V, rr, print }){
  const [saveAssumptionsMut, { isLoading: savingAsm }] = useSaveAssumptionsMutation();
  const [resetConfirm, setResetConfirm] = useState(false);
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
  const head = [...H3.map(h=>({ l:String(h.year), cls:'hcol' })), ...P.rows.map(r=>({ l:String(r.year)+'T', cls:'pcol' }))];
  const band = [{ l:'Gerçekleşen', span:H3.length }, { l:'Projeksiyon', span:P.rows.length, cls:'pj' }];
  const row = (l, hk, pk, cls, f) => ({ l, v:[...HU.map(x=> typeof hk==='function' ? hk(x) : x[hk]), ...P.rows.map(r=> typeof pk==='function' ? pk(r) : r[pk])], cls, f });
  const rows = [
    row('Net satışlar','rev','rev','sub'),
    { l:'Büyüme', v:[...HU.map((x,i)=> i ? x.rev/HU[i-1].rev-1 : null), ...P.rows.map(r=>r.g)], f:pc, cls:'dim' },
    row('Malzeme (−)', x=>-x.mat, r=>-r.mat, 'kid'),
    row('Direkt işçilik (−)', x=>-x.lab, r=>-r.lab, 'kid'),
    row('Genel üretim (−)', x=>-x.ovh, r=>-r.ovh, 'kid'),
    row('Pazarlama, satış, dağıtım (−)', x=>-x.psd, r=>-r.psd, 'kid'),
    row('Genel yönetim (−)', x=>-x.ga, r=>-r.ga, 'kid'),
    ...(A.costs.rnd.s||A.costs.rnd.e ? [row('Ar-Ge (−)', x=>-x.rnd, r=>-r.rnd, 'kid')] : []),
    row('FAVÖK (normalize)','ebitda','ebitda','hero'),
    { l:'FAVÖK marjı', v:[...HU.map(x=>x.ebitda/x.rev), ...P.rows.map(r=>r.margin)], f:pc, cls:'dim' },
    row('Amortisman (−)', x=>-x.da, r=>-r.da, 'kid'),
    row('FVÖK', 'ebit', 'ebit', 'sub'),
    row('Vergi (FVÖK üzerinden) (−)', ()=>null, r=>-r.tax, 'kid'),
    row('NOPLAT', ()=>null, 'noplat', 'sub'),
    row('Yatırımlar (−)', ()=>null, r=>-r.capex, 'kid'),
    row('Net işletme sermayesi', 'nwc', 'nwc', 'dim'),
    row('NİS değişimi (−)', ()=>null, r=>-r.dnwc, 'kid'),
    row('Serbest nakit akımı (FCFF)', ()=>null, 'fcf', 'sum'),
    { spacer:true },
    row('Finansman gideri (bilgi)', ()=>null, r=>-r.interest, 'dim'),
    row('Net kâr (bilgi)', ()=>null, 'netIncome', 'dim'),
    { l:'ROIC (açılış sermayesine göre)', v:[...HU.map(()=>null), ...P.rows.map(r=>r.roic)], f:pc, cls:'dim' },
  ];
  const avg = k => HU.reduce((s,x)=>s+x[k]/x.rev,0)/HU.length;
  const rng = k => [Math.min(...HU.map(x=>x[k]/x.rev)), Math.max(...HU.map(x=>x[k]/x.rev))];
  const drv = [
    ...COSTS.filter(([k])=>k!=='rnd'||A.costs.rnd.s).map(([k,n]) => ({ n:n+' / ciro', h:avg(k), r:rng(k), y0:A.costs[k].s, y1:P.rows[0][k]/P.rows[0].rev, yn:A.costs[k].e, inv:true })),
    { n:'Yatırım / ciro', h: HU.reduce((s,x)=>s+x.da/x.rev,0)/HU.length, r:null, y0:B.da/B.rev, y1:A.capexPct, yn:A.capexPct, note:'tarihsel değer amortisman / ciro' },
    { n:'NİS / ciro', h:avg('nwc'), r:rng('nwc'), y0:B.nwc/B.rev, y1:A.nwcPct, yn:A.nwcPct },
  ];
  const cagr = hist.length>1 ? Math.pow(hist[hist.length-1].usd.rev/hist[0].usd.rev, 1/(hist[hist.length-1].year-hist[0].year))-1 : null;

  const body = (<>
    <Panel title="Projeksiyon" sub="bin USD; gerçekleşen yıllar normalize" flush>
      <FinTable head={head} band={band} rows={rows} note={`Baz yıl ${B.year}. Maliyet oranları başlangıçtan hedefe doğrusal ilerler. Yeni yatırımlar ${A.daLife} yılda amortismana tabi tutulur. ${A.midYear?'Nakit akımları yıl ortasında gerçekleşmiş kabul edilir.':''}`} />
    </Panel>
    <div className="two">
      <Panel title="Ciro ve FAVÖK marjı" sub="gerçekleşen ve projeksiyon"><RevenueChart data={[...H3.map((h,i)=>({ l:String(h.year), rev:HU[i].rev, margin:HU[i].ebitda/HU[i].rev })), ...P.rows.map(r=>({ l:String(r.year), rev:r.rev, margin:r.margin, proj:true }))]} /></Panel>
      <Panel title="Sürücü sınaması" sub="her varsayım son üç yılla karşılaştırılır" flush>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th className="lbl">Sürücü</th><th className="n">Tarihsel ort.</th><th className="n">Baz yıl</th><th className="n">Hedef</th><th></th></tr></thead>
          <tbody>{drv.map(d => { const out = d.r && (d.yn < d.r[0]-0.02 || d.yn > d.r[1]+0.02); return (
            <tr key={d.n}><td className="lbl">{d.n}</td><td className="n">{pc(d.h)}</td><td className="n">{pc(d.y0)}</td><td className="n">{pc(d.yn)}</td>
              <td>{out ? <Tag c="gold">aralık dışı</Tag> : <Tag c="green">aralıkta</Tag>}</td></tr>); })}
            <tr><td className="lbl">Ortalama büyüme</td><td className="n">{pc(cagr)}</td><td className="n">—</td><td className="n">{pc(A.growth.slice(0,A.N).reduce((s,g)=>s+g,0)/A.N)}</td><td>{cagr!=null && A.growth[0]>cagr+0.05 ? <Tag c="gold">iddialı</Tag> : <Tag c="green">makul</Tag>}</td></tr>
          </tbody></table></div>
      </Panel>
    </div>
  </>);
  if (print) return <div className="left">{body}</div>;
  return (<>
    <div className="left">{body}</div>
    <Insp>
      <div className="ihead">Sürücüler <span>L5</span></div>
      <div className="iblk"><h4>Senaryo ve süre</h4>
        <Seg value={A.scenario} onChange={k=>up(s=>({ asm: applyScenario(s.asm, k, s.baseAsm) }))} options={[{v:'pess',l:'Kötümser'},{v:'base',l:'Baz'},{v:'opt',l:'İyimser'}]} />
        <div className="gap" />
        <Seg value={A.N} onChange={n=>setA({N:n})} options={[{v:5,l:'5 yıl'},{v:7,l:'7 yıl'}]} />
        <p className="muted small" style={{ opacity: A.scenario==='custom' ? 1 : 0, margin:'8px 0 0' }}>Sürücüler elle değiştirildi.</p>
      </div>
      <div className="iblk"><h4>Gelir büyümesi (USD)</h4>
        {rr && <Toggle checked={A.y1Mode==='runrate'} onChange={v=>setA({y1Mode: v?'runrate':'growth'})} title={`${B.year+1} cirosunu aylık rapordan türet`}
          desc={`${rr.months} aylık gerçekleşme × ${nf(A.runRateFactor||rr.factor,2)} yıllıklandırma × ${nf(rr.recon,3)} mizan mutabakatı = ${nf(rr.usd*(A.runRateFactor||rr.factor)*rr.recon)} bin USD`} />}
        {A.y1Mode==='runrate' && rr && <NumField label="Yıllıklandırma katsayısı" value={A.runRateFactor||rr.factor} step={0.05} digits={2} unit="x" min={1} max={12} onChange={v=>setA({runRateFactor:v})} />}
        {Array.from({length:A.N},(_,i)=> (i===0 && A.y1Mode==='runrate') ? null : (
          <NumField key={i} label={`${B.year+i+1}`} value={A.growth[i]} pct step={0.01} min={-0.5} max={1} onChange={v=>{ const g=[...A.growth]; g[i]=v; setA({growth:g}); }} />))}
        <button className="lnk" onClick={()=>setA({ growth: A.growth.map(()=>A.growth[A.y1Mode==='runrate'?1:0]) })}>İlk değeri tüm yıllara uygula</button>
      </div>
      <div className="iblk"><h4>Maliyet / ciro hedefi ({B.year+A.N})</h4>
        {COSTS.filter(([k])=>k!=='rnd'||A.costs.rnd.s>0).map(([k,n]) => (
          <NumField key={k} label={<>{n}<span className="from"> baz {pc(A.costs[k].s)}</span></>} value={A.costs[k].e} pct step={0.005} min={0} max={1}
            onChange={v=>setA({ costs: { ...A.costs, [k]: { ...A.costs[k], e:v } } })} />))}
        <div className="ical"><span className="k">{B.year+A.N} FAVÖK marjı</span><span className="v">{pc(P.rows[P.rows.length-1].margin)}</span></div>
      </div>
      <div className="iblk iblk-left"><h4>Yatırım, sermaye, vergi</h4>
        <NumField label="Yatırım / ciro" value={A.capexPct} pct step={0.005} min={0} max={0.5} onChange={v=>setA({capexPct:v})} />
        <NumField label="NİS / ciro" value={A.nwcPct} pct step={0.01} min={-0.5} max={1} onChange={v=>setA({nwcPct:v})} />
        <NumField label="Yeni yatırım ömrü" value={A.daLife} step={1} digits={0} unit="yıl" min={2} max={50} onChange={v=>setA({daLife:v})} />
        <NumField label="Mevcut amortisman azalışı" value={A.daFade} pct step={0.05} min={0} max={1} hint="Mevcut varlıkların amortismanının yıllık azalma hızı" onChange={v=>setA({daFade:v})} />
        <NumField label="Kurumlar vergisi" value={A.taxRate} pct step={0.01} min={0} max={0.5} onChange={v=>setA({taxRate:v})} />
      </div>
      <div className="iblk">
        <button className="ibtn" disabled={savingAsm || !st.valuationTaskId || stableStringify(A)===stableStringify(st.savedAsm)}
          onClick={()=>saveAssumptionsMut({ valuationTaskId: st.valuationTaskId, assumptions: A }).then(()=>up({ savedAsm: A }))}>{savingAsm?'Kaydediliyor…':'Kaydet'}</button>
        <button className="ibtn ghost" onClick={()=>setResetConfirm(true)}>Varsayımları baza döndür</button>
      </div>
      <div className="inote">Varsayılanlar baz yılın gerçekleşmesidir; marj iyileşmesi kendiliğinden varsayılmaz. Hedef değiştirildiğinde sürücü sınaması tarihsel aralıkla karşılaştırır.</div>
      {resetConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setResetConfirm(false)}>
          <div style={{ background:'#fff', borderRadius:10, width:'min(380px, 92vw)', boxShadow:'0 20px 60px rgba(0,0,0,.3)', padding:'20px 22px' }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ margin:'0 0 8px', fontSize:15 }}>Varsayımları baza döndür</h3>
            <p className="muted small" style={{ margin:'0 0 18px' }}>Tüm manuel değişiklikler geri alınacak. Veritabanına yazmak için Kaydet'e basmanız gerekmektedir.</p>
            <div style={{ display:'flex', gap:8 }}>
              <button className="ibtn ghost" style={{ flex:1, marginTop:0 }} onClick={()=>setResetConfirm(false)}>Vazgeç</button>
              <button className="ibtn" style={{ flex:1, marginTop:0, background:'var(--red)', borderColor:'var(--red)' }}
                onClick={()=>{ const D = { ...defaultAssumptions(hist), _base: B.year }; up({ asm:D, baseAsm:D }); setResetConfirm(false); }}>Geri al</button>
            </div>
          </div>
        </div>
      )}
    </Insp>
  </>);
}

const CM_POLL_COLORS = { Starting: 'var(--gold)', Pending: 'var(--faint)', Processing: 'var(--teal)', Completed: 'var(--green)', Failed: 'var(--red)' };
const CM_POLL_LABELS = { Starting: 'Başlatılıyor…', Pending: 'Sırada…', Processing: 'Araştırılıyor…' };

export function L6Valuation({ hist, st, up, V, print }){
  const [saveAssumptionsMut, { isLoading: savingAsm }] = useSaveAssumptionsMutation();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [startComparableMultiples] = useStartComparableMultiplesMutation();
  const [fetchComparableMultiplesJob] = useLazyGetComparableMultiplesJobQuery();
  const [cmOpen, setCmOpen] = useState(false);
  const [cmForm, setCmForm] = useState({ sectorSubSector: '', yearlySales: '', region: '', country: '' });
  const [cmRows, setCmRows] = useState(null);
  const [cmResultOpen, setCmResultOpen] = useState(false);
  const [cmError, setCmError] = useState(null);
  const [cmStatus, setCmStatus] = useState(null); // null | Starting | Pending | Processing | Completed | Failed
  const cmLoading = cmStatus === 'Starting' || cmStatus === 'Pending' || cmStatus === 'Processing';

  // L6 Emsal çarpanlar tablosu — task başına kalıcı, boş başlar. AI popup'tan "Kullan" ya da elle
  // eklenen satırlar sadece burada (local) tutulur; "Kaydet" tüm tabloyu DB'ye yazar.
  const { data: cmTableData } = useGetComparableMultiplesTableQuery(st.valuationTaskId, { skip: !st.valuationTaskId });
  const [saveComparableMultiplesTable, { isLoading: cmSaving }] = useSaveComparableMultiplesTableMutation();
  const [cmTable, setCmTable] = useState([]);
  const CM_EMPTY_DRAFT = { category: '', rangeLow: '', rangeHigh: '', median: '', vintage: '', sourceBasis: '', sourceUrl: null, isEstimate: false };
  const [cmDraft, setCmDraft] = useState(CM_EMPTY_DRAFT);
  const [cmUsedAiRows, setCmUsedAiRows] = useState({}); // ai row index -> persisted row id, so the popup can show "Kaldır"
  const [cmSelectedRow, setCmSelectedRow] = useState(null); // selected Emsal çarpanlar row id/index — highlights row, applies its median
  const [cmZHint, setCmZHint] = useState(null); // "Z. Özkaynak" başlığı hover popup'ı — {x,y} ya da null
  useEffect(() => { if (cmTableData) setCmTable(cmTableData); }, [cmTableData]);

  // Sayfa yenilenince son tamamlanmış AI araştırmasını geri yükle (sadece henüz bu oturumda yeni
  // bir araştırma çalıştırılmadıysa — cmRows null iken).
  const { data: cmLatestJob } = useGetLatestComparableMultiplesJobQuery(st.valuationTaskId, { skip: !st.valuationTaskId });
  useEffect(() => { if (cmLatestJob?.result && cmRows === null) setCmRows(cmLatestJob.result.rows); }, [cmLatestJob, cmRows]);

  // "Kullan"/"Kaldır" durumu kalıcı bir alanla değil, AI satırını (kategori+medyan) persisted
  // tablodaki satırlarla eşleştirerek türetiliyor — sayfa yenilense de doğru görünür.
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
      alert('Kaydedilemedi: ' + (e.data || e.message || 'bilinmeyen hata'));
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
      if (job.status === 'Failed') throw new Error(job.errorMessage || 'Gemini işlemi başarısız oldu.');
      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error('İşlem zaman aşımına uğradı.');
  };
  const runComparableMultiples = async () => {
    setCmError(null);
    setCmStatus('Starting');
    console.log('[comparable-multiples] starting job', { ...cmForm, ebitda: V.m2.basis });
    try {
      const { jobId } = await startComparableMultiples({ valuationTaskId: st.valuationTaskId, ...cmForm, yearlySales: +cmForm.yearlySales || 0, ebitda: V.m2.basis, language: 'tr' }).unwrap();
      const job = await pollComparableMultiplesJob(jobId);
      console.log('[comparable-multiples] success', job.result);
      setCmRows(job.result.rows);
      setCmUsedAiRows({});
      setCmOpen(false);
      setCmResultOpen(true);
    } catch (e) {
      console.error('[comparable-multiples] failed', e);
      setCmError(e.data || e.message || 'Gemini isteği başarısız oldu.');
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
          <h3 style={{ margin:0, fontSize:14, color:'var(--navy)' }}>Emsal çarpanlar</h3>
          <button type="button" onClick={()=>setCmOpen(false)} aria-label="Kapat"
            style={{ border:0, background:'none', fontSize:18, lineHeight:1, cursor:'pointer', color:'var(--muted)' }}>×</button>
        </div>
        <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>
          {cmField('Sektör / alt sektör', 'örn. otomotiv yedek parça (fren balatası)', 'sectorSubSector')}
          {cmField('Yıllık ciro (USD)', '', 'yearlySales', true)}
          {cmField('Bölge', 'örn. EU', 'region')}
          {cmField('Ülke', 'örn. Almanya', 'country')}
          {cmError && <p className="muted small" style={{ color:'var(--red)', margin:0 }}>{String(cmError)}</p>}
          <button type="button" className="btn" disabled={cmLoading} onClick={runComparableMultiples} style={{
            width:'100%',
            ...(cmLoading ? {
              background: CM_POLL_COLORS[cmStatus] || 'var(--navy)', borderColor: CM_POLL_COLORS[cmStatus] || 'var(--navy)',
              animation: 'box-pulse 1.2s ease infinite',
            } : {}),
          }}>{cmLoading ? (CM_POLL_LABELS[cmStatus] || cmStatus) : 'Araştır'}</button>
        </div>
      </div>
    </div>
  );
  const cmResultModal = cmResultOpen && cmRows && (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setCmResultOpen(false)}>
      <div style={{ background:'#fff', borderRadius:10, width:'min(1100px, 95vw)', maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', textAlign:'left' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--line)' }}>
          <h3 style={{ margin:0, fontSize:14, color:'var(--navy)' }}>Emsal çarpanlar (AI) — EV / FAVÖK</h3>
          <button type="button" onClick={()=>setCmResultOpen(false)} aria-label="Kapat"
            style={{ border:0, background:'none', fontSize:18, lineHeight:1, cursor:'pointer', color:'var(--muted)' }}>×</button>
        </div>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th></th><th className="lbl">Kategori</th><th className="n">Aralık</th><th className="n">Medyan</th><th>Dönem</th><th className="lbl">Kaynak/baz</th></tr></thead>
          <tbody>{cmRows.map((r,i) => (
            <tr key={i}>
              <td>{cmUsedAiRows[i] != null
                ? <button type="button" className="btn" style={{ background:'var(--teal)', borderColor:'var(--teal)', padding:'3px 10px', fontSize:11 }} disabled={cmSaving} onClick={()=>removeAiRow(i)}>Kaldır</button>
                : <button type="button" className="btn" style={{ padding:'3px 10px', fontSize:11 }} disabled={cmSaving} onClick={()=>applyAiRow({ category: r.category, rangeLow: r.rangeLow, rangeHigh: r.rangeHigh, median: r.median, vintage: r.vintage, sourceBasis: r.sourceBasis, sourceUrl: r.sourceUrl, isEstimate: r.isEstimate })}>Kullan</button>}</td>
              <td className="lbl">{r.category}</td>
              <td className="n">{mx(r.rangeLow)} – {mx(r.rangeHigh)}</td>
              <td className="n">{mx(r.median,2)}</td>
              <td>{r.vintage}</td>
              <td className="lbl">{r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noreferrer">{r.sourceBasis}</a> : r.sourceBasis}</td>
            </tr>))}</tbody>
          <tfoot><tr><td colSpan="6">Gemini tarafından oluşturuldu — figürler AI tahminidir, kullanmadan önce doğrulayın. "Kullan" seçilen satırı doğrudan Emsal çarpanlar tablosuna ekleyip kaydeder.</td></tr></tfoot>
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
    { l:'İndirgenmiş nakit akımı', lo: Math.min(...dcfVals), hi: Math.max(...dcfVals), mid: V.m1.eq },
    { l:'FAVÖK çarpanı', lo: V.m2.basis*(sec?.lo ?? A.mult.value-1)*(1-A.mult.disc) - V.nd, hi: V.m2.basis*(sec?.hi ?? A.mult.value+1)*(1-A.mult.disc) - V.nd, mid: V.m2.eq },
    { l:'Net aktifler', lo: Math.min(B.equity-B.intang, V.m3.eq), hi: Math.max(B.equity + (+A.na.uplift||0), V.m3.eq), mid: V.m3.eq },
  ];
  const cards = [
    { k:'dcf', n:'İndirgenmiş nakit akımı', ev:V.m1.ev, eq:V.m1.eq, d:`WACC ${pc(P.w)}, ${A.tvMethod==='exit' ? 'çıkış '+mx(A.exitMult) : 'g '+pc(A.tg)}, terminal payı ${pc(V.D.tvShare,0)}` },
    { k:'mult', n:'FAVÖK çarpanı', ev:V.m2.ev, eq:V.m2.eq, d:`${mx(A.mult.value)} × ${A.mult.basis==='fwd'?(B.year+1)+'T':B.year} FAVÖK ${nf(V.m2.basis)}${A.mult.disc?`, %${nf(A.mult.disc*100)} iskonto`:''}` },
    { k:'na', n:'Net aktifler', ev:V.m3.ev, eq:V.m3.eq, d:`${B.year} özkaynak${A.na.uplift?` + ${nf(A.na.uplift)} rayiç farkı`:''}${A.na.excludeIntang?', MODV hariç':''}` },
  ];
  const fcfHead = P.rows.map(r=>({ l:String(r.year)+'T' }));
  const fcfRows = [
    { l:'FAVÖK', v:P.rows.map(r=>r.ebitda), cls:'sub' }, { l:'Amortisman (−)', v:P.rows.map(r=>-r.da), cls:'kid' },
    { l:'FVÖK', v:P.rows.map(r=>r.ebit) }, { l:'Vergi (−)', v:P.rows.map(r=>-r.tax), cls:'kid' }, { l:'NOPLAT', v:P.rows.map(r=>r.noplat), cls:'sub' },
    { l:'Amortisman (+)', v:P.rows.map(r=>r.da), cls:'kid' }, { l:'Yatırımlar (−)', v:P.rows.map(r=>-r.capex), cls:'kid' }, { l:'NİS değişimi (−)', v:P.rows.map(r=>-r.dnwc), cls:'kid' },
    { l:'Serbest nakit akımı (FCFF)', v:P.rows.map(r=>r.fcf), cls:'sum' },
    { l:'İskonto katsayısı', v:P.rows.map(r=>r.df), f:x=>nf(x,3), cls:'dim' }, { l:'Bugünkü değer', v:P.rows.map(r=>r.pv), cls:'sub' },
    { spacer:true },
    { l:'Açılış yatırılmış sermaye', v:P.rows.map(r=>r.icOpen), cls:'dim' }, { l:'ROIC', v:P.rows.map(r=>r.roic), f:pc, cls:'dim' }, { l:'Ekonomik katma değer (EVA)', v:P.rows.map(r=>r.eva), cls:'dim' },
  ];
  const pickSens = (w, g) => setA({ tg: g, tvMethod:'gordon', wacc: { ...A.wacc, manual:true, value:w } });

  const body = (<>
    <div className="methods">
      {cards.map(c => (
        <div className="mcard" key={c.k}>
          <span className="mn">{c.n}</span>
          <b>{mUsd(c.eq)}</b><span className="ml">özkaynak değeri</span>
          <span className="mev">Firma değeri {mUsd(c.ev)}</span>
          <span className="md">{c.d}</span>
          <span className="mw">Ağırlık {pc(A.weights[c.k]/ws,0)}</span>
        </div>))}
      <div className="mcard hero">
        <span className="mn">Ağırlıklı sonuç</span>
        <b>{mUsd(V.eq)}</b><span className="ml">özkaynak değeri</span>
        <span className="mev">Firma değeri {mUsd(V.ev)}, net borç {mUsd(V.nd)}</span>
        <span className="md">Zımni {mx(V.impliedMult)} FAVÖK, {mx(V.impliedSales,2)} ciro. Potansiyel şerefiye {mUsd(V.goodwill)}.</span>
      </div>
    </div>
    <Panel title="Değer aralıkları" sub="özkaynak değeri; çubuk duyarlılık ya da emsal aralığını, çizgi seçili değeri gösterir">
      <FootballField items={ff} marker={V.eq} />
    </Panel>
    <Panel title="Nakit akımı ve değer köprüsü" sub="bin USD" flush>
      <FinTable head={fcfHead} rows={fcfRows} />
      <div className="pbody"><Bridge steps={[{l:'BD nakit akımı',v:V.D.pvSum},{l:'BD terminal değer',v:V.D.pvTv},{l:'Firma değeri',v:V.D.ev,total:true},{l:'Net borç',v:-V.nd},{l:'Özkaynak',v:V.m1.eq,total:true}]} />
        <p className="muted small">Terminal değer {nf(V.D.tv)} bin USD ({A.tvMethod==='exit' ? `zımni büyüme ${pc(V.D.impliedG)}` : `zımni çıkış çarpanı ${mx(V.D.impliedExit)}`}). Ortalama ROIC {pc(V.avgRoic)}, WACC {pc(P.w)}: {V.avgRoic>P.w ? 'büyüme değer yaratıyor.' : 'getiri sermaye maliyetinin altında; büyüme değeri azaltıyor.'}</p></div>
    </Panel>
    <div className="two">
      <Panel title="Duyarlılık: WACC ve terminal büyüme" sub={print?'özkaynak, M USD':'hücreye tıklayarak varsayımı seçin; özkaynak, M USD'} flush>
        <div className="scroll"><table className="g sens">
          <thead><tr className="hd solo"><th className="lbl">WACC \ g</th>{V.gSteps.map(g=><th key={g} className="n">{pc(g)}</th>)}</tr></thead>
          <tbody>{V.wSteps.map((w,i)=>(<tr key={w}><td className="lbl">{pc(w)}</td>{V.sens[i].map((v,j)=>(
            <td key={j} className={'n cell'+(i===2&&j===2?' sel':'')} onClick={()=>!print && pickSens(w, V.gSteps[j])}>{isFinite(v) ? nf(v/1000,1) : '—'}</td>))}</tr>))}</tbody>
        </table></div>
      </Panel>
      <Panel title="Duyarlılık: FAVÖK çarpanı" sub="özkaynak, M USD" flush>
        <div className="scroll"><table className="g sens">
          <thead><tr className="hd solo"><th className="lbl">FAVÖK tabanı</th>{V.multSteps.map(m=><th key={m} className="n">{mx(m)}</th>)}</tr></thead>
          <tbody>{[`${B.year} normalize`, `${B.year+1}T ileri`].map((l,i)=>(<tr key={l}><td className="lbl">{l}</td>{V.sensM[i].map((v,j)=><td key={j} className={'n'+(j===2&&((i===0)===(A.mult.basis!=='fwd'))?' sel':'')}>{nf(v/1000,1)}</td>)}</tr>))}</tbody>
        </table></div>
      </Panel>
    </div>
    <Panel title="Emsal çarpanlar" sub={print?'EV / FAVÖK':'satıra tıklayarak medyanı uygulayın; EV / FAVÖK'} flush
      right={!print && <>
        {cmRows && <button type="button" className="btn" style={{ background:'var(--teal)', borderColor:'var(--teal)', padding:'3px 10px', fontSize:11 }} onClick={()=>setCmResultOpen(true)}>Sonuçları gör</button>}
        <button type="button" className="btn" disabled={cmLoading} onClick={()=>setCmOpen(true)} style={{
          padding:'3px 10px', fontSize:11,
          ...(cmLoading ? {
            background: CM_POLL_COLORS[cmStatus] || 'var(--navy)', borderColor: CM_POLL_COLORS[cmStatus] || 'var(--navy)',
            animation: 'box-pulse 1.2s ease infinite',
          } : {}),
        }}>{cmLoading ? (CM_POLL_LABELS[cmStatus] || cmStatus) : 'Araştır'}</button>
      </>}>
      <div className="scroll"><table className="g">
        <thead><tr className="hd solo"><th></th><th className="lbl">Kategori</th><th className="n">Alt</th><th className="n">Üst</th><th className="n">Medyan</th><th className="n">
          <span style={{ cursor:'default' }}
            onMouseEnter={e=>{ const r=e.currentTarget.getBoundingClientRect(); setCmZHint({ x:r.right, y:r.top }); }}
            onMouseLeave={()=>setCmZHint(null)}>
            Z. Özkaynak (M$)
          </span>
        </th><th>Dönem</th><th className="lbl">Kaynak/baz</th></tr></thead>
        <tbody>
          {cmTable.map((r,i) => { const fromAi = !!(r.sourceUrl || r.sourceBasis || r.isEstimate); const sel = cmSelectedRow === (r.id || i); return (
          <tr key={r.id || i} className={'click'+(sel?' selrow':'')} onClick={()=>{ setCmSelectedRow(r.id || i); setA({ mult: { ...A.mult, sector: undefined, value: +r.median || A.mult.value } }); }}>
            <td><button type="button" className="btn" style={{ background:'var(--teal)', borderColor:'var(--teal)', padding:'3px 4px', fontSize:11, width:50, boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={e=>{ e.stopPropagation(); removeCmRow(i); }}>Kaldır</button></td>
            <td className="lbl">{fromAi ? r.category : <input className="ninp" style={{ width:'100%', textAlign:'left' }} value={r.category} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{category:e.target.value})} />}</td>
            <td className="n">{fromAi ? mx(r.rangeLow) : <input className="ninp" style={{ width:60 }} type="number" step="0.1" value={r.rangeLow} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{rangeLow:e.target.value})} />}</td>
            <td className="n">{fromAi ? mx(r.rangeHigh) : <input className="ninp" style={{ width:60 }} type="number" step="0.1" value={r.rangeHigh} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{rangeHigh:e.target.value})} />}</td>
            <td className="n">{fromAi ? mx(r.median,2) : <input className="ninp" style={{ width:60 }} type="number" step="0.1" value={r.median} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{median:e.target.value})} />}</td>
            <td className="n">{nf((V.m2.basis*(+r.median||0)*(1-A.mult.disc)-V.nd)/1000,1)}</td>
            <td>{fromAi ? (r.vintage||'—') : <input className="ninp" style={{ width:70 }} value={r.vintage||''} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{vintage:e.target.value})} />}</td>
            <td className="lbl">{fromAi ? (r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>{r.sourceBasis}</a> : r.sourceBasis) : <input className="ninp" style={{ width:'100%', textAlign:'left' }} value={r.sourceBasis||''} onClick={e=>e.stopPropagation()} onChange={e=>editCmRow(i,{sourceBasis:e.target.value})} />}</td>
          </tr>); })}
          <tr className="warnrow">
            <td><button type="button" className="btn" style={{ padding:'3px 4px', fontSize:11, width:50, boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'center' }} disabled={cmSaving || !cmDraft.category} onClick={saveCmDraft}>{cmSaving ? '…' : 'Kaydet'}</button></td>
            <td className="lbl"><input className="ninp" style={{ width:'100%', textAlign:'left' }} placeholder="Kategori" value={cmDraft.category} onChange={e=>setCmDraft(d=>({...d,category:e.target.value}))} /></td>
            <td className="n"><input className="ninp" style={{ width:60 }} type="number" step="0.1" value={cmDraft.rangeLow} onChange={e=>setCmDraft(d=>({...d,rangeLow:e.target.value}))} /></td>
            <td className="n"><input className="ninp" style={{ width:60 }} type="number" step="0.1" value={cmDraft.rangeHigh} onChange={e=>setCmDraft(d=>({...d,rangeHigh:e.target.value}))} /></td>
            <td className="n"><input className="ninp" style={{ width:60 }} type="number" step="0.1" value={cmDraft.median} onChange={e=>setCmDraft(d=>({...d,median:e.target.value}))} /></td>
            <td className="n"></td>
            <td><input className="ninp" style={{ width:70 }} placeholder="Dönem" value={cmDraft.vintage} onChange={e=>setCmDraft(d=>({...d,vintage:e.target.value}))} /></td>
            <td className="lbl"><input className="ninp" style={{ width:'100%', textAlign:'left' }} placeholder="Kaynak/baz" value={cmDraft.sourceBasis} onChange={e=>setCmDraft(d=>({...d,sourceBasis:e.target.value}))} /></td>
          </tr>
        </tbody>
        <tfoot><tr><td colSpan="8">"Araştır" (AI) sonuçlarında "Kullan" ya da elle doldurup en alttaki satırda "Kaydet"e basarak ekleyin.</td></tr></tfoot>
      </table></div>
    </Panel>
    {cmModal}
    {cmResultModal}
    {cmZHint && <div style={{ position:'fixed', left: cmZHint.x, top: cmZHint.y, transform:'translate(-100%, -100%)', marginTop:-6, background:'var(--ink)', color:'#fff', borderRadius:8, boxShadow:'0 10px 30px rgba(0,0,0,.3)', padding:'8px 10px', fontSize:11, fontWeight:400, whiteSpace:'nowrap', zIndex:300, pointerEvents:'none' }}>
      Zımni özkaynak = Medyan × firmanın FAVÖK'ü, milyon USD
    </div>}
  </>);
  if (print) return <div className="left">{body}</div>;
  return (<>
    <div className="left">{body}</div>
    <Insp>
      <div className="ihead">Uyarlamalar <span>L6</span></div>
      <div className="ihero"><div className="big">{mUsd(V.eq)}</div><div className="lb">Ağırlıklı özkaynak değeri</div>
        <div className="sub">Firma değeri {mUsd(V.ev)}. Aralık {mUsd(Math.min(V.m1.eq,V.m2.eq,V.m3.eq))} – {mUsd(Math.max(V.m1.eq,V.m2.eq,V.m3.eq))}.</div></div>
      <div className="iblk iblk-left"><h4>İskonto oranı (WACC)</h4>
        <Toggle checked={A.wacc.manual} onChange={v=>setW({ manual:v, value: v ? W.built : A.wacc.value })} title="WACC'yi doğrudan gir" desc="Kapalıyken bileşenlerden hesaplanır." />
        {A.wacc.manual ? <NumField label="WACC" value={A.wacc.value} pct step={0.0025} min={0.01} max={0.6} onChange={v=>setW({value:v})} /> : (<>
          <NumField label="Risksiz faiz (USD)" value={A.wacc.rf} pct step={0.001} min={0} max={0.2} onChange={v=>setW({rf:v})} />
          <NumField label="Piyasa risk primi" value={A.wacc.erp} pct step={0.0025} min={0} max={0.2} onChange={v=>setW({erp:v})} />
          <NumField label="Ülke risk primi" value={A.wacc.crp} pct step={0.0025} min={0} max={0.2} onChange={v=>setW({crp:v})} />
          <NumField label="Kaldıraçsız beta" value={A.wacc.betaU} step={0.05} digits={2} min={0.1} max={3} onChange={v=>setW({betaU:v})} />
          <NumField label="Ölçek ve likidite primi" value={A.wacc.size} pct step={0.0025} min={0} max={0.2} onChange={v=>setW({size:v})} />
          <NumField label="Borç maliyeti (USD, vergi öncesi)" value={A.wacc.kd} pct step={0.0025} min={0} max={0.5} onChange={v=>setW({kd:v})} />
          <NumField label="Hedef borç / özkaynak" value={A.wacc.de} step={0.05} digits={2} unit="x" min={0} max={5} onChange={v=>setW({de:v})} />
          <div className="ical">
            <span className="k">Kaldıraçlı beta</span><span className="v">{nf(W.betaL,2)}</span>
            <span className="k">Özkaynak maliyeti</span><span className="v">{pc(W.ke)}</span>
            <span className="k">Vergi sonrası borç maliyeti</span><span className="v">{pc(W.kdAfter)}</span>
            <span className="k">Borç ağırlığı</span><span className="v">{pc(W.wd)}</span>
            <span className="k tot">WACC</span><span className="v tot">{pc(W.value)}</span>
          </div></>)}
      </div>
      <div className="iblk iblk-left"><h4>Terminal değer</h4>
        <Seg small value={A.tvMethod} onChange={v=>setA({tvMethod:v})} options={[{v:'gordon',l:'Sürekli büyüme'},{v:'exit',l:'Çıkış çarpanı'}]} />
        {A.tvMethod==='gordon' ? <NumField label="Terminal büyüme" value={A.tg} pct step={0.0025} min={-0.05} max={0.1} onChange={v=>setA({tg:v})} />
          : <NumField label="Çıkış FAVÖK çarpanı" value={A.exitMult} step={0.25} digits={2} unit="x" min={1} max={30} onChange={v=>setA({exitMult:v})} />}
        <Toggle checked={A.midYear} onChange={v=>setA({midYear:v})} title="Yıl ortası iskonto" desc="Nakit akımlarının yıl içine yayıldığını varsayar." />
      </div>
      <div className="iblk iblk-left"><h4>Piyasa çarpanı</h4>
        <NumField label="EV / FAVÖK" value={A.mult.value} step={0.25} digits={2} unit="x" min={0.5} max={40} onChange={v=>setA({mult:{...A.mult, value:v}})} />
        <Seg small value={A.mult.basis} onChange={v=>setA({mult:{...A.mult, basis:v}})} options={[{v:'ltm',l:`${B.year} normalize`},{v:'fwd',l:`${B.year+1}T ileri`}]} />
        <NumField label="Likidite / ölçek iskontosu" value={A.mult.disc} pct step={0.05} min={0} max={0.9} onChange={v=>setA({mult:{...A.mult, disc:v}})} />
      </div>
      <div className="iblk iblk-left"><h4>Net aktifler</h4>
        <NumField label="Rayiç değer farkı (bin USD)" value={+A.na.uplift||0} step={100} digits={0} min={-1e9} max={1e9} hint="Arsa, bina ve makinelerin ekspertiz değeri ile defter değeri farkı" onChange={v=>setA({na:{...A.na, uplift:v}})} />
        <Toggle checked={A.na.excludeIntang} onChange={v=>setA({na:{...A.na, excludeIntang:v}})} title="Maddi olmayan varlıkları dışla" desc="Haklar ve özel maliyetler satın alma sonrası değerini koruyamayabilir." />
      </div>
      <div className="iblk iblk-left"><h4>Yöntem ağırlıkları</h4>
        <NumField label="İndirgenmiş nakit akımı" value={A.weights.dcf} pct step={0.05} min={0} max={1} onChange={v=>setA({weights:{...A.weights, dcf:v}})} />
        <NumField label="FAVÖK çarpanı" value={A.weights.mult} pct step={0.05} min={0} max={1} onChange={v=>setA({weights:{...A.weights, mult:v}})} />
        <NumField label="Net aktifler" value={A.weights.na} pct step={0.05} min={0} max={1} onChange={v=>setA({weights:{...A.weights, na:v}})} />
        {Math.abs(ws-1)>0.001 && <p className="muted small">Ağırlıklar toplamı {pc(ws,0)}; sonuç %100'e oranlanır.</p>}
      </div>
      <div className="iblk">
        <button className="ibtn" disabled={savingAsm || !st.valuationTaskId || stableStringify(A)===stableStringify(st.savedAsm)}
          onClick={()=>saveAssumptionsMut({ valuationTaskId: st.valuationTaskId, assumptions: A }).then(()=>up({ savedAsm: A }))}>{savingAsm?'Kaydediliyor…':'Kaydet'}</button>
        <button className="ibtn ghost" onClick={()=>setResetConfirm(true)}>Varsayımları baza döndür</button>
      </div>
      <div className="inote">İskonto oranı tek başına en güçlü değişkendir. Bileşenlerine ayrılıp belgelenmesi müzakerede pozisyonu güçlendirir.</div>
    </Insp>
    {resetConfirm && (
      <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setResetConfirm(false)}>
        <div style={{ background:'#fff', borderRadius:10, width:'min(380px, 92vw)', boxShadow:'0 20px 60px rgba(0,0,0,.3)', padding:'20px 22px' }} onClick={e=>e.stopPropagation()}>
          <h3 style={{ margin:'0 0 8px', fontSize:15 }}>Varsayımları baza döndür</h3>
          <p className="muted small" style={{ margin:'0 0 18px' }}>Tüm manuel değişiklikler geri alınacak. Veritabanına yazmak için Kaydet'e basmanız gerekmektedir.</p>
          <div style={{ display:'flex', gap:8 }}>
            <button className="ibtn ghost" style={{ flex:1, marginTop:0 }} onClick={()=>setResetConfirm(false)}>Vazgeç</button>
            <button className="ibtn" style={{ flex:1, marginTop:0, background:'var(--red)', borderColor:'var(--red)' }}
              onClick={()=>{ const D = { ...defaultAssumptions(hist), _base: B.year }; up({ asm:D, baseAsm:D }); setResetConfirm(false); }}>Geri al</button>
          </div>
        </div>
      </div>
    )}
  </>);
}

export function L7Audit({ hist, st, up, V, audit, print, setPrinting }){
  const [flt, setFlt] = useState('all');
  const F = audit.findings.filter(f => flt==='all' || (flt==='open' && !f.closed) || (flt==='crit' && f.sev==='crit'));
  const toggle = id => up(s => ({ closed: s.closed.includes(id) ? s.closed.filter(x=>x!==id) : [...s.closed, id] }));
  const sevL = { crit:'Kritik', warn:'Uyarı', info:'Bilgi' };
  const body = (
    <Panel title="Denetim bulguları" sub={`${audit.findings.filter(f=>!f.closed).length} açık`} right={!print && <Seg small value={flt} onChange={setFlt} options={[{v:'all',l:'Tümü'},{v:'open',l:'Açık'},{v:'crit',l:'Kritik'}]} />} flush>
      {F.length===0 ? <Empty title="Bulgu yok">Bu filtreyle eşleşen bulgu bulunmuyor.</Empty> : (
        <ul className="findings">{F.map(f => (
          <li key={f.id} className={'f-'+f.sev+(f.closed?' closed':'')}>
            <div className="fh"><span className={'sev '+f.sev}>{sevL[f.sev]}</span><Tag>{f.layer}</Tag><b>{f.title}</b>
              {!print && <button className="lnk" onClick={()=>toggle(f.id)}>{f.closed ? 'Yeniden aç' : 'Kapat'}</button>}</div>
            <p style={{width:'70%', marginLeft:90, marginRight:'auto', textAlign:'left'}}>{f.detail}</p><p className="fix" style={{width:'70%', marginLeft:90, marginRight:'auto', textAlign:'left'}}>{f.fix}</p>
          </li>))}</ul>)}
    </Panel>
  );
  if (print) return <div className="left">{body}</div>;
  const score = audit.score;
  return (<>
    <div className="left">{body}</div>
    <Insp>
      <div className="ihead">Çıktı <span>L7</span></div>
      <div className="ihero"><div className="big">{score.toFixed(1).replace('.',',')} / 10</div><div className="lb">Koşullu güven skoru</div>
        <div className="meter"><i style={{width: (score*10)+'%'}} className={score>=7?'ok':score>=4?'wn':'er'} /></div>
        <div className="sub">Skor değerin yanlış olduğunu söylemez; hangi noktalarda kanıtla desteklenmesi gerektiğini gösterir.</div></div>
      <div className="iblk"><h4>Çıktı paketi</h4>
        <button className="ibtn" disabled={!hist.length} onClick={()=>exportWorkbook({ company:st.company, hist, V, A:st.asm, audit })}>Excel çalışma kitabını indir</button>
        <button className="ibtn ghost" disabled={!V} onClick={()=>setPrinting(true)}>Raporu yazdır ya da PDF kaydet</button>
      </div>
      <div className="iblk"><h4>İşlemler</h4>
        <button className="ibtn ghost" onClick={()=>up({ closed: audit.findings.map(f=>f.id) })}>Tüm bulguları kapat</button>
        <button className="ibtn ghost" onClick={()=>up({ closed: [] })}>Bulguları yeniden aç</button>
      </div>
      <div className="inote">Excel paketi bilanço, gelir tablosu, USD özet, projeksiyon, değerleme, varsayımlar ve denetim sayfalarını içerir. Kapatılan bulgular raporda düzeltme kaydı olarak görünür.</div>
    </Insp>
  </>);
}


// Rapor eki — L5/L6'daki sağ kolon (sürücüler/varsayımlar girdileri) için. Bu değerler L5/L6'nın
// kendi "body"sinde (Projeksiyon/Sürücü sınaması/Değerleme tabloları) görünmüyor, sadece sağdaki
// panelde elle girilen ham sayılar olarak duruyor — rapora ayrı bir sayfa olarak ekleniyor.
export function PrintAssumptions({ hist, st, V }){
  if (!hist.length || !st.asm || !V) return null;
  const A = st.asm, B = V.B, W = V.P.W;
  const SCEN = { pess:'Kötümser', base:'Baz', opt:'İyimser', custom:'Elle değiştirilmiş' };
  return (
    <div className="left">
      <Panel title="Varsayım girdileri" sub={`Baz yıl ${B.year}, ${A.N} yıllık projeksiyon · Senaryo: ${SCEN[A.scenario]||A.scenario}`} flush>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th className="lbl">Gelir büyümesi</th><th className="n">Oran</th></tr></thead>
          <tbody>{A.growth.slice(0, A.N).map((g,i) => (
            <tr key={i}><td className="lbl">{B.year+i+1}</td><td className="n">{pc(g)}</td></tr>))}</tbody>
        </table></div>
      </Panel>
      <Panel title={`Maliyet / ciro hedefi (${B.year+A.N})`} flush>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th className="lbl">Kalem</th><th className="n">Baz</th><th className="n">Hedef</th></tr></thead>
          <tbody>{COSTS.filter(([k])=>k!=='rnd'||A.costs.rnd.s>0).map(([k,n]) => (
            <tr key={k}><td className="lbl">{n}</td><td className="n">{pc(A.costs[k].s)}</td><td className="n">{pc(A.costs[k].e)}</td></tr>))}</tbody>
        </table></div>
      </Panel>
      <Panel title="Yatırım, sermaye, vergi" flush>
        <div className="scroll"><table className="g"><tbody>
          <tr><td className="lbl">Yatırım / ciro</td><td className="n">{pc(A.capexPct)}</td></tr>
          <tr><td className="lbl">Net işletme sermayesi / ciro</td><td className="n">{pc(A.nwcPct)}</td></tr>
          <tr><td className="lbl">Yeni yatırım ömrü</td><td className="n">{A.daLife} yıl</td></tr>
          <tr><td className="lbl">Mevcut amortisman azalışı</td><td className="n">{pc(A.daFade)}</td></tr>
          <tr><td className="lbl">Kurumlar vergisi</td><td className="n">{pc(A.taxRate)}</td></tr>
        </tbody></table></div>
      </Panel>
      <Panel title="İskonto oranı (WACC)" flush>
        <div className="scroll"><table className="g"><tbody>
          <tr><td className="lbl">Risksiz oran</td><td className="n">{pc(A.wacc.rf)}</td></tr>
          <tr><td className="lbl">Özkaynak risk primi</td><td className="n">{pc(A.wacc.erp)}</td></tr>
          <tr><td className="lbl">Ülke risk primi</td><td className="n">{pc(A.wacc.crp)}</td></tr>
          <tr><td className="lbl">Kaldıraçsız beta</td><td className="n">{nf(A.wacc.betaU,2)}</td></tr>
          <tr><td className="lbl">Küçüklük primi</td><td className="n">{pc(A.wacc.size)}</td></tr>
          <tr><td className="lbl">Borç maliyeti (vergi öncesi)</td><td className="n">{pc(A.wacc.kd)}</td></tr>
          <tr><td className="lbl">Borç / özkaynak</td><td className="n">{nf(A.wacc.de,2)}x</td></tr>
          <tr className="sum"><td className="lbl">Hesaplanan WACC</td><td className="n">{pc(W.value)}</td></tr>
        </tbody></table></div>
      </Panel>
      <Panel title="Terminal değer ve çarpanlar" flush>
        <div className="scroll"><table className="g"><tbody>
          <tr><td className="lbl">Yöntem</td><td className="n">{A.tvMethod==='gordon'?'Sürekli büyüme':'Çıkış çarpanı'}</td></tr>
          {A.tvMethod==='gordon'
            ? <tr><td className="lbl">Terminal büyüme</td><td className="n">{pc(A.tg)}</td></tr>
            : <tr><td className="lbl">Çıkış FAVÖK çarpanı</td><td className="n">{nf(A.exitMult,2)}x</td></tr>}
          <tr><td className="lbl">Yıl ortası iskonto</td><td className="n">{A.midYear?'Evet':'Hayır'}</td></tr>
          <tr><td className="lbl">EV / FAVÖK çarpanı</td><td className="n">{nf(A.mult.value,2)}x</td></tr>
          <tr><td className="lbl">Çarpan baz</td><td className="n">{A.mult.basis==='ltm'?`${B.year} normalize`:`${B.year+1}T ileri`}</td></tr>
          <tr><td className="lbl">Likidite / ölçek iskontosu</td><td className="n">{pc(A.mult.disc||0)}</td></tr>
          <tr><td className="lbl">Rayiç değer farkı</td><td className="n">{mUsd(A.na.uplift||0)}</td></tr>
          <tr><td className="lbl">Maddi olmayan varlıklar dışlandı mı</td><td className="n">{A.na.excludeIntang?'Evet':'Hayır'}</td></tr>
        </tbody></table></div>
      </Panel>
      <Panel title="Yöntem ağırlıkları" flush>
        <div className="scroll"><table className="g"><tbody>
          <tr><td className="lbl">İndirgenmiş nakit akımı</td><td className="n">{pc(A.weights.dcf)}</td></tr>
          <tr><td className="lbl">FAVÖK çarpanı</td><td className="n">{pc(A.weights.mult)}</td></tr>
          <tr><td className="lbl">Net aktifler</td><td className="n">{pc(A.weights.na)}</td></tr>
        </tbody></table></div>
      </Panel>
    </div>
  );
}
