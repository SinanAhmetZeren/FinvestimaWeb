import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { updateAsLoggedOut } from "../slices/UserSlice";
import "../siteNav.css";
import logo from "../assets/finvestimaLogo.jpeg";

const MOTOR_LINKS = [
  { to: "/extract", label: "Extract" },
  { to: "/valuator-pro", label: "Valuator Pro" },
  { to: "/tekduzen", label: "Tekduzen" },
];

export default function SiteNav() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const isLoggedIn = useSelector((state) => state.users.isLoggedIn);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch(updateAsLoggedOut());
    navigate("/login");
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
          {MOTOR_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={"motor-link" + (location.pathname === l.to ? " active" : "")}>
              {l.label}
            </Link>
          ))}
          <a href="/#nasil">Nasıl çalışır</a>
          <a href="/#mercek">Üç mercek</a>
          <a href="/#denetim">Denetim</a>
          <a href="/#fiyat">Fiyatlandırma</a>
          <a href="/#sss">SSS</a>
          <a href="/#demo" className="cta-link">Ön tarama isteyin</a>
          {isLoggedIn && (
            <button type="button" className="navlink-btn" onClick={handleLogout}>
              Log out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
