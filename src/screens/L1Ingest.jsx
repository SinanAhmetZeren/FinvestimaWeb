"use client";
import { useState } from "react";
import { useValuator } from "../store/valuator";
import { COLUMN_MAP } from "../lib/data";
import { Panel, Stat, Note, Segmented } from "../components/primitives";
import { Inspector, IBlock, IRow, IButton, Toggle } from "../components/inspector";

export function L1Ingest() {
  const v = useValuator();
  const [years, setYears] = useState("3");
  const [depth, setDepth] = useState("3");
  const [estimate, setEstimate] = useState(true);
  const [halt, setHalt] = useState(false);
  const missing = v.sources.filter((s) => !s.ok).length;

  return (
    <div className="work">
      <div className="left">
        <Panel title="Kaynak dosyalar" tag={<span className="tag teal">L1</span>}
          sub="Dosyalar olduğu gibi alınır; hiçbir rakam elle yeniden yazılmaz">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Kaynak</th><th>Format</th><th>Dönem</th>
              <th className="n">Hacim</th><th className="c" style={{ width: 104 }}>Durum</th>
            </tr></thead>
            <tbody>
              {v.sources.map((s) => (
                <tr key={s.n}>
                  <td className="lbl">{s.n}</td>
                  <td style={{ color: "var(--muted)" }}>{s.fmt}</td>
                  <td style={{ color: "var(--muted)" }}>{s.period}</td>
                  <td className="n" style={{ color: "var(--muted)" }}>{s.vol}</td>
                  <td className="c"><Stat state={s.ok ? "ok" : "wn"}>{s.status}</Stat></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td className="lbl">Toplam</td><td colSpan={4}>
              {v.sources.filter((s) => s.ok).length} / {v.sources.length} kaynak alındı · veri kalitesi eşiği:
              en az 24 ay kesintisiz aylık satış verisi
            </td></tr></tfoot>
          </table>
        </Panel>

        <Panel title="Kolon eşleme" sub="Motorun mizan dosyasında tanıdığı kolonlar">
          <table className="g">
            <thead><tr className="hd solo">
              <th className="lbl">Kolon</th><th>Başlık</th><th>Tip</th>
              <th>Motorda karşılığı</th><th className="c" style={{ width: 96 }}>Tanıma</th>
            </tr></thead>
            <tbody>
              {COLUMN_MAP.map(([c, h, t, m, ok]) => (
                <tr key={c}>
                  <td className="lbl" style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "var(--navy)" }}>{c}</td>
                  <td>{h}</td><td style={{ color: "var(--muted)" }}>{t}</td>
                  <td style={{ color: "var(--muted)" }}>{m}</td>
                  <td className="c"><Stat state={ok ? "ok" : "wn"}>{ok ? "Otomatik" : "Onay bekliyor"}</Stat></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td className="lbl">Not</td><td colSpan={4}>
              Eşleme bir kez yapılır; sonraki dönem dosyalarında hatırlanır.
            </td></tr></tfoot>
          </table>
        </Panel>

        {missing ? (
          <Note tone="wn"><b>{missing} kaynak eksik.</b> Motor eksik dönemi komşu dönem oranıyla tahmin edebilir;
            tahmin edilen her hücre çıktıda ayrı renkte gösterilir ve güven skorunu düşürür.</Note>
        ) : (
          <Note><b>Girdi paketi tamam.</b> Motor kolon eşlemesini uygulayıp L2 uzlaştırmaya geçebilir.</Note>
        )}
      </div>

      <Inspector layer="L1"
        note={<>Alım katmanı yalnızca okur. Kaynak dosyalar değiştirilmez; motor onlara canlı referansla bağlanır.</>}>
        <IBlock title="Kapsam">
          <IRow label="Mizan dönemi">
            <Segmented size="sm" value={years} onChange={setYears} options={[["3", "3 yıl"], ["5", "5 yıl"]]} />
          </IRow>
          <IRow label="Hesap kodu derinliği">
            <Segmented size="sm" value={depth} onChange={setDepth} options={[["2", "2'li"], ["3", "3'lü"]]} />
          </IRow>
        </IBlock>
        <IBlock title="Eksik veri politikası">
          <Toggle checked={estimate} onChange={setEstimate} title="Eksik dönemi tahmin et"
            desc="Komşu dönem oranıyla doldurulur, tahmin olarak etiketlenir ve güven skorunu düşürür." />
          <Toggle checked={halt} onChange={setHalt} title="Kritik eksikte durdur"
            desc="Motor değer üretmez, önce eksik listesi raporlanır." />
        </IBlock>
        <IBlock title="İşlemler">
          <IButton onClick={v.receiveMissing} disabled={!missing}>Eksik dosyayı iste</IButton>
          <IButton variant="ghost" onClick={() => v.setLayer("L2")}>L2 uzlaştırmaya geç</IButton>
        </IBlock>
      </Inspector>
    </div>
  );
}
