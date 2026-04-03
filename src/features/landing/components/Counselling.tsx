import { FadeInOnView } from '@/components/motion';

const CONTENT = [
    {
        title: "Outcome-Driven Mentorship",
        desc: "We don't just facilitate study abroad; we act as your lifelong partner, tracking your progress through a concierge-level service until your professional goals are fully realized.",
    },
    {
        title: "End-to-End Concierge Service",
        desc: "We manage every complexity of your global transition, including university selection, Course selection, Loan approvals, visa processing, accommodation, placement assistance and international settlement.",
    },
    {
        title: "Frictionless Global Transition",
        desc: "By leveraging deep industry relationships and institutional partnerships, we create a seamless path from your initial application to your desired career designation.",
    },
    {
        title: "Strategic Career Architecture",
        desc: "We serve ambitious individuals who refuse to leave their professional success to chance, transforming international education into a high-ROI strategic investment.",
    },
    {
        title: "The Roadmap to Success",
        desc: "You bring the ambition; we provide the proprietary roadmap to ensure you are positioned for the role you were meant for—at no cost to the aspirant.",
    },
    {
        title: "Exclusive Career Cohort",
        desc: "Beyond our global job board, we offer a select group of aspirant's access to a private cohort providing strategic clarity and market insights not available through public channels.",
    }
];

export function Counselling() {
    return (
        <section id="counselling" className="py-24 relative overflow-hidden bg-white w-full">
            <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 flex flex-col md:flex-row gap-16 md:gap-8 items-start">

                {/* Left Side Typography Header (Sticky) */}
                <div className="md:w-5/12 md:sticky md:top-32 relative">
                    <FadeInOnView>
                        <div className="absolute top-0 right-10 w-32 h-32 bg-gray-200 opacity-20 rounded-full blur-[40px] pointer-events-none" />
                        <h2 className="text-5xl md:text-6xl lg:text-[72px] text-[#111] tracking-tight leading-[1] relative z-10 font-sans font-semibold">
                            Your global<br />
                            <span className="text-gray-500 font-normal">concierge.</span>
                        </h2>
                        <p className="mt-8 font-sans font-normal text-[18px] text-[#666] leading-relaxed max-w-sm">
                            We eliminate the friction of international transitions, acting as your lifelong partner in achieving professional success.
                        </p>
                    </FadeInOnView>
                </div>

                {/* Right Side Content List */}
                <div className="md:w-7/12 flex flex-col gap-12">
                    {CONTENT.map((item, idx) => (
                        <FadeInOnView key={idx} delay={idx * 0.1}>
                            <div className="group border-b border-gray-100 pb-10">
                                <div className="flex gap-6 items-start">
                                    <div className="font-sans font-medium text-3xl text-gray-300 group-hover:text-gray-900 transition-colors select-none mt-1">
                                        0{idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-sans font-semibold text-[#111] mb-3">{item.title}</h3>
                                        <p className="font-sans font-normal text-[17px] text-[#666] leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </FadeInOnView>
                    ))}
                </div>

            </div>
        </section>
    );
}
