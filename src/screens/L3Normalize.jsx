"use client";
import { useState } from "react";
import { useValuator } from "../store/valuator";
import { FX_ROWS } from "../lib/data";
import { B } from "../lib/model";
import { nf, p1, par, pf } from "../lib/format";
import { Panel, Stat, Note, Segmented } from "../components/primitives";
import { Src } from "../components/SourceTrail";
import { Inspector, IBlock, IRow, IValue, ICalc, Toggle } from "../components/inspector";

export function L3Normalize() {
  const v = useValuator();
  const [cur, setCur] = useState("usd");
  const [cpi, setCpi] = useState(true);
  const noEvidence = v.addbacks.some((a) => a.on && !a.ok);

  return (
    <div className="work">
      <div className="left">
        <Panel title="Para birimi dönüşümü" tag={<span className="tag teal">L3</span>}
          sub="Akış kalemleri ortalama, stok kalemleri dönem sonu kuruyla çevrilir">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Kalem</th><th>Kaynak</th><th className="n">TL · M ₺</th>
              <th className="n">Kur</th><th>Kur tipi</th><th className="n">USD &apos;000</th>
            </tr></thead>
            <tbody>
              {FX_ROWS.map(([name, src, tl, fx, kind, usd, trail]) => (
                <tr key={name}>
                  <td className="lbl">{trail ? <Src trail={trail}>{name}</Src> : name}</td>
                  <td style={{ color: "var(--muted)" }}>{src}</td>
                  <td className="n">{tl}</td>
                  <td className="n" style={{ color: fx === "41,28" ? "var(--mid)" : "var(--teal)" }}>{fx}</td>
                  <td><span className={`tag${kind.startsWith("Akış") ? "" : " teal"}`}>{kind}</span></td>
                  <td className={`n${usd < 0 ? " neg" : ""}`} style={{ fontWeight: 600 }}>{par(usd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td className="lbl">Kural</td><td colSpan={5}>
              Akış kalemleri yıl boyunca oluştuğu için ortalama, stok kalemleri belirli bir andaki bakiye olduğu için
              dönem sonu kuruyla çevrilir. Karıştırılması FAVÖK ve net borcu aynı anda bozar.
            </td></tr></tfoot>
          </table>
        </Panel>

        <Panel title="Geri eklemeler" sub="FAVÖK'ün içine karıştırılmaz; kendi satırında durur">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Kalem</th><th>Kanıt</th><th className="n" style={{ width: 90 }}>Tutar</th>
              <th className="c" style={{ width: 96 }}>Durum</th><th className="n" style={{ width: 104 }}>FAVÖK etkisi</th>
            </tr></thead>
            <tbody>
              <tr>
                <td className="lbl">Ham FAVÖK</td><td style={{ color: "var(--muted)" }}>Mizan türevi</td>
                <td className="n">{nf(B.ebitdaRaw)}</td><td className="c">—</td>
                <td className="n">{pf(B.ebitdaRaw / B.y0rev)}</td>
              </tr>
              {v.addbacks.map((a) => (
                <tr key={a.k} style={{ cursor: "pointer", opacity: a.on ? 1 : 0.5 }} onClick={() => v.toggleAddback(a.k)}>
                  <td className="lbl">+ {a.n}</td>
                  <td style={{ color: a.ok ? "var(--muted)" : "var(--red)" }}>{a.ev}</td>
                  <td className="n">{nf(a.v)}</td>
                  <td className="c"><Stat state={a.on ? "ok" : "er"}>{a.on ? "Dahil" : "Hariç"}</Stat></td>
                  <td className="n">{a.on ? "+" + p1(a.v / B.y0rev) + "%" : "—"}</td>
                </tr>
              ))}
              <tr className="hero">
                <td className="lbl">Uyarlanmış FAVÖK</td><td>Y0 · normalize</td>
                <td className="n" style={{ fontSize: "12.5px" }}>{nf(v.ebitda0)}</td>
                <td className="c">—</td>
                <td className="n" style={{ fontSize: "12.5px" }}>{pf(v.ebitda0 / B.y0rev)}</td>
              </tr>
            </tbody>
            <tfoot><tr><td className="lbl">Not</td><td colSpan={4}>
              Satıra tıklayarak geri eklemeyi dahil edin veya çıkarın. Kanıtsız kalem normalizasyon kalitesi skorunu düşürür.
            </td></tr></tfoot>
          </table>
        </Panel>

        {noEvidence ? (
          <Note tone="bad"><b>Kanıtsız geri ekleme dahil edildi.</b> İlişkili taraf kirası için sözleşme veya ekspertiz
            dosyalanmadan bu kalem FAVÖK&apos;e eklenirse karşı taraf incelemesinde ilk çıkarılacak tutar olur.</Note>
        ) : (
          <Note><b>Normalizasyon tutarlı.</b> Dahil edilen tüm geri eklemeler kanıta bağlı; her biri raporda ayrı
            satırda gösterilecek.</Note>
        )}
      </div>

      <Inspector layer="L3"
        note={<>Kanıtsız geri ekleme çıktıda ayrı renkte gösterilir ve <b>normalizasyon kalitesi</b> skorunu düşürür.</>}>
        <IBlock title="Dönüşüm esası">
          <IRow label="Raporlama para birimi">
            <Segmented size="sm" value={cur} onChange={setCur} options={[["usd", "USD"], ["tl", "TL reel"]]} />
          </IRow>
          <IRow label="Akış kuru"><IValue>41,28</IValue></IRow>
          <IRow label="Stok kuru"><IValue>43,10</IValue></IRow>
          <Toggle checked={cpi} onChange={setCpi} title="Enflasyon kontrol katmanı"
            desc="Sonuç paralel olarak TL reel bazda da hesaplanır ve çapraz doğrulanır." />
        </IBlock>
        <IBlock title="Geri ekleme seçimi">
          {v.addbacks.map((a) => (
            <Toggle key={a.k} checked={a.on} onChange={() => v.toggleAddback(a.k)}
              title={`${a.n} · ${nf(a.v)}`} desc={a.ev} />
          ))}
        </IBlock>
        <IBlock title="Normalize FAVÖK">
          <ICalc rows={[
            ["Ham FAVÖK", nf(B.ebitdaRaw)],
            ...v.addbacks.filter((a) => a.on).map((a) => [`+ ${a.n.split(" ")[0]}`, nf(a.v)]),
            ["Uyarlanmış", nf(v.ebitda0), true],
            ["Marj", pf(v.ebitda0 / B.y0rev)],
          ]} />
        </IBlock>
      </Inspector>
    </div>
  );
}
