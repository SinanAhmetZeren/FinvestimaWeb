"use client";
/* ============================================================
   Tek kaynak: tüm ekranlar durumu buradan okur, buraya yazar.
   compute() saf olduğu için sonuç useMemo ile türetilir.
   ============================================================ */
import { createContext, useContext, useMemo, useState } from "react";
import {
  compute, DEFAULT_ASSUMPTIONS, ebitdaY0, marginY0,
} from "../lib/model";
import {
  ADDBACKS, DIMS, FINDINGS, PEERS, SOURCES, TRIAL,
} from "../lib/data";

const clone = (v) => JSON.parse(JSON.stringify(v));

const C = createContext(null);
export const useValuator = () => {
  const v = useContext(C);
  if (!v) throw new Error("useValuator, ValuatorProvider içinde çağrılmalı");
  return v;
};

export function ValuatorProvider({ children }) {
  const [layer, setLayer] = useState("L1");
  const [a, setAState] = useState(DEFAULT_ASSUMPTIONS);
  const [addbacks, setAddbacks] = useState(() => clone(ADDBACKS));
  const [sources, setSources] = useState(() => clone(SOURCES));
  const [trial, setTrial] = useState(() => clone(TRIAL));
  const [peers, setPeers] = useState(() => clone(PEERS));
  const [findings, setFindings] = useState(() => clone(FINDINGS));

  const setA = (p) => setAState((s) => ({ ...s, ...p }));
  const resetDrivers = () =>
    setAState((s) => ({ ...s, growth: 0.11, expansion: 5.7, capexPct: 0.055, nwcPct: 0.3, taxRate: 0.25 }));

  const toggleAddback = (k) =>
    setAddbacks((s) => s.map((x) => (x.k === k ? { ...x, on: !x.on } : x)));

  const receiveMissing = () =>
    setSources((s) => {
      const i = s.findIndex((x) => !x.ok);
      if (i < 0) return s;
      const n = [...s];
      n[i] = { ...n[i], ok: true, status: "Alındı", vol: "9 varsayım" };
      return n;
    });

  const toggleGroup = (i) =>
    setTrial((s) => s.map((g, gi) => (gi === i ? { ...g, open: !g.open } : g)));

  const setMapping = (gi, ki, v) =>
    setTrial((s) =>
      s.map((g, i) => {
        if (i !== gi) return g;
        if (ki < 0) return { ...g, map: v };
        return { ...g, kids: g.kids.map((k, j) => (j === ki ? { ...k, map: v } : k)) };
      })
    );

  const applySuggested = () =>
    setTrial((s) =>
      s.map((g) => ({
        ...g,
        map: g.unm && !g.map ? (g.sug ?? g.map) : g.map,
        kids: g.kids.map((k) => (k.unm && !k.map ? { ...k, map: k.sug ?? k.map } : k)),
      }))
    );

  const clearMappings = () =>
    setTrial((s) =>
      s.map((g) => ({
        ...g,
        map: g.unm ? "" : g.map,
        kids: g.kids.map((k) => (k.unm ? { ...k, map: "" } : k)),
      }))
    );

  const unmappedCount = useMemo(
    () =>
      trial.reduce(
        (acc, g) => acc + (g.unm && !g.map ? 1 : 0) + g.kids.filter((k) => k.unm && !k.map).length,
        0
      ),
    [trial]
  );

  const togglePeer = (i) =>
    setPeers((s) => s.map((p, j) => (j === i ? { ...p, on: !p.on } : p)));

  const toggleFinding = (i) =>
    setFindings((s) => s.map((f, j) => (j === i ? { ...f, done: !f.done } : f)));

  const setAllFindings = (done) => setFindings((s) => s.map((f) => ({ ...f, done })));

  const result = useMemo(() => compute(a, addbacks), [a, addbacks]);
  const rawResult = useMemo(() => compute(a, addbacks, { mode: "raw" }), [a, addbacks]);
  const ebitda0 = useMemo(() => ebitdaY0(addbacks), [addbacks]);
  const margin0 = useMemo(() => marginY0(a, addbacks), [a, addbacks]);

  const scores = useMemo(() => {
    const s = {};
    DIMS.forEach((d) => (s[d.k] = d.b));
    findings.forEach((f) => {
      if (f.done) {
        const max = DIMS.find((d) => d.k === f.dim).max;
        s[f.dim] = Math.min(max, s[f.dim] + f.dl);
      }
    });
    if (!addbacks.find((x) => x.k === "a3")?.on) s.norm = Math.min(9, s.norm + 1);
    if (!a.sameK) s.veri = Math.max(4, s.veri - 3);
    return s;
  }, [findings, addbacks, a.sameK]);

  const score = useMemo(() => DIMS.reduce((acc, d) => acc + scores[d.k] * d.w, 0), [scores]);
  const openFindings = findings.filter((f) => !f.done && f.sev !== "Kanıt").length;

  return (
    <C.Provider
      value={{
        layer, setLayer, a, setA, resetDrivers,
        addbacks, toggleAddback, sources, receiveMissing,
        trial, toggleGroup, setMapping, applySuggested, clearMappings, unmappedCount,
        peers, togglePeer, findings, toggleFinding, setAllFindings,
        result, rawResult, ebitda0, margin0, scores, score, openFindings,
      }}
    >
      {children}
    </C.Provider>
  );
}
