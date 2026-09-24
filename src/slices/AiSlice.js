import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { apiSlice, API_URL } from "../api/apiSlice";

// PDF/image preview and extraction can genuinely take longer than the app's default 15s
// timeout (rasterizing a page, running Gemini) — give these endpoints a much longer budget
// instead of raising the global timeout used by fast endpoints like login/DCF.
const aiBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  timeout: 90000,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("storedToken");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const aiApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    startExtractionJob: builder.mutation({
      queryFn: async ({ file, topPercent, bottomPercent, leftPercent, rightPercent, pages, documentType, years } = {}, api, extraOptions) => {
        const formData = new FormData();
        formData.append("file", file);
        if (topPercent != null) formData.append("topPercent", topPercent);
        if (bottomPercent != null) formData.append("bottomPercent", bottomPercent);
        if (leftPercent != null) formData.append("leftPercent", leftPercent);
        if (rightPercent != null) formData.append("rightPercent", rightPercent);
        if (pages) formData.append("pages", pages);
        if (documentType) formData.append("documentType", documentType);
        if (years) formData.append("years", years);
        return aiBaseQuery(
          { url: "/api/ai/extract-financials", method: "POST", body: formData },
          api,
          extraOptions
        );
      },
    }),
    getExtractionJob: builder.query({
      query: (jobId) => `/api/ai/extract-financials/${jobId}`,
    }),
    previewLogoRedaction: builder.mutation({
      queryFn: async ({ file, page } = {}, api, extraOptions) => {
        const formData = new FormData();
        formData.append("file", file);
        if (page != null) formData.append("page", page);
        return aiBaseQuery(
          { url: "/api/ai/extract-financials/preview", method: "POST", body: formData },
          api,
          extraOptions
        );
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useStartExtractionJobMutation,
  useLazyGetExtractionJobQuery,
  usePreviewLogoRedactionMutation,
} = aiApiSlice;
