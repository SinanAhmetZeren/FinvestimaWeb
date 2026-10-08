import React from "react";
import TopBar from "../components/TopBar";
import ValuatorProEngine from "../valuator-pro/ValuatorProEngine.jsx";
import "../valuator-pro/styles.css";

export default function ValuatorPro() {
  return (
    <div className="App">
      <header className="App-header">
        <div style={styles.pageWrap}>
          <TopBar />
          <ValuatorProEngine />
        </div>
      </header>
    </div>
  );
}

const styles = {
  pageWrap: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    width: "100%",
  },
};
