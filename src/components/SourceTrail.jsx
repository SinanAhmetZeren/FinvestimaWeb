"use client";
/* Kaynak izi: bir tutara tıklandığında geldiği mizan satırını gösterir.
   Ürünün "denetlenebilirlik" vaadinin arayüzdeki karşılığı. */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { TRAILS } from "../lib/data";

const C = createContext(() => {});
export const useTrail = () => useContext(C);

export function TrailProvider({ children }) {
  const [pos, setPos] = useState(null);

  const open = useCallback((key, el) => {
    if (!TRAILS[key]) return;
    const r = el.getBoundingClientRect();
    const h = 210;
    const top = r.bottom + 8 + h > window.innerHeight - 10 ? Math.max(10, r.top - h - 8) : r.bottom + 8;
    setPos({ key, top, left: Math.max(10, Math.min(r.left, window.innerWidth - 298)) });
  }, []);

  useEffect(() => {
    const close = () => setPos(null);
    const esc = (e) => e.key === "Escape" && setPos(null);
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, []);

  const d = pos ? TRAILS[pos.key] : null;
  return (
    <C.Provider value={open}>
      {children}
      {d && pos && (
        <div id="trail" className="on" role="dialog" style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}>
          <div className="eb">{d.e}</div>
          <h4>{d.t}</h4>
          <ol>{d.r.map(([k, v]) => <li key={k}><span>{k}</span><span>{v}</span></li>)}</ol>
          <footer>{d.f}</footer>
        </div>
      )}
    </C.Provider>
  );
}

/** Kaynağına kadar açılabilen tutar. */
export function Src({ trail, children, color }) {
  const open = useTrail();
  return (
    <button className="src" style={color ? { borderBottomColor: color } : undefined}
      onClick={(e) => { e.stopPropagation(); open(trail, e.currentTarget); }}>
      {children}
    </button>
  );
}
