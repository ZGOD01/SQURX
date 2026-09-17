import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { consultationApi } from '@/lib/consultationApi';
import { FadeInOnView } from '@/components/motion';
import { useAuthStore, getInMemToken, setInMemToken } from '@/features/auth/store';
import { useNavigate } from 'react-router-dom';
import { setGdprConsent } from '@/lib/utils';
import { 
    Compass, Landmark, Mail, ScrollText, PlaneTakeoff, 
    Cog, Briefcase, Palette, Dna, 
    ShieldCheck, Scale, GraduationCap,
    TrendingUp, Home, Microscope, Handshake, 
    HelpCircle, Calculator, Star, Map, CheckCircle2,
    CalendarDays, LogIn, ArrowRight, ArrowLeft, Clock, Loader2,
    Eye, EyeOff, ChevronLeft, ChevronRight, Calendar,
    Smartphone, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/config';
import { useGetCountriesQuery } from '@/lib/store/authApi';

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


export interface GlobalCareerDiagnosticProps {
    directBooking?: boolean;
    onSuccess?: () => void;
    onBack?: () => void;
}

export function GlobalCareerDiagnostic({ directBooking = false, onSuccess, onBack }: GlobalCareerDiagnosticProps = {}) {
    const navigate = useNavigate();
    const { user, setAuth } = useAuthStore();
    const [step, setStep] = useState(directBooking ? QUESTIONS.length : 0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Consultation Booking States
    type BookingStatus = 'idle' | 'submitting' | 'success' | 'redirecting' | 'error';
    const [bookingStatus, setBookingStatus] = useState<BookingStatus>('idle');
    const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingAuthRef = useRef<{ user: any; token: string } | null>(null);

    const [isBookingMode, setIsBookingMode] = useState(directBooking);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [isConfirmingBooking, setIsConfirmingBooking] = useState(false);
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);
    const [isGuestAccount, setIsGuestAccount] = useState(false); // true when we silently created a new account during booking
    const [copiedPassword, setCopiedPassword] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [customPassword, setCustomPassword] = useState('');

    // OTP Verification Modal States
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpUserId, setOtpUserId] = useState<string>('');
    const [otpValue, setOtpValue] = useState<string>('');
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [otpResendTimer, setOtpResendTimer] = useState(60);
    const [isResendingOtp, setIsResendingOtp] = useState(false);
    const [otpResendSuccess, setOtpResendSuccess] = useState<string | null>(null);
    const [otpLength, setOtpLength] = useState<number>(4);
    const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Timer effect for OTP resend countdown
    useEffect(() => {
        if (showOtpModal) {
            setOtpResendTimer(60);
            if (otpTimerRef.current) clearInterval(otpTimerRef.current);
            otpTimerRef.current = setInterval(() => {
                setOtpResendTimer((prev) => {
                    if (prev <= 1) {
                        if (otpTimerRef.current) clearInterval(otpTimerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (otpTimerRef.current) {
                clearInterval(otpTimerRef.current);
                otpTimerRef.current = null;
            }
        }
        return () => {
            if (otpTimerRef.current) {
                clearInterval(otpTimerRef.current);
                otpTimerRef.current = null;
            }
        };
    }, [showOtpModal]);

    // Calendar Month Grid state (GET /time-slots/calendar?month=YYYY-MM)
    const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
    const [calendarDays, setCalendarDays] = useState<any[]>([]);
    const [isCalendarLoading, setIsCalendarLoading] = useState(false);

    const formatMonthParam = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const loadCalendarMonth = async (targetDate: Date) => {
        setIsCalendarLoading(true);
        const monthParam = formatMonthParam(targetDate);
        try {
            const res = await consultationApi.getCalendarSlots(monthParam);
            let daysList: any[] = [];
            const dataObj = res?.data || res;
            if (Array.isArray(dataObj)) {
                daysList = dataObj;
            } else if (Array.isArray(dataObj?.months)) {
                daysList = dataObj.months;
            } else if (Array.isArray(dataObj?.days)) {
                daysList = dataObj.days;
            } else if (Array.isArray(dataObj?.calendar)) {
                daysList = dataObj.calendar;
            }
            if (daysList.length > 0) {
                setCalendarDays(daysList);
            } else {
                // Fallback to rolling time-slots if calendar month returns empty
                const tsRes = await consultationApi.getTimeSlots();
                if (tsRes?.success && tsRes.data) {
                    setSlotsData(tsRes.data);
                }
            }
        } catch (err) {
            console.warn('[GCD] /time-slots/calendar fetch error, falling back to /time-slots:', err);
            try {
                const tsRes = await consultationApi.getTimeSlots();
                if (tsRes?.success && tsRes.data) {
                    setSlotsData(tsRes.data);
                }
            } catch (fbErr) {
                console.error('[GCD] Fallback /time-slots error:', fbErr);
            }
        } finally {
            setIsCalendarLoading(false);
        }
    };

    const handlePrevMonth = () => {
        const prev = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
        setCurrentMonthDate(prev);
    };

    const handleNextMonth = () => {
        const next = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
        setCurrentMonthDate(next);
    };

    const handleConfirmSuccessRedirect = () => {
        if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
            redirectTimerRef.current = null;
        }
        if (pendingAuthRef.current) {
            const { user: pUser, token: pToken } = pendingAuthRef.current;
            setAuth(pUser, pToken);
            const userId = pUser._id || pUser.id;
            if (userId) {
                setGdprConsent(userId, true);
            }
            pendingAuthRef.current = null;
        }
        setBookingStatus('redirecting');
        setSelectedDate('');
        setSelectedTime('');
        setAnswers({});
        setIsBookingMode(false);
        setIsLeadFormSubmitted(false);
        setIsGuestAccount(false);
        setShowSuccessPopup(false);

        if (directBooking && onSuccess) {
            onSuccess();
        } else {
            navigate('/student');
        }
    };

    // Clear any active redirect timer when component unmounts to prevent memory leaks or unwanted navigation
    useEffect(() => {
        return () => {
            if (redirectTimerRef.current) {
                clearTimeout(redirectTimerRef.current);
            }
        };
    }, []);

    // Lead-form GDPR consent: required before date/slot booking step.
    // This is SEPARATE from the full GDPR modal shown at the point of booking.
    // The actual booking payload always sends gdprConsent: true after the GDPR
    // modal is completed — this checkbox just gates the lead-form submission.
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [termsError, setTermsError] = useState(false);

    // Success popup modal state
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    // Lead Generation Form State
    const [isLeadFormMode, setIsLeadFormMode] = useState(false);
    const [isLeadFormSubmitted, setIsLeadFormSubmitted] = useState(directBooking);

    const [showPassword, setShowPassword] = useState(false);

    // Country selection state
    const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
    const [selectedCountryId, setSelectedCountryId] = useState("6a265f8178dc3c43b364e4dd");
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");
    const { data: countriesRes, isLoading: isCountriesLoading } = useGetCountriesQuery(
        countrySearch.trim() ? { search: countrySearch } : undefined
    );

    const countriesList = Array.isArray(countriesRes)
        ? countriesRes
        : (countriesRes?.data && Array.isArray(countriesRes.data))
            ? countriesRes.data
            : [];

    const selectedCountry = countriesList.find((c: any) => c._id === selectedCountryId);

    const [leadData, setLeadData] = useState<{ name: string; email: string; mobile: string; countryCode: string; country: string }>({ 
        name: '', 
        email: '', 
        mobile: '',
        countryCode: '+1',
        country: '6a265f8178dc3c43b364e4dd'
    });

    const [slotsData, setSlotsData] = useState<any[]>([]);
    const [showOverlay, setShowOverlay] = useState(!directBooking);
    const [initialChoice, setInitialChoice] = useState<'jobs' | 'consultation' | null>(null);

    const [questions, setQuestions] = useState<any[]>(QUESTIONS);

    // Counselling booking consent checkbox & confirmed booking state
    const [counsellingConsent, setCounsellingConsent] = useState(false);
    const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

    // GDPR Consent Modal States
    const [showGdprModal, setShowGdprModal] = useState(false);
    const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
    const [consentAge18, setConsentAge18] = useState(false);
    const [consentReadUnderstood, setConsentReadUnderstood] = useState(false);
    const [consentDataProcessing, setConsentDataProcessing] = useState(false);
    const [consentResumeSharing, setConsentResumeSharing] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState<'yes' | 'no' | null>(null);
    const allConsentsGiven = consentAge18 && consentReadUnderstood && consentDataProcessing && consentResumeSharing;

    // Lock body scroll and hide navbar when GDPR, Privacy Policy, or OTP modal is open
    useEffect(() => {
        const navbar = document.getElementById('main-navbar');
        if (showGdprModal || showPrivacyPolicyModal || showOtpModal) {
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
    }, [showGdprModal, showPrivacyPolicyModal, showOtpModal]);

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
        }).catch(() => {});

        loadCalendarMonth(currentMonthDate);
    }, []);

    useEffect(() => {
        loadCalendarMonth(currentMonthDate);
    }, [currentMonthDate]);

    useEffect(() => {
        if (directBooking && user) {
            const cCode = user.countryCode || (typeof user.country === 'object' ? user.country?.phoneCode : null) || '+1';
            const cId = (typeof user.country === 'object' ? user.country?._id : user.country) || '6a265f8178dc3c43b364e4dd';
            setSelectedCountryCode(cCode);
            setSelectedCountryId(cId);
            setLeadData({
                name: user.name || user.fullName || 'Student',
                email: user.email || '',
                mobile: user.mobile || '9999999999',
                countryCode: cCode,
                country: cId
            });
        }
    }, [directBooking, user]);

    const handleSelectOption = (index: number, optionId: string) => {
        const nextAnswers = { ...answers, [index]: optionId };
        setAnswers(nextAnswers);

        if (index < questions.length - 1) {
            setTimeout(() => setStep(index + 1), 250);
        } else {
            // Answers are held in React state — no sessionStorage write needed
            setIsAnalyzing(true);
            setTimeout(() => {
                setIsAnalyzing(false);
                setStep(questions.length);
                if (user) {
                    const cCode = user.countryCode || (typeof user.country === 'object' ? user.country?.phoneCode : null) || '+1';
                    const cId = (typeof user.country === 'object' ? user.country?._id : user.country) || '6a265f8178dc3c43b364e4dd';
                    setSelectedCountryCode(cCode);
                    setSelectedCountryId(cId);
                    setLeadData({
                        name: user.name || user.fullName || 'Student',
                        email: user.email || '',
                        mobile: user.mobile || '9999999999',
                        countryCode: cCode,
                        country: cId
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

    // Execute consultation booking once authentication (existing or post-OTP) is confirmed
    const executeConsultationBooking = async (tokenToUse: string, currentUser?: any) => {
        setIsConfirmingBooking(true);
        setBookingStatus('submitting');
        setBookingError(null);

        // Sync gdprConsent to true on the backend if we have a token
        if (tokenToUse) {
            try {
                await fetch(`${API_BASE_URL}/user/me`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${tokenToUse}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ gdprConsent: true }),
                });
            } catch (e) {
                console.warn("Failed to sync gdprConsent to user profile:", e);
            }
        }

        // Build quiz answers from component state
        const quizAnswersList = Object.keys(answers).map(key => {
            const stepIndex = parseInt(key, 10);
            const rawChoice = answers[stepIndex];
            const isValidHex = /^[0-9a-fA-F]{24}$/.test(rawChoice);
            return {
                quizId: questions[stepIndex]?.id || '65f000000000000000000000',
                questionId: questions[stepIndex]?.id || '65f000000000000000000000',
                choiceId: isValidHex ? rawChoice : '65f000000000000000000000',
                optionId: isValidHex ? rawChoice : '65f000000000000000000000'
            };
        });

        if (quizAnswersList.length === 0) {
            quizAnswersList.push({
                quizId: '65f000000000000000000000',
                questionId: '65f000000000000000000000',
                choiceId: '65f000000000000000000000',
                optionId: '65f000000000000000000000'
            });
        }

        let sanitizedMobile = leadData.mobile ? leadData.mobile.replace(/\D/g, '') : '';
        if (sanitizedMobile.length !== 10) {
            sanitizedMobile = '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
        }

        const payload = {
            fullName: leadData.name || currentUser?.name || currentUser?.fullName || 'Student',
            email: leadData.email || currentUser?.email || 'guest@example.com',
            mobile: sanitizedMobile,
            quizAnswers: quizAnswersList,
            appointment: { dateId: selectedDate, timeId: selectedTime },
            gdprConsent: true,
            gdpr: true,
            consent: true
        };

        const result = await consultationApi.bookConsultation(payload);
        
        if (!result || (result.success !== undefined && result.success === false)) {
            throw new Error("Booking was not confirmed by the server.");
        }

        const confirmedBookingData = result?.data?.consultation || result?.data?.booking || result?.data || result;
        setConfirmedBooking(confirmedBookingData);

        const finalToken = result?.data?.token || tokenToUse;
        let pendingUser: any = currentUser || null;

        if (finalToken) {
            try {
                const meRes = await fetch(`${API_BASE_URL}/user/me`, {
                    headers: { 'Authorization': `Bearer ${finalToken}` }
                });
                if (meRes.ok) {
                    const meJson = await meRes.json();
                    if (meJson.success && meJson.data) {
                        pendingUser = meJson.data;
                    }
                }
            } catch (meErr) {
                console.warn('[GCD] /user/me fetch error:', meErr);
            }
        }

        if (pendingUser && finalToken) {
            pendingAuthRef.current = { user: pendingUser, token: finalToken };
        }

        // Send notification email
        const selectedDateObj = calendarDays.find(d => (d.dateId || d._id) === selectedDate || d.date === selectedDate) || slotsData.find(d => (d._id || d.date) === selectedDate);
        const selectedSlotObj = selectedDateObj?.slots?.find((s: any) => s._id === selectedTime);
        consultationApi.sendBookingNotification({
            studentName: leadData.name || pendingUser?.name || pendingUser?.fullName || 'Student',
            studentEmail: leadData.email || pendingUser?.email || '',
            studentPhone: (leadData.countryCode || '') + ' ' + (leadData.mobile || ''),
            bookingDate: selectedDateObj?.date
                ? new Date(selectedDateObj.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                : selectedDate,
            bookingTime: selectedSlotObj?.time || selectedTime,
            bookingSource: directBooking ? 'Dashboard Consultation' : 'Book Counselling',
        }).catch(() => {});

        // Transition to success state and display confirmation overlay & in-line confirmation card
        setBookingStatus('success');
        setIsConfirmingBooking(false);
        setIsBookingConfirmed(true);
        setShowSuccessPopup(true);

        // Clear any old timer - do NOT auto-redirect, the user will click "Go to Dashboard" to proceed
        if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
            redirectTimerRef.current = null;
        }
    };

    // Called after user agrees to all GDPR consents
    const handleGdprAgreeAndBook = async () => {
        setShowGdprModal(false);
        setBookingError(null);

        // 1. Check if user is already authenticated
        const activeToken = getInMemToken() || '';
        if (activeToken) {
            try {
                await executeConsultationBooking(activeToken, user);
            } catch (error: any) {
                console.error('Booking failed:', error);
                setBookingError(error.message || 'Failed to book consultation');
                setBookingStatus('error');
                setIsConfirmingBooking(false);
            }
            return;
        }

        // 2. Check if returning user custom password is required
        if (passwordRequired) {
            if (!customPassword) {
                setBookingError("Password is required to book under this account.");
                return;
            }
            setIsConfirmingBooking(true);
            setBookingStatus('submitting');
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
                    const tok = loginData.data.token;
                    const usr = loginData.data.user;
                    setInMemToken(tok);
                    pendingAuthRef.current = { user: usr, token: tok };
                    setPasswordRequired(false);
                    await executeConsultationBooking(tok, usr);
                } else if (loginRes.status === 401) {
                    throw new Error("Incorrect password. Please verify your password and try again.");
                } else if (loginRes.status === 403) {
                    const uId = loginData?.data?.userId;
                    if (uId) {
                        setOtpUserId(uId);
                        setOtpValue('');
                        setOtpError(null);
                        setOtpResendSuccess(null);
                        setShowOtpModal(true);
                        setIsConfirmingBooking(false);
                        setBookingStatus('idle');
                        return;
                    }
                    throw new Error("This account is registered but unverified. Please Sign In normally to verify and book.");
                } else {
                    throw new Error(loginData.message || "Failed to authenticate with entered password.");
                }
            } catch (e: any) {
                setBookingError(e.message || "Failed to authenticate. Please try again.");
                setBookingStatus('error');
                setIsConfirmingBooking(false);
            }
            return;
        }

        // 3. Guest user: Initiate Signup -> Backend sends OTP -> Show OTP modal!
        setIsConfirmingBooking(true);
        setBookingStatus('submitting');

        let sanitizedMobile = leadData.mobile ? leadData.mobile.replace(/\D/g, '') : '';
        if (sanitizedMobile.length !== 10) {
            sanitizedMobile = '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
        }

        const guestPassword = 'SqurxGuestPass123!';
        try {
            const signupRes = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: leadData.name || 'Guest User',
                    email: leadData.email || 'guest@example.com',
                    mobile: sanitizedMobile,
                    countryCode: leadData.countryCode,
                    country: leadData.country,
                    password: guestPassword,
                    role: 'student',
                    gdprConsent: true,
                    gdpr: true,
                    consent: true
                })
            });

            const signupData = await signupRes.json().catch(() => ({}));

            if (signupRes.status === 201) {
                const userId = signupData?.data?.userId || signupData?.userId || signupData?.data?.user?._id || signupData?.data?._id;
                if (userId) {
                    setOtpUserId(userId);
                    setOtpValue('');
                    setOtpError(null);
                    setOtpResendSuccess(null);
                    setIsGuestAccount(true);
                    setIsConfirmingBooking(false);
                    setBookingStatus('idle');
                    setShowOtpModal(true);
                    return;
                }
                throw new Error("Could not retrieve user ID for verification. Please try again.");
            } else if (signupRes.status === 409) {
                // User already exists: Try silent login with guest pass or prompt for password
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
                    const tok = loginData.data.token;
                    const usr = loginData.data.user;
                    setInMemToken(tok);
                    pendingAuthRef.current = { user: usr, token: tok };
                    await executeConsultationBooking(tok, usr);
                    return;
                } else if (loginRes.status === 401) {
                    setPasswordRequired(true);
                    throw new Error("This email or mobile number is already associated with an account. Please enter your password below to confirm your booking, or use different details.");
                } else if (loginRes.status === 403) {
                    const uId = loginData?.data?.userId;
                    if (uId) {
                        setOtpUserId(uId);
                        setOtpValue('');
                        setOtpError(null);
                        setOtpResendSuccess(null);
                        setShowOtpModal(true);
                        setIsConfirmingBooking(false);
                        setBookingStatus('idle');
                        return;
                    }
                    throw new Error("This account is registered but unverified. Please Sign In to verify and book, or use a new email/mobile.");
                } else {
                    throw new Error(loginData.message || "Authentication failed. Please Sign In or use another email/mobile.");
                }
            } else {
                throw new Error(signupData.message || "Registration failed. Please try again.");
            }
        } catch (error: any) {
            console.error('Booking authentication step failed:', error);
            const errorMessage = error.message || 'Failed to book consultation';
            setBookingError(errorMessage);
            setBookingStatus('error');
            setIsConfirmingBooking(false);
        }
    };

    // Called when user submits OTP in the OTP Modal
    const handleOtpSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!otpUserId) {
            setOtpError("Session expired. Please try booking again.");
            return;
        }
        const cleanOtp = otpValue.replace(/\s/g, '');
        if (cleanOtp.length < 4) {
            setOtpError(`Please enter a valid ${otpLength}-digit verification code.`);
            return;
        }

        setIsVerifyingOtp(true);
        setOtpError(null);
        setOtpResendSuccess(null);

        try {
            const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: otpUserId,
                    otp: cleanOtp
                })
            });

            const verifyData = await verifyRes.json().catch(() => ({}));

            if (verifyRes.status === 200 && verifyData.success && verifyData.data?.token) {
                const activeToken = verifyData.data.token;
                const loggedInUser = verifyData.data.user;

                // Save token so API calls like bookConsultation are authorized
                setInMemToken(activeToken);

                // Hold credentials in pendingAuthRef so Landing.tsx does NOT unmount this component
                // before the confirmation screen has been displayed for 3 seconds!
                pendingAuthRef.current = { user: loggedInUser, token: activeToken };

                const uId = loggedInUser?._id || loggedInUser?.id || otpUserId;
                if (uId) {
                    setGdprConsent(uId, true);
                }

                // Close OTP modal so confirmation screen is revealed
                setShowOtpModal(false);

                // Seamlessly execute consultation booking with newly verified account!
                // This activates isBookingConfirmed(true) and opens the Success confirmation screen
                await executeConsultationBooking(activeToken, loggedInUser);
            } else {
                setOtpError(verifyData.message || "Invalid or expired OTP code. Please check and try again.");
            }
        } catch (err: any) {
            console.error("OTP verification error:", err);
            setOtpError(err.message || "Failed to complete booking. Please try again.");
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    // Called when user clicks "Resend OTP"
    const handleResendOtp = async () => {
        if (otpResendTimer > 0 || !otpUserId || isResendingOtp) return;
        setIsResendingOtp(true);
        setOtpError(null);
        setOtpResendSuccess(null);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: otpUserId })
            });
            const resData = await res.json().catch(() => ({}));
            if (res.ok && resData.success !== false) {
                setOtpResendSuccess(resData.message || "A fresh OTP code has been sent to your mobile & email.");
                setOtpResendTimer(60);
            } else {
                setOtpError(resData.message || "Failed to resend OTP. Please wait a moment and try again.");
            }
        } catch (err: any) {
            setOtpError("Network error while resending OTP. Please try again.");
        } finally {
            setIsResendingOtp(false);
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

    const handleBackClick = () => {
        if (isAnalyzing) return;
        if (directBooking && onBack) {
            onBack();
            return;
        }
        if (step === 0) {
            setShowOverlay(true);
            setAnswers({});
        } else if (step === questions.length) {
            setStep(questions.length - 1);
            setIsLeadFormMode(false);
            setIsLeadFormSubmitted(false);
            setIsBookingMode(false);
            setIsBookingConfirmed(false);
        } else {
            setStep(step - 1);
        }
    };

    const handleHomeScreen = () => {
        setSelectedDate('');
        setSelectedTime('');
        if (directBooking) {
            if (onBack) {
                onBack();
            }
            navigate('/student');
        } else {
            setShowOverlay(true);
            setStep(0);
            setAnswers({});
            setIsLeadFormMode(false);
            setIsLeadFormSubmitted(false);
            setIsBookingMode(false);
            setIsBookingConfirmed(false);
            navigate('/');
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
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-[16px] font-black uppercase tracking-[0.2em] mb-6 shadow-xl shadow-blue-600/20"
                                    >
                                        <Compass size={16} strokeWidth={2} /> Select Path
                                    </motion.div>
                                    {/* <h3 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter leading-none">
                                        Select Path.
                                    </h3> */}
                                    <p className="text-lg text-gray-500 font-medium max-w-lg mx-auto">
                                        Whether you are seeking expert advice and consulting for your study abroad journey or already studying abroad and want to find jobs, we have right solutions for you.
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
                                            Schedule a quick and free counselling session with our consultants to find the best study abroad solutions and information.
                                        </p>
                                        
                                        <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                                            Start Journey <ArrowRight size={16} strokeWidth={3} />
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
                                            Already studying abroad sign in and apply to most relevant and high impact job opportunities.
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
                                <Compass size={12} /> Inputs Before Free Counseling
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
                                            : "Your inputs have been compiled for your free counseling booking."}
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
                                    <div className="mb-6 flex items-center justify-start">
                                        <button
                                            onClick={handleBackClick}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200/70 text-gray-600 hover:text-gray-900 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer hover:shadow-md"
                                        >
                                            <ArrowLeft size={13} strokeWidth={2.5} />
                                            <span>{step === 0 ? "Back to Selection" : "Go Back"}</span>
                                        </button>
                                    </div>

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
                                    <div className="mb-6 flex items-center justify-start">
                                        <button
                                            type="button"
                                            onClick={handleBackClick}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200/70 text-gray-600 hover:text-gray-900 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer hover:shadow-md"
                                        >
                                            <ArrowLeft size={13} strokeWidth={2.5} />
                                            <span>Go Back</span>
                                        </button>
                                    </div>
                                    <div className="absolute -top-10 left-12 w-40 h-40 bg-blue-400/20 rounded-full blur-[50px] pointer-events-none"></div>
                                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 tracking-tight">Connect with an Advisor</h3>
                                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                                        Enter your details below to schedule your 1-on-1 career consultation slot.
                                    </p>

                                    <form onSubmit={(e) => { 
                                        e.preventDefault(); 

                                        // T&C validation
                                        if (!termsAccepted) {
                                            setTermsError(true);
                                            return;
                                        }
                                        setTermsError(false);
                                        
                                        const formData = new FormData(e.currentTarget);

                                        // Store lead info in component state (no sessionStorage)
                                        setLeadData({
                                            name: String(formData.get('name') || ''),
                                            email: String(formData.get('email') || ''),
                                            mobile: String(formData.get('mobile') || ''),
                                            countryCode: selectedCountryCode,
                                            country: selectedCountryId
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
                                             <div className="flex gap-3 relative">
                                                 {/* Country Dropdown Trigger */}
                                                 <div className="relative w-[130px] flex-shrink-0">
                                                     <button
                                                         type="button"
                                                         onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                                         className="w-full bg-gray-50/50 hover:bg-white border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[1rem] px-3.5 h-14 transition-all duration-300 font-bold text-left flex justify-between items-center text-sm text-gray-900 shadow-sm"
                                                     >
                                                         <div className="flex items-center gap-2 min-w-0">
                                                             {selectedCountry?.code && (
                                                                 <img
                                                                     src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                                                                     alt={selectedCountry.name}
                                                                     className="w-5 h-3.5 object-cover rounded flex-shrink-0 shadow-sm"
                                                                 />
                                                             )}
                                                             <span className="truncate">
                                                                 {selectedCountryCode || "Code"}
                                                             </span>
                                                         </div>
                                                         <span className="text-[9px] text-gray-400 flex-shrink-0 pl-1">▼</span>
                                                     </button>

                                                     {showCountryDropdown && (
                                                         <>
                                                             {/* Click-outside backdrop overlay */}
                                                             <div 
                                                                 className="fixed inset-0 z-30" 
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     setShowCountryDropdown(false);
                                                                     setCountrySearch("");
                                                                 }} 
                                                             />
                                                             {/* Dropdown Menu */}
                                                             <div className="absolute left-0 bottom-full mb-2 w-[280px] bg-white border border-gray-100 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-40 max-h-60 overflow-y-auto flex flex-col p-2">
                                                                 {/* Search bar inside dropdown */}
                                                                 <div className="px-1 py-1 sticky top-0 bg-white z-10">
                                                                     <input
                                                                         type="text"
                                                                         placeholder="Search country..."
                                                                         value={countrySearch}
                                                                         onChange={(e) => setCountrySearch(e.target.value)}
                                                                         onClick={(e) => e.stopPropagation()}
                                                                         className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold"
                                                                     />
                                                                 </div>
                                                                 <div className="mt-1">
                                                                     {isCountriesLoading && (
                                                                         <div className="text-xs text-gray-400 p-3 text-center">Loading countries...</div>
                                                                     )}
                                                                     {!isCountriesLoading && countriesList.length === 0 && (
                                                                         <div className="text-xs text-gray-400 p-3 text-center">No countries found</div>
                                                                     )}
                                                                     {countriesList.map((c: any) => (
                                                                         <button
                                                                             key={c._id}
                                                                             type="button"
                                                                             onClick={() => {
                                                                                 setSelectedCountryCode(c.phoneCode);
                                                                                 setSelectedCountryId(c._id);
                                                                                 setShowCountryDropdown(false);
                                                                                 setCountrySearch("");
                                                                             }}
                                                                             className={`w-full text-left text-xs px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-between gap-2 ${
                                                                                 selectedCountryId === c._id ? "bg-blue-50/50 text-blue-600" : "text-gray-700"
                                                                             }`}
                                                                         >
                                                                             <div className="flex items-center gap-2 min-w-0">
                                                                                 {c.code && (
                                                                                     <img
                                                                                         src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                                                                                         alt={c.name}
                                                                                         className="w-5 h-3.5 object-cover rounded shadow-sm flex-shrink-0"
                                                                                     />
                                                                                 )}
                                                                                 <span className="font-bold truncate">{c.name}</span>
                                                                             </div>
                                                                             <span className="text-gray-400 text-xs font-bold flex-shrink-0">{c.phoneCode}</span>
                                                                         </button>
                                                                     ))}
                                                                 </div>
                                                             </div>
                                                         </>
                                                     )}
                                                 </div>

                                                 {/* Mobile input */}
                                                 <div className="flex-1">
                                                     <input 
                                                         name="mobile" 
                                                         required 
                                                         type="tel" 
                                                         pattern="[0-9]{10}" 
                                                         minLength={10} 
                                                         maxLength={10} 
                                                         defaultValue={leadData.mobile} 
                                                         title="Mobile number must be exactly 10 digits" 
                                                         placeholder="9876543210" 
                                                         className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[1rem] px-4 text-sm font-bold text-gray-900 transition-all outline-none shadow-sm"
                                                         onInput={(e) => {
                                                             const el = e.currentTarget as HTMLInputElement;
                                                             el.value = el.value.replace(/\D/g, '').slice(0, 10);
                                                         }}
                                                     />
                                                 </div>
                                             </div>
                                         </div>

                                        {/* GDPR consent — required to proceed to date/slot booking */}
                                        <div className="mt-2">
                                            <label
                                                htmlFor="lead-gdpr-consent"
                                                className="flex items-start gap-3 cursor-pointer group"
                                                onClick={() => {
                                                    const next = !termsAccepted;
                                                    setTermsAccepted(next);
                                                    if (next) setTermsError(false);
                                                }}
                                            >
                                                <div
                                                    role="checkbox"
                                                    aria-checked={termsAccepted}
                                                    tabIndex={0}
                                                    id="lead-gdpr-consent"
                                                    onKeyDown={(e) => {
                                                        if (e.key === ' ' || e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const next = !termsAccepted;
                                                            setTermsAccepted(next);
                                                            if (next) setTermsError(false);
                                                        }
                                                    }}
                                                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
                                                        termsAccepted
                                                            ? 'bg-blue-600 border-blue-600'
                                                            : termsError
                                                            ? 'border-red-500 bg-red-50'
                                                            : 'border-gray-300 hover:border-blue-400'
                                                    }`}
                                                >
                                                    {termsAccepted && (
                                                        <svg className="w-3 h-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span
                                                    className={`text-[13px] font-semibold leading-relaxed transition-colors ${
                                                        termsAccepted ? 'text-gray-900' : 'text-gray-600'
                                                    }`}
                                                >
                                                    I consent to SQUREX processing my personal data to schedule this consultation, in accordance with their{' '}
                                                    <span 
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowPrivacyPolicyModal(true);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.stopPropagation();
                                                                setShowPrivacyPolicyModal(true);
                                                            }
                                                        }}
                                                        className="underline underline-offset-2 decoration-blue-400 text-blue-600 hover:text-blue-700 font-bold cursor-pointer transition-colors"
                                                    >
                                                        Privacy &amp; Consent Policy
                                                    </span>.
                                                </span>
                                            </label>
                                            {termsError && (
                                                <p className="mt-1.5 ml-8 text-xs font-semibold text-red-500" role="alert">
                                                    Please provide your consent to proceed with booking.
                                                </p>
                                            )}
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
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1 rounded-2xl h-14 text-sm font-bold"
                                                onClick={handleHomeScreen}
                                            >
                                                Home Screen
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
                                    <div className="mb-6 flex items-center justify-start">
                                        <button
                                            type="button"
                                            onClick={handleBackClick}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200/70 text-gray-600 hover:text-gray-900 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer hover:shadow-md"
                                        >
                                            <ArrowLeft size={13} strokeWidth={2.5} />
                                            <span>Go Back</span>
                                        </button>
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 tracking-tight">Select Date & Time</h3>
                                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">Book a fast-track 1-on-1 session with our experts to review your customized roadmap.</p>
                                                        {/* Date Selector — Full Month Grid with Reason Codes */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <span>Select Date</span>
                                                {isCalendarLoading && <Loader2 size={12} className="animate-spin text-blue-500" />}
                                            </label>
                                            <span className="text-[9px] font-semibold text-gray-400">Available Slots</span>
                                        </div>

                                        {/* Month Header Navigation */}
                                        <div className="flex items-center justify-between bg-gray-50/90 px-3 py-2 rounded-2xl border border-gray-100 shadow-sm">
                                            <button
                                                type="button"
                                                onClick={handlePrevMonth}
                                                className="p-1.5 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 text-gray-600 transition-all cursor-pointer"
                                                aria-label="Previous Month"
                                            >
                                                <ChevronLeft size={16} strokeWidth={2.5} />
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={15} className="text-blue-600" />
                                                <span className="font-extrabold text-sm text-gray-900 tracking-tight">
                                                    {currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleNextMonth}
                                                className="p-1.5 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 text-gray-600 transition-all cursor-pointer"
                                                aria-label="Next Month"
                                            >
                                                <ChevronRight size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>

                                        {/* Day of Week Column Headers (Mon to Sun) */}
                                        <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <span key={day} className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                    {day}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Month Day Grid */}
                                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                                            {(() => {
                                                const year = currentMonthDate.getFullYear();
                                                const month = currentMonthDate.getMonth();
                                                const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
                                                const startOffset = (firstDayIndex + 6) % 7; // Mon=0, Sun=6

                                                // If we have calendarDays, generate cells for the full month
                                                if (calendarDays.length > 0) {
                                                    const cells = [];
                                                    // Padding before the first day
                                                    for (let p = 0; p < startOffset; p++) {
                                                        cells.push(
                                                            <div key={`pad-${p}`} className="h-12 rounded-xl bg-transparent" />
                                                        );
                                                    }

                                                    for (let d = 1; d <= daysInMonth; d++) {
                                                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                                        const dayData = calendarDays.find((item: any) => item.date === dateStr || (item.date && item.date.startsWith(dateStr)));

                                                        const isAvail = dayData ? (dayData.isAvailable ?? (Array.isArray(dayData.slots) && dayData.slots.some((s: any) => s.isAvailable))) : false;
                                                        const reason = dayData?.reason;
                                                        const dateId = dayData?.dateId || dayData?._id || dateStr;
                                                        const isSelected = selectedDate === dateId || selectedDate === dateStr;

                                                        if (isAvail) {
                                                            cells.push(
                                                                <button
                                                                    key={`day-${d}`}
                                                                    type="button"
                                                                    onClick={() => { setSelectedDate(dateId); setSelectedTime(''); setBookingError(null); }}
                                                                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all cursor-pointer h-12 ${isSelected
                                                                        ? 'bg-blue-600 text-white shadow-md scale-[1.05] border-blue-600 ring-2 ring-blue-600/20'
                                                                        : 'bg-white hover:border-blue-400 border-gray-200 text-gray-800 hover:text-gray-900 shadow-sm'
                                                                    }`}
                                                                >
                                                                    <span className="text-sm font-black leading-none">{d}</span>
                                                                    <span className={`text-[7px] font-extrabold uppercase mt-0.5 tracking-tight px-1 rounded ${isSelected ? 'text-blue-100' : 'text-emerald-600 bg-emerald-50'}`}>
                                                                        Open
                                                                    </span>
                                                                </button>
                                                            );
                                                        } else {
                                                            let reasonBadge = null;
                                                            if (reason === 'blackout') {
                                                                reasonBadge = <span className="text-[7px] font-extrabold uppercase mt-0.5 tracking-tight text-rose-500 bg-rose-50 px-1 rounded">Closed</span>;
                                                            } else if (reason === 'fully_booked' || reason === 'no_slots') {
                                                                reasonBadge = <span className="text-[7px] font-extrabold uppercase mt-0.5 tracking-tight text-amber-600 bg-amber-50 px-1 rounded">Full</span>;
                                                            } else if (reason === 'outside_window') {
                                                                reasonBadge = <span className="text-[7px] font-extrabold uppercase mt-0.5 tracking-tight text-gray-400">Off</span>;
                                                            }

                                                            cells.push(
                                                                <div
                                                                    key={`day-${d}`}
                                                                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border border-gray-100 bg-gray-50/50 text-gray-300 cursor-not-allowed select-none h-12 ${reason === 'past' ? 'opacity-30' : 'opacity-60'}`}
                                                                    title={reason ? `Unavailable: ${reason}` : 'Unavailable'}
                                                                >
                                                                    <span className="text-xs font-bold leading-none">{d}</span>
                                                                    {reasonBadge}
                                                                </div>
                                                            );
                                                        }
                                                    }
                                                    return cells;
                                                }

                                                // Fallback to slotsData if calendarDays is not yet populated
                                                if (slotsData.length === 0) {
                                                    return (
                                                        <p className="text-xs text-gray-400 col-span-7 py-3 text-center">
                                                            Loading live calendar data…
                                                        </p>
                                                    );
                                                }

                                                return slotsData.map((dateObj: any, i: number) => {
                                                    const dateStr = dateObj._id || dateObj.date;
                                                    const isSelected = selectedDate === dateStr;
                                                    const date = new Date(dateObj.date);
                                                    const isSunday = date.getDay() === 0 || dateObj.isSunday === true;

                                                    if (isSunday) {
                                                        return (
                                                            <div
                                                                key={`sun_${i}`}
                                                                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-gray-100 bg-gray-50/70 text-gray-300 cursor-not-allowed select-none opacity-50 h-12"
                                                                title="Sunday - Closed"
                                                            >
                                                                <span className="text-[10px] uppercase font-bold tracking-wider mb-0.5 text-gray-400">Sun</span>
                                                                <span className="text-sm font-bold leading-none text-gray-400">{date.getDate()}</span>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); setBookingError(null); }}
                                                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer h-12 ${isSelected
                                                                ? 'bg-blue-600 text-white shadow-md scale-[1.05] border-blue-600 ring-2 ring-blue-600/20'
                                                                : 'bg-white hover:border-blue-400 border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm'
                                                            }`}
                                                        >
                                                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-80">
                                                                {date.toLocaleDateString(undefined, { weekday: 'short' })}
                                                            </span>
                                                            <span className="text-sm font-black leading-none">{date.getDate()}</span>
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    {/* Time Selector */}
                                    <div className="space-y-3 mb-8">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Times</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedDate && (() => {
                                                const dayObj = calendarDays.find(d => (d.dateId || d._id) === selectedDate || d.date === selectedDate) || slotsData.find(d => (d._id || d.date) === selectedDate);
                                                const slots = dayObj?.slots || [];
                                                if (slots.length === 0) {
                                                    return <p className="text-sm text-gray-400 col-span-2">No available time slots for this date</p>;
                                                }
                                                return slots.map((slot: any) => {
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
                                                });
                                            })()}
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
                                             <div className="relative border-2 border-gray-100 hover:border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-[1.2rem] bg-white transition-all shadow-sm flex items-center pr-3">
                                                 <input 
                                                     type={showPassword ? "text" : "password"} 
                                                     value={customPassword} 
                                                     onChange={(e) => setCustomPassword(e.target.value)}
                                                     placeholder="Enter account password" 
                                                     className="w-full h-12 bg-transparent pl-4 pr-2 text-sm font-bold text-gray-900 outline-none" 
                                                 />
                                                 <button
                                                     type="button"
                                                     onClick={() => setShowPassword(!showPassword)}
                                                     className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors p-1"
                                                     aria-label={showPassword ? "Hide password" : "Show password"}
                                                 >
                                                     {showPassword ? (
                                                         <EyeOff className="w-5 h-5" />
                                                     ) : (
                                                         <Eye className="w-5 h-5" />
                                                     )}
                                                 </button>
                                             </div>
                                             <p className="text-[10px] text-gray-400 font-medium pl-1 leading-relaxed">
                                                 Verification token will be generated upon confirmation to secure your consultation appointment.
                                             </p>
                                         </motion.div>
                                    )}

                                     {/* Consent Checkbox */}
                                     <div className="flex items-start gap-3 mt-4 mb-6 text-left bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                                         <input 
                                             id="counselling-consent" 
                                             type="checkbox" 
                                             checked={counsellingConsent} 
                                             onChange={(e) => setCounsellingConsent(e.target.checked)} 
                                             className="mt-0.5 h-4.5 w-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                                         />
                                         <label htmlFor="counselling-consent" className="text-xs text-gray-500 font-medium select-none cursor-pointer leading-normal">
                                             I consent to share my academic details and receive expert counselling updates via phone, email, and WhatsApp from Squrex.
                                         </label>
                                     </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1 rounded-xl h-12 text-sm font-bold" onClick={() => {
                                             setSelectedDate('');
                                             setSelectedTime('');
                                             if (directBooking && onBack) {
                                                 onBack();
                                                 return;
                                             }
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
                                            type="button"
                                            variant="outline"
                                            className="flex-1 rounded-xl h-12 text-sm font-bold"
                                            onClick={handleHomeScreen}
                                        >
                                            Home Screen
                                        </Button>
                                        <Button 
                                            className="flex-[2] rounded-xl h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all" 
                                            disabled={!selectedDate || !selectedTime || isConfirmingBooking || !counsellingConsent || bookingStatus === 'submitting' || bookingStatus === 'success' || bookingStatus === 'redirecting'}
                                            onClick={handleFinalizeBooking}
                                        >
                                            {bookingStatus === 'submitting' || isConfirmingBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : "Book Slot"}
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
                                    <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Booking Successful!</h3>
                                    <p className="text-sm font-semibold text-gray-800 mb-4">Your counselling slot has been confirmed.</p>
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 w-full max-w-sm mx-auto mb-4 text-left space-y-2">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Appointment Details</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            Date: <span className="font-normal text-gray-700">{confirmedBooking?.date ? new Date(confirmedBooking.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : (selectedDate ? new Date(selectedDate.split('_')[0]).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Confirmed')}</span>
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            Time: <span className="font-normal text-gray-700">{confirmedBooking?.time || selectedTime || 'Scheduled Slot'}</span>
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-sm mx-auto mb-5">
                                        We will contact you using the provided email address and phone number with further information.
                                    </p>

                                    {/* Guest account notice inside card */}
                                    {isGuestAccount && (
                                        <div className="w-full max-w-sm mx-auto mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
                                            <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-1.5">Your Account Credentials</p>
                                            <p className="text-xs text-amber-800 leading-relaxed mb-2.5">
                                                A SQUREX account was created for you. Use your email and temporary password to sign in later:
                                            </p>
                                            <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-200 px-3 py-2">
                                                <span className="flex-1 text-xs font-mono font-bold text-gray-800 select-all tracking-wider">SqurxGuestPass123!</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText('SqurxGuestPass123!').then(() => {
                                                            setCopiedPassword(true);
                                                            setTimeout(() => setCopiedPassword(false), 2000);
                                                        });
                                                    }}
                                                    className="text-[10px] font-bold uppercase tracking-widest text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg px-2 py-1 transition-colors flex-shrink-0 cursor-pointer"
                                                >
                                                    {copiedPassword ? '✓ Copied' : 'Copy'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                                        <a 
                                            href={confirmedBooking?.meetLink || 'https://meet.google.com/abc-defg-hij'} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-center w-full h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all"
                                        >
                                            Join Consultation (Google Meet)
                                        </a>
                                        <Button 
                                            onClick={handleConfirmSuccessRedirect} 
                                            variant="outline"
                                            className="w-full rounded-xl h-12 text-sm font-bold border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                                        >
                                            {directBooking ? 'Back to Consultations' : 'Go to dashboard'}
                                        </Button>
                                    </div>
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
                                        <p className="text-[11px] text-black/40 font-light">DPDP Act 2023 — TICC / Squrex</p>
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
                                <p className="font-semibold text-black text-[13px]">TICC owner of Squrex will be registered as Data fiduciary under the Digital Personal Data Protection Act 2023, once the registration will be made open. TICC is compliant with GDPR regulations.</p>
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
                                    <p className="mt-1">Contact: <span className="text-black font-medium">privacy@squrex.com</span></p>
                                </div>

                                <div className="bg-black/[0.025] rounded-2xl p-4 space-y-1">
                                    <p className="font-bold text-black uppercase tracking-wide text-[11px]">Grievances Officer</p>
                                    <p>For any complaint or concern about your data:</p>
                                    <p>Email: <span className="text-black font-medium">grievances@squrex.com</span></p>
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

                                <p className="text-[10px] text-black/40">Queries? privacy@squrex.com &nbsp;|&nbsp; Office address: Official Address &nbsp;|&nbsp; WhatsApp only</p>
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
                                    disabled={!allConsentsGiven || isConfirmingBooking || bookingStatus === 'submitting' || bookingStatus === 'success'}
                                    onClick={() => {
                                        if (allConsentsGiven && !isConfirmingBooking && bookingStatus !== 'submitting') handleGdprAgreeAndBook();
                                    }}
                                    className="flex-[2] h-12 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-black text-white hover:bg-black/80 shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)] active:scale-[0.98]"
                                >
                                    {bookingStatus === 'submitting' || isConfirmingBooking ? 'Processing Booking...' : allConsentsGiven ? 'I Agree & Confirm Slot ✓' : `Agree to all ${[consentAge18, consentReadUnderstood, consentDataProcessing, consentResumeSharing].filter(Boolean).length}/4 items`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── OTP Verification Modal (Before Booking Success Confirmation) ──────── */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showOtpModal && (
                        <motion.div
                            key="otp-modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="fixed inset-0 z-[99998] flex items-center justify-center p-4 sm:p-6"
                            style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="otp-modal-title"
                        >
                            <motion.div
                                key="otp-modal-panel"
                                initial={{ y: 30, opacity: 0, scale: 0.95 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 30, opacity: 0, scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                className="relative w-full max-w-md max-h-[88vh] bg-white rounded-[2.5rem] shadow-[0_32px_90px_rgba(0,0,0,0.3)] flex flex-col overflow-y-auto p-6 sm:p-8 text-center border border-gray-100/80"
                            >
                                {/* Close / Cancel Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowOtpModal(false);
                                        setOtpError(null);
                                        setOtpResendSuccess(null);
                                        setBookingStatus('idle');
                                    }}
                                    className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
                                    aria-label="Close"
                                >
                                    ✕
                                </button>

                                {/* Top Icon */}
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-inner relative">
                                    <div className="absolute inset-0 bg-blue-400/20 blur-xl animate-pulse rounded-2xl" />
                                    <Smartphone className="w-8 h-8 relative z-10" strokeWidth={2.2} />
                                </div>

                                <h2 id="otp-modal-title" className="text-2xl font-black text-gray-900 tracking-tight mb-1">
                                    Enter Verification Code
                                </h2>
                                <p className="text-xs text-gray-500 font-medium mb-4">
                                    We sent a {otpLength}-digit one-time password to verify your consultation booking.
                                </p>

                                {/* Target Recipient Pills */}
                                <div className="bg-gray-50/90 border border-gray-100 rounded-2xl p-3 mb-6 flex flex-col gap-1 items-center justify-center text-xs">
                                    <div className="flex items-center gap-2 text-gray-800 font-bold">
                                        <span>📱</span>
                                        <span>{leadData.countryCode} {leadData.mobile || 'Registered Mobile'}</span>
                                    </div>
                                    {leadData.email && (
                                        <div className="flex items-center gap-2 text-gray-500 font-medium text-[11px] truncate max-w-[280px]">
                                            <span>✉️</span>
                                            <span className="truncate">{leadData.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* OTP Form */}
                                <form onSubmit={handleOtpSubmit} className="space-y-5">
                                    {/* Digits Grid */}
                                    <div className="flex justify-center gap-2.5 sm:gap-3.5">
                                        {Array.from({ length: otpLength }).map((_, index) => {
                                            const isActive = otpValue[index] && otpValue[index] !== ' ';
                                            return (
                                                <div key={index} className="relative">
                                                    <input
                                                        id={`gcd-otp-input-${index}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        maxLength={1}
                                                        autoFocus={index === 0}
                                                        value={otpValue[index] || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            const chars = otpValue.padEnd(otpLength, ' ').split('');
                                                            chars[index] = val || ' ';
                                                            const newStr = chars.join('').trimEnd();
                                                            setOtpValue(newStr);
                                                            if (val && index < otpLength - 1) {
                                                                document.getElementById(`gcd-otp-input-${index + 1}`)?.focus();
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Backspace') {
                                                                if ((!otpValue[index] || otpValue[index] === ' ') && index > 0) {
                                                                    const chars = otpValue.padEnd(otpLength, ' ').split('');
                                                                    chars[index - 1] = ' ';
                                                                    setOtpValue(chars.join('').trimEnd());
                                                                    document.getElementById(`gcd-otp-input-${index - 1}`)?.focus();
                                                                }
                                                            }
                                                        }}
                                                        onPaste={(e) => {
                                                            e.preventDefault();
                                                            const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
                                                            if (pasted) {
                                                                if (pasted.length >= 6 && otpLength === 4) {
                                                                    setOtpLength(6);
                                                                    const cleanPasted = pasted.slice(0, 6);
                                                                    setOtpValue(cleanPasted);
                                                                    setTimeout(() => {
                                                                        document.getElementById(`gcd-otp-input-5`)?.focus();
                                                                    }, 50);
                                                                } else {
                                                                    const cleanPasted = pasted.slice(0, otpLength);
                                                                    setOtpValue(cleanPasted);
                                                                    const targetFocus = Math.min(otpLength - 1, cleanPasted.length);
                                                                    document.getElementById(`gcd-otp-input-${targetFocus}`)?.focus();
                                                                }
                                                            }
                                                        }}
                                                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-black rounded-2xl outline-none transition-all duration-200 bg-white ${
                                                            isActive
                                                                ? 'border-2 border-blue-600 text-blue-600 shadow-[0_8px_20px_rgba(37,99,235,0.15)] ring-4 ring-blue-500/10'
                                                                : 'border-2 border-gray-200 text-gray-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10'
                                                        }`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Length Switch Helper */}
                                    <div className="flex justify-center items-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextLen = otpLength === 4 ? 6 : 4;
                                                setOtpLength(nextLen);
                                                setOtpValue(otpValue.slice(0, nextLen));
                                            }}
                                            className="text-[11px] font-semibold text-gray-400 hover:text-blue-600 underline underline-offset-2 transition-colors cursor-pointer"
                                        >
                                            {otpLength === 4 ? "Received a 6-digit code? Switch to 6 boxes" : "Received a 4-digit code? Switch to 4 boxes"}
                                        </button>
                                    </div>

                                    {/* Error Message Alert */}
                                    {otpError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 text-center"
                                        >
                                            {otpError}
                                        </motion.div>
                                    )}

                                    {/* Resend Success Alert */}
                                    {otpResendSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 text-center"
                                        >
                                            {otpResendSuccess}
                                        </motion.div>
                                    )}

                                    {/* Resend Button */}
                                    <div className="pt-1 flex justify-center">
                                        <button
                                            type="button"
                                            disabled={otpResendTimer > 0 || isResendingOtp || isVerifyingOtp}
                                            onClick={handleResendOtp}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 disabled:text-gray-300 disabled:hover:text-gray-300 transition-colors cursor-pointer"
                                        >
                                            {isResendingOtp ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Sending new code...</span>
                                                </>
                                            ) : otpResendTimer > 0 ? (
                                                <span>Resend code in {otpResendTimer}s</span>
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    <span>Didn't receive code? Resend OTP</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowOtpModal(false);
                                                setOtpError(null);
                                                setOtpResendSuccess(null);
                                                setBookingStatus('idle');
                                            }}
                                            disabled={isVerifyingOtp}
                                            className="flex-1 h-12 rounded-2xl border-2 border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isVerifyingOtp || otpValue.replace(/\s/g, '').length < otpLength}
                                            className="flex-[2] h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                                        >
                                            {isVerifyingOtp ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Verifying Code...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Verify &amp; Confirm Booking</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* ── Success Booking Popup Modal ───────────────────────── */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {(showSuccessPopup || bookingStatus === 'success' || bookingStatus === 'redirecting') && (
                        <motion.div
                            key="success-popup-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6"
                            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
                            role="status"
                            aria-live="polite"
                            aria-labelledby="success-popup-title"
                        >
                            <motion.div
                                key="success-popup-panel"
                                initial={{ y: 40, opacity: 0, scale: 0.96 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 40, opacity: 0, scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                                className="relative w-full sm:max-w-md max-h-[85vh] bg-white rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.25)] flex flex-col overflow-y-auto p-6 sm:p-7 text-center pointer-events-auto"
                            >
                                {/* Dismiss / Close Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowSuccessPopup(false)}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors text-xs font-bold cursor-pointer z-20"
                                    aria-label="Close"
                                >
                                    ✕
                                </button>

                                {/* Icon */}
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center shadow-inner relative overflow-hidden flex-shrink-0">
                                    <div className="absolute inset-0 bg-emerald-400/20 blur-xl animate-pulse" />
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 relative z-10" strokeWidth={2.5} />
                                </div>

                                <h2 id="success-popup-title" className="text-xl sm:text-2xl font-black text-gray-900 mb-1 tracking-tight">Booking Successful!</h2>
                                
                                <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">
                                    Your counselling slot has been confirmed.
                                </p>

                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 w-full mb-3 text-left space-y-1.5 flex-shrink-0">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Appointment Details</p>
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                        Date: <span className="font-normal text-gray-700">
                                            {confirmedBooking?.date ? new Date(confirmedBooking.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : (selectedDate ? new Date(selectedDate.split('_')[0]).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Confirmed')}
                                        </span>
                                    </p>
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                        Time: <span className="font-normal text-gray-700">
                                            {confirmedBooking?.time || selectedTime || 'Scheduled Slot'}
                                        </span>
                                    </p>
                                </div>

                                <p className="text-xs text-gray-600 font-medium leading-relaxed mb-3">
                                    We will contact you using the provided email address and phone number with further information.
                                </p>

                                {/* Guest account notice inside popup */}
                                {isGuestAccount && (
                                    <div className="w-full mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-left flex-shrink-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">Your Account Was Created</p>
                                        <p className="text-xs text-amber-800 leading-relaxed mb-2">
                                            We automatically created a SQUREX account for you using your email. Use the password below to sign in after you log out.
                                        </p>
                                        <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-200 px-3 py-1.5 mb-1">
                                            <span className="flex-1 text-xs font-mono font-bold text-gray-800 select-all tracking-wider">SqurxGuestPass123!</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText('SqurxGuestPass123!').then(() => {
                                                        setCopiedPassword(true);
                                                        setTimeout(() => setCopiedPassword(false), 2000);
                                                    });
                                                }}
                                                className="text-[10px] font-bold uppercase tracking-widest text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg px-2 py-1 transition-colors flex-shrink-0 cursor-pointer"
                                            >
                                                {copiedPassword ? '✓ Copied' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Go to dashboard Action Button to confirm and navigate */}
                                <button
                                    type="button"
                                    onClick={handleConfirmSuccessRedirect}
                                    className="w-full h-12 rounded-2xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 flex-shrink-0"
                                >
                                    <span>Go to dashboard</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* ── Privacy & Consent Policy Read-Only Popup Modal ─────────────── */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showPrivacyPolicyModal && (
                        <motion.div
                            key="privacy-policy-modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6"
                            style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
                            onClick={() => setShowPrivacyPolicyModal(false)}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="privacy-policy-modal-title"
                        >
                            <motion.div
                                key="privacy-policy-modal-panel"
                                initial={{ y: 24, opacity: 0, scale: 0.96 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 24, opacity: 0, scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col max-h-[85vh] border border-gray-100"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-gray-100 bg-gray-50/70">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 id="privacy-policy-modal-title" className="text-xl font-black text-gray-900 tracking-tight">Privacy &amp; Consent Policy</h3>
                                            <p className="text-xs text-gray-500 font-semibold mt-0.5">DPDP Act 2023 — TICC / Squrex</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPrivacyPolicyModal(false)}
                                        className="w-9 h-9 rounded-full bg-gray-200/60 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
                                        aria-label="Close"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Read-Only Policy Body (Exact Official GDPR Data — No Checkboxes / Ticks) */}
                                <div className="p-6 sm:p-8 overflow-y-auto space-y-5 text-xs sm:text-sm text-gray-600 leading-relaxed">
                                    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs font-semibold text-blue-900 leading-relaxed">
                                        TICC owner of Squrex will be registered as Data fiduciary under the Digital Personal Data Protection Act 2023, once the registration will be made open. TICC is compliant with GDPR regulations.
                                    </div>

                                    <p className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                                        Before you continue, here's how we'll use your information:
                                    </p>

                                    {/* What We Collect */}
                                    <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-2">
                                        <p className="font-bold text-gray-900 uppercase tracking-wide text-[11px]">What We Collect</p>
                                        <p className="text-xs">When you book a consultation, we collect:</p>
                                        <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                            <li>Your name, email, and phone number</li>
                                            <li>Your responses to our career quiz</li>
                                            <li>Your preferred consultation date and time</li>
                                        </ul>
                                    </div>

                                    {/* How We Use It */}
                                    <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-2">
                                        <p className="font-bold text-gray-900 uppercase tracking-wide text-[11px]">How We Use It</p>
                                        <p className="font-bold text-gray-800 text-xs">To deliver your consultation:</p>
                                        <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                            <li>Connect you with a career counselor</li>
                                            <li>Share your quiz responses with the assigned counselor</li>
                                            <li>Send you confirmation and reminder communications</li>
                                        </ul>
                                        <p className="font-bold text-gray-800 text-xs mt-2">To improve our service:</p>
                                        <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                            <li>Analyse skill gaps against global employer demands</li>
                                            <li>Personalize counselling and university recommendations</li>
                                            <li>Understand what's working and make our platform better</li>
                                        </ul>
                                    </div>

                                    <p className="text-xs text-gray-600">
                                        We will only use your data for the purposes listed above. If we need to use it for anything else, we will ask for your consent again.
                                    </p>

                                    {/* Where Your Data Goes */}
                                    <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-2">
                                        <p className="font-bold text-gray-900 uppercase tracking-wide text-[11px]">Where Your Data Goes</p>
                                        <p className="text-xs"><strong className="text-gray-900">Storage:</strong> Securely stored on cloud servers within India (AWS) in compliance with Indian data protection laws.</p>
                                        <p className="text-xs"><strong className="text-gray-900">Who sees it:</strong></p>
                                        <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                            <li>Assigned career counselors for consultation purposes</li>
                                            <li>Service providers who help us run the platform</li>
                                        </ul>
                                        <p className="text-xs"><strong className="text-gray-900">How long:</strong> Up to 3 years, or until you ask us to delete it.</p>
                                    </div>

                                    {/* Your Rights */}
                                    <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-2">
                                        <p className="font-bold text-gray-900 uppercase tracking-wide text-[11px]">Your Rights</p>
                                        <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                            <li>See what data we have about you</li>
                                            <li>Fix any incorrect information</li>
                                            <li>Delete your data</li>
                                            <li>Stop receiving emails anytime</li>
                                            <li>Download your data</li>
                                            <li>Object to automated decision making</li>
                                            <li>Nominate someone to exercise your rights in case of death or incapacity</li>
                                        </ul>
                                        <p className="mt-1 text-xs">Contact: <span className="text-gray-900 font-bold">privacy@squrex.com</span></p>
                                    </div>

                                    {/* Grievances Officer */}
                                    <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-1">
                                        <p className="font-bold text-gray-900 uppercase tracking-wide text-[11px]">Grievances Officer</p>
                                        <p className="text-xs">For any complaint or concern about your data:</p>
                                        <p className="text-xs">Email: <span className="text-gray-900 font-bold">grievances@squrex.com</span></p>
                                        <p className="text-xs text-gray-500">We will acknowledge your complaint within 24 working hours.</p>
                                    </div>

                                    {/* Important to Know */}
                                    <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 space-y-1">
                                        <p className="font-bold text-gray-900 uppercase tracking-wide text-[11px]">Important to Know</p>
                                        <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
                                            <li>You can withdraw consent anytime through your account settings or by emailing us.</li>
                                            <li>Withdrawing consent won't affect data already processed.</li>
                                            <li>We use industry-standard security to protect your data.</li>
                                            <li>We'll never sell your information.</li>
                                        </ul>
                                    </div>

                                    <p className="text-[11px] text-gray-400">
                                        Queries? privacy@squrex.com &nbsp;|&nbsp; Office address: Official Address &nbsp;|&nbsp; WhatsApp only
                                    </p>
                                </div>

                                {/* Footer / Close Action Button */}
                                <div className="px-6 sm:px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowPrivacyPolicyModal(false)}
                                        className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        Close Policy
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

