"use client";
import { useValuator } from "../store/valuator";
import { LAYERS } from "../lib/data";
import { nf, pf } from "../lib/format";

export function Rail() {
  const v = useValuator();
  const meta = {
    L1: `${v.sources.filter((s) => s.ok).length} kaynak`,
    L2: v.unmappedCount ? `${v.unmappedCount} eşleşmemiş` : "harita tam",
    L3: `${v.addbacks.filter((a) => a.on).length} geri ekleme`,
    L4: "Y0 taban",
    L5: `5 yıl · ${pf(v.a.growth)}`,
    L6: nf(v.result.v1),
    L7: v.openFindings ? `${v.openFindings} açık bulgu` : "bulgu kalmadı",
  };
  const done = {
    L1: v.sources.every((s) => s.ok), L2: !v.unmappedCount, L3: true,
    L4: true, L5: true, L6: true, L7: !v.openFindings,
  };

  return (
    <nav className="rail" aria-label="Motor katmanları">
      <div className="brand">
        <svg width="24" height="23" viewBox="0 0 60 56" aria-hidden="true">
          <path d="M6 6 L30 50 L54 6" stroke="#B8862B" strokeWidth="6" strokeLinejoin="round" fill="none" />
          <path d="M6 6 L44 18 L30 50 L14 26 Z" stroke="#B8862B" strokeWidth="1.1" fill="none" opacity=".7" />
          <circle cx="6" cy="6" r="2.6" fill="#B8862B" /><circle cx="44" cy="18" r="2.6" fill="#B8862B" />
        </svg>
        <div><b>VALUATOR</b><span>YAPAY ZEKA DESTEKLİ DEĞERLEME</span></div>
      </div>
      <div className="rlabel">Dosya · Örnek Vaka</div>
      <ul className="layers">
        {LAYERS.map((l) => (
          <li key={l.id}>
            <button className={`layer${done[l.id] ? " ok" : ""}`} aria-current={v.layer === l.id}
              onClick={() => v.setLayer(l.id)}>
              <span className="lc">{l.id}</span>
              <span><span className="ln">{l.name}</span><span className="lm">{meta[l.id]}</span></span>
            </button>
          </li>
        ))}
      </ul>
      <div className="rfoot">
        <span className="pill">#GİZLİ#</span><br />Anonim örnek vaka<br />Endüstriyel üretim
      </div>
    </nav>
  );
}
