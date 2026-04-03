import { FadeInOnView } from '@/components/motion';
import { BookOpen, Users, Briefcase } from 'lucide-react';

const FEATURES = [
    {
        title: "Elite Mentorship",
        desc: "Direct access to top-tier professionals. Unfiltered insights and strategic guidance to navigate your industry.",
        icon: Users,
    },
    {
        title: "Friendly Price",
        desc: "Affordable access to premium tools. Because cracking your dream job shouldn't drain your savings entirely.",
        icon: BookOpen,
    },
    {
        title: "Quality Learning",
        desc: "High-density learning modules designed for rapid assimilation without the traditional academic bloat.",
        icon: Briefcase,
    }
];

export function GenZFeatures() {
    return (
        <section className="relative pt-10 pb-24 bg-white w-full">
            <div className="max-w-[1200px] mx-auto px-6 md:px-16 relative z-10">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-24">
                    {FEATURES.map((feat, i) => (
                        <FadeInOnView key={i} delay={i * 0.1}>
                            <div className="group flex flex-col items-start px-2">
                                {/* The circle icon background from the image */}
                                <div className="w-[85px] h-[85px] rounded-full bg-[#F3E6D5] flex items-center justify-center mb-6 relative">
                                    <feat.icon className="w-8 h-8 text-[#5D8286]" strokeWidth={2} />
                                    {/* Small circle accent */}
                                    <div className="absolute top-2 right-1.5 w-3 h-3 bg-[#e4a465] rounded-full" />
                                </div>
                                <h3 className="text-xl font-bold text-[#2D2D2D] mb-3">{feat.title}</h3>
                                <p className="text-[#777777] font-normal text-[14px] leading-relaxed">
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
