import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudentStore } from './store';
import { useAuthStore } from '../auth/store';
import { Card, Button, Badge } from '@/components/ui';
import { PageTransition, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Building2, MapPin, ExternalLink, Loader2, Sparkles, IndianRupee } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import type { JobVacancy } from '@/lib/mockDb/schema';

export function StudentDashboard() {
    const { user } = useAuthStore();
    const { profile } = useStudentStore();

    const [jobs, setJobs] = useState<JobVacancy[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const domainMapping: Record<string, string> = {
        operation: 'Operations & DevOps',
        testing: 'QA & Testing',
        developer: 'Software Engineering',
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const data = await mockApi.getStudentVacancies();
            setJobs(data);
            setIsLoading(false);
        };
        load();
    }, []);

    // Filter jobs roughly matching their "domain/careerGoal"
    const preferredDomain = profile?.careerGoal || '';
    const displayDomainName = domainMapping[preferredDomain] || 'Your Chosen Domain';

    // Mock filtering logic for the domain
    const personalizedJobs = jobs.filter(j => {
        if (!preferredDomain) return true;
        const text = (j.title + ' ' + j.description).toLowerCase();

        if (preferredDomain === 'operation' && (text.includes('dev') || text.includes('system') || text.includes('operations') || text.includes('cloud'))) return true;
        if (preferredDomain === 'testing' && (text.includes('qa') || text.includes('test') || text.includes('automation') || text.includes('quality'))) return true;
        if (preferredDomain === 'developer' && (text.includes('developer') || text.includes('engineer') || text.includes('software') || text.includes('frontend') || text.includes('backend'))) return true;

        return false;
    });

    // Fallback if no specific match, just show some jobs to prevent a fully empty screen during demo
    const displayJobs = personalizedJobs.length > 0 ? personalizedJobs.slice(0, 6) : jobs.slice(0, 6);

    return (
        <PageTransition className="space-y-8 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name.split(' ')[0]}</h1>
                    <p className="text-muted-foreground mt-1">
                        Here are the latest <strong className="text-primary">{preferredDomain ? displayDomainName : 'Recommended'}</strong> opportunities fetched for you.
                    </p>
                </div>
                <Link to="/student/jobs">
                    <Button variant="outline" className="border-black text-black hover:bg-black hover:text-white transition-all h-11 px-6 rounded-full font-medium">
                        View All Jobs
                    </Button>
                </Link>
            </div>

            <div className="mb-6 p-6 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-4 relative z-10 w-full md:w-auto text-center md:text-left">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex flex-col items-center justify-center text-blue-700 shrink-0 mx-auto md:mx-0">
                        <ExternalLink size={24} className="mb-0.5" />
                        <span className="text-[10px] font-bold tracking-wider">APIS</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-lg font-bold text-blue-800 dark:text-blue-300">Live External Feeds Active</p>
                        <p className="text-sm text-foreground/80 font-medium mt-1">
                            We are actively syncing `{preferredDomain ? displayDomainName : 'Target'}` roles from <span className="text-blue-600 font-semibold">fantastic.jobs</span>, <span className="text-indigo-600 font-semibold">coresignal.com</span>, and <span className="text-purple-600 font-semibold">jobspikr.com</span>.
                        </p>
                    </div>
                </div>

                <div className="shrink-0 relative z-10 hidden md:block">
                    <div className="bg-blue-900/5 dark:bg-blue-100/10 p-4 rounded-xl border border-blue-500/20 backdrop-blur-sm shadow-sm md:max-w-[280px] w-full">
                        <span className="font-bold uppercase tracking-wider text-[10px] bg-blue-500 text-white px-2 py-1 inline-block rounded-md mb-2 shadow-sm">
                            DevOps Task
                        </span>
                        <p className="text-xs text-foreground/70 font-medium leading-relaxed">
                            This visual layer maps live APIs to the `{preferredDomain || 'chosen'}` tag preferences internally. Map endpoints directly to UI components.
                        </p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 animate-spin text-black/20" />
                </div>
            ) : (
                <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayJobs.map((job) => {
                        const isExternal = parseInt(job.id.replace(/\D/g, '') || '0') % 3 === 0;
                        const sourceName = ['fantastic.jobs', 'jobspikr.com', 'coresignal.com'][parseInt(job.id.replace(/\D/g, '') || '0') % 3];

                        return (
                            <StaggerItem key={job.id}>
                                <HoverLift>
                                    <Card className="h-full border-border/60 hover:border-black/30 cursor-default shadow-sm bg-card transition-all flex flex-col p-6 rounded-[1.5rem] relative overflow-hidden group hover:shadow-xl">
                                        {isExternal && (
                                            <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                <ExternalLink size={10} />
                                                {sourceName}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${isExternal ? 'bg-blue-500/10 text-blue-600' : 'bg-black/5 text-black'}`}>
                                                <Building2 size={24} />
                                            </div>
                                            {!isExternal && <Badge variant="secondary" className="font-medium bg-black/5 text-black rounded-lg">{job.jobType}</Badge>}
                                        </div>

                                        <h3 className="text-lg font-bold leading-tight mb-2 group-hover:text-black/80 transition-colors">{job.title}</h3>
                                        <p className="text-sm font-medium text-black/50 mb-4">{job.companyName}</p>

                                        <div className="space-y-2 mt-auto text-sm text-foreground/80 mb-6">
                                            <div className="flex items-center gap-2"><MapPin size={16} className="opacity-50" /> {job.location}</div>
                                            <div className="flex items-center gap-2"><IndianRupee size={16} className="opacity-50" /> {job.salary}</div>
                                        </div>

                                        <Link to="/student/jobs" className="mt-auto block">
                                            <Button variant="outline" className="w-full justify-between group-hover:bg-black group-hover:text-white transition-colors duration-300 rounded-xl h-12">
                                                Review Pipeline <ExternalLink size={16} className="opacity-50 ml-2" />
                                            </Button>
                                        </Link>
                                    </Card>
                                </HoverLift>
                            </StaggerItem>
                        );
                    })}
                </StaggerContainer>
            )}

            {!isLoading && displayJobs.length === 0 && (
                <div className="flex flex-col items-center justify-center p-16 text-center bg-black/[0.02] border border-black/5 rounded-[2rem]">
                    <Sparkles className="w-12 h-12 text-black/30 mb-4" />
                    <h3 className="text-xl font-bold mb-2 tracking-tight">Fetching personalized matches</h3>
                    <p className="text-black/50 font-light max-w-md">Our algorithm is currently actively scouring the APIs looking for "{displayDomainName}" roles...</p>
                </div>
            )}
        </PageTransition>
    );
}
