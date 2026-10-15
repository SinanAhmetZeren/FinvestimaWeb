import { useState, useEffect } from 'react';
import { Panel, Seg, Toggle, Tag, Empty, FinTable, nf, par, pc, mx, NumField, Insp } from '../ui.jsx';
import { RevenueChart, Bridge } from '../charts.jsx';
import { contribution, LEVELS } from '../engine/contribution.js';
import { lineOf, accName, BS_ASSETS, BS_LIABS } from '../engine/accounts.js';
import { flow } from '../engine/ledger.js';

const LINE_LABEL = {};
[...BS_ASSETS, ...BS_LIABS].forEach(s => s.lines.forEach(l => { LINE_LABEL[l.k] = l.n; }));

const noData = <div className="left"><Empty title="Tablo üretmek için veri yok">L1'de mizan ya da beyanname yükleyin.</Empty></div>;

export function L3Balance({ hist, st, up, print }){
  const [cur, setCur] = useState('TL');
  const [modalKey, setModalKey] = useState(null);
  useEffect(() => {
    if (!modalKey) return;
    const onKey = e => { if (e.key === 'Escape') setModalKey(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalKey]);
  if (!hist.length) return noData;
  const conv = (h, v) => cur==='TL' ? v/1000 : v/(h.fx.end||1)/1000;
  const head = hist.map(h=>({ l:String(h.year) }));
  const rows = [];
  hist[0].bs.secs.forEach((s, si) => {
    if (si===2) rows.push({ l:'TOPLAM AKTİF', v: hist.map(h=>conv(h,h.bs.TA)), cls:'sum' }, { spacer:true });
    rows.push({ l:s.sec, v: hist.map(h=>conv(h,h.bs.secs[si].total)), cls:'sub' });
    s.lines.forEach((l, li) => {
      const vals = hist.map(h=>conv(h,h.bs.secs[si].lines[li].v));
      if (vals.some(x=>Math.abs(x)>0.05)) rows.push({ l: l.n, v: vals, cls:'kid', key: l.k, tag: hist.some(h=>h.bs.secs[si].lines[li].computed) ? <Tag c="gold">hesaplandı</Tag> : null });
    });
  });
  rows.push({ l:'TOPLAM PASİF', v: hist.map(h=>conv(h,h.bs.TP)), cls:'sum' });
  rows.push({ l:'Denklik farkı', v: hist.map(h=>conv(h,h.bs.check)), cls:'dim' });

  const EQ_PARTS = [{k:'paidIn'},{k:'capRes'},{k:'profitRes'},{k:'prevProfit'},{k:'prevLoss'},{k:'netProfit'}];
  const vrows = [
    { l:'Ticari alacaklar + diğer alacaklar', v: hist.map(h=>conv(h,h.bs.v.tradeRec+h.bs.v.otherRec)), cls:'kid', parts:[{k:'tradeRec'},{k:'otherRec'}] },
    { l:'Stoklar ve verilen avanslar', v: hist.map(h=>conv(h,h.bs.v.inv+h.bs.v.advGiven)), cls:'kid', parts:[{k:'inv'},{k:'advGiven'}] },
    { l:'Diğer faaliyet varlıkları', v: hist.map(h=>conv(h,h.bs.v.prepaid+h.bs.v.otherCA+h.bs.v.constr)), cls:'kid', parts:[{k:'prepaid'},{k:'otherCA'},{k:'constr'}] },
    { l:'Faaliyet borçları (−)', v: hist.map(h=>-conv(h,h.bs.opCL)), cls:'kid', parts:[{k:'tradePay',s:-1},{k:'otherPayST',s:-1},{k:'advRecv',s:-1},{k:'constrPr',s:-1},{k:'taxPay',s:-1},{k:'provST',s:-1},{k:'defIncST',s:-1},{k:'otherSTL',s:-1}] },
    { l:'Net işletme sermayesi', v: hist.map(h=>conv(h,h.bs.nwc)), cls:'sub' },
    { spacer:true },
    { l:'Mali borçlar (KV + UV)', v: hist.map(h=>conv(h,h.bs.v.finDebtST+h.bs.v.finDebtLT)), cls:'kid', parts:[{k:'finDebtST'},{k:'finDebtLT'}] },
    { l:'Ortaklara borçlar', v: hist.map(h=>conv(h,h.bs.partners)), cls:'kid', tag: st.partnersAsDebt!==false ? <Tag>borç</Tag> : <Tag c="plum">özkaynak benzeri</Tag>, parts:[{k:'partnersST'},{k:'partnersLT'}] },
    { l:'Nakit ve menkul kıymetler (−)', v: hist.map(h=>-conv(h,h.bs.cash)), cls:'kid', parts:[{k:'cash',s:-1},{k:'secs',s:-1}] },
    { l:'Net finansal borç', v: hist.map(h=>conv(h,h.bs.netDebt)), cls:'sub' },
    { spacer:true },
    { l:'Yatırılmış sermaye (özkaynak + net borç)', v: hist.map(h=>conv(h,h.bs.investedCapital)), cls:'hero' },
    { l:'Net aktifler (aktif − yabancı kaynak)', v: hist.map(h=>conv(h,h.bs.EQ)), cls:'sub', parts:EQ_PARTS },
    { l:'Maddi net aktifler (MODV hariç)', v: hist.map(h=>conv(h,h.bs.tangibleEquity)), cls:'kid', parts:[...EQ_PARTS,{k:'intang',s:-1}] },
  ];
  const K = k => hist.map(h=>h.kpi[k]);
  const krows = [
    { l:'Cari oran', v:K('current'), f:x=>mx(x,2), formula:'Dönen Varlıklar / Kısa Vadeli Yabancı Kaynaklar', ratioParts: h=>[{l:'Dönen Varlıklar',v:h.bs.CA},{l:'Kısa Vadeli Yabancı Kaynaklar',v:h.bs.STL}], f2:x=>mx(x,2) },
    { l:'Asit test oranı', v:K('quick'), f:x=>mx(x,2), formula:'(Dönen Varlıklar − Stoklar) / Kısa Vadeli Yabancı Kaynaklar', ratioParts: h=>[{l:'Dönen Varlıklar − Stoklar',v:h.bs.CA-h.bs.v.inv},{l:'Kısa Vadeli Yabancı Kaynaklar',v:h.bs.STL}], f2:x=>mx(x,2) },
    { l:'Alacak tahsil süresi (gün)', v:K('dso'), f:x=>nf(x), formula:'Ticari Alacaklar / Net Satışlar × 365', ratioParts: h=>[{l:'Ticari Alacaklar',v:h.bs.v.tradeRec},{l:'Net Satışlar',v:h.is.netSales}], f2:x=>nf(x)+' gün' },
    { l:'Stok devir süresi (gün)', v:K('dio'), f:x=>nf(x), formula:'Stoklar / Satışların Maliyeti × 365', ratioParts: h=>[{l:'Stoklar',v:h.bs.v.inv},{l:'Satışların Maliyeti',v:h.is.cogs}], f2:x=>nf(x)+' gün' },
    { l:'Borç ödeme süresi (gün)', v:K('dpo'), f:x=>nf(x), formula:'Ticari Borçlar / Satışların Maliyeti × 365', ratioParts: h=>[{l:'Ticari Borçlar',v:h.bs.v.tradePay},{l:'Satışların Maliyeti',v:h.is.cogs}], f2:x=>nf(x)+' gün' },
    { l:'Nakit dönüşüm süresi (gün)', v:K('ccc'), f:x=>nf(x), cls:'sub', formula:'Alacak tahsil + Stok devir − Borç ödeme (gün)' },
    { l:'Stok / net satış', v:K('invS'), f:pc, cls: hist.some(h=>h.kpi.invS>0.2)?'warnrow':'', formula:'Stoklar / Net Satışlar', ratioParts: h=>[{l:'Stoklar',v:h.bs.v.inv},{l:'Net Satışlar',v:h.is.netSales}], f2:pc },
    { l:'NİS / net satış', v:K('nwcS'), f:pc, formula:'Net İşletme Sermayesi / Net Satışlar', ratioParts: h=>[{l:'Net İşletme Sermayesi',v:h.bs.nwc},{l:'Net Satışlar',v:h.is.netSales}], f2:pc },
    { l:'Net borç / FAVÖK', v:K('ndEbitda'), f:x=>mx(x,1), formula:'Net Finansal Borç / Normalize FAVÖK', ratioParts: h=>[{l:'Net Finansal Borç',v:h.bs.netDebt},{l:'Normalize FAVÖK',v:h.ebitdaAdj}], f2:x=>mx(x,1) },
    { l:'Faiz karşılama (FVÖK / finansman)', v:K('cover'), f:x=>mx(x,1), formula:'FVÖK / Finansman Giderleri', ratioParts: h=>[{l:'FVÖK',v:h.is.ebit},{l:'Finansman Giderleri',v:h.is.finExp}], f2:x=>mx(x,1) },
    { l:'Yabancı kaynak / aktif', v:K('lev'), f:pc, formula:'(KVYK + UVYK) / Toplam Aktif', ratioParts: h=>[{l:'KVYK + UVYK',v:h.bs.STL+h.bs.LTL},{l:'Toplam Aktif',v:h.bs.TA}], f2:pc },
    { l:'Özkaynak kârlılığı', v:K('roe'), f:pc, formula:'Net Dönem Kârı / Özkaynaklar', ratioParts: h=>[{l:'Net Dönem Kârı',v:h.is.net},{l:'Özkaynaklar',v:h.bs.EQ}], f2:pc },
  ];
  const unit = cur==='TL' ? 'bin TL' : "bin USD, yıl sonu kuru";
  const last = hist[hist.length-1];
  const body = (<>
    <Panel title="Bilanço özeti" sub={unit} right={!print && <Seg small value={cur} onChange={setCur} options={[{v:'TL',l:'TL'},{v:'USD',l:'USD'}]} />} flush>
      <FinTable head={head} rows={rows} firstLabel="" onRowClick={r=>setModalKey(r)} note={cur==='USD' ? 'Bilanço kalemleri yıl sonu kuruyla çevrildi: '+hist.map(h=>`${h.year} ${nf(h.fx.end,4)}`).join(', ')+'.' : 'Tekdüzen hesap planı gruplarıyla, mizan net bakiyelerinden üretildi.'} />
    </Panel>
    <Panel title="Değerlemeye giden bilanço kalemleri" sub={unit} flush><FinTable head={head} rows={vrows} onRowClick={r=>setModalKey(r)} /></Panel>
    <Panel title="Finansal oranlar" flush><FinTable head={head} rows={krows} fmt={x=>nf(x,2)} onRowClick={r=>setModalKey(r)} /></Panel>
  </>);
  if (print) return <div className="left">{body}</div>;

  const modal = modalKey && (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setModalKey(null)}>
      <div style={{ background:'#fff', borderRadius:10, width:'min(960px, 95vw)', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', position:'relative' }} onClick={e=>e.stopPropagation()}>
        <button type="button" onClick={()=>setModalKey(null)} aria-label="Kapat"
          style={{ position:'absolute', top:10, right:12, border:0, background:'none', fontSize:20, lineHeight:1, cursor:'pointer', color:'var(--muted)' }}>×</button>
        <div style={{ padding:'18px 22px' }}>
          <h3 style={{ margin:'0 0 4px' }}>{modalKey.l}</h3>
          {modalKey.formula && <p className="muted small" style={{ margin:'0 0 14px' }}>{modalKey.formula}</p>}
          {modalKey.ratioParts ? (() => {
            const labels = modalKey.ratioParts(hist[0]).map(p=>p.l);
            return (
              <table className="g"><thead><tr className="hd solo"><th className="lbl">Bileşen</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                <tbody>
                  {labels.map((lab, li) => (
                    <tr key={lab}><td className="lbl">{lab}</td>
                      {hist.map(h => <td key={h.id} className="n">{par(conv(h, modalKey.ratioParts(h)[li].v))}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="sum"><td className="lbl">Oran</td>
                  {hist.map((h,hi) => <td key={h.id} className="n">{(modalKey.f2||modalKey.f)(modalKey.v[hi])}</td>)}
                </tr></tfoot>
              </table>
            );
          })() : modalKey.parts ? (() => {
            const parts = modalKey.parts;
            return (
              <table className="g"><thead><tr className="hd solo"><th className="lbl">Kalem</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.k}><td className="lbl">{LINE_LABEL[p.k] || p.k}</td>
                      {hist.map(h => <td key={h.id} className="n">{par((p.s===-1?-1:1)*conv(h,h.bs.v[p.k]||0))}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="sum"><td className="lbl">Toplam</td>
                  {hist.map(h => <td key={h.id} className="n">{par(parts.reduce((s,p)=>s+(p.s===-1?-1:1)*conv(h,h.bs.v[p.k]||0),0))}</td>)}
                </tr></tfoot>
              </table>
            );
          })() : (() => {
            const byCode = {};
            hist.forEach(h => {
              Object.values(h.L.acc).forEach(a => {
                if (lineOf(a.code)?.line.k !== modalKey.key) return;
                (byCode[a.code] ||= { name: a.name || accName(a.code), vals: {} }).vals[h.year] = a.dt - a.ct;
              });
            });
            const codes = Object.keys(byCode).sort();
            if (!codes.length) return <p className="muted small">Bu yıllarda bu satırı besleyen hesap yok.</p>;
            return (
              <table className="g"><thead><tr className="hd solo"><th className="lbl">Hesap</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                <tbody>
                  {codes.map(code => (
                    <tr key={code}><td className="lbl"><code>{code}</code> {byCode[code].name}</td>
                      {hist.map(h => <td key={h.id} className="n">{par(conv(h, byCode[code].vals[h.year] ?? 0))}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="sum"><td className="lbl">Toplam</td>
                  {hist.map(h => <td key={h.id} className="n">{par(conv(h, codes.reduce((s,cc)=>s+(byCode[cc].vals[h.year]??0),0)))}</td>)}
                </tr></tfoot>
              </table>
            );
          })()}
        </div>
      </div>
    </div>
  );
  return (<>
    <div className="left">{body}</div>
    {modal}
    <Insp>
      <div className="ihead">Uyarlamalar <span>L3</span></div>
      <div className="ihero"><div className="big">{nf(last.usd.ic/1000,2)} M$</div><div className="lb">{last.year} yatırılmış sermaye</div>
        <div className="sub">Özkaynak {nf(last.usd.equity/1000,2)} M$, net borç {nf(last.usd.netDebt/1000,2)} M$. Net aktifler değerleme aralığının tabanını oluşturur.</div></div>
      <div className="iblk"><h4>Sınıflama</h4>
        <Toggle checked={st.partnersAsDebt!==false} onChange={v=>up({partnersAsDebt:v})} title="Ortaklara borçları net borca kat" desc="Kapatılırsa 331 ve 431 hesapları özkaynak benzeri kabul edilir; firma değeri değişmez, özkaynak değeri artar." />
      </div>
      <div className="iblk"><h4>{last.year} NİS bileşimi (bin USD)</h4>
        <div className="ical">
          <span className="k">Ticari alacaklar</span><span className="v">{nf(last.usd.tradeRec)}</span>
          <span className="k">Stoklar</span><span className="v">{nf(last.usd.inv)}</span>
          <span className="k">Ticari borçlar</span><span className="v">({nf(last.usd.tradePay)})</span>
          <span className="k tot">Net işletme sermayesi</span><span className="v tot">{nf(last.usd.nwc)}</span>
        </div>
      </div>
      <div className="inote">Stok / ciro {pc(last.kpi.invS)}. {last.kpi.invS>0.2 ? <b>%20 hedefinin üzerinde; L5'te NİS oranını düşürmek nakit akımını doğrudan artırır.</b> : 'Hedef aralıkta.'}</div>
    </Insp>
  </>);
}

export function L4Income({ hist, st, up, print }){
  const [mode, setMode] = useState('USD');
  const [cy, setCy] = useState(hist.length ? hist[hist.length-1].year : null);
  const [modalKey, setModalKey] = useState(null);
  useEffect(() => {
    if (!modalKey) return;
    const onKey = e => { if (e.key === 'Escape') setModalKey(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalKey]);
  if (!hist.length) return noData;
  const c = (h, v) => mode==='TL' ? v/1000 : mode==='USD' ? v/(h.fx.avg||1)/1000 : v/(h.is.netSales||1);
  const fmt = mode==='PCT' ? (x=>pc(x)) : par;
  const head = hist.map(h=>({ l: String(h.year)+(h.months<12?` (${h.months} ay)`:'') }));
  const R = (l, f, cls, tag, codes) => ({ l, v: hist.map(h=>c(h, f(h))), cls, tag, codes });
  const rows = [
    R('Brüt satışlar', h=>h.is.grossSales, 'kid', null, [{from:600,to:602,s:1}]),
    R('Satış indirimleri (−)', h=>-h.is.deductions, 'kid', null, [{from:610,to:612,s:-1}]),
    R('Net satışlar', h=>h.is.netSales, 'sub'),
    R('Satışların maliyeti (−)', h=>-h.is.cogs, 'kid', null, [{from:620,to:623,s:-1}]),
    R('Brüt kâr', h=>h.is.gross, 'sub'),
    R('Araştırma ve geliştirme (−)', h=>-h.is.rnd, 'kid', null, [{from:630,to:630,s:-1}]),
    R('Pazarlama, satış ve dağıtım (−)', h=>-h.is.psd, 'kid', null, [{from:631,to:631,s:-1}]),
    R('Genel yönetim (−)', h=>-h.is.ga, 'kid', null, [{from:632,to:632,s:-1}]),
    R('Faaliyet kârı (FVÖK)', h=>h.is.ebit, 'sub'),
    R('Amortisman ve itfa (+)', h=>h.is.da.total, 'kid'),
    R('FAVÖK', h=>h.is.ebitda, 'sub'),
    R('Geri eklemeler (+)', h=>h.addb, 'kid'),
    ...(st.fxInEbitda ? [R('Net kur farkı (+/−)', h=>h.fxInc, 'kid')] : []),
    R('Normalize FAVÖK', h=>h.ebitdaAdj, 'hero'),
    { l:'Normalize FAVÖK marjı', v: hist.map(h=>h.ebitdaAdj/(h.is.netSales||1)), f:pc, cls:'dim' },
    { spacer:true },
    R('Diğer faaliyet gelirleri', h=>h.is.otherInc, 'kid', null, [{from:640,to:649,s:1}]),
    R('Diğer faaliyet giderleri (−)', h=>-h.is.otherExp, 'kid', null, [{from:650,to:659,s:-1}]),
    R('Finansman giderleri (−)', h=>-h.is.finExp, 'kid', null, [{from:660,to:661,s:-1}]),
    R('Olağandışı gelir ve giderler (net)', h=>h.is.extraInc-h.is.extraExp, 'kid', null, [{from:671,to:671,s:1},{from:679,to:679,s:1},{from:680,to:681,s:-1},{from:689,to:689,s:-1}]),
    R('Vergi öncesi kâr', h=>h.is.ebt, 'sub'),
    R('Vergi karşılığı (−)', h=>-h.is.tax, 'kid', null, [{from:691,to:691,s:-1}]),
    R('Net dönem kârı', h=>h.is.net, 'sum'),
  ];
  const H = hist.find(h=>h.year===cy) || hist[hist.length-1];
  const ct = contribution(H, st.contrib);
  const setCls = (d, v) => up(s => ({ contrib: { ...s.contrib, [d]: v } }));
  const lastU = hist[hist.length-1].usd;
  const recon = hist.map(h => { const ms = st.monthly.filter(m=>m.y===h.year); return ms.length===12 ? { y:h.year, rep: ms.reduce((s,m)=>s+m.rev,0), miz: h.is.netSales, mat: ms.reduce((s,m)=>s+m.mat,0), mat7: h.is.cost7.mat } : null; }).filter(Boolean);
  const unit = mode==='TL' ? 'bin TL' : mode==='USD' ? 'bin USD, yıl ortalaması kuru' : 'net satışlara oran';

  const body = (<>
    <Panel title="Normalize gelir tablosu" sub={unit} right={!print && <Seg small value={mode} onChange={setMode} options={[{v:'TL',l:'TL'},{v:'USD',l:'USD'},{v:'PCT',l:'% ciro'}]} />} flush>
      <FinTable head={head} rows={rows} fmt={fmt} onRowClick={r=>setModalKey(r)} note="Gelir tablosu 6'lı hesaplardan, amortisman 7'li hesapların 'amortisman' alt hesaplarından okunur. Geri eklemeler FAVÖK'ün içine karıştırılmaz, kendi satırında durur." />
    </Panel>
    <div className="two">
      <Panel title="Ciro ve FAVÖK marjı" sub="USD"><RevenueChart data={hist.map(h=>({ l:String(h.year), rev:h.usd.rev, margin:h.kpi.ebitdaM }))} /></Panel>
      <Panel title={`${hist[hist.length-1].year} FAVÖK köprüsü`} sub="milyon USD"><Bridge unit="M USD" steps={[{l:'FVÖK',v:lastU.ebit,total:true},{l:'Amortisman',v:lastU.da},{l:'Geri ekleme',v:lastU.addb},...(st.fxInEbitda?[{l:'Kur farkı',v:lastU.ebitdaAdj-lastU.ebitda-lastU.addb}]:[]),{l:'Normalize FAVÖK',v:lastU.ebitdaAdj,total:true}]} /></Panel>
    </div>
    <Panel title="Maliyet yapısı (7/A)" sub={unit} flush>
      <FinTable head={head} rows={[
        R('Direkt ilk madde ve malzeme (710)', h=>h.is.cost7.mat, 'kid'),
        R('Direkt işçilik (720)', h=>h.is.cost7.lab, 'kid'),
        R('Genel üretim giderleri (730)', h=>h.is.cost7.ovh, 'kid'),
        R('Bunun amortisman kısmı', h=>h.is.da.cogs, 'dim'),
        R('7/A üretim maliyetleri toplamı', h=>h.is.cost7.mat+h.is.cost7.lab+h.is.cost7.ovh, 'sub'),
        R('62x satışların maliyeti', h=>h.is.cogs, 'sub'),
        R('Fark: stok değişimi, ticari mal maliyeti', h=>h.is.cogs-(h.is.cost7.mat+h.is.cost7.lab+h.is.cost7.ovh), 'dim'),
      ]} fmt={fmt}
        note="Projeksiyonda satışların maliyeti bu karmaya göre malzeme, işçilik ve genel üretim olarak bölünür." />
    </Panel>
    {recon.length>0 && <Panel title="Satış raporu mutabakatı" sub="bin TL" flush>
      <FinTable head={recon.map(r=>({l:String(r.y)}))} rows={[
        { l:'Aylık satış raporu cirosu', v: recon.map(r=>r.rep/1000) },
        { l:'Mizan net satışları', v: recon.map(r=>r.miz/1000) },
        { l:'Fark', v: recon.map(r=>(r.rep-r.miz)/1000), cls:'sub' },
        { l:'Fark / mizan', v: recon.map(r=>(r.rep-r.miz)/r.miz), f:pc, cls:'dim' },
        { l:'Rapordaki hammadde', v: recon.map(r=>r.mat/1000) },
        { l:'Mizan 710 direkt malzeme', v: recon.map(r=>r.mat7/1000) },
      ]} note="Değerleme mizanı esas alır. Fark iade ve iskontolar, KDV, grup içi satışlar ya da dönemsellikten kaynaklanabilir; mutabakat yapılmadan rapor rakamı kullanılmamalıdır." />
    </Panel>}
    <Panel title="Katkı seviyeleri" sub={`${H.year}, gider alt hesaplarından`} right={!print && <Seg small value={H.year} onChange={setCy} options={hist.map(h=>({v:h.year,l:String(h.year)}))} />} flush>
      {ct.rows.length ? (<>
        <div className="kband">
          {[['Katkı 1','A − B',ct.k1],['Katkı 2','A − B − C',ct.k2],['Katkı 3','A − B … E',ct.k3],['Katkı 4','A − B … F',ct.k4]].map(([n,f,v])=>(
            <div key={n}><span className="kn">{n}</span><b>{pc(v/(ct.A||1))}</b><span className="kf">{f} · {nf(v/1e6,1)} M ₺</span></div>))}
        </div>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th className="lbl">Gider alt hesabı</th><th className="n">bin TL</th><th className="n">% ciro</th><th>Seviye</th></tr></thead>
          <tbody>{ct.rows.map(r => (
            <tr key={r.d}><td className="lbl"><code>{r.code}</code> {r.name}</td><td className="n">{nf(r.v/1000)}</td><td className="n">{pc(r.v/(ct.A||1))}</td>
              <td><select className={'csel'+(r.auto?'':' set')} value={r.cls} onChange={e=>setCls(r.d, e.target.value)}>{Object.entries(LEVELS).map(([k,n])=><option key={k} value={k}>{k} · {n}</option>)}</select></td></tr>))}</tbody>
          <tfoot><tr><td colSpan="4">A net satışlardır. Sınıflama ad anahtarlarıyla önerilir, her satır değiştirilebilir. 7/A tutarları stok değişimi nedeniyle 62x maliyetten farklı olabilir; seviyeler yönetsel analiz içindir.</td></tr></tfoot>
        </table></div>
      </>) : <Empty title="Alt hesap yok">Katkı seviyeleri için 7'li hesapların alt kırılımlarını içeren detay mizan gerekir. Beyannamede bu kırılım bulunmaz.</Empty>}
    </Panel>
  </>);
  if (print) return <div className="left">{body}</div>;

  const modal = modalKey && modalKey.codes && (
    <div style={{ position:'fixed', inset:0, background:'rgba(17,28,51,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setModalKey(null)}>
      <div style={{ background:'#fff', borderRadius:10, width:'min(960px, 95vw)', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', position:'relative' }} onClick={e=>e.stopPropagation()}>
        <button type="button" onClick={()=>setModalKey(null)} aria-label="Kapat"
          style={{ position:'absolute', top:10, right:12, border:0, background:'none', fontSize:20, lineHeight:1, cursor:'pointer', color:'var(--muted)' }}>×</button>
        <div style={{ padding:'18px 22px' }}>
          <h3 style={{ margin:'0 0 14px' }}>{modalKey.l}</h3>
          {(() => {
            const byCode = {};
            hist.forEach(h => {
              Object.values(h.L.acc).forEach(a => {
                const match = modalKey.codes.find(p => +a.code>=p.from && +a.code<=p.to);
                if (!match) return;
                (byCode[a.code] ||= { name: a.name || accName(a.code), s: match.s, vals: {} }).vals[h.year] = match.s*flow(h.L, a.code);
              });
            });
            const codes = Object.keys(byCode).sort();
            if (!codes.length) return <p className="muted small">Bu yıllarda bu satırı besleyen hesap yok.</p>;
            return (
              <table className="g"><thead><tr className="hd solo"><th className="lbl">Hesap</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                <tbody>
                  {codes.map(code => (
                    <tr key={code}><td className="lbl"><code>{code}</code> {byCode[code].name}</td>
                      {hist.map(h => <td key={h.id} className="n">{fmt(c(h, byCode[code].vals[h.year] ?? 0))}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="sum"><td className="lbl">Toplam</td>
                  {hist.map(h => <td key={h.id} className="n">{fmt(c(h, codes.reduce((s,c2)=>s+(byCode[c2].vals[h.year]??0),0)))}</td>)}
                </tr></tfoot>
              </table>
            );
          })()}
          {modalKey.amort && (() => {
            const SRC = { sub:'alt hesaplar', delta:'birikmiş fark', pct:'%4 tahmin', manual:'elle giriş' };
            const daVal = r => { const net=(+r.db||0)-(+r.cb||0); return Math.abs(net)>0.5 ? net : (+r.dt||0); };
            const byCode = {};
            hist.forEach(h => {
              if (h.is.da.source==='sub' && h.is.da.rows?.length) {
                h.is.da.rows.forEach(r => { (byCode[r.code] ||= { name:r.name, vals:{} }).vals[h.year] = daVal(r); });
              } else {
                (byCode['_est_'+h.year] ||= { name:`Amortisman ve itfa (${SRC[h.is.da.source]||h.is.da.source})`, vals:{} }).vals[h.year] = h.is.da.total;
              }
            });
            const codes = Object.keys(byCode).sort();
            return (
              <div style={{ marginTop:18 }}>
                <h4 style={{ margin:'0 0 8px', fontSize:12.5 }}>Amortisman ve itfa</h4>
                <table className="g"><thead><tr className="hd solo"><th className="lbl">Kaynak</th>{hist.map(h=><th key={h.id} className="n">{h.year}</th>)}</tr></thead>
                  <tbody>
                    {codes.map(code => (
                      <tr key={code}><td className="lbl">{code.startsWith('_est_') ? '' : <code>{code}</code>} {byCode[code].name}</td>
                        {hist.map(h => <td key={h.id} className="n">{(byCode[code].vals[h.year]??0)===0 ? '—' : fmt(c(h, byCode[code].vals[h.year]))}</td>)}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="sum"><td className="lbl">Amortisman toplamı</td>
                    {hist.map(h => <td key={h.id} className="n">{fmt(c(h, h.is.da.total))}</td>)}
                  </tr></tfoot>
                </table>
                <table className="g" style={{ marginTop:10 }}><tbody>
                  <tr className="hero"><td className="lbl">FAVÖK (FVÖK + Amortisman)</td>
                    {hist.map(h => <td key={h.id} className="n">{fmt(c(h, h.is.ebitda))}</td>)}
                  </tr>
                </tbody></table>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  const addAb = () => up(s => ({ addbacks: [...s.addbacks, { id:'a'+Date.now(), name:'Yeni geri ekleme', year: hist[hist.length-1].year, tl:0, ev:false, on:true }] }));
  const setAb = (id, p) => up(s => ({ addbacks: s.addbacks.map(a=>a.id===id?{...a,...p}:a) }));
  return (<>
    <div className="left">{body}</div>
    {modal}
    <Insp>
      <div className="ihead">Uyarlamalar <span>L4</span></div>
      <div className="iblk"><h4>Amortisman (bin TL)</h4>
        {hist.map(h => (
          <div className="irow" key={h.year}>
            <label>{h.year} <Tag c={h.is.da.source==='sub'?'green':h.is.da.source==='manual'?'teal':'gold'}>{({sub:'alt hesap',delta:'birikmiş fark',pct:'%4 tahmin',manual:'elle'})[h.is.da.source]}</Tag></label>
            <input className="ninp w" defaultValue={nf(h.is.da.total/1000)} key={h.year+':'+Math.round(h.is.da.total)}
              onBlur={e=>{ const t=e.target.value.trim(); const v=parseFloat(t.replace(/\./g,'').replace(',','.')); up(s=>({ daOverride: { ...s.daOverride, [h.year]: t==='' ? null : (isFinite(v)? v*1000 : null) } })); }} />
          </div>))}
        {Object.values(st.daOverride||{}).some(v=>v!=null) && <button className="lnk" onClick={()=>up({daOverride:{}})}>Elle girişleri temizle</button>}
      </div>
      <div className="iblk"><h4>Geri eklemeler</h4>
        {st.addbacks.length===0 && <p className="muted small">Tek seferlik, ortak kaynaklı ya da piyasa dışı giderler FAVÖK'e geri eklenebilir. Kanıtsız kalemler güven skorunu düşürür.</p>}
        {st.addbacks.map(a => (
          <div className="ab" key={a.id}>
            <input className="abn" value={a.name} onChange={e=>setAb(a.id,{name:e.target.value})} aria-label="Kalem adı" />
            <div className="abr">
              <select className="csel s" value={a.year} onChange={e=>setAb(a.id,{year:+e.target.value})}>{hist.map(h=><option key={h.year}>{h.year}</option>)}</select>
              <input className="ninp" defaultValue={nf(a.tl/1000)} key={a.id+a.tl} onBlur={e=>{ const v=parseFloat(e.target.value.replace(/\./g,'').replace(',','.')); setAb(a.id,{tl: isFinite(v)? v*1000 : 0}); }} aria-label="Tutar bin TL" />
              <span className="u">bin ₺</span>
            </div>
            <div className="abr">
              <label className="inl"><input type="checkbox" checked={a.on} onChange={e=>setAb(a.id,{on:e.target.checked})}/> uygula</label>
              <label className="inl"><input type="checkbox" checked={a.ev} onChange={e=>setAb(a.id,{ev:e.target.checked})}/> kanıtlı</label>
              <button className="lnk" onClick={()=>up(s=>({addbacks:s.addbacks.filter(x=>x.id!==a.id)}))}>Sil</button>
            </div>
          </div>))}
        <button className="ibtn ghost" onClick={addAb}>Geri ekleme ekle</button>
      </div>
      <div className="iblk"><h4>Normalizasyon</h4>
        <Toggle checked={st.fxInEbitda} onChange={v=>up({fxInEbitda:v})} title="Net kur farkını FAVÖK'e kat" desc="İhracatçı firmalarda kur farkı faaliyetle ilgili olabilir. Varsayılan olarak hariç tutulur." />
        {hist.filter(h=>h.months<12).map(h => (
          <NumField key={h.id} label={`${h.year} yıllıklandırma`} value={h.annualize} step={0.05} digits={2} unit="x" min={1} max={12} onChange={v=>up(s=>({annualize:{...s.annualize,[h.id]:v}}))} />))}
      </div>
      <div className="inote"><b>Taban:</b> üç yöntem de bu normalize FAVÖK'ten beslenir. Taban yanlışsa üç sonuç birden yanlış çıkar ve birbirini doğruluyor gibi görünür.</div>
    </Insp>
  </>);
}
