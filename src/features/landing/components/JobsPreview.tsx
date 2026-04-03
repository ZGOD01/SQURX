import { FadeInOnView, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Card, Button, Toast } from '@/components/ui';
import { Building2, MapPin, IndianRupee } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

const JOBS = [
    { title: "Senior Software Engineer", company: "TechCorp Global", location: "New York (Remote)", salary: "Competitive", type: "Full-Time" },
    { title: "Product Marketing Manager", company: "Innovate AI", location: "London, UK", salary: "£65k - £80k", type: "Hybrid" },
    { title: "Data Scientist Analyst", company: "Quant Finance", location: "Singapore", salary: "SGD 120k", type: "Full-Time" },
    { title: "UX/UI Designer", company: "Creative Studio", location: "Berlin, DE", salary: "€50k - €65k", type: "Remote" }
];

export function JobsPreview() {
    const [toastOpen, setToastOpen] = useState(false);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const handleProtectedAction = (path: string) => {
        if (user) {
            navigate(path);
        } else {
            setToastOpen(true);
            setTimeout(() => navigate('/auth/login'), 2000); // Route after toast
        }
    };

    return (
        <section id="jobs-preview" className="py-24 relative">
            <div className="absolute left-0 top-0 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                <FadeInOnView className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="max-w-xl">
                        <h2 className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-3">Opportunities</h2>
                        <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Recent Global Postings</h3>
                        <p className="text-slate-600 mt-4 font-medium">Discover roles curated for specific futures from our elite institutional network.</p>
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-blue-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700" onClick={() => handleProtectedAction('/student/preferences')}>Set Preferences</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" onClick={() => handleProtectedAction('/student/jobs')}>Browse All Jobs</Button>
                    </div>
                </FadeInOnView>

                <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {JOBS.map((job, idx) => (
                        <StaggerItem key={idx}>
                            <HoverLift>
                                <Card className="h-full border border-blue-100/60 bg-white/40 backdrop-blur-md hover:bg-white/60 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 cursor-pointer p-6 rounded-2xl group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                            <Building2 size={24} />
                                        </div>
                                        <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{job.type}</span>
                                    </div>
                                    <h4 className="font-bold text-lg text-slate-900 leading-tight mb-2 line-clamp-2">{job.title}</h4>
                                    <p className="text-sm text-slate-600 font-medium mb-6">{job.company}</p>

                                    <div className="space-y-3 mt-auto">
                                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                            <MapPin size={16} className="text-blue-400" /> {job.location}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                            <IndianRupee size={16} className="text-blue-400" /> {job.salary}
                                        </div>
                                    </div>
                                </Card>
                            </HoverLift>
                        </StaggerItem>
                    ))}
                </StaggerContainer>

                {toastOpen && (
                    <div className="fixed bottom-4 right-4 z-[100]">
                        <Toast variant="error" title="Login Required" onClose={() => setToastOpen(false)}>Redirecting to login portal...</Toast>
                    </div>
                )}
            </div>
        </section>
    );
}
