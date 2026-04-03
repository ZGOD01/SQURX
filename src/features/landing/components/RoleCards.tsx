import { motion } from 'framer-motion';
import { ArrowUpRight, GraduationCap, Building2, Sparkles } from 'lucide-react';

const ROLES = [
    {
        title: "Students & Grads",
        subtitle: "The Dreamers",
        desc: "Stop applying into the void. Build your profile, showcase your real vibe, and let the perfect opportunities magically find you.",
        icon: GraduationCap,
        tags: ["Profile Building", "Mentorship", "Jobs"],
        bgOrb1: "bg-blue-400/20",
        bgOrb2: "bg-indigo-400/20",
        iconGradient: "from-blue-600 to-indigo-600",
        tagTheme: "bg-blue-50/80 text-blue-700 border-blue-200/50 hover:bg-blue-100",
        hoverShadow: "hover:shadow-blue-500/10 hover:border-blue-200"
    },
    {
        title: "Companies",
        subtitle: "The Builders",
        desc: "Culture fit matters more than a resume. Connect with brilliant, motivated individuals who match your incredible team's energy.",
        icon: Building2,
        tags: ["Hiring", "Culture", "Talent"],
        bgOrb1: "bg-orange-400/20",
        bgOrb2: "bg-rose-400/20",
        iconGradient: "from-orange-500 to-rose-500",
        tagTheme: "bg-orange-50/80 text-orange-700 border-orange-200/50 hover:bg-orange-100",
        hoverShadow: "hover:shadow-orange-500/10 hover:border-orange-200"
    },
    {
        title: "Mentors",
        subtitle: "The Guides",
        desc: "Share your journey. Shape the next generation of bright minds and get rewarded for making a genuine difference in their lives.",
        icon: Sparkles,
        tags: ["Networking", "Guidance", "Impact"],
        bgOrb1: "bg-emerald-400/20",
        bgOrb2: "bg-teal-400/20",
        iconGradient: "from-emerald-500 to-teal-500",
        tagTheme: "bg-emerald-50/80 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100",
        hoverShadow: "hover:shadow-emerald-500/10 hover:border-emerald-200"
    }
];

export function RoleCards() {
    return (
        <section className="relative py-24 w-full bg-[#fafafa] overflow-hidden">
            {/* Global background ambient glow */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-blue-100/40 via-purple-50/40 to-transparent rounded-full blur-[100px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-50/40 via-amber-50/40 to-transparent rounded-full blur-[100px] pointer-events-none transform -translate-x-1/3 translate-y-1/3" />

            <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10">

                <div className="mb-20 flex flex-col items-center text-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-gray-200 mb-8 shadow-sm"
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-gray-800 text-[13px] font-extrabold tracking-widest uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            The Ecosystem
                        </span>
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl md:text-[64px] text-[#111] tracking-tighter leading-[1.05] font-black mb-8 max-w-2xl" 
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        A place for{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">
                            everyone.
                        </span>
                    </motion.h2>

                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-[18px] md:text-[20px] text-gray-500 leading-[1.7] font-medium max-w-xl mx-auto"
                    >
                        No matter where you are in your career journey, there's a space designed exactly for your energy.
                    </motion.p>
                </div>

                {/* The "Glassmorphic Light" Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                    {ROLES.map((role, i) => {
                        const Icon = role.icon;
                        return (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.7, delay: i * 0.15, ease: "easeOut" }}
                                className={`group flex flex-col bg-white/70 backdrop-blur-2xl rounded-[3rem] p-8 md:p-10 border-[1.5px] border-white shadow-xl shadow-black/[0.03] transition-all duration-500 hover:-translate-y-3 cursor-pointer relative overflow-hidden ${role.hoverShadow}`}
                            >
                                {/* Floating Background Color Orbs inside the card */}
                                <div className={`absolute -top-20 -right-20 w-64 h-64 ${role.bgOrb1} rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000 ease-out`} />
                                <div className={`absolute -bottom-32 -left-20 w-72 h-72 ${role.bgOrb2} rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 ease-out`} />
                                
                                {/* Overlay gradient to keep text crisp */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/80 to-white z-0" />

                                {/* Top Header: Circular Icon + Background */}
                                <div className="relative z-10 flex justify-between items-start mb-12">
                                    {/* Glassy floating icon */}
                                    <div className="relative flex items-center justify-center">
                                        <div className={`absolute inset-0 bg-gradient-to-br ${role.iconGradient} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 rounded-full`} />
                                        <div className={`relative w-20 h-20 rounded-[2rem] bg-gradient-to-br ${role.iconGradient} flex items-center justify-center shadow-lg shadow-black/5 transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 ease-in-out`}>
                                            <Icon className="w-9 h-9 text-white" strokeWidth={2} />
                                        </div>
                                    </div>

                                    {/* Super sleek text badge */}
                                    <div className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-full border border-gray-100 shadow-sm mt-1">
                                        <span className="font-bold text-[11px] text-[#111] uppercase tracking-[0.2em]">{role.subtitle}</span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="relative z-10 flex-1 flex flex-col">
                                    <h3 className="text-[32px] font-black text-[#111] mb-5 tracking-tight leading-[1.1]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        {role.title}
                                    </h3>
                                    
                                    <p className="text-gray-600 font-medium text-[16px] md:text-[17px] leading-[1.7] mb-10">
                                        {role.desc}
                                    </p>

                                    {/* Lush Pastel Tags */}
                                    <div className="flex flex-wrap gap-2.5 mb-12 mt-auto">
                                        {role.tags.map((tag, idx) => (
                                            <div key={idx} className={`px-4 py-1.5 rounded-xl text-[13px] font-bold tracking-wide transition-colors duration-300 border backdrop-blur-sm ${role.tagTheme}`}>
                                                {tag}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Next-gen "Explore" Button */}
                                    <div className="flex items-center justify-between pt-6 mt-auto border-t border-gray-200/60 transition-colors duration-300 group-hover:border-gray-300">
                                        <span className="font-extrabold text-[17px] text-[#111]" style={{ fontFamily: "'Outfit', sans-serif" }}>Explore Space</span>
                                        <div className={`w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm transition-all duration-500 group-hover:bg-gradient-to-br ${role.iconGradient} group-hover:border-transparent group-hover:shadow-lg group-hover:text-white group-hover:scale-110 group-active:scale-95`}>
                                            <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-500" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>

                            </motion.div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
