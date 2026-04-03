import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRecruiterStore } from './store';
import { Card, CardContent, Button, Input, Textarea, Select, TagInput, Toast, Badge, Drawer } from '@/components/ui';
import { PageTransition, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { vacancySchema, type VacancyValues } from '@/lib/validators/recruiter';
import { Loader2, Plus, Briefcase, MapPin, Eye, MousePointerClick, Building2 } from 'lucide-react';

import { useAuthStore } from '../auth/store';
import type { JobVacancy } from '@/lib/mockDb/schema';

export function RecruiterVacancies() {
    const { user } = useAuthStore();
    const { company, vacancies, createVacancy, updateVacancyStatus, deleteVacancy } = useRecruiterStore();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<VacancyValues>({
        resolver: zodResolver(vacancySchema),
        defaultValues: {
            skills: [],
            jobType: 'Full-Time',
            experienceLevel: 'Mid-Level'
        }
    });

    const skills = watch('skills');

    const onSubmit = async (data: VacancyValues) => {
        setIsSaving(true);
        if (user && company) {
            const newVacancy: JobVacancy = {
                id: `vac-${Date.now()}`,
                recruiterId: user.id,
                companyName: company.name,
                title: data.title,
                degree: data.degree,
                location: data.location,
                skills: data.skills,
                jobType: data.jobType,
                experienceLevel: data.experienceLevel,
                salary: data.salary,
                description: data.description,
                applyLink: data.applyLink,
                status: 'Active',
                createdAt: new Date().toISOString(),
                views: 0,
                clicks: 0
            };
            await createVacancy(newVacancy);
        }
        setIsSaving(false);
        setIsDrawerOpen(false);
        reset(); // clear form
        setToastMessage('Vacancy successfully posted to network.');
    };

    return (
        <PageTransition className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vacancies</h1>
                    <p className="text-muted-foreground mt-1">Manage your active listings and create new roles.</p>
                </div>
                <Button onClick={() => setIsDrawerOpen(true)} className="shrink-0 group">
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" /> Create Vacancy
                </Button>
            </div>

            {vacancies.length === 0 ? (
                <Card className="border-dashed border-2 border-border/60 bg-muted/10">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center h-64">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                            <Briefcase size={28} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No active vacancies</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            You haven't posted any jobs yet. Create your first vacancy to start receiving applicants.
                        </p>
                        <Button onClick={() => setIsDrawerOpen(true)}>Create First Vacancy</Button>
                    </CardContent>
                </Card>
            ) : (
                <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vacancies.map((vacancy) => (
                        <StaggerItem key={vacancy.id}>
                            <HoverLift>
                                <Card className={`h-full border-border/60 flex flex-col transition-colors group relative ${vacancy.status === 'Closed' ? 'opacity-70 bg-muted/30 grayscale-[50%]' : 'bg-card hover:border-primary/40'}`}>

                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        <Badge variant={vacancy.status === 'Active' ? 'default' : 'secondary'} className={vacancy.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm' : ''}>
                                            {vacancy.status}
                                        </Badge>
                                    </div>

                                    <CardContent className="p-6 flex-1 flex flex-col">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 shrink-0">
                                            <Building2 size={24} />
                                        </div>

                                        <h3 className="text-xl font-bold leading-tight mb-2 line-clamp-2 pr-12 text-foreground">{vacancy.title}</h3>

                                        <div className="space-y-2 mt-2 text-sm text-muted-foreground mb-6">
                                            <div className="flex items-center gap-2 font-medium"><MapPin size={16} className="opacity-70 text-foreground" /> {vacancy.location}</div>
                                            <div className="flex items-center gap-2 font-medium"><Briefcase size={16} className="opacity-70 text-foreground" /> {vacancy.jobType} • {vacancy.degree}</div>
                                        </div>

                                        <div className="mt-auto grid grid-cols-2 gap-3 pt-6 border-t border-border mt-6">
                                            <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/40">
                                                <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                                                    <Eye size={16} className="text-muted-foreground" /> {vacancy.views}
                                                </div>
                                                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Views</div>
                                            </div>
                                            <div className="bg-muted/50 rounded-lg p-3 text-center border border-border/40">
                                                <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                                                    <MousePointerClick size={16} className="text-muted-foreground" /> {vacancy.clicks}
                                                </div>
                                                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Clicks</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-xs"
                                                onClick={() => updateVacancyStatus(vacancy.id, vacancy.status === 'Active' ? 'Closed' : 'Active')}
                                            >
                                                {vacancy.status === 'Active' ? 'Close Listing' : 'Reactivate'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="px-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
                                                onClick={() => deleteVacancy(vacancy.id)}
                                                title="Delete Vacancy"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </HoverLift>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            )}

            {/* Create Vacancy Drawer */}
            <Drawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Create New Vacancy"
            >
                <form id="create-vacancy" onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Role Title <span className="text-destructive">*</span></label>
                        <Input
                            placeholder="e.g. Senior Software Engineer"
                            className={errors.title ? 'border-destructive focus-visible:ring-destructive' : ''}
                            {...register('title')}
                        />
                        {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Location <span className="text-destructive">*</span></label>
                            <Input
                                placeholder="e.g. Remote, NYC"
                                className={errors.location ? 'border-destructive focus-visible:ring-destructive' : ''}
                                {...register('location')}
                            />
                            {errors.location && <p className="text-destructive text-xs">{errors.location.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Job Type <span className="text-destructive">*</span></label>
                            <Select
                                {...register('jobType')}
                                className={errors.jobType ? 'border-destructive focus-visible:ring-destructive' : ''}
                            >
                                <option value="Full-Time">Full-Time</option>
                                <option value="Part-Time">Part-Time</option>
                                <option value="Contract">Contract</option>
                                <option value="Internship">Internship</option>
                                <option value="Hybrid">Hybrid</option>
                            </Select>
                            {errors.jobType && <p className="text-destructive text-xs">{errors.jobType.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Minimum Degree <span className="text-destructive">*</span></label>
                            <Input
                                placeholder="e.g. Bachelor's in CS"
                                className={errors.degree ? 'border-destructive focus-visible:ring-destructive' : ''}
                                {...register('degree')}
                            />
                            {errors.degree && <p className="text-destructive text-xs">{errors.degree.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Salary <span className="text-destructive">*</span></label>
                            <Input
                                placeholder="e.g. ₹8L - 12L or Competitive"
                                className={errors.salary ? 'border-destructive focus-visible:ring-destructive' : ''}
                                {...register('salary')}
                            />
                            {errors.salary && <p className="text-destructive text-xs">{errors.salary.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Skill Requirements <span className="text-destructive">*</span></label>
                        <TagInput
                            placeholder="Add skill and press Enter..."
                            tags={skills || []}
                            onChange={(newTags: string[]) => setValue('skills', newTags, { shouldValidate: true })}
                        />
                        {errors.skills && <p className="text-destructive text-xs">{errors.skills.message}</p>}
                        <p className="text-xs text-muted-foreground">These tags drive the matching algorithm against student profiles.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">External Apply Link <span className="text-destructive">*</span></label>
                        <Input
                            type="url"
                            placeholder="https://your-ats.com/apply/123"
                            className={errors.applyLink ? 'border-destructive focus-visible:ring-destructive' : ''}
                            {...register('applyLink')}
                        />
                        {errors.applyLink && <p className="text-destructive text-xs">{errors.applyLink.message}</p>}
                        <p className="text-xs text-muted-foreground">Candidates will be seamlessly redirected here after matching.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Job Description <span className="text-destructive">*</span></label>
                        <Textarea
                            placeholder="Describe the role, responsibilities, and requirements..."
                            className={`resize-none h-40 ${errors.description ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                            {...register('description')}
                        />
                        {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
                    </div>

                    <div className="fixed bottom-0 right-0 w-full max-w-md p-4 bg-card/95 backdrop-blur border-t border-border z-10 flex gap-4 drawer-footer">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsDrawerOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 shadow-lg"
                            disabled={isSaving}
                        >
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Launch Vacancy'}
                        </Button>
                    </div>
                </form>
            </Drawer>

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
