/* ============================================================
   Örnek vaka verisi — anonimleştirilmiş endüstriyel üretim şirketi.
   Gerçek uygulamada bu dosyanın yerini API/veri katmanı alır.
   ============================================================ */

export const LAYERS = [
  { id: "L1", name: "Alım", title: "Kaynak dosyalar ve kolon eşleme" },
  { id: "L2", name: "Uzlaştırma", title: "Mizan ızgarası ve hesap eşleme" },
  { id: "L3", name: "Normalizasyon", title: "Para birimi dönüşümü ve geri eklemeler" },
  { id: "L4", name: "Modelleme", title: "Normalize gelir tablosu ve FAVÖK köprüsü" },
  { id: "L5", name: "Projeksiyon", title: "Beş yıllık projeksiyon ve sürücü sınaması" },
  { id: "L6", name: "Değerleme", title: "Üç mercek, emsaller ve duyarlılık" },
  { id: "L7", name: "Denetim", title: "Bulgular ve güven skoru" },
];

/* ---------- L1 ---------- */
export const SOURCES = [
  { n: "Yıllık mizanlar", fmt: "Excel", period: "2023 – 2025", vol: "62.973 satır", ok: true, status: "Alındı" },
  { n: "Aylık satış raporu", fmt: "Excel", period: "42 ay", vol: "ürün kırılımlı", ok: true, status: "Alındı" },
  { n: "Yıl sonu bilançosu", fmt: "Excel", period: "3 dönem", vol: "—", ok: true, status: "Alındı" },
  { n: "Sabit kıymet tablosu", fmt: "Excel", period: "3 dönem", vol: "25x · 257", ok: true, status: "Alındı" },
  { n: "Kredi ve borç dökümü", fmt: "Excel", period: "güncel", vol: "6 kredi", ok: true, status: "Alındı" },
  { n: "Kur ve enflasyon serileri", fmt: "Otomatik", period: "aylık", vol: "2019 – 2026", ok: true, status: "Çekildi" },
  { n: "Yönetim varsayım formu", fmt: "Şablon", period: "ileriye dönük", vol: "—", ok: false, status: "Beklemede" },
];

export const COLUMN_MAP = [
  ["A", "Hesap Kodu", "Metin", "Hesap kodu", true],
  ["B", "Hesap Adı", "Metin", "Hesap adı", true],
  ["C", "Borç", "Sayı", "Borç bakiye", true],
  ["D", "Alacak", "Sayı", "Alacak bakiye", true],
  ["E", "Borç Bakiye", "Sayı", "Net bakiye", true],
  ["F", "Alacak Bakiye", "Sayı", "Net bakiye", true],
  ["G", "Gider Yeri", "Metin", "Gider yeri", false],
];

/* ---------- L2 ---------- */
export const MAP_OPTIONS = [
  ["", "— Eşlenmedi —"], ["rev", "Net satışlar"], ["mat", "SMM · Malzeme"],
  ["lab", "SMM · Direkt işçilik"], ["ovh", "SMM · Genel üretim"],
  ["opex", "Faaliyet giderleri"], ["fin", "Faiz gideri"], ["add", "Geri ekleme"],
];

export const TRIAL = [
  { c: "600", n: "Yurtiçi satışlar", t24: 598.2, t25: 742.1, usd: 17.98, map: "rev", open: false, kids: [
    { c: "600.01", n: "Bayi kanalı", t24: 401.7, t25: 512.4, usd: 12.41 },
    { c: "600.02", n: "Doğrudan satış", t24: 196.5, t25: 229.7, usd: 5.57 }] },
  { c: "601", n: "Yurtdışı satışlar", t24: 14.9, t25: 18.4, usd: 0.45, map: "rev", open: false, kids: [] },
  { c: "610", n: "Satıştan iadeler ve indirimler", t24: -11.8, t25: -15.1, usd: -0.37, map: "rev", open: false, kids: [] },
  { c: "710", n: "Direkt ilk madde ve malzeme", t24: 389.4, t25: 478.4, usd: 11.59, map: "mat", open: false, kids: [
    { c: "710.01", n: "Film ve reçine", t24: 214.2, t25: 262.1, usd: 6.35 },
    { c: "710.02", n: "Kağıt ve karton", t24: 118.7, t25: 145.9, usd: 3.53 },
    { c: "710.03", n: "Kimyasal ve yardımcı", t24: 56.5, t25: 70.4, usd: 1.71 }] },
  { c: "720", n: "Direkt işçilik giderleri", t24: 44.3, t25: 54.1, usd: 1.31, map: "lab", open: false, kids: [
    { c: "720.01", n: "Ücret ve maaşlar", t24: 36.1, t25: 44.0, usd: 1.07 },
    { c: "720.02", n: "SGK yükümlülükleri", t24: 8.2, t25: 10.1, usd: 0.24 }] },
  { c: "730", n: "Genel üretim giderleri", t24: 66.9, t25: 82.7, usd: 2.0, map: "ovh", open: false, kids: [
    { c: "730.01", n: "Enerji", t24: 31.4, t25: 38.9, usd: 0.94 },
    { c: "730.06", n: "Bakım ve onarım", t24: 19.8, t25: 24.1, usd: 0.58 },
    { c: "730.11", n: "Amortisman payı", t24: 15.7, t25: 15.4, usd: 0.37 },
    { c: "730.14", n: "Kalıp bakım gideri", t24: 0, t25: 4.3, usd: 0.1, unm: true, sug: "ovh", map: "" }] },
  { c: "760", n: "Pazarlama, satış ve dağıtım", t24: 24.1, t25: 29.8, usd: 0.72, map: "opex", open: false, kids: [] },
  { c: "770", n: "Genel yönetim giderleri", t24: 12.9, t25: 16.2, usd: 0.39, map: "opex", open: false, kids: [
    { c: "770.01", n: "Personel", t24: 9.4, t25: 11.6, usd: 0.28 },
    { c: "770.09", n: "Danışmanlık gideri", t24: 0, t25: 2.1, usd: 0.05, unm: true, sug: "opex", map: "" }] },
  { c: "780", n: "Finansman giderleri", t24: 13.2, t25: 15.9, usd: 0.39, map: "fin", open: false, kids: [] },
  { c: "689", n: "Diğer olağandışı gider", t24: 0, t25: 1.4, usd: 0.03, map: "", open: false, kids: [], unm: true, sug: "add" },
];

export const CHECKS = [
  { t: "Denge kontrolü", d: "Borç ve alacak toplamları eşit", state: "pass" },
  { t: "Kapanış kontrolü", d: "Mizan bakiyeleri bilanço ile uyuşuyor", state: "pass" },
  { t: "Toplam kontrolü", d: "Alt kalemler ana kaleme eşit", state: "pass" },
  { t: "Dönem kontrolü", d: "Aylık satış toplamı yıllıkla uyuşuyor", state: "pass" },
  { t: "Süreklilik kontrolü", d: "Y0 Oca–Nis hammadde verisi eksik · tahmin edildi", state: "pend" },
  { t: "Sınıflandırma kontrolü", d: "", state: "fail" },
];

/* ---------- L3 ---------- */
export const FX_ROWS = [
  ["Net satışlar", "Mizan 600·601", "765,4", "41,28", "Akış · ortalama", 18046, "t600"],
  ["SMM · Malzeme", "Mizan 710", "478,4", "41,28", "Akış · ortalama", 11586, "t710"],
  ["SMM · Direkt işçilik", "Mizan 720", "54,1", "41,28", "Akış · ortalama", 1311, "t720"],
  ["SMM · Genel üretim", "Mizan 730", "82,7", "41,28", "Akış · ortalama", 2003, "t730"],
  ["Faaliyet giderleri", "Mizan 760·770", "46,0", "41,28", "Akış · ortalama", 1114, null],
  ["Ticari alacaklar", "Bilanço 120", "215,4", "43,10", "Stok · dönem sonu", 4998, null],
  ["Stoklar", "Bilanço 15x", "142,8", "43,10", "Stok · dönem sonu", 3313, null],
  ["Ticari borçlar", "Bilanço 320", "(124,8)", "43,10", "Stok · dönem sonu", -2895, null],
  ["Net finansal borç", "Kredi dökümü", "106,5", "43,10", "Stok · dönem sonu", 2472, "tnd"],
];

export const ADDBACKS = [
  { k: "a1", n: "Hissedar kaynaklı giderler", v: 142, ev: "Yönetim beyanı + bordro", on: true, ok: true },
  { k: "a2", n: "Tek seferlik tazminat ve dava", v: 46, ev: "Mahkeme kararı dosyalandı", on: true, ok: true },
  { k: "a3", n: "İlişkili taraf kirası (piyasa farkı)", v: 78, ev: "Kanıt bekleniyor", on: false, ok: false },
];

/* ---------- L5 ---------- */
export const DRIVERS = [
  { k: "growth", n: "Ciro büyümesi", unit: "%", step: 0.5, min: 0, max: 30, mul: 100, who: "Yönetim", ref: "%19,1" },
  { k: "expansion", n: "Marj genişlemesi", unit: "p", step: 0.1, min: 0, max: 10, mul: 1, who: "Değerleme", ref: "±2,4 p" },
  { k: "capexPct", n: "CAPEX / ciro", unit: "%", step: 0.1, min: 1, max: 12, mul: 100, who: "Yönetim", ref: "%5,5" },
  { k: "nwcPct", n: "NİS / ciro", unit: "%", step: 0.5, min: 10, max: 50, mul: 100, who: "Motor", ref: "%30,1" },
  { k: "taxRate", n: "Kurumlar vergisi", unit: "%", step: 1, min: 0, max: 40, mul: 100, who: "Motor", ref: "%25" },
];

/* ---------- L6 ---------- */
export const PEERS = [
  { n: "Yurtiçi üretici A", r: "Türkiye", rev: 42, m: 0.148, ev: 5.4, s: 0.8, on: true },
  { n: "Yurtiçi üretici B", r: "Türkiye", rev: 26, m: 0.172, ev: 6.1, s: 1.05, on: true },
  { n: "Avrupa üretici C", r: "Avrupa", rev: 180, m: 0.151, ev: 7.8, s: 1.18, on: true },
  { n: "Avrupa üretici D", r: "Avrupa", rev: 95, m: 0.189, ev: 8.6, s: 1.63, on: true },
  { n: "İşlem E · 2025", r: "Türkiye", rev: 33, m: 0.164, ev: 6.8, s: 1.12, on: true },
  { n: "İşlem F · 2024", r: "Avrupa", rev: 120, m: 0.195, ev: 9.1, s: 1.77, on: true },
];

/* ---------- L7 ---------- */
export const FINDINGS = [
  { no: "01", layer: "L6", t: "İşletme sermayesi satır kayması", sev: "Kritik", dim: "model", dl: 2, done: false,
    d: "NİS değişimi bir yıl ileriye kaymış; terminal yılda sıfır alınmış.", i: "Terminal değeri ~4,8 M$ yukarı çekiyor" },
  { no: "02", layer: "L6", t: "FCFF / FCFE karışımı", sev: "Kritik", dim: "model", dl: 2, done: false,
    d: "Faiz düşülmüş akış WACC ile iskonto ediliyor; borcun maliyeti iki kez sayılıyor.", i: "Sonuç ne firma ne özkaynak değeri" },
  { no: "03", layer: "L5", t: "Amortisman – CAPEX uyumsuzluğu", sev: "Yüksek", dim: "norm", dl: 1, done: false,
    d: "Yatırım büyürken amortisman sabit tutulmuş.", i: "Geç yıllarda NOPLAT olduğundan yüksek" },
  { no: "04", layer: "L4", t: "Tutarsız yıllıklandırma", sev: "Yüksek", dim: "veri", dl: 0, done: false,
    d: "Y0 cirosu ×2,10, malzeme gideri ×2,00 ile yıllığa çevrilmiş.", i: "Y0 marjı ~0,6 puan yüksek" },
  { no: "05", layer: "L5", t: "Metodoloji kopukluğu", sev: "Yüksek", dim: "proj", dl: 1, done: false,
    d: "Direkt işçilik Y0'da kur, sonraki yıllarda kadro bazlı.", i: "Kadro artarken gider %16 azalıyor" },
  { no: "06", layer: "L4", t: "Kırık bağlantı ve çift vergi satırı", sev: "Orta", dim: "proj", dl: 1, done: false,
    d: "Vergi hesabı dış dosyaya bağlı; %20 ve %25 oranlı iki satır var.", i: "Bağlantı koparsa değer sessizce hatalı" },
  { no: "K1", layer: "L6", t: "Sektör çarpanı taraması belgelendi", sev: "Kanıt", dim: "capraz", dl: 2, done: false,
    d: "Emsal evreni ve medyan sapması kanıt dosyasına eklendi.", i: "Çapraz yöntem uyumunu yükseltir" },
  { no: "K2", layer: "L5", t: "Marj genişlemesi için aksiyon planı", sev: "Kanıt", dim: "proj", dl: 2, done: false,
    d: "Ürün gamı kaydırma planı yönetimden alındı.", i: "Projeksiyon dayanağını yükseltir" },
  { no: "K3", layer: "L6", t: "WACC bileşenlerine ayrıldı", sev: "Kanıt", dim: "terminal", dl: 2, done: false,
    d: "Risksiz getiri, ülke risk primi ve sermaye yapısı belgelendi.", i: "Terminal bağımlılığı riskini azaltır" },
];

export const DIMS = [
  { k: "veri", n: "Veri bütünlüğü", b: 9, max: 9, w: 0.15 },
  { k: "norm", n: "Normalizasyon kalitesi", b: 8, max: 9, w: 0.15 },
  { k: "proj", n: "Projeksiyon dayanağı", b: 5, max: 8, w: 0.2 },
  { k: "terminal", n: "Terminal bağımlılığı", b: 4, max: 6, w: 0.15 },
  { k: "capraz", n: "Çapraz yöntem uyumu", b: 7, max: 9, w: 0.15 },
  { k: "model", n: "Model bütünlüğü", b: 5, max: 9, w: 0.2 },
];

/* ---------- kaynak izi ---------- */
export const TRAILS = {
  t600: { e: "MİZAN 600·601 + SATIŞ RAPORU", t: "Net satışlar", f: "Y0 kısmi dönemden ×2,10 ile yıllıklandırıldı.",
    r: [["Brüt ciro", "765,4 M ₺"], ["İade", "−15,1 M ₺"], ["Ortalama kur", "41,28"], ["USD", "18.046"]] },
  t710: { e: "MİZAN 710", t: "Direkt ilk madde ve malzeme", f: "Akış kalemi — ortalama kurla çevrildi.",
    r: [["Alt hesap", "710.01–710.09"], ["Satır", "14.208"], ["TL", "478,4 M"], ["USD", "11.586"]] },
  t720: { e: "MİZAN 720", t: "Direkt işçilik", f: "Projeksiyonda kadro × birim maliyet.",
    r: [["Satır", "3.964"], ["TL", "54,1 M"], ["Kadro", "74 kişi"], ["USD", "1.311"]] },
  t730: { e: "MİZAN 730", t: "Genel üretim giderleri", f: "Yarı sabit — operasyonel kaldıraç burada.",
    r: [["Alt hesap", "730.01–730.14"], ["Satır", "9.117"], ["TL", "82,7 M"], ["USD", "2.003"]] },
  tna: { e: "BİLANÇO 2025/12", t: "Net aktifler", f: "Stok kalemi — dönem sonu kuru.",
    r: [["Toplam aktif", "21.394"], ["KVYK", "−12.108"], ["UVYK", "−3.453"], ["USD", "5.833"]] },
  tnd: { e: "KREDİ DÖKÜMÜ", t: "Net finansal borç", f: "Ortaklara borçların özkaynağa çevrilmesi köprüyü değiştirir.",
    r: [["Mali borçlar", "2.104"], ["Ortaklara", "1.152"], ["Nakit", "−784"], ["Net", "2.472"]] },
};
