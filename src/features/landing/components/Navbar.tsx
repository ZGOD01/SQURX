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
                        <img 
                            src="/squrx01.png" 
                            alt="SQURX Logo" 
                            className="h-12 w-auto object-contain group-hover:rotate-[5deg] group-hover:scale-105 group-active:scale-95 transition-all duration-300 drop-shadow-sm"
                        />
                        <span className="text-[20px] md:text-[24px] font-black tracking-tight bg-gradient-to-r from-[#8711c1] to-[#ff007f] text-transparent bg-clip-text font-sans mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>SQURX</span>
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
