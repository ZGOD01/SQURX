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
} = authApi;
