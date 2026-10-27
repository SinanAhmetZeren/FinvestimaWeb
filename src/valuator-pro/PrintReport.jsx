import { Fragment } from 'react';
import { nf, pc, mUsd } from './ui.jsx';
import logo from '../assets/finvestimaLogo.jpeg';

// Yazdırma/PDF raporu — ekrandaki interaktif sayfaların (L3-L7) bileşenlerini print modunda
// yeniden kullanmak yerine, kendi başına, uygulamanın kaydırmalı/flex kabuğundan (app/main/work)
// tamamen bağımsız bir ağaç (bkz. ValuatorProEngine.jsx'teki portal). Sadece USD bazında
// gösterir. Görsel dil, uygulamanın kendi renk/tablo stilini (valuator-pro/styles.css) taklit
// eder — navy/teal paleti, panel kartları, tablo bandı — düz muhasebe çıktısı gibi durmasın diye.
const C = { navy:'#1B3160', mid:'#33518E', teal:'#2E7D8F', gold:'#B8862B', red:'#BE3B30', green:'#1B6F55',
  line:'#D5DDE9', hair:'#F1F4FA', muted:'#5A6474', faint:'#8A94A6', ink:'#16203A' };

const S = {
  page: { background:'#fff', color:C.ink, fontFamily:'"IBM Plex Sans",-apple-system,sans-serif', fontSize:11, padding:'10mm 14mm' },
  fixedLogo: { position:'fixed', top:0, left:0, height:18 },
  cover: { paddingBottom:14, marginBottom:18, borderBottom:`3px solid ${C.navy}`, paddingTop:16 },
  h1: { fontSize:19, margin:'0 0 2px', color:C.navy, fontWeight:700 },
  meta: { fontSize:10.5, color:C.muted, margin:0 },
  section: { pageBreakBefore:'always', paddingTop:18 },
  sectionFirst: { paddingTop:2 },
  sectionCentered: { pageBreakBefore:'always', paddingTop:'60mm' },
  panel: { border:`1px solid ${C.line}`, borderRadius:8, overflow:'hidden', marginBottom:14, boxShadow:'0 1px 2px rgba(20,32,60,.05)' },
  panelHead: { padding:'9px 13px', borderBottom:`1px solid ${C.line}`, background:'linear-gradient(#FDFEFF,#F7F9FD)' },
  panelTitle: { margin:0, fontSize:13, fontWeight:700, color:C.navy },
  panelSub: { fontSize:10, color:C.faint, marginTop:1, display:'block' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:10.5 },
  th: { textAlign:'left', padding:'5px 13px', background:'#F4F7FC', borderBottom:`1px solid ${C.line}`, fontWeight:600, fontSize:9.5, color:C.muted, textTransform:'uppercase', letterSpacing:'.02em' },
  thN: { textAlign:'right', padding:'5px 13px', background:'#F4F7FC', borderBottom:`1px solid ${C.line}`, fontWeight:600, fontSize:9.5, color:C.muted, textTransform:'uppercase', letterSpacing:'.02em' },
  td: { padding:'4px 13px', borderBottom:`1px solid ${C.hair}` },
  tdN: { padding:'4px 13px', borderBottom:`1px solid ${C.hair}`, textAlign:'right', fontFamily:'"IBM Plex Mono",monospace' },
  tdSum: { padding:'5px 13px', borderTop:`1px solid ${C.navy}`, borderBottom:`1px solid ${C.navy}`, fontWeight:700, color:C.navy, background:'#F2F6FC' },
  tdSumN: { padding:'5px 13px', borderTop:`1px solid ${C.navy}`, borderBottom:`1px solid ${C.navy}`, fontWeight:700, color:C.navy, background:'#F2F6FC', textAlign:'right', fontFamily:'"IBM Plex Mono",monospace' },
  tdHero: { padding:'6px 13px', fontWeight:700, color:'#7A5618', background:'#FAF2E1', borderTop:'1px solid #E3CB96', borderBottom:'1px solid #E3CB96' },
  tdHeroN: { padding:'6px 13px', fontWeight:700, color:'#7A5618', background:'#FAF2E1', borderTop:'1px solid #E3CB96', borderBottom:'1px solid #E3CB96', textAlign:'right', fontFamily:'"IBM Plex Mono",monospace' },
  heroBox: { display:'flex', gap:12, marginBottom:14 },
  hero: { flex:1, border:`1px solid ${C.line}`, borderRadius:8, padding:'12px 16px', background:'linear-gradient(#FDFEFF,#F7F9FD)' },
  heroLbl: { fontSize:9.5, color:C.muted, textTransform:'uppercase', letterSpacing:'.04em', fontWeight:600 },
  heroVal: { fontSize:19, fontWeight:700, color:C.navy, marginTop:4, fontFamily:'"IBM Plex Mono",monospace' },
  tag: { display:'inline-block', fontSize:9, fontWeight:600, padding:'2px 8px', borderRadius:99, letterSpacing:'.01em' },
};

const tagStyle = sev => sev==='crit'
  ? { ...S.tag, background:'#FBEAE8', color:C.red }
  : sev==='warn' ? { ...S.tag, background:'#FAF2E1', color:C.gold }
  : { ...S.tag, background:C.hair, color:C.muted };

function Panel({ title, sub, children }){
  return (
    <div style={S.panel}>
      <div style={S.panelHead}>
        <h3 style={S.panelTitle}>{title}</h3>
        {sub && <span style={S.panelSub}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}

const Row = ({ l, v, cls }) => (
  <tr>
    <td style={cls==='sum' ? S.tdSum : cls==='hero' ? S.tdHero : S.td}>{l}</td>
    {v.map((x,i) => <td key={i} style={cls==='sum' ? S.tdSumN : cls==='hero' ? S.tdHeroN : S.tdN}>{x}</td>)}
  </tr>
);

function BsPage({ hist }){
  const toUsd = (h, x) => x/(h.fx.end||1)/1000;
  const secs = hist[0].bs.secs;
  return (
    <div style={S.sectionFirst}>
      <Panel title="Bilanço özeti" sub="bin USD, yıl sonu kuru">
        <table style={S.table}><thead><tr>
          <th style={S.th}>Kalem</th>{hist.map(h=><th key={h.year} style={S.thN}>{h.year}</th>)}
        </tr></thead><tbody>
          {secs.map((s, si) => (
            <Fragment key={s.sec}>
              <Row l={s.sec} v={hist.map(h=>nf(toUsd(h,h.bs.secs[si].total)))} cls="sum" />
              {s.lines.map((l, li) => hist.some(h=>Math.abs(toUsd(h,h.bs.secs[si].lines[li].v))>0.05) && (
                <Row key={l.k} l={l.n} v={hist.map(h=>nf(toUsd(h, h.bs.secs[si].lines[li].v)))} />
              ))}
            </Fragment>
          ))}
          <Row l="TOPLAM AKTİF" v={hist.map(h=>nf(toUsd(h,h.bs.TA)))} cls="hero" />
          <Row l="TOPLAM PASİF" v={hist.map(h=>nf(toUsd(h,h.bs.TP)))} cls="hero" />
        </tbody></table>
      </Panel>
    </div>
  );
}

function IsPage({ hist }){
  const rows = [
    ['Net satışlar', h=>h.usd.rev],
    ['Satışların maliyeti (−)', h=>-h.usd.cogs],
    ['Brüt kâr', h=>h.usd.gross],
    ['Pazarlama, satış, dağıtım (−)', h=>-h.usd.psd],
    ['Genel yönetim (−)', h=>-h.usd.ga],
    ['Faaliyet kârı (FVÖK)', h=>h.usd.ebit],
    ['Amortisman ve itfa (+)', h=>h.usd.da],
    ['FAVÖK', h=>h.usd.ebitda],
    ['Geri eklemeler (+)', h=>h.usd.addb],
    ['Normalize FAVÖK', h=>h.usd.ebitdaAdj],
  ];
  return (
    <div style={S.sectionCentered}>
      <Panel title="Gelir tablosu" sub="bin USD, yıl ortalaması kuru">
        <table style={S.table}><thead><tr>
          <th style={S.th}>Kalem</th>{hist.map(h=><th key={h.year} style={S.thN}>{h.year}</th>)}
        </tr></thead><tbody>
          {rows.map(([l,f],i) => <Row key={i} l={l} v={hist.map(h=>nf(f(h)))} cls={l==='Normalize FAVÖK'?'hero':l==='FAVÖK'?'sum':null} />)}
          <Row l="Normalize FAVÖK marjı" v={hist.map(h=>pc(h.usd.ebitdaAdj/(h.usd.rev||1)))} />
        </tbody></table>
      </Panel>
    </div>
  );
}

function AssumptionsPage({ st, V }){
  const A = st.asm, B = V.B, W = V.P.W;
  const COSTS = [['mat','Malzeme'],['lab','Direkt işçilik'],['ovh','Genel üretim (amort. hariç)'],['psd','Pazarlama, satış, dağıtım'],['ga','Genel yönetim'],['rnd','Ar-Ge']];
  const SCEN = { pess:'Kötümser', base:'Baz', opt:'İyimser', custom:'Elle değiştirilmiş' };
  return (
    <div style={S.sectionCentered}>
      <Panel title="Varsayımlar ve girdiler" sub={`Baz yıl ${B.year}, ${A.N} yıllık projeksiyon · Senaryo: ${SCEN[A.scenario]||A.scenario}`}>
        <table style={S.table}><thead><tr><th style={S.th}>Gelir büyümesi</th><th style={S.thN}>Oran</th></tr></thead><tbody>
          {A.growth.slice(0,A.N).map((g,i) => <Row key={i} l={B.year+i+1} v={[pc(g)]} />)}
        </tbody></table>
      </Panel>
      <Panel title={`Maliyet / ciro hedefi (${B.year+A.N})`}>
        <table style={S.table}><thead><tr><th style={S.th}>Kalem</th><th style={S.thN}>Baz</th><th style={S.thN}>Hedef</th></tr></thead><tbody>
          {COSTS.filter(([k])=>k!=='rnd'||A.costs.rnd.s>0).map(([k,n]) => <Row key={k} l={n} v={[pc(A.costs[k].s), pc(A.costs[k].e)]} />)}
        </tbody></table>
      </Panel>
      <Panel title="Yatırım, sermaye, vergi ve iskonto">
        <table style={S.table}><tbody>
          <Row l="Yatırım / ciro" v={[pc(A.capexPct)]} />
          <Row l="Net işletme sermayesi / ciro" v={[pc(A.nwcPct)]} />
          <Row l="Yeni yatırım ömrü" v={[A.daLife+' yıl']} />
          <Row l="Kurumlar vergisi" v={[pc(A.taxRate)]} />
          <Row l="Hesaplanan WACC" v={[pc(W.value)]} cls="sum" />
          <Row l={A.tvMethod==='gordon' ? 'Terminal büyüme' : 'Çıkış FAVÖK çarpanı'} v={[A.tvMethod==='gordon' ? pc(A.tg) : nf(A.exitMult,2)+'x']} />
          <Row l="EV / FAVÖK çarpanı" v={[nf(A.mult.value,2)+'x']} />
          <Row l="Yöntem ağırlıkları (DCF / Çarpan / Net aktif)" v={[pc(A.weights.dcf)+' / '+pc(A.weights.mult)+' / '+pc(A.weights.na)]} />
        </tbody></table>
      </Panel>
    </div>
  );
}

function ValuationPage({ V }){
  return (
    <div style={S.sectionCentered}>
      <Panel title="Değerleme" sub="bin USD">
        <div style={{ padding:14 }}>
          <div style={S.heroBox}>
            <div style={S.hero}><div style={S.heroLbl}>Firma değeri (EV)</div><div style={S.heroVal}>{mUsd(V.ev)}</div></div>
            <div style={S.hero}><div style={S.heroLbl}>Net borç</div><div style={S.heroVal}>{mUsd(V.nd)}</div></div>
            <div style={S.hero}><div style={S.heroLbl}>Özkaynak değeri</div><div style={S.heroVal}>{mUsd(V.eq)}</div></div>
          </div>
        </div>
        <table style={S.table}><thead><tr>
          <th style={S.th}>Yöntem</th><th style={S.thN}>Firma değeri</th><th style={S.thN}>Özkaynak değeri</th>
        </tr></thead><tbody>
          <Row l="İndirgenmiş nakit akımı" v={[mUsd(V.m1.ev), mUsd(V.m1.eq)]} />
          <Row l="FAVÖK çarpanı" v={[mUsd(V.m2.ev), mUsd(V.m2.eq)]} />
          <Row l="Net aktifler" v={[mUsd(V.m3.ev), mUsd(V.m3.eq)]} />
          <Row l="Ağırlıklı ortalama" v={[mUsd(V.ev), mUsd(V.eq)]} cls="hero" />
        </tbody></table>
      </Panel>
    </div>
  );
}

function AuditPage({ audit }){
  const SEV = { crit:'Kritik', warn:'Uyarı', info:'Bilgi' };
  return (
    <div style={S.section}>
      <Panel title="Denetim bulguları" sub={`Koşullu güven skoru: ${audit.score.toFixed(1).replace('.',',')} / 10`}>
        <table style={S.table}><thead><tr>
          <th style={S.th}>Bulgu</th><th style={S.th}>Önem</th><th style={S.th}>Açıklama</th>
        </tr></thead><tbody>
          {audit.findings.map(f => (
            <tr key={f.id}>
              <td style={S.td}>{f.title}</td>
              <td style={S.td}><span style={tagStyle(f.sev)}>{SEV[f.sev]||f.sev}</span></td>
              <td style={S.td}>{f.detail}</td>
            </tr>
          ))}
        </tbody></table>
      </Panel>
    </div>
  );
}

export default function PrintReport({ st, hist, V, audit }){
  if (!hist.length || !V) return null;
  return (
    <div style={S.page}>
      <img src={logo} alt="Finvestima" style={S.fixedLogo} />
      <div style={S.cover}>
        <h1 style={S.h1}>{st.company || 'Firma'} değerleme raporu</h1>
        <p style={S.meta}>{new Date().toLocaleDateString('tr-TR')} · Tutarlar bin USD</p>
      </div>
      <BsPage hist={hist} />
      <IsPage hist={hist} />
      {st.asm && <AssumptionsPage st={st} V={V} />}
      <ValuationPage V={V} />
      <AuditPage audit={audit} />
    </div>
  );
}
