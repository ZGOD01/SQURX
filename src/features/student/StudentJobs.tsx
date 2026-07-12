import { useState, useEffect } from 'react';
import { PageTransition, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Card, Select, Button, Badge, Skeleton, Modal, Toast } from '@/components/ui';
import { 
    Search, 
    MapPin, 
    Building2, 
    Briefcase, 
    Filter, 
    IndianRupee, 
    Sparkles, 
    GraduationCap, 
    TrendingUp, 
    Zap, 
    Award, 
    LayoutGrid, 
    Globe2, 
    Laptop, 
    FileText, 
    Clock, 
    ArrowRight, 
    CheckCircle2,
    AlertTriangle,
    WifiOff
} from 'lucide-react';
import type { JobVacancy } from '@/lib/mockDb/schema';
import { fetchJobs } from '@/lib/jobsApi';
import { useNotificationStore } from '@/lib/store/notifications';
import { useStudentStore } from './store';
import { calculateJobRelevance } from './jobRelevance';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/lib/utils';

export function StudentJobs() {
    const { user } = useAuthStore();
    const { profile, applications, applyForJob } = useStudentStore();
    const [jobs, setJobs] = useState<JobVacancy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [experienceFilter, setExperienceFilter] = useState('All');
    
    // Advanced Filters
    const [locationFilter, setLocationFilter] = useState('All');
    const [skillFilter, setSkillFilter] = useState('All');
    const [minRelevance, setMinRelevance] = useState(0);
    
    // Default sorting is Relevance for a smart ranking layout
    const [sortBy, setSortBy] = useState('Relevance');
    const { sendEmail } = useNotificationStore();

    const [selectedJob, setSelectedJob] = useState<(JobVacancy & { relevance?: number }) | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const appliedJobs = applications.map(app => app.vacancyId);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setFetchError(null);
            try {
                const vacancies = await fetchJobs({ limit: 200 });
                setJobs(vacancies);
            } catch (err: any) {
                console.error('[StudentJobs] Failed to load jobs from API:', err);
                setFetchError(err?.message ?? 'Unable to load jobs. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const handleApply = (job: JobVacancy) => {
        if (user) {
            applyForJob(user.id, job.id).catch(console.error);
        }

        if (job.applyLink) {
            window.open(job.applyLink, '_blank', 'noopener,noreferrer');
        }

        setToastMessage(`Application logged for ${job.title}`);
        sendEmail('Your Job Application Data Received', `You tracked an application for the role ${job.title} at ${job.companyName || 'your selected company'}. It is securely synced to your Squrx account.`);
        setSelectedJob(null);
    };

    // Calculate unique locations and skills dynamically from active vacancies list
    const uniqueLocations = Array.from(new Set(jobs.map(j => j.location).filter(Boolean))).sort();
    const uniqueSkills = Array.from(new Set(jobs.flatMap(j => j.skills || []).filter(Boolean))).sort();

    // Map jobs to include pre-computed relevance scores
    const jobsWithRelevance = jobs.map(j => ({
        ...j,
        relevance: calculateJobRelevance(profile, j)
    }));

    // Filter and sort matching vacancies
    const filteredJobs = jobsWithRelevance
        .filter(j => {
            const query = search.toLowerCase().trim();
            if (!query) return true;
            return (
                j.title.toLowerCase().includes(query) ||
                j.companyName?.toLowerCase().includes(query) ||
                j.description.toLowerCase().includes(query) ||
                j.skills?.some(s => s.toLowerCase().includes(query))
            );
        })
        .filter(j => {
            // Case-insensitive job type match — API may return FULL_TIME, Full-Time, full time etc.
            if (filterType === 'All') return true;
            const jt = j.jobType.toLowerCase().replace(/[_\s-]+/g, '');
            const ft = filterType.toLowerCase().replace(/[_\s-]+/g, '');
            return jt.includes(ft) || ft.includes(jt);
        })
        .filter(j => {
            // Case-insensitive experience level match
            if (experienceFilter === 'All') return true;
            return j.experienceLevel.toLowerCase() === experienceFilter.toLowerCase();
        })
        .filter(j => locationFilter === 'All' || j.location.toLowerCase() === locationFilter.toLowerCase())
        .filter(j => skillFilter === 'All' || j.skills?.some(s => s.toLowerCase() === skillFilter.toLowerCase()))
        .filter(j => j.relevance >= minRelevance)
        .sort((a, b) => {
            if (sortBy === 'Relevance') {
                return b.relevance - a.relevance;
            }
            if (sortBy === 'Newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return a.title.localeCompare(b.title);
        });

    const clearAllFilters = () => {
        setSearch('');
        setFilterType('All');
        setExperienceFilter('All');
        setLocationFilter('All');
        setSkillFilter('All');
        setMinRelevance(0);
        setSortBy('Relevance');
    };

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
                                const vacancies = await fetchJobs({ limit: 200 });
                                setJobs(vacancies);
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
                        <p className="text-white/60 text-lg font-medium max-w-md">Browse through carefully curated roles from top companies matching your roadmap.</p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
                        <div className="relative flex items-center bg-white/10 border border-white/20 rounded-2xl backdrop-blur-xl shadow-inner-light overflow-hidden transition-all focus-within:bg-white/15 focus-within:border-white/30">
                            <Search className="absolute left-4 text-white/50 w-5 h-5 pointer-events-none" />
                            <input
                                placeholder="Search roles, companies or skills..."
                                className="w-full h-14 pl-12 pr-4 bg-transparent text-white placeholder:text-white/40 focus:outline-none text-lg"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* New Filter Navigation - Enhanced Control Panel */}
            <div className="bg-gradient-to-br from-card to-muted/20 border border-border/50 rounded-3xl p-6 mb-8 mt-6 shadow-sm relative overflow-hidden">
                {/* Decorative background blur */}
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
                                { id: 'Fresher', label: 'Fresher', icon: GraduationCap },
                                { id: '1-3 Years', label: '1-3 Years', icon: TrendingUp },
                                { id: '3-5 Years', label: '3-5 Years', icon: Zap },
                                { id: '5+ Years', label: '5+ Years', icon: Award }
                            ].map(stage => {
                                const Icon = stage.icon;
                                const isActive = experienceFilter === stage.id;
                                return (
                                    <button
                                        key={stage.id}
                                        onClick={() => setExperienceFilter(stage.id)}
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

                    {/* Role Type Filter */}
                    <div>
                        <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Role Type
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                            {[
                                { id: 'All', label: 'All Types', icon: LayoutGrid },
                                { id: 'Full-Time', label: 'Full-Time', icon: Briefcase },
                                { id: 'Remote', label: 'Remote', icon: Globe2 },
                                { id: 'Hybrid', label: 'Hybrid', icon: Laptop },
                                { id: 'Contract', label: 'Contract', icon: FileText }
                            ].map(type => {
                                const Icon = type.icon;
                                const isActive = filterType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setFilterType(type.id)}
                                        className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all shrink-0 border overflow-hidden ${
                                            isActive 
                                            ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border-transparent shadow-md shadow-purple-500/20' 
                                            : 'bg-background hover:bg-muted text-muted-foreground border-border/40 hover:border-border hover:shadow-sm'
                                        }`}
                                    >
                                        <Icon size={16} className={isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground transition-colors'} />
                                        <span className="relative z-10 transition-colors group-hover:text-foreground">{type.label}</span>
                                        {isActive && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="h-px w-full bg-border/40" />

                    {/* New Core Filters: Location, Skills, and Relevancy Slider/Select */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Location
                            </p>
                            <Select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className="w-full h-11 text-sm rounded-xl border-border/60 bg-background hover:border-primary/50 transition-colors cursor-pointer"
                            >
                                <option value="All">All Locations</option>
                                {uniqueLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Required Skill
                            </p>
                            <Select
                                value={skillFilter}
                                onChange={(e) => setSkillFilter(e.target.value)}
                                className="w-full h-11 text-sm rounded-xl border-border/60 bg-background hover:border-primary/50 transition-colors cursor-pointer"
                            >
                                <option value="All">All Skills</option>
                                {uniqueSkills.map(skill => (
                                    <option key={skill} value={skill}>{skill}</option>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Min Relevance Score
                            </p>
                            <Select
                                value={minRelevance.toString()}
                                onChange={(e) => setMinRelevance(Number(e.target.value))}
                                className="w-full h-11 text-sm rounded-xl border-border/60 bg-background hover:border-primary/50 transition-colors cursor-pointer"
                            >
                                <option value="0">All Scores</option>
                                <option value="60">60% + Relevance</option>
                                <option value="70">70% + Relevance</option>
                                <option value="80">80% + Relevance</option>
                                <option value="90">90% + Relevance</option>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout bar for jobs count and sorting */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/40">
                <div className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                        {filteredJobs.length}
                    </span>
                    Jobs Matching Curated Filters
                </div>
                <div className="shrink-0 flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground hidden sm:block">Sort By</span>
                    <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-40 h-9 text-sm rounded-lg border-border/60 bg-card py-0 px-3 cursor-pointer font-semibold"
                    >
                        <option value="Relevance">Highest Relevance</option>
                        <option value="Newest">Newest First</option>
                        <option value="Alphabetical">Alphabetical</option>
                    </Select>
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
                ) : filteredJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center bg-muted/20 border border-dashed border-border/60 rounded-[2rem] shadow-sm relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
                        <Filter className="w-16 h-16 text-muted-foreground opacity-30 mb-6 drop-shadow-sm" />
                        <h3 className="text-2xl font-black mb-3 text-foreground">No roles match your filters</h3>
                        <p className="text-muted-foreground max-w-sm mb-8 text-lg">We couldn't find any opportunities matching your current criteria. Try adjusting the filters or search term to discover more.</p>
                        <Button variant="primary" size="lg" className="rounded-full font-bold px-8 shadow-md" onClick={clearAllFilters}>Clear All Filters</Button>
                    </div>
                ) : (
                    <>
                        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredJobs.map((job) => {
                                const applied = appliedJobs.includes(job.id);

                                return (
                                    <StaggerItem key={job.id} className="h-full">
                                        <HoverLift className="h-full block">
                                            <Card
                                                className="h-full border-border/40 hover:border-primary/50 cursor-pointer shadow-md hover:shadow-xl bg-card transition-all duration-300 flex flex-col p-6 relative overflow-hidden group rounded-3xl"
                                                onClick={() => setSelectedJob(job)}
                                            >
                                                {/* Subtle background glow on hover */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                                {/* Header Row: Avatar + Company */}
                                                <div className="flex justify-between items-start mb-5 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm bg-gradient-to-br from-muted to-muted/50 text-foreground border border-border/50">
                                                            <Building2 size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm text-foreground/80">{job.companyName}</p>
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <MapPin size={10} /> {job.location}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Status Badges */}
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        {applied && (
                                                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 flex items-center gap-1 text-[10px] uppercase shadow-none">
                                                                <CheckCircle2 size={10} /> Applied
                                                            </Badge>
                                                        )}
                                                        {/* Relevancy score badge */}
                                                        <Badge 
                                                            variant="outline" 
                                                            className={cn(
                                                                "flex items-center gap-1 text-[10px] font-extrabold uppercase shadow-none",
                                                                job.relevance >= 80 
                                                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                                                    : job.relevance >= 60 
                                                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                                                                        : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                            )}
                                                        >
                                                            <Sparkles size={10} /> {job.relevance}% Match
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Job Title */}
                                                <h3 className="text-xl font-extrabold leading-tight mb-4 group-hover:text-primary transition-colors relative z-10 line-clamp-2">
                                                    {job.title}
                                                </h3>

                                                {/* Micro-Badges Row */}
                                                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                                                    {job.jobType && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs font-semibold text-muted-foreground border border-border/50">
                                                            <Briefcase size={12} /> {job.jobType}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs font-semibold text-muted-foreground border border-border/50">
                                                        <IndianRupee size={12} /> {job.salary}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs font-semibold text-muted-foreground border border-border/50">
                                                        <Sparkles size={12} /> {job.experienceLevel || 'Fresher'}
                                                    </span>
                                                </div>

                                                {/* Footer Row */}
                                                <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between relative z-10">
                                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                        <Clock size={12} />
                                                        {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 text-sm font-bold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                        View Role <ArrowRight size={14} />
                                                    </div>
                                                </div>
                                            </Card>
                                        </HoverLift>
                                    </StaggerItem>
                                );
                            })}
                        </StaggerContainer>
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
                                        {selectedJob.companyName} • <span className="text-xs">{new Date(selectedJob.createdAt).toLocaleDateString()}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Relevance Score Display */}
                            <div className="shrink-0">
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-extrabold border shadow-sm",
                                    (selectedJob.relevance ?? 0) >= 80 
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                        : (selectedJob.relevance ?? 0) >= 60 
                                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                                            : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                )}>
                                    <Sparkles size={16} />
                                    <span>{selectedJob.relevance ?? 0}% Match Score</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Location</div>
                                <div className="font-medium text-sm">{selectedJob.location}</div>
                            </div>
                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12} /> Type</div>
                                <div className="font-medium text-sm">{selectedJob.jobType}</div>
                            </div>
                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1 border-t lg:border-t-0">
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12} /> Experience</div>
                                <div className="font-medium text-sm">{selectedJob.experienceLevel || 'Fresher'}</div>
                            </div>
                            <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1 border-t lg:border-t-0">
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><IndianRupee size={12} /> Salary Range</div>
                                    <div className="font-medium text-sm">{selectedJob.salary}</div>
                                </div>
                            </div>
                        </div>

                        {/* Skills Display in Detail Modal */}
                        {selectedJob.skills && selectedJob.skills.length > 0 && (
                            <div>
                                <h3 className="font-bold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Required Skills</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedJob.skills.map((skill, index) => {
                                        const isStudentSkill = profile?.skills?.some(s => s.toLowerCase().trim() === skill.toLowerCase().trim());
                                        return (
                                            <Badge 
                                                key={index}
                                                variant="secondary"
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs font-semibold border",
                                                    isStudentSkill 
                                                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" 
                                                        : "bg-muted text-muted-foreground border-border/60"
                                                )}
                                            >
                                                {skill} {isStudentSkill && '✓'}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="font-bold mb-3 text-lg">About the Role</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedJob.description}
                            </p>
                            <p className="text-muted-foreground text-sm leading-relaxed mt-4">
                                We act as your lifelong partner for successful candidates. Apply directly below and log it to your tracking portal.
                            </p>
                        </div>

                        {/* Apply Action block enforcing 60% threshold */}
                        <div className="pt-6 border-t border-border flex flex-col gap-4">
                            {(selectedJob.relevance ?? 0) < 60 ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-semibold flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                                        <div>
                                            <p className="font-bold text-rose-800">Not relevant enough</p>
                                            <p className="text-rose-600 font-medium mt-0.5 leading-relaxed">
                                                This role has a relevancy score of {selectedJob.relevance}%, which is below the required 60% threshold based on your profile career goals and skills. Update your profile to match these requirements to apply.
                                            </p>
                                        </div>
                                    </div>
                                    <Button disabled className="w-full h-12 bg-muted text-muted-foreground border border-border/50 cursor-not-allowed font-bold">
                                        Apply Blocked (Under 60% Relevancy)
                                    </Button>
                                </div>
                            ) : appliedJobs.includes(selectedJob.id) ? (
                                <Button disabled className="w-full h-12 font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Application Submitted</Button>
                            ) : (
                                <div className="space-y-2">
                                    <Button className="w-full h-12 gap-2 font-bold" onClick={() => handleApply(selectedJob)} disabled>
                                        Apply Externally <ExternalLink size={16} />
                                    </Button>
                                    <p className="text-[11px] text-center text-muted-foreground font-light leading-normal">
                                        By clicking apply you might be redirected to third party site for application
                                    </p>
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
