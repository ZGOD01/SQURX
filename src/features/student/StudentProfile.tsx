import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStudentStore } from './store';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, Toast, Modal } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { useAuthStore } from '../auth/store';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/lib/store/notifications';
import { studentProfileSchema, type StudentProfileValues } from '@/lib/validators/student';
import { Loader2, UploadCloud, FileText, Trash2 } from 'lucide-react';

export function StudentProfile() {
    const { user, logout } = useAuthStore();
    const { profile, updateProfile, getCompletionPercentage, fetchDashboardData, deleteAccount } = useStudentStore();
    const { sendEmail } = useNotificationStore();
    const navigate = useNavigate();
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingCV, setIsUploadingCV] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const cvInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
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
            logout();       // Clear Auth state
            navigate('/'); // Redirect to landing page immediately
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

    const handleDocUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { alert("File is too large. Max size is 5MB."); return; }
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) { alert("Invalid format. PDF/DOC/DOCX only."); return; }

        setIsUploadingDoc(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (user) {
            await updateProfile(user.id, { documentUrl: URL.createObjectURL(file) });
            sendEmail('Document Verification Complete', `Your document (${file.name}) was successfully stored and marked as verified on your profile.`);
        }
        setIsUploadingDoc(false);
        setToastMessage('Document uploaded successfully.');
        if (docInputRef.current) docInputRef.current.value = '';
    };

    const removeCV = async () => {
        if (user) {
            await updateProfile(user.id, { cvUrl: null });
            setToastMessage('CV removed.');
            sendEmail('CV Removed', 'Your active Curriculum Vitae has been successfully removed from our internal databases.');
        }
    };

    const removeDoc = async () => {
        if (user) {
            await updateProfile(user.id, { documentUrl: null });
            setToastMessage('Document removed.');
            sendEmail('Document Removed', 'Your active document has been successfully removed from our internal databases.');
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
                            : `A complete profile is 4x more likely to be noticed. ${(!profile.cvUrl || !profile.documentUrl) ? 'Make sure you upload your CV and verified documents.' : 'Finish adding your details below to reach 100% visibility.'}`
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
                            <CardTitle>School Leaving Certificate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {profile.documentUrl ? (
                                <div className="space-y-4">
                                    <div className="p-4 border border-border/60 bg-muted/20 rounded-xl flex items-start gap-4 shadow-sm">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="font-semibold text-sm truncate" title="Uploaded Document">{profile.documentUrl.replace(/^.*[\\/]/, '') || 'School_Certificate.doc'}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Verified recently</p>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2" onClick={removeDoc}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Replace Document</span></div>
                                    </div>

                                    <Button variant="outline" className="w-full cursor-pointer overflow-hidden relative group">
                                        <span className="flex items-center gap-2 group-hover:text-primary transition-colors">
                                            <UploadCloud size={18} /> Upload New Certificate
                                        </span>
                                        <input
                                            type="file"
                                            onChange={handleDocUpload}
                                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-colors relative cursor-pointer group">
                                    {isUploadingDoc ? (
                                        <div className="flex flex-col items-center gap-4 py-8">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            <p className="text-sm font-medium">Processing document...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <UploadCloud size={28} />
                                            </div>
                                            <h4 className="font-bold mb-1">Upload Certificate</h4>
                                            <p className="text-sm text-muted-foreground max-w-[200px]">PDF, DOC, DOCX up to 5MB</p>
                                            <Button size="sm" className="mt-6 font-medium px-6">Select File</Button>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        ref={docInputRef}
                                        onChange={handleDocUpload}
                                        disabled={isUploadingDoc}
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
                                    />
                                </div>
                            )}
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
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Profile
                </Button>
            </div>

            <Modal isOpen={isDeleteModalOpen} onClose={() => !isDeleting && setIsDeleteModalOpen(false)} title="Delete Profile?">
                <div className="space-y-5 mt-2">
                    <p className="text-muted-foreground text-[15px] leading-relaxed">
                        Are you absolutely sure you want to completely delete your profile data? All of your uploaded certificates, CVs, applications, and consultation bookings will be permanently erased. 
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
