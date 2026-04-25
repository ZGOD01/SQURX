import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store';
import { useLoginMutation } from '@/lib/store/authApi';
import { Button, Input, Toast } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { loginSchema, type LoginFormValues } from '@/lib/validators/auth';
import { Loader2, ArrowRight, KeyRound } from 'lucide-react';

export function Login() {
    const [toast, setToast] = useState<{ open: boolean; type: 'success'|'error'|'info'; title: string; message: string }>({ open: false, type: 'success', title: '', message: '' });

    const showToast = (type: 'success'|'error'|'info', title: string, message: string) => {
        setToast({ open: true, type, title, message });
        setTimeout(() => setToast(prev => ({ ...prev, open: false })), 4000);
    };
    const navigate = useNavigate();
    const location = useLocation();
    const { setAuth } = useAuthStore();
    const [loginMutation, { isLoading }] = useLoginMutation();

    const { register: formRegister, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' }
    });

    const from = location.state?.from?.pathname || null;

    const onSubmit = async (data: LoginFormValues) => {
        try {
            const result = await loginMutation(data).unwrap();
            
            if (result.success && result.data?.token) {
                setAuth(result.data.user, result.data.token);
                showToast('success', 'Welcome Back', 'Logged in safely. Redirecting...');
                
                const role = String(result.data.user.role).toUpperCase();
                
                setTimeout(() => {
                    if (from && from !== '/' && from !== '/auth/login') {
                        navigate(from);
                    } else {
                        switch (role) {
                            case 'STUDENT': navigate('/auth/onboarding'); break;
                            case 'RECRUITER': navigate('/recruiter'); break;
                            case 'ADMIN': navigate('/admin'); break;
                            default: navigate('/auth/onboarding'); break;
                        }
                    }
                }, 1200);
            } else {
                 throw new Error(result.message || 'Login failed');
            }
        } catch (err: any) {
            showToast('error', 'Login Failed', err.data?.message || err.message || 'Login failed. Please check your credentials.');
        }
    };

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
                    <Link to="/" className="inline-block hover:scale-105 transition-transform duration-300">
                        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-8 mx-auto lg:mx-0 shadow-2xl shadow-black/20">
                            <span className="text-white text-3xl font-bold tracking-tighter">Sq</span>
                        </div>
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-light tracking-tight mb-6">
                        Welcome <br />
                        <span className="font-bold">back.</span>
                    </h1>
                    <p className="text-black/50 text-lg font-light max-w-md mx-auto lg:mx-0 leading-relaxed">
                        Sign in to access your personalized dashboard, continue your journey, and explore new opportunities.
                    </p>

                    <div className="hidden lg:flex items-center gap-4 mt-12 bg-white p-4 rounded-2xl border border-black/5 shadow-sm max-w-sm">
                        <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                            <KeyRound className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold">Secure Login</h4>
                            <p className="text-xs text-black/50 mt-0.5">Your credentials are safe with us.</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: 3D Form Container */}
                <div className="w-full max-w-md lg:flex-1 relative" style={{ perspective: "2000px" }}>

                    <div className="relative w-full">
                        <motion.div
                            initial={{ opacity: 0, rotateY: -15, scale: 0.9, x: 50, z: -100 }}
                            animate={{ opacity: 1, rotateY: 0, scale: 1, x: 0, z: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.6 }}
                            className="bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 sm:p-10 flex flex-col relative z-10"
                            style={{ transformStyle: "preserve-3d" }}
                        >
                            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full space-y-6">

                                <div className="space-y-2 mb-2">
                                    <h2 className="text-3xl font-light tracking-tight">Sign In</h2>
                                    <p className="text-black/50 font-light">Enter your credentials below.</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2 group">
                                        <label className="text-xs font-semibold text-black/70 uppercase tracking-widest pl-1 group-focus-within:text-black transition-colors" htmlFor="email">Email Address</label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="e.g. name@university.edu"
                                            className={`h-14 bg-black/[0.02] border-black/10 focus-visible:bg-white focus-visible:border-black focus-visible:ring-4 focus-visible:ring-black/5 font-light rounded-xl transition-all text-lg shadow-inner ${errors.email ? 'border-red-500 focus-visible:border-red-500' : ''}`}
                                            {...formRegister('email')}
                                        />
                                        {errors.email && <p className="text-red-500 text-xs pl-1 mt-1">{errors.email.message}</p>}
                                    </div>

                                    <div className="space-y-2 group">
                                        <div className="flex justify-between items-center pl-1">
                                            <label className="text-xs font-semibold text-black/70 uppercase tracking-widest group-focus-within:text-black transition-colors" htmlFor="password">Password</label>
                                            <Link to="/auth/forgot-password" className="text-[10px] font-bold tracking-widest uppercase text-black/40 hover:text-black transition-colors border-b border-transparent hover:border-black pb-0.5">Forgot password?</Link>
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className={`h-14 bg-black/[0.02] border-black/10 focus-visible:bg-white focus-visible:border-black focus-visible:ring-4 focus-visible:ring-black/5 font-light rounded-xl transition-all text-lg shadow-inner ${errors.password ? 'border-red-500 focus-visible:border-red-500' : ''}`}
                                            {...formRegister('password')}
                                        />
                                        {errors.password && <p className="text-red-500 text-xs pl-1 mt-1">{errors.password.message}</p>}
                                    </div>
                                </div>

                                {/* Navigation Footer */}
                                <div className="mt-8 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-black text-white hover:bg-black/90 rounded-full h-14 font-medium shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center text-lg hidden"
                                        style={{ display: 'flex' }}
                                    >
                                        {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in</> : <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>

                    <div className="text-center text-sm text-black/50 font-light mt-10">
                        Don't have an account? <Link to="/auth/register" className="text-black font-semibold hover:underline underline-offset-4">Sign up here</Link>
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

