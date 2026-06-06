import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStudentStore } from './store';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Toast, Modal, Badge } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { useAuthStore } from '../auth/store';
import { useNavigate, Link } from 'react-router-dom';
import { useNotificationStore } from '@/lib/store/notifications';
import { studentProfileSchema, type StudentProfileValues } from '@/lib/validators/student';
import { Loader2, UploadCloud, FileText, Trash2, ShieldCheck } from 'lucide-react';
import { getGdprConsent, setGdprConsent } from '@/lib/utils';

export function StudentProfile() {
    const { user, logout } = useAuthStore();
    const { profile, updateProfile, getCompletionPercentage, fetchDashboardData, deleteAccount } = useStudentStore();
    const { sendEmail } = useNotificationStore();
    const navigate = useNavigate();
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingCV, setIsUploadingCV] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isConsentEnabled, setIsConsentEnabled] = useState(false);

    useEffect(() => {
        if (user) {
            setIsConsentEnabled(getGdprConsent(user.id));
        }
    }, [user]);

    const handleConsentToggle = async (checked: boolean) => {
        if (!user) return;
        setIsConsentEnabled(checked);
        setGdprConsent(user.id, checked);
        
        // Log withdraw/re-consent
        const log = {
            userId: user.id,
            email: user.email,
            timestamp: new Date().toISOString(),
            status: checked ? "GRANTED" : "WITHDRAWN"
        };
        localStorage.setItem(`squrx_gdpr_withdraw_log_${user.id}`, JSON.stringify(log));

        if (checked) {
            setToastMessage("Data processing consent restored successfully.");
        } else {
            setToastMessage("Consent withdrawn. Some personalization and job matching may be limited.");
        }
    };

    const cvInputRef = useRef<HTMLInputElement>(null);
    const fetchedRef = useRef(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<StudentProfileValues>({
        resolver: zodResolver(studentProfileSchema),
        defaultValues: {
            location: profile?.location || '',
            jobType: profile?.jobType || '',
            careerGoal: profile?.careerGoal || '',
        }
    });

    const onSubmit = async (data: StudentProfileValues) => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 800)); // mock delay
        if (user) {
            await updateProfile(user.id, data);
            sendEmail('Profile Updated Successfully', `Your profile data has been updated on Squrx. Keeping your profile fresh increases your visibility!`);
        }
        setIsSaving(false);
        setToastMessage('Profile details saved successfully.');
    };

    const handleConfirmDelete = async () => {
        if (!user) return;
        
        setIsDeleting(true);
        try {
            await deleteAccount(user.id);
            navigate('/', { replace: true });
            setTimeout(() => {
                logout();       // Clear Auth state
            }, 0);
        } catch (err) {
            console.error(err);
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setToastMessage("Failed to delete account. Please try again.");
        }
    };

    const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { alert("File is too large. Max size is 5MB."); return; }
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) { alert("Invalid format. PDF/DOC/DOCX only."); return; }

        setIsUploadingCV(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (user) {
            await updateProfile(user.id, { cvUrl: URL.createObjectURL(file) });
            sendEmail('CV Upload Received', `Your new Curriculum Vitae (${file.name}) was successfully processed and mapped to your applicant profile.`);
        }
        setIsUploadingCV(false);
        setToastMessage('CV uploaded successfully.');
        if (cvInputRef.current) cvInputRef.current.value = '';
    };
    const removeCV = async () => {
        if (user) {
            await updateProfile(user.id, { cvUrl: null });
            setToastMessage('CV removed.');
            sendEmail('CV Removed', 'Your active Curriculum Vitae has been successfully removed from our internal databases.');
        }
    };

    useEffect(() => {
        if (user && !profile && !fetchedRef.current) {
            fetchedRef.current = true;
            fetchDashboardData(user.id);
        }
    }, [user, profile, fetchDashboardData]);

    useEffect(() => {
        if (profile) {
            reset({
                location: profile.location || '',
                jobType: profile.jobType || '',
                careerGoal: profile.careerGoal || '',
            });
        }
    }, [profile, reset]);

    if (!profile) return (
        <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p>Loading your profile...</p>
        </div>
    );

    const completion = getCompletionPercentage();

    return (
        <PageTransition className="max-w-4xl mx-auto space-y-6 pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
                <p className="text-muted-foreground mt-1">Complete your profile to increase your visibility among recruiters.</p>
            </div>

            <div className="bg-muted/30 rounded-2xl p-6 border border-border/50 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                <div className="relative w-24 h-24 rounded-full border-4 border-background shadow-md bg-secondary flex text-primary items-center justify-center shrink-0">
                    <div className="text-2xl font-bold">{completion}%</div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" strokeOpacity="0.1" />
                        <circle
                            cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8"
                            strokeDasharray={`${(completion / 100) * 289} 289`}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold">Profile Strength</h3>
                    <p className="text-muted-foreground mt-1 max-w-lg">
                        {completion === 100
                            ? "Your profile is fully complete! You are now 4x more likely to be noticed by top-tier firms."
                            : `A complete profile is 4x more likely to be noticed. ${!profile.cvUrl ? 'Make sure you upload your CV.' : 'Finish adding your details below to reach 100% visibility.'}`
                        }
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
                <Card className="border-border/60 shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-1.5 opacity-80">
                                <label className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                                    Full Name <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal text-muted-foreground">Synced</span>
                                </label>
                                <Input
                                    value={user?.name || user?.fullName || ''}
                                    disabled
                                    className="bg-muted/50 cursor-not-allowed border-border/40 text-muted-foreground font-medium"
                                />
                            </div>

                            <div className="space-y-1.5 opacity-80">
                                <label className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                                    Email Address <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal text-muted-foreground">Synced</span>
                                </label>
                                <Input
                                    value={user?.email || ''}
                                    disabled
                                    className="bg-muted/50 cursor-not-allowed border-border/40 text-muted-foreground font-medium"
                                />
                            </div>

                            <div className="space-y-1.5 opacity-80">
                                <label className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                                    Mobile Number <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal text-muted-foreground">Synced</span>
                                </label>
                                <Input
                                    value={user?.mobile || ''}
                                    disabled
                                    className="bg-muted/50 cursor-not-allowed border-border/40 text-muted-foreground font-medium"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Location <span className="text-destructive">*</span></label>
                                <Input
                                    placeholder="e.g. New York, Remote"
                                    className={errors.location ? 'border-destructive focus-visible:ring-destructive' : ''}
                                    {...register('location')}
                                />
                                {errors.location && <p className="text-destructive text-xs">{errors.location.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Desired Job Type <span className="text-destructive">*</span></label>
                                <Input
                                    placeholder="e.g. Full-Time, Internship, Remote"
                                    className={errors.jobType ? 'border-destructive focus-visible:ring-destructive' : ''}
                                    {...register('jobType')}
                                />
                                {errors.jobType && <p className="text-destructive text-xs">{errors.jobType.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Career Goal <span className="text-destructive">*</span></label>
                                <Textarea
                                    placeholder="Describe your 5-year strategic career goal..."
                                    className={`resize-none h-32 ${errors.careerGoal ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                    {...register('careerGoal')}
                                />
                                {errors.careerGoal && <p className="text-destructive text-xs">{errors.careerGoal.message}</p>}
                            </div>

                            <Button type="submit" disabled={isSaving} className="w-full">
                                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Information'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6 sticky top-6">
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle>Curriculum Vitae (CV)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {profile.cvUrl ? (
                                <div className="space-y-4">
                                    <div className="p-4 border border-border/60 bg-muted/20 rounded-xl flex items-start gap-4 shadow-sm">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="font-semibold text-sm truncate" title="Uploaded CV">{profile.cvUrl.replace(/^.*[\\/]/, '') || 'Resume_Document.pdf'}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                1.2 MB • Uploaded recently
                                            </p>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2" onClick={removeCV}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Replace Document</span></div>
                                    </div>

                                    <Button variant="outline" className="w-full cursor-pointer overflow-hidden relative group">
                                        <span className="flex items-center gap-2 group-hover:text-primary transition-colors">
                                            <UploadCloud size={18} /> Upload New CV
                                        </span>
                                        <input
                                            type="file"
                                            onChange={handleCVUpload}
                                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-colors relative cursor-pointer group">
                                    {isUploadingCV ? (
                                        <div className="flex flex-col items-center gap-4 py-8">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            <p className="text-sm font-medium">Processing document...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <UploadCloud size={28} />
                                            </div>
                                            <h4 className="font-bold mb-1">Upload your CV</h4>
                                            <p className="text-sm text-muted-foreground max-w-[200px]">PDF, DOC, DOCX up to 5MB</p>
                                            <Button size="sm" className="mt-6 font-medium px-6">Select File</Button>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        ref={cvInputRef}
                                        onChange={handleCVUpload}
                                        disabled={isUploadingCV}
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center justify-between">
                                Core Skills
                                <Link to="/student/preferences" className="text-xs text-primary hover:underline font-normal">Edit Preferences</Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {profile.skills && profile.skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill, index) => (
                                        <Badge key={index} variant="secondary" className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary/80 text-secondary-foreground">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No skills added yet. Add core skills in preferences to get job alerts.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-black" /> Privacy & Consent (DPDP / GDPR)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between p-4 border border-border/60 bg-muted/20 rounded-xl shadow-sm">
                                <div className="space-y-0.5 max-w-[70%]">
                                    <h4 className="font-semibold text-sm">Allow Data Processing</h4>
                                    <p className="text-xs text-muted-foreground leading-normal">
                                        Allow SQURX to process your profile, CV, and preferences to match you with job openings.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={isConsentEnabled} 
                                        onChange={(e) => handleConsentToggle(e.target.checked)} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Your Control Rights</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    In compliance with the Digital Personal Data Protection Act (DPDP) 2023, you have the right to withdraw consent, see what data we hold, or delete your account. For inquiries, email <a href="mailto:privacy@sqrex.com" className="text-primary hover:underline">privacy@sqrex.com</a>.
                                </p>
                            </div>

                            <div className="pt-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="w-full border-red-200/60 bg-red-50/30 text-red-600 hover:bg-red-600 hover:text-white transition-colors duration-300 h-10 font-semibold"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete My Data
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Subtle but recognizable Account Deletion Button */}
            <div className="flex justify-start sm:justify-end pt-8 mt-4 border-t border-border/40">
                <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="border-red-200/50 bg-red-50/50 text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-all shadow-sm h-10 px-6 font-medium"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete My Data
                </Button>
            </div>

            <Modal isOpen={isDeleteModalOpen} onClose={() => !isDeleting && setIsDeleteModalOpen(false)} title="Delete Data & Profile?">
                <div className="space-y-5 mt-2">
                    <p className="text-muted-foreground text-[15px] leading-relaxed">
                        Are you absolutely sure you want to completely delete your profile data? All of your uploaded certificates, CVs, and applications will be permanently erased from our system in compliance with DPDP 2023 data fiduciary obligations. 
                        <br/><br/>
                        <strong className="text-foreground font-semibold">This action cannot be undone.</strong>
                    </p>
                    <div className="flex justify-end gap-3 pt-6 border-t border-border/40 mt-6">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Cancel</Button>
                        <Button 
                            variant="outline" 
                            onClick={handleConfirmDelete} 
                            disabled={isDeleting}
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white transition-colors duration-300"
                        >
                            {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : 'Yes, Delete Everything'}
                        </Button>
                    </div>
                </div>
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
