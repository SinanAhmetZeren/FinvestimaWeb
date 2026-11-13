import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Panel } from '../ui.jsx';
import { SECTORS, findSub } from '../../data/onboardingSectors.js';
import { auth, domainCheck, hostOf } from './api.js';
import { AUTH } from './onboardingConfig.js';

export const EMPLOYEES = ['1–9','10–49','50–249','250–999','1.000 ve üzeri'];
export const REVENUE = ['5 milyon $ altı','5–25 milyon $','25–100 milyon $','100 milyon $ üzeri'];
export const PURPOSES = ['Hisse satışı ya da ortak girişi','Yatırım turu','Kredi ve finansman','Birleşme ve satın alma','Yönetim planlaması ve performans','Ortaklık yapılanması ve miras','Diğer'];
export const ROLES = ['Şirket ortağı / yönetim kurulu','Genel müdür','Finans direktörü (CFO)','Finans / muhasebe yöneticisi','Danışman','Diğer'];

// A0: kullanıcı zaten login olmuş durumda (kendi şifresiyle) geliyor — burada hesap/şifre
// değil, yeni değerlenecek FİRMA ve raporun gönderileceği e-posta toplanıyor. Doğrulama kodu
// bu rapor e-postasına değil, kullanıcının giriş yaptığı hesabın e-postasına gönderilir.
const STEPS = ['Firma bilgileri','Rapor e-postası','Doğrulama'];

export default function Onboarding({ onDone }){
  const loginEmail = useSelector(s => s.users.email);
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ companyName:'', website:'', sector:'', subSector:'', employees:'', revenue:'', purpose:'',
    name:'', role:'', reportEmail:'', phone:'', kvkk:false, marketing:false });
  const [touched, setTouched] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { draft, demoCode }
  const set = (k, v) => setF(s => ({ ...s, [k]: v, ...(k==='sector' ? { subSector:'' } : {}) }));
  const touch = k => setTouched(t => ({ ...t, [k]: true }));

  const sector = SECTORS.find(s => s.k === f.sector);
  const host = hostOf(f.website);
  const dc = f.reportEmail ? domainCheck(f.reportEmail, f.website) : null;

  const e1 = {
    companyName: f.companyName.trim().length < 2 && 'Firma unvanını girin.',
    website: !host && 'Geçerli bir web sitesi adresi girin, örneğin firmaniz.com.tr',
    sector: !f.sector && 'Sektör seçin.',
    subSector: !f.subSector && 'Alt sektör seçin.',
  };
  const e2 = {
    name: f.name.trim().split(/\s+/).length < 2 && 'Adınızı ve soyadınızı girin.',
    reportEmail: !(dc?.ok) && (dc?.msg || 'Raporun gönderileceği e-posta adresini girin.'),
    kvkk: !f.kvkk && 'Devam etmek için aydınlatma metnini onaylayın.',
  };
  const valid = o => Object.values(o).every(v => !v);
  const showErr = (o, k) => (touched[k] || touched._all) && o[k] ? <span className="ferr" role="alert">{o[k]}</span> : null;

  const next = () => { setTouched(t => ({ ...t, _all:true })); if (valid(e1)){ setTouched({}); setStep(1); setErr(''); } };
  const startTask = async () => {
    setTouched(t => ({ ...t, _all:true })); if (!valid(e2)) return;
    setBusy(true); setErr('');
    const draft = { name:f.name.trim(), role:f.role, reportEmail:f.reportEmail.trim().toLowerCase(), phone:f.phone.trim(),
      consents:{ kvkk:f.kvkk, marketing:f.marketing, at:new Date().toISOString() },
      company:{ name:f.companyName.trim(), website:host, sector:f.sector, subSector:f.subSector, employees:f.employees, revenue:f.revenue, purpose:f.purpose } };
    try {
      const r = await auth.startTask(draft);
      setPending({ draft, demoCode:r.demoCode }); setStep(2);
    } catch(e){ setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="left">
      <Panel title="Yeni firma değerlemesi" sub="Mizanınızı ya da beyannamenizi yükleyin; bilanço özetleri, normalize FAVÖK ve üç yöntemli değerleme dakikalar içinde hazır olsun.">
          <ol className="auth-steps" aria-label="Yeni task adımları">
            {STEPS.map((s,i) => <li key={s} className={i<step?'done':i===step?'cur':''} aria-current={i===step?'step':undefined}><i>{i<step?'✓':i+1}</i>{s}</li>)}
          </ol>

          {step===0 && (<form onSubmit={e=>{ e.preventDefault(); next(); }} noValidate>
            <h2>Firmanızı tanıyalım</h2>
            <p className="sub">Sektör seçiminiz beta, emsal çarpanlar ve karşılaştırmalar için kullanılır. Daha sonra profilinizden değiştirebilirsiniz.</p>
            <label className="fld"><span>Firma unvanı</span>
              <input value={f.companyName} onChange={e=>set('companyName',e.target.value)} onBlur={()=>touch('companyName')} autoComplete="organization" placeholder="Örnek Sanayi A.Ş." />
              {showErr(e1,'companyName')}</label>
            <label className="fld"><span>Firma web sitesi</span>
              <div className="pre"><em>https://</em><input value={f.website} onChange={e=>set('website',e.target.value.replace(/^https?:\/\//i,''))} onBlur={()=>touch('website')} inputMode="url" autoComplete="url" placeholder="firmaniz.com.tr" /></div></label>
            <div className="row2">
              <label className="fld"><span>Sektör</span>
                <select value={f.sector} onChange={e=>set('sector',e.target.value)} onBlur={()=>touch('sector')}>
                  <option value="">Seçin…</option>{SECTORS.map(s=><option key={s.k} value={s.k}>{s.n}</option>)}
                </select>{showErr(e1,'sector')}</label>
              <label className="fld"><span>Alt sektör</span>
                <select value={f.subSector} onChange={e=>set('subSector',e.target.value)} onBlur={()=>touch('subSector')} disabled={!sector}>
                  <option value="">{sector ? 'Seçin…' : 'Önce sektör seçin'}</option>{sector?.subs.map(s=><option key={s.k} value={s.k}>{s.n}</option>)}
                </select>{showErr(e1,'subSector')}</label>
            </div>
            {f.subSector && <SectorHint sector={f.sector} sub={f.subSector} />}
            <div className="row3">
              <label className="fld"><span>Çalışan sayısı <small>isteğe bağlı</small></span>
                <select value={f.employees} onChange={e=>set('employees',e.target.value)}><option value="">Seçin…</option>{EMPLOYEES.map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="fld"><span>Yıllık ciro <small>isteğe bağlı</small></span>
                <select value={f.revenue} onChange={e=>set('revenue',e.target.value)}><option value="">Seçin…</option>{REVENUE.map(x=><option key={x}>{x}</option>)}</select></label>
              <label className="fld"><span>Değerleme amacı <small>isteğe bağlı</small></span>
                <select value={f.purpose} onChange={e=>set('purpose',e.target.value)}><option value="">Seçin…</option>{PURPOSES.map(x=><option key={x}>{x}</option>)}</select></label>
            </div>
            <div className="actions"><button type="submit" className="btn big">Devam et</button></div>
          </form>)}

          {step===1 && (<form onSubmit={e=>{ e.preventDefault(); startTask(); }} noValidate>
            <h2>Rapor kime gidecek?</h2>
            <div className="row2">
              <label className="fld"><span>Ad soyad</span><input value={f.name} onChange={e=>set('name',e.target.value)} onBlur={()=>touch('name')} autoComplete="name" />{showErr(e2,'name')}</label>
              <label className="fld"><span>Görev <small>isteğe bağlı</small></span><select value={f.role} onChange={e=>set('role',e.target.value)}><option value="">Seçin…</option>{ROLES.map(x=><option key={x}>{x}</option>)}</select></label>
            </div>
            <div className="row2">
              <label className="fld"><span>Rapor gönderilecek e-posta</span>
                <input type="email" value={f.reportEmail} onChange={e=>set('reportEmail',e.target.value)} onBlur={()=>touch('reportEmail')} autoComplete="email" placeholder={host ? `adiniz@${host}` : 'adiniz@firmaniz.com.tr'} />
                {(touched.reportEmail || touched._all) && dc ? <span className={dc.ok?'fok':'ferr'} role={dc.ok?undefined:'alert'}>{dc.msg}</span> : showErr(e2,'reportEmail')}</label>
              <label className="fld"><span>Telefon <small>isteğe bağlı</small></span><input type="tel" value={f.phone} onChange={e=>set('phone',e.target.value)} autoComplete="tel" placeholder="+90 5__ ___ __ __" /></label>
            </div>
            <label className="chk"><input type="checkbox" checked={f.kvkk} onChange={e=>set('kvkk',e.target.checked)} />
              <span>Kişisel verilerimin işlenmesine ilişkin <a href="/kvkk" target="_blank" rel="noopener">aydınlatma metnini</a> okudum ve kabul ediyorum.</span></label>
            {showErr(e2,'kvkk')}
            <label className="chk"><input type="checkbox" checked={f.marketing} onChange={e=>set('marketing',e.target.checked)} />
              <span>Değerleme raporları ve sektör bültenleri hakkında e-posta almak istiyorum. <small>İsteğe bağlı</small></span></label>
            {err && <div className="ferr box" role="alert">{err}</div>}
            <div className="actions"><button type="submit" className="btn big" disabled={busy}>{busy?'Gönderiliyor…':'Doğrulama kodu gönder'}</button>
              <button type="button" className="lnk" onClick={()=>setStep(0)}>Firma bilgilerine dön</button></div>
            <p className="muted" style={{ marginTop: 10, fontSize: 13, textAlign: 'left' }}>Kod, giriş yaptığınız hesabın e-postasına <b style={{ color: 'var(--navy)' }}>({loginEmail})</b> gönderilecek.</p>
          </form>)}

          {step===2 && pending && <Verify pending={pending} setPending={setPending} onDone={onDone} onBack={()=>setStep(1)} />}
      </Panel>
    </div>
  );
}

function SectorHint({ sector, sub }){
  const r = findSub(sector, sub); if (!r) return null;
  const [lo,med,hi] = r.sub.mult;
  return <div className="shint">{`Bu alt sektör için başlangıç varsayımları: kaldıraçsız beta ${r.sub.betaU.toFixed(2).replace('.',',')}, global EV / FAVÖK ${lo.toString().replace('.',',')}x – ${hi.toString().replace('.',',')}x (medyan ${med.toString().replace('.',',')}x). Türkiye'deki halka açık olmayan firmalar için ülke ve likidite iskontosu uygulanır.`}</div>;
}

function Verify({ pending, setPending, onDone, onBack }){
  const [d, setD] = useState(['','','','','','']);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(AUTH.resendSeconds);
  const refs = useRef([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => { if (left<=0) return; const t = setTimeout(()=>setLeft(l=>l-1), 1000); return ()=>clearTimeout(t); }, [left]);
  const code = d.join('');
  const submit = async c => {
    setBusy(true); setErr('');
    try { const r = await auth.confirmTask(pending.draft, c); onDone(r); }
    catch(e){ setErr(e.message); setD(['','','','','','']); refs.current[0]?.focus(); }
    setBusy(false);
  };
  const put = (i, v) => {
    const digits = v.replace(/\D/g,''); if (!digits && v!=='') return;
    const n = [...d];
    if (digits.length > 1){ digits.slice(0,6-i).split('').forEach((ch,j)=> n[i+j]=ch); setD(n); const nx = Math.min(5, i+digits.length); refs.current[nx]?.focus(); if (n.join('').length===6) submit(n.join('')); return; }
    n[i] = digits; setD(n);
    if (digits && i<5) refs.current[i+1]?.focus();
    if (n.join('').length===6) submit(n.join(''));
  };
  const resend = async () => {
    setErr('');
    try { const r = await auth.resendTaskCode(pending.draft); setPending(p => ({ ...p, demoCode: r.demoCode })); setLeft(AUTH.resendSeconds); }
    catch(e){ setErr(e.message); }
  };
  return (
    <form onSubmit={e=>{ e.preventDefault(); if (code.length===6) submit(code); }}>
      <h2>Devam etmek için doğrulayın</h2>
      <p className="sub">Giriş yaptığınız hesabın e-posta adresine 6 haneli bir kod gönderdik. Kod 15 dakika geçerlidir. Gelen kutunuzda yoksa istenmeyen klasörünü kontrol edin.</p>
      <div className="otp" role="group" aria-label="Doğrulama kodu" style={{ justifyContent: 'center' }}>
        {d.map((x,i) => <input key={i} ref={el=>refs.current[i]=el} value={x} inputMode="numeric" autoComplete={i===0?'one-time-code':'off'} maxLength={6} aria-label={`${i+1}. hane`}
          onChange={e=>put(i,e.target.value)} onKeyDown={e=>{ if(e.key==='Backspace' && !d[i] && i>0) refs.current[i-1]?.focus(); }} onPaste={e=>{ e.preventDefault(); put(i, e.clipboardData.getData('text')); }} />)}
      </div>
      {err && <div className="ferr box" role="alert">{err}</div>}
      <div className="actions" style={{ justifyContent: 'center' }}><button type="submit" className="btn big" disabled={busy || code.length<6}>{busy?'Doğrulanıyor…':'Doğrula ve task\'ı oluştur'}</button></div>
      <p className="resend">{left>0 ? `Yeni kodu ${left} saniye sonra isteyebilirsiniz.` : <button type="button" className="lnk" onClick={resend}>Yeni kod gönder</button>}
        {' · '}<button type="button" className="lnk" onClick={onBack}>Bilgileri değiştir</button></p>
    </form>
  );
}
