"use client";
/* Paylaşılan arayüz parçaları: rozet, durum, bar, sparkline, panel, segment. */

export function Tag({ children, tone }) {
  return <span className={`tag${tone ? " " + tone : ""}`}>{children}</span>;
}

export function Stat({ state, children }) {
  return <span className={`stat ${state}`}><i />{children}</span>;
}

export function Bar({ w, color }) {
  return <span className="bar" style={{ width: `${Math.max(0, w).toFixed(0)}px`, background: color }} />;
}

export function Sparkline({ values, color }) {
  const w = 54, h = 14;
  const mn = Math.min(...values), mx = Math.max(...values), rg = mx - mn || 1;
  const pts = values.map((v, i) => [2 + (i * (w - 4)) / (values.length - 1), h - 2 - ((v - mn) / rg) * (h - 4)]);
  return (
    <svg width={w} height={h} style={{ verticalAlign: "middle" }} aria-hidden="true">
      <polyline points={pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
        fill="none" stroke={color} strokeWidth={1.4} />
      <circle cx={pts[pts.length - 1][0].toFixed(1)} cy={pts[pts.length - 1][1].toFixed(1)} r={1.8} fill={color} />
    </svg>
  );
}

export function Panel({ title, tag, sub, right, flush = true, children }) {
  return (
    <section className="panel">
      <header>
        <h2>{title}</h2>
        {tag}
        {sub && <span className="sub">{sub}</span>}
        {right && <span className="right">{right}</span>}
      </header>
      <div className={`pbody${flush ? " flush scroll" : ""}`}>{children}</div>
    </section>
  );
}

export function Segmented({ value, options, onChange, size }) {
  return (
    <div className={`seg${size === "sm" ? " sm" : ""}`} role="group">
      {options.map(([v, label]) => (
        <button key={v} aria-pressed={v === value} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

export function Note({ tone, children }) {
  return <div className={`note${tone ? " " + tone : ""}`}>{children}</div>;
}
