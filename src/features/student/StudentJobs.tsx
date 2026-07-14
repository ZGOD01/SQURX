import { useState, useEffect } from 'react';
import { PageTransition, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Card, Button, Badge, Skeleton, Modal, Toast } from '@/components/ui';
import { 
    Search, 
    MapPin, 
    Building2, 
    Briefcase, 
    Filter, 
    IndianRupee, 
    Sparkles, 
    Award, 
    Clock, 
    ArrowRight, 
    CheckCircle2,
    WifiOff,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Globe
} from 'lucide-react';
import { fetchJobs, type ApiJobItem } from '@/lib/jobsApi';
import { useNotificationStore } from '@/lib/store/notifications';
import { useStudentStore } from './store';
import { useAuthStore } from '@/features/auth/store';

export function StudentJobs() {
    const { user } = useAuthStore();
    const { applications, applyForJob } = useStudentStore();
    const { sendEmail } = useNotificationStore();

    // API State
    const [jobs, setJobs] = useState<ApiJobItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(12);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Filters
    const [q, setQ] = useState('');
    const [location, setLocation] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('All');

    // Debounced values
    const [debouncedQ, setDebouncedQ] = useState('');
    const [debouncedLocation, setDebouncedLocation] = useState('');

    // Modal & UI State
    const [selectedJob, setSelectedJob] = useState<ApiJobItem | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const appliedJobs = applications.map(app => app.vacancyId);

    // Debounce search inputs to avoid rapid API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQ(q);
        }, 400);
        return () => clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedLocation(location);
        }, 400);
        return () => clearTimeout(timer);
    }, [location]);

    // Fetch jobs on filter/page change
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setFetchError(null);
            try {
                // Map experienceLevel filter to backend format
                let apiExp: string | undefined = undefined;
                if (experienceLevel === 'Fresher') apiExp = 'entry';
                else if (experienceLevel === '1-3 Years') apiExp = 'junior';
                else if (experienceLevel === '3-5 Years') apiExp = 'mid';
                else if (experienceLevel === '5+ Years') apiExp = 'senior';

                const response = await fetchJobs({
                    q: debouncedQ || undefined,
                    location: debouncedLocation || undefined,
                    experienceLevel: apiExp,
                    page,
                    limit
                });

                setJobs(response.jobs);
                setTotal(response.total);
            } catch (err: any) {
                console.error('[StudentJobs] Failed to load jobs from API:', err);
                setFetchError('Unable to load jobs. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [debouncedQ, debouncedLocation, experienceLevel, page, limit]);

    // Reset page to 1 when filters change
    const handleQChange = (val: string) => {
        setQ(val);
        setPage(1);
    };

    const handleLocationChange = (val: string) => {
        setLocation(val);
        setPage(1);
    };

    const handleExperienceChange = (val: string) => {
        setExperienceLevel(val);
        setPage(1);
    };

    const clearAllFilters = () => {
        setQ('');
        setLocation('');
        setExperienceLevel('All');
        setPage(1);
    };

    const handleApply = (job: ApiJobItem) => {
        if (user) {
            applyForJob(user.id, job.id).catch(console.error);
        }

        if (job.applyLink) {
            window.open(job.applyLink, '_blank', 'noopener,noreferrer');
        }

        setToastMessage(`Application logged for ${job.title}`);
        
        try {
            sendEmail(
                'Your Job Application Data Received',
                `You tracked an application for the role ${job.title} at ${job.companyName || 'your selected company'}. It is securely synced to your Squrx account.`
            );
        } catch (emailErr) {
            console.error('Failed to send email notification:', emailErr);
        }
        
        setSelectedJob(null);
    };

    const totalPages = Math.ceil(total / limit) || 1;

    return (
        <PageTransition className="space-y-6 max-w-7xl mx-auto pb-12">
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
                                let apiExp: string | undefined = undefined;
                                if (experienceLevel === 'Fresher') apiExp = 'entry';
                                else if (experienceLevel === '1-3 Years') apiExp = 'junior';
                                else if (experienceLevel === '3-5 Years') apiExp = 'mid';
                                else if (experienceLevel === '5+ Years') apiExp = 'senior';

                                const response = await fetchJobs({
                                    q: debouncedQ || undefined,
                                    location: debouncedLocation || undefined,
                                    experienceLevel: apiExp,
                                    page,
                                    limit
                                });
                                setJobs(response.jobs);
                                setTotal(response.total);
                            } catch (err: any) {
                                setFetchError('Unable to load jobs. Please try again.');
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

            {/* Hero and Search Section */}
            <div className="relative overflow-hidden rounded-[2rem] bg-black p-8 md:p-12 mb-4 border border-white/10 shadow-2xl">
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-600/30 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/30 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-widest pl-2 pr-4 mb-6 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Live Opportunities
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                            Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Perfect Role</span>
                        </h1>
                        <p className="text-white/60 text-lg font-medium max-w-md">Browse active job listings synced directly from backend partner networks.</p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
                        <div className="relative flex items-center bg-white/10 border border-white/20 rounded-2xl backdrop-blur-xl shadow-inner-light overflow-hidden transition-all focus-within:bg-white/15 focus-within:border-white/30">
                            <Search className="absolute left-4 text-white/50 w-5 h-5 pointer-events-none" />
                            <input
                                placeholder="Search by job title or keyword..."
                                className="w-full h-14 pl-12 pr-4 bg-transparent text-white placeholder:text-white/40 focus:outline-none text-lg"
                                value={q}
                                onChange={(e) => handleQChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Navigation Panel */}
            <div className="bg-gradient-to-br from-card to-muted/20 border border-border/50 rounded-3xl p-6 mb-8 mt-6 shadow-sm relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="space-y-6 relative z-10">
                    {/* Career Stages Filter */}
                    <div>
                        <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Career Stage
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                            {[
                                { id: 'All', label: 'Any Stage', icon: Sparkles },
                                { id: 'Fresher', label: 'Fresher', icon: Award },
                                { id: '1-3 Years', label: '1-3 Years', icon: Award },
                                { id: '3-5 Years', label: '3-5 Years', icon: Award },
                                { id: '5+ Years', label: '5+ Years', icon: Award }
                            ].map(stage => {
                                const Icon = stage.icon;
                                const isActive = experienceLevel === stage.id;
                                return (
                                    <button
                                        key={stage.id}
                                        onClick={() => handleExperienceChange(stage.id)}
                                        className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all shrink-0 border overflow-hidden ${
                                            isActive 
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/20' 
                                            : 'bg-background hover:bg-muted text-muted-foreground border-border/40 hover:border-border hover:shadow-sm'
                                        }`}
                                    >
                                        <Icon size={16} className={isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground transition-colors'} />
                                        <span className="relative z-10 transition-colors group-hover:text-foreground">{stage.label}</span>
                                        {isActive && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="h-px w-full bg-border/40" />

                    {/* Location & Reset Block */}
                    <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
                        <div className="w-full md:max-w-md">
                            <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Location
                            </p>
                            <div className="relative flex items-center bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm focus-within:border-primary/50 transition-colors">
                                <MapPin className="absolute left-3 text-muted-foreground w-4 h-4 pointer-events-none" />
                                <input
                                    placeholder="Search location (e.g. San Francisco)..."
                                    className="w-full h-11 pl-9 pr-3 bg-transparent text-sm focus:outline-none"
                                    value={location}
                                    onChange={(e) => handleLocationChange(e.target.value)}
                                />
                            </div>
                        </div>

                        {(q || location || experienceLevel !== 'All') && (
                            <Button 
                                variant="outline" 
                                className="rounded-xl font-bold h-11 border-dashed hover:bg-muted"
                                onClick={clearAllFilters}
                            >
                                Clear All Filters
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Layout bar for jobs count */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/40">
                <div className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-black">
                        {total}
                    </span>
                    Jobs Available
                </div>
            </div>

            <div className="min-h-[400px]">
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i} className="border-border/60 p-6 flex flex-col h-full space-y-4 shadow-sm bg-card/50">
                                <div className="flex justify-between">
                                    <Skeleton style={{ height: "40px", width: "40px" }} className="rounded-xl" />
                                    <Skeleton style={{ height: "24px", width: "80px" }} className="rounded-full" />
                                </div>
                                <div>
                                    <Skeleton style={{ height: "24px", width: "80%" }} className="mb-2" />
                                    <Skeleton style={{ height: "16px", width: "50%" }} />
                                </div>
                                <div className="mt-auto pt-4 space-y-2">
                                    <Skeleton style={{ height: "16px", width: "100%" }} />
                                    <Skeleton style={{ height: "16px", width: "90%" }} />
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center bg-muted/20 border border-dashed border-border/60 rounded-[2rem] shadow-sm relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
                        <Filter className="w-16 h-16 text-muted-foreground opacity-30 mb-6 drop-shadow-sm" />
                        <h3 className="text-2xl font-black mb-3 text-foreground">No jobs are currently available.</h3>
                        <p className="text-muted-foreground max-w-sm mb-8 text-lg">We couldn't find any opportunities matching your criteria. Try adjusting the search or filters.</p>
                        <Button variant="outline" className="rounded-xl font-bold px-8" onClick={clearAllFilters}>Reset Filters</Button>
                    </div>
                ) : (
                    <>
                        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {jobs.map((job) => {
                                const applied = appliedJobs.includes(job.id);

                                return (
                                    <StaggerItem key={job.id} className="h-full">
                                        <HoverLift className="h-full block">
                                            <Card
                                                className="h-full border-border/40 hover:border-primary/50 cursor-pointer shadow-md hover:shadow-xl bg-card transition-all duration-300 flex flex-col p-6 relative overflow-hidden group rounded-3xl"
                                                onClick={() => setSelectedJob(job)}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                                {/* Header Row: Avatar + Company */}
                                                <div className="flex justify-between items-start mb-4 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm bg-gradient-to-br from-muted to-muted/50 text-foreground border border-border/50">
                                                            <Building2 size={20} />
                                                        </div>
                                                        <div>
                                                            {job.companyName && <p className="font-bold text-sm text-foreground/80">{job.companyName}</p>}
                                                            {job.location && (
                                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                    <MapPin size={10} /> {job.location}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Status Badges */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        {applied && (
                                                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 flex items-center gap-1 text-[10px] uppercase shadow-none">
                                                                <CheckCircle2 size={10} /> Applied
                                                            </Badge>
                                                        )}
                                                        {job.source && (
                                                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] uppercase font-bold">
                                                                {job.source}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Job Title */}
                                                <h3 className="text-lg font-extrabold leading-tight mb-3 group-hover:text-primary transition-colors relative z-10 line-clamp-2">
                                                    {job.title}
                                                </h3>

                                                {/* Description Snippet */}
                                                {job.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                                                        {job.description}
                                                    </p>
                                                )}

                                                {/* Key Skills Tags */}
                                                {job.skills && job.skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-4 z-10 relative">
                                                        {job.skills.slice(0, 4).map((skill, index) => (
                                                            <Badge 
                                                                key={index}
                                                                variant="secondary"
                                                                className="px-2 py-0.5 rounded text-[10px] font-medium border border-border/60 bg-muted/40 text-muted-foreground"
                                                            >
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                        {job.skills.length > 4 && (
                                                            <span className="text-[10px] text-muted-foreground font-medium self-center ml-1">
                                                                +{job.skills.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Badges Row */}
                                                <div className="flex flex-wrap gap-2 mb-6 relative z-10 mt-auto">
                                                    {job.jobType && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-[10px] font-semibold text-muted-foreground border border-border/50">
                                                            <Briefcase size={10} /> {job.jobType}
                                                        </span>
                                                    )}
                                                    {job.salary && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-[10px] font-semibold text-muted-foreground border border-border/50">
                                                            <IndianRupee size={10} /> {job.salary}
                                                        </span>
                                                    )}
                                                    {job.experienceLevel && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-[10px] font-semibold text-muted-foreground border border-border/50">
                                                            <Sparkles size={10} /> {job.experienceLevel}
                                                        </span>
                                                    )}
                                                    {job.visaSponsorship && job.visaSponsorship === 'true' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                                                            <Globe size={10} /> Visa OK
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Footer Row */}
                                                <div className="pt-4 border-t border-border/40 flex items-center justify-between relative z-10">
                                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                        <Clock size={12} />
                                                        {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 text-sm font-bold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                        View Details <ArrowRight size={14} />
                                                    </div>
                                                </div>
                                            </Card>
                                        </HoverLift>
                                    </StaggerItem>
                                );
                            })}
                        </StaggerContainer>

                        {/* Real Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-12">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPage(p => Math.max(p - 1, 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page === 1 || isLoading}
                                    className="rounded-xl flex items-center gap-1.5"
                                >
                                    <ChevronLeft size={16} /> Previous
                                </Button>
                                <span className="text-sm font-bold text-muted-foreground">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPage(p => Math.min(p + 1, totalPages));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page >= totalPages || isLoading}
                                    className="rounded-xl flex items-center gap-1.5"
                                >
                                    Next <ChevronRight size={16} />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Central Job Detail Modal */}
            <Modal
                isOpen={!!selectedJob}
                onClose={() => setSelectedJob(null)}
                title="Role Overview"
                className="max-w-2xl"
            >
                {selectedJob && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <Building2 size={32} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold leading-tight">{selectedJob.title}</h2>
                                    <p className="text-muted-foreground font-medium flex items-center gap-1 mt-1">
                                        {selectedJob.companyName || 'Corporate Partner'} • <span className="text-xs">{new Date(selectedJob.createdAt).toLocaleDateString()}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {selectedJob.location && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Location</div>
                                    <div className="font-medium text-sm">{selectedJob.location}</div>
                                </div>
                            )}
                            {selectedJob.jobType && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12} /> Type</div>
                                    <div className="font-medium text-sm">{selectedJob.jobType}</div>
                                </div>
                            )}
                            {selectedJob.experienceLevel && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Award size={12} /> Experience</div>
                                    <div className="font-medium text-sm">{selectedJob.experienceLevel}</div>
                                </div>
                            )}
                            {selectedJob.salary && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><IndianRupee size={12} /> Salary Range</div>
                                    <div className="font-medium text-sm">{selectedJob.salary}</div>
                                </div>
                            )}
                            {selectedJob.source && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Globe size={12} /> Sync Source</div>
                                    <div className="font-medium text-sm capitalize">{selectedJob.source}</div>
                                </div>
                            )}
                            {selectedJob.visaSponsorship && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Globe size={12} /> Visa Sponsorship</div>
                                    <div className="font-medium text-sm capitalize">{selectedJob.visaSponsorship === 'true' ? 'Available' : 'Not Provided'}</div>
                                </div>
                            )}
                        </div>

                        {/* Skills Display in Detail Modal */}
                        {selectedJob.skills && selectedJob.skills.length > 0 && (
                            <div>
                                <h3 className="font-bold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Required Skills</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedJob.skills.map((skill, index) => (
                                        <Badge 
                                            key={index}
                                            variant="secondary"
                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-muted text-muted-foreground border-border/60"
                                        >
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedJob.description && (
                            <div>
                                <h3 className="font-bold mb-3 text-lg">About the Role</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                    {selectedJob.description}
                                </p>
                            </div>
                        )}

                        {/* Apply Action block */}
                        <div className="pt-6 border-t border-border flex flex-col gap-4">
                            {appliedJobs.includes(selectedJob.id) ? (
                                <Button disabled className="w-full h-12 font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Application Submitted</Button>
                            ) : (
                                <div className="space-y-2">
                                    <Button className="w-full h-12 gap-2 font-bold" onClick={() => handleApply(selectedJob)}>
                                        Apply Externally <ExternalLink size={16} />
                                    </Button>
                                    {selectedJob.applyLink && (
                                        <p className="text-[11px] text-center text-muted-foreground font-light leading-normal">
                                            By clicking apply you will be redirected to the partner site to complete your application
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[100]">
                     <Toast variant="success" title="Success" onClose={() => setToastMessage(null)}>
                         {toastMessage}
                     </Toast>
                </div>
            )}
        </PageTransition>
    );
}
