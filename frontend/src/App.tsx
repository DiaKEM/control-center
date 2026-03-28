import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import JobConfigurationPage from '@/pages/JobConfigurationPage'
import JobExecutionPage from '@/pages/JobExecutionPage'
import UserManagementPage from '@/pages/UserManagementPage'
import AdminPage from '@/pages/AdminPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/jobs/configuration" replace />} />
            <Route path="/jobs/configuration" element={<JobConfigurationPage />} />
            <Route path="/jobs/execution" element={<JobExecutionPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
