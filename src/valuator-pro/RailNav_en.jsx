const LAYERS = [
  { k:'L0', n:'Tasks', m:'Valuation selection' },
  { k:'L1', n:'Inputs', m:'File intake, FX rates' },
  { k:'L2', n:'Trial balance & mapping', m:'Chart of accounts check' },
  { k:'L3', n:'Balance sheet summary', m:'TRY, USD, ratios' },
  { k:'L4', n:'Income statement', m:'Normalized EBITDA' },
  { k:'L5', n:'Assumptions', m:'Projection drivers' },
  { k:'L6', n:'Valuation', m:'Three methods' },
  { k:'L7', n:'Audit & output', m:'Findings, report' },
];

export default function RailNavEn({ layer, setLayer, done, taskSelected }){
  return (
    <nav className="rail" aria-label="Layers">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="1" y="1" width="24" height="24" rx="5" fill="none" stroke="#B8862B" strokeWidth="1.5"/><path d="M7 8l6 11 6-11" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
        <div><b>VALUATOR</b><span>Company valuation engine</span></div>
      </div>
      <ol className="layers">
        {LAYERS.map(l => {
          const locked = l.k !== 'L0' && !taskSelected;
          return (
          <li key={l.k}>
            <button className={'layer'+(done[l.k]?' ok':'')} aria-current={layer===l.k} disabled={locked} onClick={()=>!locked && setLayer(l.k)}>
              <span className="lc">{l.k}</span>
              <span><span className="ln">{l.n}</span><span className="lm">{l.m}</span></span>
            </button>
          </li>
          );
        })}
      </ol>
      <div className="rfoot">
        <div className="flow"><span>Input</span><i/><span>Processing</span><i/><span>Output</span></div>
      </div>
    </nav>
  );
}
