import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStudentStore } from './store';
import { Card, CardHeader, CardTitle, CardContent, Button, TagInput, Toast } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { studentPreferencesSchema, type StudentPreferencesValues } from '@/lib/validators/student';
import { useNotificationStore } from '@/lib/store/notifications';
import { Loader2, BellRing, Compass } from 'lucide-react';
import { useAuthStore } from '../auth/store';
export function StudentPreferences() {
    const { user } = useAuthStore();
    const { profile, updateProfile } = useStudentStore();
    const { sendEmail } = useNotificationStore();
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<StudentPreferencesValues>({
        resolver: zodResolver(studentPreferencesSchema),
        defaultValues: {
            locations: profile?.locations || [],
            jobTypes: profile?.jobTypes || [],
            skills: profile?.skills || [],
            alertCount: profile?.alertCount || 10,
        }
    });

    const locations = watch('locations');
    const jobTypes = watch('jobTypes');
    const skills = watch('skills');

    const onSubmit = async (data: StudentPreferencesValues) => {
        setIsSaving(true);
        await new Promise(res => setTimeout(res, 800)); // mock delay
        if (user) {
            await updateProfile(user.id, data);
            sendEmail('Tuning Your Matches', 'Your job matching preferences were just updated. We will automatically alert you of high-quality roles matching your new criteria.');
        }
        setIsSaving(false);
        setToastMessage('Preferences saved successfully.');
    };

    return (
        <PageTransition className="max-w-4xl mx-auto space-y-6 pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Job Preferences</h1>
                <p className="text-muted-foreground mt-1">Tune the matching algorithm to define the exact roles you want.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Compass className="w-5 h-5 text-primary" /> Target Criteria
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form id="pref-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                                {/* Locations Multi */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Desired Locations</label>
                                    <TagInput
                                        placeholder="Type city and press Enter..."
                                        tags={locations}
                                        onChange={(newTags: string[]) => setValue('locations', newTags, { shouldValidate: true })}
                                    />
                                    {errors.locations && <p className="text-destructive text-xs">{errors.locations.message}</p>}
                                </div>

                                {/* Job Types Multi */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Job Types</label>
                                    <TagInput
                                        placeholder="e.g. Remote, Hybrid, Contract..."
                                        tags={jobTypes}
                                        onChange={(newTags: string[]) => setValue('jobTypes', newTags, { shouldValidate: true })}
                                    />
                                    {errors.jobTypes && <p className="text-destructive text-xs">{errors.jobTypes.message}</p>}
                                </div>

                                {/* Skills Multi */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Core Skills</label>
                                    <TagInput
                                        placeholder="e.g. Python, Agile, Product Strategy..."
                                        tags={skills}
                                        onChange={(newTags: string[]) => setValue('skills', newTags, { shouldValidate: true })}
                                    />
                                    {errors.skills && <p className="text-destructive text-xs">{errors.skills.message}</p>}
                                </div>

                                {/* Frequency & Limits */}
                                <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-sm font-medium">Alert Frequency</h4>
                                            <p className="text-xs text-muted-foreground">Fixed pacing logic</p>
                                        </div>
                                        <div className="text-sm font-semibold bg-background border px-3 py-1 rounded-md text-muted-foreground">Weekly</div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <label className="text-sm font-medium">Max Alerts Per Cycle</label>
                                            <span className="text-xs font-mono text-muted-foreground bg-background px-1 rounded border">{watch('alertCount')} jobs</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="5"
                                            max="20"
                                            step="1"
                                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                            {...register('alertCount', { valueAsNumber: true })}
                                        />
                                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-1">
                                            <span>5</span>
                                            <span>20</span>
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" disabled={isSaving} className="w-full">
                                    {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating algorithm...</> : 'Save Preferences'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Live Alerts Engine Box */}
                <div className="space-y-6">
                    <Card className="border-primary/20 bg-primary/5 shadow-sm sticky top-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BellRing className="w-5 h-5 text-primary" /> Live Alerts Engine
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-foreground/80 leading-relaxed">
                                Squrex uses your preferences to actively hunt the global network for matches. Live weekly alerts tailored to your preferences will be available soon.
                            </p>

                            <Button
                                disabled
                                className="w-full bg-primary/80 text-white font-medium cursor-not-allowed opacity-90 disabled:opacity-85 shadow-none"
                            >
                                Coming Soon
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[100]">
                    <Toast variant="success" title="Algorithm Updated" onClose={() => setToastMessage(null)}>
                        {toastMessage}
                    </Toast>
                </div>
            )}
        </PageTransition>
    );
}
