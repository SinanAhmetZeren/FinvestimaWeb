import React from "react";
import { useSelector } from "react-redux";
import SiteNav from "./SiteNav";
import SiteNavEn from "./SiteNav_en";

export default function TopBar() {
  const vpLang = useSelector((state) => state.vpLang.lang);
  return vpLang === "en" ? <SiteNavEn /> : <SiteNav />;
}
