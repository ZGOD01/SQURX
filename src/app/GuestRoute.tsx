import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

export function GuestRoute({ children }: { children: ReactNode }) {
    const { user } = useAuthStore();

    if (user) {
        const role = String(user.role).toUpperCase();
        switch (role) {
            case 'STUDENT': 
                return <Navigate to="/student" replace />;
            case 'RECRUITER': 
                return <Navigate to="/recruiter" replace />;
            case 'ADMIN': 
                return <Navigate to="/admin" replace />;
            default: 
                return <Navigate to="/student" replace />;
        }
    }

    return <>{children}</>;
}
