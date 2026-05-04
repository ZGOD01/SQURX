import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForgotPasswordMutation, useResetPasswordMutation } from "@/lib/store/authApi";
import { Button, Input, Toast } from "@/components/ui";
import { PageTransition } from "@/components/motion";
import { Loader2, ArrowRight, ArrowLeft, KeyRound, ShieldCheck, Mail, Lock } from "lucide-react";

export function ForgotPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ open: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({ open: false, type: 'success', title: '', message: '' });

    const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
        setToast({ open: true, type, title, message });
        setTimeout(() => setToast(prev => ({ ...prev, open: false })), 4000);
    };

    const navigate = useNavigate();
    const [forgotPasswordMutation] = useForgotPasswordMutation();
    const [resetPasswordMutation] = useResetPasswordMutation();

    // Flow state
    const [step, setStep] = useState(0); // 0: Email, 1: OTP + New Password
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [userId, setUserId] = useState<string | null>(null);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        try {
            const res = await forgotPasswordMutation({ email }).unwrap();
            if (res.success && res.data?.userId) {
                setUserId(res.data.userId);
                showToast('success', 'OTP Sent', 'Check your mobile/email for the reset code.');
                setStep(1);
            } else {
                throw new Error(res.message || "Failed to send reset code.");
            }
        } catch (err: any) {
            showToast('error', 'Request Failed', err.data?.message || err.message || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !otp || !newPassword) return;
        if (newPassword.length < 6) {
            showToast('error', 'Weak Password', 'Password must be at least 6 characters.');
            return;
        }
        setIsLoading(true);
        try {
            const res = await resetPasswordMutation({ userId, otp, newPassword }).unwrap();
            if (res.success) {
                showToast('success', 'Password Reset', 'Your password has been updated. Please login.');
                setTimeout(() => navigate('/auth/login'), 2000);
            } else {
                throw new Error(res.message || "Reset failed.");
            }
        } catch (err: any) {
            showToast('error', 'Reset Failed', err.data?.message || err.message || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageTransition className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4 sm:p-8 font-sans text-black overflow-hidden relative selection:bg-black/10">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-black opacity-[0.03] blur-[100px]"></div>
            </div>

            <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-12 lg:gap-24 relative z-10 items-center">
                <div className="lg:flex-1 text-center lg:text-left pt-8 lg:pt-0">
                    <Link to="/" className="inline-block hover:scale-105 transition-transform duration-300 group">
                         <div className="flex items-center gap-3 mb-8 mx-auto lg:mx-0 justify-center lg:justify-start">
                            <img src="/squrx01.png" alt="SQURX Logo" className="w-14 h-14 object-contain drop-shadow-xl group-hover:rotate-[5deg] transition-all duration-300" />
                            <span className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#8711c1] to-[#ff007f] text-transparent bg-clip-text font-sans mt-1">SQURX</span>
                        </div>
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-light tracking-tight mb-6">
                        Reset your <br />
                        <span className="font-bold">password.</span>
                    </h1>
                    <p className="text-black/50 text-lg font-light max-w-md mx-auto lg:mx-0 leading-relaxed">
                        Don't worry, it happens to the best of us. Let's get you back into your account.
                    </p>
                </div>

                <div className="w-full max-w-md lg:flex-1 relative" style={{ perspective: "2000px" }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, rotateY: 15, scale: 0.9, x: -50 }}
                            animate={{ opacity: 1, rotateY: 0, scale: 1, x: 0 }}
                            exit={{ opacity: 0, rotateY: -15, scale: 0.9, x: 50 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25 }}
                            className="bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 sm:p-10"
                        >
                            {step === 0 ? (
                                <form onSubmit={handleEmailSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-light tracking-tight">Email Recovery</h2>
                                        <p className="text-black/50 font-light text-sm">Enter the email associated with your account.</p>
                                    </div>

                                    <div className="space-y-2 group">
                                        <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1">Registered Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
                                            <Input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="e.g. john@example.com"
                                                className="h-14 pl-12 bg-black/[0.02] border-black/10 focus-visible:bg-white focus-visible:border-black font-light rounded-xl transition-all"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading || !email}
                                        className="w-full bg-black text-white hover:bg-black/90 rounded-full h-14 font-medium shadow-lg transition-all hover:scale-105"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Code"}
                                    </Button>

                                    <div className="text-center pt-2">
                                        <Link to="/auth/login" className="text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-all flex items-center justify-center gap-2">
                                            <ArrowLeft className="w-3 h-3" /> Back to Login
                                        </Link>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleResetSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-light tracking-tight">Create Password</h2>
                                        <p className="text-black/50 font-light text-sm">Verify the code and set a new password.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2 group">
                                            <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1">4-Digit Code</label>
                                            <Input
                                                type="text"
                                                required
                                                maxLength={4}
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                placeholder="3210"
                                                className="h-14 text-center text-2xl tracking-[0.5em] font-bold bg-black/[0.02] border-black/10 focus-visible:bg-white focus-visible:border-black rounded-xl"
                                            />
                                        </div>

                                        <div className="space-y-2 group">
                                            <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1">New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
                                                <Input
                                                    type="password"
                                                    required
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="At least 6 characters"
                                                    className="h-14 pl-12 bg-black/[0.02] border-black/10 focus-visible:bg-white focus-visible:border-black font-light rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading || otp.length < 4 || newPassword.length < 6}
                                        className="w-full bg-black text-white hover:bg-black/90 rounded-full h-14 font-medium shadow-lg transition-all hover:scale-105"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                                    </Button>

                                    <div className="mt-4 bg-black/5 rounded-xl p-4">
                                        <p className="text-xs leading-relaxed text-black/70 font-light italic text-center">
                                            <strong>Hint (Mock Backend):</strong> Student = Last 4 digits of mobile, Recruiter = "1234".
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setStep(0)}
                                        className="w-full text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-all pt-2"
                                    >
                                        Back to email
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <div className="fixed bottom-4 right-4 z-[100] flex flex-col pointer-events-none">
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
        </PageTransition>
    );
}
