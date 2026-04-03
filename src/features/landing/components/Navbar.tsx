import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={cn(
            "fixed top-0 inset-x-0 z-[100] w-full transition-all duration-300 flex justify-center",
            scrolled ? "py-4 md:py-6" : "py-6 md:py-8"
        )}>
            <div className={cn(
                "flex items-center justify-between transition-all duration-500 ease-out",
                scrolled 
                    ? "w-[92%] max-w-[900px] bg-white/80 backdrop-blur-xl px-5 py-3 rounded-full shadow-xl shadow-black/[0.04] border border-white/50" 
                    : "w-full max-w-[1400px] bg-transparent px-6 md:px-12 py-2 border-0"
            )}>
                
                {/* Left Logo */}
                <div className="flex flex-1 justify-start">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="bg-[#111] text-white p-2 rounded-xl group-hover:rotate-[15deg] group-hover:scale-110 group-active:scale-95 transition-all duration-300 shadow-sm border border-gray-900">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                        </div>
                        <span className="text-[20px] md:text-[22px] font-black tracking-tight text-[#111] font-sans mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>SQURX</span>
                    </Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 md:gap-7 justify-end pr-1">
                    <Link 
                        to="/auth/login" 
                        className="hidden sm:block text-[15px] font-bold text-gray-500 hover:text-[#111] transition-colors"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        Sign in
                    </Link>
                    <Link to="/auth/register">
                        <Button className="bg-[#111] hover:bg-black text-white font-bold rounded-full px-6 md:px-8 h-11 transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-lg shadow-black/10 text-[14px]">
                            Join Now
                        </Button>
                    </Link>
                </div>

            </div>
        </header>
    );
}
