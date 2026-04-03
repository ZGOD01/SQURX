import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRecruiterStore } from './store';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Toast } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { companyProfileSchema, type CompanyProfileValues } from '@/lib/validators/recruiter';
import { Loader2, Building2 } from 'lucide-react';

import { useAuthStore } from '../auth/store';

export function RecruiterCompany() {
    const { user } = useAuthStore();
    const { company, updateCompany } = useRecruiterStore();
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<CompanyProfileValues>({
        resolver: zodResolver(companyProfileSchema),
        defaultValues: {
            name: company?.name || '',
            website: company?.website || '',
            industry: company?.industry || '',
            description: company?.description || '',
        }
    });

    const onSubmit = async (data: CompanyProfileValues) => {
        setIsSaving(true);
        if (user) {
            await updateCompany(user.id, data);
        }
        setIsSaving(false);
        setToastMessage('Company profile updated successfully.');
    };

    if (!company) return null;

    return (
        <PageTransition className="max-w-3xl mx-auto space-y-6 pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
                <p className="text-muted-foreground mt-1">Manage how your company appears to candidates.</p>
            </div>

            <Card className="border-border/60 shadow-sm bg-card">
                <CardHeader className="flex flex-row items-center gap-4 border-b border-border/50 pb-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Building2 size={32} />
                    </div>
                    <div>
                        <CardTitle>{company.name || 'Your Company'}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{company.industry || 'Industry not set'}</p>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Company Name <span className="text-destructive">*</span></label>
                                <Input
                                    placeholder="e.g. Acme Corp"
                                    className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                                    {...register('name')}
                                />
                                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Industry <span className="text-destructive">*</span></label>
                                <Input
                                    placeholder="e.g. Finance, Technology"
                                    className={errors.industry ? 'border-destructive focus-visible:ring-destructive' : ''}
                                    {...register('industry')}
                                />
                                {errors.industry && <p className="text-destructive text-xs">{errors.industry.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Website URL</label>
                            <Input
                                placeholder="https://example.com"
                                className={errors.website ? 'border-destructive focus-visible:ring-destructive' : ''}
                                {...register('website')}
                            />
                            {errors.website && <p className="text-destructive text-xs">{errors.website.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Company Description <span className="text-destructive">*</span></label>
                            <Textarea
                                placeholder="What does your company do? What is the culture like?"
                                className={`resize-none h-40 ${errors.description ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                {...register('description')}
                            />
                            {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-border/50">
                            <Button type="submit" disabled={isSaving} className="w-full md:w-auto px-8">
                                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Profile'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

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
