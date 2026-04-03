import { FadeInOnView, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Compass, Network, PlaneTakeoff, GraduationCap, Briefcase, Handshake } from 'lucide-react';

const FEATURES = [
    {
        icon: Compass,
        title: "Outcome-Driven Mentorship",
        desc: "We track your progress through concierge-level service until your goals are fully realized."
    },
    {
        icon: PlaneTakeoff,
        title: "Global Transition",
        desc: "Manage every complexity including university selection, loans, visas, and international settlement."
    },
    {
        icon: Network,
        title: "Exclusive Cohort",
        desc: "Access a private cohort providing strategic clarity and market insights not available publicly."
    },
    {
        icon: GraduationCap,
        title: "Strategic Education",
        desc: "Transforming international education into a high-ROI strategic investment."
    },
    {
        icon: Briefcase,
        title: "The Roadmap to Success",
        desc: "You bring the ambition; we provide the proprietary roadmap to position you for success."
    },
    {
        icon: Handshake,
        title: "Frictionless Path",
        desc: "Leveraging deep industry relationships and institutional partnerships."
    }
];

export function Features() {
    return (
        <section id="features" className="py-24 relative overflow-hidden">
            {/* Subtle blue/white light effects */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                <FadeInOnView className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-4">Capabilities</h2>
                    <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-slate-900">Designed to elevate your trajectory.</h3>
                    <p className="text-xl text-slate-600 leading-relaxed font-medium">
                        We move beyond generic advice to provide a level of strategic clarity and support that ensures you reach your desired career designation.
                    </p>
                </FadeInOnView>

                <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {FEATURES.map((feat, idx) => (
                        <StaggerItem key={idx}>
                            <HoverLift>
                                <Card className="h-full border-blue-100/40 bg-white/40 backdrop-blur-xl hover:bg-white/60 transition-all duration-300 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(37,99,235,0.1)] overflow-hidden group">
                                    <CardHeader className="pb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-teal-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 ring-1 ring-blue-100 shadow-sm">
                                            <feat.icon size={28} />
                                        </div>
                                        <CardTitle className="text-2xl text-slate-800 font-bold tracking-tight mb-2">{feat.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-600 leading-relaxed text-base font-medium">
                                            {feat.desc}
                                        </p>
                                    </CardContent>
                                </Card>
                            </HoverLift>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            </div>
        </section>
    );
}
