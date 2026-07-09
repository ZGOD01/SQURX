import { useState, useEffect } from 'react';
import { getInMemToken } from '@/features/auth/store';
import { useAuthStore } from '@/features/auth/store';
import { Card, Badge, Button, Skeleton } from '@/components/ui';
import { PageTransition, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    Video,
    User,
    Mail,
    CalendarPlus,
    Sparkles,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    AlertCircle,
    MessageSquare,
    GraduationCap,
} from 'lucide-react';
import { GlobalCareerDiagnostic } from '@/features/landing/components/GlobalCareerDiagnostic';

const API_BASE = 'https://squrx-backend.onrender.com/api/v1';

type TabType = 'active' | 'past';

interface Appointment {
    _id?: string;
    fullName?: string;
    email?: string;
    appointmentDate?: string;
    date?: string;
    appointmentTime?: string;
    timeSlot?: string;
    status?: string;
    meetLink?: string;
    mentorName?: string;
    topic?: string;
    notes?: string;
}

/* ─── Status badge styling ─── */
function getStatusConfig(status?: string) {
    switch (status?.toLowerCase()) {
        case 'confirmed':
            return {
                label: 'Confirmed',
                icon: CheckCircle2,
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-600',
                border: 'border-emerald-500/20',
                dot: 'bg-emerald-500',
            };
        case 'cancelled':
            return {
                label: 'Cancelled',
                icon: XCircle,
                bg: 'bg-red-500/10',
                text: 'text-red-500',
                border: 'border-red-500/20',
                dot: 'bg-red-500',
            };
        case 'completed':
            return {
                label: 'Completed',
                icon: CheckCircle2,
                bg: 'bg-blue-500/10',
                text: 'text-blue-600',
                border: 'border-blue-500/20',
                dot: 'bg-blue-500',
            };
        default:
            return {
                label: status || 'Pending',
                icon: AlertCircle,
                bg: 'bg-amber-500/10',
                text: 'text-amber-600',
                border: 'border-amber-500/20',
                dot: 'bg-amber-500',
            };
    }
}

/* ─── Format date nicely ─── */
function formatDate(raw?: string) {
    if (!raw) return null;
    try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) return raw;
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return raw;
    }
}

/* ─── Loading skeleton cards ─── */
function ConsultationSkeleton() {
    return (
        <div className="grid md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6 rounded-[1.5rem] bg-white">
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-11 h-11 rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32 rounded-lg" />
                                <Skeleton className="h-3 w-20 rounded-lg" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-3 w-full rounded-lg" />
                        <Skeleton className="h-3 w-3/4 rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-xl mt-5" />
                </Card>
            ))}
        </div>
    );
}

/* ─── Single appointment card ─── */
function AppointmentCard({ appt }: { appt: Appointment }) {
    const status = getStatusConfig(appt.status);
    const date = formatDate(appt.appointmentDate || appt.date);
    const time = appt.appointmentTime || appt.timeSlot;

    return (
        <HoverLift>
            <Card className="h-full p-0 rounded-[1.5rem] overflow-hidden border-border/60 hover:border-primary/30 transition-all group hover:shadow-xl relative bg-white">
                {/* Top gradient accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                <GraduationCap size={22} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[15px] leading-tight text-foreground">
                                    {appt.mentorName || 'Mentorship Session'}
                                </h3>
                                {appt.topic && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{appt.topic}</p>
                                )}
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${status.bg} ${status.text} ${status.border} border`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                            {status.label}
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {date && (
                            <div className="flex items-center gap-2 text-sm text-foreground/75">
                                <Calendar size={14} className="text-muted-foreground shrink-0" />
                                <span className="truncate">{date}</span>
                            </div>
                        )}
                        {time && (
                            <div className="flex items-center gap-2 text-sm text-foreground/75">
                                <Clock size={14} className="text-muted-foreground shrink-0" />
                                <span className="truncate">{time}</span>
                            </div>
                        )}
                        {appt.fullName && (
                            <div className="flex items-center gap-2 text-sm text-foreground/75">
                                <User size={14} className="text-muted-foreground shrink-0" />
                                <span className="truncate">{appt.fullName}</span>
                            </div>
                        )}
                        {appt.email && (
                            <div className="flex items-center gap-2 text-sm text-foreground/75">
                                <Mail size={14} className="text-muted-foreground shrink-0" />
                                <span className="truncate">{appt.email}</span>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {appt.notes && (
                        <div className="mb-4 p-3 bg-muted/40 rounded-xl border border-border/40">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                                <MessageSquare size={12} />
                                Notes
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{appt.notes}</p>
                        </div>
                    )}

                    {/* Action */}
                    {appt.status === 'confirmed' && appt.meetLink ? (
                        <a href={appt.meetLink} target="_blank" rel="noopener noreferrer" className="block">
                            <Button className="w-full justify-between bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl h-11 shadow-md hover:shadow-lg transition-all border-none">
                                <span className="flex items-center gap-2 font-semibold">
                                    <Video size={16} />
                                    Join Google Meet
                                </span>
                                <ArrowRight size={16} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </Button>
                        </a>
                    ) : (
                        <div className="flex items-center justify-center gap-2 h-11 rounded-xl bg-muted/40 text-sm text-muted-foreground font-semibold border border-border/40">
                            <Clock size={14} />
                            {appt.status === 'cancelled' ? 'Session cancelled' : 'Awaiting confirmation'}
                        </div>
                    )}
                </div>
            </Card>
        </HoverLift>
    );
}

/* ─── Beautiful empty state ─── */
function EmptyState({ tab, onOpenBooking }: { tab: TabType; onOpenBooking: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-20 px-8 text-center bg-white rounded-[2rem] border border-border/50 shadow-sm"
        >
            <div className="relative mb-6">
                {/* Animated background circles */}
                <div className="absolute inset-0 -m-4">
                    <div className="w-24 h-24 mx-auto rounded-full bg-blue-500/5 animate-ping" style={{ animationDuration: '3s' }} />
                </div>
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-center">
                    {tab === 'active' ? (
                        <CalendarPlus size={36} className="text-blue-500" />
                    ) : (
                        <Calendar size={36} className="text-indigo-500" />
                    )}
                </div>
            </div>

            <h3 className="text-xl font-bold tracking-tight mb-2 text-foreground">
                {tab === 'active' ? 'No Active Consultations' : 'No Past Sessions'}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed text-sm">
                {tab === 'active'
                    ? 'Book a mentorship session to get personalized guidance from industry experts. Your upcoming sessions will appear here.'
                    : 'Completed and past sessions will be archived here for your reference.'}
            </p>

            {tab === 'active' && (
                <Button 
                    onClick={onOpenBooking}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full h-11 px-8 shadow-lg hover:shadow-xl transition-all font-semibold border-none"
                >
                    <Sparkles size={16} className="mr-2 animate-pulse" />
                    Book Consultation Now
                </Button>
            )}
        </motion.div>
    );
}

/* ═══════════════════════════ MAIN COMPONENT ═══════════════════════════ */

export function StudentConsultation() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showBookingFlow, setShowBookingFlow] = useState(false);

    const fetchAppointments = () => {
        setLoading(true);
        const token = getInMemToken();
        if (!token) {
            setError('No auth token found. Please log out and log in again.');
            setLoading(false);
            return;
        }

        fetch(`${API_BASE}/consultations/my-appointments`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((json) => {
                setData(json);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    /* ─── Extract appointments from API shape ─── */
    const raw = data?.data ?? data?.appointments ?? data;
    let activeAppointments: Appointment[] = [];
    let pastAppointments: Appointment[] = [];

    if (raw) {
        if (Array.isArray(raw)) {
            activeAppointments = raw.filter(
                (a: Appointment) => a.status?.toLowerCase() !== 'completed' && a.status?.toLowerCase() !== 'cancelled'
            );
            pastAppointments = raw.filter(
                (a: Appointment) => a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'cancelled'
            );
        } else if (typeof raw === 'object' && ('active' in raw || 'past' in raw)) {
            activeAppointments = raw.active || [];
            pastAppointments = raw.past || [];
        }
    }

    const displayAppointments = activeTab === 'active' ? activeAppointments : pastAppointments;
    const firstName = (user?.name || user?.fullName || '').split(' ')[0] || 'there';

    /* ─── Render Booking Flow directly in-page ─── */
    if (showBookingFlow) {
        return (
            <PageTransition className="space-y-6 max-w-7xl mx-auto pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Book a Consultation
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Select an available slot below to confirm your session.
                        </p>
                    </div>
                    <Button 
                        onClick={() => {
                            setShowBookingFlow(false);
                            fetchAppointments(); // Refresh list when going back
                        }} 
                        variant="outline" 
                        className="rounded-xl border border-border flex items-center gap-2 h-11 px-5 font-semibold text-sm cursor-pointer bg-white hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Appointments
                    </Button>
                </div>

                <div className="bg-white rounded-[2rem] border border-border/50 shadow-sm overflow-hidden p-1 sm:p-4">
                    {/* Bypasses overlay & quiz, opens slot picker & lead form directly */}
                    <GlobalCareerDiagnostic 
                        directBooking={true} 
                        onSuccess={() => {
                            setShowBookingFlow(false);
                            fetchAppointments();
                        }}
                    />
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* ─── Page Header ─── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Mentorship & Consultations
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Book sessions with industry specialists, check your calendar, and join virtual calls.
                    </p>
                </div>

                {/* Header CTA and Stats */}
                <div className="flex items-center gap-3 self-start md:self-auto">
                    {!loading && !error && (
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full text-xs font-bold text-blue-700 border border-blue-500/15">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                {activeAppointments.length} Active
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-xs font-bold text-muted-foreground border border-border">
                                {pastAppointments.length} Past
                            </div>
                        </div>
                    )}
                    <Button 
                        onClick={() => setShowBookingFlow(true)}
                        className="bg-primary text-primary-foreground hover:opacity-95 rounded-xl h-11 px-5 font-semibold text-sm shadow-md border-none"
                    >
                        <CalendarPlus size={16} className="mr-2" />
                        Book a Session
                    </Button>
                </div>
            </div>

            {/* ─── Hero Banner ─── */}
            <div className="p-6 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                {/* Decorative blur */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-4 relative z-10 w-full md:w-auto text-center md:text-left">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex flex-col items-center justify-center text-blue-700 shrink-0 mx-auto md:mx-0 border border-blue-500/20">
                        <GraduationCap size={24} className="mb-0.5 animate-bounce" style={{ animationDuration: '4s' }} />
                        <span className="text-[9px] font-bold tracking-widest">LIVE</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-lg font-bold text-blue-800">
                            Hi {firstName}, ready to grow your career?
                        </p>
                        <p className="text-sm text-foreground/75 font-medium mt-1">
                            Book unlimited 1-on-1 virtual sessions with vetted directors, tech leads, and PMs to speed up your onboarding.
                        </p>
                    </div>
                </div>

                <div className="shrink-0 relative z-10 hidden md:block">
                    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-blue-500/10 shadow-sm">
                        <span className="font-bold uppercase tracking-wider text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-1 inline-block rounded-md mb-2 shadow-sm">
                            Quick Tip
                        </span>
                        <p className="text-xs text-foreground/70 font-medium leading-relaxed max-w-[250px]">
                            Confirmed sessions include Google Meet links. Add notes when booking to share your objectives with the mentor.
                        </p>
                    </div>
                </div>
            </div>

            {/* ─── Tabs switcher ─── */}
            <div className="flex space-x-1 bg-muted/50 p-1 rounded-xl w-fit border border-border/50">
                {(['active', 'past'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                            activeTab === tab
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground/70'
                        }`}
                    >
                        {activeTab === tab && (
                            <motion.div
                                layoutId="consultationTabBg"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm border border-border/50"
                                initial={false}
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab === 'active' ? (
                                <>
                                    <Calendar size={15} />
                                    Upcoming ({activeAppointments.length})
                                </>
                            ) : (
                                <>
                                    <Clock size={15} />
                                    Past Sessions ({pastAppointments.length})
                                </>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            {/* ─── Content ─── */}
            {loading && <ConsultationSkeleton />}

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4"
                >
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                        <XCircle size={20} className="text-red-500" />
                    </div>
                    <div>
                        <p className="font-bold text-red-600 text-sm">Something went wrong</p>
                        <p className="text-sm text-red-500/80 mt-0.5">{error}</p>
                    </div>
                </motion.div>
            )}

            {!loading && !error && (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                    >
                        {displayAppointments.length === 0 ? (
                            <EmptyState tab={activeTab} onOpenBooking={() => setShowBookingFlow(true)} />
                        ) : (
                            <StaggerContainer className="grid md:grid-cols-2 gap-5">
                                {displayAppointments.map((appt, i) => (
                                    <StaggerItem key={appt._id || i}>
                                        <AppointmentCard appt={appt} />
                                    </StaggerItem>
                                ))}
                            </StaggerContainer>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
        </PageTransition>
    );
}
