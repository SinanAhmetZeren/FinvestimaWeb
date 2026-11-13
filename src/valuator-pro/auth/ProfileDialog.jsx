import { useState, useEffect, useRef } from 'react';
import { SECTORS, findSub } from '../data/sectors.js';
import { auth } from './api.js';
import { EMPLOYEES, REVENUE, PURPOSES } from './Onboarding.jsx';
import { Tx } from '../Term.jsx';

export default function ProfileDialog({ session, onClose, onSaved }){
  const c0 = session.user.company || {};
  const [c, setC] = useState({ ...c0 });
  const [apply, setApply] = useState(true);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const ref = useRef();
  useEffect(() => { ref.current?.querySelector('select')?.focus(); const k = e => e.key==='Escape' && onClose(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  const sector = SECTORS.find(s=>s.k===c.sector);
  const changed = c.sector!==c0.sector || c.subSector!==c0.subSector;
  const f = findSub(c.sector, c.subSector);
  const save = async () => {
    if (!c.sector || !c.subSector){ setErr('Sektör ve alt sektör seçin.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await auth.updateProfile(session.user.email, c, session.token);
      const user = r.user || { ...session.user, company: c };
      onSaved({ ...session, user }, changed && apply);
    } catch(e){ setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pdlg" onMouseDown={e=>{ if (e.target===e.currentTarget) onClose(); }}>
      <div className="mbox" ref={ref}>
        <h2 id="pdlg">Firma profili</h2>
        <p className="sub">{c0.name} · {c0.website}. Unvan ve alan adı doğrulanmış üyelikle bağlıdır; değiştirmek için destek ekibine yazın.</p>
        <div className="row2">
          <label className="fld"><span>Sektör</span><select value={c.sector||''} onChange={e=>setC({...c, sector:e.target.value, subSector:''})}><option value="">Seçin…</option>{SECTORS.map(s=><option key={s.k} value={s.k}>{s.n}</option>)}</select></label>
          <label className="fld"><span>Alt sektör</span><select value={c.subSector||''} onChange={e=>setC({...c, subSector:e.target.value})} disabled={!sector}><option value="">Seçin…</option>{sector?.subs.map(s=><option key={s.k} value={s.k}>{s.n}</option>)}</select></label>
        </div>
        <div className="row3">
          <label className="fld"><span>Çalışan sayısı</span><select value={c.employees||''} onChange={e=>setC({...c, employees:e.target.value})}><option value="">Seçin…</option>{EMPLOYEES.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="fld"><span>Yıllık ciro</span><select value={c.revenue||''} onChange={e=>setC({...c, revenue:e.target.value})}><option value="">Seçin…</option>{REVENUE.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="fld"><span>Değerleme amacı</span><select value={c.purpose||''} onChange={e=>setC({...c, purpose:e.target.value})}><option value="">Seçin…</option>{PURPOSES.map(x=><option key={x}>{x}</option>)}</select></label>
        </div>
        {changed && f && <label className="chk"><input type="checkbox" checked={apply} onChange={e=>setApply(e.target.checked)} />
          <span><Tx>{`Yeni alt sektörün varsayımlarını mevcut değerlemeye uygula: kaldıraçsız beta ${f.sub.betaU.toFixed(2).replace('.',',')}, EV / FAVÖK ${(f.sub.mult[1]*0.7).toFixed(2).replace('.',',')}x (Türkiye iskontolu medyan).`}</Tx></span></label>}
        {err && <div className="ferr box" role="alert">{err}</div>}
        <div className="actions"><button className="btn big" onClick={save} disabled={busy}>{busy?'Kaydediliyor…':'Profili kaydet'}</button><button className="lnk" onClick={onClose}>Vazgeç</button></div>
      </div>
    </div>
  );
}
