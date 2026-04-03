import { useState } from 'react';
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

const QUESTIONS = [
    {
        title: "Where are you on the journey?",
        description: "Select your current stage to map the trajectory.",
        options: [
            { id: 'opt1', text: "Exploring Options", icon: Compass },
            { id: 'opt2', text: "Shortlisted Universities", icon: Landmark },
            { id: 'opt3', text: "Applied & Awaiting", icon: Mail },
            { id: 'opt4', text: "Offer in Hand", icon: ScrollText },
            { id: 'opt5', text: "Visa & Flying Soon", icon: PlaneTakeoff }
        ]
    },
    {
        title: "Your core field of expertise?",
        description: "Your background dictates the most lucrative routing combinations.",
        options: [
            { id: 'opt1', text: "STEM / Engineering", icon: Cog },
            { id: 'opt2', text: "Business / Management", icon: Briefcase },
            { id: 'opt3', text: "Arts / Creative", icon: Palette },
            { id: 'opt4', text: "Health & Sciences", icon: Dna }
        ]
    },
    {
        title: "How are you financing this leap?",
        description: "Understanding your capital helps us prioritize specific architectures.",
        options: [
            { id: 'opt1', text: "Education Loan", icon: Landmark },
            { id: 'opt2', text: "Self-funded / Savings", icon: ShieldCheck },
            { id: 'opt3', text: "Loan & Savings Mix", icon: Scale },
            { id: 'opt4', text: "Scholarship Hunt", icon: GraduationCap }
        ]
    },
    {
        title: "What is your ultimate endgame?",
        description: "Different goals require vastly different geographical moves.",
        options: [
            { id: 'opt1', text: "Max ROI / High Salary", icon: TrendingUp },
            { id: 'opt2', text: "Global Settlement (PR)", icon: Home },
            { id: 'opt3', text: "Research & Innovation", icon: Microscope },
            { id: 'opt4', text: "Global Networking", icon: Handshake }
        ]
    },
    {
        title: "What is your biggest unknown?",
        description: "We'll eliminate this uncertainty directly in your blueprint.",
        options: [
            { id: 'opt1', text: "Securing a Job", icon: HelpCircle },
            { id: 'opt2', text: "Managing Finances", icon: Calculator },
            { id: 'opt3', text: "Profile Strength", icon: Star },
            { id: 'opt4', text: "Choosing Location", icon: Map }
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

const TIME_SLOTS = ['10:00', '12:00', '15:00', '17:00'];
const getNextDays = () => {
    const days = [];
    const today = new Date();
    today.setDate(today.getDate() + 1); // Start tomorrow
    while (days.length < 5) {
        if (today.getDay() !== 0 && today.getDay() !== 6) { // skip weekends
            days.push(new Date(today));
        }
        today.setDate(today.getDate() + 1);
    }
    return days;
};

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

    const availableDays = getNextDays();

    const handleSelectOption = (index: number, optionId: string) => {
        setAnswers(prev => ({ ...prev, [index]: optionId }));
        
        if (index < QUESTIONS.length - 1) {
            setTimeout(() => setStep(index + 1), 250);
        } else {
            setIsAnalyzing(true);
            setTimeout(() => {
                setIsAnalyzing(false);
                setStep(QUESTIONS.length);
            }, 1800);
        }
    };

    const handleFinalizeBooking = () => {
        if (!selectedDate || !selectedTime) return;
        setIsConfirmingBooking(true);
        // Simulate API call for booking directly from landing page
        setTimeout(() => {
            setIsConfirmingBooking(false);
            setIsBookingConfirmed(true);
        }, 1500);
    };

    const handleBookConsultationClick = () => {
        setIsBookingMode(true);
    };

    const handleLogin = () => navigate('/auth/login');

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

                            {step === QUESTIONS.length && !isAnalyzing && !isBookingMode && !isBookingConfirmed && (
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
                                            {availableDays.map((date, i) => {
                                                const dateStr = date.toISOString().split('T')[0];
                                                const isSelected = selectedDate === dateStr;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedDate(dateStr)}
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
                                            {TIME_SLOTS.map((time) => {
                                                const isSelected = selectedTime === time;
                                                return (
                                                    <button
                                                        key={time}
                                                        onClick={() => setSelectedTime(time)}
                                                        className={`flex items-center justify-center py-2.5 rounded-xl border transition-all text-sm font-bold ${isSelected
                                                            ? 'bg-blue-600 text-white shadow-sm border-blue-600'
                                                            : 'bg-white hover:border-blue-400 border-gray-200 text-gray-600 hover:text-gray-900'
                                                            }`}
                                                    >
                                                        <Clock size={14} className="mr-2" strokeWidth={2.5} />
                                                        {time}
                                                    </button>
                                                );
                                            })}
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
                                        Your session on <span className="text-gray-900 font-bold">{new Date(selectedDate).toLocaleDateString()}</span> at <span className="text-gray-900 font-bold">{selectedTime}</span> is confirmed. Login to your dashboard to access the meeting room link.
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
