import React, { useState } from "react";
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
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
            <a href="/login" className="navlink-btn" onClick={e => { e.preventDefault(); handleLogout(); }}>
              Log out
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
