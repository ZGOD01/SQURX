import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import type { Role } from '@/features/auth/types';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: Role[];
    fallbackPath?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackPath }: RoleGuardProps) {
    const { user, _hasHydrated } = useAuthStore();

    // Wait for the persisted store to rehydrate before making any routing decision.
    // Without this, refreshing /student shows 403 because user is null for a brief moment.
    if (!_hasHydrated) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    // Normalise role to uppercase for comparison (backend may return lowercase)
    const userRoleUpper = String(user.role).toUpperCase() as Role;

    if (!allowedRoles.includes(userRoleUpper)) {
        if (fallbackPath) {
            return <Navigate to={fallbackPath} replace />;
        }

        // Default Not Authorized fallback
        return (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-8 text-center bg-background text-foreground">
                <h2 className="text-3xl font-bold tracking-tight mb-2">403</h2>
                <h3 className="text-xl font-semibold mb-4">Not Authorized</h3>
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
            </div>
        );
    }

    return <>{children}</>;
}
