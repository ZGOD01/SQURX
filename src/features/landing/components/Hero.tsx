import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_CONTENT = [
    {
        heading: "Padhai wahi jo kaam aaye",
        subheading: "Let the “desired future Job” decide your abroad university, course, and skills to acquire"
    },
    {
        heading: "Aam dekh kar Guthali chune, take ped fal de sirf chaav nahi",
        subheading: "Hope can’t be strategy – choosing abroad university and course via social media, feedback, advise, ranking leads to hope. Data Leads to strategy."
    },
    {
        heading: "Karzan nahi career banaye",
        subheading: "Know in how many years you can repay your study abroad education loan – be realistic…."
    },
    {
        heading: "Degree wall pe acchi lagti hai pocket main nahi",
        subheading: "Skill gaps even with a degree do not allow to punch a nail in the wall to hang your degree… know what extra is required along with your overseas education."
    }
];

export function Hero() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % HERO_CONTENT.length);
        }, 5000); // 5 seconds per slide
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#fafafa] pt-20">

            {/* The background image layered starting from the top, extending down, with low z-index */}
            <div className="absolute inset-x-0 top-0 z-0 h-full pointer-events-none">
                <img
                    src="/Back.png"
                    alt=""
                    className="w-full h-full object-cover object-right md:object-top"
                />
                {/* Horizontal gradient overlay to make the left-aligned black text perfectly readable */}
                <div className="absolute inset-y-0 left-0 w-full md:w-3/4 lg:w-[85%] bg-gradient-to-r from-[#fafafa] via-[#fafafa]/95 to-transparent" />

                {/* Subtle gradient overlay at the base of the image to blend it nicely into the background below */}
                <div className="absolute inset-x-0 bottom-0 h-32 md:h-48 bg-gradient-to-t from-[#fafafa] to-transparent" />
            </div>

            {/* High z-index text overlaying the background */}
            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 w-full mt-[-10vh] min-h-[350px] flex items-center">
                
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
                                transition: { duration: 0.4, ease: "anticipate" } 
                            }
                        }}
                        className="flex flex-col items-start text-left max-w-4xl"
                    >
                        {/* 
                            PREMIUM GEN-Z AESTHETIC:
                            - Clean 'Outfit' sans-serif typography, slightly lighter weight (semibold).
                            - Ultra-smooth Apple/Linear-style blur and scale reveal animation.
                        */}
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
                            {HERO_CONTENT[currentIndex].heading}
                        </motion.h1>
                        
                        {/* Subheading clean and highly readable */}
                        <motion.p 
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { 
                                    opacity: 1, 
                                    y: 0, 
                                    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } 
                                }
                            }}
                            className="text-[18px] md:text-[22px] text-gray-500 font-medium max-w-3xl leading-[1.6]"
                        >
                            {HERO_CONTENT[currentIndex].subheading}
                        </motion.p>
                    </motion.div>
                </AnimatePresence>

            </div>

        </section>
    );
}
