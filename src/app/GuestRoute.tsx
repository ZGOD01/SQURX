import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

export function GuestRoute({ children }: { children: ReactNode }) {
    const { user, isAuthLoading, isAuthVerified } = useAuthStore();

    // Don't make any routing decisions until the backend session check has resolved.
    if (isAuthLoading || !isAuthVerified) return null;

    if (user) {
        const role = String(user.role).toUpperCase();
        switch (role) {
            case 'STUDENT': 
                return <Navigate to="/student/jobs" replace />;
            case 'RECRUITER': 
                return <Navigate to="/recruiter" replace />;
            case 'ADMIN': 
                return <Navigate to="/admin" replace />;
            default: 
                return <Navigate to="/student/jobs" replace />;
        }
    }

    return <>{children}</>;
}
