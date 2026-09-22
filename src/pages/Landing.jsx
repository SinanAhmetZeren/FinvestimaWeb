import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../landing.css";
import logo from "../assets/finvestimaLogo.jpeg";

const LAYERS = [
  {
    c: "L1",
    n: "Alım",
    d: "Mizan, satış raporu, bilanço ve kredi dökümü olduğu gibi yüklenir. Hiçbir rakam elle yeniden yazılmaz; motor kaynak dosyaya canlı referansla bağlanır.",
    ai: ["On binlerce satırı hesap kodu bazında sınıflandırır", "Kolon yapısını otomatik tanır", "Anomali ve boş dönemleri işaretler"],
    h: ["Hesap planı eşleştirme kuralları", "Kapsam ve dönem seçimi"],
  },
  {
    c: "L2",
    n: "Uzlaştırma",
    d: "Her mizan satırı bir gelir tablosu kalemine bağlanır. Eşlenmemiş tutar hiçbir kalemin içine sessizce düşmez; motor eşleme tamamlanmadan ilerlemez.",
    ai: ["Borç–alacak dengesi ve bilanço uyumunu doğrular", "Aylık toplamları yıllıkla karşılaştırır", "Yeni açılan hesapları tespit eder"],
    h: ["Sapmanın nedeni ve düzeltme yöntemi", "Yeni hesapların hangi kaleme gideceği"],
  },
  {
    c: "L3",
    n: "Normalizasyon",
    d: "Akış kalemleri ortalama, stok kalemleri dönem sonu kuruyla çevrilir. Tek seferlik ve hissedar kaynaklı kalemler ayrı satırda tutulur, FAVÖK'ün içine karıştırılmaz.",
    ai: ["Doğru kuru doğru kaleme uygular", "Geri ekleme adaylarını listeler", "Enflasyon kontrol katmanını paralel hesaplar"],
    h: ["Hangi kalemin normalize edileceği", "Geri eklemenin kabulü ve gerekçesi"],
  },
  {
    c: "L4",
    n: "Modelleme",
    d: "Normalize gelir tablosu kurulur. Üç merceğin de beslendiği FAVÖK tabanı burada oluşur — taban yanlışsa üç sonuç birden yanlış çıkar.",
    ai: ["Gelir tablosunu satır satır kurar", "Oranları geçmiş üç yılla karşılaştırır", "Yıllıklandırma tutarlılığını denetler"],
    h: ["Maliyet ve gider sınırının çizilmesi", "Değerleme baz yılının seçimi"],
  },
  {
    c: "L5",
    n: "Projeksiyon",
    d: "Hiçbir satır geçmişin ortalaması alınarak uzatılmaz. Her satırın bir sürücüsü vardır ve her sürücü geçmiş gerçekleşmeyle sınanır.",
    ai: ["Senaryo setini ve duyarlılık matrislerini üretir", "Sapan varsayımlar için uyarı çıkarır", "Yatırım ve amortisman takvimini kurar"],
    h: ["Büyüme hızı ve marj hedefi", "Yatırım planı ve kadro"],
  },
  {
    c: "L6",
    n: "Değerleme",
    d: "Gelir, piyasa ve varlık mercekleri aynı tabandan paralel çalıştırılır. Sonuç tek bir sayı değil, üç cevap ve aralarındaki farkın açıklamasıdır.",
    ai: ["Üç merceği paralel hesaplar", "Sektör çarpanlarını tarar", "Duyarlılık matrisini üretir ve sonuçları uzlaştırır"],
    h: ["İskonto oranı ve uygulanacak çarpan", "Mercek ağırlıkları"],
  },
  {
    c: "L7",
    n: "Denetim",
    d: "Kesişen katman. Altı katmanın tamamını sürekli tarar: formül kayması, kırık dış bağlantı, çift tanımlı satır, tutarsız dönemselleştirme.",
    ai: ["Her bulgunun değere etkisini sayısal ölçer", "Güven skorunu altı boyutta hesaplar", "Düzeltilmiş sonucu ham modelle karşılaştırır"],
    h: ["Düzeltmenin onayı", "Raporlama ve kanıt dosyası"],
  },
];

const INPUTS = [
  ["Yıllık mizan", "62.973 satır", "M6 2h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M13 2v5h5 M8 12h8 M8 16h5"],
  ["Aylık satış", "42 ay", "M3 20h18 M6 16V9 M11 16V5 M16 16v-6 M21 16v-9"],
  ["Bilanço", "3 dönem", "M12 3v18 M5 8h14 M7 8l-3 7h6zM17 8l-3 7h6z"],
  ["Sabit kıymet", "25x · 257", "M3 21h18 M5 21V8l7-5 7 5v13 M10 21v-6h4v6"],
  ["Kredi dökümü", "6 kredi", "M3 10h18 M5 10V6l7-3 7 3v4 M5 21h14 M7 10v11 M12 10v11 M17 10v11"],
  ["Kur ve enflasyon", "otomatik", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18"],
];

const SHORT = [
  "Kaynak dosyalar okunur, hesap kodları sınıflandırılır",
  "Her tutar bir gelir tablosu kalemine bağlanır",
  "Kur ve geri eklemelerle taban karşılaştırılabilir olur",
  "Normalize gelir tablosu ve FAVÖK tabanı kurulur",
  "Sürücü bazlı beş yıllık projeksiyon üretilir",
  "Üç mercek paralel çalışır, sonuçlar uzlaştırılır",
];

const OUTS = [
  ["01", "Normalize gelir tablosu", "Aylık ve yıllık, USD bazında, her hücre mizan satırına bağlı."],
  ["02", "Projeksiyon modeli", "Beş yıllık gelir tablosu, sürücü tabanlı ve senaryo setiyle."],
  ["03", "Nakit akışı ve NBD tablosu", "Serbest nakit akışı, iskonto, terminal değer ve köprüsü."],
  ["04", "Üç mercekli değerleme", "Gelir, piyasa ve varlık sonuçları ve uzlaştırma raporu."],
  ["05", "Duyarlılık ve varsayım kaydı", "Her varsayımın kaynağı, kim belirlediği ve değere etkisi."],
  ["06", "Denetim raporu ve güven skoru", "Bulgular, düzeltme etkisi ve altı boyutlu kalite profili."],
];

const SEGS = [
  ["Aile şirketi ve KOBİ sahibi", "“Şirketim ne eder?” sorusuna güvenilir bir cevap yok; mali müşavir tablosu karar vermeye yetmiyor.", "Halefiyet · ortak ayrılığı · gelen teklif"],
  ["M&A danışmanları", "Her mandatta değerleme modeli sıfırdan kuruluyor; analist zamanı en pahalı kaynak.", "Yeni mandat · bilgi notu · alıcı soruları"],
  ["Mali müşavir ve denetçiler", "Müşteriye sunulacak katma değerli hizmet arayışı var; değerleme kapasitesi kurmak maliyetli.", "Denetim dönemi · birleşme · sermaye artırımı"],
  ["Fonlar ve yatırımcılar", "Portföy şirketlerinin dönemsel değerlemesi bir yükümlülük; her biri ayrı model demek.", "Çeyrek raporlama · yeni yatırım · çıkış"],
  ["Bankalar ve finans kurumları", "Kredi tahsisinde firma değeri ve nakit üretim kapasitesi standart biçimde ölçülemiyor.", "Kredi başvurusu · yapılandırma · teminat"],
  ["Holding ve aile ofisleri", "İştirakler arası sermaye tahsisi karşılaştırılabilir bir değer ölçüsü olmadan yapılıyor.", "Bütçe dönemi · iştirak alım-satımı"],
];

const FAQ = [
  ["Bizden ne isteniyor?", "Son üç yılın mizanı, aylık satış raporu, yıl sonu bilançosu, sabit kıymet tablosu ve kredi dökümü. Hepsi muhasebe ve ticari sistemlerinizde zaten mevcut. Kur ve enflasyon serilerini motor kendisi çeker."],
  ["Verilerimiz güvende mi?", "Dosyalar gizlilik sözleşmesi kapsamında işlenir, üçüncü taraflarla paylaşılmaz ve çalışma bitiminde talebiniz üzerine silinir. Bu sitedeki tüm örnekler anonimleştirilmiş bir vakaya aittir."],
  ["Muhasebemiz düzensiz, yine de olur mu?", "Genellikle olur. Motor eksik dönemi komşu dönem oranıyla tahmin eder ve tahmin edilen her hücreyi ayrı işaretler — bu, güven skorunu düşürür ama çalışmayı durdurmaz. Kritik bir eksik varsa değer üretmeden önce eksik listesi raporlanır."],
  ["Sonuç bağımsız denetim raporu yerine geçer mi?", "Hayır. Finvestima bir değerleme çalışmasıdır; yasal denetim veya ekspertiz raporu değildir. İskonto oranı, çarpan ve normalizasyon kararları değerleme ekibinin yargısıdır ve raporda gerekçesiyle yer alır."],
  ["Yapay zekâ mı karar veriyor?", "Hayır. Yapay zekâ sınıflandırır, hesaplar, tarar ve alternatifleri yan yana koyar. İskonto oranını, çarpanı, büyüme hedefini ve hangi kalemin normalize edileceğini insan seçer. Partner pakette her değerleme ayrıca uzman incelemesinden geçer."],
  ["Ne kadar sürer?", "Veri tamsa 5–7 iş günü. Sonraki dönem güncellemeleri yarım ile bir iş günü sürer, çünkü eşleme haritası ve varsayım kaydı yerinde durur."],
];

const MAXV = 26;
const BANDS = [
  { lo: 5.8, hi: 7.4, color: "var(--teal)", numColor: "var(--teald)", label: "Varlık merceği", sub: "net aktifler", num: "5,8 – 7,4" },
  { lo: 15.6, hi: 22.3, color: "var(--gold)", numColor: "var(--gold)", label: "Piyasa merceği", sub: "sektör çarpanları", num: "15,6 – 22,3" },
  { lo: 14.2, hi: 19.3, color: "var(--navy2)", numColor: "var(--navy2)", label: "Gelir merceği", sub: "indirgenmiş nakit akışı", num: "14,2 – 19,3" },
];

function IgFileIcon({ d }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function FlowArrow() {
  return (
    <div className="igflow" aria-hidden="true">
      <svg width="16" height="26" viewBox="0 0 16 26" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M8 1v18M3 15l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function Landing() {
  const [sel, setSel] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const nameInputRef = useRef(null);
  const rootRef = useRef(null);
  const fillRefs = useRef([]);

  useEffect(() => {
    fillRefs.current.forEach((f, i) => {
      if (!f) return;
      const { lo, hi } = BANDS[i];
      f.style.left = (lo / MAXV) * 100 + "%";
      f.style.width = "0%";
      setTimeout(() => {
        f.style.width = ((hi - lo) / MAXV) * 100 + "%";
      }, 260 + i * 140);
    });
  }, []);

  useEffect(() => {
    const els = rootRef.current ? rootRef.current.querySelectorAll(".reveal") : [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const raw = nameInputRef.current ? nameInputRef.current.value.trim() : "";
    const name = raw || "Teşekkürler";
    setFirstName(name.split(" ")[0]);
    setSubmitted(true);
  }

  const layer = LAYERS[sel];

  return (
    <div className="landing-root" ref={rootRef}>
      <nav>
        <div className="wrap navin">
          <a href="#top">
            <img className="logo" src={logo} alt="Finvestima" />
          </a>
          <button className="burger" aria-label="Menü" onClick={() => setNavOpen((v) => !v)}>
            ☰
          </button>
          <div className={"navlinks" + (navOpen ? " open" : "")} onClick={() => setNavOpen(false)}>
            <Link to="/dcf">Engine</Link>
            <a href="#fiyat">Fiyatlandırma</a>
            <a href="#sss">SSS</a>
          </div>
          <a className="btn sm" href="#demo">Ön tarama isteyin</a>
        </div>
        <div className="subnav">
          <div className="wrap" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <a href="#nasil">Nasıl çalışır</a>
            <a href="#mercek">Üç mercek</a>
            <a href="#denetim">Denetim</a>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <header className="hero" id="top">
        <div className="wrap hgrid">
          <div>
            <div className="eyebrow">Yapay zekâ destekli değerleme</div>
            <h1>
              Şirketinizin değeri bir tahmin değil, <em>izi sürülebilir bir hesap</em> olsun.
            </h1>
            <p className="lede">
              Finvestima mizanınızdan başlar, üç bağımsız yöntemle değer üretir ve kendi modelini denetler. Haftalar süren bir çalışma, beş–yedi iş gününe iner.
            </p>
            <div className="hcta">
              <a className="btn" href="#demo">Ücretsiz ön tarama</a>
              <a className="btn ghost" href="#nasil">Nasıl çalıştığını görün</a>
            </div>
            <div className="hmeta">
              <div><b>5–7</b><span>iş günü teslim</span></div>
              <div><b>3</b><span>bağımsız mercek</span></div>
              <div><b>7</b><span>katmanlı motor</span></div>
              <div><b>62.973</b><span>kayıt satırı okundu</span></div>
            </div>
          </div>

          <div className="vcard reveal">
            <h4>Değerleme çıktısı: tek sayı değil, savunulabilir aralık</h4>
            <div className="sub">Örnek vaka · anonim endüstriyel üretim şirketi · milyon USD</div>
            <div className="band">
              {BANDS.map((b, i) => (
                <div className="bandrow" key={b.label}>
                  <div className="bandlbl">
                    {b.label}
                    <small>{b.sub}</small>
                  </div>
                  <div className="track">
                    <div
                      className="fill"
                      ref={(el) => (fillRefs.current[i] = el)}
                      style={{ background: b.color }}
                    />
                  </div>
                  <div className="vnum" style={{ color: b.numColor }}>{b.num}</div>
                </div>
              ))}
            </div>
            <div className="axis"><span>0</span><span>8</span><span>16</span><span>24</span></div>
            <div className="vfoot">Önerilen görüşme aralığı <b>18 – 24 M$</b></div>
          </div>
        </div>
      </header>

      {/* ══ PROBLEM ══ */}
      <section className="tint">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">Neden</div>
            <h2>Değerleme çoğu zaman bir Excel dosyasında kaybolur</h2>
            <p>Rakam vardır, dayanağı yoktur. Karşı taraf sorduğunda cevap veremezsiniz.</p>
          </div>
          <div className="probs">
            <div className="prob reveal">
              <div className="q">"Bu sayı nereden geliyor?"</div>
              <p>Model elle yazılmış hücrelerle dolu. Bir rakamın hangi muhasebe kaydından çıktığı kimse tarafından gösterilemiyor.</p>
              <div className="tagline">Finvestima her tutarı mizan satırına bağlar</div>
            </div>
            <div className="prob reveal">
              <div className="q">"Neden bu kadar yüksek?"</div>
              <p>Tek yöntem, tek sonuç. Çarpanın kaynağı yok, iskonto oranı tek hücrede sabit, varsayımların gerekçesi yazılı değil.</p>
              <div className="tagline">Üç bağımsız mercek ve varsayım kaydı</div>
            </div>
            <div className="prob reveal">
              <div className="q">"Bu formül yanlış."</div>
              <p>Satır kayması, kırık bağlantı, çift tanımlı vergi satırı. Karşı taraf bunları müzakerenin ortasında bulur.</p>
              <div className="tagline">Motor kendi modelini önce kendi denetler</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ NASIL ÇALIŞIR ══ */}
      <section id="nasil">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">Nasıl çalışır</div>
            <h2>Yedi katmanlı motor</h2>
            <p>
              Mizandaki ham kayıt, altı katmandan geçerek şirket değerine dönüşür; yedinci katman hepsini denetler. Katmana tıklayın — her adımda makinenin yaptığı iş ile insanın verdiği karar ayrıdır.
            </p>
          </div>
          <div className="igraph reveal">
            <div className="iglab">Girdiler · şirketin sistemlerinde hâlihazırda var</div>
            <div className="igfiles">
              {INPUTS.map((f) => (
                <div className="igfile" key={f[0]}>
                  <IgFileIcon d={f[2]} />
                  <b>{f[0]}</b>
                  <span>{f[1]}</span>
                </div>
              ))}
            </div>

            <FlowArrow />

            <div className="iglab">Motor · altı sıralı katman</div>
            <div className="iglayers" role="tablist">
              {LAYERS.slice(0, 6).map((l, i) => (
                <button
                  key={l.c}
                  className="iglayer"
                  role="tab"
                  aria-selected={i === sel}
                  onClick={() => setSel(i)}
                >
                  <span className="code">{l.c}</span>
                  <b>{l.n}</b>
                  <span>{SHORT[i]}</span>
                </button>
              ))}
            </div>

            <div className="igaudit" style={{ cursor: "pointer" }} onClick={() => setSel(6)}>
              <span className="chip">L7 · DENETİM</span>
              <p>
                Kesişen katman. Altı katmanın tamamını sürekli tarar: formül kayması, kırık dış bağlantı, çift tanımlı satır, tutarsız dönemselleştirme. Her bulgunun değere etkisi sayısal olarak ölçülür.
              </p>
            </div>

            <FlowArrow />

            <div className="iglab">Çıktılar · her uygulamada aynı</div>
            <div className="igouts">
              <div className="igout"><b>Normalize gelir tablosu</b><span>Geçmiş ve projeksiyon, USD bazında, her hücre kaynağına bağlı</span></div>
              <div className="igout"><b>Üç mercekli değerleme</b><span>Gelir, piyasa ve varlık sonuçları ile uzlaştırma</span></div>
              <div className="igout"><b>Denetim raporu ve güven skoru</b><span>Bulgular, düzeltme etkisi ve kalite profili</span></div>
            </div>

            <div className="igresult">
              <span>Sonuç tek bir sayı değil, savunulabilir bir aralık:</span><b>18 – 24 M$</b>
            </div>
          </div>

          <div className="pdetail">
            <div>
              <div className="lay">{layer.c} · {layer.n}</div>
              <h3>{layer.n} katmanı</h3>
              <p>{layer.d}</p>
            </div>
            <div className="who-ai">
              <h5>Yapay zekâ ne yapar</h5>
              <ul>
                {layer.ai.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="who-h">
              <h5>İnsan neye karar verir</h5>
              <ul>
                {layer.h.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ÜÇ MERCEK ══ */}
      <section className="tint" id="mercek">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">Üç mercek</div>
            <h2>Aynı veri, üç bağımsız cevap</h2>
            <p>Yöntemler birbirinin alternatifi değil, birbirinin doğrulayıcısıdır. Aradaki fark müzakerenin konusudur.</p>
          </div>
          <div className="lenses">
            <article className="lens l1 reveal">
              <div className="top"><span className="vc">V1</span><h3>Gelir merceği</h3></div>
              <div className="body">
                <div className="val">19.292</div><div className="vl">bin USD · özkaynak değeri</div>
                <ul>
                  <li>Yıllara göre serbest nakit akışı</li>
                  <li>İndirgenmiş nakit akışı ve net bugünkü değer</li>
                  <li>ROIC, ROE ve ekonomik katma değer</li>
                  <li>Terminal değer ve duyarlılık matrisi</li>
                </ul>
              </div>
            </article>
            <article className="lens l2 reveal">
              <div className="top"><span className="vc">V2</span><h3>Piyasa merceği</h3></div>
              <div className="body">
                <div className="val">22.262</div><div className="vl">bin USD · özkaynak değeri</div>
                <ul>
                  <li>Aynı sektördeki benzer firmalarla karşılaştırma</li>
                  <li>EV/FAVÖK ve MV/FAVÖK çarpanları</li>
                  <li>EV/Ciro ile gelir bazlı çapraz kontrol</li>
                  <li>Gerçekleşmiş satın alma işlemleri</li>
                </ul>
              </div>
            </article>
            <article className="lens l3 reveal">
              <div className="top"><span className="vc">V3</span><h3>Varlık merceği</h3></div>
              <div className="body">
                <div className="val">5.833</div><div className="vl">bin USD · taban çizgisi</div>
                <ul>
                  <li>Aktifler eksi pasifler — defter değeri</li>
                  <li>Satın alma sonrası makul varlık değeri</li>
                  <li>Firma değeri eksi net aktifler → şerefiye</li>
                  <li>Marka ve organizasyon değerinin ayrıştırılması</li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ══ DENETİM ══ */}
      <section className="dark" id="denetim">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">Denetim katmanı</div>
            <h2>Karşı tarafın bulacağı hatayı, önce biz buluruz</h2>
            <p>
              L7 katmanı modelin kendisini tarar: satır kayması, kırık bağlantı, tutarsız dönemselleştirme, çift tanımlı satır. Her bulgunun değere etkisi sayısal olarak ölçülür.
            </p>
          </div>
          <div className="audit">
            <div className="compare reveal">
              <div className="crow"><span className="k">Ham model çıktısı</span><span className="v" style={{ color: "#E88B80" }}>23.909</span></div>
              <div className="crow"><span className="k">Düzeltilmiş sonuç</span><span className="v" style={{ color: "#6FD3A8" }}>20.253</span></div>
              <div className="crow"><span className="k">Fark</span><span className="v" style={{ color: "#fff" }}>−3.656</span></div>
              <div className="crow"><span className="k">Etkisi</span><span className="v" style={{ color: "var(--goldl)" }}>%15,3</span></div>
              <p style={{ fontSize: 13, color: "#9FB2CE", marginTop: 16, lineHeight: 1.6 }}>
                Değerin düşmesi kötü haber değil. Savunulamayan 3,6 milyon dolar, müzakerenin ortasında çöken bir rakamdır. Önce kapatılmış olması pozisyonu güçlendirir.
              </p>
            </div>
            <ul className="findlist reveal">
              <li><span className="no">01</span><span><b>İşletme sermayesi satır kayması</b><span>Nakit akışında bir yıl ileriye kaymış; terminal yılda sıfır alınmış.</span></span></li>
              <li><span className="no">02</span><span><b>FCFF / FCFE karışımı</b><span>Faiz düşülmüş akış WACC ile iskonto ediliyor; borcun maliyeti iki kez sayılıyor.</span></span></li>
              <li><span className="no">03</span><span><b>Amortisman – yatırım uyumsuzluğu</b><span>Yatırım büyürken amortisman sabit; geç yıllarda kâr olduğundan yüksek görünüyor.</span></span></li>
              <li><span className="no">04</span><span><b>Tutarsız yıllıklandırma</b><span>Ciro ve maliyet farklı katsayılarla yıllığa çevrilmiş; marj yapay olarak yükselmiş.</span></span></li>
              <li><span className="no">05</span><span><b>Kırık bağlantı ve çift vergi satırı</b><span>Vergi hesabı dış dosyaya bağlı; bağlantı koptuğunda değer sessizce hatalı hesaplanıyor.</span></span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ══ ÇIKTI ══ */}
      <section>
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">Teslim edilenler</div>
            <h2>Her uygulamada aynı çıktı paketi</h2>
            <p>Sunuma hazır, kaynağına kadar izlenebilir altı belge.</p>
          </div>
          <div className="outs">
            {OUTS.map((o) => (
              <div className="out reveal" key={o[0]}>
                <span className="ix">{o[0]}</span>
                <b>{o[1]}</b>
                <p>{o[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ KİMLER İÇİN ══ */}
      <section className="tint">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">Kimler için</div>
            <h2>Değerleme ihtiyacı bir olayla tetiklenir</h2>
            <p>Finvestima o olayı beklerken hazır olmanızı sağlar.</p>
          </div>
          <div className="segs">
            {SEGS.map((s) => (
              <div className="seg reveal" key={s[0]}>
                <b>{s[0]}</b>
                <p>{s[1]}</p>
                <div className="trig">{s[2]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FİYAT ══ */}
      <section id="fiyat">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">Fiyatlandırma</div>
            <h2>Üç paket, tek motor</h2>
            <p>Erişilebilir bir hacim ürünü, yüksek marjlı bir abonelik ve insan döngüde çalışan bir lisans.</p>
          </div>
          <div className="prices">
            <article className="price feat reveal">
              <span className="badge">EN ÇOK TERCİH EDİLEN</span>
              <div className="role">Tek seferlik</div>
              <h3>Core</h3>
              <div className="amt">$2.500</div><div className="per">proje başına · 5–7 iş günü</div>
              <ul>
                <li>Uçtan uca yedi katman çalıştırılır</li>
                <li>Üç mercekli değerleme ve uzlaştırma</li>
                <li>Tam çıktı paketi ve güven skoru</li>
                <li className="hl">L7 denetim raporu dahildir</li>
                <li>Eşleme haritası şirkete özel kurulur</li>
              </ul>
              <a className="btn gold" href="#demo" style={{ width: "100%", textAlign: "center" }}>Başlayın</a>
            </article>
            <article className="price reveal">
              <div className="role">Abonelik</div>
              <h3>Refresh</h3>
              <div className="amt">$5.000</div><div className="per">yıllık · yarım–bir iş günü</div>
              <ul>
                <li>Kurulu haritayla yeni dönem verisi</li>
                <li>Değer değişiminin nedeni satır satır</li>
                <li>Varsayım kaydı yıllar arası sürdürülür</li>
                <li>Yıl içi bir ara güncelleme hakkı</li>
              </ul>
              <a className="btn ghost" href="#demo" style={{ width: "100%", textAlign: "center" }}>Görüşelim</a>
            </article>
            <article className="price reveal">
              <div className="role">Lisans</div>
              <h3>Partner</h3>
              <div className="amt">$20.000</div><div className="per">yıllık · danışmanlık firmaları</div>
              <ul>
                <li>Kendi müşterilerinize uygulayın</li>
                <li className="hl">Human in the Loop — her değerleme uzman incelemesinden geçer</li>
                <li className="hl">Advisory Support — metodoloji ve müzakere desteği</li>
                <li>Eğitim, onboarding ve öncelikli destek</li>
                <li>Sektör eşleme kütüphanesine erişim</li>
              </ul>
              <a className="btn ghost" href="#demo" style={{ width: "100%", textAlign: "center" }}>Lisans görüşmesi</a>
            </article>
          </div>
          <p className="pnote">
            Tüm paketlerde ücretsiz ön tarama ile başlanır — tek yıllık mizanınızdan örnek bir denetim çıktısı üretir, karar vermeden önce görürsünüz.
          </p>
        </div>
      </section>

      {/* ══ SSS ══ */}
      <section className="tint" id="sss">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">Sık sorulanlar</div>
            <h2>Merak edilenler</h2>
          </div>
          <div className="faq">
            {FAQ.map((f, i) => (
              <details key={f[0]} open={i === 0 ? true : undefined}>
                <summary>{f[0]}</summary>
                <p>{f[1]}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section id="demo">
        <div className="wrap">
          <div className="ctabox">
            <div>
              <h2>Tek yıllık mizanınızla başlayalım</h2>
              <p>
                Ücretsiz ön tarama, kendi verinizle üretilmiş somut bir çıktı verir: hangi hesaplar eşlenmedi, hangi varsayımlar kanıt bekliyor, değeriniz hangi bantta. Karar vermeden önce görürsünüz.
              </p>
              <p style={{ marginTop: 20, fontSize: 14, color: "#8FA5C6" }}>
                Paylaştığınız veriler gizlilik sözleşmesi kapsamında işlenir ve üçüncü taraflarla paylaşılmaz.
              </p>
            </div>
            <div className="form">
              {submitted ? (
                <div className="done">
                  <b>Talebiniz alındı, {firstName}.</b>
                  <span>Bir iş günü içinde dönüş yapıp hangi dosyalara ihtiyacımız olduğunu paylaşacağız.</span>
                </div>
              ) : (
                <form noValidate onSubmit={handleSubmit}>
                  <div className="row2">
                    <div className="field">
                      <label htmlFor="f1">Ad Soyad</label>
                      <input id="f1" required placeholder="Adınız" ref={nameInputRef} />
                    </div>
                    <div className="field">
                      <label htmlFor="f2">Şirket</label>
                      <input id="f2" required placeholder="Şirket adı" />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="f3">E-posta</label>
                    <input id="f3" type="email" required placeholder="ad@sirket.com" />
                  </div>
                  <div className="field">
                    <label htmlFor="f4">Rolünüz</label>
                    <select id="f4">
                      <option>Şirket sahibi / yönetici</option>
                      <option>M&amp;A danışmanı</option>
                      <option>Mali müşavir / denetçi</option>
                      <option>Fon / yatırımcı</option>
                      <option>Banka / finans kurumu</option>
                      <option>Diğer</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="f5">Kısa not</label>
                    <textarea id="f5" rows="2" placeholder="Değerleme nedeniniz (satış, ortak girişi, raporlama…)"></textarea>
                  </div>
                  <button className="submit" type="submit">Ön tarama isteyin</button>
                  <div className="formnote">Bu bir prototiptir; form gönderimi kaydedilmez.</div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="fgrid">
            <div>
              <img className="flogo" src={logo} alt="Finvestima" />
              <p style={{ fontSize: 13.5, maxWidth: "30em" }}>
                Yapay zekâ destekli şirket değerleme. Mizandan şirket değerine, izi sürülebilir bir hesapla.
              </p>
            </div>
            <div>
              <h5>Ürün</h5>
              <a href="#nasil">Nasıl çalışır</a>
              <a href="#mercek">Üç mercek</a>
              <a href="#denetim">Denetim katmanı</a>
              <a href="#fiyat">Fiyatlandırma</a>
            </div>
            <div>
              <h5>Kaynaklar</h5>
              <a href="#sss">Sık sorulanlar</a>
              <a href="#demo">Ön tarama</a>
              <a href="#top">Metodoloji dokümanı</a>
              <a href="#top">Örnek vaka</a>
            </div>
            <div>
              <h5>İletişim</h5>
              <a href="#demo">Demo talebi</a>
              <a href="#top">Partner programı</a>
              <a href="#top">İstanbul, Türkiye</a>
            </div>
          </div>
          <div className="fbot">
            <span>© 2026 Finvestima. Tüm hakları saklıdır.</span>
            <span>Sitedeki tüm rakamlar anonimleştirilmiş örnek vakaya aittir.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
