"use client";
import { Fragment } from "react";
import { useValuator } from "../store/valuator";
import { LAYERS } from "../lib/data";

export function Stepper() {
  const v = useValuator();
  const done = (id) =>
    (id === "L2" && !v.unmappedCount) || (id === "L7" && !v.openFindings) ||
    (id !== "L2" && id !== "L7" && (id !== "L1" || v.sources.every((s) => s.ok)));
  return (
    <div className="stepper">
      {LAYERS.map((l, i) => (
        <Fragment key={l.id}>
          {i > 0 && <span className="stepline" />}
          <button className={`step${done(l.id) ? " done" : ""}`} aria-current={v.layer === l.id}
            onClick={() => v.setLayer(l.id)}>
            <i>{done(l.id) ? "✓" : l.id.slice(1)}</i>{l.name}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
