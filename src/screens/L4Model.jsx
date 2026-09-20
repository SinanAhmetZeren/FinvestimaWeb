"use client";
import { useState } from "react";
import { useValuator } from "../store/valuator";
import { B, HIST, histRow } from "../lib/model";
import { nf, p1, par, pf } from "../lib/format";
import { Panel, Note, Segmented, Sparkline, Bar } from "../components/primitives";
import { Src } from "../components/SourceTrail";
import { Inspector, IBlock, IRow, IValue, ICalc, Toggle } from "../components/inspector";
import { useCrosshair } from "../components/useCrosshair";

export function L4Model() {
  const v = useValuator();
  const [basis, setBasis] = useState("abs");
  const [ovhInCogs, setOvhInCogs] = useState(true);
  const [rd, setRd] = useState(false);
  const [baseYear, setBaseYear] = useState("Y0");
  const ref = useCrosshair();

  const all = [...HIST.map(histRow), v.result.y[0]];
  const rows = [
    ["Net satışlar", (x) => x.rev, "sum", "t600"],
    ["SMM · Malzeme", (x) => -x.mat, "k", "t710"],
    ["SMM · Direkt işçilik", (x) => -x.lab, "k", "t720"],
    ["SMM · Genel üretim", (x) => -x.ovh, "k", "t730"],
    ["Brüt kâr", (x) => x.gross, "sub", null],
    ["Faaliyet giderleri", (x) => -x.opex, "k", null],
    ["FAVÖK (uyarlanmış)", (x) => x.ebitda, "hero", null],
    ["Amortisman", (x) => -x.depShown, "k", null],
    ["FVÖK", (x) => x.ebit, "sub", null],
    ["Faiz gideri", (x) => -x.int, "k", null],
    ["Vergi", (x) => -x.taxAmt, "k", null],
    ["NOPLAT", (x) => x.ebit - x.taxAmt, "sum", null],
  ];
  const cell = (vals, x, i) =>
    basis === "pct" ? p1(Math.abs(x) / all[i].rev) + "%"
    : basis === "yoy" ? (i === 0 ? "—" : ((vals[i] - vals[i - 1]) / Math.abs(vals[i - 1]) > 0 ? "+" : "") + p1((vals[i] - vals[i - 1]) / Math.abs(vals[i - 1])) + "%")
    : par(x);

  return (
    <div className="work">
      <div className="left">
        <Panel title="Normalize gelir tablosu · gerçekleşme" tag={<span className="tag">L4</span>}
          right={<Segmented size="sm" value={basis} onChange={setBasis}
            options={[["abs", "Tutar"], ["pct", "% ciro"], ["yoy", "Δ yıllık"]]} />}>
          <table className="g" ref={ref}>
            <thead>
              <tr className="band"><th className="lbl vd" /><th colSpan={all.length}>GERÇEKLEŞME · USD &apos;000</th><th className="vd" /></tr>
              <tr className="hd"><th className="lbl">Kalem</th>
                {all.map((x, i) => <th key={x.yr} className="n" data-col={i}>{x.yr}</th>)}
                <th className="n" style={{ width: 66 }}>Eğilim</th></tr>
            </thead>
            <tbody>
              {rows.map(([label, fn, kind, trail]) => {
                const vals = all.map(fn);
                return (
                  <tr key={label} className={kind === "k" ? "" : kind}>
                    <td className="lbl">
                      {kind === "k" && <span style={{ display: "inline-block", width: 12 }} />}
                      {trail ? <Src trail={trail}>{label}</Src> : label}
                    </td>
                    {vals.map((x, i) => (
                      <td key={i} className={`n${x < 0 && basis === "abs" ? " neg" : ""}`} data-col={i}>
                        {cell(vals, x, i)}
                      </td>
                    ))}
                    <td className="n"><Sparkline values={vals.map(Math.abs)} color={kind === "hero" ? "#B8862B" : "#33518E"} /></td>
                  </tr>
                );
              })}
              <tr className="dim">
                <td className="lbl">FAVÖK marjı</td>
                {all.map((x, i) => <td key={i} className="n" data-col={i}>{pf(x.margin)}</td>)}
                <td className="n"><Sparkline values={all.map((x) => x.margin)} color="#1B6F55" /></td>
              </tr>
            </tbody>
            <tfoot><tr><td className="lbl">Kaynak</td><td colSpan={all.length + 1}>
              Gerçekleşme mizandan türetildi · Y0 kısmi dönemden yıllıklandırıldı · Tüm tutarlar USD &apos;000
            </td></tr></tfoot>
          </table>
        </Panel>

        <Panel title="FAVÖK köprüsü" sub="Ham kârdan uyarlanmış FAVÖK'e">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Adım</th><th className="n" style={{ width: 96 }}>Tutar</th>
              <th className="n" style={{ width: 84 }}>% ciro</th><th style={{ minWidth: 180 }}>Ölçek</th>
            </tr></thead>
            <tbody>
              {[["Ham FAVÖK", B.ebitdaRaw, "#5B7FC7"],
                ...v.addbacks.filter((a) => a.on).map((a) => [`+ ${a.n}`, a.v, "#2E7D8F"])
              ].map(([n, val, c]) => (
                <tr key={n}>
                  <td className="lbl">{n}</td><td className="n">{nf(val)}</td>
                  <td className="n">{pf(val / B.y0rev)}</td>
                  <td><Bar w={(val / v.ebitda0) * 170} color={c} /></td>
                </tr>
              ))}
              <tr className="hero">
                <td className="lbl">Uyarlanmış FAVÖK · Y0</td><td className="n">{nf(v.ebitda0)}</td>
                <td className="n">{pf(v.ebitda0 / B.y0rev)}</td><td><Bar w={170} color="#B8862B" /></td>
              </tr>
            </tbody>
          </table>
        </Panel>

        {v.a.sameK ? (
          <Note><b>Yıllıklandırma tutarlı.</b> Ciro ve maliyet aynı katsayı ile yıllığa çevrildi; Y0 marjı yapısal
            bir sapma taşımıyor.</Note>
        ) : (
          <Note tone="bad"><b>Yıllıklandırma tutarsız.</b> Ciro ×2,10, maliyet ×2,00 ile çevrildiğinde Y0 marjı
            yaklaşık 0,6 puan yapay olarak yükselir ve bu sapma beş yıl boyunca taşınır. L7 bulgu 04 tetiklendi.</Note>
        )}
      </div>

      <Inspector layer="L4"
        note={<>Üç mercek de bu tabandan beslenir. Taban yanlışsa üç sonuç birden yanlış çıkar — ve birbirini
          doğruluyor gibi görünür.</>}>
        <IBlock title="Maliyet sınırı">
          <Toggle checked={ovhInCogs} onChange={setOvhInCogs} title="Genel üretim gideri SMM'de"
            desc="Kapatılırsa 730 faaliyet giderine taşınır; brüt marj yükselir, FAVÖK değişmez." />
          <Toggle checked={rd} onChange={setRd} title="Ar-Ge'yi aktifleştir"
            desc="750 gider yerine yatırım olarak işlenir." />
        </IBlock>
        <IBlock title="Baz yıl">
          <IRow label="Değerleme baz yılı">
            <Segmented size="sm" value={baseYear} onChange={setBaseYear} options={[["Y-1", "Y-1"], ["Y0", "Y0"]]} />
          </IRow>
          <IRow label="Y0 yıllıklandırma"><IValue>×2,10</IValue></IRow>
          <Toggle checked={v.a.sameK} onChange={(c) => v.setA({ sameK: c })}
            title="Gelir ve gidere aynı katsayı"
            desc="Kapatılırsa L7 bulgu 04 tetiklenir: marj yapay olarak yükselir." />
        </IBlock>
        <IBlock title="Taban">
          <ICalc rows={[
            ["Net satışlar", nf(B.y0rev)],
            ["Uyarlanmış FAVÖK", nf(v.ebitda0)],
            ["FAVÖK marjı", pf(v.margin0)],
            ["Değerleme tabanı", baseYear, true],
          ]} />
        </IBlock>
      </Inspector>
    </div>
  );
}
