import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { useStudentStore } from '@/features/student/store';

export function StudentOnboardingGuard({ children }: { children: React.ReactNode }) {
    const { user, isNewUser } = useAuthStore();
    const { profile, fetchDashboardData } = useStudentStore();
    const fetchedRef = useRef(false);

    useEffect(() => {
        // Kick off background data fetch once — never block routing for it
        if (user?.role === 'STUDENT' && !fetchedRef.current) {
            fetchedRef.current = true;
            fetchDashboardData(user.id).catch(console.error);
        }
    }, [user, fetchDashboardData]);

    // Non-student users pass through
    if (user?.role !== 'STUDENT') {
        return <>{children}</>;
    }

    // Only redirect to onboarding if this is a brand-new signup AND profile is incomplete
    // Never block rendering for existing logged-in students navigating between pages
    if (isNewUser && profile) {
        const hasProfile = !!(profile.careerGoal && profile.location && profile.jobType);
        const hasCv = !!(profile.cvUrl);
        if (!hasProfile || !hasCv) {
            return <Navigate to="/auth/onboarding" replace />;
        }
    }

    // Always render children — no loading gates that can drop the Outlet
    return <>{children}</>;
}
