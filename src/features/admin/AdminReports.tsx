import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Activity, Download, MousePointerClick } from 'lucide-react';

const mockGrowthData = [
    { name: 'Mon', students: 400, recruiters: 24, views: 2400 },
    { name: 'Tue', students: 300, recruiters: 13, views: 1398 },
    { name: 'Wed', students: 550, recruiters: 48, views: 4800 },
    { name: 'Thu', students: 278, recruiters: 39, views: 3908 },
    { name: 'Fri', students: 189, recruiters: 48, views: 4800 },
    { name: 'Sat', students: 239, recruiters: 38, views: 3800 },
    { name: 'Sun', students: 349, recruiters: 43, views: 4300 },
];

const mockRoleData = [
    { name: 'Software Eng', applicants: 120, hires: 14 },
    { name: 'Product Mgr', applicants: 80, hires: 8 },
    { name: 'Data Sci', applicants: 150, hires: 20 },
    { name: 'UX Design', applicants: 95, hires: 10 },
    { name: 'Marketing', applicants: 60, hires: 5 },
];

export function AdminReports() {
    return (
        <PageTransition className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Reporting</h1>
                    <p className="text-muted-foreground mt-1">Aggregated platform analytics & telemetry.</p>
                </div>
                <button className="flex items-center gap-2 text-sm font-semibold bg-foreground text-background px-4 py-2 rounded-xl hover:bg-foreground/90 transition-colors shadow-md">
                    <Download size={16} /> Export CSV
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4">
                <Card className="border-border/60 shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Activity className="text-primary w-5 h-5" /> Unique Registrations (Weekly)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockGrowthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend iconType="circle" />
                                <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Students" />
                                <Line type="monotone" dataKey="recruiters" stroke="hsl(var(--chart-2, 160 60% 45%))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Recruiters" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <MousePointerClick className="text-primary w-5 h-5" /> Vacancy Outcomes by Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockRoleData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                />
                                <Legend iconType="circle" />
                                <Bar dataKey="applicants" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Applicants" barSize={12} />
                                <Bar dataKey="hires" fill="hsl(var(--chart-2, 160 60% 45%))" radius={[0, 4, 4, 0]} name="Successful Matches" barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </PageTransition>
    );
}
