import { apiSlice } from "../api/apiSlice";

export const dcfApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    calculateDcf: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/api/dcf/calculate",
          method: "POST",
          body: formData,
        };
      },
    }),
  }),
  overrideExisting: true,
});

export const { useCalculateDcfMutation } = dcfApiSlice;
