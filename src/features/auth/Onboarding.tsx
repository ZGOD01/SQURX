import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store';
import { useStudentStore } from '../student/store';
import { Button, Input, Modal } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { ArrowRight, Loader2, Search, Check, Plus } from 'lucide-react';

const ALL_DOMAINS = [
    'Software Engineering', 'Data Science & AI', 'Product Management', 'UI/UX Design',
    'Operations & Strategy', 'Quality Assurance', 'Marketing & Growth', 'Sales & BizDev',
    'Finance & Accounting', 'Venture Capital', 'Management Consulting', 'Healthcare',
    'Supply Chain & Logistics', 'Human Resources', 'Legal & Compliance', 'Cybersecurity',
    'Cloud Architecture', 'Mechanical Engineering', 'Electrical Engineering', 'Media & Journalism',
    'Education & EdTech', 'Real Estate', 'Game Development'
].sort();

export function Onboarding() {
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const navigate = useNavigate();

    const { user } = useAuthStore();
    const { updateProfile } = useStudentStore();

    const filteredDomains = useMemo(() => {
        if (!searchQuery) return ALL_DOMAINS;
        return ALL_DOMAINS.filter(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery]);

    const handleContinue = async () => {
        if (!selectedDomain || !user) return;
        setIsConfirmModalOpen(false);
        setIsLoading(true);
        try {
            await updateProfile(user.id, { careerGoal: selectedDomain });
            navigate('/student');
        } catch (err) {
            console.error(err);
            setIsLoading(false);
        }
    };

    return (
        <PageTransition className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4 sm:p-8 font-sans text-black overflow-hidden relative selection:bg-black/10">
            {/* Elegant Background Grid & Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-black opacity-[0.03] blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10 flex flex-col items-center py-12">
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl lg:text-5xl font-light tracking-tight mb-4">
                            Choose your <span className="font-bold">Domain.</span>
                        </h1>
                        <p className="text-black/50 text-[17px] font-light max-w-lg mx-auto leading-relaxed">
                            Personalize your experience by selecting a core focus area. We'll tailor your dashboard and recommendations based on this preference.
                        </p>
                    </motion.div>
                </div>

                {/* Search Bar */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="w-full max-w-md mx-auto mb-10 relative group"
                >
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-black transition-colors">
                        <Search className="w-5 h-5" />
                    </div>
                    <Input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a domain (e.g. Finance, Design...)"
                        className="w-full pl-12 pr-4 py-6 text-[17px] rounded-2xl border-black/10 focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black bg-white/60 backdrop-blur-md shadow-sm transition-all"
                    />
                </motion.div>

                {/* Selectable Domains Grid (Pills Matrix) */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full max-w-3xl flex flex-wrap justify-center gap-3 md:gap-4 max-h-[40vh] overflow-y-auto px-4 pb-8 mask-image-bottom"
                >
                    <AnimatePresence>
                        {searchQuery.trim() !== '' && !filteredDomains.some(d => d.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                            <motion.button
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setSelectedDomain(searchQuery.trim())}
                                className={`px-5 py-3 rounded-xl border text-[15px] md:text-[16px] font-medium transition-all duration-300 flex items-center gap-2
                                    ${selectedDomain === searchQuery.trim() 
                                        ? 'bg-black text-white border-black shadow-md scale-105' 
                                        : 'bg-white/80 border-blue-200 text-blue-600 hover:border-blue-400 hover:text-blue-700 hover:bg-white backdrop-blur-md border-dashed'
                                    }
                                `}
                            >
                                {selectedDomain === searchQuery.trim() ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                Add & Select "{searchQuery.trim()}"
                            </motion.button>
                        )}
                        
                        {filteredDomains.length === 0 ? (
                            <motion.p 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="text-muted-foreground text-center w-full py-6 mt-4 opacity-60 text-sm"
                            >
                                No exact matches. You can create your custom domain above.
                            </motion.p>
                        ) : (
                            filteredDomains.map((domain) => {
                                const isSelected = selectedDomain === domain;
                                return (
                                    <motion.button
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2 }}
                                        key={domain}
                                        onClick={() => setSelectedDomain(domain)}
                                        className={`px-5 py-3 rounded-xl border text-[15px] md:text-[16px] font-medium transition-all duration-300 flex items-center gap-2
                                            ${isSelected 
                                                ? 'bg-black text-white border-black shadow-md scale-105' 
                                                : 'bg-white/80 border-black/10 text-black/70 hover:border-black/30 hover:text-black hover:bg-white backdrop-blur-md'
                                            }
                                        `}
                                    >
                                        {isSelected && <Check className="w-4 h-4" />}
                                        {domain}
                                    </motion.button>
                                );
                            })
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: selectedDomain ? 1 : 0, y: selectedDomain ? 0 : 20 }}
                    className="mt-8 w-full max-w-sm absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
                >
                    <Button
                        onClick={() => setIsConfirmModalOpen(true)}
                        disabled={!selectedDomain || isLoading}
                        className="w-full bg-black text-white hover:bg-black/90 rounded-full h-14 font-medium shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center text-lg relative overflow-hidden group"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                        
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing Dashboard</>
                        ) : (
                            <>Continue <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
                        )}
                    </Button>
                </motion.div>
            </div>

            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Domain">
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        You have selected <strong className="text-foreground">{selectedDomain}</strong> as your core career domain.
                        We will construct your entire dashboard, networking path, and opportunities around this focus.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Change</Button>
                        <Button className="bg-black text-white px-6 font-semibold" onClick={handleContinue}>
                            Confirm & Continue <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </Modal>

            <style dangerouslySetInnerHTML={{__html: `
                .mask-image-bottom {
                    mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
                }
            `}} />
        </PageTransition>
    );
}
