import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { updateAsLoggedOut } from "../slices/UserSlice";
import logo from "../assets/finvestimaTransparentLogo.png";

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch(updateAsLoggedOut());
    navigate("/login");
  }

  return (
    <div style={styles.page}>
      <button style={styles.logout} onClick={handleLogout}>
        Log out
      </button>
      <img src={logo} alt="Finvestima" style={styles.logo} />
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    position: "relative",
  },
  logo: {
    maxWidth: "320px",
  },
  logout: {
    position: "absolute",
    top: "20px",
    right: "20px",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
  },
};
