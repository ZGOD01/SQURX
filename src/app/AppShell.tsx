import { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { useStudentStore } from '@/features/student/store';
import { useRecruiterStore } from '@/features/recruiter/store';
import { LogOut, LayoutDashboard, UserSquare, Briefcase, Settings, Users, FileBarChart, CalendarDays, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { useNotificationStore } from '@/lib/store/notifications';

export function AppShell() {
    const { user, logout } = useAuthStore();
    const { fetchDashboardData: fetchStudent, isLoading: isStudentLoading } = useStudentStore();
    const { fetchDashboardData: fetchRecruiter, isLoading: isRecruiterLoading } = useRecruiterStore();

    const { sendEmail } = useNotificationStore();

    useEffect(() => {
        if (user?.role === 'STUDENT') {
            fetchStudent(user.id);
        } else if (user?.role === 'RECRUITER') {
            fetchRecruiter(user.id);
        }

        // Simulate sending a "We missed you!" email if the user has been inactive for > 10 days
        if (user && user.lastLoginAt) {
            const lastLogin = new Date(user.lastLoginAt);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 3600 * 24));

            if (diffDays >= 10) {
                // Sent after a slight delay so they see it entering the dashboard
                setTimeout(() => {
                    const firstName = user.name ? user.name.split(' ')[0] : 'there';
                    sendEmail(
                        `We missed you, ${firstName}!`,
                        `It's been ${diffDays} days since you last checked for opportunities on Squrx. Log back in to see fresh matches tailored for you!`
                    );
                }, 2000);
            }
        }
    }, [user, fetchStudent, fetchRecruiter, sendEmail]);

    const getSidebarLinks = () => {
        if (!user) return [];
        switch (user.role) {
            case 'STUDENT':
                return [
                    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
                    { to: '/student/profile', label: 'Profile', icon: UserSquare },
                    { to: '/student/jobs', label: 'Jobs', icon: Briefcase },
                    { to: '/student/consultation', label: 'Consultation', icon: CalendarDays },
                    { to: '/student/preferences', label: 'Preferences', icon: Settings },
                ];
            case 'RECRUITER':
                return [
                    { to: '/recruiter', label: 'Dashboard', icon: LayoutDashboard },
                    { to: '/recruiter/company', label: 'Company Profile', icon: UserSquare },
                    { to: '/recruiter/vacancies', label: 'Vacancies', icon: Briefcase },
                    { to: '/recruiter/candidates', label: 'Candidates', icon: Users },
                ];
            case 'ADMIN':
                return [
                    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
                    { to: '/admin/users', label: 'Users', icon: Users },
                    { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
                ];
            default:
                return [];
        }
    };

    const links = getSidebarLinks();

    return (
        <div className="flex h-screen w-full bg-muted/30 overflow-hidden">

            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
                <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
                    <img src="/squrx01.png" alt="SQURX Logo" className="w-7 h-7 object-contain drop-shadow-sm" />
                    <span className="text-xl font-black tracking-tight bg-gradient-to-r from-[#8711c1] to-[#ff007f] text-transparent bg-clip-text font-sans mt-0.5">SQURX</span>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        return (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.to.split('/').length === 2} // Exact match for base dashboard
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )
                                }
                            >
                                <Icon size={18} />
                                {link.label}
                            </NavLink>
                        );
                    })}
                </div>

                <div className="border-t border-border p-4">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-secondary-foreground">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
                        <LogOut size={18} className="mr-3" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* Topbar */}
                <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
                    <div className="md:hidden flex items-center gap-2">
                        <img src="/squrx01.png" alt="SQURX Logo" className="w-6 h-6 object-contain drop-shadow-sm" />
                        <span className="text-lg font-black tracking-tight bg-gradient-to-r from-[#8711c1] to-[#ff007f] text-transparent bg-clip-text font-sans mt-0.5">SQURX</span>
                    </div>
                    <div className="flex-1" />
                    <nav className="flex items-center gap-4">
                    </nav>
                </header>

                {/* Scrollable Main Content */}
                <main className="flex-1 overflow-y-auto bg-background p-6 md:p-10 relative">
                    {(isStudentLoading && user?.role === 'STUDENT') || (isRecruiterLoading && user?.role === 'RECRUITER') ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-50">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="font-semibold text-muted-foreground animate-pulse">Loading workspace...</p>
                        </div>
                    ) : null}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
