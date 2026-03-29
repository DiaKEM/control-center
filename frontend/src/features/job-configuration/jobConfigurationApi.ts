import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from '@/app/baseQuery';

export type NotificationProvider = 'pushover' | 'telegram';
export type NotificationPriority = 'low' | 'mid' | 'high' | 'urgent';

export interface NotificationConfig {
  timePoint?: string;
  intervalHours?: number;
}

export interface JobConfiguration {
  _id: string;
  jobTypeKey: string;
  threshold: number;
  notifications: NotificationConfig[];
  provider: NotificationProvider[];
  priority: NotificationPriority;
  createdAt: string;
  updatedAt: string;
}

export type JobConfigurationPayload = Omit<
  JobConfiguration,
  '_id' | 'createdAt' | 'updatedAt'
>;

export const jobConfigurationApi = createApi({
  reducerPath: 'jobConfigurationApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['JobConfiguration'],
  endpoints: (builder) => ({
    getJobConfigurations: builder.query<JobConfiguration[], string | void>({
      query: (jobTypeKey) =>
        jobTypeKey
          ? `/job-configurations?jobTypeKey=${jobTypeKey}`
          : '/job-configurations',
      providesTags: ['JobConfiguration'],
    }),
    createJobConfiguration: builder.mutation<
      JobConfiguration,
      JobConfigurationPayload
    >({
      query: (body) => ({ url: '/job-configurations', method: 'POST', body }),
      invalidatesTags: ['JobConfiguration'],
    }),
    updateJobConfiguration: builder.mutation<
      JobConfiguration,
      { id: string } & Partial<JobConfigurationPayload>
    >({
      query: ({ id, ...body }) => ({
        url: `/job-configurations/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['JobConfiguration'],
    }),
    deleteJobConfiguration: builder.mutation<void, string>({
      query: (id) => ({ url: `/job-configurations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['JobConfiguration'],
    }),
  }),
});

export const {
  useGetJobConfigurationsQuery,
  useCreateJobConfigurationMutation,
  useUpdateJobConfigurationMutation,
  useDeleteJobConfigurationMutation,
} = jobConfigurationApi;
