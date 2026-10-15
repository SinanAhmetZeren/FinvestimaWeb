import { apiSlice } from "../api/apiSlice";

export const valuatorProApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Dosyayı alır, bir TrialBalanceExtractionJob açar, jobId döner. Gemini çağrısı ve DB
    // yazımı arka planda yapılır — bkz. getUploadJob (poll edilir).
    uploadTrialBalance: builder.mutation({
      queryFn: async ({ file, valuationTaskId, companyName, taskTitle, maxCodeDigits } = {}, api, extraOptions, baseQuery) => {
        const formData = new FormData();
        formData.append("file", file);
        if (valuationTaskId) formData.append("valuationTaskId", valuationTaskId);
        if (companyName) formData.append("companyName", companyName);
        if (taskTitle) formData.append("taskTitle", taskTitle);
        if (maxCodeDigits) formData.append("maxCodeDigits", maxCodeDigits);
        return baseQuery({ url: "/api/ValuatorPro/upload-trial-balance", method: "POST", body: formData });
      },
    }),
    getUploadJob: builder.query({
      query: (jobId) => `/api/ValuatorPro/upload-trial-balance/${jobId}`,
    }),

    // Mizan ızgarasında elle düzeltilen bir hesabı kaydeder — eski satırın üzerine yazmaz,
    // yeni bir versiyon olarak eklenir (en son CreatedAt kazanır).
    editTrialBalanceAccount: builder.mutation({
      query: ({ valuationTaskId, year, code, name, debit, credit }) => ({
        url: "/api/ValuatorPro/trial-balance-accounts/manual-edit",
        method: "POST",
        body: { valuationTaskId, year, code, name, debit, credit },
      }),
    }),

    getValuationTask: builder.query({
      query: (valuationTaskId) => `/api/ValuatorPro/valuation-tasks/${valuationTaskId}`,
    }),

    // Bir yılı task'tan tamamen kaldırır (soft-delete) — hücre düzeltmeden farklı, yanlış bir
    // yüklemenin tümden geri çekilmesi için.
    removeYear: builder.mutation({
      query: ({ valuationTaskId, year }) => ({
        url: `/api/ValuatorPro/valuation-tasks/${valuationTaskId}/years/${year}/remove`,
        method: "POST",
      }),
    }),

    // Giriş yapan kullanıcının kendisine atanmış task'ları — kullanıcı kendisi task açmaz,
    // admin açar (bkz. admin* endpoint'leri).
    getMyValuationTasks: builder.query({
      query: () => "/api/ValuatorPro/my-valuation-tasks",
    }),

    // ── Admin ────────────────────────────────────────────────────────────────────────
    adminCreateUser: builder.mutation({
      query: ({ email, userName, password }) => ({
        url: "/api/ValuatorPro/admin/users",
        method: "POST",
        body: { email, userName, password },
      }),
      invalidatesTags: ["VPUser"],
    }),
    adminListUsers: builder.query({
      query: () => "/api/ValuatorPro/admin/users",
      providesTags: ["VPUser"],
    }),
    adminCreateTask: builder.mutation({
      query: ({ userId, companyName, taskTitle }) => ({
        url: "/api/ValuatorPro/admin/valuation-tasks",
        method: "POST",
        body: { userId, companyName, taskTitle },
      }),
      invalidatesTags: ["VPTask"],
    }),
    adminListTasks: builder.query({
      query: () => "/api/ValuatorPro/admin/valuation-tasks",
      providesTags: ["VPTask"],
    }),
  }),
  overrideExisting: true,
});

export const {
  useUploadTrialBalanceMutation,
  useLazyGetUploadJobQuery,
  useEditTrialBalanceAccountMutation,
  useLazyGetValuationTaskQuery,
  useRemoveYearMutation,
  useLazyGetMyValuationTasksQuery,
  useGetMyValuationTasksQuery,
  useAdminCreateUserMutation,
  useAdminListUsersQuery,
  useAdminCreateTaskMutation,
  useAdminListTasksQuery,
} = valuatorProApiSlice;
