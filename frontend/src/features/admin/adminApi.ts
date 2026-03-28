import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from '@/app/baseQuery'

export interface AdminConfig {
  nightscout: { url: string; apiKey: string }
  pushover: { appToken: string; userKey: string }
  telegram: { botToken: string; chatId: string }
}

export interface SchedulerConfig {
  expression: string
  nextRun: string | null
}

export interface DatabaseStats {
  totalSizeMb: number
  storageSizeMb: number
  collections: number
  jobExecutions: { count: number; sizeMb: number }
}

export type GlucoseUnit = 'mg/dL' | 'mmol/L'

export interface GlucoseRange {
  name: string
  lowerLimit: number
  upperLimit: number
}

export interface GlucoseLimits {
  unit: GlucoseUnit
  ranges: GlucoseRange[]
}

export type ServiceKey = 'nightscout' | 'pushover' | 'telegram'

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['AdminConfig', 'DatabaseStats', 'Scheduler', 'GlucoseLimits'],
  endpoints: (builder) => ({
    getAdminConfig: builder.query<AdminConfig, void>({
      query: () => '/admin/config',
      providesTags: ['AdminConfig'],
    }),
    updateNightscout: builder.mutation<void, { url: string; apiKey: string }>({
      query: (body) => ({ url: '/admin/config/nightscout', method: 'PATCH', body }),
      invalidatesTags: ['AdminConfig'],
    }),
    updatePushover: builder.mutation<void, { appToken: string; userKey: string }>({
      query: (body) => ({ url: '/admin/config/pushover', method: 'PATCH', body }),
      invalidatesTags: ['AdminConfig'],
    }),
    updateTelegram: builder.mutation<void, { botToken: string; chatId: string }>({
      query: (body) => ({ url: '/admin/config/telegram', method: 'PATCH', body }),
      invalidatesTags: ['AdminConfig'],
    }),
    testConnection: builder.mutation<{ ok: boolean }, { service: ServiceKey; config: Record<string, string> }>({
      query: ({ service, config }) => ({ url: `/admin/config/test/${service}`, method: 'POST', body: config }),
    }),
    getDatabaseStats: builder.query<DatabaseStats, void>({
      query: () => '/admin/database',
      providesTags: ['DatabaseStats'],
    }),
    deleteJobExecutions: builder.mutation<{ deletedCount: number }, string>({
      query: (before) => ({ url: `/admin/database/job-executions?before=${encodeURIComponent(before)}`, method: 'DELETE' }),
      invalidatesTags: ['DatabaseStats'],
    }),
    getSchedulerConfig: builder.query<SchedulerConfig, void>({
      query: () => '/admin/scheduler',
      providesTags: ['Scheduler'],
    }),
    updateScheduler: builder.mutation<SchedulerConfig, string>({
      query: (expression) => ({ url: '/admin/scheduler', method: 'PATCH', body: { expression } }),
      invalidatesTags: ['Scheduler'],
    }),
    getGlucoseLimits: builder.query<GlucoseLimits, void>({
      query: () => '/admin/glucose-limits',
      providesTags: ['GlucoseLimits'],
    }),
    updateGlucoseLimits: builder.mutation<void, GlucoseLimits>({
      query: (body) => ({ url: '/admin/glucose-limits', method: 'PATCH', body }),
      invalidatesTags: ['GlucoseLimits'],
    }),
  }),
})

export const {
  useGetAdminConfigQuery,
  useUpdateNightscoutMutation,
  useUpdatePushoverMutation,
  useUpdateTelegramMutation,
  useTestConnectionMutation,
  useGetDatabaseStatsQuery,
  useDeleteJobExecutionsMutation,
  useGetSchedulerConfigQuery,
  useUpdateSchedulerMutation,
  useGetGlucoseLimitsQuery,
  useUpdateGlucoseLimitsMutation,
} = adminApi
