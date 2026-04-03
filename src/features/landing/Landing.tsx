import { PageTransition } from '@/components/motion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { GlobalCareerDiagnostic } from './components/GlobalCareerDiagnostic';
import { ConsultingSection } from './components/ConsultingSection';
import { RefreshingApproach } from './components/RefreshingApproach';
import { RoleCards } from './components/RoleCards';
import { WhoWeAre } from './components/WhoWeAre';
import { CtaBanner } from './components/CtaBanner';
import { Footer } from './components/Footer';

export function Landing() {
    return (
        <PageTransition className="min-h-screen bg-white font-sans selection:bg-gray-200 overflow-x-hidden relative">

            <Navbar />

            <main className="flex-1 relative z-10 w-full">
                <div id="home">
                    <Hero />
                </div>

                <div id="diagnostic">
                    <GlobalCareerDiagnostic />
                </div>

                <div id="consulting">
                    <ConsultingSection />
                </div>

                <div id="approach">
                    <RefreshingApproach />
                </div>

                <div id="roles" className="py-20 relative bg-white">
                    <div className="absolute inset-0 bg-white -skew-y-2 z-0 origin-top-left border-y border-gray-100" />
                    <div className="relative z-10 w-full bg-white">
                        <RoleCards />
                    </div>
                </div>

                <div id="whoweare" className="bg-[#fdfdfd] relative z-10">
                    <WhoWeAre />
                </div>

                <div id="pricing" className="bg-white relative z-10">
                    <CtaBanner />
                </div>
            </main>

            <Footer />

        </PageTransition>
    );
}
