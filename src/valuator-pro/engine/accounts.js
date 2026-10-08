// Tekdüzen Hesap Planı — 3'lü kod sözlüğü, doğal bakiye yönü ve tablo eşlemesi.
// Doğal yön: 'D' borç bakiyeli, 'C' alacak bakiyeli. Düzenleyici (−) hesaplar ters yönlüdür.

export const ACCOUNTS = {
  100:'Kasa',101:'Alınan Çekler',102:'Bankalar',103:'Verilen Çekler ve Ödeme Emirleri (-)',108:'Diğer Hazır Değerler',
  110:'Hisse Senetleri',111:'Özel Kesim Tahvil Senet ve Bonoları',112:'Kamu Kesimi Tahvil Senet ve Bonoları',118:'Diğer Menkul Kıymetler',119:'Menkul Kıymetler Değer Düşüklüğü Karşılığı (-)',
  120:'Alıcılar',121:'Alacak Senetleri',122:'Alacak Senetleri Reeskontu (-)',124:'Kazanılmamış Finansal Kiralama Faiz Gelirleri (-)',126:'Verilen Depozito ve Teminatlar',127:'Diğer Ticari Alacaklar',128:'Şüpheli Ticari Alacaklar',129:'Şüpheli Ticari Alacaklar Karşılığı (-)',
  131:'Ortaklardan Alacaklar',132:'İştiraklerden Alacaklar',133:'Bağlı Ortaklıklardan Alacaklar',135:'Personelden Alacaklar',136:'Diğer Çeşitli Alacaklar',137:'Diğer Alacak Senetleri Reeskontu (-)',138:'Şüpheli Diğer Alacaklar',139:'Şüpheli Diğer Alacaklar Karşılığı (-)',
  150:'İlk Madde ve Malzeme',151:'Yarı Mamuller',152:'Mamuller',153:'Ticari Mallar',157:'Diğer Stoklar',158:'Stok Değer Düşüklüğü Karşılığı (-)',159:'Verilen Sipariş Avansları',
  170:'Yıllara Yaygın İnşaat ve Onarım Maliyetleri',179:'Taşeronlara Verilen Avanslar',
  180:'Gelecek Aylara Ait Giderler',181:'Gelir Tahakkukları',
  190:'Devreden KDV',191:'İndirilecek KDV',192:'Diğer KDV',193:'Peşin Ödenen Vergiler ve Fonlar',195:'İş Avansları',196:'Personel Avansları',197:'Sayım ve Tesellüm Noksanları',198:'Diğer Çeşitli Dönen Varlıklar',199:'Diğer Dönen Varlıklar Karşılığı (-)',
  220:'Alıcılar (UV)',221:'Alacak Senetleri (UV)',222:'Alacak Senetleri Reeskontu (UV) (-)',226:'Verilen Depozito ve Teminatlar (UV)',229:'Şüpheli Alacaklar Karşılığı (UV) (-)',
  231:'Ortaklardan Alacaklar (UV)',232:'İştiraklerden Alacaklar (UV)',235:'Personelden Alacaklar (UV)',236:'Diğer Çeşitli Alacaklar (UV)',237:'Diğer Alacak Senetleri Reeskontu (UV) (-)',239:'Şüpheli Diğer Alacaklar Karşılığı (UV) (-)',
  240:'Bağlı Menkul Kıymetler',241:'Bağlı Menkul Kıymetler Değer Düşüklüğü Karşılığı (-)',242:'İştirakler',243:'İştiraklere Sermaye Taahhütleri (-)',244:'İştirakler Sermaye Payları Değer Düşüklüğü Karşılığı (-)',245:'Bağlı Ortaklıklar',246:'Bağlı Ortaklıklara Sermaye Taahhütleri (-)',247:'Bağlı Ortaklıklar Sermaye Payları Değer Düşüklüğü Karşılığı (-)',248:'Diğer Mali Duran Varlıklar',249:'Diğer Mali Duran Varlıklar Karşılığı (-)',
  250:'Arazi ve Arsalar',251:'Yeraltı ve Yerüstü Düzenleri',252:'Binalar',253:'Tesis, Makine ve Cihazlar',254:'Taşıtlar',255:'Demirbaşlar',256:'Diğer Maddi Duran Varlıklar',257:'Birikmiş Amortismanlar (-)',258:'Yapılmakta Olan Yatırımlar',259:'Verilen Avanslar',
  260:'Haklar',261:'Şerefiye',262:'Kuruluş ve Örgütlenme Giderleri',263:'Araştırma ve Geliştirme Giderleri',264:'Özel Maliyetler',267:'Diğer Maddi Olmayan Duran Varlıklar',268:'Birikmiş Amortismanlar (MODV) (-)',269:'Verilen Avanslar (MODV)',
  271:'Arama Giderleri',272:'Hazırlık ve Geliştirme Giderleri',277:'Diğer Özel Tükenmeye Tabi Varlıklar',278:'Birikmiş Tükenme Payları (-)',279:'Verilen Avanslar (Tükenmeye Tabi)',
  280:'Gelecek Yıllara Ait Giderler',281:'Gelir Tahakkukları (UV)',
  291:'Gelecek Yıllarda İndirilecek KDV',292:'Diğer KDV (UV)',293:'Gelecek Yıllar İhtiyacı Stoklar',294:'Elden Çıkarılacak Stoklar ve MDV',295:'Peşin Ödenen Vergi ve Fonlar (UV)',297:'Diğer Çeşitli Duran Varlıklar',298:'Stok Değer Düşüklüğü Karşılığı (UV) (-)',299:'Birikmiş Amortismanlar (Diğer) (-)',
  300:'Banka Kredileri',301:'Finansal Kiralama İşlemlerinden Borçlar',302:'Ertelenmiş Finansal Kiralama Borçlanma Maliyetleri (-)',303:'Uzun Vadeli Kredilerin Anapara Taksitleri ve Faizleri',304:'Tahvil Anapara Borç Taksit ve Faizleri',305:'Çıkarılmış Bonolar ve Senetler',306:'Çıkarılmış Diğer Menkul Kıymetler',308:'Menkul Kıymetler İhraç Farkı (-)',309:'Diğer Mali Borçlar',
  320:'Satıcılar',321:'Borç Senetleri',322:'Borç Senetleri Reeskontu (-)',326:'Alınan Depozito ve Teminatlar',329:'Diğer Ticari Borçlar',
  331:'Ortaklara Borçlar',332:'İştiraklere Borçlar',333:'Bağlı Ortaklıklara Borçlar',335:'Personele Borçlar',336:'Diğer Çeşitli Borçlar',337:'Diğer Borç Senetleri Reeskontu (-)',
  340:'Alınan Sipariş Avansları',349:'Alınan Diğer Avanslar',350:'Yıllara Yaygın İnşaat ve Onarım Hakedişleri',
  360:'Ödenecek Vergi ve Fonlar',361:'Ödenecek Sosyal Güvenlik Kesintileri',368:'Vadesi Geçmiş Ertelenmiş veya Taksitlendirilmiş Vergi ve Diğer Yükümlülükler',369:'Ödenecek Diğer Yükümlülükler',
  370:'Dönem Kârı Vergi ve Diğer Yasal Yükümlülük Karşılıkları',371:'Dönem Kârının Peşin Ödenen Vergi ve Diğer Yükümlülükleri (-)',372:'Kıdem Tazminatı Karşılığı',373:'Maliyet Giderleri Karşılığı',379:'Diğer Borç ve Gider Karşılıkları',
  380:'Gelecek Aylara Ait Gelirler',381:'Gider Tahakkukları',391:'Hesaplanan KDV',392:'Diğer KDV',393:'Merkez ve Şubeler Cari Hesabı',397:'Sayım ve Tesellüm Fazlaları',399:'Diğer Çeşitli Yabancı Kaynaklar',
  400:'Banka Kredileri (UV)',401:'Finansal Kiralama İşlemlerinden Borçlar (UV)',402:'Ertelenmiş Finansal Kiralama Borçlanma Maliyetleri (UV) (-)',405:'Çıkarılmış Tahviller',407:'Çıkarılmış Diğer Menkul Kıymetler (UV)',408:'Menkul Kıymetler İhraç Farkı (UV) (-)',409:'Diğer Mali Borçlar (UV)',
  420:'Satıcılar (UV)',421:'Borç Senetleri (UV)',422:'Borç Senetleri Reeskontu (UV) (-)',426:'Alınan Depozito ve Teminatlar (UV)',429:'Diğer Ticari Borçlar (UV)',
  431:'Ortaklara Borçlar (UV)',432:'İştiraklere Borçlar (UV)',433:'Bağlı Ortaklıklara Borçlar (UV)',436:'Diğer Çeşitli Borçlar (UV)',437:'Diğer Borç Senetleri Reeskontu (UV) (-)',438:'Kamuya Olan Ertelenmiş veya Taksitlendirilmiş Borçlar',
  440:'Alınan Sipariş Avansları (UV)',449:'Alınan Diğer Avanslar (UV)',472:'Kıdem Tazminatı Karşılığı (UV)',479:'Diğer Borç ve Gider Karşılıkları (UV)',
  480:'Gelecek Yıllara Ait Gelirler',481:'Gider Tahakkukları (UV)',492:'Gelecek Yıllara Ertelenen veya Terkin Edilecek KDV',493:'Tesise Katılma Payları',499:'Diğer Çeşitli Yabancı Kaynaklar (UV)',
  500:'Sermaye',501:'Ödenmemiş Sermaye (-)',502:'Sermaye Düzeltmesi Olumlu Farkları',503:'Sermaye Düzeltmesi Olumsuz Farkları (-)',
  520:'Hisse Senedi İhraç Primleri',521:'Hisse Senedi İptal Kârları',522:'MDV Yeniden Değerleme Artışları',523:'İştirakler Yeniden Değerleme Artışları',524:'Maliyet Artışları Fonu',525:'Kayda Alınan Emtia Özel Karşılık Hesabı',529:'Diğer Sermaye Yedekleri',
  540:'Yasal Yedekler',541:'Statü Yedekleri',542:'Olağanüstü Yedekler',548:'Diğer Kâr Yedekleri',549:'Özel Fonlar',
  570:'Geçmiş Yıllar Kârları',580:'Geçmiş Yıllar Zararları (-)',590:'Dönem Net Kârı',591:'Dönem Net Zararı (-)',
  600:'Yurtiçi Satışlar',601:'Yurtdışı Satışlar',602:'Diğer Gelirler',610:'Satıştan İadeler (-)',611:'Satış İskontoları (-)',612:'Diğer İndirimler (-)',
  620:'Satılan Mamuller Maliyeti (-)',621:'Satılan Ticari Mallar Maliyeti (-)',622:'Satılan Hizmet Maliyeti (-)',623:'Diğer Satışların Maliyeti (-)',
  630:'Araştırma ve Geliştirme Giderleri (-)',631:'Pazarlama Satış ve Dağıtım Giderleri (-)',632:'Genel Yönetim Giderleri (-)',
  640:'İştiraklerden Temettü Gelirleri',641:'Bağlı Ortaklıklardan Temettü Gelirleri',642:'Faiz Gelirleri',643:'Komisyon Gelirleri',644:'Konusu Kalmayan Karşılıklar',645:'Menkul Kıymet Satış Kârları',646:'Kambiyo Kârları',647:'Reeskont Faiz Gelirleri',648:'Enflasyon Düzeltmesi Kârları',649:'Diğer Olağan Gelir ve Kârlar',
  653:'Komisyon Giderleri (-)',654:'Karşılık Giderleri (-)',655:'Menkul Kıymet Satış Zararları (-)',656:'Kambiyo Zararları (-)',657:'Reeskont Faiz Giderleri (-)',658:'Enflasyon Düzeltmesi Zararları (-)',659:'Diğer Olağan Gider ve Zararlar (-)',
  660:'Kısa Vadeli Borçlanma Giderleri (-)',661:'Uzun Vadeli Borçlanma Giderleri (-)',
  671:'Önceki Dönem Gelir ve Kârları',679:'Diğer Olağandışı Gelir ve Kârlar',680:'Çalışmayan Kısım Gider ve Zararları (-)',681:'Önceki Dönem Gider ve Zararları (-)',689:'Diğer Olağandışı Gider ve Zararlar (-)',
  690:'Dönem Kârı veya Zararı',691:'Dönem Kârı Vergi ve Diğer Yasal Yükümlülük Karşılıkları (-)',692:'Dönem Net Kârı veya Zararı',697:'Yıllara Yaygın İnşaat Düzeltme',698:'Enflasyon Düzeltme Hesabı',
  710:'Direkt İlk Madde ve Malzeme Giderleri',711:'Direkt İlk Madde ve Malzeme Yansıtma',720:'Direkt İşçilik Giderleri',721:'Direkt İşçilik Giderleri Yansıtma',
  730:'Genel Üretim Giderleri',731:'Genel Üretim Giderleri Yansıtma',740:'Hizmet Üretim Maliyeti',750:'Araştırma ve Geliştirme Giderleri',
  760:'Pazarlama Satış ve Dağıtım Giderleri',761:'Pazarlama Satış ve Dağıtım Giderleri Yansıtma',770:'Genel Yönetim Giderleri',771:'Genel Yönetim Giderleri Yansıtma',
  780:'Finansman Giderleri',781:'Finansman Giderleri Yansıtma'
};

const CONTRA = new Set([103,119,122,124,129,137,139,158,199,222,229,237,239,241,243,244,246,247,249,257,268,278,298,299,
  302,308,322,337,371,402,408,422,437,501,503,580,591]);

export function nature(code){
  const c = +code, k = Math.floor(c/100), t = Math.floor(c/10);
  let n;
  if (k===1||k===2) n='D';
  else if (k===3||k===4||k===5) n='C';
  else if (k===6){ n = (t===60||t===64||t===67) ? 'C' : 'D'; }
  else n='D';
  if (CONTRA.has(c)) n = n==='D' ? 'C' : 'D';
  return n;
}

export const accName = code => ACCOUNTS[+code] || ('Hesap '+code);

// ── Bilanço satır tanımları ─────────────────────────────────────────
// r: [başlangıç, bitiş] aralığı; ex: hariç kodlar
export const BS_ASSETS = [
  {sec:'Dönen Varlıklar', lines:[
    {k:'cash',n:'Hazır değerler',r:[100,109]},
    {k:'secs',n:'Menkul kıymetler',r:[110,119]},
    {k:'tradeRec',n:'Ticari alacaklar (net)',r:[120,129]},
    {k:'otherRec',n:'Diğer alacaklar',r:[130,139]},
    {k:'inv',n:'Stoklar',r:[150,158]},
    {k:'advGiven',n:'Verilen sipariş avansları',r:[159,159]},
    {k:'constr',n:'Yıllara yaygın inşaat maliyetleri',r:[170,179]},
    {k:'prepaid',n:'Gelecek aylara ait giderler, gelir tahakkukları',r:[180,189]},
    {k:'otherCA',n:'Diğer dönen varlıklar',r:[190,199]},
  ]},
  {sec:'Duran Varlıklar', lines:[
    {k:'ltRec',n:'Ticari alacaklar (UV)',r:[220,229]},
    {k:'ltOtherRec',n:'Diğer alacaklar (UV)',r:[230,239]},
    {k:'finFA',n:'Mali duran varlıklar',r:[240,249]},
    {k:'ppe',n:'Maddi duran varlıklar (net)',r:[250,258]},
    {k:'ppeAdv',n:'Verilen avanslar (MDV)',r:[259,259]},
    {k:'intang',n:'Maddi olmayan duran varlıklar (net)',r:[260,269]},
    {k:'depl',n:'Özel tükenmeye tabi varlıklar',r:[270,279]},
    {k:'ltPrepaid',n:'Gelecek yıllara ait giderler',r:[280,289]},
    {k:'otherNCA',n:'Diğer duran varlıklar',r:[290,299]},
  ]},
];
export const BS_LIABS = [
  {sec:'Kısa Vadeli Yabancı Kaynaklar', lines:[
    {k:'finDebtST',n:'Mali borçlar',r:[300,309]},
    {k:'tradePay',n:'Ticari borçlar',r:[320,329]},
    {k:'partnersST',n:'Ortaklara borçlar',r:[331,331]},
    {k:'otherPayST',n:'Diğer borçlar',r:[330,339],ex:[331]},
    {k:'advRecv',n:'Alınan avanslar',r:[340,349]},
    {k:'constrPr',n:'Yıllara yaygın inşaat hakedişleri',r:[350,359]},
    {k:'taxPay',n:'Ödenecek vergi ve diğer yükümlülükler',r:[360,369]},
    {k:'provST',n:'Borç ve gider karşılıkları',r:[370,379]},
    {k:'defIncST',n:'Gelecek aylara ait gelirler, gider tahakkukları',r:[380,389]},
    {k:'otherSTL',n:'Diğer kısa vadeli yabancı kaynaklar',r:[390,399]},
  ]},
  {sec:'Uzun Vadeli Yabancı Kaynaklar', lines:[
    {k:'finDebtLT',n:'Mali borçlar',r:[400,409]},
    {k:'tradePayLT',n:'Ticari borçlar',r:[420,429]},
    {k:'partnersLT',n:'Ortaklara borçlar',r:[431,431]},
    {k:'otherPayLT',n:'Diğer borçlar',r:[430,439],ex:[431]},
    {k:'advRecvLT',n:'Alınan avanslar',r:[440,449]},
    {k:'provLT',n:'Borç ve gider karşılıkları',r:[470,479]},
    {k:'defIncLT',n:'Gelecek yıllara ait gelirler, gider tahakkukları',r:[480,489]},
    {k:'otherLTL',n:'Diğer uzun vadeli yabancı kaynaklar',r:[490,499]},
  ]},
  {sec:'Özkaynaklar', lines:[
    {k:'paidIn',n:'Ödenmiş sermaye (düzeltme farkları dahil)',r:[500,509]},
    {k:'capRes',n:'Sermaye yedekleri',r:[520,529]},
    {k:'profitRes',n:'Kâr yedekleri',r:[540,549]},
    {k:'prevProfit',n:'Geçmiş yıllar kârları',r:[570,579]},
    {k:'prevLoss',n:'Geçmiş yıllar zararları',r:[580,589]},
    {k:'netProfit',n:'Dönem net kârı (zararı)',r:[590,599]},
  ]},
];

export function lineOf(code){
  const c=+code;
  for (const side of [BS_ASSETS,BS_LIABS]) for (const s of side) for (const l of s.lines){
    if (c>=l.r[0] && c<=l.r[1] && !(l.ex||[]).includes(c)) return {sec:s.sec, line:l};
  }
  const k=Math.floor(c/100);
  if (k===6) return {sec:'Gelir Tablosu', line:{k:'is',n:'Gelir tablosu hesabı'}};
  if (k===7) return {sec:'Maliyet Hesapları', line:{k:'cost',n:'Maliyet hesabı (7/A)'}};
  if (k===8) return {sec:'Serbest', line:{k:'free',n:'Serbest hesap'}};
  if (k===9) return {sec:'Nazım Hesaplar', line:{k:'memo',n:'Nazım hesap'}};
  return null;
}

// ── Sektör çarpanları (sunumdaki tablodan) ───────────────────────────
export const SECTOR_MULTIPLES = [
  {k:'glob',n:'Global büyük yapışkan ve bant üreticileri',lo:7.0,hi:11.0,med:8.5},
  {k:'spec',n:'Specialty adhesives / sealants (halka açık)',lo:7.0,hi:12.0,med:8.5},
  {k:'pack',n:'Ambalaj — halka açık büyük ölçek',lo:6.5,hi:12.5,med:9.0},
  {k:'pe',n:'Ambalaj PE işlemleri (2025)',lo:10.0,hi:15.0,med:13.5},
  {k:'strat',n:'Ambalaj stratejik alıcı (2025)',lo:6.0,hi:9.0,med:7.35},
  {k:'flex',n:'Esnek ambalaj / converter (özel)',lo:5.0,hi:9.0,med:7.0},
  {k:'trInd',n:'Türkiye özel sektör endüstriyel üretim',lo:4.5,hi:7.5,med:6.0},
  {k:'trSme',n:'Türkiye benzer ölçekli sanayi (BIST dışı)',lo:4.0,hi:7.0,med:6.0},
];
