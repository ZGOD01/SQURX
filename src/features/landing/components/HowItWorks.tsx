import { FadeInOnView, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Card, CardContent } from '@/components/ui';

const STEPS = [
    { step: "01", title: "Discover", desc: "Build your profile and clarify your strategic career goals." },
    { step: "02", title: "Match", desc: "Our network connects you with right-fit institutions and employers." },
    { step: "03", title: "Transition", desc: "We handle applications, visas, and relocation logistics." },
    { step: "04", title: "Thrive", desc: "Settle effortlessly and step into your desired career designation." }
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 relative">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                <FadeInOnView className="text-center mb-16">
                    <h2 className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-3">Process</h2>
                    <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900">A simple roadmap to success.</h3>
                </FadeInOnView>

                <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                    <div className="hidden lg:block absolute top-[28%] left-[12%] right-[12%] h-px bg-blue-100 -z-10" />
                    {STEPS.map((step, idx) => (
                        <StaggerItem key={idx}>
                            <HoverLift>
                                <Card className="border-none shadow-none text-center bg-transparent group">
                                    <CardContent className="pt-6 flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-2xl bg-white/60 backdrop-blur-sm text-blue-700 font-bold text-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm ring-1 ring-blue-100/50 group-hover:ring-blue-600 group-hover:shadow-[0_10px_20px_-10px_rgba(37,99,235,0.4)] group-hover:-translate-y-2">
                                            {step.step}
                                        </div>
                                        <h4 className="text-xl font-bold mb-3 text-slate-800">{step.title}</h4>
                                        <p className="text-slate-600 font-medium">{step.desc}</p>
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
