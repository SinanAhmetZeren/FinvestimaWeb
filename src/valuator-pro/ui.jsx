import { useState, useEffect } from 'react';

export const nf = (x, d=0) => { if (x==null||!isFinite(x)) return '—'; const r = Math.abs(x) < 0.5*Math.pow(10,-d) ? 0 : Number(x); return r.toLocaleString('tr-TR',{minimumFractionDigits:d, maximumFractionDigits:d}); };
export const par = (x, d=0) => (x==null||!isFinite(x)) ? '—' : x <= -0.5*Math.pow(10,-d) ? '('+nf(-x,d)+')' : nf(x,d);
export const pc = (x, d=1) => (x==null||!isFinite(x)) ? '—' : '%'+nf(x*100,d);
export const mx = (x, d=1) => (x==null||!isFinite(x)) ? '—' : nf(x,d)+'x';
export const mUsd = x => (x==null||!isFinite(x)) ? '—' : nf(x/1000, 1)+' M$';

export function Panel({ title, sub, right, children, flush, id }){
  return (
    <section className="panel" id={id}>
      {(title||right) && <header><h2>{title}</h2>{sub && <span className="sub">{sub}</span>}{right && <div className="right">{right}</div>}</header>}
      <div className={flush ? 'pbody flush' : 'pbody'}>{children}</div>
    </section>
  );
}

export function Seg({ value, options, onChange, small }){
  return (
    <div className={'seg'+(small?' sm':'')} role="group">
      {options.map(o => <button key={String(o.v)} type="button" aria-pressed={value===o.v} onClick={()=>onChange(o.v)}>{o.l}</button>)}
    </div>
  );
}

export function Toggle({ checked, onChange, title, desc }){
  return (
    <label className="tog">
      <input type="checkbox" checked={!!checked} onChange={e=>onChange(e.target.checked)} />
      <span><span className="t">{title}</span>{desc && <span className="d">{desc}</span>}</span>
    </label>
  );
}

// Sayısal giriş: yüzde ya da düz değer; adım düğmeli
export function NumField({ label, value, onChange, step=0.005, pct=false, unit, min=-1e12, max=1e12, digits, hint }){
  const show = v => pct ? nf(v*100, digits ?? 1) : nf(v, digits ?? 2);
  const [txt, setTxt] = useState(show(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync display text only when the underlying value changes, not on every format-function identity change
  useEffect(()=>{ setTxt(show(value)); }, [value]);
  const commit = s => {
    const n = parseFloat(String(s).replace(/\./g,'').replace(',','.'));
    if (isFinite(n)){ const v = pct ? n/100 : n; onChange(Math.min(max, Math.max(min, v))); } else setTxt(show(value));
  };
  const bump = d => onChange(Math.min(max, Math.max(min, +(value + d).toFixed(6))));
  return (
    <div className="irow">
      <label title={hint}>{label}</label>
      <div className="step2">
        <button type="button" aria-label="Azalt" onClick={()=>bump(-step)}>−</button>
        <input value={txt} onChange={e=>setTxt(e.target.value)} onBlur={e=>commit(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') e.currentTarget.blur(); }} inputMode="decimal" />
        {(pct||unit) && <span className="u">{pct?'%':unit}</span>}
        <button type="button" aria-label="Artır" onClick={()=>bump(step)}>+</button>
      </div>
    </div>
  );
}

export function Range({ label, value, onChange, min, max, step, fmt }){
  return (
    <div className="rng">
      <div className="rng-top"><label>{label}</label><span className="v">{fmt ? fmt(value) : value}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} />
    </div>
  );
}

export function Stat({ kind='ok', children }){ return <span className={'stat '+kind}><i/>{children}</span>; }

export function Tag({ c, children }){ return <span className={'tag '+(c||'')}>{children}</span>; }

export function Empty({ title, children, action }){
  return <div className="empty"><h3>{title}</h3><p>{children}</p>{action}</div>;
}

// Finansal tablo: kolonlar (yıllar) + satırlar
export function FinTable({ head, rows, band, firstLabel='', fmt = par, note }){
  return (
    <div className="scroll">
      <table className="g">
        <thead>
          {band && <tr className="band"><th className="lbl vd"></th>{band.map((b,i)=><th key={i} colSpan={b.span} className={b.cls||''}>{b.l}</th>)}</tr>}
          <tr className={'hd'+(band?'':' solo')}><th className="lbl">{firstLabel}</th>{head.map((h,i)=><th key={i} className={'n '+(h.cls||'')}>{h.l ?? h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i) => r.spacer ? <tr key={i} className="spacer"><td colSpan={head.length+1}></td></tr> : (
            <tr key={i} className={r.cls||''}>
              <td className="lbl">{r.l}{r.tag && <> {r.tag}</>}</td>
              {r.v.map((x,j)=> <td key={j} className={'n'+((typeof x==='number' && x<=-0.5)?' neg':'')+(head[j]?.cls?' '+head[j].cls:'')}>{typeof x==='number' ? (r.f||fmt)(x) : (x ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
        {note && <tfoot><tr><td colSpan={head.length+1}>{note}</td></tr></tfoot>}
      </table>
    </div>
  );
}
