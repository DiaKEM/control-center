import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { LoginResponse } from '@/features/auth/authApi';

export interface SetupStatus {
  installed: boolean;
}

export interface InstallRequest {
  username: string;
  password: string;
}

export const setupApi = createApi({
  reducerPath: 'setupApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getSetupStatus: builder.query<SetupStatus, void>({
      query: () => '/setup/status',
    }),
    install: builder.mutation<LoginResponse, InstallRequest>({
      query: (body) => ({ url: '/setup/install', method: 'POST', body }),
    }),
  }),
});

export const { useGetSetupStatusQuery, useInstallMutation } = setupApi;
