import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { updateAsLoggedOut } from "../slices/UserSlice";
import logo from "../assets/finvestimaTransparentLogo.png";

export default function TopBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch(updateAsLoggedOut());
    navigate("/login");
  }

  return (
    <div style={styles.bar}>
      <div style={styles.logoWrap}>
        <img src={logo} alt="Finvestima" style={styles.logo} />
      </div>
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
  logout: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
  },
};
