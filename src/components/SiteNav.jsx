import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { updateAsLoggedOut } from "../slices/UserSlice";
import "../siteNav.css";
import logo from "../assets/finvestimaLogo.jpeg";

const MOTOR_LINKS = [
  { to: "/valuator-pro", label: "Valuator Pro" },
];

export default function SiteNav() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const isLoggedIn = useSelector((state) => state.users.isLoggedIn);
  const isAdmin = useSelector((state) => state.users.isAdmin);
  const email = useSelector((state) => state.users.email);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) { setProfileOpen(false); setConfirmingLogout(false); } };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  function handleLogout() {
    dispatch(updateAsLoggedOut());
    navigate("/login");
  }

  function go(e, to) {
    e.preventDefault();
    setNavOpen(false);
    navigate(to);
  }

  return (
    <nav className="site-nav">
      <div className="wrap navin">
        <Link to="/">
          <img className="logo" src={logo} alt="Finvestima" />
        </Link>
        <button className="burger" aria-label="Menü" onClick={() => setNavOpen((v) => !v)}>
          ☰
        </button>
        <div className={"navlinks" + (navOpen ? " open" : "")} onClick={() => setNavOpen(false)}>
          {isAdmin && (
            <a href="/valuator-pro-admin" className={"motor-link" + (location.pathname === "/valuator-pro-admin" ? " active" : "")} onClick={e => go(e, "/valuator-pro-admin")}>
              Admin
            </a>
          )}
          {MOTOR_LINKS.map((l) => (
            <a key={l.to} href={l.to} className={"motor-link" + (location.pathname === l.to ? " active" : "")} onClick={e => go(e, l.to)}>
              {l.label}
            </a>
          ))}
          <a href="/#nasil">Nasıl çalışır</a>
          <a href="/#mercek">Üç mercek</a>
          <a href="/#denetim">Denetim</a>
          <a href="/#fiyat">Fiyatlandırma</a>
          <a href="/#sss">SSS</a>
          <a href="/#demo" className="cta-link">Ön tarama isteyin</a>
          {isLoggedIn && (
            <div ref={profileRef} style={{ position: "relative", display: "inline-flex" }}>
              <button
                type="button"
                aria-label="Profil"
                onClick={() => setProfileOpen(v => !v)}
                style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #0A2A5C", background: "transparent", color: "#0A2A5C", display: "grid", placeItems: "center", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
                </svg>
              </button>
              {profileOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 220, background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.18)", padding: 14, zIndex: 50 }}>
                  <div style={{ fontSize: 13, color: "#555", wordBreak: "break-all", marginBottom: 10 }}>{email}</div>
                  {!confirmingLogout ? (
                    <button type="button" className="navlink-btn" style={{ width: "100%" }} onClick={() => setConfirmingLogout(true)}>
                      Çıkış yap
                    </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>Çıkmak istediğinize emin misiniz?</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="navlink-btn" style={{ flex: 1 }} onClick={handleLogout}>Evet, çıkış yap</button>
                        <button type="button" style={{ flex: 1, border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }} onClick={() => setConfirmingLogout(false)}>Vazgeç</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
