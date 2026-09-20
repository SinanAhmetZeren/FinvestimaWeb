"use client";
import { useState } from "react";
import { useValuator } from "../store/valuator";
import { DIMS } from "../lib/data";
import { d1, nf, p1 } from "../lib/format";
import { pf } from "../lib/format";
import { Panel, Stat, Bar, Note } from "../components/primitives";
import { Inspector, IHero, IBlock, ICalc, IButton } from "../components/inspector";
import { Segmented } from "../components/primitives";

export function L7Audit() {
  const v = useValuator();
  const [filter, setFilter] = useState("all");
  const [exported, setExported] = useState(false);

  const tone = (s) => (s === "Kritik" ? "red" : s === "Yüksek" ? "gold" : s === "Kanıt" ? "plum" : "");
  const list = v.findings.filter((f) => (filter === "all" ? true : filter === "open" ? !f.done : f.sev === "Kritik"));

  const why = {
    veri: v.a.sameK ? "Y0 hammadde verisi kısmen tahmin" : "Yıllıklandırma tutarsız — L4'te düzeltin",
    norm: v.addbacks.find((a) => a.k === "a3")?.on ? "Kanıtsız geri ekleme dahil" : "Geri eklemeler kanıta bağlı",
    proj: "Marj genişlemesi plana bağlanmalı",
    terminal: "Değerin çoğu açık dönem dışından",
    capraz: "İki mercek aynı FAVÖK tabanını paylaşıyor",
    model: "Denetim bulguları açık",
  };
  const label = v.score >= 8 ? "Yüksek güven" : v.score >= 6.5 ? "Orta güven" : "Koşullu güven";
  const raw = v.rawResult.v1, fix = v.result.v1;

  return (
    <div className="work">
      <div className="left">
        <Panel title="Denetim bulguları"
          tag={<span className={`tag ${v.openFindings ? "red" : "green"}`}>
            {v.openFindings ? `${v.openFindings} açık` : "Bulgu kalmadı"}</span>}
          sub="Satıra tıklayarak durumu değiştirin">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl" style={{ minWidth: 52 }}>No</th>
              <th style={{ width: 48 }}>Katman</th>
              <th className="lbl" style={{ minWidth: 212, left: 52 }}>Bulgu</th>
              <th style={{ width: 72 }}>Öncelik</th>
              <th style={{ minWidth: 240 }}>Açıklama</th>
              <th style={{ minWidth: 180 }}>Değere etkisi</th>
              <th className="c" style={{ width: 96 }}>Durum</th>
            </tr></thead>
            <tbody>
              {list.map((f) => {
                const i = v.findings.indexOf(f);
                return (
                  <tr key={f.no} style={{ cursor: "pointer", opacity: f.done ? 0.5 : 1 }} onClick={() => v.toggleFinding(i)}>
                    <td className="lbl" style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "var(--navy)" }}>{f.no}</td>
                    <td><span className="tag">{f.layer}</span></td>
                    <td className="lbl" style={{ left: 52 }}>
                      <b style={f.done ? { textDecoration: "line-through", textDecorationColor: "var(--faint)" } : undefined}>{f.t}</b>
                    </td>
                    <td><span className={`tag ${tone(f.sev)}`}>{f.sev}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: "11.2px", whiteSpace: "normal" }}>{f.d}</td>
                    <td style={{ fontSize: "10.5px", whiteSpace: "normal", color: f.done ? "var(--green)" : "var(--red)" }}>
                      {f.done ? "✓ Kapatıldı ve rapora işlendi" : f.i}
                    </td>
                    <td className="c"><Stat state={f.done ? "ok" : "er"}>{f.done ? "Kapalı" : "Açık"}</Stat></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td className="lbl" colSpan={2}>Özet</td>
              <td className="lbl" style={{ left: 52 }} />
              <td colSpan={4}>
                {v.findings.filter((f) => f.sev === "Kritik").length} kritik ·{" "}
                {v.findings.filter((f) => f.sev === "Yüksek").length} yüksek ·{" "}
                {v.findings.filter((f) => f.sev === "Orta").length} orta ·{" "}
                {v.findings.filter((f) => f.sev === "Kanıt").length} kanıt maddesi
              </td>
            </tr></tfoot>
          </table>
        </Panel>

        <Panel title="Güven skoru bileşenleri" sub="Altı boyut · ağırlıklı">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Boyut</th><th className="n" style={{ width: 62 }}>Mevcut</th>
              <th className="n" style={{ width: 58 }}>Tavan</th><th className="n" style={{ width: 62 }}>Ağırlık</th>
              <th style={{ minWidth: 180 }}>Profil</th><th style={{ minWidth: 200 }}>Neden</th>
            </tr></thead>
            <tbody>
              {DIMS.map((d) => {
                const val = v.scores[d.k];
                const c = val >= 8 ? "var(--green)" : val >= 6 ? "var(--gold)" : "var(--red)";
                return (
                  <tr key={d.k}>
                    <td className="lbl">{d.n}</td>
                    <td className="n" style={{ fontWeight: 600, color: c }}>{d1(val)}</td>
                    <td className="n" style={{ color: "var(--faint)" }}>{d.max}</td>
                    <td className="n">{pf(d.w)}</td>
                    <td><Bar w={val * 16} color={c} /><Bar w={(d.max - val) * 16} color="#E2E8F2" /></td>
                    <td style={{ fontSize: "10.5px", color: "var(--muted)", whiteSpace: "normal" }}>{why[d.k]}</td>
                  </tr>
                );
              })}
              <tr className="sum">
                <td className="lbl">Ağırlıklı güven skoru</td>
                <td className="n" style={{ fontSize: "12.5px" }}>{d1(v.score)}</td>
                <td className="n">9,0</td><td className="n">%100</td>
                <td><Bar w={v.score * 16} color="var(--gold)" /></td>
                <td style={{ fontSize: "10.5px" }}>{label}</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Note tone={v.openFindings ? "bad" : undefined}>
          {v.openFindings ? <b>{v.openFindings} bulgu hâlâ açık.</b> : <b>Tüm bulgular kapatıldı.</b>}{" "}
          Düzeltmeler net bugünkü değeri <b>{nf(raw)}</b>&apos;den <b>{nf(fix)}</b>&apos;e taşıyor. Bu, sunumun
          zayıflaması değil güçlenmesidir: karşı tarafın inceleme sırasında bulacağı hata, teklif masaya gitmeden
          kapatılmış olur.
        </Note>
      </div>

      <Inspector layer="L7"
        hero={<IHero value={d1(v.score)} label={label}
          sub={<>Skor &quot;değer yanlış&quot; demez; değerin hangi noktalarda kanıtla desteklenmesi gerektiğini söyler.</>} />}
        note={<>Kapatılan her bulgu rapora <b>düzeltme kaydı</b> olarak eklenir ve tarihçesi saklanır.</>}>
        <IBlock title="Filtre">
          <Segmented value={filter} onChange={setFilter}
            options={[["all", "Tümü"], ["open", "Açık"], ["crit", "Kritik"]]} />
        </IBlock>
        <IBlock title="Düzeltmenin etkisi">
          <ICalc rows={[
            ["Ham model", nf(raw)],
            ["Düzeltilmiş", nf(fix)],
            ["Fark", `${raw > fix ? "−" : "+"}${nf(Math.abs(raw - fix))} · %${p1(Math.abs(raw - fix) / raw)}`, true],
          ]} />
        </IBlock>
        <IBlock title="İşlemler">
          <IButton onClick={() => v.setAllFindings(true)}>Tüm bulguları kapat</IButton>
          <IButton variant="ghost" onClick={() => v.setAllFindings(false)}>Bulguları yeniden aç</IButton>
          <IButton variant="ghost" onClick={() => { setExported(true); setTimeout(() => setExported(false), 2400); }}>
            {exported ? (v.openFindings ? `${v.openFindings} açık bulguyla oluşturuldu` : "Çıktı paketi hazır · 6 belge") : "Çıktı paketini oluştur"}
          </IButton>
        </IBlock>
      </Inspector>
    </div>
  );
}
