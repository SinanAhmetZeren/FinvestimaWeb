"use client";
/* Sütun nişangahı: fare bir hücrenin üstündeyken tüm sütunu aydınlatır. */
import { useEffect, useRef } from "react";

export function useCrosshair() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clear = () => el.querySelectorAll(".colhi").forEach((c) => c.classList.remove("colhi"));
    const over = (e) => {
      clear();
      const t = e.target.closest("[data-col]");
      if (!t) return;
      el.querySelectorAll(`[data-col="${t.dataset.col}"]`).forEach((c) => c.classList.add("colhi"));
    };
    el.addEventListener("mouseover", over);
    el.addEventListener("mouseleave", clear);
    return () => { el.removeEventListener("mouseover", over); el.removeEventListener("mouseleave", clear); };
  }, []);
  return ref;
}
