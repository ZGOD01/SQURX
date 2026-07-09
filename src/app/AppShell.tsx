import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, getInMemToken } from '@/features/auth/store';
import { useStudentStore } from '@/features/student/store';
import { useRecruiterStore } from '@/features/recruiter/store';
import { LogOut, LayoutDashboard, UserSquare, Briefcase, Settings, Users, FileBarChart, Loader2, Home, ArrowLeft, ShieldAlert, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Toast } from '@/components/ui';
import { useNotificationStore } from '@/lib/store/notifications';
import { useVerifyOtpMutation, useResendOtpMutation } from '@/lib/store/authApi';
import { motion, AnimatePresence } from 'framer-motion';

export function AppShell() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    
    // OTP Verification State for Unverified Accounts
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [otp, setOtp] = useState('');
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [resendTimer, setResendTimer] = useState(0);
    const [toast, setToast] = useState<{ open: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({ open: false, type: 'success', title: '', message: '' });

    const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
    const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

    const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
        setToast({ open: true, type, title, message });
        setTimeout(() => setToast(prev => ({ ...prev, open: false })), 4000);
    };

    // Cooldown countdown timer
    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    // Decodes JWT to extract user ID safely
    const getUserIdFromToken = () => {
        const token = getInMemToken();

        if (!token) return null;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = JSON.parse(atob(base64));
            return decoded._id || decoded.id || null;
        } catch (e) {
            console.error("Failed to decode JWT token:", e);
            return null;
        }
    };

    // Listen to global unverified account events dispatched from fetch clients
    useEffect(() => {
        const handleUnverified = () => {
            setShowVerifyModal(true);
        };
        window.addEventListener('squrx-unverified-account', handleUnverified);
        return () => window.removeEventListener('squrx-unverified-account', handleUnverified);
    }, []);

    const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifyError(null);
        const userId = getUserIdFromToken();
        if (!userId) {
            setVerifyError("Authentication error: No session found. Please log in again.");
            return;
        }

        try {
            const res = await verifyOtp({ userId, otp }).unwrap();
            if (res.success && res.data?.token) {
                useAuthStore.getState().setAuth(res.data.user, res.data.token);
                setShowVerifyModal(false);
                setOtp('');
                showToast('success', 'Account Verified', 'Your account has been fully verified!');
                
                // Refresh client layout data to clear previous 403 Forbidden locks
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                setVerifyError(res.message || "Failed to verify OTP.");
            }
        } catch (err: any) {
            setVerifyError(err.data?.message || err.message || "Invalid or expired OTP.");
        }
    };

    const handleModalResendOtp = async () => {
        const userId = getUserIdFromToken();
        if (!userId) {
            setVerifyError("Authentication error: No session found. Please log in again.");
            return;
        }

        try {
            const res = await resendOtp({ userId }).unwrap();
            if (res.success) {
                showToast('success', 'OTP Resent', res.message || 'A new 4-digit code has been sent.');
                setResendTimer(60);
            } else {
                showToast('error', 'Resend Failed', res.message || 'Failed to resend code.');
            }
        } catch (err: any) {
            console.error("Modal OTP Resend Error:", err);
            if (err.status === 429 || err.data?.status === 429) {
                showToast('error', 'Too Many Requests', 'An OTP was already sent. Please wait for the cooldown timer.');
                setResendTimer(60);
            } else {
                showToast('error', 'Resend Failed', err.data?.message || err.message || 'Failed to resend OTP.');
            }
        }
    };

    const handleLogout = () => {
        navigate('/', { replace: true });
        setTimeout(() => {
            logout();
        }, 0);
    };

    const handleHomeClick = () => {
        if (!user) {
            navigate('/');
            return;
        }
        const role = String(user.role).toUpperCase();
        switch (role) {
            case 'STUDENT': navigate('/student'); break;
            case 'RECRUITER': navigate('/recruiter'); break;
            case 'ADMIN': navigate('/admin'); break;
            default: navigate('/student'); break;
        }
    };

    const { fetchDashboardData: fetchRecruiter, company: recruiterCompany } = useRecruiterStore();
    const fetchedRef = useRef(false);

    const { sendEmail } = useNotificationStore();

    useEffect(() => {
        if (user && !fetchedRef.current) {
            fetchedRef.current = true;
            // Recruiter data fetch (student data is handled by StudentOnboardingGuard)
            if (user.role === 'RECRUITER' && !recruiterCompany) {
                fetchRecruiter(user.id).catch(console.error);
            }
        }
    }, [user, fetchRecruiter, recruiterCompany]);

    const getSidebarLinks = () => {
        if (!user) return [];
        switch (user.role) {
            case 'STUDENT':
                return [
                    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
                    { to: '/student/profile', label: 'Profile', icon: UserSquare },
                    { to: '/student/jobs', label: 'Jobs', icon: Briefcase },
                    { to: '/student/consultations', label: 'Consultations', icon: Calendar },
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
                                end={link.to === '/student' || link.to === '/recruiter' || link.to === '/admin'}
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
                            {user?.name || user?.fullName ? (user.name || user.fullName).charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.name || user?.fullName || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
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
                        <span className="text-lg font-black tracking-tight bg-gradient-to-r from-[#8711c1] to-[#ff007f] text-transparent bg-clip-text font-sans mt-0.5 mr-4">SQURX</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.history.back()}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground h-9 px-3 rounded-lg"
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline font-bold">Back</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleHomeClick}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground h-9 px-3 rounded-lg"
                        >
                            <Home size={16} />
                            <span className="hidden sm:inline font-bold">Home</span>
                        </Button>
                    </div>

                    <div className="flex-1" />
                    <nav className="flex items-center gap-4">
                    </nav>
                </header>

                {/* Scrollable Main Content */}
                <main className="flex-1 overflow-y-auto bg-background p-6 md:p-10">
                    <Outlet />
                </main>
            </div>

            {/* OTP Verification Modal for Unverified Accounts */}
            <AnimatePresence>
                {showVerifyModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ y: 50, scale: 0.95, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={{ y: 50, scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                            className="w-full max-w-md bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col"
                        >
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-inner">
                                    <ShieldAlert size={24} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">Verify Your Account</h3>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                    Please enter the 4-digit code sent to your mobile or email to unlock full access.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-center gap-3 sm:gap-4 mt-2">
                                        {[0, 1, 2, 3].map((index) => {
                                            const isActive = otp[index] && otp[index] !== " " && otp[index] !== "";
                                            return (
                                                <div key={index} className="relative">
                                                    <motion.input
                                                        id={`modal-otp-input-${index}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={1}
                                                        value={(otp[index] === " " ? "" : otp[index]) || ""}
                                                        initial={{ y: 20, opacity: 0 }}
                                                        animate={{ y: 0, opacity: 1 }}
                                                        transition={{ delay: index * 0.05, type: "spring", stiffness: 350, damping: 25 }}
                                                        whileFocus={{ scale: 1.05, y: -2 }}
                                                        whileHover={{ scale: 1.02 }}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                                            const currentOtp = otp.padEnd(4, " ");
                                                            const newOtp = currentOtp.split("");
                                                            newOtp[index] = val || " ";
                                                            const newOtpStr = newOtp.join("").trimEnd();
                                                            setOtp(newOtpStr);
                                                            if (val && index < 3) {
                                                                document.getElementById(`modal-otp-input-${index + 1}`)?.focus();
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Backspace' && (!otp[index] || otp[index] === " ") && index > 0) {
                                                                const currentOtp = otp.padEnd(4, " ");
                                                                const newOtp = currentOtp.split("");
                                                                newOtp[index - 1] = " ";
                                                                setOtp(newOtp.join("").trimEnd());
                                                                document.getElementById(`modal-otp-input-${index - 1}`)?.focus();
                                                            }
                                                        }}
                                                        onPaste={(e) => {
                                                            e.preventDefault();
                                                            const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 4);
                                                            if (pastedData) {
                                                                setOtp(pastedData);
                                                                const focusIndex = Math.min(3, pastedData.length);
                                                                document.getElementById(`modal-otp-input-${focusIndex === 4 ? 3 : focusIndex}`)?.focus();
                                                            }
                                                        }}
                                                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl outline-none transition-all duration-300 bg-black/[0.02]
                                                            ${isActive 
                                                                ? "border-2 border-black text-black shadow-[0_4px_12px_rgba(0,0,0,0.05)] relative z-20" 
                                                                : "border border-black/10 text-black/40 shadow-sm relative z-10"
                                                            } 
                                                            focus:border-2 focus:border-black focus:text-black focus:shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus:ring-4 focus:ring-black/5 caret-black
                                                        `}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {verifyError && (
                                    <p className="text-center text-xs font-semibold text-rose-500">{verifyError}</p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isVerifying || otp.length < 4}
                                    className="w-full h-14 bg-black text-white hover:bg-black/90 font-bold rounded-full shadow-lg shadow-black/10 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                >
                                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify & Unlock"}
                                </Button>

                                <div className="flex flex-col items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        disabled={resendTimer > 0 || isResending}
                                        onClick={handleModalResendOtp}
                                        className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : "Didn't receive code? Resend OTP"}
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="text-[10px] font-bold text-rose-500 hover:underline transition-all uppercase tracking-widest"
                                    >
                                        Logout of Account
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="fixed bottom-4 right-4 z-[300] flex flex-col pointer-events-none">
                <AnimatePresence>
                    {toast.open && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="pointer-events-auto"
                        >
                            <Toast 
                                variant={toast.type} 
                                title={toast.title} 
                                description={toast.message} 
                                onClose={() => setToast(prev => ({ ...prev, open: false }))} 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
