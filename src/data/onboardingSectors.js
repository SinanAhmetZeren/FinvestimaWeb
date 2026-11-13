// Sektör / alt sektör listesi.
// betaU: kaldıraçsız beta; mult: [alt, medyan, üst] global EV/FAVÖK aralığı.
// DEĞERLER GÖSTERGE NİTELİĞİNDEDİR: kendi emsal veritabanınızla güncelleyin.
// pack: true olan alt sektörlerde sunumdaki ayrıntılı ambalaj çarpan tablosu da gösterilir.

export const SECTORS = [
  { k:'imalat-ambalaj', n:'İmalat: ambalaj ve yapışkan ürünler', subs:[
    { k:'bant', n:'Yapışkan bant ve etiket', betaU:0.85, mult:[7.0,8.5,11.0], pack:true },
    { k:'esnek', n:'Esnek ambalaj', betaU:0.80, mult:[5.0,7.0,9.0], pack:true },
    { k:'karton', n:'Karton ve oluklu mukavva', betaU:0.75, mult:[6.0,7.5,9.5], pack:true },
    { k:'plastik-amb', n:'Plastik ambalaj', betaU:0.80, mult:[6.0,7.5,9.5], pack:true },
    { k:'metal-cam', n:'Metal ve cam ambalaj', betaU:0.75, mult:[6.5,8.0,10.0], pack:true },
  ]},
  { k:'imalat-kimya', n:'İmalat: kimya ve plastik', subs:[
    { k:'ozel-kimya', n:'Özel kimyasallar', betaU:0.90, mult:[7.0,9.0,12.0] },
    { k:'boya', n:'Boya ve kaplama', betaU:0.85, mult:[8.0,10.0,13.0] },
    { k:'plastik', n:'Plastik ürünler', betaU:0.85, mult:[5.5,7.0,9.0] },
    { k:'gubre', n:'Gübre ve tarım kimyasalları', betaU:0.90, mult:[4.5,6.0,8.0] },
  ]},
  { k:'imalat-gida', n:'İmalat: gıda ve içecek', subs:[
    { k:'gida-isleme', n:'Gıda işleme', betaU:0.60, mult:[7.0,9.0,12.0] },
    { k:'icecek', n:'İçecek', betaU:0.65, mult:[9.0,11.0,14.0] },
    { k:'un-tahil', n:'Un, tahıl ve unlu mamuller', betaU:0.55, mult:[5.0,6.5,8.5] },
    { k:'sut', n:'Süt ve süt ürünleri', betaU:0.55, mult:[6.0,8.0,10.0] },
  ]},
  { k:'imalat-tekstil', n:'İmalat: tekstil ve hazır giyim', subs:[
    { k:'iplik', n:'İplik ve dokuma', betaU:0.85, mult:[4.0,5.5,7.0] },
    { k:'hazir-giyim', n:'Hazır giyim', betaU:0.90, mult:[5.0,6.5,8.5] },
    { k:'ev-tekstili', n:'Ev tekstili', betaU:0.85, mult:[4.5,6.0,7.5] },
  ]},
  { k:'imalat-otomotiv', n:'İmalat: otomotiv ve yan sanayi', subs:[
    { k:'oem', n:'Ana sanayi tedarikçisi (OEM)', betaU:0.95, mult:[4.0,5.5,7.0] },
    { k:'yedek-parca', n:'Yedek parça ve satış sonrası', betaU:0.90, mult:[6.0,7.5,9.5] },
  ]},
  { k:'imalat-makine', n:'İmalat: makine, metal ve elektrik', subs:[
    { k:'makine', n:'Makine ve ekipman', betaU:0.95, mult:[7.0,9.0,12.0] },
    { k:'metal', n:'Metal işleme ve döküm', betaU:0.95, mult:[4.5,6.0,8.0] },
    { k:'celik', n:'Demir çelik', betaU:1.00, mult:[3.5,5.0,6.5] },
    { k:'elektrik', n:'Elektrikli ekipman ve elektronik', betaU:1.00, mult:[8.0,10.0,13.0] },
    { k:'beyaz-esya', n:'Beyaz eşya ve dayanıklı tüketim', betaU:0.90, mult:[5.5,7.0,9.0] },
  ]},
  { k:'imalat-diger', n:'İmalat: diğer', subs:[
    { k:'insaat-malz', n:'İnşaat malzemeleri ve çimento', betaU:0.85, mult:[5.0,7.0,9.0] },
    { k:'ilac', n:'İlaç ve medikal ürünler', betaU:0.90, mult:[10.0,13.0,16.0] },
    { k:'mobilya', n:'Mobilya ve orman ürünleri', betaU:0.85, mult:[5.0,6.5,8.5] },
    { k:'kagit', n:'Kâğıt ve basım', betaU:0.75, mult:[5.0,6.5,8.0] },
  ]},
  { k:'ticaret', n:'Ticaret', subs:[
    { k:'toptan', n:'Toptan ticaret ve dağıtım', betaU:0.75, mult:[5.0,7.0,9.0] },
    { k:'perakende', n:'Perakende', betaU:0.80, mult:[6.0,8.0,11.0] },
    { k:'e-ticaret', n:'E-ticaret', betaU:1.10, mult:[10.0,14.0,20.0] },
    { k:'dis-ticaret', n:'Dış ticaret', betaU:0.80, mult:[4.0,5.5,7.0] },
  ]},
  { k:'teknoloji', n:'Teknoloji', subs:[
    { k:'saas', n:'Yazılım ve SaaS', betaU:1.15, mult:[12.0,16.0,24.0] },
    { k:'bt-hizmet', n:'BT hizmetleri ve entegrasyon', betaU:1.00, mult:[8.0,11.0,14.0] },
    { k:'telekom', n:'Telekomünikasyon', betaU:0.70, mult:[5.0,6.5,8.0] },
    { k:'donanim', n:'Donanım ve elektronik cihaz', betaU:1.10, mult:[8.0,11.0,15.0] },
  ]},
  { k:'hizmet', n:'Hizmetler', subs:[
    { k:'lojistik', n:'Lojistik ve taşımacılık', betaU:0.85, mult:[6.0,8.0,10.0] },
    { k:'turizm', n:'Turizm ve otelcilik', betaU:0.85, mult:[7.0,9.5,12.0] },
    { k:'saglik', n:'Sağlık hizmetleri', betaU:0.75, mult:[9.0,12.0,15.0] },
    { k:'egitim', n:'Eğitim', betaU:0.80, mult:[7.0,9.0,12.0] },
    { k:'profesyonel', n:'Profesyonel hizmetler ve danışmanlık', betaU:0.90, mult:[7.0,9.0,12.0] },
    { k:'yeme-icme', n:'Yeme içme', betaU:0.80, mult:[6.0,8.0,11.0] },
  ]},
  { k:'enerji', n:'Enerji', subs:[
    { k:'yenilenebilir', n:'Yenilenebilir enerji üretimi', betaU:0.55, mult:[8.0,10.0,13.0] },
    { k:'enerji-ticaret', n:'Enerji dağıtım ve ticareti', betaU:0.50, mult:[6.0,7.5,9.0] },
    { k:'enerji-hizmet', n:'Enerji hizmetleri ve ekipmanı', betaU:1.00, mult:[5.0,7.0,9.0] },
  ]},
  { k:'insaat', n:'İnşaat ve gayrimenkul', subs:[
    { k:'taahhut', n:'İnşaat taahhüt', betaU:0.95, mult:[4.0,5.5,7.0] },
    { k:'gyo', n:'Gayrimenkul geliştirme', betaU:0.70, mult:[8.0,11.0,15.0] },
  ]},
  { k:'tarim', n:'Tarım ve hayvancılık', subs:[
    { k:'bitkisel', n:'Bitkisel üretim', betaU:0.65, mult:[5.0,6.5,8.5] },
    { k:'hayvancilik', n:'Hayvancılık ve su ürünleri', betaU:0.65, mult:[5.0,6.5,8.0] },
  ]},
];

// Türkiye'deki halka açık olmayan firmalar için ülke riski ve likidite iskontosu
export const TR_DISCOUNT = 0.70;

export function findSub(sectorK, subK){
  const s = SECTORS.find(x=>x.k===sectorK);
  const sub = s?.subs.find(x=>x.k===subK);
  return s && sub ? { sector:s, sub } : null;
}

// L6 emsal tablosu: seçilen alt sektöre göre satırlar
export function multipleRows(profile, packTable){
  const f = profile && findSub(profile.sector, profile.subSector);
  const tr = [
    { k:'trInd', n:'Türkiye özel sektör endüstriyel üretim', lo:4.5, hi:7.5, med:6.0 },
    { k:'trSme', n:'Türkiye benzer ölçekli firmalar (BIST dışı)', lo:4.0, hi:7.0, med:6.0 },
  ];
  if (!f) return packTable;
  const [lo,med,hi] = f.sub.mult, d = TR_DISCOUNT;
  const rows = [
    { k:'subGlob', n:`${f.sub.n}: global emsaller`, lo, hi, med },
    { k:'subTr', n:`${f.sub.n}: Türkiye, ülke ve likidite iskontolu`, lo:+(lo*d).toFixed(1), hi:+(hi*d).toFixed(1), med:+(med*d).toFixed(2) },
  ];
  return f.sub.pack ? [...rows, ...packTable.filter(r=>!tr.some(t=>t.k===r.k)), ...tr] : [...rows, ...tr];
}
