import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { updateAsLoggedOut } from "../slices/UserSlice";
import "../siteNav.css";
import logo from "../assets/finvestimaLogo.jpeg";

const MOTOR_LINKS = [
  { to: "/valuator-pro", label: "Valuator Pro" },
];

export default function SiteNavEn() {
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

  return (
    <nav className="site-nav">
      <div className="wrap navin">
        <Link to="/">
          <img className="logo" src={logo} alt="Finvestima" />
        </Link>
        <button className="burger" aria-label="Menu" onClick={() => setNavOpen((v) => !v)}>
          ☰
        </button>
        <div className={"navlinks" + (navOpen ? " open" : "")} onClick={() => setNavOpen(false)}>
          {MOTOR_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={"motor-link" + (location.pathname === l.to ? " active" : "")}>
              {l.label}
            </Link>
          ))}
          <a href="/#nasil">How it works</a>
          <a href="/#mercek">Three lenses</a>
          <a href="/#denetim">Audit</a>
          <a href="/#fiyat">Pricing</a>
          <a href="/#sss">FAQ</a>
          <a href="/#demo" className="cta-link">Request screening</a>
          {isAdmin && (
            <Link to="/valuator-pro-admin" className={"motor-link" + (location.pathname === "/valuator-pro-admin" ? " active" : "")}>
              Admin
            </Link>
          )}
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
