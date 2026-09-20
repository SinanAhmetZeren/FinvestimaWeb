"use client";
import { useValuator } from "../store/valuator";
import { B, compute, median } from "../lib/model";
import { d1, d2, mm, nf, p1, par, pf } from "../lib/format";
import { Panel, Stat, Bar } from "../components/primitives";
import { Src } from "../components/SourceTrail";
import { Inspector, IHero, IBlock, IRow, NumStepper, ICalc, IButton } from "../components/inspector";
import { useCrosshair } from "../components/useCrosshair";

const GS = [0.02, 0.025, 0.03, 0.035, 0.04];
const WS = [0.11, 0.125, 0.14, 0.155, 0.17];

export function L6Value() {
  const v = useValuator();
  const r = v.result;
  const fcfRef = useCrosshair();
  const sensRef = useCrosshair();

  const lenses = [
    ["V1", "Gelir merceği", "FCF → NPV + terminal", `WACC ${pf(v.a.wacc)} · g ${pf(v.a.tg)}`, r.v1, v.a.w1, "#33518E", "tnd"],
    ["V2", "Piyasa merceği", "Çarpan × FAVÖK − net borç", `${d1(v.a.mult)}x × ${nf(v.ebitda0)}`, r.v2, v.a.w2, "#B8862B", "tnd"],
    ["V3", "Varlık merceği", "Aktifler − yabancı kaynaklar", "Bilanço 2025/12", r.v3, v.a.w3, "#2E7D8F", "tna"],
  ];
  const weighted = lenses.reduce((a, x) => a + x[4] * x[5], 0);
  const maxV = Math.max(...lenses.map((x) => x[4]));

  const on = v.peers.filter((p) => p.on);
  const medEv = median(on.map((p) => p.ev));
  const medSa = median(on.map((p) => p.s));
  const off = medEv ? (v.a.mult - medEv) / medEv : 0;

  const grid = WS.map((w) => GS.map((g) => compute(v.a, v.addbacks, { wacc: w, tg: g }).v1));
  const flat = grid.flat();
  const mn = Math.min(...flat), mx = Math.max(...flat);
  const lo = compute(v.a, v.addbacks, { wacc: 0.155 }).v1;
  const hi = compute(v.a, v.addbacks, { wacc: 0.11 }).v1;

  const fcfRows = [
    ["NOPLAT", (x) => x.noplat, ""],
    ["+ Amortisman", (x) => x.depShown, ""],
    ["− CAPEX", (x) => -x.capex, ""],
    ["− NİS değişimi", (x) => -x.dnwcShown, ""],
    ["− Faiz gideri", (x) => -x.int, ""],
    ["Serbest nakit akışı", (x) => x.fcf, "sum"],
  ];

  return (
    <div className="work">
      <div className="left">
        <Panel title="Değerleme özeti" tag={<span className="tag gold">L6</span>} sub="Üç mercek, ağırlıklandırılmış sonuç">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Mercek</th><th>Yöntem</th><th>Girdi</th>
              <th className="n" style={{ width: 104 }}>Özkaynak değeri</th>
              <th className="n" style={{ width: 62 }}>Ağırlık</th>
              <th className="n" style={{ width: 96 }}>Ağırlıklı</th>
              <th style={{ minWidth: 170 }}>Ölçek</th>
            </tr></thead>
            <tbody>
              {lenses.map(([code, name, method, input, val, w, color, trail]) => (
                <tr key={code}>
                  <td className="lbl">
                    <span className="tag" style={{ background: color, color: "#fff", borderColor: color }}>{code}</span>
                    &nbsp;<b>{name}</b>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "11.2px" }}>{method}</td>
                  <td style={{ color: "var(--faint)", fontSize: "10.5px" }}>{input}</td>
                  <td className="n" style={{ fontWeight: 600, fontSize: "12.5px", color }}>
                    <Src trail={trail} color={color}>{nf(val)}</Src>
                  </td>
                  <td className="n">{pf(w)}</td>
                  <td className="n">{nf(val * w)}</td>
                  <td><Bar w={(val / maxV) * 150} color={color} /></td>
                </tr>
              ))}
              <tr className="sum">
                <td className="lbl">Ağırlıklı sonuç</td>
                <td colSpan={2} style={{ color: "var(--muted)", fontSize: "11px" }}>
                  Faaliyette olan, kârlı ve büyüyen üretici için yerleşik uygulama
                </td>
                <td className="n">{nf(weighted)}</td>
                <td className="n">{pf(v.a.w1 + v.a.w2 + v.a.w3)}</td>
                <td className="n">{nf(weighted)}</td>
                <td style={{ fontFamily: "var(--mono)", color: "var(--gold)", fontSize: "11px" }}>{mm(weighted)} M$</td>
              </tr>
            </tbody>
            <tfoot><tr><td className="lbl">Önerilen aralık</td><td colSpan={6}>
              <b>{mm(Math.min(r.v1, r.v2) * 0.92)} – {mm(Math.max(r.v1, r.v2) * 1.02)} M$</b> · alt sınır düzeltilmiş
              gelir merceği ve emsal medyanından, üst sınır seçili senaryodan. Net aktif seviyesi ({mm(r.v3)} M$)
              pazarlıkta taban, hiçbir koşulda kabul çizgisi değildir.
            </td></tr></tfoot>
          </table>
        </Panel>

        <Panel title="Nakit akışı ve değer köprüsü" sub="FCF → iskonto → terminal değer">
          <table className="g" ref={fcfRef}>
            <thead><tr className="hd solo"><th className="lbl">Kalem</th>
              {r.y.map((x, i) => <th key={x.yr} className="n" data-col={i}>{x.yr}</th>)}
              <th className="n" style={{ width: 88 }}>Toplam</th></tr></thead>
            <tbody>
              {fcfRows.map(([label, fn, kind]) => {
                const vals = r.y.map(fn);
                const tot = vals.reduce((a, b) => a + b, 0);
                return (
                  <tr key={label} className={kind}>
                    <td className="lbl">{label}</td>
                    {vals.map((x, i) => <td key={i} className={`n${x < 0 ? " neg" : ""}`} data-col={i}>{par(x)}</td>)}
                    <td className={`n${tot < 0 ? " neg" : ""}`} style={{ fontWeight: 600 }}>{par(tot)}</td>
                  </tr>
                );
              })}
              <tr className="dim">
                <td className="lbl">İskonto faktörü · {pf(v.a.wacc)}</td>
                {r.y.map((_, t) => <td key={t} className="n" data-col={t}>{d2(1 / Math.pow(1 + v.a.wacc, t + 1))}</td>)}
                <td className="n" />
              </tr>
              <tr>
                <td className="lbl">Bugünkü değer</td>
                {r.y.map((x, t) => <td key={t} className="n" data-col={t}>{nf(x.fcf / Math.pow(1 + v.a.wacc, t + 1))}</td>)}
                <td className="n" style={{ fontWeight: 600 }}>{nf(r.npv)}</td>
              </tr>
              <tr className="sub">
                <td className="lbl">Terminal değer · {d2(1 / (v.a.wacc - v.a.tg))}x kapitalizasyon</td>
                <td className="n" colSpan={4} style={{ color: "var(--faint)", fontSize: "10.5px" }}>
                  Y+4 akışı {nf(r.y[4].fcf)} × 1/({pf(v.a.wacc)} − {pf(v.a.tg)}) × iskonto
                </td>
                <td className="n" />
                <td className="n" style={{ fontWeight: 600 }}>{nf(r.tv)}</td>
              </tr>
              <tr className="hero">
                <td className="lbl">V1 · özkaynak değeri</td>
                <td className="n" colSpan={5} style={{ color: "#8A6420", fontSize: "10.5px" }}>
                  açık dönem {pf(r.npv / r.v1)} · terminal {pf(r.tv / r.v1)}
                </td>
                <td className="n" style={{ fontSize: "12.5px" }}>{nf(r.v1)}</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="Emsal çarpanlar" sub="Satıra tıklayarak evrenden çıkarın">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Şirket / işlem</th><th>Bölge</th><th className="n">Ciro M$</th>
              <th className="n">FAVÖK marjı</th><th className="n">EV/FAVÖK</th><th className="n">EV/Ciro</th>
              <th className="c" style={{ width: 88 }}>Evrende</th>
            </tr></thead>
            <tbody>
              {v.peers.map((p, i) => (
                <tr key={p.n} style={{ cursor: "pointer", opacity: p.on ? 1 : 0.4 }} onClick={() => v.togglePeer(i)}>
                  <td className="lbl">{p.n}</td><td style={{ color: "var(--muted)" }}>{p.r}</td>
                  <td className="n">{p.rev}</td><td className="n">{pf(p.m)}</td>
                  <td className="n" style={{ fontWeight: 600 }}>{d1(p.ev)}x</td><td className="n">{d2(p.s)}x</td>
                  <td className="c"><Stat state={p.on ? "ok" : "er"}>{p.on ? "Dahil" : "Çıkarıldı"}</Stat></td>
                </tr>
              ))}
              <tr className="sum">
                <td className="lbl">Medyan · {on.length} emsal</td><td colSpan={3} />
                <td className="n">{d1(medEv)}x</td><td className="n">{d2(medSa)}x</td><td className="c" />
              </tr>
              <tr className="hero">
                <td className="lbl">Seçili çarpan</td><td /><td className="n">18</td>
                <td className="n">{pf(v.margin0)}</td><td className="n">{d1(v.a.mult)}x</td>
                <td className="n">{d2(r.ev / B.y0rev)}x</td>
                <td className="c" style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: Math.abs(off) > 0.1 ? "var(--red)" : "var(--green)" }}>
                  {off > 0 ? "+" : ""}{p1(off)}%
                </td>
              </tr>
            </tbody>
            <tfoot><tr><td className="lbl">Motor notu</td><td colSpan={6}>
              {Math.abs(off) > 0.1
                ? <>Seçili çarpan medyandan <b>{p1(Math.abs(off))}%</b> {off > 0 ? "yüksek" : "düşük"}. Farkın gerekçesi
                   kanıt dosyasına yazılmalı; aksi halde çapraz yöntem uyumu skoru düşük kalır.</>
                : <>Seçili çarpan emsal medyanının makul bandında; çapraz yöntem uyumu destekleniyor.</>}
            </td></tr></tfoot>
          </table>
        </Panel>

        <Panel title="Duyarlılık" sub="Hücreye tıklayarak senaryoyu seçin">
          <table className="g" ref={sensRef}>
            <thead><tr className="hd solo">
              <th className="lbl" style={{ minWidth: 104 }}>WACC ↓ / g →</th>
              {GS.map((g, i) => <th key={g} className="n" data-col={i}>{pf(g)}</th>)}
            </tr></thead>
            <tbody>
              {WS.map((w, wi) => (
                <tr key={w}>
                  <td className="lbl" style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{pf(w)}</td>
                  {GS.map((g, gi) => {
                    const val = grid[wi][gi];
                    const sel = Math.abs(w - v.a.wacc) < 1e-9 && Math.abs(g - v.a.tg) < 1e-9;
                    const t = (val - mn) / (mx - mn || 1);
                    const style = sel
                      ? { background: "var(--gold)", color: "#fff", fontWeight: 600, cursor: "pointer" }
                      : { background: `rgba(${Math.round(51 + 139 * (1 - t))},${Math.round(81 + 129 * (1 - t))},${Math.round(142 + 88 * (1 - t))},${(0.06 + t * 0.22).toFixed(2)})`, cursor: "pointer" };
                    return (
                      <td key={g} className="n" data-col={gi} style={style}
                        onClick={() => v.setA({ wacc: w, tg: g })}>{nf(val)}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td className="lbl">Bant</td><td colSpan={5}>
              İskonto oranı tek başına en güçlü değişken: %11 – %15,5 aralığında değer <b>{nf(lo)} – {nf(hi)}</b>{" "}
              arasında hareket eder (<b>%{p1((hi - lo) / hi)}</b> bant). Satıcı alt, alıcı üst oranı savunur.
            </td></tr></tfoot>
          </table>
        </Panel>
      </div>

      <Inspector layer="L6"
        hero={<IHero value={nf(r.v1)} label="V1 · özkaynak değeri"
          sub={<>Açık dönem {pf(r.npv / r.v1)} · terminal {pf(r.tv / r.v1)}<br />Ağırlıklı sonuç {nf(weighted)}</>} />}
        note={<>İskonto oranı tek başına en güçlü değişken. Bileşenlerine ayrılıp belgelenmesi müzakerede pozisyonu
          güçlendirir.</>}>
        <IBlock title="İskonto">
          <IRow label="Sermaye maliyeti (WACC)">
            <NumStepper value={+(v.a.wacc * 100).toFixed(1)} unit="%" step={0.5} min={6} max={25}
              onChange={(val) => v.setA({ wacc: val / 100 })} />
          </IRow>
          <IRow label="Terminal büyüme (g)">
            <NumStepper value={+(v.a.tg * 100).toFixed(2)} unit="%" step={0.25} min={0} max={6}
              onChange={(val) => v.setA({ tg: val / 100 })} />
          </IRow>
          <ICalc rows={[["Kapitalizasyon", d2(1 / (v.a.wacc - v.a.tg)) + "x"], ["Terminal payı", pf(r.tv / r.v1)]]} />
        </IBlock>
        <IBlock title="Piyasa merceği">
          <IRow label="FAVÖK çarpanı">
            <NumStepper value={+v.a.mult.toFixed(1)} unit="x" step={0.1} min={3} max={14}
              onChange={(val) => v.setA({ mult: val })} />
          </IRow>
          <ICalc rows={[["Firma değeri", nf(r.ev)], ["− Net borç", nf(B.netDebt)], ["Özkaynak", nf(r.v2), true]]} />
          <IButton variant="ghost" onClick={() => on.length && v.setA({ mult: medEv })}>
            Emsal medyanını uygula
          </IButton>
        </IBlock>
        <IBlock title="Mercek ağırlıkları">
          {[["w1", "V1 · Gelir"], ["w2", "V2 · Piyasa"], ["w3", "V3 · Varlık"]].map(([k, label]) => (
            <IRow key={k} label={label}>
              <NumStepper value={Math.round(v.a[k] * 100)} unit="%" step={5} min={0} max={100}
                onChange={(val) => v.setA({ [k]: val / 100 })} />
            </IRow>
          ))}
          <ICalc rows={[["Toplam", pf(v.a.w1 + v.a.w2 + v.a.w3)]]} />
        </IBlock>
      </Inspector>
    </div>
  );
}
