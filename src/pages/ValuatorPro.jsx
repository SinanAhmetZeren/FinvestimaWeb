import React from "react";
import { useSelector } from "react-redux";
import ValuatorProEngine from "../valuator-pro/ValuatorProEngine.jsx";
import ValuatorProEngineEn from "../valuator-pro/ValuatorProEngine_en.jsx";
import "../valuator-pro/styles.css";

export default function ValuatorPro() {
  const lang = useSelector((s) => s.vpLang.lang);
  return (
    <div className="App" style={{ height: "100%" }}>
      <header className="App-header" style={styles.header}>
        <div style={styles.pageWrap}>
          {lang === "en" ? <ValuatorProEngineEn /> : <ValuatorProEngine />}
        </div>
      </header>
    </div>
  );
}

const styles = {
  header: {
    height: "100%",
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
