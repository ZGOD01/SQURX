import { StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';

export function Stats() {
    const stats = [
        { value: "95%", label: "Placement Rate" },
        { value: "40+", label: "Partner Universities" },
        { value: "10k+", label: "Global Network" },
        { value: "24/7", label: "Concierge Support" },
    ];

    return (
        <section className="relative z-20 -mt-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
            <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] rounded-[2rem] p-8 md:p-12 hidden md:block transition-all hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)]">
                <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-blue-100/60">
                    {stats.map((stat, i) => (
                        <StaggerItem key={i} className="text-center px-4 relative group">
                            <HoverLift>
                                <h3 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-blue-900 to-blue-500 mb-2 drop-shadow-sm group-hover:scale-105 transition-transform">
                                    {stat.value}
                                </h3>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                            </HoverLift>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            </div>

            {/* Mobile simplified view */}
            <div className="md:hidden grid grid-cols-2 gap-4 bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl p-6">
                {stats.map((stat, i) => (
                    <div key={i} className="text-center">
                        <h3 className="text-2xl font-extrabold text-blue-700">{stat.value}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{stat.label}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
