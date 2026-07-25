import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/config';

interface HeroSlide {
    _id: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
}

type FetchState = 'loading' | 'success' | 'error' | 'empty';

export function Hero() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [fetchState, setFetchState] = useState<FetchState>('loading');
    const hasFetched = useRef(false); // prevent duplicate requests on StrictMode remounts

    // Fetch dynamic hero sections from the production backend
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        fetch(`${API_BASE_URL}/hero-sections`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((json) => {
                const raw: any[] = Array.isArray(json.data) ? json.data : [];
                // Filter only active records, sort by displayOrder asc
                const active = raw
                    .filter((item) => item.isActive !== false)
                    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

                if (active.length === 0) {
                    setSlides([]);
                    setFetchState('empty');
                } else {
                    setSlides(active);
                    setFetchState('success');
                }
            })
            .catch((err) => {
                console.error('[Hero] Failed to fetch hero sections:', err);
                setSlides([]);
                setFetchState('error');
            });
    }, []);

    // Auto-advance carousel only when slides are loaded
    useEffect(() => {
        if (slides.length === 0) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#fafafa] pt-20">

            {/* Background image */}
            <div className="absolute inset-x-0 top-0 z-0 h-full pointer-events-none">
                <img
                    src="/Back.png"
                    alt=""
                    className="w-full h-full object-cover object-right md:object-top"
                />
                {/* Horizontal gradient overlay for readability */}
                <div className="absolute inset-y-0 left-0 w-full md:w-3/4 lg:w-[85%] bg-gradient-to-r from-[#fafafa] via-[#fafafa]/95 to-transparent" />
                {/* Bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-32 md:h-48 bg-gradient-to-t from-[#fafafa] to-transparent" />
            </div>

            {/* Text overlay */}
            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 w-full mt-[-10vh] min-h-[350px] flex items-center">

                {/* Loading state */}
                {fetchState === 'loading' && (
                    <div className="flex flex-col items-start gap-4 w-full max-w-4xl">
                        <div className="h-16 w-3/4 rounded-2xl bg-gray-200/60 animate-pulse" />
                        <div className="h-8 w-1/2 rounded-xl bg-gray-200/40 animate-pulse" />
                    </div>
                )}

                {/* Error state */}
                {fetchState === 'error' && (
                    <div className="flex flex-col items-start gap-3 max-w-lg">
                        <p className="text-2xl font-semibold text-gray-400">
                            Content temporarily unavailable.
                        </p>
                        <p className="text-base text-gray-400/70">
                            Please refresh the page or try again shortly.
                        </p>
                    </div>
                )}

                {/* Empty state */}
                {fetchState === 'empty' && (
                    <div className="flex flex-col items-start gap-3 max-w-lg">
                        <p className="text-2xl font-semibold text-gray-400">
                            No content available right now.
                        </p>
                    </div>
                )}

                {/* Success state — carousel */}
                {fetchState === 'success' && slides.length > 0 && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.1 }
                                },
                                exit: {
                                    opacity: 0,
                                    y: -20,
                                    filter: 'blur(8px)',
                                    transition: { duration: 0.4, ease: 'anticipate' }
                                }
                            }}
                            className="flex flex-col items-start text-left max-w-4xl"
                        >
                            {/* Only `description` is rendered — `title` is admin-only */}
                            <motion.h1
                                variants={{
                                    hidden: { opacity: 0, y: 30, scale: 0.98, filter: 'blur(12px)' },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        filter: 'blur(0px)',
                                        transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
                                    }
                                }}
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                                className="text-4xl md:text-5xl lg:text-[68px] leading-[1.08] font-semibold tracking-[-0.03em] mb-6 text-[#0f0f0f] pr-4 pt-4"
                            >
                                {slides[currentIndex]?.description}
                            </motion.h1>

                            {/* Slide indicator dots */}
                            {slides.length > 1 && (
                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0 },
                                        visible: { opacity: 1, transition: { duration: 0.6 } }
                                    }}
                                    className="flex items-center gap-2 mt-2"
                                >
                                    {slides.map((_, i) => (
                                        <button
                                            key={i}
                                            aria-label={`Go to slide ${i + 1}`}
                                            onClick={() => setCurrentIndex(i)}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                i === currentIndex
                                                    ? 'w-8 bg-gray-900'
                                                    : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                                            }`}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}

            </div>

        </section>
    );
}
