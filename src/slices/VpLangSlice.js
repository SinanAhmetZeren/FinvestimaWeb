import { createSlice } from "@reduxjs/toolkit";

// Valuator Pro'nun TR/EN toggle'ı — localStorage'a yazılmaz, oturum boyunca geçerlidir,
// sadece hangi layer dosya setinin (Inputs.jsx vs Inputs_en.jsx, ...) render edileceğini seçer.
const vpLangSlice = createSlice({
  name: "vpLang",
  initialState: { lang: "tr", pendingTaskId: null },
  reducers: {
    setVpLang: (state, action) => {
      state.lang = action.payload === "en" ? "en" : "tr";
    },
    // Bir task seçilince onun standardı mevcut dil ile uyuşmuyorsa, dil değişimi motoru
    // remount edip L0'a döner — remount sonrası otomatik seçilsin diye id burada bekletilir.
    setPendingTask: (state, action) => {
      state.pendingTaskId = action.payload;
    },
    clearPendingTask: (state) => {
      state.pendingTaskId = null;
    },
  },
});

export const { setVpLang, setPendingTask, clearPendingTask } = vpLangSlice.actions;
export default vpLangSlice.reducer;
