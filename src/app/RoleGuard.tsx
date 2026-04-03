import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import type { Role } from '@/features/auth/types';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: Role[];
    fallbackPath?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackPath }: RoleGuardProps) {
    const { user } = useAuthStore();

    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
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
