import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRecruiterStore } from './store';
import { useAuthStore } from '../auth/store';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { PageTransition, HoverLift } from '@/components/motion';
import { Building2, Briefcase, Eye, MousePointerClick, ArrowRight, Activity } from 'lucide-react';

export function RecruiterDashboard() {
    const { user } = useAuthStore();
    const { company, vacancies, candidates, loadCandidates } = useRecruiterStore();

    useEffect(() => {
        loadCandidates();
    }, [loadCandidates]);

    if (!company) return null;

    const activeVacancies = vacancies.filter(v => v.status === 'Active');
    const recentApplicants = candidates.filter(c => c.applications.some(a => vacancies.some(v => v.id === a.vacancyId))).slice(0, 4);
    const totalViews = vacancies.reduce((acc, curr) => acc + curr.views, 0);
    const totalClicks = vacancies.reduce((acc, curr) => acc + curr.clicks, 0);

    const stats = [
        {
            label: 'Active Listings',
            value: activeVacancies.length,
            icon: Briefcase,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Total Views',
            value: totalViews,
            icon: Eye,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10'
        },
        {
            label: 'Total Clicks (Applies)',
            value: totalClicks,
            icon: MousePointerClick,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'Conversion Rate',
            value: totalViews ? `${Math.round((totalClicks / totalViews) * 100)}%` : '0%',
            icon: Activity,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        }
    ];

    return (
        <PageTransition className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Recruiter Operations</h1>
                    <p className="text-muted-foreground mt-1">Welcome back, {user?.name.split(' ')[0]}. Manage {company.name || 'your company'}'s hiring funnel.</p>
                </div>
                <Link to="/recruiter/vacancies">
                    <Button>Post New Vacancy</Button>
                </Link>
            </div>

            {!company.name && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-500">Incomplete Company Profile</p>
                            <p className="text-sm text-foreground/80 font-medium">
                                Candidates want to know who they are applying to. Complete your profile.
                            </p>
                        </div>
                    </div>
                    <Link to="/recruiter/company">
                        <Button variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-500 hover:bg-amber-500/20 shrink-0">
                            Complete Profile
                        </Button>
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                    <HoverLift key={i}>
                        <Card className="h-full border-border/60">
                            <CardContent className="p-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{stat.label}</p>
                                <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                            </CardContent>
                        </Card>
                    </HoverLift>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-2">
                <Card className="border-border/60 shadow-sm h-[400px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">Recent Applicant Pipeline</CardTitle>
                        <Link to="/recruiter/candidates" className="text-sm text-primary hover:underline flex items-center">
                            View All <ArrowRight size={14} className="ml-1" />
                        </Link>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-60px)]">
                        <div className="space-y-4">
                            {recentApplicants.length > 0 ? recentApplicants.map((candidate) => {
                                const matchedApp = candidate.applications.find(a => vacancies.some(v => v.id === a.vacancyId));
                                const job = vacancies.find(v => v.id === matchedApp?.vacancyId);

                                return (
                                    <div key={candidate.user.id} className="flex justify-between items-center p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group">
                                        <div className="pr-4">
                                            <h5 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{candidate.user.name}</h5>
                                            <p className="text-xs text-muted-foreground mt-1">Applied for: {job?.title}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-center text-sm font-bold bg-muted px-3 py-1 rounded-full border border-border/50">
                                            Review
                                        </div>
                                    </div>
                                )
                            }) : (
                                <div className="h-full flex flex-col items-center justify-center text-center pb-6">
                                    <Activity size={24} className="text-muted-foreground mb-3 opacity-50" />
                                    <p className="text-sm font-medium">No recent applications.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm h-[400px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">Your Top Active Listings</CardTitle>
                        <Link to="/recruiter/vacancies" className="text-sm text-primary hover:underline flex items-center">
                            Manage <ArrowRight size={14} className="ml-1" />
                        </Link>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-60px)]">
                        <div className="space-y-4">
                            {activeVacancies.slice(0, 4).length > 0 ? activeVacancies.slice(0, 4).map((vac) => (
                                <div key={vac.id} className="flex justify-between items-center p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group">
                                    <div className="pr-4">
                                        <h5 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{vac.title}</h5>
                                        <p className="text-xs text-muted-foreground mt-1">{vac.location} • {vac.views} Views</p>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-center text-sm font-bold bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full border border-emerald-500/20">
                                        {vac.clicks} Applies
                                    </div>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-center pb-6">
                                    <Briefcase size={24} className="text-muted-foreground mb-3 opacity-50" />
                                    <p className="text-sm font-medium">No active listings.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageTransition>
    );
}
