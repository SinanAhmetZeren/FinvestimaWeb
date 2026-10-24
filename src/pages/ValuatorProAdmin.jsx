import React, { useState } from "react";
import TopBar from "../components/TopBar";
import { Panel, Stat } from "../valuator-pro/ui.jsx";
import { useAdminCreateUserMutation, useAdminListUsersQuery, useAdminCreateTaskMutation, useAdminListTasksQuery } from "../slices/ValuatorProSlice";
import "../valuator-pro/styles.css";

export default function ValuatorProAdmin() {
  const { data: users = [] } = useAdminListUsersQuery();
  const { data: tasks = [] } = useAdminListTasksQuery();
  const [adminCreateUser, { isLoading: creatingUser }] = useAdminCreateUserMutation();
  const [adminCreateTask, { isLoading: creatingTask }] = useAdminCreateTaskMutation();
  const [msg, setMsg] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [taskUserId, setTaskUserId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taskTitle, setTaskTitle] = useState("Değerleme");
  const [accountingStandard, setAccountingStandard] = useState("Tekduzen");

  async function handleCreateUser(e) {
    e.preventDefault();
    setMsg("");
    try {
      const u = await adminCreateUser({ email: newEmail, userName: newUserName, password: newPassword }).unwrap();
      setMsg(`Kullanıcı oluşturuldu: ${u.userName} (${u.email})`);
      setNewEmail(""); setNewUserName(""); setNewPassword("");
      setTaskUserId(u.id);
    } catch (err) { setMsg(err.data || err.message || 'Kullanıcı oluşturulamadı.'); }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!taskUserId || !companyName.trim()) { setMsg("Kullanıcı ve firma adı zorunlu."); return; }
    setMsg("");
    try {
      const t = await adminCreateTask({ userId: taskUserId, companyName, taskTitle, accountingStandard }).unwrap();
      setMsg(`Task oluşturuldu: ${t.companyName} — ${t.title} (${t.accountingStandard})`);
      setCompanyName(""); setTaskTitle("Değerleme"); setAccountingStandard("Tekduzen");
    } catch (err) { setMsg(err.data || err.message || 'Task oluşturulamadı.'); }
  }

  return (
    <div className="App vp-root">
      <header className="App-header" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <TopBar />
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px 60px", textAlign: "left", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ color: "var(--navy)", margin: "4px 0 0" }}>Valuator Pro — Admin</h2>
          {msg && <div className="tag" style={{ padding: "8px 12px", fontSize: 12.5, width: "fit-content" }}>{String(msg)}</div>}

          <Panel title="1. Yeni kullanıcı oluştur" sub="Ödeme/fatura teyit edildikten sonra">
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <input className="ninp" style={{ width: 200, textAlign: "left" }} placeholder="Email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              <input className="ninp" style={{ width: 150, textAlign: "left" }} placeholder="Kullanıcı adı" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
              <input className="ninp" style={{ width: 150, textAlign: "left" }} placeholder="Geçici şifre" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <button className="btn" type="submit" disabled={creatingUser}>Kullanıcı oluştur</button>
            </form>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 10 }}>
              <Stat kind={newPassword.length >= 8 ? 'ok' : 'er'}>En az 8 karakter</Stat>
              <Stat kind={/[a-z]/.test(newPassword) ? 'ok' : 'er'}>Küçük harf</Stat>
              <Stat kind={/[A-Z]/.test(newPassword) ? 'ok' : 'er'}>Büyük harf</Stat>
              <Stat kind={/[0-9]/.test(newPassword) ? 'ok' : 'er'}>Rakam</Stat>
            </div>
          </Panel>

          <Panel title="2. Task (firma değerlemesi) oluştur">
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <select className="csel" value={taskUserId} onChange={e => setTaskUserId(e.target.value)} required>
                <option value="">Kullanıcı seçin…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.userName} ({u.email})</option>)}
              </select>
              <input className="ninp" style={{ width: 200, textAlign: "left" }} placeholder="Firma adı" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
              <input className="ninp" style={{ width: 150, textAlign: "left" }} placeholder="Task başlığı" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              <select className="csel" value={accountingStandard} onChange={e => setAccountingStandard(e.target.value)}>
                <option value="Tekduzen">Tekdüzen</option>
                <option value="UsGaap">GAAP</option>
              </select>
              <button className="btn" type="submit" disabled={creatingTask}>Task oluştur</button>
            </form>
          </Panel>

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
