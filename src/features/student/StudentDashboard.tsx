import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudentStore } from './store';
import { useAuthStore } from '../auth/store';
import { Card, Button, Badge } from '@/components/ui';
import { PageTransition, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Building2, MapPin, ExternalLink, Loader2, Sparkles, IndianRupee, WifiOff } from 'lucide-react';
import { fetchJobs } from '@/lib/jobsApi';
import type { JobVacancy } from '@/lib/mockDb/schema';

export function StudentDashboard() {
    const { user } = useAuthStore();
    const { profile } = useStudentStore();

    const [jobs, setJobs] = useState<JobVacancy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setFetchError(null);
            try {
                // Fetch up to 200 jobs from the real backend
                const data = await fetchJobs({ limit: 200 });
                setJobs(data);
            } catch (err: any) {
                console.error('[StudentDashboard] Failed to load jobs:', err);
                setFetchError(err?.message ?? 'Unable to load jobs.');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Match jobs to student's career goal / domain keywords
    const preferredDomain = profile?.careerGoal || '';

    const personalizedJobs = jobs.filter(j => {
        if (!preferredDomain) return true;
        const text = (j.title + ' ' + j.description + ' ' + (j.skills || []).join(' ')).toLowerCase();
        const keywords = preferredDomain.toLowerCase().split(/\s+/).filter(k => k.length > 2);
        return keywords.length === 0 || keywords.some(k => text.includes(k));
    });

    // Show up to 6 personalised jobs; fall back to first 6 if no match
    const displayJobs = (personalizedJobs.length > 0 ? personalizedJobs : jobs).slice(0, 6);

    const domainLabel = preferredDomain || 'Recommended';

    return (
        <PageTransition className="space-y-8 max-w-7xl mx-auto pb-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {(user?.name || user?.fullName) ? (user.name || user.fullName).split(' ')[0] : 'there'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here are the latest{' '}
                        <strong className="text-primary">{domainLabel}</strong>{' '}
                        opportunities fetched live for you.
                    </p>
                </div>
                <Link to="/student/jobs">
                    <Button variant="outline" className="border-black text-black hover:bg-black hover:text-white transition-all h-11 px-6 rounded-full font-medium">
                        View All Jobs
                    </Button>
                </Link>
            </div>

            {/* API Error Banner */}
            {fetchError && (
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 shadow-sm">
                    <WifiOff className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-rose-800">Could not load jobs</p>
                        <p className="text-sm text-rose-600 mt-0.5 leading-relaxed">{fetchError}</p>
                    </div>
                    <button
                        onClick={async () => {
                            setIsLoading(true);
                            setFetchError(null);
                            try {
                                const data = await fetchJobs({ limit: 200 });
                                setJobs(data);
                            } catch (err: any) {
                                setFetchError(err?.message ?? 'Unable to load jobs.');
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        className="shrink-0 px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Job Cards */}
            {isLoading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 animate-spin text-black/20" />
                </div>
            ) : displayJobs.length > 0 ? (
                <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayJobs.map((job) => (
                        <StaggerItem key={job.id}>
                            <HoverLift>
                                <Card className="h-full border-border/60 hover:border-black/30 cursor-default shadow-sm bg-card transition-all flex flex-col p-6 rounded-[1.5rem] relative overflow-hidden group hover:shadow-xl">

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 bg-black/5 text-black">
                                            <Building2 size={24} />
                                        </div>
                                        {job.jobType && (
                                            <Badge variant="secondary" className="font-medium bg-black/5 text-black rounded-lg">
                                                {job.jobType}
                                            </Badge>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold leading-tight mb-1 group-hover:text-black/80 transition-colors line-clamp-2">
                                        {job.title}
                                    </h3>
                                    <p className="text-sm font-medium text-black/50 mb-4">{job.companyName}</p>

                                    <div className="space-y-2 mt-auto text-sm text-foreground/80 mb-6">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} className="opacity-50 shrink-0" />
                                            <span className="truncate">{job.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <IndianRupee size={16} className="opacity-50 shrink-0" />
                                            <span className="truncate">{job.salary}</span>
                                        </div>
                                    </div>

                                    <Link to="/student/jobs" className="mt-auto block">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-between group-hover:bg-black group-hover:text-white transition-colors duration-300 rounded-xl h-12"
                                        >
                                            View Role <ExternalLink size={16} className="opacity-50 ml-2" />
                                        </Button>
                                    </Link>
                                </Card>
                            </HoverLift>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            ) : !fetchError ? (
                <div className="flex flex-col items-center justify-center p-16 text-center bg-black/[0.02] border border-black/5 rounded-[2rem]">
                    <Sparkles className="w-12 h-12 text-black/30 mb-4" />
                    <h3 className="text-xl font-bold mb-2 tracking-tight">No jobs found yet</h3>
                    <p className="text-black/50 font-light max-w-md">
                        No live roles are available right now. Check back soon — the board refreshes automatically.
                    </p>
                    <Link to="/student/jobs" className="mt-6">
                        <Button variant="outline" className="rounded-full px-8 h-11">Browse All Jobs</Button>
                    </Link>
                </div>
            ) : null}
        </PageTransition>
    );
}
