import React from "react";
import TopBar from "../components/TopBar";
import ValuatorProEngine from "../valuator-pro/ValuatorProEngine.jsx";
import "../valuator-pro/styles.css";

export default function ValuatorPro() {
  return (
    <div className="App">
      <header className="App-header" style={styles.header}>
        <div style={styles.pageWrap}>
          <TopBar />
          <ValuatorProEngine />
        </div>
      </header>
    </div>
  );
}

const styles = {
  header: {
    height: "100vh",
    minHeight: 0,
    display: "block",
    overflow: "hidden",
  },
  pageWrap: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    overflow: "hidden",
  },
};
