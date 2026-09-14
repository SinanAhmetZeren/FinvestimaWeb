import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:5192"
  : "https://api.finvestima.com";

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  timeout: 15000,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("storedToken");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    const refreshToken = localStorage.getItem("storedRefreshToken");
    if (!refreshToken) {
      return result;
    }
    const refreshResult = await baseQuery(
      {
        url: "/api/account/refresh-token",
        method: "POST",
        body: { refreshToken },
      },
      api,
      extraOptions
    );
    if (refreshResult.data) {
      localStorage.setItem("storedToken", refreshResult.data.token);
      localStorage.setItem("storedRefreshToken", refreshResult.data.refreshToken);
      result = await baseQuery(args, api, extraOptions);
    } else {
      localStorage.removeItem("storedToken");
      localStorage.removeItem("storedRefreshToken");
      localStorage.removeItem("storedUserId");
      localStorage.removeItem("storedUserName");
      window.location.href = "/login";
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User"],
  endpoints: (builder) => ({}),
});
