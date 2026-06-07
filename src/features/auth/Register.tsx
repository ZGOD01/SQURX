import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "./store";
import { useSignupMutation, useVerifyOtpMutation, useResendOtpMutation } from "@/lib/store/authApi";
import { useNotificationStore } from "@/lib/store/notifications";
import { Button, Input, Toast } from "@/components/ui";
import { PageTransition } from "@/components/motion";
import { registerSchema, type RegisterFormValues } from "@/lib/validators/auth";
import { setGdprConsent } from "@/lib/utils";
import {
    Loader2,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    CheckCircle2,
    Building2,
    GraduationCap,
} from "lucide-react";

export function Register() {
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ open: boolean; type: 'success'|'error'|'info'; title: string; message: string }>({ open: false, type: 'success', title: '', message: '' });
    const [consentAge18, setConsentAge18] = useState(false);
    const [consentReadUnderstood, setConsentReadUnderstood] = useState(false);
    const [consentDataProcessing, setConsentDataProcessing] = useState(false);
    const [consentResumeSharing, setConsentResumeSharing] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState<'yes' | 'no' | null>(null);
    const [showGdprModal, setShowGdprModal] = useState(false);
    const allConsentsGiven = consentAge18 && consentReadUnderstood && consentDataProcessing && consentResumeSharing;
    const [userIp, setUserIp] = useState("127.0.0.1");

    useEffect(() => {
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => {
                if (data.ip) setUserIp(data.ip);
            })
            .catch(() => {
                setUserIp("192.168.1.42");
            });
    }, []);

    const showToast = (type: 'success'|'error'|'info', title: string, message: string) => {
        setToast({ open: true, type, title, message });
        setTimeout(() => setToast(prev => ({ ...prev, open: false })), 4000);
    };
    const navigate = useNavigate();
    
    const { setAuth } = useAuthStore();
    const [signupMutation] = useSignupMutation();
    const [verifyOtpMutation] = useVerifyOtpMutation();
    const [resendOtpMutation] = useResendOtpMutation();
    const { sendEmail } = useNotificationStore();

    // Step state
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    
    // OTP Specific state
    const [userId, setUserId] = useState<string | null>(null);
    const [serverMessage, setServerMessage] = useState("");
    const [otp, setOtp] = useState("");
    const [resendTimer, setResendTimer] = useState(0);
    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleResendOtp = async () => {
        if (!userId || resendTimer > 0) return;
        setIsLoading(true);
        try {
            const res = await resendOtpMutation({ userId }).unwrap();
            if (res.success) {
                showToast('info', 'OTP Resent', res.message || 'A new code has been sent.');
                setResendTimer(60); // 60 seconds cooldown
            } else {
                throw new Error(res.message);
            }
        } catch (err: any) {
            showToast('error', 'Failed to resend', err.data?.message || err.message || "Failed to resend OTP.");
        } finally {
            setIsLoading(false);
        }
    };
    const {
        register: formRegister,
        handleSubmit,
        watch,
        setValue,
        trigger,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: "STUDENT",
            name: "",
            email: "",
            mobile: "",
            password: "",
            resume: undefined,
        },
    });

    const selectedRole = watch("role");

    const nextStep = async (fieldsToValidate?: (keyof RegisterFormValues)[]) => {
        if (fieldsToValidate) {
            const isValid = await trigger(fieldsToValidate);
            if (!isValid) return;
        }
        setDirection(1);
        setStep((prev) => prev + 1);
    };

    const prevStep = () => {
        setDirection(-1);
        setStep((prev) => prev - 1);
    };

    const onSubmit = async (data: RegisterFormValues) => {
        setIsLoading(true);
        try {
            // Build a plain JSON payload — the backend expects application/json, not multipart/form-data
            const payload: Record<string, any> = {
                fullName: data.name,
                email: data.email,
                password: data.password,
                role: data.role, // Keep original casing (STUDENT / RECRUITER) as backend likely expects uppercase
            };

            if (data.role === 'STUDENT') {
                let sanitizedMobile = data.mobile ? data.mobile.replace(/\D/g, '') : '';
                if (sanitizedMobile.length === 10) {
                    payload.mobile = sanitizedMobile;
                }
            }

            const res = await signupMutation(payload).unwrap();
            
            if (res.success && res.data?.userId) {
                setUserId(res.data.userId);
                setServerMessage(res.data.message || "OTP sent successfully.");
                setDirection(1);
                setStep(3);
            } else {
                throw new Error(res.message);
            }
        } catch (err: any) {
            showToast('error', 'Registration Failed', err.data?.message || err.message || "Failed to register. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if(!userId || otp.length < 4) return;
        
        setIsLoading(true);
        try {
            const verifyRes = await verifyOtpMutation({ userId, otp }).unwrap();
            
            if(verifyRes.success && verifyRes.data?.token) {
                const uId = verifyRes.data.user._id || verifyRes.data.user.id;
                localStorage.setItem(`squrx_new_user_${uId}`, 'true');
                setGdprConsent(uId, true);
                const consentLog = {
                    userId: uId,
                    email: verifyRes.data.user.email,
                    timestamp: new Date().toISOString(),
                    ip: userIp,
                    consents: {
                        consentAge18,
                        consentReadUnderstood,
                        consentDataProcessing,
                        consentResumeSharing,
                        marketingOptIn
                    }
                };
                localStorage.setItem(`squrx_gdpr_log_${uId}`, JSON.stringify(consentLog));
                setAuth(verifyRes.data.user, verifyRes.data.token);
                showToast('success', 'Welcome to Squrx!', 'Your account has been verified. Redirecting...');

                // Send welcome orientation email visually
                setTimeout(() => {
                    sendEmail(
                        "Welcome to Squrx!",
                        `Your account has been successfully created. We are excited to help you find your next big opportunity!`
                    );
                }, 1000);

                setTimeout(() => {
                    const role = String(verifyRes.data.user.role).toUpperCase();
                    switch (role) {
                        case "STUDENT":
                            navigate("/auth/onboarding", { replace: true });
                            break;
                        case "RECRUITER":
                            navigate("/recruiter", { replace: true });
                            break;
                        default:
                            navigate("/auth/onboarding", { replace: true });
                            break;
                    }
                }, 1200);
            } else {
                throw new Error(verifyRes.message);
            }
        } catch(err: any) {
             showToast('error', 'Verification Failed', err.data?.message || err.message || "OTP verification failed.");
        } finally {
            setIsLoading(false);
        }
    };

    // Advanced 3D Rotation Variants
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



    // Calculate progress percentage
    const maxProgSteps = 4;
    const currentProgStep = step + 1;
    const progressPercentage = (currentProgStep / maxProgSteps) * 100;

    return (
        <PageTransition className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4 sm:p-8 font-sans text-black overflow-hidden relative selection:bg-black/10">
            {/* Elegant Background Grid & Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-black opacity-[0.03] blur-[100px]"></div>
            </div>

            <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-12 lg:gap-24 relative z-10 items-center">
                {/* Left Side: Branding & Story telling */}
                <div className="lg:flex-1 text-center lg:text-left pt-8 lg:pt-0">
                    <Link
                        to="/"
                        className="inline-block hover:scale-105 transition-transform duration-300 group"
                    >
                        <div className="flex items-center gap-3 mb-8 mx-auto lg:mx-0 justify-center lg:justify-start">
                            <img src="/squrx01.png" alt="SQURX Logo" className="w-14 h-14 object-contain drop-shadow-xl group-hover:rotate-[5deg] transition-all duration-300" />
                            <span className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#8711c1] to-[#ff007f] text-transparent bg-clip-text font-sans mt-1">SQURX</span>
                        </div>
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-light tracking-tight mb-6">
                        Start your <br />
                        <span className="font-bold">journey here.</span>
                    </h1>
                    <p className="text-black/50 text-lg font-light max-w-md mx-auto lg:mx-0 leading-relaxed">
                        Join an exclusive network of ambitious students and forward-thinking
                        recruiters. Experience a platform built differently.
                    </p>

                    <div className="hidden lg:flex items-center gap-4 mt-12 bg-white p-4 rounded-2xl border border-black/5 shadow-sm max-w-sm">
                        <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold">Secure Registration</h4>
                            <p className="text-xs text-black/50 mt-0.5">
                                Your data is encrypted and safe.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: 3D Form Container */}
                <div
                    className="w-full max-w-md lg:flex-1 relative"
                    style={{ perspective: "2000px" }}
                >
                    {/* Global Progress Bar */}
                    <div className="absolute -top-8 left-0 right-0 h-1 bg-black/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-black"
                            initial={{ width: "0%" }}
                            animate={{ width: `${progressPercentage}%` }}
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
                                transition={{
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 25,
                                    duration: 0.6,
                                }}
                                className="absolute inset-0 bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 sm:p-10 flex flex-col"
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (step === 2) handleSubmit(onSubmit)(e);
                                        else if (step === 3) handleOtpSubmit(e);
                                    }}
                                    className="flex flex-col h-full"
                                >
                                    {/* Step Indicator Top */}
                                    <div className="flex justify-between items-center mb-8">
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-black/40">
                                            Step {currentProgStep} of {maxProgSteps}
                                        </span>
                                        <div className="flex gap-1">
                                            {[...Array(maxProgSteps)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i === (currentProgStep - 1) ? "bg-black" : i < (currentProgStep - 1) ? "bg-black/30" : "bg-black/10"} `}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Frame 0: Role Selection */}
                                    {step === 0 && (
                                        <div className="flex-1 flex flex-col justify-center space-y-8">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-light tracking-tight">
                                                    I am joining as a...
                                                </h2>
                                            </div>
                                            <div className="grid gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setValue("role", "STUDENT", {
                                                            shouldValidate: true,
                                                        })
                                                    }
                                                    className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 flex items-center gap-6 text-left ${selectedRole === "STUDENT"
                                                        ? "border-black bg-black text-white shadow-2xl scale-[1.02]"
                                                        : "border-black/10 bg-white text-black/70 hover:border-black/30 hover:shadow-lg"
                                                        } `}
                                                >
                                                    <div
                                                        className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedRole === "STUDENT" ? "bg-white/10" : "bg-black/5"} `}
                                                    >
                                                        <GraduationCap
                                                            className={`w-6 h-6 ${selectedRole === "STUDENT" ? "text-white" : "text-black"} `}
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3
                                                            className={`text-lg font-semibold ${selectedRole === "STUDENT" ? "text-white" : "text-black"} `}
                                                        >
                                                            Student
                                                        </h3>
                                                        <p
                                                            className={`text-sm mt-1 font-light ${selectedRole === "STUDENT" ? "text-white/70" : "text-black/50"} `}
                                                        >
                                                            Find opportunities & build profile
                                                        </p>
                                                    </div>
                                                    {selectedRole === "STUDENT" && (
                                                        <CheckCircle2 className="absolute right-6 w-6 h-6 text-white/50" />
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setValue("role", "RECRUITER", {
                                                            shouldValidate: true,
                                                        })
                                                    }
                                                    className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 flex items-center gap-6 text-left ${selectedRole === "RECRUITER"
                                                        ? "border-black bg-black text-white shadow-2xl scale-[1.02]"
                                                        : "border-black/10 bg-white text-black/70 hover:border-black/30 hover:shadow-lg"
                                                        } `}
                                                >
                                                    <div
                                                        className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedRole === "RECRUITER" ? "bg-white/10" : "bg-black/5"} `}
                                                    >
                                                        <Building2
                                                            className={`w-6 h-6 ${selectedRole === "RECRUITER" ? "text-white" : "text-black"} `}
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3
                                                            className={`text-lg font-semibold ${selectedRole === "RECRUITER" ? "text-white" : "text-black"} `}
                                                        >
                                                            Recruiter
                                                        </h3>
                                                        <p
                                                            className={`text-sm mt-1 font-light ${selectedRole === "RECRUITER" ? "text-white/70" : "text-black/50"} `}
                                                        >
                                                            Post jobs & discover talent
                                                        </p>
                                                    </div>
                                                    {selectedRole === "RECRUITER" && (
                                                        <CheckCircle2 className="absolute right-6 w-6 h-6 text-white/50" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Frame 1: Personal Details */}
                                    {step === 1 && (
                                        <div className="flex-1 space-y-8">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-light tracking-tight">
                                                    Basic Details
                                                </h2>
                                                <p className="text-black/50 font-light">
                                                    Let's get the essentials down.
                                                </p>
                                            </div>
                                            <div className="space-y-5">
                                                <div className="space-y-2 group">
                                                    <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1 group-focus-within:text-black transition-colors">
                                                        Full Legal Name
                                                    </label>
                                                    <Input
                                                        id="name"
                                                        type="text"
                                                        placeholder="e.g. Jane Doe"
                                                        className={`w-full bg-white hover:bg-black/[0.02] border border-black/10 focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black rounded-xl p-3 shadow-inner transition-all duration-300 font-medium ${errors.name ? "border-red-500 focus-visible:border-red-500" : ""} `}
                                                        {...formRegister("name")}
                                                    />
                                                </div>

                                                <div className="space-y-2 group">
                                                    <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1 group-focus-within:text-black transition-colors">
                                                        Email Address
                                                    </label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="e.g. jane@company.com"
                                                        className={`w-full bg-white hover:bg-black/[0.02] border border-black/10 focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black rounded-xl p-3 shadow-inner transition-all duration-300 font-medium ${errors.email ? "border-red-500 focus-visible:border-red-500" : ""} `}
                                                        {...formRegister("email")}
                                                    />
                                                </div>

                                                {selectedRole === "STUDENT" && (
                                                    <div className="space-y-2 group">
                                                        <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1 group-focus-within:text-black transition-colors">
                                                            Mobile Number
                                                        </label>
                                                        <Input
                                                            id="mobile"
                                                            type="tel"
                                                            placeholder="9876543210"
                                                            className={`w-full bg-white hover:bg-black/[0.02] border border-black/10 focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black rounded-xl p-3 shadow-inner transition-all duration-300 font-medium ${errors.mobile ? "border-red-500 focus-visible:border-red-500" : ""} `}
                                                            {...formRegister("mobile")}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Frame 2: Security & Password */}
                                    {step === 2 && (
                                        <div className="flex-1 flex flex-col justify-center space-y-6">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-light tracking-tight">
                                                    Set Password
                                                </h2>
                                                <p className="text-black/50 font-light">
                                                    Create a secure password to finish.
                                                </p>
                                            </div>

                                            <div className="space-y-2 group">
                                                <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1 group-focus-within:text-black transition-colors">
                                                    Account Password
                                                </label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    placeholder="At least 6 characters"
                                                    className={`w-full bg-white hover:bg-black/[0.02] border border-black/10 focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black rounded-xl p-3 shadow-inner transition-all duration-300 font-medium ${errors.password ? "border-red-500 focus-visible:border-red-500" : ""} `}
                                                    {...formRegister("password")}
                                                />
                                                {errors.password && (
                                                    <p className="text-xs text-red-500 pl-1">{errors.password.message}</p>
                                                )}
                                            </div>

                                            {/* Registration Disclaimer */}
                                            <div className="bg-black/[0.02] rounded-2xl p-4 border border-black/5">
                                                <div className="flex items-start gap-3">
                                                    <ShieldCheck className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
                                                    <div className="text-xs leading-relaxed text-black/60 font-light">
                                                        <strong className="text-black font-semibold uppercase tracking-wider block mb-1">Registration Disclaimer</strong>
                                                        By clicking I Agree and Continue, an OTP will be sent to confirm your identity.
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Privacy & Consent Button */}
                                            <button
                                                type="button"
                                                onClick={() => setShowGdprModal(true)}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 group ${
                                                    allConsentsGiven
                                                        ? 'border-green-500/40 bg-green-50/50'
                                                        : 'border-black/10 bg-white hover:border-black/30 hover:shadow-md'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                                                        allConsentsGiven ? 'bg-green-500' : 'bg-black/5 group-hover:bg-black/10'
                                                    }`}>
                                                        {allConsentsGiven ? (
                                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                                        ) : (
                                                            <ShieldCheck className="w-5 h-5 text-black/50" />
                                                        )}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`text-sm font-semibold ${ allConsentsGiven ? 'text-green-700' : 'text-black' }`}>
                                                            {allConsentsGiven ? 'Consent Given ✓' : 'Privacy & Consent'}
                                                        </p>
                                                        <p className="text-xs text-black/40 font-light">
                                                            {allConsentsGiven ? 'You have agreed to all required terms' : 'Review & agree to data usage terms'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ArrowRight className={`w-4 h-4 transition-colors ${ allConsentsGiven ? 'text-green-500' : 'text-black/30 group-hover:text-black' }`} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Frame 3: OTP Step */}
                                    {step === 3 && (
                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-light tracking-tight">
                                                    Verify OTP
                                                </h2>
                                                <p className="text-black/50 font-light max-w-[90%]">
                                                    {serverMessage}
                                                </p>
                                            </div>

                                            <div className="space-y-6 mt-10">
                                                <label className="text-sm font-semibold text-black/70 uppercase tracking-[0.2em] text-center block">
                                                    Enter 4-Digit Code
                                                </label>
                                                <div className="flex justify-center gap-3 sm:gap-4">
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

                                            <div className="mt-6 flex justify-center">
                                                <button
                                                    type="button"
                                                    disabled={resendTimer > 0 || isLoading}
                                                    onClick={handleResendOtp}
                                                    className="text-sm font-semibold text-black hover:underline underline-offset-4 disabled:text-black/30 disabled:no-underline transition-all"
                                                >
                                                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Didn't receive code? Resend OTP"}
                                                </button>
                                            </div>

                                            <div className="mt-6 bg-black/5 rounded-xl p-4">
                                                <p className="text-xs leading-relaxed text-black/70 font-light italic text-center">
                                                    <strong>Hint (Mock Backend):</strong> Student = Last 4 digits of your mobile, Recruiter = "1234".
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Navigation Footer */}
                                    <div className="mt-auto pt-8 flex justify-between items-center relative z-20">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={prevStep}
                                            disabled={step === 3 || isLoading}
                                            className={`text-black/60 hover:text-black hover:bg-black/5 transition-all outline-none rounded-xl px-4 py-2 font-medium ${step === 0 || step === 3 ? "opacity-0 pointer-events-none" : "opacity-100"} `}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                        </Button>

                                        {step < 2 ? (
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    if (step === 1)
                                                        nextStep([
                                                            "name",
                                                            "email",
                                                            ...(selectedRole === "STUDENT"
                                                                ? ["mobile" as const]
                                                                : []),
                                                        ]);
                                                    else nextStep();
                                                }}
                                                className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-12 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        ) : step === 2 ? (
                                            <Button
                                                type="button"
                                                onClick={handleSubmit(onSubmit)}
                                                disabled={isLoading || !allConsentsGiven}
                                                className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-12 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                                        Sending OTP
                                                    </>
                                                ) : (
                                                    "I Agree and Continue"
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                onClick={handleOtpSubmit}
                                                disabled={isLoading || otp.length < 4}
                                                className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-12 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                {isLoading ? (
                                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying</>
                                                ) : (
                                                    "Verify & Complete"
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {step < 3 && (
                        <div className="text-center text-sm text-black/50 font-light mt-10">
                            Already have an account?{" "}
                            <Link
                                to="/auth/login"
                                className="text-black font-semibold hover:underline underline-offset-4"
                            >
                                Log in here
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* ── GDPR Modal ─────────────────────────────────────────── */}
            <AnimatePresence>
                {showGdprModal && (
                    <motion.div
                        key="gdpr-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
                        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
                        onClick={(e) => { if (e.target === e.currentTarget) setShowGdprModal(false); }}
                    >
                        <motion.div
                            key="gdpr-panel"
                            initial={{ y: 80, opacity: 0, scale: 0.96 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 80, opacity: 0, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                            className="relative w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
                            style={{ maxHeight: '90vh' }}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-black/5 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold tracking-tight text-black">Privacy &amp; Consent</h2>
                                        <p className="text-[11px] text-black/40 font-light">DPDP Act 2023 — TICC / SQREX</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowGdprModal(false)}
                                    className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                                    aria-label="Close"
                                >
                                    <span className="text-black/50 text-sm leading-none">✕</span>
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-5 text-[12px] leading-relaxed text-black/70 font-light">
                                <p className="font-semibold text-black text-[13px]">TICC owner of SQREX will be registered as Data fiduciary under the Digital Personal Data Protection Act 2023, once the registration will be made open.</p>
                                <p className="font-semibold text-black">Before you continue, here's how we'll use your information</p>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-2">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">What We Collect</p>
                                    <p>When you upload your resume and create a profile, we collect:</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Your name, email, and phone number</li>
                                        <li>Your resume (education, experience, skills and included details)</li>
                                        <li>Your responses to our quiz and job preferences</li>
                                    </ul>
                                </div>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-2">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">How We Use It</p>
                                    <p className="font-medium text-black/80">To help you get hired:</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Match you with relevant jobs and opportunities</li>
                                        <li>Share your profile with employers looking for candidates like you</li>
                                        <li>Send you job alerts that fit your goal</li>
                                    </ul>
                                    <p className="font-medium text-black/80 mt-2">To improve our service:</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Analyse skill gaps in your CV against global employer demands</li>
                                        <li>Prepare your skill fitment reports</li>
                                        <li>Understand what's working and make our platform better</li>
                                        <li>Personalize counselling by mapping university &amp; course recommendations with job data</li>
                                    </ul>
                                    <p className="font-medium text-black/80 mt-2">To keep you informed:</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Job opportunities matching your profile</li>
                                        <li>Updates about Sqrex features and services</li>
                                        <li>Job market, study abroad programs and career tips</li>
                                    </ul>
                                </div>

                                <p>We will only use your data for the purposes listed above. If we need to use it for anything else, we will ask for your consent again.</p>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-2">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">Where Your Data Goes</p>
                                    <p><strong className="text-black">Storage:</strong> Securely stored on cloud servers within India (AWS) in compliance with Indian data protection laws.</p>
                                    <p><strong className="text-black">Who sees it:</strong></p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Employers and universities with relevant opportunities</li>
                                        <li>Service providers who help us run the platform</li>
                                    </ul>
                                    <p>We will notify you if data is transferred to international employers outside India.</p>
                                    <p><strong className="text-black">How long:</strong> Up to 3 years, or until you ask us to delete it.</p>
                                </div>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-2">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">Your Rights</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>See what data we have about you</li>
                                        <li>Fix any incorrect information</li>
                                        <li>Delete your account and data</li>
                                        <li>Stop receiving emails anytime</li>
                                        <li>Download your data</li>
                                        <li>Object to automated decision making</li>
                                        <li>Nominate someone to exercise your rights in case of death or incapacity</li>
                                    </ul>
                                    <p className="mt-1">Contact: <span className="text-black font-medium">privacy@sqrex.com</span></p>
                                </div>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-1">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">Grievance Officer</p>
                                    <p>For any complaint or concern about your data:</p>
                                    <p>Email: <span className="text-black font-medium">grievance@sqrex.com</span></p>
                                    <p>We will acknowledge your complaint within 24 working hours.</p>
                                </div>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-1">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">Important to Know</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>You can withdraw consent anytime through your account settings or by emailing us.</li>
                                        <li>Withdrawing consent won't affect data already processed.</li>
                                        <li>We use industry-standard security to protect your data.</li>
                                        <li>We'll never sell your information.</li>
                                    </ul>
                                </div>

                                <p className="text-[10px] text-black/40">Questions? privacy@sqrex.com &nbsp;|&nbsp; Office address: Official Address &nbsp;|&nbsp; WhatsApp only</p>
                            </div>

                            {/* Consent Checkboxes */}
                            <div className="px-7 py-4 border-t border-black/5 space-y-3 flex-shrink-0 bg-white">
                                <p className="text-[11px] font-bold text-black uppercase tracking-wider">Consent Checklist</p>
                                {([
                                    { id: 'modal-age-18', checked: consentAge18, setter: setConsentAge18, label: 'I am at least 18 years old or above' },
                                    { id: 'modal-read-understood', checked: consentReadUnderstood, setter: setConsentReadUnderstood, label: 'I have read and understood this consent' },
                                    { id: 'modal-data-processing', checked: consentDataProcessing, setter: setConsentDataProcessing, label: 'I consent to data processing as described' },
                                    { id: 'modal-resume-sharing', checked: consentResumeSharing, setter: setConsentResumeSharing, label: 'I consent to resume sharing with employers' },
                                ] as { id: string; checked: boolean; setter: (v: boolean) => void; label: string }[]).map(({ id, checked, setter, label }) => (
                                    <label key={id} htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
                                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${ checked ? 'bg-black border-black' : 'border-black/20 group-hover:border-black/40' }`}>
                                            {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            <input id={id} type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} className="sr-only" />
                                        </div>
                                        <span className={`text-[12px] leading-relaxed transition-colors ${ checked ? 'text-black font-medium' : 'text-black/60' }`}>{label}</span>
                                    </label>
                                ))}

                                {/* Marketing */}
                                <div className="pt-2 border-t border-black/5 space-y-2">
                                    <p className="text-[11px] font-bold text-black uppercase tracking-wider">Marketing (optional)</p>
                                    <div className="flex gap-4">
                                        {(['yes', 'no'] as const).map((val) => (
                                            <label key={val} className="flex items-center gap-2 cursor-pointer">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${ marketingOptIn === val ? 'border-black' : 'border-black/20' }`}>
                                                    {marketingOptIn === val && <div className="w-2 h-2 rounded-full bg-black" />}
                                                    <input type="radio" name="modal-marketing" value={val} checked={marketingOptIn === val} onChange={() => setMarketingOptIn(val)} className="sr-only" />
                                                </div>
                                                <span className="text-[12px] text-black/70">{val === 'yes' ? 'Yes, send me updates' : 'No, essential only'}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Action Buttons */}
                            <div className="flex gap-3 px-7 py-5 border-t border-black/5 flex-shrink-0 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setShowGdprModal(false)}
                                    className="flex-1 h-12 rounded-full border-2 border-black/10 text-black/70 text-sm font-medium hover:border-black/30 hover:text-black transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    disabled={!allConsentsGiven}
                                    onClick={() => {
                                        if (allConsentsGiven) setShowGdprModal(false);
                                    }}
                                    className="flex-[2] h-12 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-black text-white hover:bg-black/80 shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)] active:scale-[0.98]"
                                >
                                    {allConsentsGiven ? 'I Agree & Continue ✓' : `Agree to all ${[consentAge18, consentReadUnderstood, consentDataProcessing, consentResumeSharing].filter(Boolean).length}/4 items`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
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
        </PageTransition>
    );
}

