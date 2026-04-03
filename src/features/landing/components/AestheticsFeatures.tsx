import { FadeInOnView } from '@/components/motion';
import { Sparkle, Compass, UserPlus } from 'lucide-react';

const FEATURES = [
    {
        title: "Discover Your Spark",
        desc: "We don't use boring algorithms. We find out what makes you tick and align it with roles you actually care about.",
        icon: Sparkle,
        bgColor: "bg-gray-50",
        iconColor: "text-[#111]"
    },
    {
        title: "Find Your Path",
        desc: "Interactive, joyful roadmaps that turn daunting career goals into fun, achievable daily side quests.",
        icon: Compass,
        bgColor: "bg-gray-50",
        iconColor: "text-[#111]"
    },
    {
        title: "Meet Your People",
        desc: "Connect with mentors who aren't just experts, but incredible human beings who genuinely want to help.",
        icon: UserPlus,
        bgColor: "bg-gray-50",
        iconColor: "text-[#111]"
    }
];

export function AestheticsFeatures() {
    return (
        <section className="relative pt-18 pb-18 w-full">
            <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10">

                <div className="text-center mb-24">
                    <FadeInOnView>
                        <h2 className="text-4xl md:text-6xl text-[#111] tracking-tight font-sans font-semibold">
                            A refreshing approach to <br className="hidden md:block" />
                            <span className="text-gray-500 font-normal">success.</span>
                        </h2>
                    </FadeInOnView>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {FEATURES.map((feat, i) => (
                        <FadeInOnView key={i} delay={i * 0.1}>
                            <div className="group flex flex-col items-center text-center p-8 rounded-[40px] bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                                <div className={`w-20 h-20 rounded-[24px] ${feat.bgColor} flex items-center justify-center mb-8 rotate-3 group-hover:-rotate-3 transition-transform duration-300`}>
                                    <feat.icon className={`w-8 h-8 ${feat.iconColor}`} strokeWidth={1.5} />
                                </div>
                                <h3 className="text-2xl font-sans font-semibold text-[#111] mb-4">{feat.title}</h3>
                                <p className="font-sans font-normal text-[16px] text-[#666] leading-relaxed">
                                    {feat.desc}
                                </p>
                            </div>
                        </FadeInOnView>
                    ))}
                </div>
            </div>
        </section>
    );
}
