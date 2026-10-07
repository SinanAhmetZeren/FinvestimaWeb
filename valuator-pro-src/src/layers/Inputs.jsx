import { useState, useRef, useMemo } from 'react';
import { Panel, Seg, Toggle, Stat, Tag, Empty, nf, par } from '../ui.jsx';
import { lineOf, accName, ACCOUNTS } from '../engine/accounts.js';
import { MiniBars } from '../charts.jsx';

export function L1Inputs({ st, up, setSt, onFiles, loadSample, reset, busy, rawLedgers, ledgers, fxTable, hist, setLayer }){
  const [over, setOver] = useState(false);
  const inp = useRef(), proj = useRef();
  const years = [...new Set([...rawLedgers.map(l=>l.year), ...st.monthly.map(m=>m.y)])].filter(Boolean).sort();
  const fxYears = years.length ? years : Object.keys(fxTable).map(Number).filter(y=>y>=2023);
  const monthlyByYear = useMemo(() => { const o={}; st.monthly.forEach(m => { (o[m.y] ||= { n:0, rev:0 }); o[m.y].n++; o[m.y].rev += m.rev; }); return o; }, [st.monthly]);

  const drop = e => { e.preventDefault(); setOver(false); const f=[...(e.dataTransfer?.files||[])]; if (f.length) onFiles(f); };
  const setYear = (id, y, pdf) => up(s => pdf ? { pdfDocs: s.pdfDocs.map(d=>d.id===id?{...d, year:+y||null}:d) } : { ledgers: s.ledgers.map(l=>l.id===id?{...l, year:+y||null}:l) });
  const remove = (id, pdf) => up(s => pdf ? { pdfDocs: s.pdfDocs.filter(d=>d.id!==id) } : { ledgers: s.ledgers.filter(l=>l.id!==id) });
  const setFx = (y, k, v) => up(s => ({ fx: { ...s.fx, [y]: { ...(s.fx[y]||{}), [k]: v } } }));
  const used = new Set(ledgers.map(l=>l.id));

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(st)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (st.company||'proje').replace(/\s+/g,'_')+'.valuator.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  };
  const importProject = async f => { try { const s = JSON.parse(await f.text()); setSt(x => ({ ...x, ...s })); setLayer('L3'); } catch { alert('Proje dosyası okunamadı.'); } };

  return (<>
    <div className="left">
      <Panel title="Kaynak dosyalar" sub="Excel mizan, beyanname PDF'i, aylık satış raporu ve kur tablosu">
        <div className={'drop'+(over?' over':'')+(busy?' busy':'')} onDragOver={e=>{e.preventDefault(); setOver(true);}} onDragLeave={()=>setOver(false)} onDrop={drop}
             onClick={()=>inp.current?.click()} role="button" tabIndex={0} onKeyDown={e=>{ if(e.key==='Enter'||e.key===' ') inp.current?.click(); }}>
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 23V7m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 21v5a2 2 0 002 2h18a2 2 0 002-2v-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <b>{busy ? 'Dosyalar okunuyor…' : 'Dosyaları buraya bırakın ya da seçmek için tıklayın'}</b>
          <span>Birden çok yıl ve birden çok sayfa içeren çalışma kitapları tek seferde okunur. Her sayfanın türü kendiliğinden tanınır.</span>
          <input ref={inp} type="file" multiple accept=".xlsx,.xls,.xlsm,.csv,.ods,.pdf" hidden onChange={e=>{ onFiles([...e.target.files]); e.target.value=''; }} />
        </div>
        <div className="droprow">
          <button className="btn" onClick={loadSample}>Örnek vakayı yükle</button>
          <span className="muted">Üç yıllık mizan ve aylık satış raporuyla motoru deneyin.</span>
        </div>
      </Panel>

      <Panel title="Yüklenen kaynaklar" sub={rawLedgers.length ? `${rawLedgers.length} dönem` : ''} flush>
        {(!st.ledgers.length && !st.pdfDocs.length) ? <Empty title="Henüz dosya yok">Değerleme için en az bir yıl sonu mizanı ya da kurumlar vergisi beyannamesi gerekir. Üç yıl önerilir.</Empty> : (
          <div className="scroll"><table className="g">
            <thead><tr className="hd solo"><th className="lbl">Kaynak</th><th>Tür</th><th className="c">Yıl</th><th className="c">Dönem</th><th className="n">Hesap</th><th>Kontrol</th><th></th></tr></thead>
            <tbody>
              {st.ledgers.map(L => {
                const ok = !L.totals.fileDt || Math.abs(L.totals.fileDt-L.totals.fileCt) < 1;
                return (<tr key={L.id} className={used.has(L.id)?'':'dim'}>
                  <td className="lbl"><span className="fname">{L.fileName}</span>{L.company && <span className="muted small"> {L.company}</span>}</td>
                  <td><Tag c="teal">Mizan</Tag></td>
                  <td className="c"><input className="yinp" value={L.year||''} onChange={e=>setYear(L.id, e.target.value)} aria-label="Yıl" /></td>
                  <td className="c">{L.months===12 ? '12 ay' : <Tag c="gold">{L.months} ay</Tag>}</td>
                  <td className="n">{Object.keys(L.acc).length}</td>
                  <td>{ok ? <Stat kind="ok">Borç = alacak</Stat> : <Stat kind="er">Toplamlar eşit değil</Stat>} {L.closed ? <Tag>kapanış sonrası</Tag> : <Tag c="gold">kapanış öncesi</Tag>}</td>
                  <td><button className="lnk" onClick={()=>remove(L.id)}>Kaldır</button></td>
                </tr>);
              })}
              {st.pdfDocs.map(d => {
                const un = d.items.filter(i=>i.kind==='unmapped' && !i.excluded).length;
                return (<tr key={d.id}>
                  <td className="lbl"><span className="fname">{d.fileName}</span>{d.twoCols && <label className="inl"><input type="checkbox" checked={d.usePrev} onChange={e=>up(s=>({pdfDocs:s.pdfDocs.map(x=>x.id===d.id?{...x,usePrev:e.target.checked}:x)}))}/> önceki dönem sütununu da kullan</label>}</td>
                  <td><Tag c="plum">Beyanname</Tag></td>
                  <td className="c"><input className="yinp" value={d.year||''} onChange={e=>setYear(d.id, e.target.value, true)} aria-label="Yıl" /></td>
                  <td className="c">12 ay</td>
                  <td className="n">{d.items.filter(i=>i.code).length}</td>
                  <td>{un ? <button className="lnk wn" onClick={()=>setLayer('L2')}>{un} kalem eşleme bekliyor</button> : <Stat kind="ok">Tüm kalemler eşlendi</Stat>}</td>
                  <td><button className="lnk" onClick={()=>remove(d.id, true)}>Kaldır</button></td>
                </tr>);
              })}
            </tbody>
            {ledgers.length < rawLedgers.length && <tfoot><tr><td colSpan="7">Aynı yıl için birden fazla kaynak var. Soluk satırlar kullanılmıyor; mizan beyannameye göre önceliklidir.</td></tr></tfoot>}
          </table></div>
        )}
      </Panel>

      {st.monthly.length>0 && (
        <Panel title="Aylık satış raporu" sub={`${st.monthly.length} ay`} right={<button className="lnk" onClick={()=>up({monthly:[]})}>Temizle</button>}>
          <MiniBars data={st.monthly.map(m=>({ l: m.m===1 ? String(m.y) : '', v:m.rev, cur: hist.length && m.y>hist[hist.length-1].year }))} />
          <div className="chips">{Object.entries(monthlyByYear).map(([y,o]) => <span key={y} className="chip"><b>{y}</b> {o.n} ay, {nf(o.rev/1e6,1)} M ₺</span>)}</div>
          <p className="muted small">Aylık rapor değerlemenin esası değildir; mizanla mutabakat ve cari yılın yıllıklandırılmış ilk yıl tahmini için kullanılır.</p>
        </Panel>
      )}

      <Panel title="Kur tablosu" sub="USD/TRY; akış kalemleri yıl ortalaması, bilanço kalemleri yıl sonu kuruyla çevrilir" flush>
        <div className="scroll"><table className="g">
          <thead><tr className="hd solo"><th className="lbl">Yıl</th><th className="n">Yıl ortalaması</th><th className="n">Yıl sonu</th><th>Not</th></tr></thead>
          <tbody>{fxYears.map(y => { const f = fxTable[y]||{}; return (
            <tr key={y}><td className="lbl">{y}</td>
              <td className="n"><input className="ninp" defaultValue={f.avg ? nf(f.avg,4) : ''} key={'a'+y+f.avg} onBlur={e=>{ const v=parseFloat(e.target.value.replace(/\./g,'').replace(',','.')); if(v>0) setFx(y,'avg',v); }} /></td>
              <td className="n"><input className="ninp" defaultValue={f.end ? nf(f.end,4) : ''} key={'e'+y+f.end} onBlur={e=>{ const v=parseFloat(e.target.value.replace(/\./g,'').replace(',','.')); if(v>0) setFx(y,'end',v); }} /></td>
              <td>{st.fx[y] ? <Tag c="teal">kullanıcı</Tag> : f.approx ? <Tag c="gold">yaklaşık, kontrol edin</Tag> : f.partial ? <Tag c="gold">yıl içi</Tag> : f.avg ? <Tag>varsayılan</Tag> : <Tag c="red">kur girin</Tag>}</td>
            </tr>); })}</tbody>
        </table></div>
      </Panel>

      {st.log.length>0 && <Panel title="İşlem kaydı"><ol className="log">{st.log.map((l,i)=><li key={i}><time>{l.t}</time>{l.msg}</li>)}</ol></Panel>}
    </div>

    <aside className="insp">
      <div className="ihead">Uyarlamalar <span>L1</span></div>
      <div className="iblk"><h4>Tanınan girdiler</h4>
        <dl className="defs">
          <dt>Mizan (Excel)</dt><dd>Hesap kodu, borç ve alacak toplamı ile bakiye kolonları. 3'lü kod yoksa alt hesaplar toplanır. Alt hesaplar amortisman ve katkı analizini besler.</dd>
          <dt>Beyanname (PDF)</dt><dd>Kurumlar vergisi beyannamesinin ayrıntılı bilanço ve gelir tablosu ekleri. Metin katmanı olmalı; kalemler hesap planına eşlenir.</dd>
          <dt>Aylık satış raporu</dt><dd>Yıl, ay ve ciro kolonları olan sayfa. Hammadde ve gider kolonları varsa okunur.</dd>
          <dt>Kur tablosu</dt><dd>Yıl, ay ve USD/TRY kolonları; dönem sonu özeti varsa yıl sonu kuru oradan alınır.</dd>
        </dl>
      </div>
      <div className="iblk"><h4>Proje</h4>
        <button className="ibtn ghost" onClick={exportProject} disabled={!st.ledgers.length && !st.pdfDocs.length}>Projeyi dosyaya kaydet</button>
        <button className="ibtn ghost" onClick={()=>proj.current?.click()}>Kayıtlı projeyi aç</button>
        <input ref={proj} type="file" accept=".json" hidden onChange={e=>{ if(e.target.files[0]) importProject(e.target.files[0]); e.target.value=''; }} />
        <button className="ibtn warnb" onClick={reset}>Tümünü temizle</button>
      </div>
      <div className="inote">Proje bu tarayıcıda otomatik saklanır. Başka bir bilgisayarda devam etmek için dosyaya kaydedin.</div>
    </aside>
  </>);
}

export function L2Mapping({ st, up, ledgers, hist }){
  const [yi, setYi] = useState(Math.max(0, ledgers.length-1));
  const [hideZero, setHideZero] = useState(true);
  const [onlyUn, setOnlyUn] = useState(false);
  const [open, setOpen] = useState({});
  const [doc, setDoc] = useState(st.pdfDocs[0]?.id);
  if (!ledgers.length && !st.pdfDocs.length) return <div className="left"><Empty title="Eşlenecek mizan yok">Önce L1'de dosya yükleyin.</Empty></div>;
  const L = ledgers[Math.min(yi, ledgers.length-1)];
  const h = hist.find(x=>x.id===L?.id);
  const rows = L ? Object.values(L.acc).sort((a,b)=>a.code.localeCompare(b.code)).map(a => ({ ...a, map: lineOf(a.code), net: a.db - a.cb })) : [];
  const unmapped = rows.filter(r => !r.map && Math.abs(r.net)>0.5);
  const classes = [['1','Dönen varlıklar'],['2','Duran varlıklar'],['3','Kısa vadeli yabancı kaynaklar'],['4','Uzun vadeli yabancı kaynaklar'],['5','Özkaynaklar'],['6','Gelir tablosu'],['7','Maliyet hesapları'],['8','Serbest'],['9','Nazım']];
  const D = st.pdfDocs.find(d=>d.id===doc) || st.pdfDocs[0];
  const setItem = (i, patch) => up(s => ({ pdfDocs: s.pdfDocs.map(d => d.id!==D.id ? d : { ...d, items: d.items.map((it,j)=> j!==i ? it : { ...it, ...patch, kind: (patch.code ?? it.code) ? 'mapped' : it.kind==='subtotal' ? 'subtotal' : 'unmapped' }) }) }));
  const swapCols = () => up(s => ({ pdfDocs: s.pdfDocs.map(d => d.id!==D.id ? d : { ...d, items: d.items.map(it => it.prev==null ? it : { ...it, cur: it.prev, prev: it.cur }) }) }));

  return (<>
    <div className="left">
      {L && <Panel title="Mizan ızgarası" sub={`${L.fileName}, ${Object.keys(L.acc).length} ana hesap`} flush
        right={<Seg small value={yi} onChange={setYi} options={ledgers.map((l,i)=>({ v:i, l:String(l.year) }))} />}>
        <div className="scroll tall"><table className="g">
          <thead><tr className="hd solo"><th className="lbl">Hesap</th><th>Tabloda karşılığı</th><th className="n">Borç toplamı</th><th className="n">Alacak toplamı</th><th className="n">Net bakiye</th></tr></thead>
          <tbody>
            {classes.map(([c,n]) => {
              const rs = rows.filter(r=>r.code[0]===c && (!hideZero || Math.abs(r.net)>0.5 || c==='6' || c==='7') && (!onlyUn || (!r.map && Math.abs(r.net)>0.5)));
              if (!rs.length) return null;
              const isOpen = open[c] ?? (c!=='9' && c!=='8');
              const tot = rs.reduce((s,r)=>s+r.net,0);
              return [
                <tr key={c} className={'grp'+(isOpen?' open':'')} onClick={()=>setOpen(o=>({...o,[c]:!isOpen}))}><td className="lbl"><span className="caret">▸</span> {c} · {n}</td><td>{rs.length} hesap</td><td></td><td></td><td className="n">{par(tot/1000)}</td></tr>,
                ...(isOpen ? rs.map(r => (
                  <tr key={r.code} className="kid">
                    <td className="lbl"><code>{r.code}</code> {r.name || accName(r.code)}</td>
                    <td>{r.map ? <span className="muted small">{r.map.line.n}</span> : Math.abs(r.net)>0.5 ? <Tag c="red">eşlenmedi</Tag> : '—'}</td>
                    <td className="n">{nf(r.dt/1000)}</td><td className="n">{nf(r.ct/1000)}</td><td className={'n'+(r.net<0?' neg':'')}>{par(r.net/1000)}</td>
                  </tr>)) : [])
              ];
            })}
          </tbody>
          <tfoot><tr><td colSpan="5">Tutarlar bin TL. Net bakiye borç eksi alacak. Gelir tablosu hesapları kapanış kaydı sonrası sıfır bakiye verir; motor bu durumda hareket toplamını kullanır.</td></tr></tfoot>
        </table></div>
      </Panel>}

      {D && <Panel title="Beyanname kalem eşleme" sub={D.fileName} flush
        right={<>{st.pdfDocs.length>1 && <select className="csel" value={D.id} onChange={e=>setDoc(e.target.value)}>{st.pdfDocs.map(d=><option key={d.id} value={d.id}>{d.fileName}</option>)}</select>}
          {D.twoCols && <button className="lnk" onClick={swapCols}>Sütun sırasını değiştir</button>}</>}>
        <div className="scroll tall"><table className="g">
          <thead><tr className="hd solo"><th className="c">Sf.</th><th className="lbl">Beyannamedeki kalem</th>{D.twoCols && <th className="n">Önceki dönem</th>}<th className="n">Cari dönem</th><th>Hesap kodu</th><th></th></tr></thead>
          <tbody>{D.items.map((it,i) => (
            <tr key={i} className={it.kind==='subtotal' ? 'sub' : it.excluded ? 'dim' : ''}>
              <td className="c muted">{it.page}</td>
              <td className="lbl">{it.label}</td>
              {D.twoCols && <td className="n">{nf(it.prev)}</td>}
              <td className="n">{nf(it.cur)}</td>
              <td>{it.kind==='subtotal' ? <span className="muted small">ara toplam</span> :
                <select className={'csel'+(it.code?'':' unset')} value={it.code||''} onChange={e=>setItem(i,{ code: e.target.value ? +e.target.value : null })}>
                  <option value="">Seçin…</option>
                  {Object.keys(ACCOUNTS).filter(c => !it.cls || c[0]===String(it.cls)).map(c => <option key={c} value={c}>{c} {ACCOUNTS[c]}</option>)}
                </select>}</td>
              <td>{it.kind!=='subtotal' && <button className="lnk" onClick={()=>setItem(i,{ excluded: !it.excluded })}>{it.excluded?'Dahil et':'Hariç tut'}</button>}</td>
            </tr>))}</tbody>
        </table></div>
      </Panel>}
    </div>

    <aside className="insp">
      <div className="ihead">Uyarlamalar <span>L2</span></div>
      {L && h && <div className="iblk"><h4>{L.year} kontrolleri</h4>
        <div className="checks">
          <div>{!L.totals.fileDt || Math.abs(L.totals.fileDt-L.totals.fileCt)<1 ? <Stat kind="ok">Mizan borç ve alacak toplamı eşit</Stat> : <Stat kind="er">Mizan toplamları eşit değil</Stat>}</div>
          <div>{Math.abs(h.bs.check) < Math.max(1,h.bs.TA*0.0005) ? <Stat kind="ok">Bilanço denk</Stat> : <Stat kind="er">Bilanço farkı {nf(h.bs.check/1000)} bin ₺</Stat>}</div>
          <div>{unmapped.length ? <Stat kind="wn">{unmapped.length} hesap tabloya bağlanmadı</Stat> : <Stat kind="ok">Bakiyeli tüm hesaplar eşlendi</Stat>}</div>
          <div>{L.closed ? <Stat kind="ok">Kapanış sonrası mizan</Stat> : <Stat kind="wn">Kapanış öncesi, dönem kârı hesaplandı</Stat>}</div>
          <div>{h.is.da.source==='sub' ? <Stat kind="ok">Amortisman alt hesaplardan okundu</Stat> : <Stat kind="wn">Amortisman tahmini</Stat>}</div>
          <div>{L.sub.length ? <Stat kind="ok">{L.sub.length} gider alt hesabı</Stat> : <Stat kind="wn">Alt hesap yok, katkı analizi sınırlı</Stat>}</div>
        </div>
      </div>}
      <div className="iblk"><h4>Görünüm</h4>
        <Toggle checked={hideZero} onChange={setHideZero} title="Sıfır bakiyeleri gizle" desc="Gelir tablosu ve maliyet hesapları her zaman görünür." />
        <Toggle checked={onlyUn} onChange={setOnlyUn} title="Yalnız eşlenmeyenler" desc="Bilançoya bağlanmamış bakiyeli hesapları filtreler." />
      </div>
      <div className="inote">Eşleme Tekdüzen Hesap Planı'na göre yapılır. Şirkete özel kod açılmışsa bakiye eşlenmeyenler listesinde görünür ve bilanço farkı olarak raporlanır.</div>
    </aside>
  </>);
}
