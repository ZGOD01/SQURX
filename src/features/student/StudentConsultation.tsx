import { useState, useEffect } from 'react';
import { consultationApi } from '@/lib/consultationApi';
import { useStudentStore } from './store';
import { Card, CardHeader, CardTitle, CardContent, Button, Toast } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { Calendar, Clock, Loader2, Video, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../auth/store';
import { useNotificationStore } from '@/lib/store/notifications';



export function StudentConsultation() {
    const { user } = useAuthStore();
    const { consultation, bookConsultation, cancelConsultation } = useStudentStore();
    const { sendEmail } = useNotificationStore();
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [slotsData, setSlotsData] = useState<any[]>([]);

    useEffect(() => {
        consultationApi.getTimeSlots().then(res => {
            if(res.success && res.data) {
               setSlotsData(res.data);
            }
        }).catch(console.error);
    }, []);

    const handleBooking = async () => {
        if (!selectedDate || !selectedTime) return;
        setIsLoading(true);
        if (user) {
            await bookConsultation(user.id, {
                fullName: user.name || "Student",
                email: user.email || "",
                mobile: "9999999999",
                quizAnswers: [
                    { quizId: '65f000000000000000000000', choiceId: '65f000000000000000000000' }
                ],
                appointment: { dateId: selectedDate, timeId: selectedTime }
            });
        }
        setIsLoading(false);
        const bookedDateObj = slotsData.find(d => d._id === selectedDate);
        const bookedTimeObj = bookedDateObj?.slots?.find((s:any) => s._id === selectedTime);
        const dateStr = bookedDateObj ? new Date(bookedDateObj.date).toLocaleDateString() : '';
        const timeStr = bookedTimeObj ? bookedTimeObj.time : '';
        
        setSelectedDate('');
        setSelectedTime('');
        setToastMessage(`Booking confirmed for ${dateStr} at ${timeStr}.`);
        sendEmail('Consultation Confirmed', `Your 1-on-1 mentorship session is successfully booked for ${dateStr} at ${timeStr}. Check your dashboard for the Google Meet link.`);
    };

    const handleCancel = async () => {
        setIsLoading(true);
        if (user) {
            await cancelConsultation(user.id);
        }
        setIsLoading(false);
        setToastMessage('Booking successfully cancelled.');
        sendEmail('Consultation Cancelled', 'Your upcoming mentorship session has been cancelled. Feel free to re-book anytime from your dashboard.');
    };



    return (
        <PageTransition className="space-y-6 max-w-4xl mx-auto pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mentorship & Consultation</h1>
                <p className="text-muted-foreground mt-1">Book a 1-on-1 strategy session with our career experts.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" /> Select Date & Time
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {consultation ? (
                                <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-6 text-center space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 mx-auto flex items-center justify-center">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Session Scheduled</h3>
                                        <p className="text-sm font-medium mt-1">
                                            {new Date(consultation.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </p>
                                        <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
                                            <Clock size={14} /> {consultation.timeSlot}
                                        </p>
                                    </div>

                                    <div className="bg-background border rounded-lg p-3 my-4 flex items-center gap-3 text-sm text-left shadow-sm">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                            <Video size={16} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Google Meet link</p>
                                            <p className="text-xs text-muted-foreground">Will be active 5 mins prior</p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={handleCancel}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Booking'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Custom Simple Date Strip */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold flex items-center justify-between">
                                            Next Available Dates
                                            <span className="text-xs font-normal text-muted-foreground">Business days only</span>
                                        </label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {slotsData.map((dateObj, i) => {
                                                const dateStr = dateObj._id;
                                                const isSelected = selectedDate === dateStr;
                                                const date = new Date(dateObj.date);
                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${isSelected
                                                            ? 'bg-primary text-primary-foreground shadow-md scale-[1.02] border-primary'
                                                            : 'bg-background hover:border-primary/40 border-border/60 hover:bg-card text-muted-foreground hover:text-foreground'
                                                            }`}
                                                        onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
                                                    >
                                                        <span className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-80">
                                                            {date.toLocaleDateString(undefined, { weekday: 'short' })}
                                                        </span>
                                                        <span className="text-lg font-bold leading-none">
                                                            {date.getDate()}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold">Available Time Slots</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedDate && slotsData.find(d => d._id === selectedDate)?.slots.map((slot: any) => {
                                                const isSelected = selectedTime === slot._id;
                                                return (
                                                <button
                                                    key={slot._id}
                                                    type="button"
                                                    disabled={!slot.isAvailable}
                                                    className={`flex items-center justify-center py-3 rounded-xl border transition-all text-sm font-medium ${isSelected
                                                        ? 'bg-primary text-primary-foreground shadow-sm border-primary'
                                                        : slot.isAvailable ? 'bg-background hover:border-primary/40 border-border/60 text-muted-foreground hover:text-foreground' : 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                                                        }`}
                                                    onClick={() => setSelectedTime(slot._id)}
                                                >
                                                    <Clock size={14} className="mr-2" />
                                                    {slot.time}
                                                </button>
                                            )})}
                                            {!selectedDate && <p className="text-sm text-muted-foreground">Select a date first</p>}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleBooking}
                                        disabled={!selectedDate || !selectedTime || isLoading}
                                        className="w-full h-11"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Consultation Booking'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-border/60 shadow-sm bg-card/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-bold">What to expect</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-foreground/80 leading-relaxed">
                            <p>
                                Our 30-minute strategic sessions are designed to aggressively map your skills against current market demands.
                            </p>
                            <ul className="space-y-3 pl-2">
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <span><strong>CV Review:</strong> We line-by-line optimize your uploaded documents.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <span><strong>Goal Alignment:</strong> Adjust your algorithms to ensure you see exactly what you want on the Job Board.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <span><strong>Referral Strategy:</strong> Get direct connects into our partner agencies.</span>
                                </li>
                            </ul>
                            <div className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                                Please ensure you have completed at least 50% of your profile before jumping on a call to make the most of our experts' time.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[100]">
                    <Toast variant="success" title="Booking Updated" onClose={() => setToastMessage(null)}>
                        {toastMessage}
                    </Toast>
                </div>
            )}
        </PageTransition>
    );
}
