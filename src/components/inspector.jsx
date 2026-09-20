"use client";
/* Sağdaki uyarlama paneli ve içindeki kontrol parçaları. */
import { Fragment } from "react";

export function Inspector({ layer, hero, children, note }) {
  return (
    <aside className="insp">
      {hero}
      <div className="ihead">Uyarlamalar <span>{layer}</span></div>
      {children}
      {note && <div className="inote">{note}</div>}
    </aside>
  );
}

export function IHero({ value, label, sub }) {
  return (
    <div className="ihero">
      <div className="big">{value}</div>
      <div className="lb">{label}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function IBlock({ title, children }) {
  return <div className="iblk"><h4>{title}</h4>{children}</div>;
}

export function IRow({ label, children }) {
  return <div className="irow"><label>{label}</label>{children}</div>;
}

export function IValue({ children, color }) {
  return <span className="v" style={color ? { color } : undefined}>{children}</span>;
}

export function ICalc({ rows }) {
  return (
    <div className="ical">
      {rows.map(([k, v, total], i) => (
        <Fragment key={i}>
          <span className={total ? "k tot" : "k"}>{k}</span>
          <span className={total ? "v tot" : "v"}>{v}</span>
        </Fragment>
      ))}
    </div>
  );
}

export function NumStepper({ value, unit, step, min, max, onChange }) {
  const clamp = (v) => Math.min(max, Math.max(min, +v.toFixed(4)));
  return (
    <div className="step2">
      <button onClick={() => onChange(clamp(value - step))} aria-label="azalt">−</button>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(clamp(v)); }} />
      <button onClick={() => onChange(clamp(value + step))} aria-label="artır">+</button>
      <span className="u">{unit}</span>
    </div>
  );
}

export function Toggle({ checked, onChange, title, desc }) {
  return (
    <label className="tog">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="t">{title}</span><span className="d">{desc}</span></span>
    </label>
  );
}

export function IButton({ children, onClick, variant, disabled }) {
  const cls = variant === "ghost" ? "ibtn ghost" : variant === "teal" ? "ibtn tealb" : "ibtn";
  return <button className={cls} onClick={onClick} disabled={disabled}>{children}</button>;
}
