import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from '@/app/baseQuery'

export type ExecutionStatus = 'running' | 'success' | 'skipped' | 'failed'

export interface JobExecution {
  _id: string
  jobTypeKey: string
  status: ExecutionStatus
  currentValue?: string
  startedAt: string
  finishedAt?: string
  needsNotification: boolean
  notificationSentAt?: string
  logs: Array<{ timestamp: string; level: 'INFO' | 'WARNING' | 'ERROR'; message: string }>
}

export interface JobExecutionFilters {
  jobTypeKey?: string
  status?: string
  from?: string
  to?: string
  needsNotification?: string
  limit?: number
}

export const JOB_TYPE_KEYS = [
  'pump-age', 'battery-level', 'sensor-age', 'insulin-level', 'pump-occlusion',
  'nightly-report', 'day-report', 'weekly-report', 'biweekly-report', 'monthly-report',
] as const
export type JobTypeKey = (typeof JOB_TYPE_KEYS)[number]

export const jobExecutionApi = createApi({
  reducerPath: 'jobExecutionApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['JobExecution'],
  endpoints: (builder) => ({
    getJobExecutions: builder.query<JobExecution[], JobExecutionFilters>({
      query: (filters) => {
        const params = new URLSearchParams()
        if (filters.jobTypeKey) params.set('jobTypeKey', filters.jobTypeKey)
        if (filters.status) params.set('status', filters.status)
        if (filters.from) params.set('from', filters.from)
        if (filters.to) params.set('to', filters.to)
        if (filters.needsNotification) params.set('needsNotification', filters.needsNotification)
        if (filters.limit) params.set('limit', String(filters.limit))
        return `/job-executions?${params.toString()}`
      },
      providesTags: ['JobExecution'],
    }),
    triggerJobs: builder.mutation<void, JobTypeKey[]>({
      query: (keys) => ({ url: '/job-manager/trigger', method: 'POST', body: { keys } }),
      invalidatesTags: ['JobExecution'],
    }),
    deleteJobExecution: builder.mutation<void, string>({
      query: (id) => ({ url: `/job-executions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['JobExecution'],
    }),
    deleteFilteredJobExecutions: builder.mutation<{ deletedCount: number }, JobExecutionFilters>({
      query: (filters) => {
        const params = new URLSearchParams()
        if (filters.jobTypeKey) params.set('jobTypeKey', filters.jobTypeKey)
        if (filters.status) params.set('status', filters.status)
        if (filters.from) params.set('from', filters.from)
        if (filters.to) params.set('to', filters.to)
        return { url: `/job-executions?${params.toString()}`, method: 'DELETE' }
      },
      invalidatesTags: ['JobExecution'],
    }),
  }),
})

export const {
  useGetJobExecutionsQuery,
  useTriggerJobsMutation,
  useDeleteJobExecutionMutation,
  useDeleteFilteredJobExecutionsMutation,
} = jobExecutionApi
