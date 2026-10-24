import { useState, useRef, useMemo } from 'react';
import { Panel, Seg, Toggle, Stat, Tag, Empty, nf, par, Insp } from '../ui.jsx';
import { lineOf, accName, ACCOUNTS } from '../engine/accounts.js';
import { MiniBars } from '../charts.jsx';
import { PdfUpload } from './PdfUpload.jsx';
import { useEditTrialBalanceAccountMutation, useGetMyValuationTasksQuery, useRemoveYearMutation } from '../../slices/ValuatorProSlice.js';

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

const POLL_COLORS = { Starting: 'var(--gold)', Pending: 'var(--faint)', Processing: 'var(--teal)', Completed: 'var(--green)', Failed: 'var(--red)' };
const POLL_LABELS = { Starting: 'Gönderiliyor', Pending: 'Sırada', Processing: 'İşleniyor', Completed: 'Tamamlandı', Failed: 'Başarısız' };

export function L0Tasks({ st, selectTask }) {
  const { data: tasks, error, isLoading } = useGetMyValuationTasksQuery();

  if (isLoading) return <div className="left"><Empty title="Yükleniyor…">İşleriniz getiriliyor.</Empty></div>;
  if (error) return <div className="left"><Empty title="Bir şeyler ters gitti">{error.data || error.message || 'Hata'}</Empty></div>;
  if (!tasks?.length) return <div className="left"><Empty title="Size atanmış bir değerleme yok">Bir değerleme başlatmak için lütfen bizimle iletişime geçin.</Empty></div>;

  return (
    <div className="left">
      <Panel title="Değerlemeleriniz" sub="Devam etmek istediğiniz işi seçin">
        <div className="taskgrid">
          {tasks.map(t => (
            <button key={t.id} type="button" style={{position:'relative'}} className={'taskcard' + (st.valuationTaskId === t.id ? ' sel' : '')} onClick={() => selectTask(t)}>
              <span className={'tag'+(t.accountingStandard==='UsGaap'?' teal':'')} style={{position:'absolute', top:10, right:10}}>{t.accountingStandard==='UsGaap'?'GAAP':'TDH'}</span>
              <span className="tc-co">{t.companyName}</span>
              <span className="tc-ti">{t.title}</span>
              <span className="tc-go">{st.valuationTaskId === t.id ? 'Devam et' : 'Seç'} →</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function L1Inputs({ st, up, setSt, onFiles, loadSample, reset, busy, rawLedgers, ledgers, fxTable, hist, setLayer, uploadPoll, log }) {
  const [removeYear] = useRemoveYearMutation();
  const [over, setOver] = useState(false);
  const [fileKind, setFileKind] = useState(null); // 'excel' | 'pdf'
  const inp = useRef(), proj = useRef();
  const years = [...new Set([...rawLedgers.map(l => l.year), ...st.monthly.map(m => m.y)])].filter(Boolean).sort();
  const fxYears = [...new Set([...years, ...Object.keys(fxTable).map(Number)])].sort((a, b) => a - b);
  const monthlyByYear = useMemo(() => { const o = {}; st.monthly.forEach(m => { (o[m.y] ||= { n: 0, rev: 0 }); o[m.y].n++; o[m.y].rev += m.rev; }); return o; }, [st.monthly]);

  const drop = e => { e.preventDefault(); setOver(false); const f = [...(e.dataTransfer?.files || [])]; if (f.length) onFiles(f); };
  const setYear = (id, y, pdf) => up(s => pdf ? { pdfDocs: s.pdfDocs.map(d => d.id === id ? { ...d, year: +y || null } : d) } : { ledgers: s.ledgers.map(l => l.id === id ? { ...l, year: +y || null } : l) });
  const remove = (id, pdf) => {
    if (!pdf && st.valuationTaskId) {
      const L = st.ledgers.find(l => l.id === id);
      if (L?.year) removeYear({ valuationTaskId: st.valuationTaskId, year: L.year }).catch(console.error);
    }
    up(s => pdf ? { pdfDocs: s.pdfDocs.filter(d => d.id !== id) } : { ledgers: s.ledgers.filter(l => l.id !== id) });
  };
  const setFx = (y, k, v) => up(s => ({ fx: { ...s.fx, [y]: { ...(s.fx[y] || {}), [k]: v } } }));
  const used = new Set(ledgers.map(l => l.id));

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(st)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (st.company || 'proje').replace(/\s+/g, '_') + '.valuator.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importProject = async f => { try { const s = JSON.parse(await f.text()); setSt(x => ({ ...x, ...s })); setLayer('L3'); } catch { alert('Proje dosyası okunamadı.'); } };

  return (<>
    <div className="left">
      <Panel title="Kaynak dosyalar" sub="Excel mizan, beyanname PDF'i, aylık satış raporu ve kur tablosu">
        <span style={{ display: 'block', textAlign: 'left', fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Dosya tipini seçin</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, width: '65%', margin: '0 auto 12px' }}>
          <button type="button" className={'codedepth-btn' + (fileKind === 'excel' ? ' sel' : '')} onClick={() => setFileKind('excel')}>Excel</button>
          <button type="button" className={'codedepth-btn' + (fileKind === 'pdf' ? ' sel' : '')} onClick={() => setFileKind('pdf')}>PDF</button>
        </div>

        {fileKind === 'excel' && <>
          <div className="codedepth">
            <span style={{ display: 'block', textAlign: 'left', fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Yüklediğiniz dosya mizan içeriyorsa, hangi kod derinliğine kadar kullanılsın?</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '65%', margin: '0 auto' }}>
              {[[3, 'Sadece 3 haneli kodlar', '(örn. 100)'], [5, '5 haneye kadar kodlar', '(örn. 100 01)'], [7, '7 haneye kadar kodlar', '(örn. 100 01 01)'], [0, 'Tamamını kullan', '']].map(([v, l, ex]) => (
                <button key={v} type="button" className={'codedepth-btn' + (st.maxCodeDigits === v ? ' sel' : '')} onClick={() => up({ maxCodeDigits: v })}>
                  {l}{ex && <span style={{ fontWeight: 400 }}> {ex}</span>}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 13, width: '70%', marginTop: 8, marginLeft: '17.5%', marginRight: '12.5%', textAlign: 'left' }}>Hariç tutulan kodlar sistem tarafından ayıklanır ve veri işleme için 3. taraflara gönderilmez. Bilgiler seçiminiz doğrultusunda önce anonimleştirilir sonra veritabanına yazılır.</p>
          </div>
          <div className={'drop' + (over ? ' over' : '') + (busy ? ' busy' : '') + (st.maxCodeDigits == null ? ' disabled' : '')}
            style={{
              width: '65%', margin: '0 auto',
              ...(uploadPoll ? {
                borderColor: POLL_COLORS[uploadPoll.status] || 'var(--faint)', borderStyle: 'solid',
                background: 'color-mix(in srgb, ' + (POLL_COLORS[uploadPoll.status] || 'var(--faint)') + ' 8%, #F8FAFE)',
                animation: (uploadPoll.status === 'Starting' || uploadPoll.status === 'Pending' || uploadPoll.status === 'Processing') ? 'box-pulse 1.2s ease infinite' : undefined,
              } : {}),
            }}
            onDragOver={e => { e.preventDefault(); if (st.maxCodeDigits != null) setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={e => { if (st.maxCodeDigits != null) drop(e); else e.preventDefault(); }}
            onClick={() => { if (st.maxCodeDigits != null) inp.current?.click(); }} role="button" tabIndex={0}
            onKeyDown={e => { if (st.maxCodeDigits != null && (e.key === 'Enter' || e.key === ' ')) inp.current?.click(); }}>
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 23V7m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 21v5a2 2 0 002 2h18a2 2 0 002-2v-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <b style={uploadPoll ? { color: POLL_COLORS[uploadPoll.status] || 'var(--faint)' } : undefined}>
              {uploadPoll ? (POLL_LABELS[uploadPoll.status] || uploadPoll.status) : busy ? 'Dosyalar okunuyor…' : st.maxCodeDigits == null ? 'Önce yukarıdan bir kod derinliği seçin' : 'Dosyaları buraya bırakın ya da seçmek için tıklayın'}
            </b>
            <input ref={inp} type="file" multiple disabled={st.maxCodeDigits == null} accept=".xlsx,.xls,.xlsm,.csv,.ods" hidden onChange={e => { onFiles([...e.target.files]); e.target.value = ''; }} />
          </div>
        </>}

        {fileKind === 'pdf' && <PdfUpload up={up} log={log} valuationTaskId={st.valuationTaskId} />}
      </Panel>

      <Panel title="Yüklenen kaynaklar" sub={rawLedgers.length ? `${rawLedgers.length} dönem` : ''} flush>
        {(!st.ledgers.length && !st.pdfDocs.length) ? <Empty title="Henüz dosya yok">Değerleme için en az bir yıl sonu mizanı ya da kurumlar vergisi beyannamesi gerekir. Üç yıl önerilir.</Empty> : (
          <div className="scroll"><table className="g">
            <thead><tr className="hd solo"><th className="lbl">Kaynak</th><th>Tür</th><th className="c">Yıl</th><th className="c">Dönem</th><th className="n">Hesap</th><th>Kontrol</th><th></th></tr></thead>
            <tbody>
              {st.ledgers.map(L => {
                const ok = !L.totals.fileDt || Math.abs(L.totals.fileDt - L.totals.fileCt) < 1;
                return (<tr key={L.id} className={used.has(L.id) ? '' : 'dim'}>
                  <td className="lbl"><span className="fname">{L.fileName}</span>{L.company && <span className="muted small"> {L.company}</span>}</td>
                  <td><Tag c="teal">Mizan</Tag></td>
                  <td className="c">{L.year || ''}</td>
                  <td className="c">{L.months === 12 ? '12 ay' : <Tag c="gold">{L.months} ay</Tag>}</td>
                  <td className="n">{Object.keys(L.acc).length}</td>
                  <td>{ok ? <Stat kind="ok">Borç = alacak</Stat> : <Stat kind="er">Toplamlar eşit değil</Stat>} {L.closed ? <Tag>kapanış sonrası</Tag> : <Tag c="gold">kapanış öncesi</Tag>}</td>
                  <td><button className="lnk" onClick={() => remove(L.id)}>Kaldır</button></td>
                </tr>);
              })}
              {st.pdfDocs.map(d => {
                const un = d.items.filter(i => i.kind === 'unmapped' && !i.excluded).length;
                return (<tr key={d.id}>
                  <td className="lbl"><span className="fname">{d.fileName}</span>{d.twoCols && <label className="inl"><input type="checkbox" checked={d.usePrev} onChange={e => up(s => ({ pdfDocs: s.pdfDocs.map(x => x.id === d.id ? { ...x, usePrev: e.target.checked } : x) }))} /> önceki dönem sütununu da kullan</label>}</td>
                  <td><Tag c="plum">Beyanname</Tag></td>
                  <td className="c"><input className="yinp" value={d.year || ''} onChange={e => setYear(d.id, e.target.value, true)} aria-label="Yıl" /></td>
                  <td className="c">12 ay</td>
                  <td className="n">{d.items.filter(i => i.code).length}</td>
                  <td>{un ? <button className="lnk wn" onClick={() => setLayer('L2')}>{un} kalem eşleme bekliyor</button> : <Stat kind="ok">Tüm kalemler eşlendi</Stat>}</td>
                  <td><button className="lnk" onClick={() => remove(d.id, true)}>Kaldır</button></td>
                </tr>);
              })}
            </tbody>
            {ledgers.length < rawLedgers.length && <tfoot><tr><td colSpan="7">Aynı yıl için birden fazla kaynak var. Soluk satırlar kullanılmıyor; mizan beyannameye göre önceliklidir.</td></tr></tfoot>}
          </table></div>
        )}
      </Panel>

      {st.monthly.length > 0 && (
        <Panel title="Aylık satış raporu" sub={`${st.monthly.length} ay`} right={<button className="lnk" onClick={() => up({ monthly: [] })}>Temizle</button>}>
          <MiniBars data={st.monthly.map(m => ({ l: m.m === 1 ? String(m.y) : '', v: m.rev, cur: hist.length && m.y > hist[hist.length - 1].year }))} />
          <div className="chips">{Object.entries(monthlyByYear).map(([y, o]) => <span key={y} className="chip"><b>{y}</b> {o.n} ay, {nf(o.rev / 1e6, 1)} M ₺</span>)}</div>
          <p className="muted small">Aylık rapor değerlemenin esası değildir; mizanla mutabakat ve cari yılın yıllıklandırılmış ilk yıl tahmini için kullanılır.</p>
        </Panel>
      )}

      <Panel title="Kur tablosu" sub="USD/TRY; akış kalemleri yıl ortalaması, bilanço kalemleri yıl sonu kuruyla çevrilir" flush>
        <div><table className="g" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '2%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '2%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '2%' }} />
          </colgroup>
          <thead><tr className="hd solo"><th></th><th className="lbl" style={{ position: 'static', boxShadow: 'none' }}>Yıl</th><th className="n">Yıl ortalaması</th><th className="n">Yıl sonu</th><th>Not</th><th></th><th className="lbl" style={{ position: 'static', boxShadow: 'none' }}>Yıl</th><th className="n">Yıl ortalaması</th><th className="n">Yıl sonu</th><th>Not</th><th></th></tr></thead>
          <tbody>{(() => { const rows = []; for (let i = 0; i < fxYears.length; i += 2) rows.push([fxYears[i], fxYears[i + 1]]); return rows; })().map(([y1, y2]) => {
            const cell = (y) => {
              if (y == null) return <><td className="lbl" style={{ position: 'static', boxShadow: 'none' }}></td><td className="n"></td><td className="n"></td><td></td></>; const f = fxTable[y] || {}; return <>
                <td className="lbl" style={{ position: 'static', boxShadow: 'none' }}>{y}</td>
                <td className="n"><input className="ninp" style={{ width: '80px', marginLeft: 'auto', display: 'block' }} defaultValue={f.avg != null ? nf(f.avg, 4) : ''} key={'a' + y + f.avg} onBlur={e => { const v = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')); if (v > 0 && v !== f.avg) setFx(y, 'avg', v); }} /></td>
                <td className="n"><input className="ninp" style={{ width: '80px', marginLeft: 'auto', display: 'block' }} defaultValue={f.end != null ? nf(f.end, 4) : ''} key={'e' + y + f.end} onBlur={e => { const v = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')); if (v > 0 && v !== f.end) setFx(y, 'end', v); }} /></td>
                <td>{st.fx[y] ? <Tag c="teal">kullanıcı</Tag> : f.source === 'error' ? <Tag c="red">kur çekilemedi</Tag> : f.approx ? <Tag c="gold">yaklaşık, kontrol edin</Tag> : f.source === 'tcmb' ? (f.partial ? <Tag c="gold">TCMB, yıl içi</Tag> : <Tag c="green">TCMB</Tag>) : f.partial ? <Tag c="gold">yıl içi</Tag> : f.avg ? <Tag>varsayılan</Tag> : <Tag c="red">kur girin</Tag>}</td>
              </>;
            };
            return <tr key={y1}><td></td>{cell(y1)}<td style={{ borderRight: '1px solid var(--line2)' }}></td>{cell(y2)}<td></td></tr>;
          })}</tbody>
        </table></div>
      </Panel>

      {st.log.length > 0 && <Panel title="İşlem kaydı"><ol className="log">{st.log.map((l, i) => <li key={i}><time>{l.t}</time>{l.msg}</li>)}</ol></Panel>}
    </div>

    <Insp>
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
        {/* <button className="ibtn ghost" onClick={exportProject} disabled={!st.ledgers.length && !st.pdfDocs.length}>Projeyi dosyaya kaydet</button>
        <button className="ibtn ghost" onClick={() => proj.current?.click()}>Kayıtlı projeyi aç</button>
        <input ref={proj} type="file" accept=".json" hidden onChange={e => { if (e.target.files[0]) importProject(e.target.files[0]); e.target.value = ''; }} /> */}
        <button className="ibtn ghost" onClick={loadSample}>Örnek vakayı yükle</button>
        <button className="ibtn warnb" onClick={reset}>Tümünü temizle</button>
      </div>
      <div className="inote">Mizan verileri sunucuda saklanır, farklı bir cihazdan girişte de aynı şekilde görünür. "Dosyaya kaydet" sadece varsayım/ayar taslağını dışa aktarır.</div>
    </Insp>
  </>);
}

export function L2Mapping({ st, up, ledgers, hist }) {
  const [editTrialBalanceAccount] = useEditTrialBalanceAccountMutation();
  const [yi, setYi] = useState(Math.max(0, ledgers.length - 1));
  const [hideZero, setHideZero] = useState(true);
  const [onlyUn, setOnlyUn] = useState(false);
  const [open, setOpen] = useState({});
  const [doc, setDoc] = useState(st.pdfDocs[0]?.id);
  // Elle yapılan değişiklikler önce burada (taslak) bekler — localStorage/global state'e hiç
  // dokunulmaz. "Kaydet" basılınca backend'e yazılır ve ledgers'a işlenir; "Geri al" taslağı siler.
  const [pending, setPending] = useState({});
  const [saving, setSaving] = useState(false);
  if (!ledgers.length && !st.pdfDocs.length) return <div className="left"><Empty title="Eşlenecek mizan yok">Önce L1'de dosya yükleyin.</Empty></div>;
  const L = ledgers[Math.min(yi, ledgers.length - 1)];
  const h = hist.find(x => x.id === L?.id);
  const rows = L ? Object.values(L.acc).sort((a, b) => a.code.localeCompare(b.code)).map(a => {
    const p = pending[a.code];
    const dt = p ? p.dt : a.dt, ct = p ? p.ct : a.ct;
    return { ...a, dt, ct, map: lineOf(a.code), net: dt - ct, dirty: !!p };
  }) : [];
  const unmapped = rows.filter(r => !r.map && Math.abs(r.net) > 0.5);
  const savedOverrides = rows.filter(r => r.isManualOverride).length;
  const classes = [['1', 'Dönen varlıklar'], ['2', 'Duran varlıklar'], ['3', 'Kısa vadeli yabancı kaynaklar'], ['4', 'Uzun vadeli yabancı kaynaklar'], ['5', 'Özkaynaklar'], ['6', 'Gelir tablosu'], ['7', 'Maliyet hesapları'], ['8', 'Serbest'], ['9', 'Nazım']];
  const D = st.pdfDocs.find(d => d.id === doc) || st.pdfDocs[0];
  const setItem = (i, patch) => up(s => ({ pdfDocs: s.pdfDocs.map(d => d.id !== D.id ? d : { ...d, items: d.items.map((it, j) => j !== i ? it : { ...it, ...patch, kind: (patch.code ?? it.code) ? 'mapped' : it.kind === 'subtotal' ? 'subtotal' : 'unmapped' }) }) }));
  const swapCols = () => up(s => ({ pdfDocs: s.pdfDocs.map(d => d.id !== D.id ? d : { ...d, items: d.items.map(it => it.prev == null ? it : { ...it, cur: it.prev, prev: it.cur }) }) }));

  const editCell = (code, dt, ct) => setPending(p => {
    const orig = L.acc[code];
    if (orig && dt === orig.dt && ct === orig.ct) {
      const { [code]: _, ...rest } = p;
      return rest;
    }
    return { ...p, [code]: { dt, ct } };
  });
  const revertChanges = () => setPending({});

  const commitChanges = async () => {
    const codes = Object.keys(pending);
    if (!codes.length) return;
    setSaving(true);
    try {
      for (const code of codes) {
        const acc = L.acc[code];
        const { dt, ct } = pending[code];
        if (st.valuationTaskId) {
          await editTrialBalanceAccount({ valuationTaskId: st.valuationTaskId, year: L.year, code, name: acc?.name || accName(code), debit: dt, credit: ct }).unwrap();
        }
      }
      const applyPending = (acc) => {
        const next = {};
        for (const code in acc) {
          const a = acc[code], p = pending[code];
          next[code] = p ? { ...a, dt: p.dt, ct: p.ct, db: Math.max(p.dt - p.ct, 0), cb: Math.max(p.ct - p.dt, 0), isManualOverride: true } : a;
        }
        return next;
      };
      up(s => {
        const newLedgers = s.ledgers.map(l => l.id === L.id ? { ...l, acc: applyPending(l.acc) } : l);
        return { ledgers: newLedgers };
      });
      setPending({});
    } catch (e) {
      console.error(e);
      alert('Değişiklikler kaydedilemedi: ' + (e.data || e.message || e.status || 'bilinmeyen hata'));
    } finally {
      setSaving(false);
    }
  };

  return (<>
    <div className="left">
      {L && <section className="panel">
        <header className="mizanhead">
          <div className="mizanhead-l">
            <h2>Mizan ızgarası</h2>
            <span className="sub">{L.fileName}, {Object.keys(L.acc).length} ana hesap</span>
          </div>
          <div className="mizanhead-c">
            {savedOverrides > 0 && <span className="ov-count" style={{ marginRight: 10 }}>{savedOverrides} kaydedilmiş manuel değişiklik</span>}
            <div style={{ opacity: Object.keys(pending).length > 0 ? 1 : 0, pointerEvents: Object.keys(pending).length > 0 ? 'auto' : 'none' }}>
              <Seg small value="save" onChange={v => { if (!saving) (v === 'revert' ? revertChanges : commitChanges)(); }} options={[
                { v: 'revert', l: 'Değişiklikleri geri al' },
                { v: 'save', l: saving ? 'Kaydediliyor…' : `Kaydet (${Object.keys(pending).length})` },
              ]} />
            </div>
          </div>
          <div className="mizanhead-r">
            <Seg small value={yi} onChange={i => { setYi(i); setPending({}); }} options={ledgers.map((l, i) => ({ v: i, l: String(l.year) }))} />
          </div>
        </header>
        <div className="pbody flush">
          <div className="scroll tall"><table className="g">
            <thead><tr className="hd solo"><th className="lbl">Hesap</th><th>Tabloda karşılığı</th><th className="n">Borç toplamı</th><th className="n">Alacak toplamı</th><th className="n">Net bakiye</th></tr></thead>
            <tbody>
              {classes.map(([c, n]) => {
                const rs = rows.filter(r => r.code[0] === c && (!hideZero || Math.abs(r.net) > 0.5 || c === '6' || c === '7') && (!onlyUn || (!r.map && Math.abs(r.net) > 0.5)));
                if (!rs.length) return null;
                const isOpen = open[c] ?? (c !== '9' && c !== '8');
                const tot = rs.reduce((s, r) => s + r.net, 0);
                const totDt = rs.reduce((s, r) => s + r.dt, 0), totCt = rs.reduce((s, r) => s + r.ct, 0);
                return [
                  <tr key={c} className={'grp' + (isOpen ? ' open' : '')} onClick={() => setOpen(o => ({ ...o, [c]: !isOpen }))}><td className="lbl"><span className="caret">▸</span> {c} · {n}</td><td>{rs.length} hesap</td><td className="n">{nf(totDt / 1000)}</td><td className="n">{nf(totCt / 1000)}</td><td className="n">{par(tot / 1000)}</td></tr>,
                  ...(isOpen ? rs.map(r => (
                    <tr key={r.code} className={'kid' + (r.dirty ? ' warnrow' : '')}>
                      <td className="lbl"><code>{r.code}</code> {r.name || accName(r.code)}{r.isManualOverride && <Tag c="gold">elle düzenlendi</Tag>}{r.dirty && <Tag c="gold">kaydedilmedi</Tag>}</td>
                      <td>{r.map ? <span className="muted small">{r.map.line.n}</span> : Math.abs(r.net) > 0.5 ? <Tag c="red">eşlenmedi</Tag> : '—'}</td>
                      <td className="n"><input className="ninp" type="number" value={round2(r.dt / 1000)} onChange={e => editCell(r.code, (+e.target.value || 0) * 1000, r.ct)} /></td>
                      <td className="n"><input className="ninp" type="number" value={round2(r.ct / 1000)} onChange={e => editCell(r.code, r.dt, (+e.target.value || 0) * 1000)} /></td>
                      <td className={'n' + (r.net < 0 ? ' neg' : '')}>{par(r.net / 1000)}</td>
                    </tr>)) : [])
                ];
              })}
            </tbody>
            <tfoot><tr><td colSpan="5">Tutarlar bin TL. Net bakiye borç eksi alacak. Gelir tablosu hesapları kapanış kaydı sonrası sıfır bakiye verir; motor bu durumda hareket toplamını kullanır.</td></tr></tfoot>
          </table></div>
        </div>
      </section>}

      {D && <Panel title="Beyanname kalem eşleme" sub={D.fileName} flush
        right={<>{st.pdfDocs.length > 1 && <select className="csel" value={D.id} onChange={e => setDoc(e.target.value)}>{st.pdfDocs.map(d => <option key={d.id} value={d.id}>{d.fileName}</option>)}</select>}
          {D.twoCols && <button className="lnk" onClick={swapCols}>Sütun sırasını değiştir</button>}</>}>
        <div className="scroll tall"><table className="g">
          <thead><tr className="hd solo"><th className="c">Sf.</th><th className="lbl">Beyannamedeki kalem</th>{D.twoCols && <th className="n">Önceki dönem</th>}<th className="n">Cari dönem</th><th>Hesap kodu</th><th></th></tr></thead>
          <tbody>{D.items.map((it, i) => (
            <tr key={i} className={it.kind === 'subtotal' ? 'sub' : it.excluded ? 'dim' : ''}>
              <td className="c muted">{it.page}</td>
              <td className="lbl">{it.label}</td>
              {D.twoCols && <td className="n">{nf(it.prev)}</td>}
              <td className="n">{nf(it.cur)}</td>
              <td>{it.kind === 'subtotal' ? <span className="muted small">ara toplam</span> :
                <select className={'csel' + (it.code ? '' : ' unset')} value={it.code || ''} onChange={e => setItem(i, { code: e.target.value ? +e.target.value : null })}>
                  <option value="">Seçin…</option>
                  {Object.keys(ACCOUNTS).filter(c => !it.cls || c[0] === String(it.cls)).map(c => <option key={c} value={c}>{c} {ACCOUNTS[c]}</option>)}
                </select>}</td>
              <td>{it.kind !== 'subtotal' && <button className="lnk" onClick={() => setItem(i, { excluded: !it.excluded })}>{it.excluded ? 'Dahil et' : 'Hariç tut'}</button>}</td>
            </tr>))}</tbody>
        </table></div>
      </Panel>}
    </div>

    <Insp>
      <div className="ihead">Uyarlamalar <span>L2</span></div>
      {L && h && <div className="iblk"><h4>{L.year} kontrolleri</h4>
        <div className="checks">
          <div>{!L.totals.fileDt || Math.abs(L.totals.fileDt - L.totals.fileCt) < 1 ? <Stat kind="ok">Mizan borç ve alacak toplamı eşit</Stat> : <Stat kind="er">Mizan toplamları eşit değil</Stat>}</div>
          <div>{Math.abs(h.bs.check) < Math.max(1, h.bs.TA * 0.0005) ? <Stat kind="ok">Bilanço denk</Stat> : <Stat kind="er">Bilanço farkı {nf(h.bs.check / 1000)} bin ₺</Stat>}</div>
          <div>{unmapped.length ? <Stat kind="wn">{unmapped.length} hesap tabloya bağlanmadı</Stat> : <Stat kind="ok">Bakiyeli tüm hesaplar eşlendi</Stat>}</div>
          <div>{L.closed ? <Stat kind="ok">Kapanış sonrası mizan</Stat> : <Stat kind="wn">Kapanış öncesi, dönem kârı hesaplandı</Stat>}</div>
          <div>{h.is.da.source === 'sub' ? <Stat kind="ok">Amortisman alt hesaplardan okundu</Stat> : <Stat kind="wn">Amortisman tahmini</Stat>}</div>
          <div>{L.sub.length ? <Stat kind="ok">{L.sub.length} gider alt hesabı</Stat> : <Stat kind="wn">Alt hesap yok, katkı analizi sınırlı</Stat>}</div>
        </div>
      </div>}
      <div className="iblk"><h4>Görünüm</h4>
        <Toggle checked={hideZero} onChange={setHideZero} title="Sıfır bakiyeleri gizle" desc="Gelir tablosu ve maliyet hesapları her zaman görünür." />
        <Toggle checked={onlyUn} onChange={setOnlyUn} title="Yalnız eşlenmeyenler" desc="Bilançoya bağlanmamış bakiyeli hesapları filtreler." />
      </div>
      <div className="inote">Eşleme Tekdüzen Hesap Planı'na göre yapılır. Şirkete özel kod açılmışsa bakiye eşlenmeyenler listesinde görünür ve bilanço farkı olarak raporlanır.</div>
    </Insp>
  </>);
}
