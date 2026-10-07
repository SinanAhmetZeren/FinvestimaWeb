import { BS_ASSETS, BS_LIABS } from './accounts.js';
import { sumBal, bal, flow, sumFlow, range, depreciationFromSub } from './ledger.js';

// Varsayılan USD/TRY kurları — kaynak Excel'deki "Aylık USD_TRY Kurlar" sayfası (2023–2026/07).
// 2020–2022 değerleri yaklaşık değerlerdir; kullanmadan önce kontrol edin.
export const DEFAULT_FX = {
  2020:{avg:7.02,end:7.43,approx:true}, 2021:{avg:8.89,end:13.32,approx:true}, 2022:{avg:16.57,end:18.70,approx:true},
  2023:{avg:23.78,end:29.4913}, 2024:{avg:32.855,end:35.2868}, 2025:{avg:39.537,end:42.9395},
  2026:{avg:44.616,end:47.075,partial:true},
};

export function buildBS(L, opts = {}){
  const v = {};
  const secs = [];
  for (const side of [BS_ASSETS, BS_LIABS]){
    for (const s of side){
      const isAsset = side===BS_ASSETS;
      const lines = s.lines.map(l => {
        const raw = sumBal(L, l.r[0], l.r[1], l.ex||[]);
        const val = isAsset ? raw : -raw;
        v[l.k] = val; return { ...l, v: val };
      });
      secs.push({ sec:s.sec, side: isAsset?'A':'P', lines, total: lines.reduce((a,b)=>a+b.v,0) });
    }
  }
  // Kapanmamış mizan: dönem kârı özkaynakta yoksa gelir tablosu bakiyelerinden hesapla
  let computedProfit = 0;
  const has590 = Math.abs(bal(L,590))+Math.abs(bal(L,591)) > 0.5;
  if (!L.closed && !has590){
    computedProfit = -(sumBal(L,600,689) + bal(L,691));
    if (Math.abs(computedProfit) > 0.5){
      const eq = secs.find(s=>s.sec==='Özkaynaklar');
      const ln = eq.lines.find(l=>l.k==='netProfit');
      ln.v += computedProfit; ln.computed = true; v.netProfit = ln.v;
      eq.total += computedProfit;
    }
  }
  const T = n => secs.find(s=>s.sec===n).total;
  const CA = T('Dönen Varlıklar'), NCA = T('Duran Varlıklar'), STL = T('Kısa Vadeli Yabancı Kaynaklar'),
        LTL = T('Uzun Vadeli Yabancı Kaynaklar'), EQ = T('Özkaynaklar');
  const TA = CA+NCA, TP = STL+LTL+EQ;
  const partners = v.partnersST + v.partnersLT;
  const finDebt = v.finDebtST + v.finDebtLT + (opts.partnersAsDebt!==false ? partners : 0);
  const cash = v.cash + v.secs;
  const netDebt = finDebt - cash;
  const opCA = v.tradeRec + v.otherRec + v.inv + v.advGiven + v.constr + v.prepaid + v.otherCA;
  const opCL = v.tradePay + v.otherPayST + v.advRecv + v.constrPr + v.taxPay + v.provST + v.defIncST + v.otherSTL
             + (opts.partnersAsDebt===false ? 0 : 0);
  const nwc = opCA - opCL;
  const investedCapital = EQ + v.finDebtST + v.finDebtLT + partners - cash;
  return { v, secs, CA, NCA, TA, STL, LTL, EQ, TP, check: TA-TP, finDebt, cash, netDebt, partners, nwc, opCA, opCL,
    netAssets: EQ, investedCapital, tangibleEquity: EQ - v.intang, computedProfit };
}

export function buildIS(L, prevL, opts = {}){
  const k = opts.annualize || 1;
  const F = codes => sumFlow(L, codes) * k;
  const grossSales = F([600,601,602]);
  const deductions = F([610,611,612]);
  const netSales = grossSales - deductions;
  const cogs = F([620,621,622,623]);
  const gross = netSales - cogs;
  const rnd = F([630]), psd = F([631]), ga = F([632]);
  const opex = rnd+psd+ga;
  const ebit = gross - opex;
  const otherInc = F(range(640,649)), otherExp = F(range(650,659));
  const fxGain = F([646]), fxLoss = F([656]), infl = F([648]) - F([658]);
  const finExp = F([660,661]);
  const ordinary = ebit + otherInc - otherExp - finExp;
  const extraInc = F([671,679]), extraExp = F([680,681,689]);
  const ebt = ordinary + extraInc - extraExp;
  const tax = F([691]);
  const net = ebt - tax;
  const cost7 = { mat: F([710]), lab: F([720]), ovh: F([730]), rnd: F([750]), psd: F([760]), ga: F([770]), fin: F([780]) };
  const domestic = F([600]), exportS = F([601]);

  // Amortisman: alt hesap → birikmiş amortisman farkı → oran tahmini → elle giriş
  let da = null;
  const sub = depreciationFromSub(L);
  if (sub && sub.total>0) da = { total: sub.total*k, cogs: sub.by.cogs*k, psd: sub.by.psd*k, ga: (sub.by.ga+sub.by.other)*k, rnd: sub.by.rnd*k, source:'sub', rows: sub.rows };
  else if (prevL){
    const acc = l => -(bal(l,257)+bal(l,268)+bal(l,278)+bal(l,299));
    const d = acc(L) - acc(prevL);
    if (d>0) da = split(d*k, 'delta');
  }
  if (!da) da = split(netSales*0.04, 'pct');
  if (opts.daOverride!=null && opts.daOverride!=='' && isFinite(+opts.daOverride)){
    const t = +opts.daOverride, f = da.total ? t/da.total : 0;
    da = da.total ? { total:t, cogs:da.cogs*f, psd:da.psd*f, ga:da.ga*f, rnd:da.rnd*f, source:'manual' } : split(t,'manual');
  }
  da.opex = da.psd + da.ga + da.rnd;
  const ebitda = ebit + da.total;
  return { grossSales, deductions, netSales, domestic, exportS, cogs, gross, rnd, psd, ga, opex, ebit, otherInc, otherExp,
    fxGain, fxLoss, infl, finExp, ordinary, extraInc, extraExp, ebt, tax, net, cost7, da, ebitda };
}

const split = (t, source) => ({ total:t, cogs:t*0.8, psd:t*0.1, ga:t*0.1, rnd:0, source });

// Tarihsel yılları hesapla (TL), ardından USD'ye çevir. ledgers yıla göre sıralı.
export function buildHistory(ledgers, state){
  const years = [];
  const sorted = [...ledgers].sort((a,b)=>a.year-b.year);
  sorted.forEach((L, i) => {
    const prev = i>0 && sorted[i-1].year===L.year-1 ? sorted[i-1] : null;
    const annualize = state.annualize?.[L.id] ?? (L.months && L.months<12 ? 12/L.months : 1);
    const bs = buildBS(L, { partnersAsDebt: state.partnersAsDebt });
    const is = buildIS(L, prev, { annualize, daOverride: state.daOverride?.[L.year] });
    const addb = (state.addbacks||[]).filter(a => a.on && +a.year===L.year).reduce((s,a)=>s+(+a.tl||0),0);
    const fxInc = state.fxInEbitda ? (is.fxGain - is.fxLoss) : 0;
    const ebitdaAdj = is.ebitda + addb + fxInc;
    const fx = { ...(DEFAULT_FX[L.year]||{}), ...(state.fx?.[L.year]||{}) };
    years.push({ year:L.year, id:L.id, L, bs, is, addb, fxInc, ebitdaAdj, fx, annualize, months:L.months });
  });
  // USD dönüşümü ('000 USD): akış → yıl ortalaması, stok → yıl sonu
  for (const y of years){
    const a = y.fx.avg || 1, e = y.fx.end || y.fx.avg || 1;
    const fi = x => x / a / 1000, fb = x => x / e / 1000;
    const I = y.is, B = y.bs;
    y.usd = {
      rev: fi(I.netSales), cogs: fi(I.cogs), gross: fi(I.gross), psd: fi(I.psd), ga: fi(I.ga), rnd: fi(I.rnd), opex: fi(I.opex),
      ebit: fi(I.ebit), da: fi(I.da.total), daCogs: fi(I.da.cogs), daOpex: fi(I.da.opex), daPsd: fi(I.da.psd), daGa: fi(I.da.ga), daRnd: fi(I.da.rnd), ebitda: fi(I.ebitda), ebitdaAdj: fi(y.ebitdaAdj),
      addb: fi(y.addb), finExp: fi(I.finExp), ebt: fi(I.ebt), tax: fi(I.tax), net: fi(I.net),
      mat: fi(I.cost7.mat), lab: fi(I.cost7.lab), ovh: fi(I.cost7.ovh),
      nwc: fb(B.nwc), netDebt: fb(B.netDebt), equity: fb(B.EQ), ic: fb(B.investedCapital), cash: fb(B.cash), finDebt: fb(B.finDebt),
      ta: fb(B.TA), inv: fb(B.v.inv), tradeRec: fb(B.v.tradeRec), tradePay: fb(B.v.tradePay), intang: fb(B.v.intang), ppe: fb(B.v.ppe),
    };
    y.kpi = kpis(y);
  }
  return years;
}

export function kpis(y){
  const I=y.is, B=y.bs, s=I.netSales||1, c=I.cogs||1;
  return {
    gm: I.gross/s, ebitdaM: y.ebitdaAdj/s, ebitM: I.ebit/s, netM: I.net/s,
    current: B.CA/(B.STL||1), quick: (B.CA-B.v.inv)/(B.STL||1),
    dso: B.v.tradeRec/s*365, dio: B.v.inv/c*365, dpo: B.v.tradePay/c*365,
    ccc: B.v.tradeRec/s*365 + B.v.inv/c*365 - B.v.tradePay/c*365,
    nwcS: B.nwc/s, invS: B.v.inv/s, ndEbitda: y.ebitdaAdj ? B.netDebt/y.ebitdaAdj : 0,
    cover: I.finExp ? I.ebit/I.finExp : 0, roe: B.EQ ? I.net/B.EQ : 0, lev: B.TA ? (B.STL+B.LTL)/B.TA : 0,
    exportShare: I.grossSales ? I.exportS/I.grossSales : 0,
  };
}

// 7/A maliyet karması: SMM (amortisman hariç) bileşenlere bölünür
export function cogsMix(y){
  const c = y.is.cost7, daC = y.is.da.cogs;
  const ovhEx = Math.max(0, c.ovh - daC);
  const t = c.mat + c.lab + ovhEx;
  if (t <= 0) return { mat:.7, lab:.1, ovh:.2, from7A:false };
  return { mat:c.mat/t, lab:c.lab/t, ovh:ovhEx/t, from7A:true, sevenA:t+daC };
}
