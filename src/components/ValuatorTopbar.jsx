"use client";
import { useValuator } from "../store/valuator";
import { LAYERS } from "../lib/data";
import { nf } from "../lib/format";

export function Topbar() {
  const v = useValuator();
  const l = LAYERS.find((x) => x.id === v.layer);
  return (
    <div className="topbar">
      <div>
        <div className="crumb">{l.id} &nbsp;/&nbsp; <b>{l.name}</b></div>
        <h1>{l.title}</h1>
      </div>
      <div className="tbr">
        <div className="chip">USD <b>&apos;000</b></div>
        <div className="chip">V1 <b>{nf(v.result.v1)}</b></div>
        <div className="seg warn" role="group" aria-label="Model modu">
          <button aria-pressed={v.a.mode === "raw"} onClick={() => v.setA({ mode: "raw" })}>Ham model</button>
          <button aria-pressed={v.a.mode === "fix"} onClick={() => v.setA({ mode: "fix" })}>Düzeltilmiş</button>
        </div>
      </div>
    </div>
  );
}
