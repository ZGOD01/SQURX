import { useState, useEffect } from 'react';
import { consultationApi } from '@/lib/consultationApi';
import { FadeInOnView } from '@/components/motion';
import { useAuthStore } from '@/features/auth/store';
import { useNavigate } from 'react-router-dom';
import { setGdprConsent } from '@/lib/utils';
import { 
    Compass, Landmark, Mail, ScrollText, PlaneTakeoff, 
    Cog, Briefcase, Palette, Dna, 
    ShieldCheck, Scale, GraduationCap,
    TrendingUp, Home, Microscope, Handshake, 
    HelpCircle, Calculator, Star, Map, CheckCircle2,
    CalendarDays, LogIn, ArrowRight, Clock, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/config';

const QUESTIONS = [
    {
        id: "65f000000000000000000100",
        title: "Where are you on the journey?",
        description: "Select your current stage to map the trajectory.",
        options: [
            { id: '65f000000000000000000101', text: "Exploring Options", icon: Compass },
            { id: '65f000000000000000000102', text: "Shortlisted Universities", icon: Landmark },
            { id: '65f000000000000000000103', text: "Applied & Awaiting", icon: Mail },
            { id: '65f000000000000000000104', text: "Offer in Hand", icon: ScrollText },
            { id: '65f000000000000000000105', text: "Visa & Flying Soon", icon: PlaneTakeoff }
        ]
    },
    {
        id: "65f000000000000000000200",
        title: "Your core field of expertise?",
        description: "Your background dictates the most lucrative routing combinations.",
        options: [
            { id: '65f000000000000000000201', text: "STEM / Engineering", icon: Cog },
            { id: '65f000000000000000000202', text: "Business / Management", icon: Briefcase },
            { id: '65f000000000000000000203', text: "Arts / Creative", icon: Palette },
            { id: '65f000000000000000000204', text: "Health & Sciences", icon: Dna }
        ]
    },
    {
        id: "65f000000000000000000300",
        title: "How are you financing this leap?",
        description: "Understanding your capital helps us prioritize specific architectures.",
        options: [
            { id: '65f000000000000000000301', text: "Education Loan", icon: Landmark },
            { id: '65f000000000000000000302', text: "Self-funded / Savings", icon: ShieldCheck },
            { id: '65f000000000000000000303', text: "Loan & Savings Mix", icon: Scale },
            { id: '65f000000000000000000304', text: "Scholarship Hunt", icon: GraduationCap }
        ]
    },
    {
        id: "65f000000000000000000400",
        title: "What is your ultimate endgame?",
        description: "Different goals require vastly different geographical moves.",
        options: [
            { id: '65f000000000000000000401', text: "Max ROI / High Salary", icon: TrendingUp },
            { id: '65f000000000000000000402', text: "Global Settlement (PR)", icon: Home },
            { id: '65f000000000000000000403', text: "Research & Innovation", icon: Microscope },
            { id: '65f000000000000000000404', text: "Global Networking", icon: Handshake }
        ]
    },
    {
        id: "65f000000000000000000500",
        title: "What is your biggest unknown?",
        description: "We'll help you resolve this uncertainty directly.",
        options: [
            { id: '65f000000000000000000501', text: "Securing a Job", icon: HelpCircle },
            { id: '65f000000000000000000502', text: "Managing Finances", icon: Calculator },
            { id: '65f000000000000000000503', text: "Profile Strength", icon: Star },
            { id: '65f000000000000000000504', text: "Choosing Location", icon: Map }
        ]
    }
];

// Beautifully balanced color palettes for options
const PALETTES = [
    { border: "border-blue-500", text: "text-blue-600", bgLight: "bg-blue-50", bgSolid: "bg-blue-500", ring: "ring-blue-500/20" },
    { border: "border-purple-500", text: "text-purple-600", bgLight: "bg-purple-50", bgSolid: "bg-purple-500", ring: "ring-purple-500/20" },
    { border: "border-emerald-500", text: "text-emerald-600", bgLight: "bg-emerald-50", bgSolid: "bg-emerald-500", ring: "ring-emerald-500/20" },
    { border: "border-orange-500", text: "text-orange-600", bgLight: "bg-orange-50", bgSolid: "bg-orange-500", ring: "ring-orange-500/20" },
    { border: "border-rose-500", text: "text-rose-600", bgLight: "bg-rose-50", bgSolid: "bg-rose-500", ring: "ring-rose-500/20" }
];


export function GlobalCareerDiagnostic() {
    const navigate = useNavigate();
    const { user, setAuth } = useAuthStore();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Consultation Booking States
    const [isBookingMode, setIsBookingMode] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [isConfirmingBooking, setIsConfirmingBooking] = useState(false);
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
    const [isGuestAccount, setIsGuestAccount] = useState(false); // true when we silently created a new account during booking
    const [copiedPassword, setCopiedPassword] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [customPassword, setCustomPassword] = useState('');

    // Lead Generation Form State
    const [isLeadFormMode, setIsLeadFormMode] = useState(false);
    const [isLeadFormSubmitted, setIsLeadFormSubmitted] = useState(false);
    const [leadData, setLeadData] = useState<{ name: string; email: string; mobile: string }>({ name: '', email: '', mobile: '' });

    const [slotsData, setSlotsData] = useState<any[]>([]);
    const [showOverlay, setShowOverlay] = useState(true);
    const [initialChoice, setInitialChoice] = useState<'jobs' | 'consultation' | null>(null);

    const [questions, setQuestions] = useState<any[]>(QUESTIONS);

    // GDPR Consent Modal States
    const [showGdprModal, setShowGdprModal] = useState(false);
    const [consentAge18, setConsentAge18] = useState(false);
    const [consentReadUnderstood, setConsentReadUnderstood] = useState(false);
    const [consentDataProcessing, setConsentDataProcessing] = useState(false);
    const [consentResumeSharing, setConsentResumeSharing] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState<'yes' | 'no' | null>(null);
    const allConsentsGiven = consentAge18 && consentReadUnderstood && consentDataProcessing && consentResumeSharing;

    // Lock body scroll and hide navbar when GDPR modal is open
    useEffect(() => {
        const navbar = document.getElementById('main-navbar');
        if (showGdprModal) {
            document.body.style.overflow = 'hidden';
            if (navbar) {
                navbar.style.visibility = 'hidden';
                navbar.style.pointerEvents = 'none';
            }
        } else {
            document.body.style.overflow = '';
            if (navbar) {
                navbar.style.visibility = '';
                navbar.style.pointerEvents = '';
            }
        }
        return () => {
            document.body.style.overflow = '';
            const n = document.getElementById('main-navbar');
            if (n) { n.style.visibility = ''; n.style.pointerEvents = ''; }
        };
    }, [showGdprModal]);

    useEffect(() => {
        // Fetch real active quiz questions from the API and merge their database IDs
        fetch(`${API_BASE_URL}/quizzes`)
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data && res.data.length > 0) {
                    // Filter out inactive quizzes if backend returns them
                    const activeQuizzes = res.data.filter((q: any) => q.isActive !== false);

                    const mergedQuestions = QUESTIONS.map((localQ) => {
                        const backendQ = activeQuizzes.find((bq: any) => 
                            bq.title.toLowerCase().trim() === localQ.title.toLowerCase().trim()
                        );
                        
                        if (backendQ) {
                            return {
                                ...localQ,
                                id: backendQ._id,
                                options: localQ.options.map((localOpt) => {
                                    const backendOpt = backendQ.options?.find((bo: any) => 
                                        bo.text.toLowerCase().trim() === localOpt.text.toLowerCase().trim()
                                    );
                                    return {
                                        ...localOpt,
                                        id: backendOpt ? backendOpt._id : localOpt.id
                                    };
                                })
                            };
                        }
                        return localQ;
                    });
                    
                    setQuestions(mergedQuestions);
                }
            })
            .catch(err => {
                console.error("Failed to load quizzes from backend:", err);
            });

        consultationApi.getTimeSlots().then(res => {
            if(res.success && res.data) {
               setSlotsData(res.data);
            }
        }).catch(console.error);
    }, []);

    const handleSelectOption = (index: number, optionId: string) => {
        const nextAnswers = { ...answers, [index]: optionId };
        setAnswers(nextAnswers);

        if (index < questions.length - 1) {
            setTimeout(() => setStep(index + 1), 250);
        } else {
            // Write user answers to localStorage so that they are synced and readable across tabs
            localStorage.setItem('squrx_quiz_answers', JSON.stringify(nextAnswers));
            setIsAnalyzing(true);
            setTimeout(() => {
                setIsAnalyzing(false);
                setStep(questions.length);
                if (user) {
                    setLeadData({
                        name: user.name || user.fullName || 'Student',
                        email: user.email || '',
                        mobile: user.mobile || '9999999999'
                    });
                    setIsLeadFormSubmitted(true);
                    setIsBookingMode(true);
                } else {
                    setIsLeadFormMode(true);
                }
            }, 1800);
        }
    };

    // Called when Confirm Slot is clicked — opens GDPR modal first
    const handleFinalizeBooking = () => {
        if (!selectedDate || !selectedTime) return;
        setShowGdprModal(true);
    };

    // Called after user agrees to all GDPR consents
    const handleGdprAgreeAndBook = async () => {
        setShowGdprModal(false);
        setIsConfirmingBooking(true);
        setBookingError(null);
        
        try {
            // Build quiz answers from component state (no localStorage)
            const quizAnswersList = Object.keys(answers).map(key => {
                const stepIndex = parseInt(key, 10);
                const rawChoice = answers[stepIndex];
                const isValidHex = /^[0-9a-fA-F]{24}$/.test(rawChoice);
                return {
                    quizId: questions[stepIndex]?.id || '65f000000000000000000000',
                    choiceId: isValidHex ? rawChoice : '65f000000000000000000000'
                };
            });

            if (quizAnswersList.length === 0) {
                quizAnswersList.push({
                    quizId: '65f000000000000000000000',
                    choiceId: '65f000000000000000000000'
                });
            }

            // Sanitize mobile to ensure it's exactly 10 digits
            let sanitizedMobile = leadData.mobile ? leadData.mobile.replace(/\D/g, '') : '9999999999';
            if (sanitizedMobile.length !== 10) {
                sanitizedMobile = '9999999999';
            }

            // Silent signup & login flow to ensure user document exists and has gdprConsent verified,
            // and obtaining a valid token to authorize the subsequent book request.
            let activeToken = localStorage.getItem('token') || '';
            let authError: string | null = null;
            let loggedInUser: any = null;
            
            if (activeToken) {
                // User is already logged in, bypass silent signup/login
                loggedInUser = user;
            } else if (passwordRequired) {
                if (!customPassword) {
                    throw new Error("Password is required to book under this account.");
                }
                try {
                    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: leadData.email,
                            password: customPassword
                        })
                    });
                    const loginData = await loginRes.json().catch(() => ({}));
                    if (loginRes.status === 200 && loginData.success && loginData.data?.token) {
                        activeToken = loginData.data.token;
                        loggedInUser = loginData.data.user;
                        localStorage.setItem('token', activeToken);
                        setPasswordRequired(false);
                    } else if (loginRes.status === 401) {
                        authError = "Incorrect password. Please verify your password and try again.";
                    } else if (loginRes.status === 403) {
                        authError = "This account is registered but unverified. Please Sign In normally to verify and book.";
                    } else {
                        authError = loginData.message || "Failed to authenticate with entered password.";
                    }
                } catch (e) {
                    authError = "Failed to reach verification server. Please try again.";
                }
            } else {
                const guestPassword = 'SqurxGuestPass123!';
                try {
                    // 1. Silent Signup
                    const signupRes = await fetch(`${API_BASE_URL}/auth/signup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fullName: leadData.name || 'Guest User',
                            email: leadData.email || 'guest@example.com',
                            mobile: sanitizedMobile,
                            password: guestPassword,
                            role: 'student',
                            gdprConsent: true,
                            gdpr: true,
                            consent: true
                        })
                    });
                    
                    if (signupRes.status === 201) {
                        const signupData = await signupRes.json().catch(() => ({}));
                        const userId = signupData?.data?.userId;
                        if (userId) {
                            // Deriving OTP: last 4 digits of mobile number
                            const otp = sanitizedMobile.slice(-4);
                            const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId,
                                    otp
                                })
                            });
                            const verifyData = await verifyRes.json().catch(() => ({}));
                            if (verifyRes.status === 200 && verifyData.success && verifyData.data?.token) {
                                activeToken = verifyData.data.token;
                                loggedInUser = verifyData.data.user;
                                localStorage.setItem('token', activeToken);
                                setIsGuestAccount(true); // brand-new account — show temp password notice
                            } else {
                                console.warn("Silent OTP verification failed:", verifyData);
                            }
                        }
                    } else if (signupRes.status === 409) {
                        // 2. Silent Login (if already exists)
                        const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: leadData.email || 'guest@example.com',
                                password: guestPassword
                            })
                        });
                        const loginData = await loginRes.json().catch(() => ({}));
                        if (loginRes.status === 200 && loginData.success && loginData.data?.token) {
                            activeToken = loginData.data.token;
                            loggedInUser = loginData.data.user;
                            localStorage.setItem('token', activeToken);
                        } else if (loginRes.status === 401) {
                            setPasswordRequired(true);
                            authError = "This email/mobile is already registered. Please enter your password below to confirm booking.";
                        } else if (loginRes.status === 403) {
                            authError = "This account is registered but unverified. Please Sign In to verify and book, or use a new email/mobile.";
                        } else {
                            authError = loginData.message || "Authentication failed. Please Sign In or use another email/mobile.";
                        }
                    } else {
                        const signupData = await signupRes.json().catch(() => ({}));
                        authError = signupData.message || "Registration failed. Please try again.";
                    }
                } catch (e) {
                    console.warn("Silent signup/login workaround check failed, falling back to direct book:", e);
                }
            }

            if (authError) {
                throw new Error(authError);
            }

            const payload = {
                fullName: leadData.name || 'Guest User',
                email: leadData.email || 'guest@example.com',
                mobile: sanitizedMobile,
                quizAnswers: quizAnswersList,
                appointment: { dateId: selectedDate, timeId: selectedTime },
                gdprConsent: true,
                gdpr: true,
                consent: true
            };
            console.log('PAYLOAD BEING SENT TO BACKEND:', JSON.stringify(payload, null, 2));

            const result = await consultationApi.bookConsultation(payload);

            // Determine the best available token: booking response takes priority, then the
            // token obtained during silent signup/login, then any pre-existing session token.
            const tokenToUse = result?.data?.token || activeToken;

            if (tokenToUse) {
                // Attempt to fetch the authoritative user profile from /user/me.
                // This ensures the auth store always holds real, server-verified user data.
                let resolvedUser: any = loggedInUser || null;

                try {
                    const meRes = await fetch(`${API_BASE_URL}/user/me`, {
                        headers: { 'Authorization': `Bearer ${tokenToUse}` }
                    });
                    if (meRes.ok) {
                        const meJson = await meRes.json();
                        if (meJson.success && meJson.data) {
                            // /user/me returned real data — use it as the authoritative user.
                            resolvedUser = meJson.data;
                        } else {
                            // Unexpected response shape — warn and fall back to loggedInUser.
                            console.warn('[GCD] /user/me returned unexpected shape, falling back to login data:', meJson);
                        }
                    } else {
                        // /user/me request failed (e.g. 401/403/network) — warn and fall back.
                        console.warn('[GCD] /user/me responded with status', meRes.status, '— falling back to login data');
                    }
                } catch (meErr) {
                    // Network or parse error — warn without exposing the token in the log.
                    console.warn('[GCD] /user/me fetch error — falling back to login data:', meErr);
                }

                if (!resolvedUser) {
                    // No user data available from any source — abort auth update to prevent
                    // an invalid authentication state from being stored.
                    console.error('[GCD] No valid user data available after booking. Auth store not updated.');
                } else {
                    // Single call to setAuth — no duplicates.
                    setAuth(resolvedUser, tokenToUse);

                    // Update GDPR consent in localStorage using the resolved user id.
                    const userId = resolvedUser._id || resolvedUser.id;
                    if (userId) {
                        setGdprConsent(userId, true);
                    }
                }
            }

            setIsConfirmingBooking(false);
            setIsBookingConfirmed(true);
        } catch (error: any) {
            console.error('Booking failed:', error);
            setBookingError(error.message || 'Failed to book consultation');
            setIsConfirmingBooking(false);
        }
    };

    const handleBookConsultationClick = () => {
        setIsBookingMode(true);
    };

    const handleLogin = () => navigate('/student', { replace: true });


    const handleInitialChoice = (choice: 'jobs' | 'consultation') => {
        setInitialChoice(choice);
        if (choice === 'jobs') {
            navigate('/auth/login');
        } else {
            setStep(0);
            setAnswers({});
            setIsLeadFormSubmitted(false);
            setIsLeadFormMode(false);
                                         setIsBookingMode(true);
            setIsBookingMode(false);
            setIsBookingConfirmed(false);
            setShowOverlay(false);
        }
    };

    const progressPercentage = (step / questions.length) * 100;

    return (
        <>
        <section className="relative py-16 md:py-20 w-full bg-white overflow-hidden font-sans border-t justify-center flex border-gray-100">
            <FadeInOnView className="max-w-[1000px] w-full mx-auto px-4 sm:px-6 relative">
                
                {/* Overlay with Options */}
                <AnimatePresence>
                    {showOverlay && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
                        >
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm pointer-events-none" />
                            
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                                className="max-w-3xl w-full relative z-10"
                            >
                                <div className="text-center mb-10">
                                    <motion.div 
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-xl shadow-blue-600/20"
                                    >
                                        <Compass size={14} strokeWidth={3} /> Select Path
                                    </motion.div>
                                    <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter leading-none">
                                        Tailor Your Experience.
                                    </h3>
                                    <p className="text-lg text-gray-500 font-medium max-w-lg mx-auto">
                                        Whether you're seeking expert advice or immediate career moves, we have the right architecture for you.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    {/* Consultation Path */}
                                    <motion.button 
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleInitialChoice('consultation')}
                                        className="relative group overflow-hidden bg-white rounded-[2.5rem] p-8 md:p-10 border-2 border-transparent hover:border-blue-600 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_rgba(37,99,235,0.15)] text-left flex flex-col items-start"
                                    >
                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <CalendarDays size={120} strokeWidth={1} />
                                        </div>
                                        
                                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                            <CalendarDays size={32} strokeWidth={2.5} />
                                        </div>
                                        
                                        <h4 className="text-2xl font-black text-gray-900 mb-3 tracking-tight group-hover:text-blue-600 transition-colors">Book Consultation</h4>
                                        <p className="text-gray-500 font-medium leading-relaxed mb-8 flex-1">
                                            Schedule a quick chat with our advisors to find the best career options and job search strategies for you.
                                        </p>
                                        
                                        <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                                            Start Diagnostic <ArrowRight size={16} strokeWidth={3} />
                                        </div>
                                    </motion.button>

                                    {/* Jobs Path */}
                                    <motion.button 
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleInitialChoice('jobs')}
                                        className="relative group overflow-hidden bg-white rounded-[2.5rem] p-8 md:p-10 border-2 border-transparent hover:border-purple-600 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_rgba(124,58,237,0.15)] text-left flex flex-col items-start"
                                    >
                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Briefcase size={120} strokeWidth={1} />
                                        </div>

                                        <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-8 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                            <Briefcase size={32} strokeWidth={2.5} />
                                        </div>
                                        
                                        <h4 className="text-2xl font-black text-gray-900 mb-3 tracking-tight group-hover:text-purple-600 transition-colors">Explore Jobs</h4>
                                        <p className="text-gray-500 font-medium leading-relaxed mb-8 flex-1">
                                            Bypass the diagnostic and dive straight into high-impact global job opportunities.
                                        </p>
                                        
                                        <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                                            Browse Openings <ArrowRight size={16} strokeWidth={3} />
                                        </div>
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MEDIUM SIZED: Reduced min-h, rounded corners, shadow */}
                <div className={`flex flex-col md:flex-row w-full min-h-[480px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/40 transition-all duration-700 ${showOverlay ? 'blur-[12px] scale-[0.98] pointer-events-none brightness-95' : 'blur-0 scale-100'}`}>
                    
                    {/* LEFT SIDE: Heading & Context */}
                    <div className="w-full md:w-[45%] bg-white p-6 md:p-10 flex flex-col justify-between">
                        <div>
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold tracking-widest uppercase mb-6 shadow-sm border border-blue-100">
                                <Compass size={12} /> Diagnostic Engine
                            </span>
                            
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-3xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight leading-[1.15] mb-4">
                                        {step < questions.length ? questions[step].title : "Trajectory Locked."}
                                    </h2>
                                    <p className="text-base text-gray-500 font-medium leading-relaxed">
                                        {step < questions.length 
                                            ? questions[step].description 
                                            : "Your variables have been compiled for your appointment booking."}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-10 md:mt-0">
                            <div className="flex justify-between items-center mb-2 text-[11px] font-bold text-gray-400 tracking-widest uppercase">
                                <span>Phase {step < questions.length ? step + 1 : 'Complete'}</span>
                                <span>{questions.length} Questions</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden shadow-inner relative">
                                <motion.div 
                                    className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercentage}%` }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE: Interactive Colorful Quiz */}
                    <div className="w-full md:w-[55%] p-6 md:p-10 bg-white flex flex-col justify-center relative min-h-[400px] md:min-h-0 border-l border-gray-100/50">
                        <AnimatePresence mode="wait">
                            {isAnalyzing && (
                                <motion.div 
                                    key="analyzing"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 bg-white z-10"
                                >
                                    <div className="w-16 h-16 border-[3px] border-blue-100 border-t-blue-500 rounded-full animate-spin mb-6" />
                                    <h3 className="text-2xl font-black tracking-tight text-gray-900 mb-2">Processing details...</h3>
                                    <p className="text-gray-500 font-medium text-sm">Preparing your appointment details.</p>
                                </motion.div>
                            )}

                            {step < questions.length && !isAnalyzing && (
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="w-full max-w-lg mx-auto"
                                >
                                    <div className="flex flex-col gap-3">
                                        {questions[step].options.map((opt: any, idx: number) => {
                                            const Icon = opt.icon;
                                            const isSelected = answers[step] === opt.id;
                                            const color = PALETTES[idx % PALETTES.length];

                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handleSelectOption(step, opt.id)}
                                                    className={`group relative flex items-center p-4 w-full rounded-2xl border-[1.5px] transition-all duration-300 text-left ${
                                                        isSelected 
                                                        ? `${color.border} bg-white shadow-md transform scale-[1.02] ring-4 ${color.ring} z-10` 
                                                        : `border-gray-200 bg-white hover:${color.border} hover:shadow-lg hover:-translate-y-0.5`
                                                    }`}
                                                >
                                                    {/* Custom Color Box */}
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 transition-all duration-300 flex-shrink-0 ${
                                                        isSelected 
                                                        ? `${color.bgSolid} text-white scale-110 shadow-md` 
                                                        : `${color.bgLight} ${color.text} group-hover:shadow-md group-hover:scale-105`
                                                    }`}>
                                                        {typeof Icon === 'string' ? (
                                                            <span className="text-2xl">{Icon}</span>
                                                        ) : (
                                                            <Icon size={20} strokeWidth={2} />
                                                        )}
                                                    </div>

                                                    {/* Text Focus Area */}
                                                    <div className="flex-1">
                                                        <span className={`text-base font-bold transition-colors ${
                                                            isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                                                        }`}>
                                                            {opt.text}
                                                        </span>
                                                    </div>

                                                    {/* Hover Animation Arrow */}
                                                    <div className={`opacity-0 -translate-x-3 transition-all duration-300 ${isSelected ? `opacity-100 translate-x-0 ${color.text}` : `group-hover:opacity-100 group-hover:translate-x-0 ${color.text}`}`}>
                                                        <ArrowRight className="w-5 h-5" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {step === questions.length && isLeadFormMode && !isLeadFormSubmitted && (
                                <motion.div
                                    key="lead-form"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="flex flex-col justify-center w-full relative z-20"
                                >
                                    <div className="absolute -top-10 left-12 w-40 h-40 bg-blue-400/20 rounded-full blur-[50px] pointer-events-none"></div>
                                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 tracking-tight">Connect with an Advisor</h3>
                                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                                        Enter your details below to schedule your 1-on-1 career consultation slot.
                                    </p>

                                    <form onSubmit={(e) => { 
                                        e.preventDefault(); 
                                        
                                        const formData = new FormData(e.currentTarget);

                                        // Store lead info in component state (no localStorage)
                                        setLeadData({
                                            name: String(formData.get('name') || ''),
                                            email: String(formData.get('email') || ''),
                                            mobile: String(formData.get('mobile') || '')
                                        });

                                        setPasswordRequired(false);
                                        setCustomPassword('');
                                        setBookingError(null);

                                        setIsLeadFormSubmitted(true); 
                                        setIsLeadFormMode(false); 
                                        setIsBookingMode(true);
                                    }} className="space-y-5 w-full relative z-10">
                                        
                                        <div className="space-y-1.5 group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-600 transition-colors">Full Legal Name</label>
                                            <div className="relative">
                                                <input name="name" required type="text" defaultValue={leadData.name} placeholder="e.g. Michael Chen" className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[1rem] px-4 text-sm font-bold text-gray-900 transition-all outline-none shadow-sm" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5 group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-600 transition-colors">Personal Email Address</label>
                                            <div className="relative">
                                                <input name="email" required type="email" defaultValue={leadData.email} placeholder="hello@company.com" className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[1rem] px-4 text-sm font-bold text-gray-900 transition-all outline-none shadow-sm" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5 group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-600 transition-colors">Mobile Number</label>
                                            <div className="relative border-2 border-gray-100 hover:border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-[1rem] flex items-center bg-gray-50/50 focus-within:bg-white transition-all shadow-sm">
                                                <span className="pl-4 pr-2 text-sm font-bold text-gray-500 border-r border-gray-200 py-1">+91</span>
                                                <input name="mobile" required type="tel" pattern="[0-9]{10}" minLength={10} maxLength={10} defaultValue={leadData.mobile} title="Mobile number must be exactly 10 digits" placeholder="9876543210" className="w-full h-14 bg-transparent px-4 text-sm font-bold text-gray-900 outline-none" />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mt-6">
                                            <Button type="button" variant="outline" className="flex-1 rounded-2xl h-14 text-sm font-bold" onClick={() => {
                                                 setIsLeadFormMode(false);
                                                 setStep(0);
                                                 setAnswers({});
                                                 setInitialChoice(null);
                                                 setShowOverlay(true);
                                                 setIsLeadFormSubmitted(false);
                                                 setBookingError(null);
                                                 setPasswordRequired(false);
                                                 setCustomPassword('');
                                            }}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" className="flex-[2] rounded-2xl h-14 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 group flex items-center justify-center">
                                                Book Slot <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {false && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="flex flex-col items-center justify-center text-center w-full"
                                >
                                    <div className="w-20 h-20 mb-5 rounded-full bg-emerald-50 flex items-center justify-center shadow-inner relative overflow-hidden">
                                        <div className="absolute inset-0 bg-emerald-400/20 blur-xl animate-pulse"/>
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500 relative z-10" strokeWidth={2.5} />
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-gray-900 mb-5 tracking-tight">
                                        Roadmap Configured
                                    </h3>
                                    
                                    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                                        {initialChoice !== 'jobs' && (
                                            <Button onClick={handleBookConsultationClick} className="w-full rounded-xl h-12 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all">
                                                <CalendarDays className="mr-2 w-4 h-4" /> Book Consultation
                                            </Button>
                                        )}
                                        <Button 
                                            variant={initialChoice === 'jobs' ? "primary" : "outline"} 
                                            onClick={handleLogin} 
                                            className={`w-full rounded-xl h-12 text-sm font-bold hover:-translate-y-0.5 transition-all ${
                                                initialChoice === 'jobs' 
                                                ? 'bg-gray-900 hover:bg-black text-white shadow-xl' 
                                                : 'border-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-900 hover:text-gray-900'
                                            }`}
                                        >
                                            <LogIn className="mr-2 w-4 h-4" /> {initialChoice === 'jobs' ? 'Login to View Jobs' : 'Login'}
                                        </Button>
                                    </div>
                                    
                                    {initialChoice !== 'jobs' && (
                                        <button onClick={() => { setStep(0); setAnswers({}); setInitialChoice(null); setShowOverlay(true); }} className="mt-8 text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                            <Cog size={14}/> Retake Diagnostic
                                        </button>
                                    )}
                                </motion.div>
                            )}

                            {step === questions.length && isBookingMode && !isBookingConfirmed && (
                                <motion.div
                                    key="booking-flow"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="flex flex-col justify-center w-full"
                                >
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 tracking-tight">Select Date & Time</h3>
                                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">Book a fast-track 1-on-1 session with our experts to review your customized roadmap.</p>
                                    
                                    {/* Date Selector */}
                                    <div className="space-y-3 mb-6">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                            <span>Available Dates</span>
                                        </label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {slotsData.map((dateObj, i) => {
                                                const dateStr = dateObj._id;
                                                const isSelected = selectedDate === dateStr;
                                                const date = new Date(dateObj.date);
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); setBookingError(null); }}
                                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${isSelected
                                                            ? 'bg-blue-600 text-white shadow-md scale-[1.05] border-blue-600 ring-2 ring-blue-600/20'
                                                            : 'bg-white hover:border-blue-400 border-gray-200 text-gray-500 hover:text-gray-900'
                                                            }`}
                                                    >
                                                        <span className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-80">
                                                            {date.toLocaleDateString(undefined, { weekday: 'short' })}
                                                        </span>
                                                        <span className="text-lg font-black leading-none">
                                                            {date.getDate()}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Time Selector */}
                                    <div className="space-y-3 mb-8">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Times</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedDate && slotsData.find(d => d._id === selectedDate)?.slots.map((slot: any) => {
                                                const isSelected = selectedTime === slot._id;
                                                return (
                                                    <button
                                                        key={slot._id}
                                                        disabled={!slot.isAvailable}
                                                        onClick={() => { setSelectedTime(slot._id); setBookingError(null); }}
                                                        className={`flex items-center justify-center py-2.5 rounded-xl border transition-all text-sm font-bold ${isSelected
                                                            ? 'bg-blue-600 text-white shadow-sm border-blue-600'
                                                            : slot.isAvailable ? 'bg-white hover:border-blue-400 border-gray-200 text-gray-600 hover:text-gray-900' : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-100'
                                                            }`}
                                                    >
                                                        <Clock size={14} className="mr-2" strokeWidth={2.5} />
                                                        {slot.time}
                                                    </button>
                                                );
                                            })}
                                            {!selectedDate && <p className="text-sm text-gray-400 col-span-2">Select a date first</p>}
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {bookingError && (
                                         <motion.div 
                                             initial={{ opacity: 0, y: -8 }}
                                             animate={{ opacity: 1, y: 0 }}
                                             className={`mb-5 p-4 rounded-2xl border text-sm flex items-start gap-3 backdrop-blur-md shadow-lg transition-all duration-300 ${
                                                 passwordRequired 
                                                     ? 'bg-amber-50/75 border-amber-200 text-amber-950 shadow-amber-500/5' 
                                                     : 'bg-rose-50/75 border-rose-200 text-rose-950 shadow-rose-500/5'
                                             }`}
                                         >
                                             <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                 passwordRequired ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                             }`}>
                                                 <Star className="w-4 h-4 fill-current animate-pulse" />
                                             </div>
                                             <div className="flex-1 text-left">
                                                 <span className="font-extrabold text-[11px] uppercase tracking-wider block mb-0.5">
                                                     {passwordRequired ? 'Account Verification' : 'Booking Issue'}
                                                 </span>
                                                 <p className="text-xs font-semibold leading-relaxed">
                                                     {bookingError}
                                                 </p>
                                             </div>
                                         </motion.div>
                                    )}

                                    {/* Custom Password Input for Existing Users */}
                                    {passwordRequired && (
                                         <motion.div 
                                             initial={{ opacity: 0, scale: 0.95 }}
                                             animate={{ opacity: 1, scale: 1 }}
                                             className="mb-5 p-5 rounded-2xl border border-gray-100 bg-gray-50/30 backdrop-blur-sm shadow-sm space-y-3.5 text-left"
                                         >
                                             <div className="flex items-center justify-between">
                                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                                     Confirm Your Password
                                                 </label>
                                             </div>
                                             <div className="relative border-2 border-gray-100 hover:border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-[1.2rem] bg-white transition-all shadow-sm flex items-center">
                                                 <input 
                                                     type="password" 
                                                     value={customPassword} 
                                                     onChange={(e) => setCustomPassword(e.target.value)}
                                                     placeholder="Enter account password" 
                                                     className="w-full h-12 bg-transparent px-4 text-sm font-bold text-gray-900 outline-none" 
                                                 />
                                             </div>
                                             <p className="text-[10px] text-gray-400 font-medium pl-1 leading-relaxed">
                                                 Verification token will be generated upon confirmation to secure your consultation appointment.
                                             </p>
                                         </motion.div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1 rounded-xl h-12 text-sm font-bold" onClick={() => {
                                             if (user) {
                                                  // Logged in: go back to restart the diagnostic quiz
                                                  setIsBookingMode(false);
                                                  setStep(0);
                                                  setAnswers({});
                                                  setInitialChoice(null);
                                                  setShowOverlay(true);
                                                  setIsLeadFormSubmitted(false);
                                             } else {
                                                  // Guest: go back to connect form
                                                  setIsBookingMode(false);
                                                  setIsLeadFormMode(true);
                                                  setIsLeadFormSubmitted(false);
                                             }
                                             setBookingError(null);
                                             setPasswordRequired(false);
                                             setCustomPassword('');
                                         }}>
                                            Back
                                        </Button>
                                        <Button 
                                            className="flex-[2] rounded-xl h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all" 
                                            disabled={!selectedDate || !selectedTime || isConfirmingBooking}
                                            onClick={handleFinalizeBooking}
                                        >
                                            {isConfirmingBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Slot"}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === questions.length && isBookingConfirmed && (
                                <motion.div
                                    key="booking-success"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="flex flex-col items-center justify-center text-center w-full"
                                >
                                    <div className="w-20 h-20 mb-5 rounded-full bg-blue-50 flex items-center justify-center shadow-inner relative overflow-hidden">
                                        <div className="absolute inset-0 bg-blue-400/20 blur-xl animate-pulse"/>
                                        <CalendarDays className="w-10 h-10 text-blue-500 relative z-10" strokeWidth={2} />
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
                                        Slot Confirmed!
                                    </h3>
                                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6 font-medium">
                                        Your consultation session has been reserved. Our mentorship team will contact you shortly via email and phone.
                                    </p>

                                    {/* ── Guest account notice ─────────────────────── */}
                                    {isGuestAccount && (
                                        <div className="w-full max-w-sm mx-auto mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-2">Your Account Was Created</p>
                                            <p className="text-xs text-amber-800 leading-relaxed mb-3">
                                                We automatically created a SQURX account for you using your email. Use the password below to sign in after you log out.
                                            </p>
                                            <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-200 px-3 py-2 mb-3">
                                                <span className="flex-1 text-xs font-mono font-bold text-gray-800 select-all tracking-wider">
                                                    SqurxGuestPass123!
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText('SqurxGuestPass123!').then(() => {
                                                            setCopiedPassword(true);
                                                            setTimeout(() => setCopiedPassword(false), 2000);
                                                        });
                                                    }}
                                                    className="text-[10px] font-bold uppercase tracking-widest text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg px-2 py-1 transition-colors flex-shrink-0"
                                                >
                                                    {copiedPassword ? '✓ Copied' : 'Copy'}
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                                💡 We recommend{' '}
                                                <a
                                                    href="/auth/forgot-password"
                                                    className="font-bold underline underline-offset-2 hover:text-amber-900"
                                                >
                                                    setting a new password
                                                </a>
                                                {' '}immediately so you don't lose access.
                                            </p>
                                        </div>
                                    )}

                                    <Button 
                                        onClick={() => {
                                            setShowOverlay(true);
                                            setStep(0);
                                            setAnswers({});
                                            setIsBookingConfirmed(false);
                                            setIsBookingMode(false);
                                            setIsLeadFormSubmitted(false);
                                            setIsGuestAccount(false);
                                            navigate('/student');
                                        }} 
                                        size="lg" 
                                        className="w-full max-w-xs mx-auto rounded-xl h-12 text-sm bg-gray-900 hover:bg-black text-white font-bold shadow-lg transition-all"
                                    >
                                        Go to Dashboard
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </FadeInOnView>
        </section>

            {/* ── GDPR Modal (identical to Register.tsx) ───────────── */}
            <AnimatePresence>
                {showGdprModal && (
                    <motion.div
                        key="gdpr-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6"
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
                                    <p>When you book a consultation, we collect:</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Your name, email, and phone number</li>
                                        <li>Your responses to our career quiz</li>
                                        <li>Your preferred consultation date and time</li>
                                    </ul>
                                </div>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-2">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">How We Use It</p>
                                    <p className="font-medium text-black/80">To deliver your consultation:</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Connect you with a career counselor</li>
                                        <li>Share your quiz responses with the assigned counselor</li>
                                        <li>Send you confirmation and reminder communications</li>
                                    </ul>
                                    <p className="font-medium text-black/80 mt-2">To improve our service:</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Analyse skill gaps against global employer demands</li>
                                        <li>Personalize counselling and university recommendations</li>
                                        <li>Understand what's working and make our platform better</li>
                                    </ul>
                                </div>

                                <p>We will only use your data for the purposes listed above. If we need to use it for anything else, we will ask for your consent again.</p>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-2">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">Where Your Data Goes</p>
                                    <p><strong className="text-black">Storage:</strong> Securely stored on cloud servers within India (AWS) in compliance with Indian data protection laws.</p>
                                    <p><strong className="text-black">Who sees it:</strong></p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>Assigned career counselors for consultation purposes</li>
                                        <li>Service providers who help us run the platform</li>
                                    </ul>
                                    <p><strong className="text-black">How long:</strong> Up to 3 years, or until you ask us to delete it.</p>
                                </div>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-2">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">Your Rights</p>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                        <li>See what data we have about you</li>
                                        <li>Fix any incorrect information</li>
                                        <li>Delete your data</li>
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
                                    { id: 'consult-age-18', checked: consentAge18, setter: setConsentAge18, label: 'I am at least 18 years old or above' },
                                    { id: 'consult-read-understood', checked: consentReadUnderstood, setter: setConsentReadUnderstood, label: 'I have read and understood this consent' },
                                    { id: 'consult-data-processing', checked: consentDataProcessing, setter: setConsentDataProcessing, label: 'I consent to data processing as described' },
                                    { id: 'consult-resume-sharing', checked: consentResumeSharing, setter: setConsentResumeSharing, label: 'I consent to my details being shared with career counselors' },
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
                                                    <input type="radio" name="consult-marketing" value={val} checked={marketingOptIn === val} onChange={() => setMarketingOptIn(val)} className="sr-only" />
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
                                        if (allConsentsGiven) handleGdprAgreeAndBook();
                                    }}
                                    className="flex-[2] h-12 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-black text-white hover:bg-black/80 shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)] active:scale-[0.98]"
                                >
                                    {allConsentsGiven ? 'I Agree & Confirm Slot ✓' : `Agree to all ${[consentAge18, consentReadUnderstood, consentDataProcessing, consentResumeSharing].filter(Boolean).length}/4 items`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

