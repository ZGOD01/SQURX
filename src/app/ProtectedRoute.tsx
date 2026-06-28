import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, isAuthLoading, isAuthVerified } = useAuthStore();
    const location = useLocation();

    // Wait for the backend /me check to complete before making any routing decision.
    // This prevents showing old user data or a flash-redirect while verification is pending.
    if (isAuthLoading || !isAuthVerified) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
