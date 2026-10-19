import { useState, useEffect } from 'react';
import { Panel, Seg, Toggle, Tag, Empty, FinTable, nf, par, pc, mx, NumField, Insp } from '../ui.jsx';
import { RevenueChart, Bridge } from '../charts.jsx';
import { contribution, LEVELS } from '../engine/contribution.js';
import { lineOfEn, SEC_EN, LINE_EN } from '../engine/accounts_lines_en.js';
import { flow } from '../engine/ledger_en.js';

const lineOf = lineOfEn;
const accName = code => String(code);
const LINE_LABEL = LINE_EN;

const noData = <div className="left"><Empty title="No data to build the table">Upload a trial balance or tax return in L1.</Empty></div>;

export function L3Balance({ hist, st, up, print }){
  const [cur, setCur] = useState('TL');
  const [modalKey, setModalKey] = useState(null);
  useEffect(() => {
    if (!modalKey) return;
    const onKey = e => { if (e.key === 'Escape') setModalKey(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalKey]);
  if (!hist.length) return noData;
  const conv = (h, v) => cur==='TL' ? v/1000 : v/(h.fx.end||1)/1000;
  const head = hist.map(h=>({ l:String(h.year) }));
  const rows = [];
  hist[0].bs.secs.forEach((s, si) => {
    if (si===2) rows.push({ l:'TOTAL ASSETS', v: hist.map(h=>conv(h,h.bs.TA)), cls:'sum' }, { spacer:true });
    rows.push({ l:SEC_EN[s.sec] || s.sec, v: hist.map(h=>conv(h,h.bs.secs[si].total)), cls:'sub' });
    s.lines.forEach((l, li) => {
      const vals = hist.map(h=>conv(h,h.bs.secs[si].lines[li].v));
      if (vals.some(x=>Math.abs(x)>0.05)) rows.push({ l: LINE_EN[l.k] || l.n, v: vals, cls:'kid', key: l.k, tag: hist.some(h=>h.bs.secs[si].lines[li].computed) ? <Tag c="gold">computed</Tag> : null });
    });
  });
  rows.push({ l:'TOTAL LIABILITIES & EQUITY', v: hist.map(h=>conv(h,h.bs.TP)), cls:'sum' });
  rows.push({ l:'Balance check', v: hist.map(h=>conv(h,h.bs.check)), cls:'dim' });

  const EQ_PARTS = [{k:'paidIn'},{k:'capRes'},{k:'profitRes'},{k:'prevProfit'},{k:'prevLoss'},{k:'netProfit'}];
  const vrows = [
    { l:'Trade and other receivables', v: hist.map(h=>conv(h,h.bs.v.tradeRec+h.bs.v.otherRec)), cls:'kid', parts:[{k:'tradeRec'},{k:'otherRec'}] },
    { l:'Inventory and advances given', v: hist.map(h=>conv(h,h.bs.v.inv+h.bs.v.advGiven)), cls:'kid', parts:[{k:'inv'},{k:'advGiven'}] },
    { l:'Other operating assets', v: hist.map(h=>conv(h,h.bs.v.prepaid+h.bs.v.otherCA+h.bs.v.constr)), cls:'kid', parts:[{k:'prepaid'},{k:'otherCA'},{k:'constr'}] },
    { l:'Operating liabilities (−)', v: hist.map(h=>-conv(h,h.bs.opCL)), cls:'kid', parts:[{k:'tradePay',s:-1},{k:'otherPayST',s:-1},{k:'advRecv',s:-1},{k:'constrPr',s:-1},{k:'taxPay',s:-1},{k:'provST',s:-1},{k:'defIncST',s:-1},{k:'otherSTL',s:-1}] },
    { l:'Net working capital', v: hist.map(h=>conv(h,h.bs.nwc)), cls:'sub' },
    { spacer:true },
    { l:'Financial debt (ST + LT)', v: hist.map(h=>conv(h,h.bs.v.finDebtST+h.bs.v.finDebtLT)), cls:'kid', parts:[{k:'finDebtST'},{k:'finDebtLT'}] },
    { l:'Due to shareholders', v: hist.map(h=>conv(h,h.bs.partners)), cls:'kid', tag: st.partnersAsDebt!==false ? <Tag>debt</Tag> : <Tag c="plum">equity-like</Tag>, parts:[{k:'partnersST'},{k:'partnersLT'}] },
    { l:'Cash and securities (−)', v: hist.map(h=>-conv(h,h.bs.cash)), cls:'kid', parts:[{k:'cash',s:-1},{k:'secs',s:-1}] },
    { l:'Net financial debt', v: hist.map(h=>conv(h,h.bs.netDebt)), cls:'sub' },
    { spacer:true },
    { l:'Invested capital (equity + net debt)', v: hist.map(h=>conv(h,h.bs.investedCapital)), cls:'hero' },
    { l:'Net assets (assets − liabilities)', v: hist.map(h=>conv(h,h.bs.EQ)), cls:'sub', parts:EQ_PARTS },
    { l:'Tangible net assets (excl. intangibles)', v: hist.map(h=>conv(h,h.bs.tangibleEquity)), cls:'kid', parts:[...EQ_PARTS,{k:'intang',s:-1}] },
  ];
  const K = k => hist.map(h=>h.kpi[k]);
  const krows = [
    { l:'Current ratio', v:K('current'), f:x=>mx(x,2), formula:'Current Assets / Current Liabilities', ratioParts: h=>[{l:'Current Assets',v:h.bs.CA},{l:'Current Liabilities',v:h.bs.STL}], f2:x=>mx(x,2) },
    { l:'Quick ratio', v:K('quick'), f:x=>mx(x,2), formula:'(Current Assets − Inventory) / Current Liabilities', ratioParts: h=>[{l:'Current Assets − Inventory',v:h.bs.CA-h.bs.v.inv},{l:'Current Liabilities',v:h.bs.STL}], f2:x=>mx(x,2) },
    { l:'Days sales outstanding', v:K('dso'), f:x=>nf(x), formula:'Trade Receivables / Net Sales × 365', ratioParts: h=>[{l:'Trade Receivables',v:h.bs.v.tradeRec},{l:'Net Sales',v:h.is.netSales}], f2:x=>nf(x)+' days' },
    { l:'Days inventory outstanding', v:K('dio'), f:x=>nf(x), formula:'Inventory / COGS × 365', ratioParts: h=>[{l:'Inventory',v:h.bs.v.inv},{l:'COGS',v:h.is.cogs}], f2:x=>nf(x)+' days' },
    { l:'Days payable outstanding', v:K('dpo'), f:x=>nf(x), formula:'Trade Payables / COGS × 365', ratioParts: h=>[{l:'Trade Payables',v:h.bs.v.tradePay},{l:'COGS',v:h.is.cogs}], f2:x=>nf(x)+' days' },
    { l:'Cash conversion cycle', v:K('ccc'), f:x=>nf(x), cls:'sub', formula:'DSO + DIO − DPO (days)' },
    { l:'Inventory / net sales', v:K('invS'), f:pc, cls: hist.some(h=>h.kpi.invS>0.2)?'warnrow':'', formula:'Inventory / Net Sales', ratioParts: h=>[{l:'Inventory',v:h.bs.v.inv},{l:'Net Sales',v:h.is.netSales}], f2:pc },
    { l:'NWC / net sales', v:K('nwcS'), f:pc, formula:'Net Working Capital / Net Sales', ratioParts: h=>[{l:'Net Working Capital',v:h.bs.nwc},{l:'Net Sales',v:h.is.netSales}], f2:pc },
    { l:'Net debt / EBITDA', v:K('ndEbitda'), f:x=>mx(x,1), formula:'Net Financial Debt / Normalized EBITDA', ratioParts: h=>[{l:'Net Financial Debt',v:h.bs.netDebt},{l:'Normalized EBITDA',v:h.ebitdaAdj}], f2:x=>mx(x,1) },
    { l:'Interest coverage (EBIT / finance expense)', v:K('cover'), f:x=>mx(x,1), formula:'EBIT / Finance Expense', ratioParts: h=>[{l:'EBIT',v:h.is.ebit},{l:'Finance Expense',v:h.is.finExp}], f2:x=>mx(x,1) },
    { l:'Liabilities / assets', v:K('lev'), f:pc, formula:'(Current + Long-term Liabilities) / Total Assets', ratioParts: h=>[{l:'Current + LT Liabilities',v:h.bs.STL+h.bs.LTL},{l:'Total Assets',v:h.bs.TA}], f2:pc },
    { l:'Return on equity', v:K('roe'), f:pc, formula:'Net Income / Equity', ratioParts: h=>[{l:'Net Income',v:h.is.net},{l:'Equity',v:h.bs.EQ}], f2:pc },
  ];
  const unit = cur==='TL' ? "'000 TL" : "'000 USD, year-end rate";
  const last = hist[hist.length-1];
  const body = (<>
    <Panel title="Balance sheet summary" sub={unit} right={!print && <Seg small value={cur} onChange={setCur} options={[{v:'TL',l:'TL'},{v:'USD',l:'USD'}]} />} flush>
      <FinTable head={head} rows={rows} firstLabel="" onRowClick={r=>setModalKey(r)} note={cur==='USD' ? 'Balance sheet items converted at the year-end rate: '+hist.map(h=>`${h.year} ${nf(h.fx.end,4)}`).join(', ')+'.' : 'Built from the chart of accounts groupings, from trial balance net balances.'} />
    </Panel>
    <Panel title="Balance sheet lines feeding the valuation" sub={unit} flush><FinTable head={head} rows={vrows} onRowClick={r=>setModalKey(r)} /></Panel>
    <Panel title="Financial ratios" flush><FinTable head={head} rows={krows} fmt={x=>nf(x,2)} onRowClick={r=>setModalKey(r)} /></Panel>
  </>);
  if (print) return <div className="left">{body}</div>;

  const modal = modalKey && (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setModalKey(null)}>
      <div style={{ background:'#fff', borderRadius:10, width:'min(960px, 95vw)', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', position:'relative' }} onClick={e=>e.stopPropagation()}>
        <button type="button" onClick={()=>setModalKey(null)} aria-label="Close"
          style={{ position:'absolute', top:10, right:12, border:0, background:'none', fontSize:20, lineHeight:1, cursor:'pointer', color:'var(--muted)' }}>×</button>
        <div style={{ padding:'18px 22px' }}>
          <h3 style={{ margin:'0 0 4px' }}>{modalKey.l}</h3>
          {modalKey.formula && <p className="muted small" style={{ margin:'0 0 14px' }}>{modalKey.formula}</p>}
          {modalKey.ratioParts ? (() => {
            const labels = modalKey.ratioParts(hist[0]).map(p=>p.l);
            return (
              <table className="g"><thead><tr className="hd solo"><th className="lbl">Component</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                <tbody>
                  {labels.map((lab, li) => (
                    <tr key={lab}><td className="lbl">{lab}</td>
                      {hist.map(h => <td key={h.id} className="n">{par(conv(h, modalKey.ratioParts(h)[li].v))}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="sum"><td className="lbl">Ratio</td>
                  {hist.map((h,hi) => <td key={h.id} className="n">{(modalKey.f2||modalKey.f)(modalKey.v[hi])}</td>)}
                </tr></tfoot>
              </table>
            );
          })() : modalKey.parts ? (() => {
            const parts = modalKey.parts;
            return (
              <table className="g"><thead><tr className="hd solo"><th className="lbl">Item</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.k}><td className="lbl">{LINE_LABEL[p.k] || p.k}</td>
                      {hist.map(h => <td key={h.id} className="n">{par((p.s===-1?-1:1)*conv(h,h.bs.v[p.k]||0))}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="sum"><td className="lbl">Total</td>
                  {hist.map(h => <td key={h.id} className="n">{par(parts.reduce((s,p)=>s+(p.s===-1?-1:1)*conv(h,h.bs.v[p.k]||0),0))}</td>)}
                </tr></tfoot>
              </table>
            );
          })() : (() => {
            const byCode = {};
            hist.forEach(h => {
              Object.values(h.L.acc).forEach(a => {
                if (lineOf(a.code)?.line.k !== modalKey.key) return;
                (byCode[a.code] ||= { name: a.name || accName(a.code), vals: {} }).vals[h.year] = a.dt - a.ct;
              });
            });
            const codes = Object.keys(byCode).sort();
            if (!codes.length) return <p className="muted small">No account feeds this line in these years.</p>;
            return (
              <table className="g"><thead><tr className="hd solo"><th className="lbl">Account</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                <tbody>
                  {codes.map(code => (
                    <tr key={code}><td className="lbl"><code>{code}</code> {byCode[code].name}</td>
                      {hist.map(h => <td key={h.id} className="n">{par(conv(h, byCode[code].vals[h.year] ?? 0))}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="sum"><td className="lbl">Total</td>
                  {hist.map(h => <td key={h.id} className="n">{par(conv(h, codes.reduce((s,cc)=>s+(byCode[cc].vals[h.year]??0),0)))}</td>)}
                </tr></tfoot>
              </table>
            );
          })()}
        </div>
      </div>
    </div>
  );
  return (<>
    <div className="left">{body}</div>
    {modal}
    <Insp>
      <div className="ihead">Adjustments <span>L3</span></div>
      <div className="ihero"><div className="big">{nf(last.usd.ic/1000,2)} M$</div><div className="lb">{last.year} invested capital</div>
        <div className="sub">Equity {nf(last.usd.equity/1000,2)} M$, net debt {nf(last.usd.netDebt/1000,2)} M$. Net assets form the floor of the valuation range.</div></div>
      <div className="iblk"><h4>Classification</h4>
        <Toggle checked={st.partnersAsDebt!==false} onChange={v=>up({partnersAsDebt:v})} title="Include due to shareholders in net debt" desc="When off, accounts 331 and 431 are treated as equity-like; firm value is unchanged, equity value increases." />
      </div>
      <div className="iblk"><h4>{last.year} NWC composition ($k)</h4>
        <div className="ical">
          <span className="k">Trade receivables</span><span className="v">{nf(last.usd.tradeRec)}</span>
          <span className="k">Inventory</span><span className="v">{nf(last.usd.inv)}</span>
          <span className="k">Trade payables</span><span className="v">({nf(last.usd.tradePay)})</span>
          <span className="k tot">Net working capital</span><span className="v tot">{nf(last.usd.nwc)}</span>
        </div>
      </div>
      <div className="inote">Inventory / revenue {pc(last.kpi.invS)}. {last.kpi.invS>0.2 ? <b>Above the 20% target; in L5, lowering the NWC ratio directly increases cash flow.</b> : 'Within target range.'}</div>
    </Insp>
  </>);
}

export function L4Income({ hist, st, up, print }){
  const [mode, setMode] = useState('USD');
  const [cy, setCy] = useState(hist.length ? hist[hist.length-1].year : null);
  const [modalKey, setModalKey] = useState(null);
  useEffect(() => {
    if (!modalKey) return;
    const onKey = e => { if (e.key === 'Escape') setModalKey(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalKey]);
  if (!hist.length) return noData;
  const c = (h, v) => mode==='TL' ? v/1000 : mode==='USD' ? v/(h.fx.avg||1)/1000 : v/(h.is.netSales||1);
  const fmt = mode==='PCT' ? (x=>pc(x)) : par;
  const head = hist.map(h=>({ l: String(h.year)+(h.months<12?` (${h.months} mo)`:'') }));
  const R = (l, f, cls, tag, codes) => ({ l, v: hist.map(h=>c(h, f(h))), cls, tag, codes });
  const rows = [
    R('Gross sales', h=>h.is.grossSales, 'kid', null, [{from:600,to:602,s:1}]),
    R('Sales deductions (−)', h=>-h.is.deductions, 'kid', null, [{from:610,to:612,s:-1}]),
    R('Net sales', h=>h.is.netSales, 'sub'),
    R('Cost of goods sold (−)', h=>-h.is.cogs, 'kid', null, [{from:620,to:623,s:-1}]),
    R('Gross profit', h=>h.is.gross, 'sub'),
    R('Research and development (−)', h=>-h.is.rnd, 'kid', null, [{from:630,to:630,s:-1}]),
    R('Selling, marketing and distribution (−)', h=>-h.is.psd, 'kid', null, [{from:631,to:631,s:-1}]),
    R('General and administrative (−)', h=>-h.is.ga, 'kid', null, [{from:632,to:632,s:-1}]),
    R('Operating income (EBIT)', h=>h.is.ebit, 'sub'),
    R('Depreciation and amortization (+)', h=>h.is.da.total, 'kid'),
    R('EBITDA', h=>h.is.ebitda, 'sub'),
    R('Add-backs (+)', h=>h.addb, 'kid'),
    ...(st.fxInEbitda ? [R('Net FX gain/loss (+/−)', h=>h.fxInc, 'kid')] : []),
    R('Normalized EBITDA', h=>h.ebitdaAdj, 'hero'),
    { l:'Normalized EBITDA margin', v: hist.map(h=>h.ebitdaAdj/(h.is.netSales||1)), f:pc, cls:'dim' },
    { spacer:true },
    R('Other operating income', h=>h.is.otherInc, 'kid', null, [{from:640,to:649,s:1}]),
    R('Other operating expenses (−)', h=>-h.is.otherExp, 'kid', null, [{from:650,to:659,s:-1}]),
    R('Finance expense (−)', h=>-h.is.finExp, 'kid', null, [{from:660,to:661,s:-1}]),
    R('Extraordinary income and expense (net)', h=>h.is.extraInc-h.is.extraExp, 'kid', null, [{from:671,to:671,s:1},{from:679,to:679,s:1},{from:680,to:681,s:-1},{from:689,to:689,s:-1}]),
    R('Pre-tax income', h=>h.is.ebt, 'sub'),
    R('Tax provision (−)', h=>-h.is.tax, 'kid', null, [{from:691,to:691,s:-1}]),
    R('Net income', h=>h.is.net, 'sum'),
  ];
  const H = hist.find(h=>h.year===cy) || hist[hist.length-1];
  const ct = contribution(H, st.contrib);
  const setCls = (d, v) => up(s => ({ contrib: { ...s.contrib, [d]: v } }));
  const lastU = hist[hist.length-1].usd;
  const recon = hist.map(h => { const ms = st.monthly.filter(m=>m.y===h.year); return ms.length===12 ? { y:h.year, rep: ms.reduce((s,m)=>s+m.rev,0), miz: h.is.netSales, mat: ms.reduce((s,m)=>s+m.mat,0), mat7: h.is.cost7.mat } : null; }).filter(Boolean);
  const unit = mode==='TL' ? "'000 TL" : mode==='USD' ? "'000 USD, yearly average rate" : 'ratio to net revenue';

  const body = (<>
    <Panel title="Normalized income statement" sub={unit} right={!print && <Seg small value={mode} onChange={setMode} options={[{v:'TL',l:'TL'},{v:'USD',l:'USD'},{v:'PCT',l:'% revenue'}]} />} flush>
      <FinTable head={head} rows={rows} fmt={fmt} onRowClick={r=>setModalKey(r)} note="The income statement is read from 6xx accounts, depreciation from the 'depreciation' sub-accounts of 7xx accounts. Add-backs are not mixed into EBITDA; they have their own line." />
    </Panel>
    <div className="two">
      <Panel title="Revenue and EBITDA margin" sub="USD"><RevenueChart data={hist.map(h=>({ l:String(h.year), rev:h.usd.rev, margin:h.kpi.ebitdaM }))} /></Panel>
      <Panel title={`${hist[hist.length-1].year} EBITDA bridge`} sub="million USD"><Bridge unit="M USD" steps={[{l:'EBIT',v:lastU.ebit,total:true},{l:'Depreciation',v:lastU.da},{l:'Add-back',v:lastU.addb},...(st.fxInEbitda?[{l:'FX gain/loss',v:lastU.ebitdaAdj-lastU.ebitda-lastU.addb}]:[]),{l:'Normalized EBITDA',v:lastU.ebitdaAdj,total:true}]} /></Panel>
    </div>
    <Panel title="Cost structure" sub={unit} flush>
      <FinTable head={head} rows={[
        R('Direct raw materials', h=>h.is.cost7.mat, 'kid'),
        R('Direct labor', h=>h.is.cost7.lab, 'kid'),
        R('Manufacturing overhead', h=>h.is.cost7.ovh, 'kid'),
        R('Of which depreciation', h=>h.is.da.cogs, 'dim'),
        R('Production cost total', h=>h.is.cost7.mat+h.is.cost7.lab+h.is.cost7.ovh, 'sub'),
        R('Cost of goods sold', h=>h.is.cogs, 'sub'),
        R('Difference: inventory change, merchandise cost', h=>h.is.cogs-(h.is.cost7.mat+h.is.cost7.lab+h.is.cost7.ovh), 'dim'),
      ]} fmt={fmt}
        note="In the projection, cost of goods sold is split by this mix into materials, labor and overhead." />
    </Panel>
    {recon.length>0 && <Panel title="Sales report reconciliation" sub="'000 TL" flush>
      <FinTable head={recon.map(r=>({l:String(r.y)}))} rows={[
        { l:'Monthly sales report revenue', v: recon.map(r=>r.rep/1000) },
        { l:'Trial balance net sales', v: recon.map(r=>r.miz/1000) },
        { l:'Difference', v: recon.map(r=>(r.rep-r.miz)/1000), cls:'sub' },
        { l:'Difference / trial balance', v: recon.map(r=>(r.rep-r.miz)/r.miz), f:pc, cls:'dim' },
        { l:'Raw material in report', v: recon.map(r=>r.mat/1000) },
        { l:'Trial balance direct materials', v: recon.map(r=>r.mat7/1000) },
      ]} note="The valuation is based on the trial balance. The difference may come from returns and discounts, VAT, intra-group sales, or timing; the report figure should not be used without reconciliation." />
    </Panel>}
    <Panel title="Contribution levels" sub={`${H.year}, from expense sub-accounts`} right={!print && <Seg small value={H.year} onChange={setCy} options={hist.map(h=>({v:h.year,l:String(h.year)}))} />} flush>
      {ct.rows.length ? (<>
        <div className="kband">
          {[['Contribution 1','A − B',ct.k1],['Contribution 2','A − B − C',ct.k2],['Contribution 3','A − B … E',ct.k3],['Contribution 4','A − B … F',ct.k4]].map(([n,f,v])=>(
            <div key={n}><span className="kn">{n}</span><b>{pc(v/(ct.A||1))}</b><span className="kf">{f} · {nf(v/1e6,1)} M ₺</span></div>))}
        </div>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th className="lbl">Expense sub-account</th><th className="n">'000 TL</th><th className="n">% revenue</th><th>Level</th></tr></thead>
          <tbody>{ct.rows.map(r => (
            <tr key={r.d}><td className="lbl"><code>{r.code}</code> {r.name}</td><td className="n">{nf(r.v/1000)}</td><td className="n">{pc(r.v/(ct.A||1))}</td>
              <td><select className={'csel'+(r.auto?'':' set')} value={r.cls} onChange={e=>setCls(r.d, e.target.value)}>{Object.entries(LEVELS).map(([k,n])=><option key={k} value={k}>{k} · {n}</option>)}</select></td></tr>))}</tbody>
          <tfoot><tr><td colSpan="4">A is net sales. Classification is suggested by name keys; every row can be changed. Production cost amounts may differ from cost of goods sold due to inventory changes; levels are for management analysis.</td></tr></tfoot>
        </table></div>
      </>) : <Empty title="No sub-accounts">Contribution levels require a detailed trial balance with sub-breakdowns of 7xx accounts. The tax return does not contain this breakdown.</Empty>}
    </Panel>
  </>);
  if (print) return <div className="left">{body}</div>;

  const modal = modalKey && modalKey.codes && (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setModalKey(null)}>
      <div style={{ background:'#fff', borderRadius:10, width:'min(960px, 95vw)', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', position:'relative' }} onClick={e=>e.stopPropagation()}>
        <button type="button" onClick={()=>setModalKey(null)} aria-label="Close"
          style={{ position:'absolute', top:10, right:12, border:0, background:'none', fontSize:20, lineHeight:1, cursor:'pointer', color:'var(--muted)' }}>×</button>
        <div style={{ padding:'18px 22px' }}>
          <h3 style={{ margin:'0 0 14px' }}>{modalKey.l}</h3>
          {(() => {
            const byCode = {};
            hist.forEach(h => {
              Object.values(h.L.acc).forEach(a => {
                const match = modalKey.codes.find(p => +a.code>=p.from && +a.code<=p.to);
                if (!match) return;
                (byCode[a.code] ||= { name: a.name || accName(a.code), s: match.s, vals: {} }).vals[h.year] = match.s*flow(h.L, a.code);
              });
            });
            const codes = Object.keys(byCode).sort();
            if (!codes.length) return <p className="muted small">No account feeds this line in these years.</p>;
            return (
              <table className="g"><thead><tr className="hd solo"><th className="lbl">Account</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                <tbody>
                  {codes.map(code => (
                    <tr key={code}><td className="lbl"><code>{code}</code> {byCode[code].name}</td>
                      {hist.map(h => <td key={h.id} className="n">{fmt(c(h, byCode[code].vals[h.year] ?? 0))}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="sum"><td className="lbl">Total</td>
                  {hist.map(h => <td key={h.id} className="n">{fmt(c(h, codes.reduce((s,c2)=>s+(byCode[c2].vals[h.year]??0),0)))}</td>)}
                </tr></tfoot>
              </table>
            );
          })()}
          {modalKey.amort && (() => {
            const SRC = { sub:'sub-accounts', delta:'accumulated change', pct:'4% estimate', manual:'manual entry' };
            const daVal = r => { const net=(+r.db||0)-(+r.cb||0); return Math.abs(net)>0.5 ? net : (+r.dt||0); };
            const byCode = {};
            hist.forEach(h => {
              if (h.is.da.source==='sub' && h.is.da.rows?.length) {
                h.is.da.rows.forEach(r => { (byCode[r.code] ||= { name:r.name, vals:{} }).vals[h.year] = daVal(r); });
              } else {
                (byCode['_est_'+h.year] ||= { name:`Depreciation and amortization (${SRC[h.is.da.source]||h.is.da.source})`, vals:{} }).vals[h.year] = h.is.da.total;
              }
            });
            const codes = Object.keys(byCode).sort();
            return (
              <div style={{ marginTop:18 }}>
                <h4 style={{ margin:'0 0 8px', fontSize:12.5 }}>Depreciation and amortization</h4>
                <table className="g"><thead><tr className="hd solo"><th className="lbl">Source</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                  <tbody>
                    {codes.map(code => (
                      <tr key={code}><td className="lbl">{code.startsWith('_est_') ? '' : <code>{code}</code>} {byCode[code].name}</td>
                        {hist.map(h => <td key={h.id} className="n">{(byCode[code].vals[h.year]??0)===0 ? '—' : fmt(c(h, byCode[code].vals[h.year]))}</td>)}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="sum"><td className="lbl">Depreciation total</td>
                    {hist.map(h => <td key={h.id} className="n">{fmt(c(h, h.is.da.total))}</td>)}
                  </tr></tfoot>
                </table>
                <table className="g" style={{ marginTop:10 }}><tbody>
                  <tr className="hero"><td className="lbl">EBITDA (EBIT + Depreciation)</td>
                    {hist.map(h => <td key={h.id} className="n">{fmt(c(h, h.is.ebitda))}</td>)}
                  </tr>
                </tbody></table>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  const addAb = () => up(s => ({ addbacks: [...s.addbacks, { id:'a'+Date.now(), name:'New add-back', year: hist[hist.length-1].year, tl:0, ev:false, on:true }] }));
  const setAb = (id, p) => up(s => ({ addbacks: s.addbacks.map(a=>a.id===id?{...a,...p}:a) }));
  return (<>
    <div className="left">{body}</div>
    {modal}
    <Insp>
      <div className="ihead">Adjustments <span>L4</span></div>
      <div className="iblk"><h4>Depreciation ('000 TL)</h4>
        {hist.map(h => (
          <div className="irow" key={h.year}>
            <label>{h.year} <Tag c={h.is.da.source==='sub'?'green':h.is.da.source==='manual'?'teal':'gold'}>{({sub:'sub-account',delta:'accumulated change',pct:'4% estimate',manual:'manual'})[h.is.da.source]}</Tag></label>
            <input className="ninp w" defaultValue={nf(h.is.da.total/1000)} key={h.year+':'+Math.round(h.is.da.total)}
              onBlur={e=>{ const t=e.target.value.trim(); const v=parseFloat(t.replace(/\./g,'').replace(',','.')); up(s=>({ daOverride: { ...s.daOverride, [h.year]: t==='' ? null : (isFinite(v)? v*1000 : null) } })); }} />
          </div>))}
        {Object.values(st.daOverride||{}).some(v=>v!=null) && <button className="lnk" onClick={()=>up({daOverride:{}})}>Clear manual entries</button>}
      </div>
      <div className="iblk"><h4>Add-backs</h4>
        {st.addbacks.length===0 && <p className="muted small">One-off, non-recurring or non-market expenses can be added back to EBITDA. Unsupported items lower the confidence score.</p>}
        {st.addbacks.map(a => (
          <div className="ab" key={a.id}>
            <input className="abn" value={a.name} onChange={e=>setAb(a.id,{name:e.target.value})} aria-label="Item name" />
            <div className="abr">
              <select className="csel s" value={a.year} onChange={e=>setAb(a.id,{year:+e.target.value})}>{hist.map(h=><option key={h.year}>{h.year}</option>)}</select>
              <input className="ninp" defaultValue={nf(a.tl/1000)} key={a.id+a.tl} onBlur={e=>{ const v=parseFloat(e.target.value.replace(/\./g,'').replace(',','.')); setAb(a.id,{tl: isFinite(v)? v*1000 : 0}); }} aria-label="Amount, '000 TL" />
              <span className="u">'000 ₺</span>
            </div>
            <div className="abr">
              <label className="inl"><input type="checkbox" checked={a.on} onChange={e=>setAb(a.id,{on:e.target.checked})}/> apply</label>
              <label className="inl"><input type="checkbox" checked={a.ev} onChange={e=>setAb(a.id,{ev:e.target.checked})}/> evidenced</label>
              <button className="lnk" onClick={()=>up(s=>({addbacks:s.addbacks.filter(x=>x.id!==a.id)}))}>Delete</button>
            </div>
          </div>))}
        <button className="ibtn ghost" onClick={addAb}>Add add-back</button>
      </div>
      <div className="iblk"><h4>Normalization</h4>
        <Toggle checked={st.fxInEbitda} onChange={v=>up({fxInEbitda:v})} title="Include net FX in EBITDA" desc="For exporters, FX gains/losses may be operating in nature. Excluded by default." />
        {hist.filter(h=>h.months<12).map(h => (
          <NumField key={h.id} label={`${h.year} annualization`} value={h.annualize} step={0.05} digits={2} unit="x" min={1} max={12} onChange={v=>up(s=>({annualize:{...s.annualize,[h.id]:v}}))} />))}
      </div>
      <div className="inote"><b>Base:</b> all three methods are fed from this normalized EBITDA. If the base is wrong, all three results will be wrong while appearing to confirm each other.</div>
    </Insp>
  </>);
}
