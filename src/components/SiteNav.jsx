import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { updateAsLoggedOut } from "../slices/UserSlice";
import "../siteNav.css";
import logo from "../assets/finvestimaLogo.jpeg";

export default function SiteNav() {
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
          <Link to="/engine">Motor</Link>
          <a href="/#nasil">Nasıl çalışır</a>
          <a href="/#mercek">Üç mercek</a>
          <a href="/#denetim">Denetim</a>
          <a href="/#fiyat">Fiyatlandırma</a>
          <a href="/#sss">SSS</a>
        </div>
        <a className="btn sm" href="/#demo">
          Ön tarama isteyin
        </a>
        {isLoggedIn && (
          <div className="usermenu">
            <button
              className="burger usermenu-toggle"
              aria-label="Hesap menüsü"
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              ☰
            </button>
            {userMenuOpen && (
              <div className="usermenu-dropdown" onClick={() => setUserMenuOpen(false)}>
                <button onClick={handleLogout}>Log out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
