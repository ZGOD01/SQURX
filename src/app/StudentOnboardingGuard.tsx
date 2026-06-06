import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { useStudentStore } from '@/features/student/store';
import { Loader2 } from 'lucide-react';

export function StudentOnboardingGuard({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();
    const { profile, isLoading, fetchDashboardData } = useStudentStore();
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (user?.role === 'STUDENT' && !profile && !fetchedRef.current) {
            fetchedRef.current = true;
            fetchDashboardData(user.id).catch(console.error);
        }
    }, [user, profile, fetchDashboardData]);

    if (user?.role !== 'STUDENT') {
        return <>{children}</>;
    }

    if (isLoading && !profile) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#fcfcfc]">
                <Loader2 className="animate-spin text-black w-8 h-8" />
            </div>
        );
    }

    const isNewUser = localStorage.getItem(`squrx_new_user_${user?.id}`) === 'true';

    if (isNewUser) {
        const hasProfile = !!(profile && profile.careerGoal && profile.location && profile.jobType);
        const hasCv = !!(profile && profile.cvUrl);

        if (!hasProfile || !hasCv) {
            return <Navigate to="/auth/onboarding" replace />;
        }
    }

    return <>{children}</>;
}
