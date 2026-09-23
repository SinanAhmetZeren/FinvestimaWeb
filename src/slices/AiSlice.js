import { apiSlice } from "../api/apiSlice";

export const aiApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    startExtractionJob: builder.mutation({
      query: ({ file, topPercent, bottomPercent, leftPercent, rightPercent, pages, documentType, years } = {}) => {
        const formData = new FormData();
        formData.append("file", file);
        if (topPercent != null) formData.append("topPercent", topPercent);
        if (bottomPercent != null) formData.append("bottomPercent", bottomPercent);
        if (leftPercent != null) formData.append("leftPercent", leftPercent);
        if (rightPercent != null) formData.append("rightPercent", rightPercent);
        if (pages) formData.append("pages", pages);
        if (documentType) formData.append("documentType", documentType);
        if (years) formData.append("years", years);
        return {
          url: "/api/ai/extract-financials",
          method: "POST",
          body: formData,
        };
      },
    }),
    getExtractionJob: builder.query({
      query: (jobId) => `/api/ai/extract-financials/${jobId}`,
    }),
    previewLogoRedaction: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/api/ai/extract-financials/preview",
          method: "POST",
          body: formData,
        };
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
