import React from "react";
import TopBar from "../components/TopBar";

export default function ValuatorPro() {
  return (
    <div className="App">
      <header className="App-header">
        <div style={styles.pageWrap}>
          <TopBar />
          <iframe
            src="/valuator-pro/index.html"
            title="Valuator Pro"
            style={styles.frame}
          />
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
  frame: {
    flex: 1,
    border: "none",
    width: "100%",
  },
};
