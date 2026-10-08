import React from "react";
import { useLocation, Link } from "react-router-dom";
import SiteNav from "./SiteNav";

export default function TopBar() {
  const location = useLocation();

  return (
    <>
      <SiteNav />
      <nav className="engine-tabs">
        <Link to="/dcf" className={location.pathname === "/dcf" ? "active" : ""}>
          DCF
        </Link>
        <Link to="/extract" className={location.pathname === "/extract" ? "active" : ""}>
          Extract
        </Link>
        <Link to="/valuator" className={location.pathname === "/valuator" ? "active" : ""}>
          Valuator
        </Link>
        <Link to="/valuator-pro" className={location.pathname === "/valuator-pro" ? "active" : ""}>
          Valuator Pro
        </Link>
        <Link to="/tekduzen" className={location.pathname === "/tekduzen" ? "active" : ""}>
          Tekduzen
        </Link>
      </nav>
    </>
  );
}
