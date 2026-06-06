import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, _hasHydrated } = useAuthStore();
    const location = useLocation();

    // Wait for the store to rehydrate from localStorage before deciding.
    // This prevents the 404/redirect flash when refreshing a protected route.
    if (!_hasHydrated) {
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
