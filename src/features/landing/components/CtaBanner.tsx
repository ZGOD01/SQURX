import { FadeInOnView } from '@/components/motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export function CtaBanner() {
    return (
        <section className="py-6 md:py-8 relative overflow-hidden bg-white border-t border-[#F5F5F7] flex items-center justify-center">

            {/* Ultra-minimalist subtle gradient background (barely visible) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FAF9F7] via-white to-white pointer-events-none" />

            <div className="max-w-[800px] w-full mx-auto px-6 text-center relative z-10">
                <FadeInOnView>

                    {/* Tiny minimalist label */}
                    <div className="mb-8">
                        <span className="font-['Outfit'] font-normal text-[11px] tracking-[0.3em] uppercase text-[#888]">
                            The Final Step
                        </span>
                    </div>

                    <h2 className="text-5xl md:text-7xl lg:text-[80px] font-['Playfair_Display'] italic font-light tracking-tight mb-8 text-[#111] leading-[1.05]">
                        Ready to define<br />your future?
                    </h2>

                    <p className="font-['Outfit'] font-light text-[17px] md:text-[20px] text-[#666] mb-12 leading-[1.6] max-w-xl mx-auto">
                        Join the exclusive network of top-tier professionals and globally recognized institutions. Let's make it happen.
                    </p>

                    <div className="flex justify-center">
                        <Link to="/auth/register" className="group flex items-center gap-4 bg-[#111] text-white rounded-full pl-8 pr-2 py-2 hover:bg-[#333] transition-all duration-300">
                            <span className="font-['Outfit'] font-light text-[15px] tracking-wide">
                                Create Your Profile
                            </span>
                            <div className="w-10 h-10 rounded-full bg-white text-[#111] flex items-center justify-center group-hover:scale-95 transition-transform duration-300">
                                <ArrowUpRight className="w-4 h-4 ml-0.5 mt-0.5" />
                            </div>
                        </Link>
                    </div>

                </FadeInOnView>
            </div>
        </section>
    );
}
