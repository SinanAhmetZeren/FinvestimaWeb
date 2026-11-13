import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setVpLang, setPendingTask, clearPendingTask } from '../slices/VpLangSlice.js';
import { buildLedger } from './engine/ledger.js';
import { parseWorkbookFile } from './engine/parseExcel.js';
import { parsePdfFile, ledgerFromItems } from './engine/parsePdf.js';
import { useUploadTrialBalanceMutation, useLazyGetUploadJobQuery, useLazyGetValuationTaskQuery, useLazyGetAssumptionsQuery, useComputeAssumptionsMutation, useUpdateCompanyProfileMutation } from '../slices/ValuatorProSlice.js';
import { buildHistory, DEFAULT_FX } from './engine/statements.js';
import { fetchFxSummary } from './engine/fxApi.js';
import { valuate, runRate, defaultAssumptions } from './engine/valuation.js';
import { runAudit } from './engine/audit.js';
import { mUsd, pc } from './ui.jsx';
import { RightColContext } from './rightColContext.js';
import logo from '../assets/finvestimaLogo.jpeg';
import RailNav from './RailNav.jsx';
import RailNavEn from './RailNav_en.jsx';
import * as Inputs from './layers/Inputs.jsx';
import * as InputsEn from './layers/Inputs_en.jsx';
import * as Statements from './layers/Statements.jsx';
import * as StatementsEn from './layers/Statements_en.jsx';
import * as Valuation from './layers/Valuation.jsx';
import * as ValuationEn from './layers/Valuation_en.jsx';
import Onboarding, { EMPLOYEES, REVENUE, PURPOSES, ROLES } from './auth/Onboarding.jsx';
import { SECTORS, findSub } from '../data/onboardingSectors.js';

const LAYERS = [
  { k:'L0', n:'İşler', m:'Değerleme seçimi' },
  { k:'L1', n:'Girdiler', m:'Dosya alımı, kurlar' },
  { k:'L2', n:'Mizan ve eşleme', m:'Hesap planı kontrolü' },
  { k:'L3', n:'Bilanço özetleri', m:'TL, USD, oranlar' },
  { k:'L4', n:'Gelir tablosu', m:'Normalize FAVÖK' },
  { k:'L5', n:'Varsayımlar', m:'Projeksiyon sürücüleri' },
  { k:'L6', n:'Değerleme', m:'Üç yöntem' },
  { k:'L7', n:'Denetim ve çıktı', m:'Bulgular, rapor' },
];

const EMPTY = { company:'', ledgers:[], pdfDocs:[], monthly:[], fx:{}, partnersAsDebt:true, fxInEbitda:false,
  daOverride:{}, annualize:{}, addbacks:[], contrib:{}, asm:null, baseAsm:null, savedAsm:null, closed:[], log:[], valuationTaskId:null, maxCodeDigits:0 };

export default function ValuatorProEngine(){
  const [uploadTrialBalance] = useUploadTrialBalanceMutation();
  const [fetchUploadJob] = useLazyGetUploadJobQuery();
  const [fetchValuationTask] = useLazyGetValuationTaskQuery();
  const [fetchAssumptions] = useLazyGetAssumptionsQuery();
  const [computeAssumptionsMut] = useComputeAssumptionsMutation();
  const dispatch = useDispatch();
  // Veri DB'den geliyor (L0'da task seçilince taze çekilir) — localStorage'da ayrıca
  // saklamıyoruz, her girişte sıfırdan başlanır, bayat/çelişkili veri görünmesin diye.
  const [st, setSt] = useState(EMPTY);
  // A0: L0'dan önceki onboarding adımı — gerçek giriş durumu (Redux/localStorage, aynı
  // token'ı AuthPage ile paylaşır). Giriş yoksa L0 yerine Onboarding gösterilir.
  const isLoggedIn = useSelector(s => s.users.isLoggedIn);
  // Her açılışta L0'dan başlanır — kullanıcı kendisine atanmış task'lardan birini seçene kadar
  // L1+'a geçilmez. Admin task açtığı için burada "yeni task" seçeneği yok, sadece seçim var.
  const [layer, setLayer] = useState('L0');
  const [busy, setBusy] = useState(false);
  const [uploadPoll, setUploadPoll] = useState(null); // { status, key } — Starting/Pending/Processing/Completed/Failed
  const pollKeyRef = useRef(0);
  const flashPoll = status => {
    pollKeyRef.current += 1;
    const key = pollKeyRef.current;
    setUploadPoll({ status, key });
    if (status === 'Completed' || status === 'Failed'){
      setTimeout(() => setUploadPoll(p => (p?.key === key ? null : p)), 5000);
    }
  };
  const lang = useSelector(s => s.vpLang.lang);
  const I = lang === 'en' ? InputsEn : Inputs;
  const S = lang === 'en' ? StatementsEn : Statements;
  const Val = lang === 'en' ? ValuationEn : Valuation;
  const [printing, setPrinting] = useState(false);
  const [rightColEl, setRightColEl] = useState(null);
  const [railOpen, setRailOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => { if (rightColEl) rightColEl.scrollTop = 0; }, [layer, rightColEl]);
  const up = useCallback(patch => setSt(s => ({ ...s, ...(typeof patch==='function' ? patch(s) : patch) })), []);
  const loadAssumptions = async taskId => {
    up({ savedAsmLoading: true });
    const resp = await fetchAssumptions(taskId).unwrap().catch(() => null);
    up({ savedAsm: resp?.assumptions || null, savedAsmLoading: false });
  };

  const pdfLedgers = useMemo(() => st.pdfDocs.flatMap(d => {
    const out = [ledgerFromItems(d.items, { year:d.year, which:'cur', fileName:d.fileName, id:d.id+'c' })];
    if (d.usePrev && d.year) out.push(ledgerFromItems(d.items, { year:d.year-1, which:'prev', fileName:d.fileName, id:d.id+'p' }));
    return out;
  }), [st.pdfDocs]);

  const rawLedgers = useMemo(() => [...st.ledgers.filter(l=>l.year), ...pdfLedgers.filter(l=>l.year)], [st.ledgers, pdfLedgers]);
  const ledgers = useMemo(() => {
    const by = {};
    for (const L of rawLedgers){ const e = by[L.year]; if (!e || (e.source==='pdf' && L.source==='mizan')) by[L.year] = L; }
    return Object.values(by).sort((a,b)=>a.year-b.year);
  }, [rawLedgers]);

  const [apiFx, setApiFx] = useState(null);
  useEffect(() => { fetchFxSummary().then(setApiFx); }, []);
  const fxBase = apiFx || DEFAULT_FX;
  const fxTable = useMemo(() => { const o = {}; new Set([...Object.keys(fxBase), ...Object.keys(st.fx)]).forEach(y => o[y] = { ...(st.fx[y]||{}), ...(fxBase[y]||{}) }); return o; }, [fxBase, st.fx]);
  const hist = useMemo(() => ledgers.length ? buildHistory(ledgers, st) : [], // eslint-disable-next-line
    [ledgers, st.fx, st.partnersAsDebt, st.fxInEbitda, st.daOverride, st.annualize, st.addbacks]);
  const lastYear = hist.length ? hist[hist.length-1].year : null;
  const rr = useMemo(() => hist.length ? runRate(st.monthly, hist, fxTable, lastYear+1) : null, [st.monthly, hist, fxTable, lastYear]);

  useEffect(() => {
    if (hist.length && st.savedAsmLoading) return; // kayıtlı varsayımlar henüz çekiliyor, bekle
    if (hist.length && (!st.asm || st.asm._base !== lastYear)){
      // Kayıtlı (backend'den gelen) varsayımlar bu baz yıl için hâlâ geçerliyse onu kullan —
      // yoksa (ilk yükleme ya da baz yıl değişti) taze hesapla ve backend'e yaz (bkz. SaveAssumptions).
      if (st.savedAsm && st.savedAsm._base === lastYear) {
        // baseAsm = gerçek hesaplanmış varsayılan (tarihsel veriden) — kaydedilmiş/özelleştirilmiş
        // değer değil, yoksa "elle değiştirildi" işaretleri sayfa yenilenince kaybolur.
        up({ asm: st.savedAsm, baseAsm: { ...defaultAssumptions(hist), _base: lastYear } });
        return;
      }
      // Normalde mizan yazılırken backend otomatik hesaplayıp kaydediyor (bkz.
      // TrialBalanceExtractionService → ValuationAssumptionsService) — buraya sadece bu task'ın
      // daha önce hiç otomatik hesaplanmadığı (eski task) durumlarda düşülür.
      if (st.valuationTaskId) computeAssumptionsMut(st.valuationTaskId).unwrap().then(resp => {
        if (resp.assumptions) up({ asm: resp.assumptions, baseAsm: resp.assumptions, savedAsm: resp.assumptions });
      }).catch(() => {});
    }
  }, [hist, lastYear, st.savedAsmLoading, st.savedAsm]); // eslint-disable-line

  const V = useMemo(() => { try { return (hist.length && st.asm && st.asm._base===lastYear) ? valuate(hist, st.asm, { rr }) : null; } catch(e){ console.error(e); return null; } }, [hist, st.asm, rr, lastYear]);
  const audit = useMemo(() => {
    const a = runAudit({ hist, ledgers: rawLedgers, monthly: st.monthly, V, A: st.asm, state: st });
    a.findings.forEach(f => f.closed = st.closed.includes(f.id));
    const w = { crit:2, warn:.6, info:.15 };
    a.score = Math.max(0, Math.min(10, 10 - a.findings.filter(f=>!f.closed).reduce((s,f)=>s+w[f.sev],0)));
    return a;
  }, [hist, rawLedgers, st, V]);

  const log = msg => up(s => ({ log: [{ t: new Date().toLocaleTimeString('tr-TR'), msg }, ...s.log].slice(0,40) }));

  // jobId'yi Completed/Failed olana kadar poll eder; her denemede onTick(job) çağrılır (ilk
  // deneme dahil) ki UI canlı durumu (Pending/Processing/...) yansıtabilsin.
  const pollUploadJob = async (jobId, onTick, { intervalMs = 1500, timeoutMs = 120000 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs){
      const job = await fetchUploadJob(jobId).unwrap();
      onTick?.(job);
      if (job.status === 'Completed') return job;
      if (job.status === 'Failed') throw new Error(job.errorMessage || 'Gemini işlemi başarısız oldu.');
      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error('İşlem zaman aşımına uğradı.');
  };

  // Müşteri kendisi task açmaz — admin ödeme teyidinden sonra açar. L0'da kullanıcı kendisine
  // atanmış task'lardan birini seçince burası çalışır.
  const selectTask = async (t) => {
    setUploadPoll(null);
    up({ valuationTaskId: t.id, company: t.companyName, ledgers: [], pdfDocs: [], log: [] });
    loadAssumptions(t.id);
    const task = await fetchValuationTask(t.id).unwrap();
    if (task.accountingStandard === 'UsGaap') {
      // Bu motor Tekdüzen için — GAAP task seçildiğinde EN motoruna geçilir, o motor
      // mount olunca bu task'ı kendisi seçip L1'e geçer (bkz. pendingTaskId effect'i).
      dispatch(setPendingTask(t.id));
      dispatch(setVpLang('en'));
      return;
    }
    const newLedgers = task.years.map(y => buildLedger(
      [...y.accounts, ...(y.subAccounts || [])].map(a => { const net=(+a.debit||0)-(+a.credit||0); return { code:a.code, name:a.name, dt:a.debit, ct:a.credit, db:Math.max(net,0), cb:Math.max(-net,0), isManualOverride:a.isManualOverride, contributionClass:a.contributionClass, contributionClassIsManual:a.contributionClassIsManual }; }),
      { year:y.year, months:y.months, source:'mizan', fileName:y.fileName || '', company:task.companyName, fileDt:y.fileDebitTotal, fileCt:y.fileCreditTotal }
    ));
    if (newLedgers.length) up(s => ({ ledgers: newLedgers }));
    const monthly = (task.monthlySales || []).map(m => ({ y: m.year, m: m.month, rev: m.revenue, mat: m.materialCost, opex: m.opex }));
    up({ monthly, companyProfile: {
      name: task.companyName, website: task.companyWebsite, sector: task.companySector, subSector: task.companySubSector,
      employees: task.companyEmployees, revenue: task.companyRevenue, purpose: task.companyPurpose, reportEmail: task.companyReportEmail,
      contactFullName: task.companyContactFullName, contactRole: task.companyContactRole, contactPhone: task.companyContactPhone,
    } });
    setLayer('L1');
  };

  const openProfile = async () => {
    if (!st.valuationTaskId) return;
    const task = await fetchValuationTask(st.valuationTaskId).unwrap().catch(()=>null);
    if (task) up({ companyProfile: {
      name: task.companyName, website: task.companyWebsite, sector: task.companySector, subSector: task.companySubSector,
      employees: task.companyEmployees, revenue: task.companyRevenue, purpose: task.companyPurpose, reportEmail: task.companyReportEmail,
      contactFullName: task.companyContactFullName, contactRole: task.companyContactRole, contactPhone: task.companyContactPhone,
    } });
    setProfileOpen(true);
  };

  // Diğer motordan (EN) bir Tekdüzen task seçilip buraya yönlendirilmişse, mount olur
  // olmaz o task'ı burada otomatik seç (ikinci tıklama gerekmesin diye).
  const pendingTaskId = useSelector(s => s.vpLang.pendingTaskId);
  useEffect(() => {
    if (pendingTaskId) { dispatch(clearPendingTask()); selectTask({ id: pendingTaskId }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFiles = async (files) => {
    setBusy(true);
    setUploadPoll(null);
    // Döngüde st.valuationTaskId kullanılamaz — React state'i senkron güncellenmediği için
    // 2. ve 3. dosya hâlâ eski (bayat) değeri görür, bu da her dosya için ayrı bir task
    // açılmasına yol açar. Bunun yerine döngü boyunca güncel id'yi burada takip ediyoruz.
    let currentTaskId = st.valuationTaskId;
    for (const f of files){
      const ext = f.name.split('.').pop().toLowerCase();
      try {
        if (ext==='pdf'){
          const r = await parsePdfFile(f);
          const doc = { id:'P'+Math.random().toString(36).slice(2,8), fileName:f.name, year:r.year, items:r.items, twoCols:r.twoCols, usePrev:false, totals:r.totals, pages:r.pages };
          up(s => ({ pdfDocs:[...s.pdfDocs, doc], company: s.company || r.company || '' }));
          const mapped = r.items.filter(i=>i.kind==='mapped').length, un = r.items.filter(i=>i.kind==='unmapped').length;
          log(`${f.name}: beyanname okundu, ${r.pages} sayfa, ${mapped} kalem eşlendi, ${un} kalem eşleme bekliyor${r.year?'':'; yıl bulunamadı, L1\'de girin'}.`);
        } else if (['xlsx','xls'].includes(ext)){
          // Mizan artık tarayıcıda değil, backend'de Gemini ile çıkarılıyor (isimler/üçüncü
          // taraf bilgisi dosyayı terk etmeden önce temizleniyor — bkz. MizanDepthFilter).
          // Aylık satış raporu ve kur tablosu sayfaları için parseWorkbookFile hâlâ kullanılıyor,
          // backend şu an sadece mizan'ı destekliyor.
          const r = await parseWorkbookFile(f);
          // [eski client-side mizan parsing — geri dönülebilir olsun diye silinmedi, yorum satırı]
          // if (r.mizans.length) up(s => ({ ledgers: [...s.ledgers, ...r.mizans], company: s.company || r.mizans[0].company || '' }));
          // Aylık satış artık mizan gibi Gemini'den geliyor (bkz. aşağıdaki task.monthlySales
          // okuması) — client-side parseWorkbookFile sonucu burada kullanılmıyor, yorum satırı.
          // if (r.monthly.length) up(s => { const key = m => m.y*100+m.m; const mp = new Map(s.monthly.map(m=>[key(m),m])); r.monthly.forEach(m=>mp.set(key(m),m)); return { monthly:[...mp.values()].sort((a,b)=>key(a)-key(b)) }; });
          if (r.fx) up(s => { const o = { ...s.fx }; for (const y in r.fx){ o[y] = { ...(o[y]||{}), ...(r.fx[y].avg?{avg:r.fx[y].avg}:{}), ...(r.fx[y].end?{end:r.fx[y].end}:{}) }; } return { fx:o }; });

          if (!currentTaskId){
            log(`${f.name}: önce L0'dan bir iş seçmelisiniz.`);
            continue;
          }
          flashPoll('Starting');
          const { jobId, valuationTaskId } = await uploadTrialBalance({
            file: f,
            valuationTaskId: currentTaskId,
            companyName: st.company || undefined,
            taskTitle: 'Değerleme',
            maxCodeDigits: st.maxCodeDigits,
          }).unwrap();
          currentTaskId = valuationTaskId;
          up({ valuationTaskId });
          if (!st.savedAsm) loadAssumptions(valuationTaskId);
          log(`${f.name}: Gemini ile mizan okunuyor…`);
          const completedJob = await pollUploadJob(jobId, job => flashPoll(job.status));
          const thisJobYears = new Set((completedJob.result?.years || []).map(y => y.year));
          const task = await fetchValuationTask(valuationTaskId).unwrap();
          dispatch(setVpLang(task.accountingStandard === 'UsGaap' ? 'en' : 'tr'));
          const newLedgers = task.years.map(y => buildLedger(
            // Bakiye (db/cb) backend'in debitBalance/creditBalance alanından değil, Debit-Credit
            // farkından kendimiz hesaplanıyor — Gemini bu iki ayrı alanı tutarsız okuyabiliyor.
            // subAccounts: Katkı seviyeleri (Statements.jsx) için 6/7 sınıfı hesapların 3 haneden
            // derin, kümelenmemiş kırılım satırları — accounts'taki 3'lü köklerin yanına eklenir.
            [...y.accounts, ...(y.subAccounts || [])].map(a => { const net=(+a.debit||0)-(+a.credit||0); return { code:a.code, name:a.name, dt:a.debit, ct:a.credit, db:Math.max(net,0), cb:Math.max(-net,0), isManualOverride:a.isManualOverride, contributionClass:a.contributionClass, contributionClassIsManual:a.contributionClassIsManual }; }),
            { year:y.year, months:y.months, source:'mizan', fileName:y.fileName || '', company:task.companyName, fileDt:y.fileDebitTotal, fileCt:y.fileCreditTotal }
          ));
          up(s => {
            const years = new Set(newLedgers.map(l=>l.year));
            return { ledgers: [...s.ledgers.filter(l=>!years.has(l.year)), ...newLedgers], company: s.company || task.companyName || '' };
          });
          const monthly = (task.monthlySales || []).map(m => ({ y: m.year, m: m.month, rev: m.revenue, mat: m.materialCost, opex: m.opex }));
          up({ monthly });

          const touchedLedgers = newLedgers.filter(l => thisJobYears.has(l.year));
          const monthlySalesRowCount = completedJob.result?.monthlySalesRowCount || 0;
          const parts = [];
          if (touchedLedgers.length) parts.push(`${touchedLedgers.length} mizan (${touchedLedgers.map(l=>l.year||'yıl?').join(', ')})`);
          if (monthlySalesRowCount) parts.push(`${monthlySalesRowCount} aylık satış satırı`);
          if (r.fx) parts.push(`${Object.keys(r.fx).length} yıllık kur`);
          log(`${f.name}: ${parts.length ? parts.join(', ')+' okundu' : 'tanınan veri bulunamadı'}.`);
        } else if (['xlsm','csv','ods'].includes(ext)){
          const r = await parseWorkbookFile(f);
          if (r.mizans.length) up(s => ({ ledgers: [...s.ledgers, ...r.mizans], company: s.company || r.mizans[0].company || '' }));
          if (r.monthly.length) up(s => { const key = m => m.y*100+m.m; const mp = new Map(s.monthly.map(m=>[key(m),m])); r.monthly.forEach(m=>mp.set(key(m),m)); return { monthly:[...mp.values()].sort((a,b)=>key(a)-key(b)) }; });
          if (r.fx) up(s => { const o = { ...s.fx }; for (const y in r.fx){ o[y] = { ...(o[y]||{}), ...(r.fx[y].avg?{avg:r.fx[y].avg}:{}), ...(r.fx[y].end?{end:r.fx[y].end}:{}) }; } return { fx:o }; });
          const parts = [];
          if (r.mizans.length) parts.push(`${r.mizans.length} mizan (${r.mizans.map(m=>m.year||'yıl?').join(', ')})`);
          if (r.monthly.length) parts.push(`${r.monthly.length} aylık satış satırı`);
          if (r.fx) parts.push(`${Object.keys(r.fx).length} yıllık kur`);
          log(`${f.name}: ${parts.length ? parts.join(', ')+' okundu' : 'tanınan sayfa bulunamadı'}${r.skipped.length ? `; atlanan sayfalar: ${r.skipped.slice(0,4).join(', ')}${r.skipped.length>4?'…':''}` : ''}.`);
        } else log(`${f.name}: desteklenmeyen tür. Excel (.xlsx, .xls, .csv) ya da PDF yükleyin.`);
      } catch(e){ console.error(e); log(`${f.name}: okunamadı. ${e.message}`); }
    }
    setBusy(false);
  };

  const loadSample = async () => {
    const S = (await import('./engine/sample.json')).default;
    const L = Object.entries(S.mizan).map(([y,rows]) => buildLedger(rows.map(r=>({code:r[0],name:r[1],dt:r[2],ct:r[3],db:r[4],cb:r[5]})), { year:+y, source:'mizan', fileName:`Örnek mizan ${y}`, label:`01/01/${y}-31/12/${y}` }));
    setSt({ ...EMPTY, company:'Örnek Sanayi A.Ş.', ledgers:L, monthly:S.monthly,
      addbacks:[{ id:'a1', name:'Ortak kaynaklı genel yönetim giderleri (%50)', year:2025, tl:7407497, ev:false, on:false }],
      log:[{ t:new Date().toLocaleTimeString('tr-TR'), msg:'Örnek vaka yüklendi: 2023–2025 mizanları ve 2023–2026/06 aylık satış raporu.' }] });
    setLayer('L3');
  };
  const reset = () => { if (window.confirm('Tüm dosyalar ve varsayımlar silinsin mi?')) { setUploadPoll(null); setSt(EMPTY); setLayer('L0'); } };

  const ctx = { st, setSt, up, hist, ledgers, rawLedgers, V, audit, fxTable, rr, onFiles, loadSample, reset, busy, setLayer, log, setPrinting, uploadPoll, selectTask };
  const done = { L1: ledgers.length>0, L2: hist.length>0 && hist.every(h=>Math.abs(h.bs.check)<Math.max(1,h.bs.TA*0.0005)), L3: hist.length>0, L4: hist.length>0, L5: !!V, L6: !!V, L7: !!V && audit.findings.every(f=>f.closed||f.sev!=='crit') };

  useEffect(() => { if (printing){ const t = setTimeout(()=>{ window.print(); setPrinting(false); }, 350); return ()=>clearTimeout(t); } }, [printing]);

  if (!isLoggedIn) return null; // PrivateRoute zaten /login'e yönlendirir, buraya ulaşmaz

  return (
    <RightColContext.Provider value={rightColEl}>
    <div className={'app vp-root'+(printing?' printing':'')}>
      {railOpen && (lang === 'en'
        ? <RailNavEn layer={layer} setLayer={setLayer} done={done} taskSelected={!!st.valuationTaskId || st.ledgers.length > 0} />
        : <RailNav layer={layer} setLayer={setLayer} done={done} taskSelected={!!st.valuationTaskId || st.ledgers.length > 0} />)}
      <button type="button" className={'railToggle'+(railOpen?'':' collapsed')} style={{ left: railOpen ? 'var(--rail)' : 0 }} aria-label={railOpen?'Sol paneli gizle':'Sol paneli göster'} onClick={()=>setRailOpen(v=>!v)}>{railOpen?'‹':'›'}</button>

      <div className="main">
        <header className="top">
          <div className="case" style={{ marginLeft: 10 }}>
            {layer!=='L0' && layer!=='A0' && <input className="cname" value={st.company} placeholder="Şirket adı" onChange={e=>up({company:e.target.value})} aria-label="Şirket adı" />}
            {layer!=='L0' && layer!=='A0' && hist.length>0 && <span className="cmeta">{`${hist[0].year}–${hist[hist.length-1].year} tarihsel, USD '000`}</span>}
          </div>
          {V && <div className="headline">
            <div><span className="hl">Firma değeri</span><b>{mUsd(V.ev)}</b></div>
            <div><span className="hl">Özkaynak değeri</span><b>{mUsd(V.eq)}</b></div>
            <div><span className="hl">Güven skoru</span><b className={audit.score>=7?'ok':audit.score>=4?'wn':'er'}>{audit.score.toFixed(1).replace('.',',')}</b></div>
            <div className="hide-sm"><span className="hl">WACC</span><b>{pc(V.P.w)}</b></div>
          </div>}
          {layer!=='L0' && layer!=='A0' && st.valuationTaskId && (
            <button type="button" className="gearBtn" style={{ marginLeft: V ? 10 : 'auto', marginRight: 10, width: 30, height: 30 }} title="Firma profili" aria-label="Firma profili" onClick={openProfile}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          )}
        </header>
        {/* Sol rail ile yinelendiği için kaldırıldı — silinmedi, gerekirse geri açılabilir.
        <div className="stepper" role="tablist">
          {LAYERS.map((l,i) => <span key={l.k} className="stepw">{i>0 && <span className="stepline"/>}<button role="tab" className={'step'+(done[l.k]?' done':'')} aria-current={layer===l.k} aria-selected={layer===l.k} onClick={()=>setLayer(l.k)}><i>{l.k}</i>{l.n}</button></span>)}
        </div>
        */}
        <main className="work">
          {layer==='A0' && <Onboarding onDone={() => setLayer('L0')} />}
          {layer==='L0' && <I.L0Tasks {...ctx} />}
          {layer==='L1' && <I.L1Inputs {...ctx} />}
          {layer==='L2' && <I.L2Mapping {...ctx} />}
          {layer==='L3' && <S.L3Balance {...ctx} />}
          {layer==='L4' && <S.L4Income {...ctx} />}
          {layer==='L5' && <Val.L5Assumptions {...ctx} />}
          {layer==='L6' && <Val.L6Valuation {...ctx} />}
          {layer==='L7' && <Val.L7Audit {...ctx} />}
        </main>
      </div>

      <button type="button" className={'rightColToggle'+(rightOpen?'':' collapsed')} style={{ right: rightOpen ? 'var(--insp)' : 0 }} aria-label={rightOpen?'Sağ paneli gizle':'Sağ paneli göster'} onClick={()=>setRightOpen(v=>!v)}>{rightOpen?'›':'‹'}</button>
      <aside className={'rightCol'+(rightOpen?'':' collapsed')} aria-label="Sağ panel" ref={setRightColEl}></aside>
    </div>
    {printing && createPortal(
      <div className="print-report-root vp-root">
        <div className="report-cover">
          <img src={logo} alt="Finvestima" className="report-cover-logo" />
          <h1>{st.company || 'Firma'} değerleme raporu</h1>
          <p>{new Date().toLocaleDateString('tr-TR')} · Tutarlar bin USD</p>
        </div>
        <S.L3Balance {...ctx} print />
        <div className="print-page">
          <img src={logo} alt="Finvestima" className="print-logo" />
          <S.L4Income {...ctx} print />
        </div>
        <div className="print-page"><Val.L5Assumptions {...ctx} print /></div>
        <div className="print-page"><Val.L6Valuation {...ctx} print /></div>
        <div className="print-page"><Val.PrintAssumptions {...ctx} /></div>
        <div className="print-page"><Val.L7Audit {...ctx} print /></div>
      </div>,
      document.body
    )}
    {profileOpen && createPortal(
      <CompanyProfileDialog valuationTaskId={st.valuationTaskId} initial={st.companyProfile} onClose={()=>setProfileOpen(false)} onSaved={p=>up({ companyProfile:p, company:p.companyName })} />,
      document.body
    )}
    </RightColContext.Provider>
  );
}

function CompanyProfileDialog({ valuationTaskId, initial, onClose, onSaved }){
  const [updateCompanyProfile, { isLoading: saving }] = useUpdateCompanyProfileMutation();
  const [companyName, setCompanyName] = useState(initial?.name || '');
  const [website, setWebsite] = useState(initial?.website || '');
  const [sector, setSector] = useState(initial?.sector || '');
  const [subSector, setSubSector] = useState(initial?.subSector || '');
  const [employees, setEmployees] = useState(initial?.employees || '');
  const [revenue, setRevenue] = useState(initial?.revenue || '');
  const [purpose, setPurpose] = useState(initial?.purpose || '');
  const [reportEmail, setReportEmail] = useState(initial?.reportEmail || '');
  const [contactFullName, setContactFullName] = useState(initial?.contactFullName || '');
  const [contactRole, setContactRole] = useState(initial?.contactRole || '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone || '');
  const [err, setErr] = useState('');
  const sectorObj = SECTORS.find(s => s.k === sector);
  const f = findSub(sector, subSector);
  const save = async () => {
    if (!companyName.trim()) { setErr('Firma unvanı zorunlu.'); return; }
    setErr('');
    try {
      const r = await updateCompanyProfile({ valuationTaskId, companyName, website, sector, subSector, employees, revenue, purpose, reportEmail, contactFullName, contactRole, contactPhone }).unwrap();
      onSaved({ name:r.companyName, website:r.website, sector:r.sector, subSector:r.subSector, employees:r.employees, revenue:r.revenue, purpose:r.purpose, reportEmail:r.reportEmail, contactFullName:r.contactFullName, contactRole:r.contactRole, contactPhone:r.contactPhone, companyName:r.companyName });
      onClose();
    } catch(e){ setErr(e?.data || e?.message || 'Kaydedilemedi.'); }
  };
  return (
    <div className="vp-root">
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cpdlg" onMouseDown={e=>{ if (e.target===e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ maxWidth: 760 }}>
        <h2 id="cpdlg">Firma profili</h2>
        <p className="sub">Bu değerlemenin firma ve sektör bilgilerini düzenleyin.</p>
        <div className="row2">
          <label className="fld"><span>Firma unvanı</span>
            <input value={companyName} onChange={e=>setCompanyName(e.target.value)} /></label>
          <label className="fld"><span>Firma web sitesi</span>
            <input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="firmaniz.com.tr" /></label>
        </div>
        <div className="row2">
          <label className="fld"><span>Sektör</span>
            <select value={sector} onChange={e=>{ setSector(e.target.value); setSubSector(''); }}>
              <option value="">Seçin…</option>{SECTORS.map(s=><option key={s.k} value={s.k}>{s.n}</option>)}
            </select></label>
          <label className="fld"><span>Alt sektör</span>
            <select value={subSector} onChange={e=>setSubSector(e.target.value)} disabled={!sectorObj}>
              <option value="">Seçin…</option>{sectorObj?.subs.map(s=><option key={s.k} value={s.k}>{s.n}</option>)}
            </select></label>
        </div>
        <div className="row3" style={{ gridTemplateColumns: '0.8fr 0.8fr 1.4fr' }}>
          <label className="fld"><span>Çalışan sayısı</span>
            <select value={employees} onChange={e=>setEmployees(e.target.value)}><option value="">Seçin…</option>{EMPLOYEES.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="fld"><span>Yıllık ciro</span>
            <select value={revenue} onChange={e=>setRevenue(e.target.value)}><option value="">Seçin…</option>{REVENUE.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="fld"><span>Değerleme amacı</span>
            <select value={purpose} onChange={e=>setPurpose(e.target.value)}><option value="">Seçin…</option>{PURPOSES.map(x=><option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="row2">
          <label className="fld"><span>İletişim kişisi (ad soyad)</span>
            <input value={contactFullName} onChange={e=>setContactFullName(e.target.value)} /></label>
          <label className="fld"><span>Görev</span>
            <select value={contactRole} onChange={e=>setContactRole(e.target.value)}><option value="">Seçin…</option>{ROLES.map(x=><option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="row2">
          <label className="fld"><span>Rapor gönderilecek e-posta</span>
            <input type="email" value={reportEmail} onChange={e=>setReportEmail(e.target.value)} /></label>
          <label className="fld"><span>Telefon</span>
            <input type="tel" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} /></label>
        </div>
        {f && <div className="shint">{`Bu alt sektör için başlangıç varsayımları: kaldıraçsız beta ${f.sub.betaU.toFixed(2).replace('.',',')}, EV / FAVÖK ${(f.sub.mult[1]*0.7).toFixed(2).replace('.',',')}x (Türkiye iskontolu medyan).`}</div>}
        {err && <div className="ferr box" role="alert">{err}</div>}
        <div className="actions"><button className="btn big" onClick={save} disabled={saving}>{saving?'Kaydediliyor…':'Kaydet'}</button><button className="lnk" onClick={onClose}>Vazgeç</button></div>
      </div>
    </div>
    </div>
  );
}

