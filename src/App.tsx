import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UiPreview from '@/app/UiPreview';
import { AppShell } from '@/app/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { RoleGuard } from '@/app/RoleGuard';
import { EmailToaster } from '@/components/ui';

import { Landing } from '@/features/landing/Landing';
import { Login } from '@/features/auth/Login';
import { Register } from '@/features/auth/Register';
import { ForgotPassword } from '@/features/auth/ForgotPassword';
import { Onboarding } from '@/features/auth/Onboarding';

import { StudentDashboard, StudentProfile, StudentJobs, StudentPreferences, StudentConsultation } from '@/features/student/StudentViews';
import { RecruiterDashboard, RecruiterCompany, RecruiterVacancies, RecruiterCandidates } from '@/features/recruiter/RecruiterViews';
import { AdminDashboard, AdminUsers, AdminReports } from '@/features/admin/AdminViews';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        <Route path="/ui" element={<UiPreview />} />

        {/* Student Routes */}
        <Route path="/student" element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['STUDENT']}>
              <AppShell />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route index element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="jobs" element={<StudentJobs />} />
          <Route path="preferences" element={<StudentPreferences />} />
          <Route path="consultation" element={<StudentConsultation />} />
        </Route>

        {/* Recruiter Routes */}
        <Route path="/recruiter" element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['RECRUITER']}>
              <AppShell />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route index element={<RecruiterDashboard />} />
          <Route path="company" element={<RecruiterCompany />} />
          <Route path="vacancies" element={<RecruiterVacancies />} />
          <Route path="candidates" element={<RecruiterCandidates />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['ADMIN']}>
              <AppShell />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <EmailToaster />
    </BrowserRouter>
  );
}

export default App;
