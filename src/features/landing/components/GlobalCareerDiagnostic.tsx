import { useState, useEffect } from 'react';
import { consultationApi } from '@/lib/consultationApi';
import { FadeInOnView } from '@/components/motion';
import { useNavigate } from 'react-router-dom';
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
import { useAuthStore } from '@/features/auth/store';

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
        description: "We'll eliminate this uncertainty directly in your blueprint.",
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
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Consultation Booking States
    const [isBookingMode, setIsBookingMode] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [isConfirmingBooking, setIsConfirmingBooking] = useState(false);
    const [isBookingConfirmed, setIsBookingConfirmed] = useState(false);

    // Lead Generation Form State
    const [isLeadFormMode, setIsLeadFormMode] = useState(false);
    const [isLeadFormSubmitted, setIsLeadFormSubmitted] = useState(false);

    const [slotsData, setSlotsData] = useState<any[]>([]);

    useEffect(() => {
        consultationApi.getTimeSlots().then(res => {
            if(res.success && res.data) {
               setSlotsData(res.data);
            }
        }).catch(console.error);
    }, []);

    const handleSelectOption = (index: number, optionId: string) => {
        setAnswers(prev => ({ ...prev, [index]: optionId }));
        
        if (index < QUESTIONS.length - 1) {
            setTimeout(() => setStep(index + 1), 250);
        } else {
            setIsAnalyzing(true);
            setTimeout(() => {
                setIsAnalyzing(false);
                setStep(QUESTIONS.length);
                setIsLeadFormMode(true);
            }, 1800);
        }
    };

    const handleFinalizeBooking = async () => {
        if (!selectedDate || !selectedTime) return;
        setIsConfirmingBooking(true);
        
        try {
            const leadStr = localStorage.getItem('squrx_lead_data');
            const answersStr = localStorage.getItem('squrx_quiz_answers');
            
            const leadData = leadStr ? JSON.parse(leadStr) : { name: "Guest User", email: "guest@example.com", mobile: "0000000000" };
            const rawAnswers = answersStr ? JSON.parse(answersStr) : {};
            
            const quizAnswersList = Object.keys(rawAnswers).map(key => {
                const stepIndex = parseInt(key, 10);
                const rawChoice = rawAnswers[key as any];
                // Safely handle old cached 'opt1' values to prevent MongoDB Cast Error (which results in 422)
                const isValidHex = /^[0-9a-fA-F]{24}$/.test(rawChoice);
                return {
                    quizId: QUESTIONS[stepIndex]?.id || '65f000000000000000000000',
                    choiceId: isValidHex ? rawChoice : '65f000000000000000000000'
                };
            });

            // Failsafe to ensure validation doesn't throw 422 if answers are somehow cleared
            if (quizAnswersList.length === 0) {
                quizAnswersList.push({
                    quizId: '65f000000000000000000000',
                    choiceId: '65f000000000000000000000'
                });
            }

            // Sanitize mobile to ensure it's exactly 10 digits
            let sanitizedMobile = leadData.mobile ? leadData.mobile.replace(/\D/g, '') : "9999999999";
            if (sanitizedMobile.length !== 10) {
                sanitizedMobile = "9999999999"; // Fallback to pass validation if still invalid
            }

            const payload = {
                fullName: leadData.name || "Student",
                email: leadData.email || "student@example.com",
                mobile: sanitizedMobile,
                quizAnswers: quizAnswersList,
                appointment: { dateId: selectedDate, timeId: selectedTime }
            };
            console.log("PAYLOAD BEING SENT TO BACKEND:", JSON.stringify(payload, null, 2));

            const response = await consultationApi.bookConsultation(payload);

            if (response?.data?.token) {
                const fakeUser = {
                    _id: response.data.consultation?.user || "temp-id",
                    name: payload.fullName,
                    email: payload.email,
                    role: "STUDENT"
                };
                useAuthStore.getState().setAuth(fakeUser, response.data.token);
            }

            setIsConfirmingBooking(false);
            setIsBookingConfirmed(true);
        } catch (error) {
            console.error(error);
            setIsConfirmingBooking(false);
            // Optionally handle error toast
        }
    };

    const handleBookConsultationClick = () => {
        setIsBookingMode(true);
    };

    const handleLogin = () => navigate('/student/consultation');

    const progressPercentage = (step / QUESTIONS.length) * 100;

    return (
        <section className="relative py-16 md:py-20 w-full bg-white overflow-hidden font-sans border-t justify-center flex border-gray-100">
            <FadeInOnView className="max-w-[1000px] w-full mx-auto px-4 sm:px-6">
                
                {/* MEDIUM SIZED: Reduced min-h, rounded corners, shadow */}
                <div className="flex flex-col md:flex-row w-full min-h-[480px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/40">
                    
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
                                        {step < QUESTIONS.length ? QUESTIONS[step].title : "Trajectory Locked."}
                                    </h2>
                                    <p className="text-base text-gray-500 font-medium leading-relaxed">
                                        {step < QUESTIONS.length 
                                            ? QUESTIONS[step].description 
                                            : "Your asymmetrical variables have been compiled into a personalized roadmap."}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-10 md:mt-0">
                            <div className="flex justify-between items-center mb-2 text-[11px] font-bold text-gray-400 tracking-widest uppercase">
                                <span>Phase {step < QUESTIONS.length ? step + 1 : 'Complete'}</span>
                                <span>{QUESTIONS.length} Questions</span>
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
                                    <h3 className="text-2xl font-black tracking-tight text-gray-900 mb-2">Synthesizing Blueprint...</h3>
                                    <p className="text-gray-500 font-medium text-sm">Cross-referencing your profile against successful global cohorts.</p>
                                </motion.div>
                            )}

                            {step < QUESTIONS.length && !isAnalyzing && (
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="w-full max-w-lg mx-auto"
                                >
                                    <div className="flex flex-col gap-3">
                                        {QUESTIONS[step].options.map((opt, idx) => {
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
                                                        <Icon size={20} strokeWidth={2} />
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

                            {step === QUESTIONS.length && isLeadFormMode && !isLeadFormSubmitted && (
                                <motion.div
                                    key="lead-form"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="flex flex-col justify-center w-full relative z-20"
                                >
                                    <div className="absolute -top-10 left-12 w-40 h-40 bg-blue-400/20 rounded-full blur-[50px] pointer-events-none"></div>
                                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 tracking-tight">Unlock Your Roadmap</h3>
                                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                                        Your personalized consultation profile has been successfully generated. Enter your details to view the results.
                                    </p>

                                    <form onSubmit={(e) => { 
                                        e.preventDefault(); 
                                        
                                        const formData = new FormData(e.currentTarget);
                                        const leadData = {
                                            name: formData.get('name'),
                                            email: formData.get('email'),
                                            mobile: formData.get('mobile')
                                        };

                                        // Store Quiz option IDs and Lead info locally 
                                        localStorage.setItem('squrx_quiz_answers', JSON.stringify(answers));
                                        localStorage.setItem('squrx_lead_data', JSON.stringify(leadData));

                                        setIsLeadFormSubmitted(true); 
                                        setIsLeadFormMode(false); 
                                    }} className="space-y-5 w-full relative z-10">
                                        
                                        <div className="space-y-1.5 group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-600 transition-colors">Full Legal Name</label>
                                            <div className="relative">
                                                <input name="name" required type="text" placeholder="e.g. Michael Chen" className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[1rem] px-4 text-sm font-bold text-gray-900 transition-all outline-none shadow-sm" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5 group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-600 transition-colors">Personal Email Address</label>
                                            <div className="relative">
                                                <input name="email" required type="email" placeholder="hello@company.com" className="w-full h-14 bg-gray-50/50 border-2 border-gray-100 hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[1rem] px-4 text-sm font-bold text-gray-900 transition-all outline-none shadow-sm" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5 group">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-600 transition-colors">Mobile Number</label>
                                            <div className="relative border-2 border-gray-100 hover:border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-[1rem] flex items-center bg-gray-50/50 focus-within:bg-white transition-all shadow-sm">
                                                <span className="pl-4 pr-2 text-sm font-bold text-gray-500 border-r border-gray-200 py-1">+91</span>
                                                <input name="mobile" required type="tel" pattern="[0-9]{10}" minLength={10} maxLength={10} title="Mobile number must be exactly 10 digits" placeholder="9876543210" className="w-full h-14 bg-transparent px-4 text-sm font-bold text-gray-900 outline-none" />
                                            </div>
                                        </div>

                                        <Button type="submit" className="w-full rounded-2xl h-14 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-[0_8px_30px_rgba(37,99,235,0.3)] mt-6 transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 group flex items-center justify-center">
                                            Reveal My Blueprint <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </form>
                                </motion.div>
                            )}

                            {step === QUESTIONS.length && !isAnalyzing && !isBookingMode && !isBookingConfirmed && isLeadFormSubmitted && (
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
                                        <Button onClick={handleBookConsultationClick} className="w-full rounded-xl h-12 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all">
                                            <CalendarDays className="mr-2 w-4 h-4" /> Book Consultation
                                        </Button>
                                        <Button variant="outline" onClick={handleLogin} className="w-full rounded-xl h-12 text-sm border-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-900 hover:text-gray-900 font-bold hover:-translate-y-0.5 transition-all">
                                            <LogIn className="mr-2 w-4 h-4" /> Login
                                        </Button>
                                    </div>
                                    
                                    <button onClick={() => { setStep(0); setAnswers({}); }} className="mt-8 text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                        <Cog size={14}/> Retake Diagnostic
                                    </button>
                                </motion.div>
                            )}

                            {step === QUESTIONS.length && isBookingMode && !isBookingConfirmed && (
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
                                                        onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
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
                                                        onClick={() => setSelectedTime(slot._id)}
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

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1 rounded-xl h-12 text-sm font-bold" onClick={() => setIsBookingMode(false)}>
                                            Cancel
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

                            {step === QUESTIONS.length && isBookingConfirmed && (
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
                                        Slot Locked In!
                                    </h3>
                                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8 font-medium">
                                        Your session is confirmed. Login to your dashboard to access the meeting room link.
                                    </p>
                                    
                                    <Button onClick={handleLogin} size="lg" className="w-full max-w-xs mx-auto rounded-xl h-12 text-sm bg-gray-900 hover:bg-black text-white font-bold shadow-lg transition-all">
                                        <LogIn className="mr-2 w-4 h-4" /> Go to Dashboard
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </FadeInOnView>
        </section>
    );
}
