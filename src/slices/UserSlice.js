import { createSlice } from "@reduxjs/toolkit";
import { apiSlice } from "../api/apiSlice";

const usersSlice = createSlice({
  name: "users",
  initialState: {
    isLoggedIn: !!localStorage.getItem("storedToken"),
    userId: localStorage.getItem("storedUserId"),
    token: localStorage.getItem("storedToken"),
    refreshToken: localStorage.getItem("storedRefreshToken"),
    userName: localStorage.getItem("storedUserName"),
    isAdmin: localStorage.getItem("storedIsAdmin") === "true",
  },
  reducers: {
    updateAsLoggedIn: (state, action) => {
      state.isLoggedIn = true;
      state.userId = action.payload.userId;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.userName = action.payload.userName;
      state.isAdmin = action.payload.isAdmin ?? false;

      localStorage.setItem("storedToken", action.payload.token);
      localStorage.setItem("storedRefreshToken", action.payload.refreshToken);
      localStorage.setItem("storedUserId", action.payload.userId);
      localStorage.setItem("storedUserName", action.payload.userName);
      localStorage.setItem("storedIsAdmin", String(action.payload.isAdmin ?? false));
    },
    updateAsLoggedOut: (state) => {
      state.isLoggedIn = false;
      state.userId = "";
      state.token = "";
      state.refreshToken = "";
      state.userName = "";
      state.isAdmin = false;

      localStorage.removeItem("storedToken");
      localStorage.removeItem("storedRefreshToken");
      localStorage.removeItem("storedUserId");
      localStorage.removeItem("storedUserName");
      localStorage.removeItem("storedIsAdmin");
    },
  },
});

export const { updateAsLoggedIn, updateAsLoggedOut } = usersSlice.actions;
export default usersSlice.reducer;

export const extendedApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    registerUser: builder.mutation({
      query: (userData) => ({
        url: "/api/account/register",
        method: "POST",
        body: userData,
      }),
    }),
    confirmUser: builder.mutation({
      query: (confirmData) => ({
        url: "/api/account/confirmCode",
        method: "POST",
        body: confirmData,
      }),
    }),
    requestCode: builder.mutation({
      query: (email) => ({
        url: `/api/account/sendCode/${email}`,
        method: "POST",
      }),
    }),
    resetPassword: builder.mutation({
      query: (resetPasswordData) => ({
        url: `/api/account/resetPassword`,
        method: "POST",
        body: resetPasswordData,
      }),
    }),
    loginUser: builder.mutation({
      query: (userData) => ({
        url: "/api/account/login",
        method: "POST",
        body: userData,
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useRegisterUserMutation,
  useConfirmUserMutation,
  useRequestCodeMutation,
  useResetPasswordMutation,
  useLoginUserMutation,
} = extendedApiSlice;
