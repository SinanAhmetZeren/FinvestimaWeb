// English translation of engine/audit.js — same logic/thresholds, translated finding text and
// en-US number/percent formatting instead of tr-TR.
const pct = x => (x*100).toFixed(1)+'%';
const n0 = x => Math.round(x).toLocaleString('en-US');

export function runAudit({ hist, ledgers, monthly, V, A, state }){
  const F = [];
  const add = (id, sev, layer, title, detail, fix) => F.push({ id, sev, layer, title, detail, fix });
  if (!hist.length){ add('nodata','crit','L1','No input data','At least one year of trial balance or tax return is required for the valuation.','Drag and drop the trial balance Excel or the tax return PDF.'); return finish(F); }

  // L1 — coverage
  const years = hist.map(h=>h.year);
  if (hist.length < 3) add('years','warn','L1','Short historical period', years.length+' year(s) loaded; at least 3 years are recommended for trend analysis and normalization.','Add trial balances or tax returns for earlier years.');
  for (let i=1;i<years.length;i++) if (years[i]-years[i-1]>1) add('gap'+years[i],'warn','L1','Year gap',`A year is missing between ${years[i-1]} and ${years[i]}.`,'Upload the file for the missing year.');
  const dup = years.filter((y,i)=>years.indexOf(y)!==i);
  if (dup.length) add('dup','crit','L1','Multiple files for the same year',`Year ${[...new Set(dup)].join(', ')} was uploaded more than once.`,'Remove the extra file in L1.');

  for (const h of hist){
    const L = h.L;
    if (L.totals.fileDt && Math.abs(L.totals.fileDt - L.totals.fileCt) > 1) add('mzt'+h.year,'crit','L2',`${h.year} trial balance debit/credit not equal`,`Debit total ${n0(L.totals.fileDt)} ₺, credit total ${n0(L.totals.fileCt)} ₺.`,'Re-export the trial balance from the source system.');
    if (Math.abs(h.bs.check) > Math.max(1, h.bs.TA*0.0005)) add('bs'+h.year,'crit','L3',`${h.year} balance sheet doesn't balance`,`Assets − liabilities difference is ${n0(h.bs.check)} ₺. There may be an unmapped account or a missing line.`,'Check the L2 mapping queue.');
    if (h.bs.computedProfit) add('open'+h.year,'info','L3',`${h.year} trial balance is pre-closing`,`Period profit (${n0(h.bs.computedProfit)} ₺) was computed from income statement balances and added to equity.`,'Replace the file once the final trial balance is available.');
    if (h.months && h.months<12) add('part'+h.year,'warn','L4',`${h.year} partial period (${h.months} mo)`,`Income statement annualized ×${(h.annualize||1).toFixed(2)}. Seasonality can distort the margin.`,'Review the annualization factor in L4.');
    if (h.is.da.source!=='sub') add('da'+h.year,'warn','L4',`${h.year} depreciation could not be read directly`, h.is.da.source==='delta' ? 'Estimated from the change in accumulated depreciation.' : h.is.da.source==='manual' ? 'Entered manually.' : 'Estimated as a percentage of revenue (4%); EBITDA reliability is low.','Upload a trial balance with sub-accounts, or enter the amount in L4.');
    const c7 = h.is.cost7, s7 = c7.mat+c7.lab+c7.ovh;
    if (s7>0 && h.is.cogs>0 && Math.abs(s7-h.is.cogs)/h.is.cogs > 0.15) add('7a'+h.year,'warn','L4',`${h.year} cost sub-accounts inconsistent with COGS`,`710+720+730 = ${n0(s7)} ₺, 62x COGS = ${n0(h.is.cogs)} ₺ (diff ${pct((h.is.cogs-s7)/h.is.cogs)}). Inventory movement and merchandise cost differences explain this; the cost mix is used only as a ratio.`,'Reconcile with the inventory movement report.');
    if (L.acc['698'] || L.acc['648'] || L.acc['658']) add('infl'+h.year,'info','L4',`${h.year} inflation adjustment traces`,'Accounts 698/648/658 have activity. Adjusted vs. unadjusted amounts can hurt year-over-year comparability.','Compare on a consistent basis; use real TRY analysis if needed.');
    if (h.kpi.invS > 0.2) add('inv'+h.year,'warn','L3',`${h.year} inventory / revenue high`,`Inventory is ${pct(h.kpi.invS)} of revenue (DIO ${Math.round(h.kpi.dio)} days). Target is under 20%.`,'Model inventory improvement separately in the NWC assumption.');
    const doubt = (L.acc['128']?.db||0); if (doubt && h.bs.v.tradeRec && doubt/(h.bs.v.tradeRec+doubt) > 0.05) add('doubt'+h.year,'info','L3',`${h.year} doubtful receivables share`,`Account 128 is ${pct(doubt/(h.bs.v.tradeRec+doubt))} of gross trade receivables.`,'Discount collectability in the valuation.');
  }
  const last = hist[hist.length-1];
  if (last.bs.partners > 0) add('partners','info','L6','Classification of due-to-shareholders',`Due to shareholders is ${n0(last.bs.partners)} ₺. ${state.partnersAsDebt!==false?'Included in net debt.':'Treated as equity-like.'} This choice directly changes the equity value.`,'Decide based on the agreement and repayment plan.');
  if (last.kpi.ndEbitda > 3) add('lev','warn','L3','High leverage',`Net debt / EBITDA is ${last.kpi.ndEbitda.toFixed(1)}x.`,'Review the cost of debt and D/E assumption.');
  if (last.kpi.cover && last.kpi.cover < 2) add('cover','warn','L4','Low interest coverage',`EBIT / finance expense is ${last.kpi.cover.toFixed(1)}x.`,'Reflect the financing risk in the discount rate.');

  // Sales report reconciliation
  for (const h of hist){
    const ms = monthly.filter(m=>m.y===h.year);
    if (ms.length===12){
      const r = ms.reduce((s,m)=>s+m.rev,0); const d = (r - h.is.netSales)/h.is.netSales;
      if (Math.abs(d) > 0.03) add('rec'+h.year,'warn','L4',`${h.year} sales report differs from trial balance`,`Monthly report total ${n0(r)} ₺, trial balance net sales ${n0(h.is.netSales)} ₺ (diff ${pct(d)}). The valuation is based on the trial balance.`,'Reconcile returns, discounts, VAT and intra-group sales differences.');
    }
  }
  const addb = (state.addbacks||[]).filter(a=>a.on);
  const noEv = addb.filter(a=>!a.ev).reduce((s,a)=>s+(+a.tl||0),0);
  if (noEv && last.ebitdaAdj && noEv/last.ebitdaAdj > 0.05) add('addb','warn','L4','Unsupported add-backs',`Add-backs without supporting evidence are ${pct(noEv/last.ebitdaAdj)} of EBITDA.`,'Attach documentation or remove the add-back.');

  if (V && A){
    if (A.tvMethod==='gordon' && A.tg >= V.P.w) add('g','crit','L6','Terminal growth ≥ WACC','The Gordon model is undefined; no value is produced.','Bring terminal growth below WACC.');
    if (V.D.tvShare > 0.75) add('tv','warn','L6','Terminal value share high',`${pct(V.D.tvShare)} of enterprise value comes from the terminal value.`,'Extend the projection period or document the terminal assumptions.');
    const histMax = Math.max(...hist.map(h=>h.kpi.ebitdaM));
    const projMax = Math.max(...V.P.rows.map(r=>r.margin));
    if (projMax > histMax + 0.03) add('margin','warn','L5','Margin expansion beyond historical range',`Projected EBITDA margin reaches ${pct(projMax)}; historical high is ${pct(histMax)}.`,'Tie the cost improvement to concrete actions (contribution-level analysis).');
    const cagr = hist.length>1 ? Math.pow(last.usd.rev/hist[0].usd.rev, 1/(last.year-hist[0].year))-1 : null;
    const avgG = A.growth.slice(0,A.N).reduce((s,g)=>s+g,0)/A.N;
    if (cagr!=null && avgG > cagr + 0.05) add('growth','warn','L5','Growth assumption above historical',`Average growth is ${pct(avgG)}, historical USD CAGR is ${pct(cagr)}.`,'Support with capacity, order book and market data.');
    if (V.spread > 1.6) add('spread','info','L6','Wide spread between methods',`Highest / lowest method ratio is ${V.spread.toFixed(2)}x.`,'Review weights and normalization; the spread indicates a negotiation range.');
    if (V.eq < 0) add('negeq','crit','L6','Equity value negative','The weighted enterprise value does not cover net debt.','Check the assumptions and net debt classification.');
    const sec = A.mult; if (sec.value > 8 && /^tr/.test(sec.sector)) add('mult','warn','L6','Multiple above Turkey range',`${sec.value.toFixed(1)}x selected; the Turkish private-sector range is 4.0x–7.5x.`,'Apply a liquidity/country discount or document the rationale.');
    if (A.y1Mode==='runrate') add('rr','info','L5','First-year revenue derived from interim data','Current-year monthly sales were annualized and adjusted with a reconciliation factor against the trial balance.','Adjust the factor if seasonality applies.');
  }
  return finish(F);
}

function finish(F){
  const w = { crit: 2.0, warn: 0.6, info: 0.15 };
  const open = F.filter(f=>!f.closed);
  const score = Math.max(0, Math.min(10, 10 - open.reduce((s,f)=>s+w[f.sev],0)));
  return { findings: F, score };
}
