import { useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  useLoginUserMutation,
  useRegisterUserMutation,
  useConfirmUserMutation,
  useRequestCodeMutation,
  useResetPasswordMutation,
  updateAsLoggedIn,
} from "../slices/UserSlice";
import logo from "../assets/finvestimaLogo.jpeg";

// ── tokens ────────────────────────────────────────────────────────────────────
const C = {
  blue: "#2C4A87",
  blueDk: "#1F3B73",
  blueLt: "#5B7FC7",
  teal: "#2EC4B6",
  navy: "#0A2540",
  mid: "#5C6B7A",
  line: "#D9E2EC",
};

function EyeBtn({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} style={s.eye} aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}>
      {show ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
          <path d="M4 4l16 16" />
          <path d="M9.6 6.1A9.6 9.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3 3.8" />
          <path d="M6.7 8.3A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1 0 1.9-.1 2.7-.4" />
          <path d="M9.6 9.8a2.8 2.8 0 0 0 3.9 3.9" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      )}
    </button>
  );
}

function HintPill({ rules }) {
  return (
    <div style={s.hintPill}>
      {rules.map(({ label, ok }) => (
        <div key={label} style={{ color: ok ? "#a8e6cf" : "#ffb3b3", fontSize: 13.5, fontWeight: 600 }}>
          {ok ? "✓" : "✗"} {label}
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 22, height: 22, border: "3px solid rgba(255,255,255,.35)", borderTop: "3px solid #fff", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto" }} />;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loginUser] = useLoginUserMutation();
  const [registerUser] = useRegisterUserMutation();
  const [confirmUser] = useConfirmUserMutation();
  const [requestCode] = useRequestCodeMutation();
  const [resetPassword] = useResetPasswordMutation();

  // page states: Login | ForgotPassword | Register1 | Register2 | ResetPassword
  const [page, setPage] = useState("Login");
  const [busy, setBusy] = useState(false);
  const [noAccessModal, setNoAccessModal] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [usernameReg, setUsernameReg] = useState("");
  const [emailReg, setEmailReg] = useState("");
  const [passwordReg, setPasswordReg] = useState("");
  const [passwordReg2, setPasswordReg2] = useState("");
  const [showPwReg, setShowPwReg] = useState(false);
  const [showPwReg2, setShowPwReg2] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [emailForgot, setEmailForgot] = useState("");

  const [confirmCode, setConfirmCode] = useState("");
  const [sixCode, setSixCode] = useState("");
  const [pwUpdate1, setPwUpdate1] = useState("");
  const [pwUpdate2, setPwUpdate2] = useState("");
  const [showPwU1, setShowPwU1] = useState(false);
  const [showPwU2, setShowPwU2] = useState(false);

  const resetForms = () => {
    setUsernameReg(""); setEmailReg(""); setEmailForgot("");
    setPasswordReg(""); setPasswordReg2("");
    setPwUpdate1(""); setPwUpdate2("");
    setConfirmCode(""); setSixCode("");
    setFocusedField(null);
  };

  const go = (p) => { resetForms(); setPage(p); };

  const applyLogin = (r) => {
    dispatch(updateAsLoggedIn({
      userId: r.userId,
      token: r.token,
      refreshToken: r.refreshToken,
      userName: r.userName,
      email: r.email,
      isAdmin: r.isAdmin,
    }));
    navigate("/");
  };

  const handleLogin = async () => {
    if (!username || !password) { toast.error("Lütfen e-posta ve şifrenizi girin."); return; }
    try {
      setBusy(true);
      const r = await loginUser({ email: username, password }).unwrap();
      if (!r?.token) { toast.error("Giriş başarısız: Geçersiz bilgiler."); return; }
      applyLogin(r);
      setUsername(""); setPassword("");
    } catch (err) {
      toast.error(err.status === 401 ? "E-posta ya da şifre hatalı." : "Giriş başarısız. Lütfen tekrar deneyin.");
    } finally { setBusy(false); }
  };

  const handleRegister = async () => {
    if (!usernameReg || !emailReg || !passwordReg || !passwordReg2) { toast.error("Tüm alanlar zorunludur."); return; }
    if (passwordReg !== passwordReg2) { toast.error("Şifreler eşleşmiyor."); return; }
    const pwOk = passwordReg.length >= 8 && /[A-Z]/.test(passwordReg) && /[a-z]/.test(passwordReg) && /[0-9]/.test(passwordReg);
    if (!pwOk) { toast.error("Şifre en az 8 karakter olmalı, büyük/küçük harf ve rakam içermeli."); return; }
    try {
      setBusy(true);
      const r = await registerUser({ email: emailReg, userName: usernameReg, password: passwordReg }).unwrap();
      if (r?.token) { setUsernameReg(""); setPasswordReg(""); setPasswordReg2(""); setPage("Register2"); }
      else toast.error("Kayıt başarısız: Token alınamadı.");
    } catch (err) {
      const d = err?.data;
      if (d?.code === "no_access") { setNoAccessModal(true); setBusy(false); return; }
      toast.error((typeof d === "string" ? d : d?.error || d?.title || d?.message) || "Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.");
    } finally { setBusy(false); }
  };

  const handleConfirm = async () => {
    if (!confirmCode) return;
    try {
      setBusy(true);
      const r = await confirmUser({ email: emailReg, code: confirmCode }).unwrap();
      setConfirmCode(""); setEmailReg("");
      if (r.token) applyLogin(r);
    } catch { toast.error("Doğrulama kodu geçersiz. Lütfen tekrar deneyin."); }
    finally { setBusy(false); }
  };

  const handleSendCode = async () => {
    if (!emailForgot) return;
    try {
      setBusy(true);
      await requestCode(emailForgot).unwrap();
      const email = emailForgot;
      resetForms();
      setEmailForgot(email);
      setPage("ResetPassword");
    } catch { toast.error("Kod gönderilemedi. Lütfen e-postanızı kontrol edin."); }
    finally { setBusy(false); }
  };

  const handleResetPassword = async () => {
    if (!sixCode || !pwUpdate1 || !pwUpdate2) return;
    if (pwUpdate1 !== pwUpdate2) { toast.error("Şifreler eşleşmiyor."); return; }
    try {
      setBusy(true);
      const r = await resetPassword({ email: emailForgot, password: pwUpdate1, confirmationCode: sixCode }).unwrap();
      setPwUpdate1(""); setPwUpdate2(""); setSixCode("");
      if (r.token) applyLogin(r);
    } catch { toast.error("Şifre sıfırlanamadı. Lütfen kodunuzu kontrol edin."); }
    finally { setBusy(false); }
  };

  const usernameRules = [
    { label: "En az 3 karakter", ok: usernameReg.trim().length >= 3 },
    { label: "En fazla 50 karakter", ok: usernameReg.length <= 50 },
    { label: "Sadece harf, rakam, boşluk, tire", ok: usernameReg.length === 0 || /^[\p{L}0-9 '-]+$/u.test(usernameReg) },
  ];
  const emailRules = [{ label: "Geçerli e-posta formatı", ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailReg) }];
  const passwordRules = [
    { label: "En az 8 karakter", ok: passwordReg.length >= 8 },
    { label: "Bir büyük harf", ok: /[A-Z]/.test(passwordReg) },
    { label: "Bir küçük harf", ok: /[a-z]/.test(passwordReg) },
    { label: "Bir rakam", ok: /[0-9]/.test(passwordReg) },
    { label: "Şifreler eşleşiyor", ok: passwordReg.length > 0 && passwordReg === passwordReg2 },
  ];

  const registerReady = usernameReg.trim().length >= 3 && /^[\p{L}0-9 '-]+$/u.test(usernameReg)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailReg)
    && passwordReg.length >= 8 && /[A-Z]/.test(passwordReg) && /[a-z]/.test(passwordReg) && /[0-9]/.test(passwordReg)
    && passwordReg === passwordReg2;

  return (
    <div style={s.root}>
      <div style={s.hero}>
        <div style={s.frame}>
          <div style={s.card}>
            <img src={logo} alt="Finvestima" style={s.logo} />

            {page === "Login" && (
              <>
                <div style={s.fields}>
                  <div style={s.fld}>
                    <input style={s.input} type="email" placeholder="E-posta" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="email" />
                  </div>
                  <div style={s.fld}>
                    <input style={s.input} type={showPw ? "text" : "password"} placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} autoComplete="current-password" />
                    <EyeBtn show={showPw} onToggle={() => setShowPw(v => !v)} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={s.lnk} onClick={() => go("ForgotPassword")}>Şifremi unuttum</button>
                  </div>
                  <button style={{ ...s.btn, opacity: username && password ? 1 : 0.55 }} onClick={handleLogin} disabled={busy || !username || !password}>
                    {busy ? <Spinner /> : "Giriş yap"}
                  </button>
                  <div style={s.rowMid}>
                    Hesabınız yok mu?
                    <button style={s.lnk} onClick={() => go("Register1")}>Üye olun</button>
                  </div>
                </div>
              </>
            )}

            {page === "ForgotPassword" && (
              <>
                <div style={s.fields}>
                  <div style={s.fld}>
                    <input style={s.input} type="email" placeholder="E-posta girin" value={emailForgot} onChange={e => setEmailForgot(e.target.value)} autoComplete="email" />
                  </div>
                  <button style={{ ...s.btn, opacity: emailForgot ? 1 : 0.55 }} onClick={handleSendCode} disabled={busy || !emailForgot}>
                    {busy ? <Spinner /> : "Kod gönder"}
                  </button>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={s.lnk} onClick={() => go("Login")}>Girişe dön</button>
                  </div>
                </div>
              </>
            )}

            {page === "Register1" && (
              <>
                <div style={{ ...s.fields, position: "relative" }}>
                  {focusedField === "username" && <HintPill rules={usernameRules} />}
                  {focusedField === "email" && <HintPill rules={emailRules} />}
                  {(focusedField === "password" || focusedField === "password2") && <HintPill rules={passwordRules} />}
                  <div style={s.fld}>
                    <input style={s.input} type="text" placeholder="Ad Soyad" value={usernameReg} maxLength={50} onChange={e => setUsernameReg(e.target.value)} onFocus={() => setFocusedField("username")} onBlur={() => setFocusedField(null)} autoComplete="name" />
                  </div>
                  <div style={s.fld}>
                    <input style={s.input} type="email" placeholder="E-posta" value={emailReg} onChange={e => setEmailReg(e.target.value)} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} autoComplete="email" />
                  </div>
                  <div style={s.fld}>
                    <input style={s.input} type={showPwReg ? "text" : "password"} placeholder="Şifre" value={passwordReg} onChange={e => setPasswordReg(e.target.value)} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} autoComplete="new-password" />
                    <EyeBtn show={showPwReg} onToggle={() => setShowPwReg(v => !v)} />
                  </div>
                  <div style={s.fld}>
                    <input style={s.input} type={showPwReg2 ? "text" : "password"} placeholder="Şifre tekrar" value={passwordReg2} onChange={e => setPasswordReg2(e.target.value)} onFocus={() => setFocusedField("password2")} onBlur={() => setFocusedField(null)} autoComplete="new-password" />
                    <EyeBtn show={showPwReg2} onToggle={() => setShowPwReg2(v => !v)} />
                  </div>
                  <button style={{ ...s.btn, opacity: registerReady ? 1 : 0.55 }} onClick={handleRegister} disabled={busy || !registerReady}>
                    {busy ? <Spinner /> : "Üye ol"}
                  </button>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={s.lnk} onClick={() => go("Login")}>Girişe dön</button>
                  </div>
                </div>
              </>
            )}

            {page === "Register2" && (
              <>
                <div style={s.fields}>
                  <div style={s.fld}>
                    <input style={{ ...s.input, letterSpacing: "0.3em" }} type="text" placeholder="Doğrulama kodu" value={confirmCode} onChange={e => setConfirmCode(e.target.value)} inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
                  </div>
                  <button style={{ ...s.btn, opacity: confirmCode ? 1 : 0.55 }} onClick={handleConfirm} disabled={busy || !confirmCode}>
                    {busy ? <Spinner /> : "Onayla"}
                  </button>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={s.lnk} onClick={() => go("Login")}>Girişe dön</button>
                  </div>
                </div>
              </>
            )}

            {page === "ResetPassword" && (
              <>
                <div style={s.fields}>
                  <div style={s.fld}>
                    <input style={{ ...s.input, letterSpacing: "0.3em" }} type="text" placeholder="6 haneli kodu girin" value={sixCode} onChange={e => setSixCode(e.target.value)} inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
                  </div>
                  <div style={s.fld}>
                    <input style={s.input} type={showPwU1 ? "text" : "password"} placeholder="Yeni şifre" value={pwUpdate1} onChange={e => setPwUpdate1(e.target.value)} autoComplete="new-password" />
                    <EyeBtn show={showPwU1} onToggle={() => setShowPwU1(v => !v)} />
                  </div>
                  <div style={s.fld}>
                    <input style={s.input} type={showPwU2 ? "text" : "password"} placeholder="Yeni şifre tekrar" value={pwUpdate2} onChange={e => setPwUpdate2(e.target.value)} autoComplete="new-password" />
                    <EyeBtn show={showPwU2} onToggle={() => setShowPwU2(v => !v)} />
                  </div>
                  <button style={{ ...s.btn, opacity: sixCode && pwUpdate1 && pwUpdate2 ? 1 : 0.55 }} onClick={handleResetPassword} disabled={busy || !sixCode || !pwUpdate1 || !pwUpdate2}>
                    {busy ? <Spinner /> : "Şifreyi güncelle"}
                  </button>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={s.lnk} onClick={() => go("Login")}>Girişe dön</button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {noAccessModal && createPortal(
        <div style={s.modalOverlay} onClick={() => setNoAccessModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...s.h1, textAlign: "left", fontSize: 18 }}>Erişiminiz henüz tanımlanmamış</h2>
            <p style={{ color: C.mid, fontSize: 14, lineHeight: 1.55, margin: "10px 0 20px" }}>
              Bu e-posta adresiyle kayıt olabilmeniz için önce sistem yöneticinizin size erişim tanımlaması gerekiyor. Lütfen yöneticinizle iletişime geçin.
            </p>
            <button style={s.btn} onClick={() => setNoAccessModal(false)}>Anladım</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const s = {
  root: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${C.blueDk}, ${C.navy})`,
    display: "flex",
    flexDirection: "column",
  },
  hero: {
    position: "relative",
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "26px 18px",
  },
  frame: {
    position: "relative",
    background: C.blueDk,
    borderRadius: 24,
    padding: 11,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 22px 60px rgba(0,10,24,.5)",
  },
  card: {
    background: "#fff",
    borderRadius: 18,
    padding: "34px 36px 32px",
  },
  logo: {
    display: "block",
    maxWidth: "200px",
    margin: "0 auto 22px",
  },
  h1: {
    fontSize: 19, fontWeight: 800, letterSpacing: "-.01em",
    color: C.blue, textAlign: "center", lineHeight: 1.1, margin: "0 0 4px",
  },
  sub: {
    fontSize: 13.5, fontWeight: 600, color: C.mid, textAlign: "center", margin: "0 0 8px",
  },
  fields: {
    display: "flex", flexDirection: "column", gap: 11, marginTop: 8,
  },
  fld: {
    position: "relative", display: "flex",
  },
  chk: {
    display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, fontWeight: 600, color: C.mid, cursor: "pointer",
  },
  input: {
    fontFamily: "inherit",
    width: "100%", fontSize: 15, fontWeight: 700, color: C.navy,
    background: "#fff", border: `1.5px solid ${C.line}`,
    borderRadius: 99, padding: "10px 44px 10px 16px",
    outline: "none",
  },
  eye: {
    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
    width: 40, height: 40, border: "none", background: "none",
    borderRadius: "50%", color: C.mid,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0,
  },
  lnk: {
    fontFamily: "inherit", background: "none", border: "none", padding: 0,
    fontSize: 14.5, fontWeight: 800, color: C.blueDk, cursor: "pointer",
  },
  rowMid: {
    display: "flex", justifyContent: "center", alignItems: "center", gap: 7,
    fontSize: 14.5, fontWeight: 700, color: C.mid,
  },
  btn: {
    fontFamily: "inherit", border: "none", width: "100%",
    fontSize: 14, fontWeight: 700, color: "#fff",
    background: C.teal, borderRadius: 20,
    height: 40, padding: "0 12px", cursor: "pointer", marginTop: 5,
    boxShadow: "0 6px 16px rgba(46,196,182,.35)",
    transition: "background .15s",
  },
  hintPill: {
    position: "absolute",
    top: "50%", left: "calc(100% + 16px)",
    transform: "translateY(-50%)",
    background: C.blueDk,
    borderRadius: 20, padding: "0.75rem 1.4rem",
    zIndex: 10, whiteSpace: "nowrap",
    display: "flex", flexDirection: "column", gap: "0.3rem",
    boxShadow: "0 8px 24px rgba(0,0,0,.25)",
  },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(10,20,40,.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
  },
  modalBox: {
    background: "#fff", borderRadius: 16, padding: "26px 28px", maxWidth: 400, width: "100%",
    boxShadow: "0 20px 50px rgba(0,0,0,.3)",
  },
};
