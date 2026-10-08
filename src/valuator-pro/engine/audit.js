// Her bulgu: { id, sev: 'crit'|'warn'|'info', layer, title, detail, fix }
const pct = x => '%'+(x*100).toFixed(1).replace('.',',');
const n0 = x => Math.round(x).toLocaleString('tr-TR');

export function runAudit({ hist, ledgers, monthly, V, A, state }){
  const F = [];
  const add = (id, sev, layer, title, detail, fix) => F.push({ id, sev, layer, title, detail, fix });
  if (!hist.length){ add('nodata','crit','L1','Girdi yok','Değerleme için en az bir yıllık mizan ya da beyanname gerekli.','Mizan Excel\'ini veya beyanname PDF\'ini sürükleyip bırakın.'); return finish(F); }

  // L1 — kapsam
  const years = hist.map(h=>h.year);
  if (hist.length < 3) add('years','warn','L1','Tarihsel dönem kısa', years.length+' yıl yüklendi; eğilim analizi ve normalizasyon için en az 3 yıl önerilir.','Önceki yılların mizan ya da beyannamelerini ekleyin.');
  for (let i=1;i<years.length;i++) if (years[i]-years[i-1]>1) add('gap'+years[i],'warn','L1','Yıl boşluğu',`${years[i-1]} ile ${years[i]} arasında yıl eksik.`,'Eksik yılın dosyasını yükleyin.');
  const dup = years.filter((y,i)=>years.indexOf(y)!==i);
  if (dup.length) add('dup','crit','L1','Aynı yıl için birden fazla dosya',`${[...new Set(dup)].join(', ')} yılı birden fazla kez yüklenmiş.`,'L1\'de fazla dosyayı kaldırın.');

  for (const h of hist){
    const L = h.L;
    if (L.totals.fileDt && Math.abs(L.totals.fileDt - L.totals.fileCt) > 1) add('mzt'+h.year,'crit','L2',`${h.year} mizanı borç-alacak eşit değil`,`Borç toplamı ${n0(L.totals.fileDt)} ₺, alacak toplamı ${n0(L.totals.fileCt)} ₺.`,'Kaynak sistemden mizanı yeniden alın.');
    if (Math.abs(h.bs.check) > Math.max(1, h.bs.TA*0.0005)) add('bs'+h.year,'crit','L3',`${h.year} bilançosu denk değil`,`Aktif − pasif farkı ${n0(h.bs.check)} ₺. Eşlenmemiş hesap ya da eksik satır olabilir.`,'L2 eşleme kuyruğunu kontrol edin.');
    if (h.bs.computedProfit) add('open'+h.year,'info','L3',`${h.year} mizanı kapanış öncesi`,`Dönem kârı (${n0(h.bs.computedProfit)} ₺) gelir tablosu bakiyelerinden hesaplanıp özkaynağa eklendi.`,'Kesin mizan geldiğinde dosyayı değiştirin.');
    if (h.months && h.months<12) add('part'+h.year,'warn','L4',`${h.year} kısmi dönem (${h.months} ay)`,`Gelir tablosu ×${(h.annualize||1).toFixed(2).replace('.',',')} ile yıllıklandırıldı. Mevsimsellik marjı bozabilir.`,'L4\'te yıllıklandırma katsayısını gözden geçirin.');
    if (h.is.da.source!=='sub') add('da'+h.year,'warn','L4',`${h.year} amortismanı doğrudan okunamadı`, h.is.da.source==='delta' ? 'Birikmiş amortisman farkından tahmin edildi.' : h.is.da.source==='manual' ? 'Elle girildi.' : 'Ciroya oranla (%4) tahmin edildi; FAVÖK güvenilirliği düşük.','Alt hesaplı (detay) mizan yükleyin ya da L4\'te tutarı girin.');
    const c7 = h.is.cost7, s7 = c7.mat+c7.lab+c7.ovh;
    if (s7>0 && h.is.cogs>0 && Math.abs(s7-h.is.cogs)/h.is.cogs > 0.15) add('7a'+h.year,'warn','L4',`${h.year} 7/A maliyetleri SMM ile uyumsuz`,`710+720+730 = ${n0(s7)} ₺, 62x SMM = ${n0(h.is.cogs)} ₺ (fark ${pct((h.is.cogs-s7)/h.is.cogs)}). Stok değişimi ve ticari mal maliyeti farkı açıklar; maliyet karması yalnız oran olarak kullanılır.`,'Stok hareket raporu ile mutabakat yapın.');
    if (L.acc['698'] || L.acc['648'] || L.acc['658']) add('infl'+h.year,'info','L4',`${h.year} enflasyon düzeltmesi izleri`,'698/648/658 hesapları hareketli. Düzeltilmiş ve düzeltilmemiş tutarlar yıllar arasında karşılaştırılabilirliği bozabilir.','Karşılaştırmayı aynı esasla yapın; gerekirse TL reel analiz kullanın.');
    if (h.kpi.invS > 0.2) add('inv'+h.year,'warn','L3',`${h.year} stok / ciro yüksek`,`Stoklar cironun ${pct(h.kpi.invS)}'i (DIO ${Math.round(h.kpi.dio)} gün). %20 altı hedeflenmeli.`,'NİS varsayımında stok iyileştirmesini ayrı modelleyin.');
    const doubt = (L.acc['128']?.db||0); if (doubt && h.bs.v.tradeRec && doubt/(h.bs.v.tradeRec+doubt) > 0.05) add('doubt'+h.year,'info','L3',`${h.year} şüpheli alacak payı`,`128 hesabı brüt ticari alacakların ${pct(doubt/(h.bs.v.tradeRec+doubt))}'i.`,'Tahsilat kabiliyetini değerlemede iskonto edin.');
  }
  const last = hist[hist.length-1];
  if (last.bs.partners > 0) add('partners','info','L6','Ortaklara borçların sınıflaması',`Ortaklara borçlar ${n0(last.bs.partners)} ₺. ${state.partnersAsDebt!==false?'Net borca dahil edildi.':'Özkaynak benzeri kabul edildi.'} Bu tercih özkaynak değerini doğrudan değiştirir.`,'Sözleşme ve geri ödeme planına göre karar verin.');
  if (last.kpi.ndEbitda > 3) add('lev','warn','L3','Kaldıraç yüksek',`Net borç / FAVÖK ${last.kpi.ndEbitda.toFixed(1).replace('.',',')}x.`,'Borç maliyeti ve D/E varsayımını gözden geçirin.');
  if (last.kpi.cover && last.kpi.cover < 2) add('cover','warn','L4','Faiz karşılama oranı düşük',`FVÖK / finansman gideri ${last.kpi.cover.toFixed(1).replace('.',',')}x.`,'Finansman riskini iskonto oranına yansıtın.');

  // Satış raporu mutabakatı
  for (const h of hist){
    const ms = monthly.filter(m=>m.y===h.year);
    if (ms.length===12){
      const r = ms.reduce((s,m)=>s+m.rev,0); const d = (r - h.is.netSales)/h.is.netSales;
      if (Math.abs(d) > 0.03) add('rec'+h.year,'warn','L4',`${h.year} satış raporu ile mizan farklı`,`Aylık rapor toplamı ${n0(r)} ₺, mizan net satışı ${n0(h.is.netSales)} ₺ (fark ${pct(d)}). Değerleme mizanı esas alır.`,'İade, iskonto, KDV ve grup içi satış farklarını mutabık kılın.');
    }
  }
  const addb = (state.addbacks||[]).filter(a=>a.on);
  const noEv = addb.filter(a=>!a.ev).reduce((s,a)=>s+(+a.tl||0),0);
  if (noEv && last.ebitdaAdj && noEv/last.ebitdaAdj > 0.05) add('addb','warn','L4','Kanıtsız geri eklemeler',`Kanıtı olmayan geri eklemeler FAVÖK'ün ${pct(noEv/last.ebitdaAdj)}'i.`,'Belge ekleyin ya da geri eklemeyi kapatın.');

  if (V && A){
    if (A.tvMethod==='gordon' && A.tg >= V.P.w) add('g','crit','L6','Terminal büyüme ≥ WACC','Gordon modeli tanımsız; değer üretilmez.','Terminal büyümeyi WACC\'nin altına çekin.');
    if (V.D.tvShare > 0.75) add('tv','warn','L6','Terminal değer payı yüksek',`Firma değerinin ${pct(V.D.tvShare)}'i terminal değerden geliyor.`,'Projeksiyon süresini uzatın ya da terminal varsayımları belgeleyin.');
    const histMax = Math.max(...hist.map(h=>h.kpi.ebitdaM));
    const projMax = Math.max(...V.P.rows.map(r=>r.margin));
    if (projMax > histMax + 0.03) add('margin','warn','L5','Marj genişlemesi tarihsel aralığın dışında',`Projeksiyonda FAVÖK marjı ${pct(projMax)}'e çıkıyor; tarihsel en yüksek ${pct(histMax)}.`,'Maliyet iyileştirmesini somut aksiyonlara bağlayın (katkı seviyeleri analizi).');
    const cagr = hist.length>1 ? Math.pow(last.usd.rev/hist[0].usd.rev, 1/(last.year-hist[0].year))-1 : null;
    const avgG = A.growth.slice(0,A.N).reduce((s,g)=>s+g,0)/A.N;
    if (cagr!=null && avgG > cagr + 0.05) add('growth','warn','L5','Büyüme varsayımı tarihselin üzerinde',`Ortalama büyüme ${pct(avgG)}, tarihsel USD bileşik büyüme ${pct(cagr)}.`,'Kapasite, sipariş ve pazar verisiyle destekleyin.');
    if (V.spread > 1.6) add('spread','info','L6','Yöntemler arasında geniş makas',`En yüksek / en düşük yöntem oranı ${V.spread.toFixed(2).replace('.',',')}x.`,'Ağırlıkları ve normalizasyonu gözden geçirin; makas müzakere aralığını gösterir.');
    if (V.eq < 0) add('negeq','crit','L6','Özkaynak değeri negatif','Ağırlıklı firma değeri net borcu karşılamıyor.','Varsayımları ve net borç sınıflamasını kontrol edin.');
    const sec = A.mult; if (sec.value > 8 && /^tr/.test(sec.sector)) add('mult','warn','L6','Çarpan Türkiye aralığının üzerinde',`${sec.value.toFixed(1).replace('.',',')}x seçildi; Türkiye özel sektör aralığı 4,0x–7,5x.`,'Likidite / ülke iskontosu uygulayın ya da gerekçeyi belgeleyin.');
    if (A.y1Mode==='runrate') add('rr','info','L5','İlk yıl cirosu ara dönemden türetildi','Cari yıl aylık satışları yıllıklandırılıp mizanla mutabakat katsayısıyla düzeltildi.','Mevsimsellik varsa katsayıyı değiştirin.');
  }
  return finish(F);
}

function finish(F){
  const w = { crit: 2.0, warn: 0.6, info: 0.15 };
  const open = F.filter(f=>!f.closed);
  const score = Math.max(0, Math.min(10, 10 - open.reduce((s,f)=>s+w[f.sev],0)));
  return { findings: F, score };
}
