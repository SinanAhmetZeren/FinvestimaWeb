import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Panel } from "../valuator-pro/ui.jsx";
import { useAdminListUsersQuery, useAdminListTasksQuery, useAdminAddAllowedEmailMutation, useAdminListAllowedEmailsQuery } from "../slices/ValuatorProSlice";
import "../valuator-pro/styles.css";

export default function ValuatorProAdmin() {
  const { data: users = [] } = useAdminListUsersQuery();
  const { data: tasks = [] } = useAdminListTasksQuery();
  const { data: allowedEmailGroups = [], refetch: refetchAllowedEmails } = useAdminListAllowedEmailsQuery();
  const [adminAddAllowedEmail, { isLoading: addingAllowedEmail }] = useAdminAddAllowedEmailMutation();
  const [msg, setMsg] = useState("");
  const [modalEmail, setModalEmail] = useState(null);
  const modalGroup = allowedEmailGroups.find(g => g.email === modalEmail);

  const [allowedEmailInput, setAllowedEmailInput] = useState("");
  const [allowedEmailNote, setAllowedEmailNote] = useState("");
  const [allowedEmailCredits, setAllowedEmailCredits] = useState(1);

  async function handleAddAllowedEmail(e) {
    e.preventDefault();
    if (!allowedEmailInput.trim()) return;
    setMsg("");
    try {
      await adminAddAllowedEmail({ email: allowedEmailInput.trim(), note: allowedEmailNote.trim() || undefined, taskCredits: Number(allowedEmailCredits) || 0 }).unwrap();
      setMsg(`${allowedEmailInput.trim()} için ${allowedEmailCredits} kredilik yeni satır eklendi.`);
      setAllowedEmailInput(""); setAllowedEmailNote(""); setAllowedEmailCredits(1);
    } catch (err) { setMsg(err.data || err.message || 'Eklenemedi.'); }
  }

  return (
    <div className="App vp-root">
      <header className="App-header" style={{ minHeight: "100%", background: "var(--bg)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 60px", textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ color: "var(--navy)", margin: "4px 0 0" }}>Valuator Pro — Admin</h2>
          {msg && <div className="tag" style={{ padding: "8px 12px", fontSize: 12.5, width: "fit-content" }}>{String(msg)}</div>}

          <Panel title="Task kredisi tanımla" sub="Her ekleme ayrı bir satır olarak kaydedilir.">
            <form onSubmit={handleAddAllowedEmail} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <input className="ninp" style={{ width: 220, textAlign: "left" }} placeholder="Email" type="email" value={allowedEmailInput} onChange={e => setAllowedEmailInput(e.target.value)} required />
              <input className="ninp" style={{ width: 90, textAlign: "left" }} placeholder="Kredi" type="number" value={allowedEmailCredits} onChange={e => setAllowedEmailCredits(e.target.value)} />
              <input className="ninp" style={{ width: 200, textAlign: "left" }} placeholder="Not (isteğe bağlı)" value={allowedEmailNote} onChange={e => setAllowedEmailNote(e.target.value)} />
              <button className="btn" type="submit" disabled={addingAllowedEmail}>Ekle</button>
            </form>
          </Panel>

          <Panel title={`Kayıtlı e-postalar (${allowedEmailGroups.length})`} sub="Her task kullanımı ayrı bir satır düşer — bakiye bunların toplamı. Dökümü görmek için satıra tıklayın." flush>
            <div className="scroll"><table className="g">
              <thead><tr className="hd solo"><th className="lbl">Email</th><th>Bakiye</th><th>Son işlem</th></tr></thead>
              <tbody>
                {allowedEmailGroups.map(g => (
                  <tr key={g.email} style={{ cursor: "pointer" }} onClick={() => { refetchAllowedEmails(); setModalEmail(g.email); }}>
                    <td className="lbl">{g.email}</td>
                    <td><span className={'tag' + (g.balance > 0 ? ' teal' : '')}>{g.balance}</span></td>
                    <td>{new Date(g.lastActivity).toLocaleString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </Panel>

          {modalGroup && createPortal(
            <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setModalEmail(null)}>
              <div className="mbox" style={{ background: "#fff", borderRadius: 12, padding: "24px 26px", maxWidth: 480, width: "90%", maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 4 }}>
                  <h2 style={{ margin: 0, fontSize: 16, wordBreak: "break-all" }}>{modalGroup.email}</h2>
                  <span className={'tag' + (modalGroup.balance > 0 ? ' teal' : '')} style={{ fontSize: 15, flexShrink: 0 }}>{modalGroup.balance} kredi</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {modalGroup.entries.map(e => (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line2)" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: e.taskCredits < 0 ? "var(--red)" : "var(--green)", minWidth: 32 }}>{e.taskCredits > 0 ? `+${e.taskCredits}` : e.taskCredits}</span>
                      <span style={{ flex: 1, color: "var(--muted)", fontSize: 12.5 }}>{e.note || "—"}</span>
                      <span style={{ fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{new Date(e.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                  ))}
                </div>
                <div className="actions" style={{ justifyContent: "flex-end" }}><button className="btn" type="button" onClick={() => setModalEmail(null)}>Kapat</button></div>
              </div>
            </div>,
            document.body
          )}

          <Panel title={`Açılmış task'lar (${tasks.length})`} flush>
            <div className="scroll"><table className="g">
              <thead><tr className="hd solo"><th className="lbl">Firma</th><th>Başlık</th><th>Standart</th><th>Kullanıcı</th><th>Tarih</th></tr></thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td className="lbl">{t.companyName}</td>
                    <td>{t.title}</td>
                    <td><span className={'tag' + (t.accountingStandard === 'UsGaap' ? ' teal' : '')}>{t.accountingStandard === 'UsGaap' ? 'GAAP' : 'TDH'}</span></td>
                    <td>{users.find(u => u.id === t.userId)?.userName || t.userId}</td>
                    <td>{new Date(t.createdAt).toLocaleString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </Panel>
        </div>
      </header>
    </div>
  );
}
