import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { updateAsLoggedOut } from "../slices/UserSlice";
import logo from "../assets/finvestimaTransparentLogo.png";

export default function TopBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    dispatch(updateAsLoggedOut());
    navigate("/login");
  }

  return (
    <div style={styles.bar}>
      <div style={styles.logoWrap}>
        <img src={logo} alt="Finvestima" style={styles.logo} />
      </div>
      <nav style={styles.nav}>
        <Link to="/" style={styles.navLink(location.pathname === "/")}>
          DCF
        </Link>
        <Link to="/extract" style={styles.navLink(location.pathname === "/extract")}>
          Extract
        </Link>
      </nav>
      <button style={styles.logout} onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}

const styles = {
  bar: {
    flexShrink: 0,
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    background: "rgba(46, 196, 182, 0.3)",
    borderBottom: "1px solid #eee",
  },
  logoWrap: {
    background: "#fff",
    borderRadius: "1rem",
    width: "12rem",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    height: "44px",
  },
  nav: {
    display: "flex",
    gap: "8px",
  },
  navLink: (active) => ({
    padding: "8px 16px",
    borderRadius: "8px",
    border: active ? "1px solid #2C4A87" : "1px solid transparent",
    background: active ? "#fff" : "transparent",
    color: "#2C4A87",
    fontWeight: active ? 700 : 500,
    fontSize: "14px",
    textDecoration: "none",
  }),
  logout: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
  },
};
