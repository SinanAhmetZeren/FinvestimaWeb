import React from "react";
import motorIcon from "../assets/motorIcon.jpg";

export default function Motor() {
  return (
    <div className="App">
      <header className="App-header">
        <div style={styles.pageWrap}>
          <div style={styles.page}>
            <img src={motorIcon} alt="Motor" style={styles.image} />
          </div>
        </div>
      </header>
    </div>
  );
}

const styles = {
  pageWrap: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100%",
    width: "100%",
  },
  page: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
  },
  image: {
    maxWidth: "48%",
    height: "auto",
  },
};
