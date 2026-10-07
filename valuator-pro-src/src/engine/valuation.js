import { cogsMix } from './statements.js';
import { SECTOR_MULTIPLES } from './accounts.js';

const clamp = (x,a,b) => Math.min(b, Math.max(a, x));

// Baz yıl (Y0) — son tarihsel yılın normalize USD değerleri ve maliyet oranları
export function baseYear(hist){
  const b = hist[hist.length-1]; if (!b) return null;
  const u = b.usd, mix = cogsMix(b);
  const cogsEx = Math.max(0, u.cogs - u.daCogs);
  const rev = u.rev || 1;
  const gaEx = Math.max(0, u.ga - u.daGa - u.addb);
  return {
    year: b.year, rev: u.rev, ebitda: u.ebitdaAdj, da: u.da, nwc: u.nwc, netDebt: u.netDebt, equity: u.equity, ic: u.ic,
    intang: u.intang, finExp: u.finExp, finDebt: u.finDebt, mix,
    pct: { mat: cogsEx*mix.mat/rev, lab: cogsEx*mix.lab/rev, ovh: cogsEx*mix.ovh/rev,
           psd: Math.max(0,u.psd-u.daPsd)/rev, ga: gaEx/rev, rnd: Math.max(0,u.rnd-u.daRnd)/rev },
    fxNote: b.fxInc ? 'Kur farkı FAVÖK içinde' : '',
  };
}

export function histCagr(hist){
  if (hist.length<2) return null;
  const a = hist[0].usd.rev, b = hist[hist.length-1].usd.rev, n = hist[hist.length-1].year - hist[0].year;
  return a>0 && n>0 ? Math.pow(b/a, 1/n)-1 : null;
}

export function defaultAssumptions(hist){
  const B = baseYear(hist); if (!B) return null;
  const cg = histCagr(hist);
  const g = cg==null ? 0.08 : clamp(Math.round(cg*100)/100, 0.03, 0.15);
  const costs = {}; for (const k in B.pct) costs[k] = { s: B.pct[k], e: B.pct[k] };
  const de = B.equity>0 ? clamp(B.finDebt/B.equity, 0, 1.5) : 0.5;
  return {
    N: 5, growth: Array(7).fill(g), y1Mode:'growth', runRateFactor: null,
    costs, capexPct: clamp(B.rev ? (B.da/B.rev)*1.2 : 0.05, 0.03, 0.12), nwcPct: clamp(B.rev ? B.nwc/B.rev : 0.2, -0.2, 0.8),
    daLife: 10, daFade: 0, taxRate: 0.25, interestDecline: 0.2,
    wacc: { manual:false, value:0.125, rf:0.043, erp:0.055, crp:0.030, betaU:0.85, size:0.020, kd:0.090, de: Math.round(de*100)/100 },
    tg: 0.03, tvMethod:'gordon', exitMult: 6.0, midYear: true,
    mult: { sector:'trSme', value: 6.0, basis:'ltm', disc: 0 },
    na: { uplift: 0, excludeIntang: false },
    weights: { dcf: 0.4, mult: 0.4, na: 0.2 },
    scenario: 'base',
  };
}

export function waccCalc(w, taxRate){
  const de = Math.max(0, +w.de||0);
  const betaL = w.betaU * (1 + (1-taxRate)*de);
  const ke = w.rf + betaL*w.erp + w.crp + w.size;
  const wd = de/(1+de);
  const kdAfter = w.kd*(1-taxRate);
  const value = (1-wd)*ke + wd*kdAfter;
  return { betaL, ke, wd, we:1-wd, kdAfter, value: w.manual ? w.value : value, built: value };
}

export function runRate(monthly, hist, fxTable, year){
  const ms = monthly.filter(m=>m.y===year);
  if (!ms.length) return null;
  const k = ms.length;
  const fx = fxTable?.[year]?.avg;
  const usd = ms.reduce((s,m)=> s + (m.revUsd ? m.revUsd : (fx ? m.rev/fx : 0)), 0)/1000;
  // Satış raporu ↔ mizan mutabakat katsayısı (baz yıl)
  const b = hist[hist.length-1];
  const bm = monthly.filter(m=>m.y===b.year);
  const recon = bm.length===12 && b.is.netSales ? b.is.netSales / bm.reduce((s,m)=>s+m.rev,0) : 1;
  return { months:k, usd, recon, factor: 12/k };
}

export function project(hist, A, ctx = {}){
  const B = baseYear(hist);
  const N = A.N, rows = [];
  let rev = B.rev, prevNwc = B.nwc, capexCum = [], ic = B.ic;
  const W = waccCalc(A.wacc, A.taxRate), w = W.value;
  for (let t=1;t<=N;t++){
    if (t===1 && A.y1Mode==='runrate' && ctx.rr){ rev = ctx.rr.usd * (A.runRateFactor || ctx.rr.factor) * (ctx.rr.recon||1); }
    else rev = rev * (1 + (A.growth[t-1] ?? A.growth[0]));
    const p = k => A.costs[k].s + (A.costs[k].e - A.costs[k].s) * t / N;
    const mat=rev*p('mat'), lab=rev*p('lab'), ovh=rev*p('ovh'), psd=rev*p('psd'), ga=rev*p('ga'), rnd=rev*p('rnd');
    const cogsEx = mat+lab+ovh, opexEx = psd+ga+rnd;
    const ebitda = rev - cogsEx - opexEx;
    const capex = rev * A.capexPct;
    const daOld = B.da * Math.pow(1 - (A.daFade||0), t);
    const daNew = capexCum.reduce((s,c)=>s+c,0)/A.daLife + capex/(2*A.daLife);
    const da = daOld + daNew; capexCum.push(capex);
    const ebit = ebitda - da;
    const tax = Math.max(0, ebit) * A.taxRate;
    const noplat = ebit - tax;
    const nwc = rev * A.nwcPct, dnwc = nwc - prevNwc; prevNwc = nwc;
    const fcf = noplat + da - capex - dnwc;
    const te = A.midYear ? t-0.5 : t;
    const df = 1/Math.pow(1+w, te);
    const interest = B.finExp * Math.pow(1-A.interestDecline, t);
    const netIncome = (ebit - interest) - Math.max(0, ebit-interest)*A.taxRate;
    const icOpen = ic; ic = ic + capex - da + dnwc;
    const roic = icOpen ? noplat/icOpen : 0;
    rows.push({ t, year: B.year+t, rev, g: t===1 ? rev/B.rev-1 : rev/rows[t-2].rev-1, mat, lab, ovh, cogsEx, gross: rev-cogsEx, psd, ga, rnd, opexEx,
      ebitda, margin: ebitda/rev, da, ebit, tax, noplat, capex, nwc, dnwc, fcf, df, pv: fcf*df, interest, netIncome,
      icOpen, icClose: ic, roic, eva: (roic - w)*icOpen });
  }
  return { B, rows, W, w };
}

export function dcf(P, A, w = P.w, g = A.tg){
  const last = P.rows[P.rows.length-1];
  let pvSum = 0;
  P.rows.forEach(r => { const te = A.midYear ? r.t-0.5 : r.t; pvSum += r.fcf/Math.pow(1+w, te); });
  let tv;
  if (A.tvMethod==='exit') tv = last.ebitda * A.exitMult;
  else tv = w>g ? last.fcf*(1+g)/(w-g) : NaN;
  const pvTv = tv/Math.pow(1+w, P.rows.length);
  const ev = pvSum + pvTv;
  return { pvSum, tv, pvTv, ev, tvShare: ev ? pvTv/ev : 0, impliedExit: last.ebitda ? tv/last.ebitda : 0,
    impliedG: A.tvMethod==='exit' && tv ? (tv*w - last.fcf)/(tv + last.fcf) : g };
}

export function valuate(hist, A, ctx = {}){
  const P = project(hist, A, ctx);
  const B = P.B, nd = B.netDebt;
  const D = dcf(P, A);
  const m1 = { ev: D.ev, eq: D.ev - nd };
  const basis = A.mult.basis==='fwd' ? P.rows[0].ebitda : B.ebitda;
  const mEv = basis * A.mult.value * (1 - (A.mult.disc||0));
  const m2 = { ev: mEv, eq: mEv - nd, basis };
  const naEq = B.equity + (+A.na.uplift||0) - (A.na.excludeIntang ? B.intang : 0);
  const m3 = { ev: naEq + nd, eq: naEq };
  const Wt = A.weights, ws = (Wt.dcf+Wt.mult+Wt.na) || 1;
  const ev = (m1.ev*Wt.dcf + m2.ev*Wt.mult + m3.ev*Wt.na)/ws;
  const eq = ev - nd;
  // Duyarlılık: WACC × g
  const wc = P.w, gc = A.tg;
  const wSteps = [-0.02,-0.01,0,0.01,0.02].map(d=>wc+d), gSteps = [-0.01,-0.005,0,0.005,0.01].map(d=>gc+d);
  const sens = wSteps.map(wv => gSteps.map(gv => { const r = dcf(P, {...A, tvMethod:'gordon'}, wv, gv); return r.ev - nd; }));
  const multSteps = [-2,-1,0,1,2].map(d=>A.mult.value+d);
  const sensM = [B.ebitda, P.rows[0].ebitda].map(e => multSteps.map(m => e*m*(1-(A.mult.disc||0)) - nd));
  const avgRoic = P.rows.reduce((s,r)=>s+r.noplat,0) / (P.rows.reduce((s,r)=>s+r.icOpen,0)||1);
  return { P, B, D, m1, m2, m3, ev, eq, nd, goodwill: eq - B.equity, sens, wSteps, gSteps, sensM, multSteps,
    impliedMult: B.ebitda ? ev/B.ebitda : 0, impliedSales: B.rev ? ev/B.rev : 0, avgRoic,
    spread: Math.max(m1.ev,m2.ev,m3.ev) / Math.max(1e-9, Math.min(m1.ev,m2.ev,m3.ev)) };
}

export function applyScenario(A, kind, base){
  const b = base || A;
  const d = kind==='pess' ? -1 : kind==='opt' ? 1 : 0;
  const costs = {}; for (const k in b.costs) costs[k] = { ...b.costs[k] };
  if (d){ costs.mat = { ...costs.mat, e: costs.mat.e - d*0.01 }; costs.ovh = { ...costs.ovh, e: costs.ovh.e - d*0.005 }; }
  return { ...A, scenario: kind,
    growth: b.growth.map(g => Math.max(-0.2, g + d*0.03)), costs,
    wacc: { ...b.wacc, crp: Math.max(0, b.wacc.crp - d*0.01) },
    mult: { ...b.mult, value: Math.max(1, b.mult.value + d*1) } };
}

export { SECTOR_MULTIPLES };
