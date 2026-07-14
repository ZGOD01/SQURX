import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UiPreview from '@/app/UiPreview';
import { AppShell } from '@/app/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { GuestRoute } from '@/app/GuestRoute';
import { RoleGuard } from '@/app/RoleGuard';
import { StudentOnboardingGuard } from '@/app/StudentOnboardingGuard';
import { EmailToaster } from '@/components/ui';
import { useAuthStore } from '@/features/auth/store';

import { Landing } from '@/features/landing/Landing';
import { Login } from '@/features/auth/Login';
import { Register } from '@/features/auth/Register';
import { ForgotPassword } from '@/features/auth/ForgotPassword';
import { Onboarding } from '@/features/auth/Onboarding';

import { StudentDashboard, StudentProfile, StudentJobs, StudentPreferences, StudentConsultation, StudentServices } from '@/features/student/StudentViews';
import { RecruiterDashboard, RecruiterCompany, RecruiterVacancies, RecruiterCandidates } from '@/features/recruiter/RecruiterViews';
import { AdminDashboard, AdminUsers, AdminReports } from '@/features/admin/AdminViews';

function App() {
  const verifySession = useAuthStore((s) => s.verifySession);

  // Validate the stored token against the backend exactly once on startup.
  // Guards (ProtectedRoute / GuestRoute) will wait for this to resolve
  // before making any routing decision.
  useEffect(() => {
    verifySession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        } />
        <Route path="/auth/register" element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        } />
        <Route path="/auth/forgot-password" element={
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        } />
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
              <StudentOnboardingGuard>
                <AppShell />
              </StudentOnboardingGuard>
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route index element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="jobs" element={<StudentJobs />} />
          <Route path="consultations" element={<StudentConsultation />} />
          <Route path="preferences" element={<StudentPreferences />} />
          <Route path="services" element={<StudentServices />} />
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
