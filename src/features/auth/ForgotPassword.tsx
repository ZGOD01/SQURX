import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Toast } from "@/components/ui";
import { PageTransition } from "@/components/motion";
import { Loader2, ArrowRight, ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useForgotPasswordMutation, useResetPasswordMutation } from "@/lib/store/authApi";

// Form schemas
const emailSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

const resetSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type EmailFormValues = z.infer<typeof emailSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

export function ForgotPassword() {
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const navigate = useNavigate();
    
    // API Hooks
    const [forgotPassword, { isLoading: isSendingEmail }] = useForgotPasswordMutation();
    const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

    // Data states
    const [userId, setUserId] = useState<string | null>(null);
    const [otp, setOtp] = useState("");
    const [serverMessage, setServerMessage] = useState("");
    const [toast, setToast] = useState<{ open: boolean; type: 'success'|'error'|'info'; title: string; message: string }>({ open: false, type: 'success', title: '', message: '' });

    const showToast = (type: 'success'|'error'|'info', title: string, message: string) => {
        setToast({ open: true, type, title, message });
        setTimeout(() => setToast(prev => ({ ...prev, open: false })), 4000);
    };

    // Form hooks
    const { register: emailRegister, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
    });

    const { register: resetRegister, handleSubmit: handleResetSubmit, formState: { errors: resetErrors } } = useForm<ResetFormValues>({
        resolver: zodResolver(resetSchema),
    });

    const onEmailSubmit = async (data: EmailFormValues) => {
        try {
            const res = await forgotPassword({ email: data.email }).unwrap();
            if (res.success && res.data?.userId) {
                setUserId(res.data.userId);
                setServerMessage(res.message || "OTP sent successfully.");
                setDirection(1);
                setStep(1); // Move to OTP
            } else {
                throw new Error(res.message);
            }
        } catch (err: any) {
            showToast('error', 'Lookup Failed', err.data?.message || err.message || "Failed to find account. Please try again.");
        }
    };

    const onOtpComplete = () => {
        if (otp.length === 4) {
            setDirection(1);
            setStep(2); // Move to New Password
        }
    };

    const prevStep = () => {
        setDirection(-1);
        setStep((prev) => prev - 1);
    };

    const finalResetSubmit = async (data: ResetFormValues) => {
        if (!userId || otp.length !== 4) return;
        
        try {
            const res = await resetPassword({ userId, otp, newPassword: data.password }).unwrap();
            if (res.success || res.statusCode === 200) {
                showToast('success', 'Success!', 'Password successfully updated. You can now login.');
                setTimeout(() => {
                    navigate('/auth/login');
                }, 2000);
            } else {
                throw new Error(res.message);
            }
        } catch(err: any) {
             showToast('error', 'Action Failed', err.data?.message || err.message || "Password reset failed. OTP might be invalid.");
             // If OTP failed, maybe bump them back to OTP step?
             setDirection(-1);
             setStep(1);
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            rotateY: direction > 0 ? 45 : -45,
            scale: 0.8,
            z: -100,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            rotateY: 0,
            scale: 1,
            z: 0,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            rotateY: direction < 0 ? 45 : -45,
            scale: 0.8,
            z: -100,
        }),
    };

    return (
        <PageTransition className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4 sm:p-8 font-sans text-black overflow-hidden relative selection:bg-black/10">
            {/* Elegant Background Grid & Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-black opacity-[0.03] blur-[100px]"></div>
            </div>

            <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-12 lg:gap-24 relative z-10 items-center">
                {/* Left Side: Branding */}
                <div className="lg:flex-1 text-center lg:text-left pt-8 lg:pt-0">
                    <Link to="/" className="inline-block hover:scale-105 transition-transform duration-300 group">
                        <div className="flex items-center gap-3 mb-8 mx-auto lg:mx-0 justify-center lg:justify-start">
                            <img src="/squrx01.png" alt="SQURX Logo" className="w-14 h-14 object-contain drop-shadow-xl group-hover:rotate-[5deg] transition-all duration-300" />
                            <span className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#8711c1] to-[#ff007f] text-transparent bg-clip-text font-sans mt-1">SQURX</span>
                        </div>
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-light tracking-tight mb-6">
                        Reset <br />
                        <span className="font-bold">Password.</span>
                    </h1>
                    <p className="text-black/50 text-lg font-light max-w-md mx-auto lg:mx-0 leading-relaxed">
                        Don't worry, it happens to the best of us. Let's get your account securely recovered.
                    </p>

                    <div className="hidden lg:flex items-center gap-4 mt-12 bg-white p-4 rounded-2xl border border-black/5 shadow-sm max-w-sm">
                        <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold">Secure Recovery</h4>
                            <p className="text-xs text-black/50 mt-0.5">Your data and new password are encrypted.</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: 3D Form Container */}
                <div className="w-full max-w-md lg:flex-1 relative" style={{ perspective: "2000px" }}>
                    {/* Progress Bar */}
                    <div className="absolute -top-8 left-0 right-0 h-1 bg-black/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-black"
                            initial={{ width: "0%" }}
                            animate={{ width: `${((step + 1) / 3) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                    </div>

                    <div className="relative h-[580px] w-full">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.6 }}
                                className="absolute inset-0 bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 sm:p-10 flex flex-col"
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (step === 0) handleEmailSubmit(onEmailSubmit)(e);
                                        else if (step === 1) onOtpComplete();
                                        else if (step === 2) handleResetSubmit(finalResetSubmit)(e);
                                    }} 
                                    className="flex flex-col h-full"
                                >
                                    {/* Step Indicator Top */}
                                    <div className="flex justify-between items-center mb-8">
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-black/40">
                                            Step {step + 1} of 3
                                        </span>
                                        <div className="flex gap-1">
                                            {[...Array(3)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i === step ? "bg-black" : i < step ? "bg-black/30" : "bg-black/10"} `}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    
                                    {/* Step 0: Email Request */}
                                    {step === 0 && (
                                        <div className="flex-1 flex flex-col justify-center space-y-6 -mt-8">
                                            <div className="space-y-2 mb-2">
                                                <h2 className="text-3xl font-light tracking-tight">Email Lookup</h2>
                                                <p className="text-black/50 font-light max-w-sm">Enter the email associated with your account.</p>
                                            </div>
                                            
                                            <div className="space-y-2 group mt-8">
                                                <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1 group-focus-within:text-black transition-colors" htmlFor="email">Registered Email</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="e.g. name@university.edu"
                                                        className={`h-14 pl-12 bg-black/[0.02] border-black/10 focus-visible:bg-white focus-visible:border-black focus-visible:ring-4 focus-visible:ring-black/5 font-light rounded-xl transition-all text-lg shadow-inner ${emailErrors.email ? 'border-red-500 focus-visible:border-red-500' : ''}`}
                                                        {...emailRegister('email')}
                                                    />
                                                </div>
                                                {emailErrors.email && <p className="text-red-500 text-xs pl-1 mt-1">{emailErrors.email.message}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 1: OTP Validation */}
                                    {step === 1 && (
                                        <div className="flex-1 flex flex-col justify-center space-y-6 -mt-10">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-light tracking-tight text-center">Verify Identity</h2>
                                                <p className="text-black/50 font-light text-center leading-relaxed max-w-[90%] mx-auto">
                                                    We sent a code to your registered email or mobile number.
                                                    {serverMessage && <span className="block mt-1 text-[#8711c1]/80 font-medium">{serverMessage}</span>}
                                                </p>
                                            </div>

                                            <div className="flex justify-center gap-3 sm:gap-4 mt-8">
                                                {[0, 1, 2, 3].map((index) => {
                                                    const isActive = otp[index] && otp[index] !== "";
                                                    return (
                                                        <div key={index} className="relative">
                                                            <motion.input
                                                                id={`otp-input-${index}`}
                                                                type="text"
                                                                inputMode="numeric"
                                                                maxLength={1}
                                                                value={otp[index] || ""}
                                                                initial={{ y: 20, opacity: 0 }}
                                                                animate={{ y: 0, opacity: 1 }}
                                                                transition={{ delay: index * 0.1, type: "spring", stiffness: 350, damping: 25 }}
                                                                whileFocus={{ scale: 1.05, y: -2 }}
                                                                whileHover={{ scale: 1.02 }}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                                                    const newOtp = otp.split('');
                                                                    newOtp[index] = val;
                                                                    setOtp(newOtp.join(''));
                                                                    if (val && index < 3) {
                                                                        document.getElementById(`otp-input-${index + 1}`)?.focus();
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Backspace' && !otp[index] && index > 0) {
                                                                        document.getElementById(`otp-input-${index - 1}`)?.focus();
                                                                        const newOtp = otp.split('');
                                                                        newOtp[index - 1] = '';
                                                                        setOtp(newOtp.join(''));
                                                                    }
                                                                }}
                                                                onPaste={(e) => {
                                                                    e.preventDefault();
                                                                    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 4);
                                                                    if (pastedData) {
                                                                        setOtp(pastedData);
                                                                        const focusIndex = Math.min(3, pastedData.length);
                                                                        document.getElementById(`otp-input-${focusIndex === 4 ? 3 : focusIndex}`)?.focus();
                                                                    }
                                                                }}
                                                                className={`w-14 h-16 sm:w-16 sm:h-20 text-center text-3xl sm:text-4xl font-black rounded-2xl outline-none transition-all duration-300 bg-white
                                                                    ${isActive 
                                                                        ? "border-2 border-black text-black shadow-[0_10px_30px_rgba(0,0,0,0.1)] relative z-20" 
                                                                        : "border-2 border-gray-100/80 text-gray-300 shadow-sm relative z-10"
                                                                    } 
                                                                    focus:border-2 focus:border-blue-600 focus:text-blue-600 focus:shadow-[0_10px_40px_rgba(37,99,235,0.2)] focus:ring-4 focus:ring-blue-500/10 caret-blue-600
                                                                `}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: New Password Input */}
                                    {step === 2 && (
                                        <div className="flex-1 flex flex-col justify-center space-y-6 -mt-6">
                                            <div className="space-y-2 mb-2">
                                                <h2 className="text-3xl font-light tracking-tight">New Password</h2>
                                                <p className="text-black/50 font-light">Enter a strong, new password.</p>
                                            </div>
                                            
                                            <div className="space-y-5">
                                                <div className="space-y-2 group">
                                                    <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1">New Password</label>
                                                    <div className="relative">
                                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                                        <Input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            className={`h-14 pl-12 bg-black/[0.02] border-black/10 focus-visible:bg-white focus-visible:border-black rounded-xl font-medium shadow-inner ${resetErrors.password ? 'border-red-500' : ''}`}
                                                            {...resetRegister('password')}
                                                        />
                                                    </div>
                                                    {resetErrors.password && <p className="text-red-500 text-xs pl-1 mt-1">{resetErrors.password.message}</p>}
                                                </div>

                                                <div className="space-y-2 group">
                                                    <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1">Confirm Password</label>
                                                    <div className="relative">
                                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                                        <Input
                                                            type="password"
                                                            placeholder="••••••••"
                                                            className={`h-14 pl-12 bg-black/[0.02] border-black/10 focus-visible:bg-white focus-visible:border-black rounded-xl font-medium shadow-inner ${resetErrors.confirmPassword ? 'border-red-500' : ''}`}
                                                            {...resetRegister('confirmPassword')}
                                                        />
                                                    </div>
                                                    {resetErrors.confirmPassword && <p className="text-red-500 text-xs pl-1 mt-1">{resetErrors.confirmPassword.message}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Navigation Footer */}
                                    <div className="mt-auto pt-8 flex justify-between items-center relative z-20">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={step > 0 ? prevStep : () => navigate('/auth/login')}
                                            disabled={isSendingEmail || isResetting}
                                            className={`text-black/60 hover:text-black hover:bg-black/5 transition-all outline-none rounded-xl px-4 py-2 font-medium`}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" /> {step === 0 ? "Back to Login" : "Go Back"}
                                        </Button>

                                        {step === 0 ? (
                                            <Button
                                                type="submit"
                                                disabled={isSendingEmail}
                                                className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-12 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                            >
                                                {isSendingEmail ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working</> : <>Send Code <ArrowRight className="w-4 h-4 ml-2" /></>}
                                            </Button>
                                        ) : step === 1 ? (
                                            <Button
                                                type="button"
                                                onClick={onOtpComplete}
                                                disabled={otp.length < 4}
                                                className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-12 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                            >
                                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        ) : (
                                            <Button
                                                type="submit"
                                                disabled={isResetting}
                                                className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-12 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                            >
                                                {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting</> : "Update Password"}
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </motion.div>
                        </AnimatePresence>
                    </div>
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

