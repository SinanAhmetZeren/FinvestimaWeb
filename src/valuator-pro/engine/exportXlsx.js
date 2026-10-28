import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { SECTOR_MULTIPLES } from './valuation.js';

const r1 = x => (x==null||!isFinite(x)) ? null : Math.round(x*10)/10;

// --- SVG chart builders (mirrors src/valuator-pro/charts.jsx, standalone for export) ---
const nf0 = (x,d=1) => isFinite(x) ? x.toLocaleString('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }) : '—';
const pc0 = (x,d=1) => isFinite(x) ? (x*100).toLocaleString('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d })+'%' : '—';

function revenueChartSvg(data){
  if (!data.length) return null;
  const W=640,H=210,pl=46,pr=40,pt=14,pb=26;
  const maxR = Math.max(...data.map(d=>d.rev))*1.12 || 1;
  const maxM = Math.max(0.05, ...data.map(d=>d.margin||0))*1.25;
  const bw = (W-pl-pr)/data.length;
  const y = v => pt + (H-pt-pb)*(1 - v/maxR);
  const ym = v => pt + (H-pt-pb)*(1 - v/maxM);
  const ticks = [0,.25,.5,.75,1].map(t=>t*maxR);
  const pts = data.map((d,i)=>[pl+bw*i+bw/2, ym(d.margin||0)]);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  ticks.forEach(t=>{ s += `<line x1="${pl}" x2="${W-pr}" y1="${y(t)}" y2="${y(t)}" stroke="#E4E9F2"/><text x="${pl-6}" y="${y(t)+3}" font-size="9" fill="#7C8AA5" text-anchor="end">${nf0(t/1000,1)}</text>`; });
  data.forEach((d,i)=>{
    s += `<rect x="${pl+bw*i+bw*0.18}" y="${y(d.rev)}" width="${bw*0.64}" height="${Math.max(0,y(0)-y(d.rev))}" fill="${d.proj?'#B8862B':'#1F3A68'}" rx="2"/>`;
    s += `<text x="${pl+bw*i+bw/2}" y="${H-8}" font-size="9" fill="#7C8AA5" text-anchor="middle">${d.l}</text>`;
  });
  s += `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#2C8C8C" stroke-width="2"/>`;
  pts.forEach((p,i)=>{ s += `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#2C8C8C"/><text x="${p[0]}" y="${p[1]-7}" font-size="9" fill="#1A2540" text-anchor="middle">${pc0(data[i].margin,1)}</text>`; });
  s += `<text x="${pl}" y="10" font-size="9" fill="#7C8AA5">M USD ciro</text><text x="${W-pr+4}" y="10" font-size="9" fill="#7C8AA5">FAVÖK %</text>`;
  s += `</svg>`;
  return s;
}

function bridgeSvg(steps){
  const W=640,H=200,pl=12,pr=12,pt=18,pb=34;
  let run=0; const bars=[];
  steps.forEach(st=>{ if (st.total){ bars.push({...st,a:0,b:st.v}); run=st.v; } else { bars.push({...st,a:run,b:run+st.v}); run+=st.v; } });
  const vals = bars.flatMap(b=>[b.a,b.b]); const mn=Math.min(0,...vals), mxv=Math.max(...vals)*1.1||1;
  const y=v=> pt+(H-pt-pb)*(1-(v-mn)/(mxv-mn)); const bw=(W-pl-pr)/bars.length;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  s += `<line x1="${pl}" x2="${W-pr}" y1="${y(0)}" y2="${y(0)}" stroke="#E4E9F2"/>`;
  bars.forEach((b,i)=>{
    const top = y(Math.max(b.a,b.b)), hgt = Math.max(1.5, Math.abs(y(b.a)-y(b.b)));
    const fill = b.total ? '#1F3A68' : (b.v<0 ? '#B34A3C' : '#B8862B');
    s += `<rect x="${pl+bw*i+bw*.15}" y="${top}" width="${bw*.7}" height="${hgt}" fill="${fill}" rx="2"/>`;
    s += `<text x="${pl+bw*i+bw/2}" y="${top-5}" font-size="10" fill="#1A2540" text-anchor="middle">${nf0(b.v/1000,1)}</text>`;
    s += `<text x="${pl+bw*i+bw/2}" y="${H-18}" font-size="9" fill="#7C8AA5" text-anchor="middle">${b.l}</text>`;
  });
  s += `</svg>`;
  return s;
}

function footballFieldSvg(items, marker){
  const W=640, rowH=34, pl=170, pr=24, pt=10, H = pt + items.length*rowH + 30;
  const all = items.flatMap(i=>[i.lo,i.hi,i.mid]).concat(marker!=null?[marker]:[]).filter(isFinite);
  let mn = Math.min(0, ...all), mxv = Math.max(...all)*1.08;
  if (!(mxv>mn)) mxv = mn+1;
  const x = v => pl + (W-pl-pr)*(v-mn)/(mxv-mn);
  const tv = Array.from({length:6},(_,i)=>mn+(mxv-mn)*i/5);
  const colors = ['#5B6EA8','#2C8C8C','#8C5B8C'];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  tv.forEach(t=>{ s += `<line x1="${x(t)}" x2="${x(t)}" y1="${pt}" y2="${H-22}" stroke="#E4E9F2"/><text x="${x(t)}" y="${H-8}" font-size="9" fill="#7C8AA5" text-anchor="middle">${nf0(t/1000,1)}</text>`; });
  items.forEach((it,i)=>{
    const yy = pt + i*rowH + 8;
    s += `<text x="${pl-10}" y="${yy+12}" font-size="11" fill="#1A2540" text-anchor="end">${it.l}</text>`;
    s += `<rect x="${x(Math.min(it.lo,it.hi))}" y="${yy}" width="${Math.max(3,Math.abs(x(it.hi)-x(it.lo)))}" height="18" rx="3" fill="${colors[i%colors.length]}"/>`;
    s += `<line x1="${x(it.mid)}" x2="${x(it.mid)}" y1="${yy-3}" y2="${yy+21}" stroke="#1A2540" stroke-width="2"/>`;
    s += `<text x="${x(Math.max(it.lo,it.hi))+6}" y="${yy+13}" font-size="9" fill="#7C8AA5">${nf0(it.mid/1000,1)}</text>`;
  });
  if (marker!=null) s += `<line x1="${x(marker)}" x2="${x(marker)}" y1="${pt-4}" y2="${H-22}" stroke="#B8862B" stroke-width="2" stroke-dasharray="4 3"/><text x="${x(marker)+4}" y="${pt+10}" font-size="10" fill="#B8862B">Ağırlıklı ${nf0(marker/1000,1)}</text>`;
  s += `<text x="${W-pr}" y="${pt+4}" font-size="9" fill="#7C8AA5" text-anchor="end">M USD özkaynak</text>`;
  s += `</svg>`;
  return s;
}

function svgToPngDataUrl(svgString, scale=2){
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.documentElement;
    const w = +svgEl.getAttribute('width'), h = +svgEl.getAttribute('height');
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w*scale; canvas.height = h*scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/png'), w, h });
    };
    img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

async function addChartImage(wb, sheet, svgString, anchorCell, maxWidthPx=480){
  if (!svgString) return;
  const { dataUrl, w, h } = await svgToPngDataUrl(svgString);
  const imgId = wb.addImage({ base64: dataUrl, extension: 'png' });
  const ratio = h/w;
  const width = maxWidthPx, height = maxWidthPx*ratio;
  sheet.addImage(imgId, { tl: { col: anchorCell.col, row: anchorCell.row }, ext: { width, height } });
}

export async function exportWorkbook({ company, hist, V, A, audit }){
  const wb = new ExcelJS.Workbook();
  const yrs = hist.map(h=>h.year);
  const addSheet = (name, aoa) => { const ws = wb.addWorksheet(name); aoa.forEach(row => ws.addRow(row)); return ws; };

  // Bilanço (TL)
  const bs = [['Bilanço Özeti (TL)', ...yrs], []];
  const secNames = hist[0]?.bs.secs.map(s=>s.sec) || [];
  secNames.forEach((sn,si) => {
    bs.push([sn.toLocaleUpperCase('tr-TR'), ...hist.map(h=>Math.round(h.bs.secs[si].total))]);
    hist[0].bs.secs[si].lines.forEach((l,li) => bs.push(['  '+l.n, ...hist.map(h=>Math.round(h.bs.secs[si].lines[li].v))]));
  });
  bs.push([], ['TOPLAM AKTİF', ...hist.map(h=>Math.round(h.bs.TA))], ['TOPLAM PASİF', ...hist.map(h=>Math.round(h.bs.TP))],
    ['Net işletme sermayesi', ...hist.map(h=>Math.round(h.bs.nwc))], ['Net finansal borç', ...hist.map(h=>Math.round(h.bs.netDebt))],
    ['Yatırılmış sermaye', ...hist.map(h=>Math.round(h.bs.investedCapital))], ['Net aktifler (özkaynak)', ...hist.map(h=>Math.round(h.bs.EQ))]);
  addSheet('Bilanço TL', bs);

  // Gelir tablosu (TL)
  const isRows = [['Brüt satışlar','grossSales'],['Satış indirimleri (-)','deductions'],['Net satışlar','netSales'],['Satışların maliyeti (-)','cogs'],['Brüt kâr','gross'],
    ['Ar-Ge giderleri (-)','rnd'],['Pazarlama, satış ve dağıtım (-)','psd'],['Genel yönetim (-)','ga'],['Faaliyet kârı (FVÖK)','ebit'],
    ['Diğer olağan gelirler','otherInc'],['Diğer olağan giderler (-)','otherExp'],['Finansman giderleri (-)','finExp'],['Olağandışı gelirler','extraInc'],['Olağandışı giderler (-)','extraExp'],
    ['Vergi öncesi kâr','ebt'],['Vergi karşılığı (-)','tax'],['Net kâr','net']];
  const is = [['Gelir Tablosu (TL)', ...yrs], ...isRows.map(([n,k])=>[n, ...hist.map(h=>Math.round(h.is[k]))]),
    [], ['Amortisman', ...hist.map(h=>Math.round(h.is.da.total))], ['FAVÖK', ...hist.map(h=>Math.round(h.is.ebitda))], ['Geri eklemeler', ...hist.map(h=>Math.round(h.addb))], ['Normalize FAVÖK', ...hist.map(h=>Math.round(h.ebitdaAdj))]];
  const isSheet = addSheet('Gelir Tablosu TL', is);
  await addChartImage(wb, isSheet, revenueChartSvg(hist.map(h=>({ l:String(h.year), rev:h.usd.rev, margin:h.kpi.ebitdaM }))), { col: isRows.length>0 ? yrs.length+2 : 2, row: 1 });

  // USD özet
  const uk = [['Net satışlar','rev'],['SMM','cogs'],['Brüt kâr','gross'],['Faaliyet giderleri','opex'],['FVÖK','ebit'],['Amortisman','da'],['Normalize FAVÖK','ebitdaAdj'],['Net kâr','net'],
    ['Net işletme sermayesi','nwc'],['Net borç','netDebt'],['Özkaynak','equity'],['Yatırılmış sermaye','ic']];
  const us = [["USD '000", ...yrs], ['Ortalama kur', ...hist.map(h=>h.fx.avg)], ['Yıl sonu kur', ...hist.map(h=>h.fx.end)], ...uk.map(([n,k])=>[n, ...hist.map(h=>r1(h.usd[k]))])];
  addSheet('USD Özet', us);

  if (V){
    const R = V.P.rows;
    const pk = [['Net satışlar','rev'],['Büyüme','g'],['Malzeme','mat'],['Direkt işçilik','lab'],['Genel üretim (amort. hariç)','ovh'],['Pazarlama-satış','psd'],['Genel yönetim','ga'],
      ['FAVÖK','ebitda'],['FAVÖK marjı','margin'],['Amortisman','da'],['FVÖK','ebit'],['Vergi','tax'],['NOPLAT','noplat'],['Yatırım (CAPEX)','capex'],['NİS','nwc'],['NİS değişimi','dnwc'],
      ['Serbest nakit akımı (FCFF)','fcf'],['İskonto katsayısı','df'],['Bugünkü değer','pv'],['ROIC','roic'],['EVA','eva']];
    const pr = [["Projeksiyon USD '000", V.B.year+' (baz)', ...R.map(r=>r.year)], ...pk.map(([n,k])=>[n, '', ...R.map(r=> (k==='g'||k==='margin'||k==='roic'||k==='df') ? Math.round(r[k]*10000)/10000 : r1(r[k]))])];
    const prSheet = addSheet('Projeksiyon & FCF', pr);
    const H3 = hist.slice(-3), HU = H3.map(h=>h.usd);
    await addChartImage(wb, prSheet, revenueChartSvg([...H3.map((h,i)=>({ l:String(h.year), rev:HU[i].rev, margin:HU[i].ebitda/HU[i].rev })), ...R.map(r=>({ l:String(r.year), rev:r.rev, margin:r.margin, proj:true }))]), { col: R.length+3, row: 1 });

    const W = V.P.W;
    const val = [["Değerleme Özeti (USD '000)"], [], ['Yöntem','Firma değeri (EV)','Özkaynak değeri','Ağırlık'],
      ['İndirgenmiş nakit akımı (DCF)', r1(V.m1.ev), r1(V.m1.eq), A.weights.dcf],
      ['FAVÖK çarpanı', r1(V.m2.ev), r1(V.m2.eq), A.weights.mult],
      ['Net aktifler', r1(V.m3.ev), r1(V.m3.eq), A.weights.na],
      ['Ağırlıklı', r1(V.ev), r1(V.eq), ''], [],
      ['Net borç', r1(V.nd)], ['Potansiyel şerefiye (özkaynak − net aktif)', r1(V.goodwill)], ['Zımni EV/FAVÖK', r1(V.impliedMult)], ['Terminal değer payı', Math.round(V.D.tvShare*1000)/1000], [],
      ['WACC', Math.round(W.value*10000)/10000], ['Özkaynak maliyeti', Math.round(W.ke*10000)/10000], ['Kaldıraçlı beta', Math.round(W.betaL*100)/100], ['Terminal büyüme', A.tg], ['FAVÖK çarpanı', A.mult.value], [],
      ['Duyarlılık: özkaynak değeri (WACC satır × g sütun)', ...V.gSteps.map(g=>Math.round(g*1000)/1000)],
      ...V.wSteps.map((w,i)=>[Math.round(w*1000)/1000, ...V.sens[i].map(r1)])];
    const valSheet = addSheet('Değerleme', val);

    await addChartImage(wb, valSheet, bridgeSvg([{l:'BD nakit akımı',v:V.D.pvSum},{l:'BD terminal değer',v:V.D.pvTv},{l:'Firma değeri',v:V.D.ev,total:true},{l:'Net borç',v:-V.nd},{l:'Özkaynak',v:V.m1.eq,total:true}]), { col: 0, row: val.length+2 });

    const sec = SECTOR_MULTIPLES.find(s=>s.k===A.mult.sector);
    const dcfVals = V.sens.flat().filter(isFinite);
    const ff = [
      { l:'İndirgenmiş nakit akımı', lo: Math.min(...dcfVals), hi: Math.max(...dcfVals), mid: V.m1.eq },
      { l:'FAVÖK çarpanı', lo: V.m2.basis*(sec?.lo ?? A.mult.value-1)*(1-A.mult.disc) - V.nd, hi: V.m2.basis*(sec?.hi ?? A.mult.value+1)*(1-A.mult.disc) - V.nd, mid: V.m2.eq },
      { l:'Net aktifler', lo: Math.min(V.B.equity-V.B.intang, V.m3.eq), hi: Math.max(V.B.equity + (+A.na.uplift||0), V.m3.eq), mid: V.m3.eq },
    ];
    await addChartImage(wb, valSheet, footballFieldSvg(ff, V.eq), { col: 0, row: val.length+14 });

    const as = [['Varsayım','Değer'], ['Projeksiyon süresi (yıl)', A.N], ...A.growth.slice(0,A.N).map((g,i)=>['Büyüme Y+'+(i+1), g]),
      ...Object.entries(A.costs).map(([k,c])=>['Maliyet/ciro '+k+' (başlangıç → hedef)', `${(c.s*100).toFixed(1)}% → ${(c.e*100).toFixed(1)}%`]),
      ['CAPEX / ciro', A.capexPct], ['NİS / ciro', A.nwcPct], ['Yeni yatırım amortisman ömrü', A.daLife], ['Vergi oranı', A.taxRate],
      ['Risksiz faiz', A.wacc.rf], ['Piyasa risk primi', A.wacc.erp], ['Ülke risk primi', A.wacc.crp], ['Kaldıraçsız beta', A.wacc.betaU], ['Ölçek primi', A.wacc.size], ['Borç maliyeti (vergi öncesi)', A.wacc.kd], ['Hedef D/E', A.wacc.de],
      ['Yıl ortası iskonto', A.midYear?'Evet':'Hayır'], ['Terminal yöntemi', A.tvMethod==='exit'?'Çıkış çarpanı':'Gordon'], ['Senaryo', A.scenario]];
    addSheet('Varsayımlar', as);
  }
  if (audit){
    const au = [['Önem','Katman','Bulgu','Açıklama','Öneri','Durum'], ...audit.findings.map(f=>[f.sev==='crit'?'Kritik':f.sev==='warn'?'Uyarı':'Bilgi', f.layer, f.title, f.detail, f.fix, f.closed?'Kapatıldı':'Açık']), [], ['Güven skoru', Math.round(audit.score*10)/10]];
    addSheet('Denetim', au);
  }

  const name = (company||'Degerleme').replace(/[^\wçğıöşüÇĞİÖŞÜ-]+/g,'_');
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${name}_Valuator_${new Date().toISOString().slice(0,10)}.xlsx`);
}
