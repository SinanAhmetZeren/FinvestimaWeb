# Valuator · Firma Değerleme Motoru

Mizan (Excel) ve kurumlar vergisi beyannamesi (PDF) girdilerinden bilanço özetleri, normalize gelir tablosu, projeksiyon ve üç yöntemli değerleme (DCF, FAVÖK çarpanı, net aktifler) üreten tarayıcı uygulaması. Akış: **Girdi (L1–L2) → İşlem (L3–L5) → Çıktı (L6–L7)**.

Tüm hesaplama kullanıcının tarayıcısında yapılır. Dosyalar sunucuya gönderilmez, bu nedenle sunucu tarafında kod ya da veritabanı gerekmez.

## Hızlı kurulum (sunucuya yükleme)

Paket iki hazır derlemeyle gelir; birini seçin.

**A. `dist/` klasörü (önerilen).** İçeriği sunucunuzda bir klasöre yükleyin. Örneğin cPanel Dosya Yöneticisi ya da FTP ile `public_html/valuator/` altına yükleyebilirsiniz. Adres `https://finvestima.com/valuator/` olur. Yollar görelidir; kök dizinde de, herhangi bir alt klasörde de çalışır. PDF okuyucu ayrı bir parça olarak yalnızca PDF yüklendiğinde indirilir, bu yüzden ilk açılış hızlıdır.

**B. `valuator-pro.html` (tek dosya).** Bütün uygulama tek HTML dosyasındadır (yaklaşık 2,5 MB). Herhangi bir adrese yüklenebilir ya da çift tıklanıp yerel olarak açılabilir.

**WordPress sitesine gömme.** A seçeneğindeki gibi yükledikten sonra sayfaya bir "Özel HTML" bloğu ekleyin:

```html
<iframe src="/valuator/" style="width:100%;height:92vh;border:0" title="Valuator"></iframe>
```

**Vercel / Netlify.** Depoyu bağlayın. Derleme komutu `npm run build`, yayın klasörü `dist`.

## Geliştirme

Node.js 18 veya üzeri gerekir.

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # dist/ klasörü
npm run build:single   # dist-single/index.html (tek dosya)
```

## Klasör yapısı

```
src/
  App.jsx                 durum yönetimi, katman gezintisi, otomatik kayıt
  ui.jsx, charts.jsx      ortak bileşenler, SVG grafikler
  layers/
    Inputs.jsx            L1 Girdiler, L2 Mizan ve eşleme
    Statements.jsx        L3 Bilanço özetleri, L4 Gelir tablosu ve katkı seviyeleri
    Valuation.jsx         L5 Varsayımlar, L6 Değerleme, L7 Denetim ve çıktı
  engine/
    accounts.js           Tekdüzen hesap planı, bilanço satır eşlemesi, sektör çarpanları
    ledger.js             mizan yapısı, bakiye ve akış hesapları, amortisman alt hesapları
    parseExcel.js         mizan, aylık satış raporu ve kur sayfası algılama
    parsePdf.js           beyanname PDF'inden kalem okuma ve hesap eşleme
    statements.js         bilanço, gelir tablosu, USD dönüşümü, oranlar, varsayılan kurlar
    valuation.js          projeksiyon, WACC, DCF, çarpan, net aktif, duyarlılık, ROIC/EVA
    contribution.js       katkı seviyeleri (B–F sınıflaması, Katkı 1–4)
    audit.js              denetim bulguları ve güven skoru
    exportXlsx.js         Excel çıktı paketi
    sample.json           örnek vaka (anonim)
```

## Sık güncellenecek değerler

- **Sektör çarpanları:** `src/engine/accounts.js` dosyasındaki `SECTOR_MULTIPLES`. Kategori, aralık ve medyan değerleri buradan değiştirilir.
- **Varsayılan kurlar:** `src/engine/statements.js` dosyasındaki `DEFAULT_FX`. Kullanıcı L1'de kendi kurunu girebilir; yüklenen Excel'de kur sayfası varsa otomatik okunur.
- **WACC varsayılanları:** `src/engine/valuation.js` dosyasındaki `defaultAssumptions`. İçinde risksiz faiz, piyasa ve ülke risk primi, beta ve borç maliyeti bulunur.

Değişiklikten sonra `npm run build` çalıştırıp `dist/` klasörünü yeniden yükleyin.

## Hesaplama esasları

- **Bilanço:** mizan net bakiyelerinden, Tekdüzen grup aralıklarıyla üretilir. Kapanış öncesi mizanda dönem kârı gelir tablosu bakiyelerinden hesaplanıp özkaynağa eklenir.
- **Gelir tablosu:** 6'lı hesaplardan okunur. Kapanış kaydı sonrası sıfır bakiyeli hesaplarda hareket toplamı kullanılır.
- **Amortisman:** 7'li hesapların "amortisman" alt hesaplarından okunur. Alt hesap yoksa birikmiş amortisman farkından, o da yoksa ciroya oranla tahmin edilir. Her durum etiketlenir ve elle düzeltilebilir.
- **USD dönüşümü:** akış kalemleri yıl ortalaması, bilanço kalemleri yıl sonu kuruyla çevrilir.
- **DCF:** firma serbest nakit akımıyla (FCFF) yapılır: NOPLAT + amortisman − yatırım − NİS değişimi. Faiz nakit akımından düşülmez; borç maliyeti WACC'nin içindedir. Özkaynak değeri, firma değerinden net borç düşülerek bulunur.
- **Ağırlıklandırma:** her yöntemin firma değerleri ağırlıklandırılır, net borç bir kez düşülür. Böylece firma değeri ile özkaynak değeri karışmaz.

## Bilinen sınırlar

- Taranmış (görüntü) PDF'ler okunmaz; OCR gerekir.
- PDF okuyucu, GİB beyanname ekindeki Roma rakamı, harf ve rakam numaralandırmasına göre çalışır. Farklı yazılımlardan alınan PDF'lerde L2'deki eşleme tablosundan elle düzeltme gerekebilir.
- Projeksiyon USD bazındadır; TL reel analiz katmanı yoktur.
- Proje verisi tarayıcının yerel deposunda tutulur; çok kullanıcılı paylaşım için bir sunucu katmanı gerekir. Kullanıcılar "Projeyi dosyaya kaydet" ile taşıyabilir.
- Otomatik TCMB kuru ve yapay zekâ destekli yorumlar için API anahtarlarını saklayan bir sunucu katmanı gerekir; anahtarlar tarayıcı koduna konmamalıdır.
