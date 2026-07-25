import { baseApi } from './api';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<any, any>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    signup: builder.mutation<any, FormData | any>({
      query: (data) => ({
        url: '/auth/signup',
        method: 'POST',
        body: data,
      }),
    }),
    verifyOtp: builder.mutation<any, { userId: string; otp: string }>({
      query: (data) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body: data,
      }),
    }),
    forgotPassword: builder.mutation<any, { email: string }>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<any, { userId: string; otp: string; newPassword: string }>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    resendOtp: builder.mutation<any, { userId: string }>({
      query: (data) => ({
        url: '/auth/resend-otp',
        method: 'POST',
        body: data,
      }),
    }),

    // ── Existing public lookup endpoints ───────────────────────────────────
    getCountries: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/countries',
        method: 'GET',
        params: params || {},
      }),
    }),
    getEducations: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/educations',
        method: 'GET',
        params: params || {},
      }),
    }),
    getSkills: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/skills',
        method: 'GET',
        params: params || {},
      }),
    }),
    getJobTypes: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/job-types',
        method: 'GET',
        params: params || {},
      }),
    }),
    getExperienceLevels: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/experience-levels',
        method: 'GET',
        params: params || {},
      }),
    }),
    getLocations: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/locations',
        method: 'GET',
        params: params || {},
      }),
    }),
    getDomains: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/domains',
        method: 'GET',
        params: params || {},
      }),
    }),

    // ── New public lookup endpoints (Task 3) ───────────────────────────────
    /** GET /languages — returns { data: [{ _id, name, isActive }] } */
    getLanguages: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/languages',
        method: 'GET',
        params: params || {},
      }),
    }),
    /** GET /language-proficiencies — returns { data: [{ _id, name, isActive }] } */
    getLanguageProficiencies: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/language-proficiencies',
        method: 'GET',
        params: params || {},
      }),
    }),
    /** GET /roles — returns { data: [{ _id, name, isActive }] } */
    getRoles: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/roles',
        method: 'GET',
        params: params || {},
      }),
    }),
    /** GET /universities — returns { data: [{ _id, name, isActive }] } */
    getUniversities: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/universities',
        method: 'GET',
        params: params || {},
      }),
    }),
    /** GET /courses — returns { data: [{ _id, name, isActive }] } */
    getCourses: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/courses',
        method: 'GET',
        params: params || {},
      }),
    }),
    /** GET /specializations — returns { data: [{ _id, name, isActive }] } */
    getSpecializations: builder.query<any, { search?: string } | void>({
      query: (params) => ({
        url: '/specializations',
        method: 'GET',
        params: params || {},
      }),
    }),
  }),
});

export const { 
  useLoginMutation, 
  useSignupMutation, 
  useVerifyOtpMutation, 
  useForgotPasswordMutation, 
  useResetPasswordMutation,
  useResendOtpMutation,
  useGetCountriesQuery,
  useGetEducationsQuery,
  useGetSkillsQuery,
  useGetJobTypesQuery,
  useGetExperienceLevelsQuery,
  useGetLocationsQuery,
  useGetDomainsQuery,
  // New lookup hooks
  useGetLanguagesQuery,
  useGetLanguageProficienciesQuery,
  useGetRolesQuery,
  useGetUniversitiesQuery,
  useGetCoursesQuery,
  useGetSpecializationsQuery,
} = authApi;
