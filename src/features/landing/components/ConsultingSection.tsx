import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POINTS = [
    "Our approach is Outcome driven and thus we give heavy importance in our counselling sessions to finalise the desired outcome of a student in terms of his career after his overseas education.",
    "Our proprietary system analyses various datasets to come up with the right course options, country options and university options to target and we share the basis on which we have come up with the options.",
    "We work with around 800 universities in 34 countries and thus so we can choose the best few among the best many.",
    "Our proprietary system is so designed to analyse the skill gaps and ensure to close them along with the overseas education increasing the chances of student’s success.",
    "We manage every complexity of your global transition, including university selection, Course selection, Loan approvals, visa processing, accommodation, placement assistance and international settlement at NO COST TO students.",
    "We act as your lifelong partner, tracking your progress through a concierge-level service until your professional goals are fully realized."
];

export function ConsultingSection() {
    const navigate = useNavigate();

    return (
        <section className="w-full bg-white py-16 md:py-20 border-t border-gray-100">
            <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-12 lg:gap-20">
                
                {/* Left Side Quote - The Inverse Square Law */}
                <div className="w-full md:w-[45%] flex flex-col">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="bg-[#050505] text-white p-10 md:p-14 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-full flex flex-col justify-center border border-gray-900"
                    >
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                        
                        <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-10 border border-white/10">
                            <Lightbulb className="text-white w-8 h-8" strokeWidth={1.5} />
                        </div>
                        
                        <h3 className="text-3xl md:text-3xl lg:text-[34px] leading-[1.3] font-medium mb-10 text-gray-200" style={{ fontFamily: "'Playfair Display', serif" }}>
                            "Physics says that the further you are from the light, the darker it gets. We believe the same applies to your career."
                        </h3>
                        
                        <p className="text-gray-400 font-sans text-[16px] md:text-[18px] leading-[1.7] mb-8 font-medium">
                            If you are even a small distance away from the right University, the right course, the right skills or the right ROI, your chances of getting a job/Outcome don't just decrease—<span className="text-white font-bold tracking-wider">they vanish.</span>
                        </p>
                        
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 mb-10 backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500" />
                            <p className="text-gray-300 text-[15px] md:text-base leading-relaxed font-sans font-medium">
                                Every wrong step you take away from the market demand decreases your job chances by the square of that distance... <strong className="text-blue-400 font-bold tracking-wide">Basis Inverse Square Law.</strong>
                            </p>
                        </div>

                        <p className="text-gray-100 font-semibold text-[17px] md:text-lg font-sans leading-relaxed">
                            If you are an Indian student thinking of studying abroad take advantage of our proprietary system and live datasets to position yourself correctly... <span className="inline-block mt-2 bg-white text-black px-3 py-1 rounded-lg font-black tracking-tight uppercase text-sm h-[26px] leading-[18px]">at NO COST.</span>
                        </p>

                    </motion.div>
                </div>

                {/* Right Side - Career Strategist Timeline */}
                <div className="w-full md:w-[55%] flex flex-col justify-center py-6">
                    <motion.div 
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl md:text-5xl lg:text-[56px] font-black text-[#111] mb-12 tracking-[-0.03em]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Career Strategist
                        </h2>

                        <div className="space-y-10 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[22px] top-6 bottom-6 w-[2px] bg-gray-100" />
                            
                            {POINTS.map((point, idx) => (
                                <div key={idx} className="flex gap-6 relative group">
                                    <div className="w-12 h-12 rounded-full bg-white border-[2px] border-gray-200 flex items-center justify-center shrink-0 shadow-sm relative z-10 group-hover:border-[#111] group-hover:bg-[#111] group-hover:text-white transition-all duration-300 group-hover:scale-110">
                                        <span className="font-bold text-[16px] mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>{idx + 1}</span>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-[17px] text-gray-500 leading-[1.7] font-medium group-hover:text-gray-900 transition-colors duration-300">
                                            {point}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

            </div>

            {/* Bottom Callout Ribbon */}
            <div className="max-w-[1400px] mx-auto px-6 md:px-12 mt-16 md:mt-20">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="w-full bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between border-[1.5px] border-blue-100/50 shadow-lg shadow-blue-500/5 transform transition-all group overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-[500px] h-full bg-gradient-to-l from-white/40 to-transparent pointer-events-none" />

                    <div className="mb-6 md:mb-0 md:mr-8 text-center md:text-left flex-1 relative z-10">
                        <h4 className="text-2xl md:text-[32px] font-black tracking-tighter text-[#111] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Already studying overseas?
                        </h4>
                        <p className="text-gray-600 font-medium text-[16px] md:text-lg">
                            I am an Indian international student already studying overseas.
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate('/jobs')} 
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-3 px-8 justify-center rounded-2xl font-bold h-[60px] w-full md:w-auto text-[16px] shadow-xl shadow-blue-600/20 transition-all duration-300 hover:scale-[1.03] active:scale-95 shrink-0 whitespace-nowrap relative z-10 group-hover:shadow-blue-600/30"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        Go to Global Job Board <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <p className="absolute bottom-4 right-12 text-[10px] font-bold text-blue-400 uppercase tracking-widest hidden md:block opacity-50">
                        All the Best...
                    </p>
                </motion.div>
            </div>

        </section>
    );
}
