import { useNotificationStore } from '@/lib/store/notifications';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Mail, Sparkles } from 'lucide-react';

export function EmailToaster() {
    const { emails, dismissEmail } = useNotificationStore();

    return (
        <div className="fixed top-6 right-6 z-[999] flex flex-col gap-4 pointer-events-none">
            <AnimatePresence>
                {emails.map(email => (
                    <motion.div
                        key={email.id}
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }}
                        className="pointer-events-auto w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-black/5 overflow-hidden flex flex-col relative group"
                    >
                        {/* Fake Gmail Header */}
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2 border-b border-red-500/10 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-red-500 max-w-[16px]" />
                            <span className="text-[10px] font-bold text-red-600 tracking-wider">NEW EMAIL ALERT</span>
                            <button onClick={() => dismissEmail(email.id)} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/5 rounded-full cursor-pointer">
                                <X className="w-3.5 h-3.5 text-black/40 hover:text-black" />
                            </button>
                        </div>
                        <div className="p-4 relative">
                            <h4 className="font-bold text-sm text-black mb-1.5 leading-tight pr-4">{email.subject}</h4>
                            <p className="text-xs text-black/60 leading-relaxed font-medium">{email.body}</p>

                            {email.actionUrl && (
                                <div className="mt-3">
                                    <a href={email.actionUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2 transition-colors inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                                        View Generated Email Html
                                    </a>
                                </div>
                            )}

                            <div className="text-[10px] text-black/30 mt-4 font-semibold flex items-center justify-between">
                                Just now • via Squrx Mailer
                                <Sparkles className="w-3 h-3 text-yellow-500 opacity-50" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
