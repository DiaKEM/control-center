import { JobTypeBase } from './job-type-base';

export const JOB_TYPE_KEYS = [
  'pump-age',
  'pump-occlusion',
  'insulin-level',
  'sensor-age',
  'battery-level',
  'nightly-report',
  'day-report',
  'weekly-report',
  'biweekly-report',
  'monthly-report',
] as const;

export type JobTypeKey = (typeof JOB_TYPE_KEYS)[number];

// Populated by @JobType() at class-definition time, before the DI container starts.
export const JOB_TYPE_STORE = new Map<JobTypeKey, typeof JobTypeBase>();
