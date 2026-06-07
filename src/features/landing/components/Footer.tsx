import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

type HealthStatus = 'checking' | 'operational' | 'degraded' | 'offline';

export function Footer() {
    const [health, setHealth] = useState<HealthStatus>('checking');

    // GET /health — poll server status once on mount
    useEffect(() => {
        fetch('https://squrx-backend.onrender.com/api/v1/health', { signal: AbortSignal.timeout(5000) })
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data?.database === 'connected') {
                    setHealth('operational');
                } else {
                    setHealth('degraded');
                }
            })
            .catch(() => setHealth('offline'));
    }, []);

    const statusConfig: Record<HealthStatus, { color: string; pulse: string; label: string }> = {
        checking:    { color: 'bg-gray-400',   pulse: 'animate-pulse', label: 'Checking...' },
        operational: { color: 'bg-emerald-500', pulse: 'animate-pulse', label: 'All Systems Operational' },
        degraded:    { color: 'bg-amber-400',   pulse: '',              label: 'Partially Degraded' },
        offline:     { color: 'bg-red-500',     pulse: '',              label: 'Service Offline' },
    };
    const { color, pulse, label } = statusConfig[health];

    return (
        <footer className="relative bg-white pt-20 pb-10 border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">

                    <div className="col-span-2 lg:col-span-2 pr-8">
                        <Link to="/" className="flex items-center gap-2 mb-6 group w-fit">
                            <img src="/squrx01.png" alt="SQURX Logo" className="w-8 h-8 object-contain drop-shadow-sm group-hover:rotate-[5deg] group-hover:scale-105 transition-all duration-300" />
                            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#8711c1] to-[#ff007f] text-transparent bg-clip-text font-sans mt-0.5">SQURX</span>
                        </Link>
                        <p className="font-['Outfit'] font-light text-[#666] text-lg max-w-sm leading-relaxed">
                            The premier career strategy firm for individuals who refuse to leave their professional success to chance.
                        </p>
                        {/* Live Server Status Badge — powered by GET /health */}
                        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                            <span className={`w-2 h-2 rounded-full ${color} ${pulse}`} />
                            <span className="text-[12px] font-semibold text-gray-600">{label}</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-sans font-medium text-[15px] tracking-widest uppercase mb-6 text-[#111]">Platform</h4>
                        <ul className="space-y-4 font-sans font-normal text-[15px] text-[#666]">
                            <li><Link to="/auth/register" className="hover:text-gray-900 transition-colors">Students</Link></li>
                            <li><Link to="/auth/register" className="hover:text-gray-900 transition-colors">Recruiters</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-sans font-medium text-[15px] tracking-widest uppercase mb-6 text-[#111]">Company</h4>
                        <ul className="space-y-4 font-sans font-normal text-[15px] text-[#666]">
                            <li><a href="#about" className="hover:text-gray-900 transition-colors">About</a></li>
                            <li><a href="#careers" className="hover:text-gray-900 transition-colors">Careers</a></li>
                            <li><a href="#contact" className="hover:text-gray-900 transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-sans font-medium text-[15px] tracking-widest uppercase mb-6 text-[#111]">Legal</h4>
                        <ul className="space-y-4 font-sans font-normal text-[15px] text-[#666]">
                            <li><a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 font-sans font-normal text-[14px] text-[#999]">
                    <p>© 2026 Squrx. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-gray-900 transition-colors uppercase tracking-wider text-[12px]">Twitter</a>
                        <a href="#" className="hover:text-gray-900 transition-colors uppercase tracking-wider text-[12px]">LinkedIn</a>
                        <a href="#" className="hover:text-gray-900 transition-colors uppercase tracking-wider text-[12px]">Instagram</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
