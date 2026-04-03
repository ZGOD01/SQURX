import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "./store";
import { useNotificationStore } from "@/lib/store/notifications";
import { Button, Input, Toast } from "@/components/ui";
import { PageTransition } from "@/components/motion";
import { registerSchema, type RegisterFormValues } from "@/lib/validators/auth";
import {
    Loader2,
    ArrowRight,
    ArrowLeft,
    UploadCloud,
    ShieldCheck,
    CheckCircle2,
    Building2,
    GraduationCap,
} from "lucide-react";

export function Register() {
    const [isLoading, setIsLoading] = useState(false);
    const [toastOpen, setToastOpen] = useState(false);
    const navigate = useNavigate();
    const { register: registerStoreAction } = useAuthStore();
    const { sendEmail } = useNotificationStore();

    // Step state
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);

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
            document: undefined,
        },
    });

    const selectedRole = watch("role");

    const nextStep = async (fieldsToValidate?: (keyof RegisterFormValues)[]) => {
        if (fieldsToValidate) {
            const isValid = await trigger(fieldsToValidate);
            if (!isValid) return;
        }
        setDirection(1);
        if (selectedRole === "RECRUITER" && step === 1) {
            setStep(3); // Skip documents for recruiter
        } else {
            setStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        setDirection(-1);
        if (selectedRole === "RECRUITER" && step === 3) {
            setStep(1);
        } else {
            setStep((prev) => prev - 1);
        }
    };

    const onSubmit = async (data: RegisterFormValues) => {
        setIsLoading(true);
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        try {
            await registerStoreAction(
                data.name,
                data.email,
                data.role,
                data.resume,
                data.document,
            );
            setToastOpen(true);

            // Send welcome orientation email visually
            setTimeout(() => {
                sendEmail(
                    "Welcome to Squrx!",
                    `Your account has been successfully created.We are excited to help you find your next big opportunity!`,
                );
            }, 1000);

            setTimeout(() => {
                switch (data.role) {
                    case "STUDENT":
                        navigate("/auth/onboarding");
                        break;
                    case "RECRUITER":
                        navigate("/recruiter");
                        break;
                }
            }, 1200);
        } catch (err: any) {
            alert(err.message || "Failed to register.");
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

    const FileUploadArea = ({
        label,
        id,
        description,
    }: {
        label: string;
        id: string;
        description: string;
    }) => {
        const hasFile = watch(id as any);
        return (
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative overflow-hidden border-2 border-dashed transition-all duration-500 rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center min-h-[140px]
                    ${hasFile ? "border-black bg-black/5" : "border-black/20 bg-white hover:border-black/50 hover:bg-black/[0.02]"} `}
            >
                {hasFile ? (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center gap-2"
                    >
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mb-1">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h4 className="font-medium text-sm text-black">
                            Document Attached
                        </h4>
                        <p className="text-xs text-black/60 truncate max-w-[200px]">
                            {watch(id as any)}
                        </p>
                    </motion.div>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-black/5 text-black rounded-full flex items-center justify-center mb-3 group-hover:bg-black group-hover:text-white transition-all duration-300">
                            <UploadCloud className="w-5 h-5" />
                        </div>
                        <h4 className="font-medium text-sm text-black">{label}</h4>
                        <p className="text-xs text-black/50 font-light mt-1">
                            {description}
                        </p>
                    </>
                )}

                <input
                    type="file"
                    id={id}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            setValue(id as any, e.target.files[0].name, {
                                shouldValidate: true,
                            });
                        }
                    }}
                />
            </motion.div>
        );
    };

    // Calculate progress percentage
    const totalSteps = selectedRole === "STUDENT" ? 4 : 3;
    const progressPercentage = ((step + 1) / totalSteps) * 100;

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
                                        if (step === 3) handleSubmit(onSubmit)(e);
                                    }}
                                    className="flex flex-col h-full"
                                >
                                    {/* Step Indicator Top */}
                                    <div className="flex justify-between items-center mb-8">
                                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-black/40">
                                            Step {step + 1} of {totalSteps}
                                        </span>
                                        <div className="flex gap-1">
                                            {[...Array(totalSteps)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i === step ? "bg-black" : i < step ? "bg-black/30" : "bg-black/10"} `}
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
                                                    Student Credentials
                                                </h2>
                                                <p className="text-black/50 font-light">
                                                    Let's get the basics down.
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
                                                        placeholder="e.g. jane@university.edu"
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
                                                            placeholder="+91 00000 00000"
                                                            className={`w-full bg-white hover:bg-black/[0.02] border border-black/10 focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black rounded-xl p-3 shadow-inner transition-all duration-300 font-medium ${errors.mobile ? "border-red-500 focus-visible:border-red-500" : ""} `}
                                                            {...formRegister("mobile")}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Frame 2: Documents (Student Only) */}
                                    {step === 2 && selectedRole === "STUDENT" && (
                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-light tracking-tight">
                                                    Verification
                                                </h2>
                                                <p className="text-black/50 font-light">
                                                    Upload necessary documents securely.
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-4 mt-6">
                                                <FileUploadArea
                                                    id="resume"
                                                    label="Latest Resume (CV)"
                                                    description="PDF, DOCX format. Max 5MB."
                                                />
                                                <FileUploadArea
                                                    id="document"
                                                    label="School Leaving Certificate"
                                                    description="Required for identity verification."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Frame 3: Security & Disclaimer */}
                                    {step === 3 && (
                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-2">
                                                <h2 className="text-3xl font-light tracking-tight">
                                                    Final Step
                                                </h2>
                                                <p className="text-black/50 font-light">
                                                    Create a secure password to finish.
                                                </p>
                                            </div>

                                            <div className="space-y-2 group mt-6">
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
                                            </div>

                                            <div className="mt-8 bg-black/[0.02] rounded-2xl p-6 border border-black/5">
                                                <div className="flex items-start gap-3">
                                                    <ShieldCheck className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs leading-relaxed text-black/60 font-light">
                                                        <strong className="text-black font-semibold uppercase tracking-wider block mb-1">
                                                            Registration Disclaimer
                                                        </strong>
                                                        By proceeding, you agree to our Terms of Service and
                                                        acknowledge that all provided documents are
                                                        authentic. Uploading fraudulent documents may result
                                                        in permanent suspension. Your data is encrypted and
                                                        handled securely.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Navigation Footer */}
                                    <div className="mt-auto pt-8 flex justify-between items-center relative z-20">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={prevStep}
                                            className={`text-black/60 hover:text-black hover:bg-black/5 transition-all outline-none rounded-xl px-4 py-2 font-medium ${step === 0 ? "opacity-0 pointer-events-none" : "opacity-100"} `}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                        </Button>

                                        {step < 3 ? (
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
                                                className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-12 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95"
                                            >
                                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                onClick={handleSubmit(onSubmit)}
                                                disabled={isLoading}
                                                className="bg-black text-white hover:bg-black/90 rounded-full px-8 h-12 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                                        Verifying
                                                    </>
                                                ) : (
                                                    "Complete"
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="text-center text-sm text-black/50 font-light mt-10">
                        Already have an account?{" "}
                        <Link
                            to="/auth/login"
                            className="text-black font-semibold hover:underline underline-offset-4"
                        >
                            Log in here
                        </Link>
                    </div>
                </div>
            </div>

            {toastOpen && (
                <div className="fixed bottom-4 right-4 z-[100]">
                    <Toast
                        variant="success"
                        title="Welcome to Squrx!"
                        onClose={() => setToastOpen(false)}
                    >
                        Your account has been created securely. Redirecting to your
                        dashboard...
                    </Toast>
                </div>
            )}
        </PageTransition>
    );
}
