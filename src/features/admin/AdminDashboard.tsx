import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PageTransition, HoverLift } from '@/components/motion';
import { useAdminStore } from './store';
import { useAuthStore } from '../auth/store';
import { Users, Briefcase, Activity, ShieldAlert, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
    const { user } = useAuthStore();
    const { users } = useAdminStore();

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    const suspendedUsers = users.filter(u => u.status === 'Suspended').length;

    const kpis = [
        { label: 'Total Nodes (Users)', value: totalUsers, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Active Sessions', value: activeUsers, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Platform Vacancies', value: '143', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Suspended Nodes', value: suspendedUsers, icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10' },
    ];

    const recentEvents = [
        { title: 'TechCorp Talent created 5 new vacancies', time: '10 mins ago', type: 'system' },
        { title: 'Marcus Johnson account manually suspended', time: '1 hour ago', type: 'alert' },
        { title: 'Traffic peak: 1,200 unique students online', time: '3 hours ago', type: 'info' },
        { title: 'New database migration succeeded', time: 'Yesterday', type: 'system' },
        { title: 'Weekly alert cycle generated 4,500 matches', time: 'Yesterday', type: 'success' },
    ];

    return (
        <PageTransition className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Global Operations</h1>
                    <p className="text-muted-foreground mt-1">Hello, root access verified for {user?.name}.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {kpis.map((kpi, i) => (
                    <HoverLift key={i}>
                        <Card className="h-full border-border/60">
                            <CardContent className="p-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${kpi.bg} ${kpi.color}`}>
                                    <kpi.icon size={24} />
                                </div>
                                <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{kpi.label}</p>
                                <h3 className="text-3xl font-bold tracking-tight">{kpi.value}</h3>
                            </CardContent>
                        </Card>
                    </HoverLift>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-border/60 shadow-sm bg-card h-full min-h-[400px]">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <TrendingUp className="text-primary w-5 h-5" /> Key Network Behaviors
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-full pt-4">
                            <div className="w-full h-[300px] border-dashed border-2 border-border/50 rounded-2xl bg-muted/20 flex flex-col items-center justify-center text-center">
                                <Activity className="w-16 h-16 text-muted-foreground/50 mb-4" />
                                <h4 className="font-bold text-muted-foreground uppercase tracking-widest text-sm">Real-time Visualization Engine</h4>
                                <p className="text-xs text-muted-foreground mt-2 max-w-xs">Awaiting data pipeline connections to external ingestion layer. View full graphical analytics in the <Link to="/admin/reports" className="text-primary hover:underline">Reports Console</Link>.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-border/60 shadow-sm bg-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Network Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:ml-[11px] md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border/60 before:via-border/60 before:to-transparent">
                            {recentEvents.map((evt, i) => (
                                <div key={i} className="relative flex items-center justify-between group py-3 pr-2">
                                    <div className={`flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-background shadow shrink-0 z-10 
                                ${evt.type === 'alert' ? 'bg-destructive text-destructive-foreground' :
                                            evt.type === 'success' ? 'bg-emerald-500 text-white' :
                                                evt.type === 'info' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`
                                    }>
                                    </div>
                                    <div className="w-[calc(100%-2rem)] pl-4">
                                        <p className="text-sm font-medium text-foreground line-clamp-2">{evt.title}</p>
                                        <time className="text-xs text-muted-foreground mt-0.5 block">{evt.time}</time>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageTransition>
    );
}
