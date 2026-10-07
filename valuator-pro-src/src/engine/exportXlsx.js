import * as XLSX from 'xlsx';

const r1 = x => (x==null||!isFinite(x)) ? null : Math.round(x*10)/10;

export function exportWorkbook({ company, hist, V, A, audit, unitNote }){
  const wb = XLSX.utils.book_new();
  const yrs = hist.map(h=>h.year);

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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bs), 'Bilanço TL');

  // Gelir tablosu (TL)
  const isRows = [['Brüt satışlar','grossSales'],['Satış indirimleri (-)','deductions'],['Net satışlar','netSales'],['Satışların maliyeti (-)','cogs'],['Brüt kâr','gross'],
    ['Ar-Ge giderleri (-)','rnd'],['Pazarlama, satış ve dağıtım (-)','psd'],['Genel yönetim (-)','ga'],['Faaliyet kârı (FVÖK)','ebit'],
    ['Diğer olağan gelirler','otherInc'],['Diğer olağan giderler (-)','otherExp'],['Finansman giderleri (-)','finExp'],['Olağandışı gelirler','extraInc'],['Olağandışı giderler (-)','extraExp'],
    ['Vergi öncesi kâr','ebt'],['Vergi karşılığı (-)','tax'],['Net kâr','net']];
  const is = [['Gelir Tablosu (TL)', ...yrs], ...isRows.map(([n,k])=>[n, ...hist.map(h=>Math.round(h.is[k]))]),
    [], ['Amortisman', ...hist.map(h=>Math.round(h.is.da.total))], ['FAVÖK', ...hist.map(h=>Math.round(h.is.ebitda))], ['Geri eklemeler', ...hist.map(h=>Math.round(h.addb))], ['Normalize FAVÖK', ...hist.map(h=>Math.round(h.ebitdaAdj))]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(is), 'Gelir Tablosu TL');

  // USD özet
  const uk = [['Net satışlar','rev'],['SMM','cogs'],['Brüt kâr','gross'],['Faaliyet giderleri','opex'],['FVÖK','ebit'],['Amortisman','da'],['Normalize FAVÖK','ebitdaAdj'],['Net kâr','net'],
    ['Net işletme sermayesi','nwc'],['Net borç','netDebt'],['Özkaynak','equity'],['Yatırılmış sermaye','ic']];
  const us = [["USD '000", ...yrs], ['Ortalama kur', ...hist.map(h=>h.fx.avg)], ['Yıl sonu kur', ...hist.map(h=>h.fx.end)], ...uk.map(([n,k])=>[n, ...hist.map(h=>r1(h.usd[k]))])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(us), 'USD Özet');

  if (V){
    const R = V.P.rows;
    const pk = [['Net satışlar','rev'],['Büyüme','g'],['Malzeme','mat'],['Direkt işçilik','lab'],['Genel üretim (amort. hariç)','ovh'],['Pazarlama-satış','psd'],['Genel yönetim','ga'],
      ['FAVÖK','ebitda'],['FAVÖK marjı','margin'],['Amortisman','da'],['FVÖK','ebit'],['Vergi','tax'],['NOPLAT','noplat'],['Yatırım (CAPEX)','capex'],['NİS','nwc'],['NİS değişimi','dnwc'],
      ['Serbest nakit akımı (FCFF)','fcf'],['İskonto katsayısı','df'],['Bugünkü değer','pv'],['ROIC','roic'],['EVA','eva']];
    const pr = [["Projeksiyon USD '000", V.B.year+' (baz)', ...R.map(r=>r.year)], ...pk.map(([n,k])=>[n, '', ...R.map(r=> (k==='g'||k==='margin'||k==='roic'||k==='df') ? Math.round(r[k]*10000)/10000 : r1(r[k]))])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pr), 'Projeksiyon & FCF');

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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(val), 'Değerleme');

    const as = [['Varsayım','Değer'], ['Projeksiyon süresi (yıl)', A.N], ...A.growth.slice(0,A.N).map((g,i)=>['Büyüme Y+'+(i+1), g]),
      ...Object.entries(A.costs).map(([k,c])=>['Maliyet/ciro '+k+' (başlangıç → hedef)', `${(c.s*100).toFixed(1)}% → ${(c.e*100).toFixed(1)}%`]),
      ['CAPEX / ciro', A.capexPct], ['NİS / ciro', A.nwcPct], ['Yeni yatırım amortisman ömrü', A.daLife], ['Vergi oranı', A.taxRate],
      ['Risksiz faiz', A.wacc.rf], ['Piyasa risk primi', A.wacc.erp], ['Ülke risk primi', A.wacc.crp], ['Kaldıraçsız beta', A.wacc.betaU], ['Ölçek primi', A.wacc.size], ['Borç maliyeti (vergi öncesi)', A.wacc.kd], ['Hedef D/E', A.wacc.de],
      ['Yıl ortası iskonto', A.midYear?'Evet':'Hayır'], ['Terminal yöntemi', A.tvMethod==='exit'?'Çıkış çarpanı':'Gordon'], ['Senaryo', A.scenario]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(as), 'Varsayımlar');
  }
  if (audit){
    const au = [['Önem','Katman','Bulgu','Açıklama','Öneri','Durum'], ...audit.findings.map(f=>[f.sev==='crit'?'Kritik':f.sev==='warn'?'Uyarı':'Bilgi', f.layer, f.title, f.detail, f.fix, f.closed?'Kapatıldı':'Açık']), [], ['Güven skoru', Math.round(audit.score*10)/10]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(au), 'Denetim');
  }
  const name = (company||'Degerleme').replace(/[^\wçğıöşüÇĞİÖŞÜ-]+/g,'_');
  XLSX.writeFile(wb, `${name}_Valuator_${new Date().toISOString().slice(0,10)}.xlsx`);
}
