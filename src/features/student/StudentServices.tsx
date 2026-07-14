import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useNotificationStore } from '@/lib/store/notifications';
import { 
    Sparkles, 
    MessageSquare, 
    Award, 
    FileCheck, 
    Check, 
    CreditCard, 
    ArrowRight, 
    CheckCircle2, 
    Lock,
    X
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Input } from '@/components/ui';

interface ServiceProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    icon: any;
    features: string[];
    gradient: string;
    badge?: string;
}

const PREMIUM_SERVICES: ServiceProduct[] = [
    {
        id: 'cv-makeover',
        name: 'ATS Resume Makeover',
        description: 'Get a complete rewrite of your CV by certified HR experts to bypass automated ATS filters and grab recruiter attention.',
        price: 49,
        icon: FileCheck,
        gradient: 'from-blue-600 to-indigo-600',
        features: [
            'ATS-Optimized Formatting',
            'Professional Cover Letter Draft',
            'Delivered in PDF & Editable Word formats',
            '30-minute Mentor Feedback Call'
        ]
    },
    {
        id: 'mock-interview',
        name: '1-on-1 Mock Interview',
        description: 'Practice technical & behavioral questions in a live 60-minute session with senior mentors from Fortune 500 tech companies.',
        price: 89,
        icon: MessageSquare,
        gradient: 'from-violet-600 to-purple-600',
        features: [
            '60-Min Live Video Session',
            'Standardized Scorecard Report',
            'Actionable Feedback on Stumbles',
            'Recording & Script Included'
        ]
    },
    {
        id: 'vip-job-agent',
        name: 'VIP Job Hunt Agent',
        description: 'Get a dedicated recruitment representative who will review your target preferences and manually pitch your profile directly to active recruiters.',
        price: 199,
        icon: Sparkles,
        badge: 'Best Seller',
        gradient: 'from-amber-500 to-orange-600',
        features: [
            'Dedicated Career Partner',
            'Weekly Curated Job Lists',
            'Direct Warm Pitch Emails to HR',
            'Guaranteed Interview Invites'
        ]
    },
    {
        id: 'skills-diagnostic',
        name: 'Verified Expert Assessment',
        description: 'Take premium technical tests scored by industry professionals. Earn a Verified Expert profile badge that recruiters search for.',
        price: 29,
        icon: Award,
        gradient: 'from-emerald-600 to-teal-600',
        features: [
            'Verified Expert Profile Badge',
            'Comprehensive Skills Diagnostic Report',
            'Shareable Digital Certificate',
            'Highlighted in Search Rankings'
        ]
    }
];

export function StudentServices() {
    const { user } = useAuthStore();
    const { sendEmail } = useNotificationStore();

    // Toast Alert State
    const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

    // Checkout modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<ServiceProduct | null>(null);
    const [checkoutStep, setCheckoutStep] = useState<'details' | 'processing' | 'success'>('details');
    const [processingMessage, setProcessingMessage] = useState('Securing connection to transaction gateway...');

    // Form inputs
    const [cardHolder, setCardHolder] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [couponCode, setCouponCode] = useState('');

    // Promo code calculations
    const [discountPercent, setDiscountPercent] = useState(0);
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const [couponError, setCouponError] = useState('');

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    // Card Input Formatters
    const handleCardNumberChange = (val: string) => {
        const cleaned = val.replace(/\D/g, '').substring(0, 16);
        const matched = cleaned.match(/.{1,4}/g);
        setCardNumber(matched ? matched.join('-') : cleaned);
    };

    const handleExpiryChange = (val: string) => {
        const cleaned = val.replace(/\D/g, '').substring(0, 4);
        if (cleaned.length >= 2) {
            setExpiryDate(`${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`);
        } else {
            setExpiryDate(cleaned);
        }
    };

    const handleCvvChange = (val: string) => {
        const cleaned = val.replace(/\D/g, '').substring(0, 4);
        setCvv(cleaned);
    };

    // Apply Coupon
    const handleApplyCoupon = () => {
        setCouponError('');
        const code = couponCode.trim().toUpperCase();
        if (code === 'WELCOME10') {
            setDiscountPercent(10);
            setAppliedCoupon('WELCOME10');
            triggerToast('Promo code WELCOME10 applied (10% Discount)!');
        } else if (code === 'SQURX20') {
            setDiscountPercent(20);
            setAppliedCoupon('SQURX20');
            triggerToast('Promo code SQURX20 applied (20% Discount)!');
        } else {
            setCouponError('Invalid promo code.');
        }
    };

    // Form Validator
    const validateCardDetails = () => {
        const errs: Record<string, string> = {};
        if (cardHolder.trim().length < 3) {
            errs.cardHolder = 'Cardholder name must be at least 3 letters';
        }
        if (cardNumber.replace(/\D/g, '').length !== 16) {
            errs.cardNumber = 'Card number must be exactly 16 digits';
        }
        const expClean = expiryDate.replace(/\D/g, '');
        if (expClean.length !== 4) {
            errs.expiryDate = 'Expiry date must be in MM/YY format';
        } else {
            const mm = parseInt(expClean.substring(0, 2));
            if (mm < 1 || mm > 12) {
                errs.expiryDate = 'Invalid month (01-12)';
            }
        }
        if (cvv.length < 3) {
            errs.cvv = 'CVV must be 3 or 4 digits';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // Checkout execution
    const handlePurchaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService || !validateCardDetails()) return;

        setCheckoutStep('processing');
        
        // Loop simulation stages
        const stages = [
            { t: 800, m: 'Securing end-to-end encrypted connection...' },
            { t: 1600, m: 'Validating credit card credentials with merchant bank...' },
            { t: 2400, m: 'Authorizing premium subscription matching tokens...' },
            { t: 3200, m: 'Settling invoice and generating product activation key...' }
        ];

        stages.forEach((s) => {
            setTimeout(() => {
                setProcessingMessage(s.m);
            }, s.t);
        });

        setTimeout(() => {
            setCheckoutStep('success');
            
            // Calculate details
            const subtotal = selectedService.price;
            const discountAmount = subtotal * (discountPercent / 100);
            const totalCost = subtotal - discountAmount;

            // Trigger actual recipient email with nodemailer!
            if (user?.email) {
                sendEmail(
                    `Order Confirmed: ${selectedService.name} Active`,
                    `Thank you for purchasing ${selectedService.name}!

Order Summary:
- Service: ${selectedService.name}
- Subtotal: $${subtotal.toFixed(2)}
- Discount Applied: $${discountAmount.toFixed(2)} (${appliedCoupon || 'None'})
- Amount Charged: $${totalCost.toFixed(2)}

Our specialized student care team has been notified. A career mentor will contact you within the next 24 hours to schedule and customize your product delivery. Welcome to premium matching!`
                );
            }
            triggerToast(`${selectedService.name} purchased successfully!`, 'success');
        }, 4000);
    };

    const handleOpenCheckout = (service: ServiceProduct) => {
        setSelectedService(service);
        setCheckoutStep('details');
        setCardHolder('');
        setCardNumber('');
        setExpiryDate('');
        setCvv('');
        setCouponCode('');
        setDiscountPercent(0);
        setAppliedCoupon('');
        setCouponError('');
        setErrors({});
        setIsModalOpen(true);
    };

    const subtotal = selectedService?.price || 0;
    const discountVal = subtotal * (discountPercent / 100);
    const finalVal = subtotal - discountVal;

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl space-y-10">
            {/* Header Hero */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> Premium Accelerator Services
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-950 tracking-tight leading-none">
                    Unfair Advantages to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Land Your Dream Job</span>
                </h1>
                <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto font-medium">
                    Boost your candidacy rankings, bypass mechanical screening algorithms, and practice live with elite coaches to secure higher salary offers.
                </p>
            </div>

            {/* Product Cards Grid */}
            <div className="grid md:grid-cols-2 gap-8">
                {PREMIUM_SERVICES.map((service) => {
                    const IconComponent = service.icon;
                    return (
                        <Card 
                            key={service.id} 
                            className="border-gray-200/80 shadow-md hover:shadow-xl hover:-translate-y-1 bg-white flex flex-col justify-between overflow-hidden relative group transition-all duration-300 rounded-3xl animate-in fade-in duration-300"
                        >
                            {/* Card Decorative Gradient Tag */}
                            <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${service.gradient}`} />
                            
                            <CardHeader className="p-6 pb-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${service.gradient} text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300`}>
                                        <IconComponent className="w-6 h-6" strokeWidth={1.75} />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {service.badge && (
                                            <Badge className="bg-amber-100 border border-amber-300 text-amber-800 font-bold uppercase text-[9px] tracking-wider rounded-full mb-1">
                                                {service.badge}
                                            </Badge>
                                        )}
                                        <div className="text-3xl font-black text-gray-950 tracking-tight">
                                            ${service.price}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 mt-4">
                                    <CardTitle className="text-lg font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {service.name}
                                    </CardTitle>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                        {service.description}
                                    </p>
                                </div>
                            </CardHeader>

                            <CardContent className="px-6 pb-6 pt-0 flex-1">
                                <div className="h-px bg-gray-100 my-4" />
                                <div className="space-y-2.5">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Features Included</p>
                                    {service.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
                                            <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                            </div>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>

                            <div className="px-6 pb-6 pt-0">
                                <Button 
                                    onClick={() => handleOpenCheckout(service)}
                                    className={`w-full h-11 rounded-2xl bg-gradient-to-r ${service.gradient} text-white font-bold shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2`}
                                >
                                    Activate Service <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Checkout dialog Modal */}
            {isModalOpen && selectedService && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl w-full max-w-lg border border-gray-200 shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
                        {/* Header banner */}
                        <div className={`p-6 text-white bg-gradient-to-r ${selectedService.gradient} flex justify-between items-start`}>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-white/80 tracking-widest">Premium Checkout</span>
                                <h3 className="text-xl font-black tracking-tight">{selectedService.name}</h3>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal content steps */}
                        {checkoutStep === 'details' && (
                            <form onSubmit={handlePurchaseSubmit} className="p-6 space-y-6">
                                {/* Credit Card Block */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 tracking-wider">
                                        <CreditCard className="w-4 h-4 text-gray-500" /> Card Details
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Cardholder Name</label>
                                        <Input 
                                            placeholder="John Doe"
                                            value={cardHolder}
                                            onChange={e => setCardHolder(e.target.value)}
                                            className={`h-11 rounded-xl ${errors.cardHolder ? 'border-red-500' : ''}`}
                                        />
                                        {errors.cardHolder && <p className="text-[10px] text-red-500 font-semibold pl-1">{errors.cardHolder}</p>}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Card Number</label>
                                        <Input 
                                            placeholder="1234-5678-9012-3456"
                                            value={cardNumber}
                                            onChange={e => handleCardNumberChange(e.target.value)}
                                            className={`h-11 rounded-xl ${errors.cardNumber ? 'border-red-500' : ''}`}
                                        />
                                        {errors.cardNumber && <p className="text-[10px] text-red-500 font-semibold pl-1">{errors.cardNumber}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Expiration Date</label>
                                            <Input 
                                                placeholder="MM/YY"
                                                value={expiryDate}
                                                onChange={e => handleExpiryChange(e.target.value)}
                                                className={`h-11 rounded-xl ${errors.expiryDate ? 'border-red-500' : ''}`}
                                            />
                                            {errors.expiryDate && <p className="text-[10px] text-red-500 font-semibold pl-1">{errors.expiryDate}</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">CVV</label>
                                            <Input 
                                                placeholder="123"
                                                type="password"
                                                value={cvv}
                                                onChange={e => handleCvvChange(e.target.value)}
                                                className={`h-11 rounded-xl ${errors.cvv ? 'border-red-500' : ''}`}
                                            />
                                            {errors.cvv && <p className="text-[10px] text-red-500 font-semibold pl-1">{errors.cvv}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Promo Code */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest pl-1">Promo Code</label>
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="e.g. WELCOME10, SQURX20"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value)}
                                            className="h-10 rounded-xl flex-1 uppercase"
                                        />
                                        <Button 
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            className="h-10 rounded-xl px-4 bg-gray-900 text-white font-bold hover:bg-gray-800 text-xs"
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                    {appliedCoupon && <p className="text-[10px] text-emerald-600 font-bold pl-1">Code {appliedCoupon} applied successfully!</p>}
                                    {couponError && <p className="text-[10px] text-red-500 font-semibold pl-1">{couponError}</p>}
                                </div>

                                {/* Payment pricing details */}
                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2">
                                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                                        <span>Subtotal</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                    {discountVal > 0 && (
                                        <div className="flex justify-between text-xs text-emerald-600 font-bold">
                                            <span>Promo Discount ({discountPercent}%)</span>
                                            <span>-${discountVal.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-gray-200/60 my-2" />
                                    <div className="flex justify-between text-sm font-black text-gray-900">
                                        <span>Total Charge</span>
                                        <span>${finalVal.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Secure badge info */}
                                <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-semibold text-center">
                                    <Lock className="w-3.5 h-3.5 text-gray-400" /> Fully Secured 256-bit SSL transaction gateway
                                </div>

                                {/* Form action trigger */}
                                <Button 
                                    type="submit"
                                    className={`w-full h-12 rounded-2xl bg-gradient-to-r ${selectedService.gradient} text-white font-black text-sm tracking-wide shadow-lg`}
                                >
                                    Authorize Payment • ${finalVal.toFixed(2)}
                                </Button>
                            </form>
                        )}

                        {checkoutStep === 'processing' && (
                            <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="relative w-16 h-16 flex items-center justify-center">
                                    <div className={`absolute inset-0 rounded-full border-4 border-gray-100 border-t-current animate-spin text-blue-600`} />
                                    <Lock className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-bold text-gray-900">Processing Secure Transaction</h4>
                                    <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto animate-pulse">
                                        {processingMessage}
                                    </p>
                                </div>
                            </div>
                        )}

                        {checkoutStep === 'success' && (
                            <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-inner relative overflow-hidden">
                                    <div className="absolute inset-0 bg-emerald-400/20 blur-xl animate-pulse"/>
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 relative z-10" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-black text-gray-900">Purchase Completed!</h4>
                                    <p className="text-xs text-gray-500 font-medium max-w-sm mx-auto leading-relaxed">
                                        Your premium subscription for <strong className="text-gray-950 font-bold">{selectedService.name}</strong> has been activated. A confirmation receipt has been sent to <strong className="text-gray-950 font-bold">{user?.email}</strong>.
                                    </p>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 w-full text-xs text-left text-gray-600 space-y-1.5 leading-relaxed font-medium">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">What Happens Next?</p>
                                    <p>1. Our expert mentorship team has received your profile metrics.</p>
                                    <p>2. A dedicated representative will reach out via email/phone in less than 24 hours.</p>
                                    <p>3. We will schedule your mentor session or deliver your custom resume.</p>
                                </div>
                                <Button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full h-11 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800"
                                >
                                    Return to Marketplace
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom toast alerts */}
            {toast.show && (
                <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-semibold ${
                        toast.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : 'bg-destructive/10 border-destructive/20 text-destructive'
                    }`}>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
