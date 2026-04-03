import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user } = useAuthStore();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
