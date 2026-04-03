import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

export function WhoWeAre() {
    return (
        <section className="relative w-full bg-white pt-4 pb-16 border-t border-gray-100 overflow-hidden">
            
            {/* Extremely subtle ambient floaters */}
            <motion.div 
                animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-20 right-[-10%] w-[600px] h-[600px] bg-gradient-to-bl from-blue-50/40 via-purple-50/20 to-transparent blur-[80px] rounded-full pointer-events-none" 
            />

            <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10">
                
                {/* Minimalist Aesthetic Heading */}
                <motion.div 
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-100 pb-8 relative"
                >
                    {/* Animated Line growing under heading */}
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                        className="absolute bottom-[-1px] left-0 h-[2px] bg-blue-600 w-32 origin-left"
                    />

                    <motion.div variants={fadeUp}>
                        <div className="inline-flex items-center gap-2 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            <span className="text-blue-600 font-semibold tracking-widest uppercase text-[11px]" style={{ fontFamily: "'Outfit', sans-serif" }}>Our DNA</span>
                        </div>
                        <h2 className="text-4xl md:text-[56px] font-medium text-[#111] tracking-tight leading-[1.1]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            Who we are.
                        </h2>
                    </motion.div>
                </motion.div>

                {/* Content rows - 1/3 and 2/3 Aesthetic Split */}
                <div className="flex flex-col gap-14 relative">
                    
                    {/* Background Progress Line */}
                    <div className="absolute left-6 md:left-[33%] top-4 bottom-4 w-px bg-gray-100 hidden md:block" />

                    {/* The Strategy */}
                    <motion.div 
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="flex flex-col md:flex-row gap-6 md:gap-16 relative group"
                    >
                        <motion.div variants={fadeUp} className="md:w-1/3 flex items-start gap-4">
                            <span className="font-['Outfit'] font-black text-gray-200 text-3xl group-hover:text-blue-500 transition-colors duration-500 mt-1">01</span>
                            <h3 className="text-2xl text-[#111] font-medium tracking-tight mt-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>The Strategy</h3>
                        </motion.div>
                        <motion.div variants={fadeUp} className="md:w-2/3">
                            <p className="text-[19px] md:text-[24px] font-light text-gray-600 leading-[1.6]">
                                We are a premier career strategy firm for individuals who refuse to leave their professional success to chance. We believe that an international education should be a strategic investment in a specific future, <strong className="font-semibold text-[#111] relative inline-block">
                                    not a leap into the unknown.
                                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-600/20" />
                                </strong>
                            </p>
                        </motion.div>
                    </motion.div>

                    {/* The Career Cohort - Powerful gradient impact */}
                    <motion.div 
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="flex flex-col md:flex-row gap-6 md:gap-16 relative group"
                    >
                        <motion.div variants={fadeUp} className="md:w-1/3 flex items-start gap-4">
                            <span className="font-['Outfit'] font-black text-gray-200 text-3xl group-hover:text-indigo-500 transition-colors duration-500 mt-1">02</span>
                            <h3 className="text-2xl text-indigo-600 font-medium tracking-tight mt-1.5 flex items-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                The Cohort
                            </h3>
                        </motion.div>
                        <motion.div variants={fadeUp} className="md:w-2/3">
                            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/30 border border-indigo-100/60 rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden group/card hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-700 ease-out transform hover:-translate-y-1">
                                {/* Animated ambient background */}
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-400/10 blur-[60px] rounded-full pointer-events-none group-hover/card:bg-indigo-400/20 transition-colors duration-700" 
                                />
                                
                                <p className="text-[17px] md:text-[20px] font-medium text-indigo-950/80 leading-[1.8] relative z-10">
                                    Beyond our global job board lies our <span className="text-indigo-600 font-bold border-b-2 border-indigo-300">most exclusive offering</span>. By invitation or application only, we move beyond generic advice to provide a level of strategic clarity that isn't available through public channels. 
                                    <br /><br />
                                    We guide you through a comprehensive end-to-end transition—from your first application to your relocation and your desired career designation—leveraging our deep industry insights and institutional relationships to create a frictionless path.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Lifelong Partner */}
                    <motion.div 
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="flex flex-col md:flex-row gap-6 md:gap-16 relative group"
                    >
                        <motion.div variants={fadeUp} className="md:w-1/3 flex items-start gap-4">
                            <span className="font-['Outfit'] font-black text-gray-200 text-3xl group-hover:text-emerald-500 transition-colors duration-500 mt-1">03</span>
                            <h3 className="text-2xl text-[#111] font-medium tracking-tight mt-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>Lifelong Partner</h3>
                        </motion.div>
                        <motion.div variants={fadeUp} className="md:w-2/3 pl-0 md:pl-2">
                            <p className="text-[18px] md:text-[20px] font-light text-gray-500 leading-[1.8]">
                                We handle the intricacies of university selection, visas, and global settlement. We don't just help you study abroad; we ensure you are positioned for the role you were meant for. 
                                <br /><br />
                                We provide a <strong className="font-semibold text-gray-900 border-b-2 border-gray-300">concierge-level service</strong> that tracks your progress until your professional goals are fully realized.
                            </p>
                        </motion.div>
                    </motion.div>

                </div>

                {/* Powerful Impact Pitch - Aesthetic Typography */}
                <motion.div 
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    className="mt-16 text-center py-16 border-t border-b border-gray-100 relative group overflow-hidden"
                >
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[120px] bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-[60px] pointer-events-none" 
                    />
                    
                    <motion.h2 
                        variants={fadeUp}
                        className="text-4xl md:text-5xl lg:text-[64px] font-light text-[#111] tracking-tight leading-[1.1] max-w-5xl mx-auto relative z-10" 
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        <span className="italic text-gray-400 block mb-4">"You bring the ambition;</span>
                        <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 inline-block drop-shadow-sm pb-2">
                             We provide the roadmap."
                        </span>
                    </motion.h2>
                </motion.div>

            </div>
        </section>
    );
}
