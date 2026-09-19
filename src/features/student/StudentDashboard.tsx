import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStudentStore } from './store';
import { useAuthStore } from '../auth/store';
import { Card, Button, Badge, Toast } from '@/components/ui';
import { PageTransition, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion';
import { Building2, MapPin, ExternalLink, Loader2, Sparkles, IndianRupee, WifiOff, FileText, UploadCloud, Eye, Trash2 } from 'lucide-react';
import { fetchJobs, type ApiJobItem } from '@/lib/jobsApi';
import { consultationApi } from '@/lib/consultationApi';
import { getCleanFileName } from './StudentProfile';

export function StudentDashboard() {
    const { user } = useAuthStore();
    const { profile, updateProfile } = useStudentStore();

    const [jobs, setJobs] = useState<ApiJobItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // CV Upload / Delete state on Dashboard
    const [isUploadingCV, setIsUploadingCV] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
    const [toastTitle, setToastTitle] = useState<string | null>(null);
    const cvInputRef = useRef<HTMLInputElement>(null);
    const cvReplaceInputRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string, variant: 'success' | 'error' = 'success', title?: string) => {
        setToastMessage(msg);
        setToastVariant(variant);
        setToastTitle(title || (variant === 'success' ? 'Success' : 'Error'));
    };

    const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        console.log('[StudentDashboard] handleCVUpload triggered for file:', file.name, 'Size:', file.size, 'MIME:', file.type);
        if (file.size > 1 * 1024 * 1024) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            console.error(`[StudentDashboard] CV file rejected: Size (${sizeMb}MB) exceeds 1MB server limit.`);
            showToast(`CV should be less than 1MB limit (selected: ${sizeMb}MB). Please upload a smaller file.`, 'error', 'Error');
            return;
        }
        const fileName = file.name;
        const lowerName = fileName.toLowerCase();
        const isValidExtension = lowerName.endsWith('.pdf') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!validTypes.includes(file.type) && !isValidExtension) {
            console.error('[StudentDashboard] CV file rejected: Invalid MIME or extension.', file.type, fileName);
            showToast('Please upload a PDF or Word (DOC/DOCX) file', 'error');
            return;
        }
        if (!user) {
            console.error('[StudentDashboard] CV upload aborted: No authenticated user');
            return;
        }

        setIsUploadingCV(true);
        try {
            console.log('[StudentDashboard] Uploading resume file to consultationApi.uploadCv...');
            const resumeUrl = await consultationApi.uploadCv(file);
            console.log('[StudentDashboard] Successfully uploaded to server, resumeUrl:', resumeUrl);
            if (!resumeUrl) {
                throw new Error("Server returned empty resume URL.");
            }
            if (typeof window !== 'undefined') {
                localStorage.removeItem(`squrx_deleted_cv_${user.id}`);
            }
            await updateProfile(user.id, {
                cvUrl: resumeUrl,
                resume: resumeUrl,
                cvName: fileName,
                resumeName: fileName
            });
            console.log('[StudentDashboard] Profile updated successfully with uploaded CV.');
            showToast('CV uploaded successfully.', 'success');
        } catch (err: any) {
            console.error('[StudentDashboard] CV upload failed:', err);
            const errMsg = String(err?.message || '');
            if (errMsg.includes('413') || errMsg.toLowerCase().includes('large') || errMsg.toLowerCase().includes('size')) {
                showToast('CV should be less than 1MB limit. Please upload a smaller file.', 'error', 'Error');
            } else if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized')) {
                showToast('Your session has expired (HTTP 401). Please log in again.', 'error', 'Error');
            } else {
                showToast(err.message || 'CV upload failed. Please try again.', 'error', 'Error');
            }
        } finally {
            setIsUploadingCV(false);
            if (cvInputRef.current) cvInputRef.current.value = '';
            if (cvReplaceInputRef.current) cvReplaceInputRef.current.value = '';
        }
    };

    const removeCV = async () => {
        if (!user) return;
        console.log('[StudentDashboard] removeCV initiated for user:', user.id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`squrx_deleted_cv_${user.id}`, 'true');
        }
        try {
            await updateProfile(user.id, {
                cvUrl: null,
                resume: null,
                cvName: null,
                resumeName: null
            });
            console.log('[StudentDashboard] removeCV succeeded, CV removed from profile.');
            if (cvInputRef.current) cvInputRef.current.value = '';
            if (cvReplaceInputRef.current) cvReplaceInputRef.current.value = '';
            showToast('CV removed successfully.', 'success');
        } catch (err: any) {
            console.error('[StudentDashboard] removeCV failed:', err);
            showToast(err.message || 'Failed to remove CV.', 'error');
        }
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setFetchError(null);
            try {
                // Fetch up to 200 jobs from the real backend
                const data = await fetchJobs({ limit: 200 });
                setJobs(data.jobs);
            } catch (err: any) {
                console.error('[StudentDashboard] Failed to load jobs:', err);
                setFetchError(err?.message ?? 'Unable to load jobs.');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    // Match jobs to student's career goal / domain keywords
    const preferredDomain = profile?.careerGoal || '';

    const personalizedJobs = jobs.filter(j => {
        if (!preferredDomain) return true;
        const text = (j.title + ' ' + (j.description || '') + ' ' + (j.skills || []).join(' ')).toLowerCase();
        const keywords = preferredDomain.toLowerCase().split(/\s+/).filter(k => k.length > 2);
        return keywords.length === 0 || keywords.some(k => text.includes(k));
    });

    // Show up to 6 personalised jobs; fall back to first 6 if no match
    const displayJobs = (personalizedJobs.length > 0 ? personalizedJobs : jobs).slice(0, 6);

    const domainLabel = preferredDomain || 'Recommended';

    return (
        <PageTransition className="space-y-8 max-w-7xl mx-auto pb-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {(user?.name || user?.fullName) ? (user.name || user.fullName).split(' ')[0] : 'there'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here are the latest{' '}
                        <strong className="text-primary">{domainLabel}</strong>{' '}
                        opportunities fetched live for you.
                    </p>
                </div>
                <Link to="/student/jobs">
                    <Button variant="outline" className="border-black text-black hover:bg-black hover:text-white transition-all h-11 px-6 rounded-full font-medium">
                        View All Jobs
                    </Button>
                </Link>
            </div>

            {/* CV / Resume Quick Access Banner */}
            <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-2xl p-5 md:p-6 shadow-md border border-neutral-700/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0 mt-0.5">
                            {profile?.cvUrl ? <FileText className="w-6 h-6 text-emerald-400" /> : <UploadCloud className="w-6 h-6 text-primary" />}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-base md:text-lg text-white">
                                    {profile?.cvUrl ? 'Curriculum Vitae (CV)' : 'Boost Your Job Applications: Upload Your CV'}
                                </h3>
                                {profile?.cvUrl ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Uploaded & Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Recommended
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-neutral-300 max-w-2xl">
                                {profile?.cvUrl ? (
                                    <>
                                        Active file:{' '}
                                        <strong className="text-white font-medium">
                                            {profile.cvName || profile.resumeName || getCleanFileName(profile.cvUrl)}
                                        </strong>{' '}
                                        · Supported formats: PDF, DOC, DOCX up to 1MB.
                                    </>
                                ) : (
                                    'Recruiters look at profiles with an uploaded resume first. Supported formats: PDF, DOC, DOCX (up to 1MB).'
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                        {isUploadingCV ? (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-sm font-medium text-white">
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>Uploading CV...</span>
                            </div>
                        ) : profile?.cvUrl ? (
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Preview */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(profile.cvUrl!, '_blank', 'noopener,noreferrer')}
                                    className="border-neutral-600 bg-neutral-800 text-white hover:bg-neutral-700 h-10 px-3.5 rounded-xl font-medium gap-1.5"
                                >
                                    <Eye className="w-4 h-4" /> Preview
                                </Button>
                                {/* Replace */}
                                <div className="relative">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="bg-white text-black hover:bg-neutral-200 h-10 px-3.5 rounded-xl font-medium gap-1.5 cursor-pointer relative overflow-hidden"
                                    >
                                        <UploadCloud className="w-4 h-4" /> Replace
                                        <input
                                            ref={cvReplaceInputRef}
                                            type="file"
                                            onClick={e => (e.currentTarget.value = '')}
                                            onChange={handleCVUpload}
                                            disabled={isUploadingCV}
                                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </Button>
                                </div>
                                {/* Delete */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    title="Delete CV"
                                    onClick={removeCV}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 w-10 p-0 rounded-xl"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Button
                                    type="button"
                                    className="bg-white text-black hover:bg-neutral-200 font-semibold h-11 px-5 rounded-xl gap-2 cursor-pointer relative overflow-hidden shadow-sm"
                                >
                                    <UploadCloud className="w-4 h-4" /> Upload CV
                                    <input
                                        ref={cvInputRef}
                                        type="file"
                                        onClick={e => (e.currentTarget.value = '')}
                                        onChange={handleCVUpload}
                                        disabled={isUploadingCV}
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
                                const data = await fetchJobs({ limit: 200 });
                                setJobs(data.jobs);
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

            {/* Job Cards */}
            {isLoading ? (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 animate-spin text-black/20" />
                </div>
            ) : displayJobs.length > 0 ? (
                <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayJobs.map((job) => (
                        <StaggerItem key={job.id}>
                            <HoverLift>
                                <Card className="h-full border-border/60 hover:border-black/30 cursor-default shadow-sm bg-card transition-all flex flex-col p-6 rounded-[1.5rem] relative overflow-hidden group hover:shadow-xl">

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 bg-black/5 text-black">
                                            <Building2 size={24} />
                                        </div>
                                        {job.jobType && (
                                            <Badge variant="secondary" className="font-medium bg-black/5 text-black rounded-lg">
                                                {job.jobType}
                                            </Badge>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold leading-tight mb-1 group-hover:text-black/80 transition-colors line-clamp-2">
                                        {job.title}
                                    </h3>
                                    {job.companyName && <p className="text-sm font-medium text-black/50 mb-4">{job.companyName}</p>}

                                    <div className="space-y-2 mt-auto text-sm text-foreground/80 mb-6">
                                        {job.location && (
                                            <div className="flex items-center gap-2">
                                                <MapPin size={16} className="opacity-50 shrink-0" />
                                                <span className="truncate">{job.location}</span>
                                            </div>
                                        )}
                                        {job.salary && (
                                            <div className="flex items-center gap-2">
                                                <IndianRupee size={16} className="opacity-50 shrink-0" />
                                                <span className="truncate">{job.salary}</span>
                                            </div>
                                        )}
                                    </div>

                                    <Link to="/student/jobs" className="mt-auto block">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-between group-hover:bg-black group-hover:text-white transition-colors duration-300 rounded-xl h-12"
                                        >
                                            View Role <ExternalLink size={16} className="opacity-50 ml-2" />
                                        </Button>
                                    </Link>
                                </Card>
                            </HoverLift>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            ) : !fetchError ? (
                <div className="flex flex-col items-center justify-center p-16 text-center bg-black/[0.02] border border-black/5 rounded-[2rem]">
                    <Sparkles className="w-12 h-12 text-black/30 mb-4" />
                    <h3 className="text-xl font-bold mb-2 tracking-tight">No jobs found yet</h3>
                    <p className="text-black/50 font-light max-w-md">
                        No live roles are available right now. Check back soon — the board refreshes automatically.
                    </p>
                    <Link to="/student/jobs" className="mt-6">
                        <Button variant="outline" className="rounded-full px-8 h-11">Browse All Jobs</Button>
                    </Link>
                </div>
            ) : null}

            {/* Toast Notifications */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[100]">
                    <Toast 
                        variant={toastVariant} 
                        title={toastTitle || (toastVariant === 'success' ? 'Success' : 'Error')} 
                        description={toastMessage}
                        onClose={() => setToastMessage(null)}
                    >
                        {toastMessage}
                    </Toast>
                </div>
            )}
        </PageTransition>
    );
}
