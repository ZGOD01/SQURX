import { motion } from 'framer-motion';
import { Sparkles, Map, Users } from 'lucide-react';

const CARDS = [
    {
        id: "spark",
        title: "Discover Your Spark",
        description: "We don't use boring algorithms. We find out what makes you tick and align it with roles you actually care about.",
        icon: Sparkles,
        // Orange/Peach Theme
        themeBadge: "bg-orange-50 text-orange-600 border-orange-100",
        themeGradient: "bg-gradient-to-br from-orange-50/50 to-white",
        themeShadow: "hover:shadow-orange-500/10",
        themeRing: "hover:ring-orange-500/20",
        yOffset: "md:-translate-y-0"
    },
    {
        id: "path",
        title: "Find Your Path",
        description: "Interactive, joyful roadmaps that turn daunting career goals into fun, achievable daily side quests.",
        icon: Map,
        // Blue/Indigo Theme
        themeBadge: "bg-blue-50 text-blue-600 border-blue-100",
        themeGradient: "bg-gradient-to-br from-blue-50/50 to-white",
        themeShadow: "hover:shadow-blue-500/10",
        themeRing: "hover:ring-blue-500/20",
        yOffset: "md:translate-y-8 lg:translate-y-12"
    },
    {
        id: "people",
        title: "Meet Your People",
        description: "Connect with mentors who aren't just experts, but incredible human beings who genuinely want to help.",
        icon: Users,
        // Emerald/Mint Theme
        themeBadge: "bg-emerald-50 text-emerald-600 border-emerald-100",
        themeGradient: "bg-gradient-to-br from-emerald-50/50 to-white",
        themeShadow: "hover:shadow-emerald-500/10",
        themeRing: "hover:ring-emerald-500/20",
        yOffset: "md:translate-y-16 lg:translate-y-24"
    }
];

export function RefreshingApproach() {
    return (
        <section className="relative w-full bg-white py-16 md:py-20 overflow-hidden">
            {/* Soft ambient background glow */}
            <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-gray-50/80 to-transparent pointer-events-none" />

            <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 text-center">
                
                {/* Heading Area */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center mb-16 md:mb-20"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-50/80 border border-blue-100 mb-8 shadow-sm"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                        </span>
                        <span className="text-blue-700 text-[13px] font-extrabold tracking-widest uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            The SQURX Difference
                        </span>
                    </motion.div>

                    <h2 className="text-4xl md:text-5xl lg:text-[56px] font-semibold tracking-[-0.02em] text-[#111] leading-[1.1] max-w-2xl mx-auto relative z-10" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {/* The requested purple localized deep circle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] bg-purple-600/40 rounded-full blur-[50px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '4s' }} />
                        
                        <span className="relative z-10">A refreshing approach to</span>
                        <br className="hidden md:block" />
                        <span className="text-blue-600 ml-2 md:ml-0 mt-1 inline-block relative z-10">
                            success.
                        </span>
                    </h2>
                </motion.div>

                {/* Staggered Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 pb-8 lg:pb-16">
                    {CARDS.map((card, index) => {
                        const Icon = card.icon;
                        return (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.7, delay: index * 0.2, ease: "easeOut" }}
                                className={`relative flex flex-col items-start text-left p-8 lg:p-12 rounded-[2rem] border-[1.5px] border-gray-100 shadow-xl shadow-black/[0.02] transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] ring-4 ring-transparent ${card.themeGradient} ${card.themeShadow} ${card.themeRing} ${card.yOffset} overflow-hidden group`}
                            >
                                {/* Background massive watermark icon */}
                                <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.06] group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                                    <Icon size={240} strokeWidth={1} />
                                </div>

                                {/* Icon Badge */}
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border transition-transform duration-500 group-hover:scale-110 ${card.themeBadge}`}>
                                    <Icon size={24} strokeWidth={2.5} />
                                </div>

                                {/* Content */}
                                <h3 className="text-2xl md:text-[28px] font-black tracking-tight text-[#111] mb-4 relative z-10" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {card.title}
                                </h3>
                                <p className="text-gray-500 font-medium leading-[1.7] text-[16px] md:text-[17px] relative z-10">
                                    {card.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
