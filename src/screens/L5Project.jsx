"use client";
import { useValuator } from "../store/valuator";
import { DRIVERS } from "../lib/data";
import { d1, nf, par, pf } from "../lib/format";
import { Panel, Note, Segmented, Sparkline, Stat } from "../components/primitives";
import { Inspector, IBlock, IRow, NumStepper, Toggle, IButton } from "../components/inspector";
import { useCrosshair } from "../components/useCrosshair";
import { useState } from "react";

export function L5Project() {
  const v = useValuator();
  const [scenario, setScenario] = useState("base");
  const [horizon, setHorizon] = useState("5");
  const ref = useCrosshair();
  const r = v.result;

  const applyScenario = (s) => {
    setScenario(s);
    if (s === "low") v.setA({ growth: 0.06, expansion: 2.0, capexPct: 0.062, wacc: 0.155 });
    else if (s === "high") v.setA({ growth: 0.15, expansion: 7.5, capexPct: 0.05, wacc: 0.11 });
    else v.setA({ growth: 0.11, expansion: 5.7, capexPct: 0.055, wacc: 0.125 });
  };

  const rows = [
    ["Net satışlar", (x) => x.rev, "sum"],
    ["Satışların maliyeti", (x) => -x.cogs, "k"],
    ["Brüt kâr", (x) => x.gross, "sub"],
    ["Faaliyet giderleri", (x) => -x.opex, "k"],
    ["FAVÖK", (x) => x.ebitda, "hero"],
    ["Amortisman", (x) => -x.depShown, "k"],
    ["FVÖK", (x) => x.ebit, "sub"],
    ["Vergi", (x) => -x.taxAmt, "k"],
    ["NOPLAT", (x) => x.noplat, "sum"],
    ["CAPEX", (x) => -x.capex, "k"],
    ["NİS değişimi", (x) => -x.dnwcShown, "k"],
    ["Faiz gideri", (x) => -x.int, "k"],
    ["Serbest nakit akışı", (x) => x.fcf, "hero"],
  ];

  const totalCapex = r.y.reduce((a, y) => a + y.capex, 0);
  const tests = [
    ["Ciro büyümesi", pf(v.a.growth), "%19,1", v.a.growth > 0.15 ? "wn" : "ok",
      v.a.growth > 0.15 ? "Geçmiş ortalamanın üzerinde — kapasite ve talep kanıtı gerekir" : "Geçmiş gerçekleşmenin altında, muhafazakâr"],
    ["Marj genişlemesi", "+" + d1(v.a.expansion) + " p", "±2,4 p", v.a.expansion > 3 ? "wn" : "ok",
      v.a.expansion > 3 ? "Gider oranlarının düşeceği varsayımına dayanıyor — aksiyon planı bekleniyor" : "Geçmiş dalgalanma bandının içinde"],
    ["CAPEX / ciro", pf(v.a.capexPct), "%5,5", Math.abs(v.a.capexPct - 0.055) > 0.02 ? "wn" : "ok",
      Math.abs(v.a.capexPct - 0.055) > 0.02 ? "Geçmiş yatırım oranından belirgin sapma" : "Geçmiş gerçekleşme ile uyumlu"],
    ["NİS / ciro", pf(v.a.nwcPct), "%30,1", Math.abs(v.a.nwcPct - 0.3) > 0.05 ? "wn" : "ok",
      Math.abs(v.a.nwcPct - 0.3) > 0.05 ? "Devir hızlarında yapısal değişiklik varsayılıyor" : "2025 gerçekleşmesiyle uyumlu"],
    ["Amortisman", v.a.depNew ? "Yatırımla büyür" : "Sabit", "CAPEX " + nf(totalCapex), v.a.depNew ? "ok" : "wn",
      v.a.depNew ? "Yeni yatırımların amortismanı 10 yıla yayıldı" : "Beş yıllık yatırımın amortismanı modellenmiyor"],
    ["Terminal payı", pf(r.tv / r.v1), "< %75", r.tv / r.v1 > 0.75 ? "wn" : "ok",
      r.tv / r.v1 > 0.75 ? "Değerin çoğu açık dönemin dışından — kırılganlık işareti" : "Değerin çoğu öngörülebilir dönemden"],
  ];
  const warns = tests.filter((t) => t[3] === "wn").length;

  return (
    <div className="work">
      <div className="left">
        <Panel title="Projeksiyon" tag={<span className="tag gold">L5</span>}
          sub="Sağdaki sürücüleri değiştirin — tablo anında yeniden hesaplanır">
          <table className="g" ref={ref}>
            <thead>
              <tr className="band"><th className="lbl vd" /><th className="pj" colSpan={5}>PROJEKSİYON · USD &apos;000</th>
                <th className="vd" /><th className="vd" /></tr>
              <tr className="hd"><th className="lbl">Kalem</th>
                {r.y.map((x, i) => <th key={x.yr} className="n" data-col={i}>{x.yr}</th>)}
                <th className="n" style={{ width: 84 }}>Toplam</th>
                <th className="n" style={{ width: 66 }}>Eğilim</th></tr>
            </thead>
            <tbody>
              {rows.map(([label, fn, kind]) => {
                const vals = r.y.map(fn);
                const tot = vals.reduce((a, b) => a + b, 0);
                return (
                  <tr key={label} className={kind === "k" ? "" : kind}>
                    <td className="lbl">{kind === "k" && <span style={{ display: "inline-block", width: 12 }} />}{label}</td>
                    {vals.map((x, i) => <td key={i} className={`n${x < 0 ? " neg" : ""}`} data-col={i}>{par(x)}</td>)}
                    <td className={`n${tot < 0 ? " neg" : ""}`} style={{ fontWeight: 600 }}>{par(tot)}</td>
                    <td className="n"><Sparkline values={vals.map(Math.abs)} color={kind === "hero" ? "#B8862B" : "#33518E"} /></td>
                  </tr>
                );
              })}
              <tr className="dim">
                <td className="lbl">FAVÖK marjı</td>
                {r.y.map((x, i) => <td key={i} className="n" data-col={i}>{pf(x.margin)}</td>)}
                <td className="n" />
                <td className="n"><Sparkline values={r.y.map((x) => x.margin)} color="#1B6F55" /></td>
              </tr>
            </tbody>
            <tfoot><tr><td className="lbl">Sürücüler</td><td colSpan={7}>
              Büyüme {pf(v.a.growth)} · marj +{d1(v.a.expansion)} p · CAPEX {pf(v.a.capexPct)} ·
              NİS {pf(v.a.nwcPct)} · amortisman {v.a.depNew ? "yatırımla büyür" : "sabit"}
            </td></tr></tfoot>
          </table>
        </Panel>

        <Panel title="Sürücü sınaması" sub="Her varsayım geçmiş üç yılla karşılaştırılır">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Sürücü</th><th className="n" style={{ width: 104 }}>Seçili</th>
              <th className="n" style={{ width: 112 }}>Referans</th>
              <th className="c" style={{ width: 84 }}>Sınama</th><th>Motor notu</th>
            </tr></thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t[0]}>
                  <td className="lbl">{t[0]}</td>
                  <td className="n" style={{ fontWeight: 600 }}>{t[1]}</td>
                  <td className="n" style={{ color: "var(--faint)" }}>{t[2]}</td>
                  <td className="c"><Stat state={t[3]}>{t[3] === "ok" ? "Uyumlu" : "Uyarı"}</Stat></td>
                  <td style={{ color: "var(--muted)", whiteSpace: "normal", fontSize: "11.2px" }}>{t[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {warns ? (
          <Note tone="wn"><b>{warns} sürücü uyarı üretti.</b> Varsayım yine de kullanılabilir — ancak gerekçesi
            varsayım kaydına yazılmak ve raporda gösterilmek zorundadır.</Note>
        ) : (
          <Note><b>Tüm sürücüler geçmişle uyumlu.</b> Projeksiyon dayanağı skoru bu senaryoda desteklenmektedir.</Note>
        )}
      </div>

      <Inspector layer="L5"
        note={<>Değiştirilen her sürücü <b>varsayım kaydına</b> gerekçesiyle yazılır ve raporda görünür.</>}>
        <IBlock title="Sürücüler">
          {DRIVERS.map((d) => (
            <IRow key={d.k} label={d.n}>
              <NumStepper unit={d.unit} step={d.step} min={d.min} max={d.max}
                value={+(v.a[d.k] * d.mul).toFixed(d.step < 1 ? 1 : 0)}
                onChange={(val) => v.setA({ [d.k]: val / d.mul })} />
            </IRow>
          ))}
        </IBlock>
        <IBlock title="Politika">
          <Toggle checked={v.a.depNew} onChange={(c) => v.setA({ depNew: c })}
            title="Yeni yatırımların amortismanı"
            desc="Kapatılırsa amortisman 5 yıl sabit kalır; L7 bulgu 03 tetiklenir." />
          <IRow label="Projeksiyon süresi">
            <Segmented size="sm" value={horizon} onChange={setHorizon} options={[["5", "5 yıl"], ["7", "7 yıl"]]} />
          </IRow>
        </IBlock>
        <IBlock title="Senaryo">
          <Segmented value={scenario} onChange={applyScenario}
            options={[["low", "Kötümser"], ["base", "Baz"], ["high", "İyimser"]]} />
          <IButton variant="ghost" onClick={() => { v.resetDrivers(); setScenario("base"); }}>
            Varsayımları sıfırla
          </IButton>
        </IBlock>
      </Inspector>
    </div>
  );
}
