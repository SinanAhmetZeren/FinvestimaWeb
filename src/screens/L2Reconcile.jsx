"use client";
import { Fragment, useState } from "react";
import { useValuator } from "../store/valuator";
import { CHECKS, MAP_OPTIONS } from "../lib/data";
import { d1, nf, p1, par } from "../lib/format";
import { Panel, Stat, Note, Segmented } from "../components/primitives";
import { Src } from "../components/SourceTrail";
import { Inspector, IBlock, IRow, IButton, Toggle, ICalc } from "../components/inspector";
import { useCrosshair } from "../components/useCrosshair";

export function L2Reconcile() {
  const v = useValuator();
  const [unit, setUnit] = useState("tl");
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
  const ref = useCrosshair();

  const fmt = (r) => {
    if (unit === "usd") return { a: "", b: par(r.usd * 1000), d: "" };
    if (unit === "pct") return { a: "", b: d1((Math.abs(r.t25) / 760.5) * 100) + "%", d: "" };
    const delta = r.t24 ? (r.t25 - r.t24) / Math.abs(r.t24) : null;
    return { a: d1(r.t24), b: d1(r.t25), d: delta === null ? "—" : (delta > 0 ? "+" : "") + p1(delta) + "%" };
  };

  const checks = CHECKS.map((c, i) =>
    i === 5
      ? { ...c, state: v.unmappedCount ? "fail" : "pass",
          d: v.unmappedCount ? `${v.unmappedCount} hesap hiçbir kaleme bağlanmadı` : "Tüm tutarlar bir kaleme bağlandı" }
      : c
  );
  const passed = checks.filter((c) => c.state === "pass").length;
  const t24 = v.trial.reduce((a, g) => a + g.t24, 0);
  const t25 = v.trial.reduce((a, g) => a + g.t25, 0);

  const Select = ({ value, onChange }) => (
    <select className={`csel${value ? "" : " unset"}`} value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}>
      {MAP_OPTIONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
    </select>
  );

  return (
    <div className="work">
      <div className="left">
        <Panel title="Mizan ızgarası" tag={<span className="tag teal">L2</span>}
          sub="Grup satırına tıklayarak alt hesapları açın"
          right={<Segmented size="sm" value={unit} onChange={setUnit}
            options={[["tl", "TL"], ["usd", "USD"], ["pct", "% ciro"]]} />}>
          <table className="g" ref={ref}>
            <thead><tr className="hd solo">
              <th className="lbl">Hesap</th>
              {unit === "tl" ? (<>
                <th className="n" data-col="a">2024 M ₺</th>
                <th className="n" data-col="b">2025 M ₺</th>
                <th className="n" data-col="d">Δ</th>
              </>) : (<>
                <th className="n" data-col="b" colSpan={2}>{unit === "usd" ? "2025 USD '000" : "2025 ciro payı"}</th>
                <th className="n" data-col="d" />
              </>)}
              <th style={{ minWidth: 160 }}>Değerleme kalemi</th>
              <th className="c" style={{ width: 100 }}>Durum</th>
            </tr></thead>
            <tbody>
              {v.trial.map((g, gi) => {
                const hasUn = (g.unm && !g.map) || g.kids.some((k) => k.unm && !k.map);
                if (onlyUnmapped && !hasUn) return null;
                const f = fmt(g);
                const un = !g.map;
                return (
                  <Fragment key={g.c}>
                    <tr className={`grp${g.open ? " open" : ""}`} onClick={() => g.kids.length && v.toggleGroup(gi)}>
                      <td className="lbl">
                        <span className="caret">{g.kids.length ? "▸" : " "}</span>{" "}
                        <b><Src trail={`t${g.c}`}>{g.c}</Src></b> &nbsp;{g.n}
                      </td>
                      {unit === "tl" && <td className="n" data-col="a">{f.a}</td>}
                      <td className="n" data-col="b" colSpan={unit === "tl" ? 1 : 2}>{f.b}</td>
                      <td className="n" data-col="d">{f.d}</td>
                      <td>{g.kids.length
                        ? <span style={{ color: "var(--faint)", fontSize: "10.5px" }}>{g.kids.length} alt hesap</span>
                        : <Select value={g.map ?? ""} onChange={(val) => v.setMapping(gi, -1, val)} />}</td>
                      <td className="c"><Stat state={un ? "er" : "ok"}>{un ? "Eşlenmedi" : "Eşlendi"}</Stat></td>
                    </tr>
                    {g.open && g.kids.map((k, ki) => {
                      if (onlyUnmapped && !k.unm) return null;
                      const kf = fmt(k);
                      const ku = !!k.unm && !k.map;
                      return (
                        <tr className="kid" key={k.c}>
                          <td className="lbl">{k.c} &nbsp;{k.n}</td>
                          {unit === "tl" && <td className="n" data-col="a">{kf.a}</td>}
                          <td className="n" data-col="b" colSpan={unit === "tl" ? 1 : 2}>{kf.b}</td>
                          <td className="n" data-col="d">{kf.d}</td>
                          <td>{k.unm
                            ? <Select value={k.map ?? ""} onChange={(val) => v.setMapping(gi, ki, val)} />
                            : <span style={{ color: "var(--faint)", fontSize: "10.5px" }}>devralındı</span>}</td>
                          <td className="c">
                            {k.unm ? <Stat state={ku ? "er" : "ok"}>{ku ? "Yeni hesap" : "Eşlendi"}</Stat>
                              : <span style={{ opacity: .4 }}><Stat state="ok">Devralındı</Stat></span>}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td className="lbl" style={{ fontWeight: 600, color: "var(--navy)" }}>10 grup · 62.973 satır</td>
              {unit === "tl" && <td className="n">{d1(t24)}</td>}
              <td className="n" colSpan={unit === "tl" ? 1 : 2}>
                {unit === "usd" ? nf(v.trial.reduce((a, g) => a + g.usd, 0) * 1000) : d1(t25)}
              </td>
              <td className="n">{unit === "tl" ? "+" + p1((t25 - t24) / t24) + "%" : ""}</td>
              <td colSpan={2} style={{ fontFamily: "var(--mono)", color: "var(--green)" }}>Borç − alacak: 0,00 ✓</td>
            </tr></tfoot>
          </table>
        </Panel>

        <Panel title="Otomatik kontroller" right={<span className="tag">{passed} / 6</span>}>
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Kontrol</th><th>Açıklama</th><th className="c" style={{ width: 88 }}>Sonuç</th>
            </tr></thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.t}>
                  <td className="lbl" style={{ fontWeight: 600 }}>{c.t}</td>
                  <td style={{ color: "var(--muted)", whiteSpace: "normal" }}>{c.d}</td>
                  <td className="c"><Stat state={c.state === "pass" ? "ok" : c.state === "pend" ? "wn" : "er"}>
                    {c.state === "pass" ? "Geçti" : c.state === "pend" ? "Uyarı" : "Durdu"}</Stat></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td className="lbl">İlerleme</td>
              <td colSpan={2} style={{ fontFamily: "var(--mono)", color: v.unmappedCount ? "var(--red)" : "var(--green)" }}>
                {passed} / 6 · {v.unmappedCount ? "motor L3'e geçemiyor" : "motor L3'e geçmeye hazır"}
              </td></tr></tfoot>
          </table>
        </Panel>

        {v.unmappedCount ? (
          <Note tone="wn"><b>{v.unmappedCount} hesap eşlenmeyi bekliyor.</b> Eşlenmemiş tutar hiçbir kalemin içine
            varsayılan olarak düşmez. 730 ve 770 gruplarını açıp yeni açılan alt hesapları bağlayın, ya da sağdaki{" "}
            <b>Önerilenleri uygula</b> ile motorun tahminini kabul edin.</Note>
        ) : (
          <Note><b>Eşleme haritası tamamlandı.</b> Harita şirkete özel saklandı; sonraki dönemde yalnızca yeni
            açılan hesaplar sorulacak.</Note>
        )}
      </div>

      <Inspector layer="L2"
        note={<>Harita şirkete özel saklanır. Sonraki dönemde yalnızca <b>yeni açılan hesaplar</b> sorulur.</>}>
        <IBlock title="Eşleme kuyruğu">
          {v.unmappedCount === 0
            ? <IRow label={<span style={{ color: "var(--green)" }}>Kuyruk boş — tüm hesaplar bağlandı.</span>}><span /></IRow>
            : v.trial.flatMap((g) => [
                ...(g.unm && !g.map ? [g] : []),
                ...g.kids.filter((k) => k.unm && !k.map),
              ]).map((u) => (
                <IRow key={u.c} label={<><b style={{ fontFamily: "var(--mono)" }}>{u.c}</b> {u.n}</>}>
                  <span className="tag gold">öneri</span>
                </IRow>
              ))}
          <IButton variant="teal" onClick={v.applySuggested}>Önerilenleri uygula</IButton>
          <IButton variant="ghost" onClick={v.clearMappings}>Eşlemeleri sıfırla</IButton>
        </IBlock>
        <IBlock title="Görünüm">
          <Toggle checked={v.trial.every((g) => !g.kids.length || g.open)}
            onChange={(c) => v.trial.forEach((g, i) => { if (g.kids.length && g.open !== c) v.toggleGroup(i); })}
            title="Tüm grupları aç" desc="Alt hesapları ızgarada göster." />
          <Toggle checked={onlyUnmapped} onChange={setOnlyUnmapped}
            title="Yalnız eşlenmemişler" desc="Bağlanmamış hesapları filtrele." />
        </IBlock>
        <IBlock title="Harita">
          <ICalc rows={[
            ["Eşlenen", `${3 - v.unmappedCount} / 3`],
            ["Eşlenmeyen", String(v.unmappedCount)],
            ["Kayıt satırı", "62.973"],
          ]} />
          <IButton variant="ghost" onClick={() => v.setLayer("L3")}>L3 normalizasyona geç</IButton>
        </IBlock>
      </Inspector>
    </div>
  );
}
