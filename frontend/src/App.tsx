import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import SetupPage from '@/pages/SetupPage'
import DashboardPage from '@/pages/DashboardPage'
import JobConfigurationPage from '@/pages/JobConfigurationPage'
import JobExecutionPage from '@/pages/JobExecutionPage'
import UserManagementPage from '@/pages/UserManagementPage'
import AdminPage from '@/pages/AdminPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useGetSetupStatusQuery } from '@/features/setup/setupApi'

function AppRouter() {
  const { data: setup, isLoading } = useGetSetupStatusQuery()

  if (isLoading) return null

  if (!setup?.installed) {
    return (
      <Routes>
        <Route path="*" element={<SetupPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs/configuration" element={<JobConfigurationPage />} />
          <Route path="/jobs/execution" element={<JobExecutionPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
