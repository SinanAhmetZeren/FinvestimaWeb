import { useState, useRef, useMemo } from 'react';
import { Panel, Seg, Toggle, Stat, Tag, Empty, nf, par, Insp } from '../ui.jsx';
import { accName, ACCOUNTS } from '../engine/accounts.js';
import { lineOfEn as lineOf } from '../engine/accounts_lines_en.js';
import { MiniBars } from '../charts.jsx';
import { PdfUpload } from './PdfUpload.jsx';
import { useEditGaapTrialBalanceAccountMutation, useGetMyValuationTasksQuery, useRemoveYearMutation } from '../../slices/ValuatorProSlice.js';

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

const POLL_COLORS = { Starting: 'var(--gold)', Pending: 'var(--faint)', Processing: 'var(--teal)', Completed: 'var(--green)', Failed: 'var(--red)' };
const POLL_LABELS = { Starting: 'Submitting', Pending: 'Queued', Processing: 'Processing', Completed: 'Completed', Failed: 'Failed' };

export function L0Tasks({ st, selectTask }) {
  const { data: tasks, error, isLoading } = useGetMyValuationTasksQuery();

  if (isLoading) return <div className="left"><Empty title="Loading…">Fetching your engagements.</Empty></div>;
  if (error) return <div className="left"><Empty title="Something went wrong">{error.data || error.message || 'Error'}</Empty></div>;
  if (!tasks?.length) return <div className="left"><Empty title="No valuation assigned to you">Please contact us to start a valuation.</Empty></div>;

  return (
    <div className="left">
      <Panel title="Your valuations" sub="Select the engagement you want to continue">
        <div className="taskgrid">
          {tasks.map(t => (
            <button key={t.id} type="button" className={'taskcard' + (st.valuationTaskId === t.id ? ' sel' : '')} onClick={() => selectTask(t)}>
              <span className="tc-co">{t.companyName}</span>
              <span className="tc-ti">{t.title}</span>
              <span className="tc-go">{st.valuationTaskId === t.id ? 'Continue' : 'Select'} →</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function L1Inputs({ st, up, setSt, onFiles, loadSample, reset, busy, rawLedgers, ledgers, hist, setLayer, uploadPoll, log }) {
  const [removeYear] = useRemoveYearMutation();
  const [over, setOver] = useState(false);
  const [fileKind, setFileKind] = useState(null); // 'excel' | 'pdf'
  const inp = useRef(), proj = useRef();
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
  const used = new Set(ledgers.map(l => l.id));

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(st)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (st.company || 'project').replace(/\s+/g, '_') + '.valuator.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importProject = async f => { try { const s = JSON.parse(await f.text()); setSt(x => ({ ...x, ...s })); setLayer('L3'); } catch { alert('Could not read project file.'); } };

  return (<>
    <div className="left">
      <Panel title="Source files" sub="Excel trial balance, tax return PDF, monthly sales report and FX table">
        <span style={{ display: 'block', textAlign: 'left', fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Choose file type</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, width: '65%', margin: '0 auto 12px' }}>
          <button type="button" className={'codedepth-btn' + (fileKind === 'excel' ? ' sel' : '')} onClick={() => setFileKind('excel')}>Excel</button>
          <button type="button" className={'codedepth-btn' + (fileKind === 'pdf' ? ' sel' : '')} onClick={() => setFileKind('pdf')}>PDF</button>
        </div>

        {fileKind === 'excel' && <>
          <div className="codedepth">
            <span style={{ display: 'block', textAlign: 'left', fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>If your file contains a trial balance, which code depth should be used?</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '65%', margin: '0 auto' }}>
              {[[3, '3-digit codes only', '(e.g. 100)'], [5, 'Codes up to 5 digits', '(e.g. 100 01)'], [7, 'Codes up to 7 digits', '(e.g. 100 01 01)'], [0, 'Use all', '']].map(([v, l, ex]) => (
                <button key={v} type="button" className={'codedepth-btn' + (st.maxCodeDigits === v ? ' sel' : '')} onClick={() => up({ maxCodeDigits: v })}>
                  {l}{ex && <span style={{ fontWeight: 400 }}> {ex}</span>}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 13, width: '70%', marginTop: 8, marginLeft: '17.5%', marginRight: '12.5%', textAlign: 'left' }}>Excluded codes are stripped by the system and never sent to third parties for processing. Data is anonymized according to your selection before being written to the database.</p>
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
              {uploadPoll ? (POLL_LABELS[uploadPoll.status] || uploadPoll.status) : busy ? 'Reading files…' : st.maxCodeDigits == null ? 'Choose a code depth above first' : 'Drop files here or click to choose'}
            </b>
            <input ref={inp} type="file" multiple disabled={st.maxCodeDigits == null} accept=".xlsx,.xls,.xlsm,.csv,.ods" hidden onChange={e => { onFiles([...e.target.files]); e.target.value = ''; }} />
          </div>
        </>}

        {fileKind === 'pdf' && <PdfUpload up={up} log={log} valuationTaskId={st.valuationTaskId} />}
      </Panel>

      <Panel title="Uploaded sources" sub={rawLedgers.length ? `${rawLedgers.length} period(s)` : ''} flush>
        {(!st.ledgers.length && !st.pdfDocs.length) ? <Empty title="No files yet">Valuation requires at least one year-end trial balance or corporate tax return. Three years is recommended.</Empty> : (
          <div className="scroll"><table className="g">
            <thead><tr className="hd solo"><th className="lbl">Source</th><th>Type</th><th className="c">Year</th><th className="c">Period</th><th className="n">Accounts</th><th>Check</th><th></th></tr></thead>
            <tbody>
              {st.ledgers.map(L => {
                const ok = !L.totals.fileDt || Math.abs(L.totals.fileDt - L.totals.fileCt) < 1;
                return (<tr key={L.id} className={used.has(L.id) ? '' : 'dim'}>
                  <td className="lbl"><span className="fname">{L.fileName}</span>{L.company && <span className="muted small"> {L.company}</span>}</td>
                  <td><Tag c="teal">Trial balance</Tag></td>
                  <td className="c">{L.year || ''}</td>
                  <td className="c">{L.months === 12 ? '12 mo' : <Tag c="gold">{L.months} mo</Tag>}</td>
                  <td className="n">{Object.keys(L.acc).length}</td>
                  <td>{ok ? <Stat kind="ok">Debit = credit</Stat> : <Stat kind="er">Totals not equal</Stat>} {L.closed ? <Tag>post-closing</Tag> : <Tag c="gold">pre-closing</Tag>}</td>
                  <td><button className="lnk" onClick={() => remove(L.id)}>Remove</button></td>
                </tr>);
              })}
              {st.pdfDocs.map(d => {
                const un = d.items.filter(i => i.kind === 'unmapped' && !i.excluded).length;
                return (<tr key={d.id}>
                  <td className="lbl"><span className="fname">{d.fileName}</span>{d.twoCols && <label className="inl"><input type="checkbox" checked={d.usePrev} onChange={e => up(s => ({ pdfDocs: s.pdfDocs.map(x => x.id === d.id ? { ...x, usePrev: e.target.checked } : x) }))} /> also use the prior-period column</label>}</td>
                  <td><Tag c="plum">Tax return</Tag></td>
                  <td className="c"><input className="yinp" value={d.year || ''} onChange={e => setYear(d.id, e.target.value, true)} aria-label="Year" /></td>
                  <td className="c">12 mo</td>
                  <td className="n">{d.items.filter(i => i.code).length}</td>
                  <td>{un ? <button className="lnk wn" onClick={() => setLayer('L2')}>{un} item(s) awaiting mapping</button> : <Stat kind="ok">All items mapped</Stat>}</td>
                  <td><button className="lnk" onClick={() => remove(d.id, true)}>Remove</button></td>
                </tr>);
              })}
            </tbody>
            {ledgers.length < rawLedgers.length && <tfoot><tr><td colSpan="7">There is more than one source for the same year. Dimmed rows are not in use; the trial balance takes priority over the tax return.</td></tr></tfoot>}
          </table></div>
        )}
      </Panel>

      {st.monthly.length > 0 && (
        <Panel title="Monthly sales report" sub={`${st.monthly.length} mo`} right={<button className="lnk" onClick={() => up({ monthly: [] })}>Clear</button>}>
          <MiniBars data={st.monthly.map(m => ({ l: m.m === 1 ? String(m.y) : '', v: m.rev, cur: hist.length && m.y > hist[hist.length - 1].year }))} />
          <div className="chips">{Object.entries(monthlyByYear).map(([y, o]) => <span key={y} className="chip"><b>{y}</b> {o.n} mo, {nf(o.rev / 1e6, 1)} M ₺</span>)}</div>
          <p className="muted small">The monthly report is not the basis of the valuation; it is used for reconciliation with the trial balance and for the annualized first-year estimate of the current year.</p>
        </Panel>
      )}

      {st.log.length > 0 && <Panel title="Activity log"><ol className="log">{st.log.map((l, i) => <li key={i}><time>{l.t}</time>{l.msg}</li>)}</ol></Panel>}
    </div>

    <Insp>
      <div className="ihead">Adjustments <span>L1</span></div>
      <div className="iblk"><h4>Recognized inputs</h4>
        <dl className="defs">
          <dt>Trial balance (Excel)</dt><dd>Account code, debit and credit total columns, and balance columns. If there is no 3-digit code, sub-accounts are summed. Sub-accounts feed the depreciation and contribution analysis.</dd>
          <dt>Tax return (PDF)</dt><dd>The detailed balance sheet and income statement appendices of the corporate tax return. Must have a text layer; items are mapped to the chart of accounts.</dd>
          <dt>Monthly sales report</dt><dd>A sheet with year, month and revenue columns. Raw material and expense columns are read if present.</dd>
          <dt>FX table</dt><dd>Year, month and USD/TRY columns; if a period-end summary exists, the year-end rate is taken from there.</dd>
        </dl>
      </div>
      <div className="iblk"><h4>Project</h4>
        {/* <button className="ibtn ghost" onClick={exportProject} disabled={!st.ledgers.length && !st.pdfDocs.length}>Save project to file</button>
        <button className="ibtn ghost" onClick={() => proj.current?.click()}>Open saved project</button>
        <input ref={proj} type="file" accept=".json" hidden onChange={e => { if (e.target.files[0]) importProject(e.target.files[0]); e.target.value = ''; }} /> */}
        <button className="ibtn ghost" onClick={loadSample}>Load sample case</button>
        <button className="ibtn warnb" onClick={reset}>Clear all</button>
      </div>
      <div className="inote">Trial balance data is stored on the server and appears the same way when signing in from another device. "Save to file" only exports the assumptions/settings draft.</div>
    </Insp>
  </>);
}

export function L2Mapping({ st, up, ledgers, hist }) {
  const [editGaapTrialBalanceAccount] = useEditGaapTrialBalanceAccountMutation();
  const [yi, setYi] = useState(Math.max(0, ledgers.length - 1));
  const [hideZero, setHideZero] = useState(true);
  const [onlyUn, setOnlyUn] = useState(false);
  const [open, setOpen] = useState({});
  const [doc, setDoc] = useState(st.pdfDocs[0]?.id);
  // Manual edits wait here (draft) first — localStorage/global state is never touched. Pressing
  // "Save" writes to the backend and applies to ledgers; "Discard" deletes the draft.
  const [pending, setPending] = useState({});
  const [saving, setSaving] = useState(false);
  if (!ledgers.length && !st.pdfDocs.length) return <div className="left"><Empty title="No trial balance to map">Upload a file in L1 first.</Empty></div>;
  const L = ledgers[Math.min(yi, ledgers.length - 1)];
  const h = hist.find(x => x.id === L?.id);
  // No aggregation in the UI: every shadow account is expanded into its real original accounts
  // (bkz. GaapAccountGrouper.Sources) — a shadow code with one source shows that one account's
  // own code, not the shadow code.
  const detailRows = L ? Object.values(L.acc).flatMap(a => {
    const srcs = (a.sources && a.sources.length) ? a.sources.map(s => ({
      originalCode: String(s.originalCode ?? s.OriginalCode ?? a.code),
      originalName: s.originalName ?? s.OriginalName ?? a.name,
      dt: s.debit ?? s.Debit ?? 0,
      ct: s.credit ?? s.Credit ?? 0,
    })) : [{ originalCode: a.code, originalName: a.name, dt: a.dt, ct: a.ct }];
    return srcs.map(s => ({ shadowCode: a.code, isManualOverride: a.isManualOverride, ...s }));
  }) : [];
  const rows = detailRows.map(r => {
    const key = r.shadowCode + '::' + r.originalCode;
    const p = pending[key];
    const dt = p ? p.dt : r.dt, ct = p ? p.ct : r.ct;
    return { ...r, key, dt, ct, map: lineOf(r.shadowCode), net: dt - ct, dirty: !!p };
  }).sort((a, b) => a.originalCode.localeCompare(b.originalCode));
  const unmapped = rows.filter(r => !r.map && Math.abs(r.net) > 0.5);
  const savedOverrides = rows.filter(r => r.isManualOverride).length;
  const classes = [['1', 'Current assets'], ['2', 'Fixed assets'], ['3', 'Current liabilities'], ['4', 'Long-term liabilities'], ['5', 'Equity'], ['6', 'Income statement'], ['7', 'Cost accounts'], ['8', 'Free'], ['9', 'Off-balance']];
  const D = st.pdfDocs.find(d => d.id === doc) || st.pdfDocs[0];
  const setItem = (i, patch) => up(s => ({ pdfDocs: s.pdfDocs.map(d => d.id !== D.id ? d : { ...d, items: d.items.map((it, j) => j !== i ? it : { ...it, ...patch, kind: (patch.code ?? it.code) ? 'mapped' : it.kind === 'subtotal' ? 'subtotal' : 'unmapped' }) }) }));
  const swapCols = () => up(s => ({ pdfDocs: s.pdfDocs.map(d => d.id !== D.id ? d : { ...d, items: d.items.map(it => it.prev == null ? it : { ...it, cur: it.prev, prev: it.cur }) }) }));

  const editCell = (key, dt, ct) => setPending(p => {
    const orig = detailRows.find(r => (r.shadowCode + '::' + r.originalCode) === key);
    if (orig && dt === orig.dt && ct === orig.ct) {
      const { [key]: _, ...rest } = p;
      return rest;
    }
    return { ...p, [key]: { dt, ct } };
  });
  const revertChanges = () => setPending({});

  const commitChanges = async () => {
    const keys = Object.keys(pending);
    if (!keys.length) return;
    setSaving(true);
    try {
      for (const key of keys) {
        const r = detailRows.find(d => (d.shadowCode + '::' + d.originalCode) === key);
        const { dt, ct } = pending[key];
        if (st.valuationTaskId && r) {
          await editGaapTrialBalanceAccount({
            valuationTaskId: st.valuationTaskId, year: L.year,
            code: r.shadowCode, name: r.originalName || accName(r.shadowCode),
            debit: dt, credit: ct,
            originalCode: r.originalCode, originalName: r.originalName,
          }).unwrap();
        }
      }
      const applyPending = (acc) => {
        const next = {};
        for (const code in acc) {
          const a = acc[code];
          const srcs = (a.sources && a.sources.length) ? a.sources : [{ originalCode: a.code, originalName: a.name, debit: a.dt, credit: a.ct }];
          let changed = false;
          const newSrcs = srcs.map(s => {
            const oc = String(s.originalCode ?? s.OriginalCode ?? a.code);
            const p = pending[code + '::' + oc];
            if (!p) return s;
            changed = true;
            return { ...s, originalCode: oc, originalName: s.originalName ?? s.OriginalName, debit: p.dt, credit: p.ct };
          });
          if (!changed) { next[code] = a; continue; }
          const dt = newSrcs.reduce((sum, s) => sum + (s.debit ?? s.Debit ?? 0), 0);
          const ct = newSrcs.reduce((sum, s) => sum + (s.credit ?? s.Credit ?? 0), 0);
          next[code] = { ...a, dt, ct, db: Math.max(dt - ct, 0), cb: Math.max(ct - dt, 0), isManualOverride: true, sources: (a.sources && a.sources.length) ? newSrcs : null };
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
      alert('Changes could not be saved: ' + (e.data || e.message || e.status || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (<>
    <div className="left">
      {L && <section className="panel">
        <header className="mizanhead">
          <div className="mizanhead-l">
            <h2>Trial balance grid</h2>
            <span className="sub">{L.fileName}, {Object.keys(L.acc).length} main accounts</span>
          </div>
          <div className="mizanhead-c">
            {savedOverrides > 0 && <span className="ov-count" style={{ marginRight: 10 }}>{savedOverrides} saved manual change(s)</span>}
            <div style={{ opacity: Object.keys(pending).length > 0 ? 1 : 0, pointerEvents: Object.keys(pending).length > 0 ? 'auto' : 'none' }}>
              <Seg small value="save" onChange={v => { if (!saving) (v === 'revert' ? revertChanges : commitChanges)(); }} options={[
                { v: 'revert', l: 'Discard changes' },
                { v: 'save', l: saving ? 'Saving…' : `Save (${Object.keys(pending).length})` },
              ]} />
            </div>
          </div>
          <div className="mizanhead-r">
            <Seg small value={yi} onChange={i => { setYi(i); setPending({}); }} options={ledgers.map((l, i) => ({ v: i, l: String(l.year) }))} />
          </div>
        </header>
        <div className="pbody flush">
          <div className="scroll tall"><table className="g">
            <thead><tr className="hd solo"><th className="lbl">Account</th><th>Table line</th><th className="n">Debit total</th><th className="n">Credit total</th><th className="n">Net balance</th></tr></thead>
            <tbody>
              {classes.map(([c, n]) => {
                const rs = rows.filter(r => r.shadowCode[0] === c && (!hideZero || Math.abs(r.net) > 0.5 || c === '6' || c === '7') && (!onlyUn || (!r.map && Math.abs(r.net) > 0.5)));
                if (!rs.length) return null;
                const isOpen = open[c] ?? (c !== '9' && c !== '8');
                const tot = rs.reduce((s, r) => s + r.net, 0);
                const totDt = rs.reduce((s, r) => s + r.dt, 0), totCt = rs.reduce((s, r) => s + r.ct, 0);
                return [
                  <tr key={c} className={'grp' + (isOpen ? ' open' : '')} onClick={() => setOpen(o => ({ ...o, [c]: !isOpen }))}><td className="lbl"><span className="caret">▸</span> {n}</td><td>{rs.length} account(s)</td><td className="n">{nf(totDt / 1000)}</td><td className="n">{nf(totCt / 1000)}</td><td className="n">{par(tot / 1000)}</td></tr>,
                  ...(isOpen ? rs.map(r => (
                    <tr key={r.key} className={'kid' + (r.dirty ? ' warnrow' : '')}>
                      <td className="lbl"><code>{r.originalCode}</code> {r.originalName || accName(r.shadowCode)}{r.isManualOverride && <Tag c="gold">manually edited</Tag>}{r.dirty && <Tag c="gold">unsaved</Tag>}</td>
                      <td>{r.map ? <span className="muted small">{r.map.line.n}</span> : Math.abs(r.net) > 0.5 ? <Tag c="red">unmapped</Tag> : '—'}</td>
                      <td className="n"><input className="ninp" type="number" value={round2(r.dt / 1000)} onChange={e => editCell(r.key, (+e.target.value || 0) * 1000, r.ct)} /></td>
                      <td className="n"><input className="ninp" type="number" value={round2(r.ct / 1000)} onChange={e => editCell(r.key, r.dt, (+e.target.value || 0) * 1000)} /></td>
                      <td className={'n' + (r.net < 0 ? ' neg' : '')}>{par(r.net / 1000)}</td>
                    </tr>)) : [])
                ];
              })}
            </tbody>
            <tfoot><tr><td colSpan="5">Amounts in $k. Net balance is debit minus credit. Income statement accounts show a zero balance after the closing entry; in that case the engine uses the movement total.</td></tr></tfoot>
          </table></div>
        </div>
      </section>}

      {D && <Panel title="Tax return item mapping" sub={D.fileName} flush
        right={<>{st.pdfDocs.length > 1 && <select className="csel" value={D.id} onChange={e => setDoc(e.target.value)}>{st.pdfDocs.map(d => <option key={d.id} value={d.id}>{d.fileName}</option>)}</select>}
          {D.twoCols && <button className="lnk" onClick={swapCols}>Swap column order</button>}</>}>
        <div className="scroll tall"><table className="g">
          <thead><tr className="hd solo"><th className="c">Pg.</th><th className="lbl">Item on the tax return</th>{D.twoCols && <th className="n">Prior period</th>}<th className="n">Current period</th><th>Account code</th><th></th></tr></thead>
          <tbody>{D.items.map((it, i) => (
            <tr key={i} className={it.kind === 'subtotal' ? 'sub' : it.excluded ? 'dim' : ''}>
              <td className="c muted">{it.page}</td>
              <td className="lbl">{it.label}</td>
              {D.twoCols && <td className="n">{nf(it.prev)}</td>}
              <td className="n">{nf(it.cur)}</td>
              <td>{it.kind === 'subtotal' ? <span className="muted small">subtotal</span> :
                <select className={'csel' + (it.code ? '' : ' unset')} value={it.code || ''} onChange={e => setItem(i, { code: e.target.value ? +e.target.value : null })}>
                  <option value="">Choose…</option>
                  {Object.keys(ACCOUNTS).filter(c => !it.cls || c[0] === String(it.cls)).map(c => <option key={c} value={c}>{c} {ACCOUNTS[c]}</option>)}
                </select>}</td>
              <td>{it.kind !== 'subtotal' && <button className="lnk" onClick={() => setItem(i, { excluded: !it.excluded })}>{it.excluded ? 'Include' : 'Exclude'}</button>}</td>
            </tr>))}</tbody>
        </table></div>
      </Panel>}
    </div>

    <Insp>
      <div className="ihead">Adjustments <span>L2</span></div>
      {L && h && <div className="iblk"><h4>{L.year} checks</h4>
        <div className="checks">
          <div>{!L.totals.fileDt || Math.abs(L.totals.fileDt - L.totals.fileCt) < 1 ? <Stat kind="ok">Trial balance debit and credit totals equal</Stat> : <Stat kind="er">Trial balance totals not equal</Stat>}</div>
          <div>{Math.abs(h.bs.check) < Math.max(1, h.bs.TA * 0.0005) ? <Stat kind="ok">Balance sheet balanced</Stat> : <Stat kind="er">Balance sheet difference {nf(h.bs.check / 1000)} $k</Stat>}</div>
          <div>{unmapped.length ? <Stat kind="wn">{unmapped.length} account(s) not linked to the table</Stat> : <Stat kind="ok">All balanced accounts mapped</Stat>}</div>
          <div>{L.closed ? <Stat kind="ok">Post-closing trial balance</Stat> : <Stat kind="wn">Pre-closing, period profit calculated</Stat>}</div>
          <div>{h.is.da.source === 'sub' ? <Stat kind="ok">Depreciation read from sub-accounts</Stat> : <Stat kind="wn">Depreciation estimated</Stat>}</div>
          <div>{L.sub.length ? <Stat kind="ok">{L.sub.length} expense sub-account(s)</Stat> : <Stat kind="wn">No sub-accounts, contribution analysis limited</Stat>}</div>
        </div>
      </div>}
      <div className="iblk"><h4>View</h4>
        <Toggle checked={hideZero} onChange={setHideZero} title="Hide zero balances" desc="Income statement and cost accounts are always shown." />
        <Toggle checked={onlyUn} onChange={setOnlyUn} title="Only unmapped" desc="Filters to balanced accounts not linked to the balance sheet." />
      </div>
      <div className="inote">Mapping follows the chart of accounts. If the company has opened a custom code, it appears in the unmapped list and is reported as a balance sheet difference.</div>
    </Insp>
  </>);
}
