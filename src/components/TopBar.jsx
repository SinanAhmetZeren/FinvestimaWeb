import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { updateAsLoggedOut } from "../slices/UserSlice";
import logo from "../assets/finvestimaLogo.jpeg";

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
      <img src={logo} alt="Finvestima" style={styles.logoImg} />
      <nav style={styles.tabs}>
        <Link to="/dcf" style={styles.tab(location.pathname === "/dcf")}>
          DCF
        </Link>
        <Link to="/extract" style={styles.tab(location.pathname === "/extract")}>
          Extract
        </Link>
        <Link to="/valuator" style={styles.tab(location.pathname === "/valuator")}>
          Valuator
        </Link>
      </nav>
      <span style={styles.spacer} />
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
    gap: "22px",
    padding: "0 18px",
    height: "50px",
    background: "var(--paper)",
    borderBottom: "1px solid var(--rule)",
  },
  logoImg: {
    height: "39px",
    width: "auto",
    display: "block",
  },
  tabs: {
    display: "flex",
    gap: "2px",
    height: "100%",
  },
  tab: (active) => ({
    display: "flex",
    alignItems: "center",
    fontSize: "13.5px",
    fontWeight: active ? 600 : 500,
    color: active ? "var(--ink)" : "var(--ink-3)",
    padding: "0 13px",
    height: "100%",
    borderBottom: active ? "2px solid var(--teal)" : "2px solid transparent",
    textDecoration: "none",
  }),
  spacer: {
    flex: 1,
  },
  logout: {
    fontFamily: "inherit",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--ink-3)",
  },
};
