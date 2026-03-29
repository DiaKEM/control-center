import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '@/features/auth/authApi';
import { jobExecutionApi } from '@/features/job-execution/jobExecutionApi';
import { jobConfigurationApi } from '@/features/job-configuration/jobConfigurationApi';
import { usersApi } from '@/features/users/usersApi';
import { adminApi } from '@/features/admin/adminApi';
import { setupApi } from '@/features/setup/setupApi';
import authReducer from '@/features/auth/authSlice';
import { loadAuthState, saveAuthState } from './authPersistence';

const persistedAuth = loadAuthState();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [jobExecutionApi.reducerPath]: jobExecutionApi.reducer,
    [jobConfigurationApi.reducerPath]: jobConfigurationApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [setupApi.reducerPath]: setupApi.reducer,
  },
  preloadedState: persistedAuth
    ? {
        auth: {
          token: persistedAuth.token,
          username: persistedAuth.username,
          isAuthenticated: true,
        },
      }
    : undefined,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(jobExecutionApi.middleware)
      .concat(jobConfigurationApi.middleware)
      .concat(usersApi.middleware)
      .concat(adminApi.middleware)
      .concat(setupApi.middleware),
});

store.subscribe(() => {
  const { token, username } = store.getState().auth;
  saveAuthState(token && username ? { token, username } : null);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
