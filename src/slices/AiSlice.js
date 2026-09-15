import { apiSlice } from "../api/apiSlice";

export const aiApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    startExtractionJob: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
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
  }),
  overrideExisting: true,
});

export const { useStartExtractionJobMutation, useLazyGetExtractionJobQuery } = aiApiSlice;
