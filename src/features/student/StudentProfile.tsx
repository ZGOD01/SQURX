import { useState, useRef, useEffect } from 'react';
import { useStudentStore } from './store';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Toast, Modal, Badge } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { useAuthStore } from '../auth/store';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/lib/store/notifications';
import { Loader2, UploadCloud, FileText, Trash2, ShieldCheck, Plus, X, Check, Eye, Lock } from 'lucide-react';
import { consultationApi } from '@/lib/consultationApi';
import {
    useGetEducationsQuery,
    useGetSkillsQuery,
    useGetJobTypesQuery,
    useGetExperienceLevelsQuery,
    useGetLocationsQuery,
    useGetDomainsQuery,
} from '@/lib/store/authApi';

// ─────────────────────────────────────────────
// Inline Tag editor component (for skills)
// ─────────────────────────────────────────────
function SkillTagEditor({ skills, onChange, disabled }: { skills: string[]; onChange: (tags: string[]) => void; disabled?: boolean }) {
    const [input, setInput] = useState('');

    const addSkill = (skill: string) => {
        const trimmed = skill.trim();
        if (trimmed && !skills.includes(trimmed)) {
            onChange([...skills, trimmed]);
        }
        setInput('');
    };

    const removeSkill = (skill: string) => {
        onChange(skills.filter(s => s !== skill));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border border-border rounded-xl bg-background">
                {skills.map(skill => (
                    <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-black text-white text-xs font-semibold rounded-lg"
                    >
                        {skill}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="hover:text-gray-300 transition-colors ml-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </span>
                ))}
                {!disabled && (
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                addSkill(input);
                            } else if (e.key === 'Backspace' && input === '' && skills.length > 0) {
                                removeSkill(skills[skills.length - 1]);
                            }
                        }}
                        placeholder={skills.length === 0 ? 'Type skill and press Enter...' : 'Add more...'}
                        className="flex-1 min-w-[120px] outline-none text-sm bg-transparent text-foreground placeholder:text-muted-foreground"
                    />
                )}
            </div>
            {!disabled && input.trim() && (
                <button
                    type="button"
                    onClick={() => addSkill(input)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                    <Plus className="w-3 h-3" /> Add "{input.trim()}"
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Profile Component
// ─────────────────────────────────────────────
export function StudentProfile() {
    const { user, logout } = useAuthStore();
    const { profile, updateProfile, getCompletionPercentage, fetchDashboardData, deleteAccount, saveError, clearSaveError } = useStudentStore();
    const { sendEmail } = useNotificationStore();
    const navigate = useNavigate();

    // ── Form state ──────────────────────────────
    const [location, setLocation] = useState('');
    const [jobType, setJobType] = useState('');
    const [jobTypeQuery, setJobTypeQuery] = useState('');
    const [careerGoal, setCareerGoal] = useState('');
    const [education, setEducation] = useState('');
    const [educationQuery, setEducationQuery] = useState('');
    const [educationId, setEducationId] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('');
    const [experienceLevelQuery, setExperienceLevelQuery] = useState('');
    const [experienceLevelId, setExperienceLevelId] = useState('');
    const [expectedSalary, setExpectedSalary] = useState('');
    const [currentSalary, setCurrentSalary] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [gender, setGender] = useState('');
    const [dob, setDob] = useState('');
    const [currentLocation, setCurrentLocation] = useState('');
    const [hometown, setHometown] = useState('');
    const [highestEducation, setHighestEducation] = useState('');
    const [pgUniversity, setPgUniversity] = useState('');
    const [graduationUniversity, setGraduationUniversity] = useState('');
    const [ugUniversity, setUgUniversity] = useState('');
    const [schoolCollegeName, setSchoolCollegeName] = useState('');
    const [languages, setLanguages] = useState('');
    const [certifications, setCertifications] = useState<Array<{ name: string; status: 'completed' | 'undergoing' }>>([]);
    const [awards, setAwards] = useState('');
    const [projects, setProjects] = useState('');
    const [internships, setInternships] = useState<Array<{ companyName: string; duration: string; role: string }>>([]);
    const [profileSummary, setProfileSummary] = useState('');
    const [otherAchievements, setOtherAchievements] = useState('');

    // ── Autocomplete dropdowns ───────────────────
    const [showEduSuggestions, setShowEduSuggestions] = useState(false);
    const [showExpSuggestions, setShowExpSuggestions] = useState(false);
    const [showJobTypeSuggestions, setShowJobTypeSuggestions] = useState(false);
    const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [locationQuery, setLocationQuery] = useState('');
    // Track the selected location's ID for correct backend payload
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const [selectedJobTypeIds, setSelectedJobTypeIds] = useState<string[]>([]);

    // ── Status states ────────────────────────────
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploadingCV, setIsUploadingCV] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
    const [isConsentEnabled, setIsConsentEnabled] = useState(false);
    const [profileInitialized, setProfileInitialized] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [formSnapshot, setFormSnapshot] = useState<{
        location: string; locationQuery: string; selectedLocationId: string;
        jobType: string; jobTypeQuery: string;
        careerGoal: string;
        education: string; educationQuery: string; educationId: string;
        experienceLevel: string; experienceLevelQuery: string; experienceLevelId: string;
        expectedSalary: string; currentSalary: string;
        skills: string[];
        selectedDomainIds: string[];
        selectedLocationIds: string[];
        selectedJobTypeIds: string[];
        gender: string;
        dob: string;
        currentLocation: string;
        hometown: string;
        highestEducation: string;
        pgUniversity: string;
        graduationUniversity: string;
        ugUniversity: string;
        schoolCollegeName: string;
        languages: string;
        certifications: Array<{ name: string; status: 'completed' | 'undergoing' }>;
        awards: string;
        projects: string;
        internships: Array<{ companyName: string; duration: string; role: string }>;
        profileSummary: string;
        otherAchievements: string;
    } | null>(null);

    // ── Refs ─────────────────────────────────────
    const cvInputRef = useRef<HTMLInputElement>(null);
    const fetchedRef = useRef(false);

    // ── API queries for autocomplete ─────────────
    const { data: educationsData } = useGetEducationsQuery({ search: educationQuery });
    const { data: experienceLevelsData } = useGetExperienceLevelsQuery({ search: experienceLevelQuery });
    const { data: jobTypesData } = useGetJobTypesQuery(undefined);
    const { data: domainsData } = useGetDomainsQuery({ search: careerGoal.split(',').pop()?.trim() || '' });
    const { data: locationsData } = useGetLocationsQuery({ search: locationQuery });
    const { data: skillsData } = useGetSkillsQuery({ search: '' });

    // ── Fetch profile on mount ────────────────────
    useEffect(() => {
        if (user && !profile && !fetchedRef.current) {
            fetchedRef.current = true;
            fetchDashboardData(user.id);
        }
    }, [user, profile, fetchDashboardData]);

    // ── Populate form from profile store ─────────
    useEffect(() => {
        if (profile && !profileInitialized) {
            setLocation(profile.location || '');
            setLocationQuery(profile.location || '');
            setJobType(profile.jobType || '');
            setJobTypeQuery(profile.jobType || '');
            setCareerGoal(profile.careerGoal || '');
            setEducation(profile.education || '');
            setEducationQuery(profile.education || '');
            setEducationId(profile.educationId || '');
            setExperienceLevel(profile.experienceLevel || '');
            setExperienceLevelQuery(profile.experienceLevel || '');
            setExperienceLevelId(profile.experienceLevelId || '');
            setExpectedSalary(profile.expectedSalary || '');
            setCurrentSalary(profile.currentSalary || '');
            setSkills(profile.skills || []);
            setSelectedDomainIds(profile.preferredDomainIds || []);
            setSelectedLocationIds(profile.preferredLocationIds || []);
            setSelectedJobTypeIds(profile.preferredJobTypeIds || []);

            setGender(profile.gender || '');
            setDob(profile.dob || '');
            setCurrentLocation(profile.currentLocation || '');
            setHometown(profile.hometown || '');
            setHighestEducation(profile.highestEducation || '');
            setPgUniversity(profile.pgUniversity || '');
            setGraduationUniversity(profile.graduationUniversity || '');
            setUgUniversity(profile.ugUniversity || '');
            setSchoolCollegeName(profile.schoolCollegeName || '');
            setLanguages(profile.languages || '');
            setCertifications(profile.certifications || []);
            setAwards(profile.awards || '');
            setProjects(profile.projects || '');
            setInternships(profile.internships || []);
            setProfileSummary(profile.profileSummary || '');
            setOtherAchievements(profile.otherAchievements || '');

            setProfileInitialized(true);
        }
    }, [profile, profileInitialized]);

    useEffect(() => {
        if (profile && profileInitialized && !isEditing) {
            setLocation(profile.location || '');
            setLocationQuery(profile.location || '');
            setJobType(profile.jobType || '');
            setJobTypeQuery(profile.jobType || '');
            setCareerGoal(profile.careerGoal || '');
            setEducation(profile.education || '');
            setEducationQuery(profile.education || '');
            setEducationId(profile.educationId || '');
            setExperienceLevel(profile.experienceLevel || '');
            setExperienceLevelQuery(profile.experienceLevel || '');
            setExperienceLevelId(profile.experienceLevelId || '');
            setExpectedSalary(profile.expectedSalary || '');
            setCurrentSalary(profile.currentSalary || '');
            setSkills(profile.skills || []);
            setSelectedDomainIds(profile.preferredDomainIds || []);
            setSelectedLocationIds(profile.preferredLocationIds || []);
            setSelectedJobTypeIds(profile.preferredJobTypeIds || []);

            setGender(profile.gender || '');
            setDob(profile.dob || '');
            setCurrentLocation(profile.currentLocation || '');
            setHometown(profile.hometown || '');
            setHighestEducation(profile.highestEducation || '');
            setPgUniversity(profile.pgUniversity || '');
            setGraduationUniversity(profile.graduationUniversity || '');
            setUgUniversity(profile.ugUniversity || '');
            setSchoolCollegeName(profile.schoolCollegeName || '');
            setLanguages(profile.languages || '');
            setCertifications(profile.certifications || []);
            setAwards(profile.awards || '');
            setProjects(profile.projects || '');
            setInternships(profile.internships || []);
            setProfileSummary(profile.profileSummary || '');
            setOtherAchievements(profile.otherAchievements || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    // ── GDPR consent ─────────────────────────────
    useEffect(() => {
        if (user) {
            setIsConsentEnabled(profile?.gdprConsent === true);
        }
    }, [user, profile]);

    const handleConsentToggle = async (checked: boolean) => {
        if (!user) return;
        // Prevent disabling consent that has already been accepted
        if (!checked && isConsentEnabled) {
            showToast('Consent has been accepted and cannot be withdrawn from this screen. Contact privacy@sqrex.com for inquiries.', 'error');
            return;
        }
        setIsConsentEnabled(checked);
        try {
            await updateProfile(user.id, { gdprConsent: checked });
            showToast('Data processing consent accepted.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to sync consent settings with backend.', 'error');
            setIsConsentEnabled(!checked);
        }
    };

    // ── Toast helper ─────────────────────────────
    const showToast = (msg: string, variant: 'success' | 'error' = 'success') => {
        setToastMessage(msg);
        setToastVariant(variant);
    };

    // ── Enter edit mode ───────────────────────────
    // Captures a snapshot of the current form values so Cancel can restore them.
    // Does NOT call any API or show any success message.
    const enterEditMode = () => {
        setSaveSuccess(false);   // clear any stale success badge
        setFormErrors({});       // clear any stale validation errors
        clearSaveError();
        // Take a snapshot of the current form state for cancel
        setFormSnapshot({
            location, locationQuery, selectedLocationId,
            jobType, jobTypeQuery,
            careerGoal,
            education, educationQuery, educationId,
            experienceLevel, experienceLevelQuery, experienceLevelId,
            expectedSalary, currentSalary,
            skills: [...skills],
            selectedDomainIds: [...selectedDomainIds],
            selectedLocationIds: [...selectedLocationIds],
            selectedJobTypeIds: [...selectedJobTypeIds],
            gender,
            dob,
            currentLocation,
            hometown,
            highestEducation,
            pgUniversity,
            graduationUniversity,
            ugUniversity,
            schoolCollegeName,
            languages,
            certifications: certifications ? [...certifications.map(c => ({ ...c }))] : [],
            awards,
            projects,
            internships: internships ? [...internships.map(i => ({ ...i }))] : [],
            profileSummary,
            otherAchievements,
        });
        setIsEditing(true);
    };

    // ── Cancel edit ───────────────────────────────
    // Restores all form values from the snapshot taken when Edit was clicked.
    // Does NOT call any API.
    const handleCancel = () => {
        if (formSnapshot) {
            setLocation(formSnapshot.location);
            setLocationQuery(formSnapshot.locationQuery);
            setSelectedLocationId(formSnapshot.selectedLocationId);
            setJobType(formSnapshot.jobType);
            setJobTypeQuery(formSnapshot.jobTypeQuery);
            setCareerGoal(formSnapshot.careerGoal);
            setEducation(formSnapshot.education);
            setEducationQuery(formSnapshot.educationQuery);
            setEducationId(formSnapshot.educationId);
            setExperienceLevel(formSnapshot.experienceLevel);
            setExperienceLevelQuery(formSnapshot.experienceLevelQuery);
            setExperienceLevelId(formSnapshot.experienceLevelId);
            setExpectedSalary(formSnapshot.expectedSalary);
            setCurrentSalary(formSnapshot.currentSalary);
            setSkills(formSnapshot.skills);
            setSelectedDomainIds(formSnapshot.selectedDomainIds);
            setSelectedLocationIds(formSnapshot.selectedLocationIds);
            setSelectedJobTypeIds(formSnapshot.selectedJobTypeIds);
            setGender(formSnapshot.gender);
            setDob(formSnapshot.dob);
            setCurrentLocation(formSnapshot.currentLocation);
            setHometown(formSnapshot.hometown);
            setHighestEducation(formSnapshot.highestEducation);
            setPgUniversity(formSnapshot.pgUniversity);
            setGraduationUniversity(formSnapshot.graduationUniversity);
            setUgUniversity(formSnapshot.ugUniversity);
            setSchoolCollegeName(formSnapshot.schoolCollegeName);
            setLanguages(formSnapshot.languages);
            setCertifications(formSnapshot.certifications);
            setAwards(formSnapshot.awards);
            setProjects(formSnapshot.projects);
            setInternships(formSnapshot.internships);
            setProfileSummary(formSnapshot.profileSummary);
            setOtherAchievements(formSnapshot.otherAchievements);
        }
        setFormErrors({});
        setIsEditing(false);
        setFormSnapshot(null);
        clearSaveError();
    };

    // ── Validate form ─────────────────────────────
    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!location.trim() || location.trim().length < 2) errs.location = 'Location is required (min 2 chars)';
        if (!jobType.trim() || jobType.trim().length < 2) errs.jobType = 'Job type is required';
        if (!careerGoal.trim() || careerGoal.trim().length < 3) errs.careerGoal = 'Career goal / domain is required';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Save profile ──────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !validate()) return;

        setIsSaving(true);
        setSaveSuccess(false);
        clearSaveError();

        try {
            // Build skill IDs if available from API
            const skillIds = skills.map(s =>
                skillsData?.data?.find((sd: any) => sd.name.toLowerCase() === s.toLowerCase())?._id
            ).filter(Boolean);

            await updateProfile(user.id, {
                location,
                jobType,
                careerGoal,
                education: educationId || education,
                educationId,
                experienceLevel: experienceLevelId || experienceLevel,
                experienceLevelId,
                expectedSalary,
                currentSalary: experienceLevel === 'Fresher' ? '' : currentSalary,
                skills: skillIds.length > 0 ? skillIds : skills,
                locations: location.split(',').map(l => l.trim()).filter(Boolean),
                jobTypes: jobType.split(',').map(j => j.trim()).filter(Boolean),
                preferredDomains: selectedDomainIds,
                preferredLocations: selectedLocationIds.length > 0 ? selectedLocationIds : (selectedLocationId ? [selectedLocationId] : []),
                preferredJobTypes: selectedJobTypeIds,
                gender,
                dob,
                currentLocation,
                hometown,
                highestEducation,
                pgUniversity: highestEducation === 'PG' ? pgUniversity : '',
                graduationUniversity: highestEducation === 'PG' ? graduationUniversity : '',
                ugUniversity: highestEducation === 'UG' ? ugUniversity : '',
                schoolCollegeName: highestEducation === 'UG' ? schoolCollegeName : '',
                languages,
                certifications,
                awards,
                projects,
                internships,
                profileSummary,
                otherAchievements,
            });

            setSaveSuccess(true);
            setIsEditing(false);
            showToast('Profile updated successfully!', 'success');
            sendEmail('Profile Updated', 'Your profile has been updated on Squrex. Keeping your profile fresh increases your visibility!');
        } catch (err: any) {
            showToast(err.message || 'Failed to save profile. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ── CV Upload ─────────────────────────────────
    const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.', 'error'); return; }
        const fileName = file.name.toLowerCase();
        const isValidExtension = fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx');
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type) && !isValidExtension) { showToast('Invalid format. PDF/DOC/DOCX only.', 'error'); return; }
        if (!user) return;

        setIsUploadingCV(true);
        try {
            const cvUrl = await consultationApi.uploadCv(file);
            await updateProfile(user.id, { cvUrl: cvUrl || file.name });
            sendEmail('CV Upload Received', `Your CV (${file.name}) was successfully uploaded.`);
            showToast('CV uploaded successfully.', 'success');
        } catch (err: any) {
            showToast(err.message || 'CV upload failed. Please try again.', 'error');
        } finally {
            setIsUploadingCV(false);
            if (cvInputRef.current) cvInputRef.current.value = '';
        }
    };

    const removeCV = async () => {
        if (!user) return;
        await updateProfile(user.id, { cvUrl: null });
        showToast('CV removed.', 'success');
        sendEmail('CV Removed', 'Your CV has been removed from your profile.');
    };

    // ── Delete account ────────────────────────────
    const handleConfirmDelete = async () => {
        if (!user) return;
        setIsDeleting(true);
        try {
            await deleteAccount(user.id);
            navigate('/', { replace: true });
            setTimeout(() => logout(), 0);
        } catch (err) {
            console.error(err);
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            showToast('Failed to delete account. Please try again.', 'error');
        }
    };

    // ── Loading state ─────────────────────────────
    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p>Loading your profile...</p>
            </div>
        );
    }

    // Use backend value as source of truth; getCompletionPercentage() already handles this fallback
    const completion = getCompletionPercentage();
    const isFresher = experienceLevel === 'Fresher' || experienceLevel === '' || !experienceLevel;

    return (
        <PageTransition className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
                <p className="text-muted-foreground mt-1">All information filled during signup is shown here. Edit and save to keep your profile up to date.</p>
            </div>

            {/* Profile strength */}
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
                            ? 'Your profile is fully complete! You are 4x more likely to be noticed.'
                            : `A complete profile is 4x more likely to be noticed. ${!profile.cvUrl ? 'Upload your CV.' : 'Fill remaining details to reach 100%.'}`
                        }
                    </p>
                    {saveSuccess && (
                        <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-semibold">
                            <Check className="w-3.5 h-3.5" /> Profile saved successfully
                        </span>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-[1fr_380px] gap-6 items-start">
                {/* ── Left column: Full profile form ── */}
                <div className="space-y-6">
                    {/* Account info (read-only) */}
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="text-base">Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 opacity-80">
                                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                        Full Name <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal">Synced</span>
                                    </label>
                                    <Input value={profile.fullName || user?.name || user?.fullName || ''} disabled className="bg-muted/50 cursor-not-allowed border-border/40 text-muted-foreground font-medium h-11" />
                                </div>
                                <div className="space-y-1.5 opacity-80">
                                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                        Email <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal">Synced</span>
                                    </label>
                                    <Input value={user?.email || ''} disabled className="bg-muted/50 cursor-not-allowed border-border/40 text-muted-foreground font-medium h-11" />
                                </div>
                                <div className="space-y-1.5 opacity-80">
                                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                        Mobile <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal">Synced</span>
                                    </label>
                                    <Input value={user?.mobile || ''} disabled className="bg-muted/50 cursor-not-allowed border-border/40 text-muted-foreground font-medium h-11" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Editable profile form */}
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="text-base">Professional Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Error banner */}
                                {saveError && (
                                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                                        {saveError}
                                    </div>
                                )}

                                <div className="grid sm:grid-cols-2 gap-5">
                                    {/* Education */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Education / Degree</label>
                                        <Input
                                            placeholder="Search & select education..."
                                            value={educationQuery}
                                            onChange={e => { setEducationQuery(e.target.value); setShowEduSuggestions(true); }}
                                            onFocus={() => setShowEduSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowEduSuggestions(false), 200)}
                                            disabled={!isEditing}
                                            className="h-11"
                                        />
                                        {isEditing && showEduSuggestions && educationsData?.data && educationsData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                                                {educationsData.data.filter((e: any) => e.name.toLowerCase().includes(educationQuery.toLowerCase())).map((edu: any) => (
                                                    <button key={edu._id} type="button"
                                                        onMouseDown={() => { setEducation(edu.name); setEducationQuery(edu.name); setEducationId(edu._id); setShowEduSuggestions(false); }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                                                    >{edu.name}</button>
                                                ))}
                                            </div>
                                        )}
                                        {education && !showEduSuggestions && (
                                            <p className="text-xs text-muted-foreground">Selected: <span className="font-semibold text-foreground">{education}</span></p>
                                        )}
                                    </div>

                                    {/* Experience Level */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Experience Level</label>
                                        <Input
                                            placeholder="Search & select level..."
                                            value={experienceLevelQuery}
                                            onChange={e => { setExperienceLevelQuery(e.target.value); setShowExpSuggestions(true); }}
                                            onFocus={() => setShowExpSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowExpSuggestions(false), 200)}
                                            disabled={!isEditing}
                                            className="h-11"
                                        />
                                        {isEditing && showExpSuggestions && experienceLevelsData?.data && experienceLevelsData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                                                {experienceLevelsData.data.map((el: any) => {
                                                    const displayName = el.name === 'Fresher' ? 'Fresher' : `${el.name} Years`;
                                                    return (
                                                        <button key={el._id} type="button"
                                                            onMouseDown={() => { setExperienceLevel(el.name); setExperienceLevelQuery(displayName); setExperienceLevelId(el._id); setShowExpSuggestions(false); }}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                                                        >{displayName}</button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {experienceLevel && !showExpSuggestions && (
                                            <p className="text-xs text-muted-foreground">Selected: <span className="font-semibold text-foreground">{experienceLevel === 'Fresher' ? 'Fresher' : `${experienceLevel} Years`}</span></p>
                                        )}
                                    </div>

                                    {/* Expected Salary */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expected Salary (Annual)</label>
                                        <Input
                                            placeholder="e.g. $85,000 or ₹12 LPA"
                                            value={expectedSalary}
                                            onChange={e => setExpectedSalary(e.target.value)}
                                            disabled={!isEditing}
                                            className="h-11"
                                        />
                                    </div>

                                    {/* Current Salary (conditional) */}
                                    {!isFresher && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Salary (Annual)</label>
                                            <Input
                                                placeholder="e.g. $70,000 or ₹8 LPA"
                                                value={currentSalary}
                                                onChange={e => setCurrentSalary(e.target.value)}
                                                disabled={!isEditing}
                                                className="h-11"
                                            />
                                        </div>
                                    )}

                                    {/* Location */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferred Location <span className="text-destructive">*</span></label>
                                        <Input
                                            placeholder="e.g. Remote, Mumbai, London"
                                            value={locationQuery}
                                            onChange={e => { setLocationQuery(e.target.value); setLocation(e.target.value); setShowLocationSuggestions(true); }}
                                            onFocus={() => setShowLocationSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                                            disabled={!isEditing}
                                            className={`h-11 ${formErrors.location ? 'border-destructive' : ''}`}
                                        />
                                        {isEditing && showLocationSuggestions && locationsData?.data && locationsData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-2 flex flex-wrap gap-1.5">
                                                {locationsData.data
                                                    .filter((l: any) => l.name.toLowerCase().includes(locationQuery.toLowerCase()))
                                                    .slice(0, 12)
                                                    .map((l: any) => (
                                                        <button key={l._id} type="button"
                                                            onMouseDown={() => {
                                                                setLocation(l.name);
                                                                setLocationQuery(l.name);
                                                                setShowLocationSuggestions(false);
                                                                setSelectedLocationId(l._id || '');
                                                                setSelectedLocationIds([l._id].filter(Boolean));
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-black hover:text-white rounded-lg transition-colors"
                                                        >+ {l.name}</button>
                                                    ))}
                                            </div>
                                        )}
                                        {formErrors.location && <p className="text-destructive text-xs">{formErrors.location}</p>}
                                    </div>

                                    {/* Job Type */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferred Job Type <span className="text-destructive">*</span></label>
                                        <Input
                                            placeholder="Search & select job type..."
                                            value={jobTypeQuery}
                                            onChange={e => { setJobTypeQuery(e.target.value); setShowJobTypeSuggestions(true); }}
                                            onFocus={() => setShowJobTypeSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowJobTypeSuggestions(false), 200)}
                                            disabled={!isEditing}
                                            className={`h-11 ${formErrors.jobType ? 'border-destructive' : ''}`}
                                        />
                                        {isEditing && showJobTypeSuggestions && jobTypesData?.data && jobTypesData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 flex flex-col gap-0.5 bg-white">
                                                {jobTypesData.data
                                                    .filter((jt: any) => {
                                                        const lastQueryPart = jobTypeQuery.split(',').pop()?.trim() || '';
                                                        return jt.name.toLowerCase().includes(lastQueryPart.toLowerCase());
                                                    })
                                                    .map((jt: any) => {
                                                        const isChecked = selectedJobTypeIds.includes(jt._id);
                                                        return (
                                                            <div
                                                                key={jt._id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault(); // Prevent input blur from closing the dropdown
                                                                }}
                                                                onClick={() => {
                                                                    let nextIds: string[];
                                                                    if (isChecked) {
                                                                        nextIds = selectedJobTypeIds.filter(id => id !== jt._id);
                                                                    } else {
                                                                        nextIds = [...selectedJobTypeIds, jt._id];
                                                                    }
                                                                    setSelectedJobTypeIds(nextIds);

                                                                    // Update the comma-separated text string
                                                                    const selectedNames = jobTypesData.data
                                                                        .filter((x: any) => nextIds.includes(x._id))
                                                                        .map((x: any) => x.name);
                                                                    const commaSeparated = selectedNames.join(', ');
                                                                    setJobType(commaSeparated);
                                                                    setJobTypeQuery(commaSeparated);
                                                                }}
                                                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors cursor-pointer select-none text-black font-semibold"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    readOnly
                                                                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                                                />
                                                                <span>{jt.name}</span>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        )}
                                        {formErrors.jobType && <p className="text-destructive text-xs">{formErrors.jobType}</p>}
                                    </div>
                                </div>

                                {/* Career Goal / Domain */}
                                <div className="space-y-1.5 relative">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Career Goal / Preferred Domain <span className="text-destructive">*</span></label>
                                    <Input
                                        placeholder="e.g. Software Engineering, Data Science"
                                        value={careerGoal}
                                        onChange={e => { setCareerGoal(e.target.value); setShowDomainSuggestions(true); }}
                                        onFocus={() => setShowDomainSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowDomainSuggestions(false), 200)}
                                        disabled={!isEditing}
                                        className={`h-11 ${formErrors.careerGoal ? 'border-destructive' : ''}`}
                                    />
                                    {isEditing && showDomainSuggestions && domainsData?.data && domainsData.data.length > 0 && (
                                        <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-2 flex flex-wrap gap-1.5">
                                            {domainsData.data
                                                .filter((d: any) => d.name.toLowerCase().includes((careerGoal.split(',').pop()?.trim() || '').toLowerCase()))
                                                .slice(0, 12)
                                                .map((d: any) => (
                                                    <button key={d._id} type="button"
                                                        onMouseDown={() => {
                                                            const parts = careerGoal.split(',');
                                                            parts[parts.length - 1] = ` ${d.name}`;
                                                            setCareerGoal(parts.join(',').trim());
                                                            setShowDomainSuggestions(false);
                                                            if (!selectedDomainIds.includes(d._id)) {
                                                                setSelectedDomainIds([...selectedDomainIds, d._id]);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-black hover:text-white rounded-lg transition-colors"
                                                    >+ {d.name}</button>
                                                ))}
                                        </div>
                                    )}
                                    {formErrors.careerGoal && <p className="text-destructive text-xs">{formErrors.careerGoal}</p>}
                                </div>

                                {/* Skills */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Core Skills</label>
                                    <SkillTagEditor skills={skills} onChange={setSkills} disabled={!isEditing} />
                                    {isEditing && (
                                        <p className="text-[11px] text-muted-foreground">Type a skill and press <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">Enter</kbd> or <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">,</kbd> to add.</p>
                                    )}
                                </div>

                                {/* ── PERSONAL DETAILS SECTION ── */}
                                <div className="pt-4 border-t border-border/60">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Personal Details</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {/* Gender */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gender</label>
                                            {isEditing ? (
                                                <select
                                                    value={gender}
                                                    onChange={(e) => setGender(e.target.value)}
                                                    className="w-full h-11 bg-background border border-input focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-md px-3 text-sm font-medium outline-none transition-all"
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            ) : (
                                                <Input value={gender || '—'} disabled className="h-11 bg-muted/30 border-border/40 text-muted-foreground font-medium cursor-not-allowed" />
                                            )}
                                        </div>

                                        {/* DOB */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                                            <Input
                                                placeholder="DD/MM/YYYY"
                                                value={dob}
                                                onChange={(e) => setDob(e.target.value)}
                                                disabled={!isEditing}
                                                className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                            />
                                        </div>

                                        {/* Current Location */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Location</label>
                                            <Input
                                                placeholder="e.g. London, UK"
                                                value={currentLocation}
                                                onChange={(e) => setCurrentLocation(e.target.value)}
                                                disabled={!isEditing}
                                                className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                            />
                                        </div>

                                        {/* Hometown */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hometown / Native Place & Country</label>
                                            <Input
                                                placeholder="e.g. Mumbai, India"
                                                value={hometown}
                                                onChange={(e) => setHometown(e.target.value)}
                                                disabled={!isEditing}
                                                className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                            />
                                        </div>

                                        {/* Languages */}
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Languages Known</label>
                                            <Input
                                                placeholder="e.g. English, Hindi, Spanish"
                                                value={languages}
                                                onChange={(e) => setLanguages(e.target.value)}
                                                disabled={!isEditing}
                                                className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                            />
                                        </div>

                                        {/* Profile Summary */}
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Profile Summary</label>
                                            <textarea
                                                placeholder="Briefly describe your professional profile and goals..."
                                                value={profileSummary}
                                                onChange={(e) => setProfileSummary(e.target.value)}
                                                disabled={!isEditing}
                                                rows={3}
                                                className={`w-full rounded-md border px-3 py-2.5 text-sm font-medium outline-none transition-all resize-none ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : 'bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20'}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── ACADEMIC QUALIFICATIONS SECTION ── */}
                                <div className="pt-4 border-t border-border/60">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Academic Qualifications</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {/* Highest Education */}
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Highest Education Level</label>
                                            {isEditing ? (
                                                <select
                                                    value={highestEducation}
                                                    onChange={(e) => setHighestEducation(e.target.value)}
                                                    className="w-full h-11 bg-background border border-input focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-md px-3 text-sm font-medium outline-none transition-all"
                                                >
                                                    <option value="">Select Level</option>
                                                    <option value="PG">Post Graduate (PG)</option>
                                                    <option value="UG">Under Graduate (UG)</option>
                                                    <option value="High School">High School</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            ) : (
                                                <Input value={highestEducation || '—'} disabled className="h-11 bg-muted/30 border-border/40 text-muted-foreground font-medium cursor-not-allowed" />
                                            )}
                                        </div>

                                        {/* PG sub-fields */}
                                        {(highestEducation === 'PG' || (!isEditing && (pgUniversity || graduationUniversity))) && (
                                            <>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">University Name (PG)</label>
                                                    <Input
                                                        placeholder="e.g. Oxford University"
                                                        value={pgUniversity}
                                                        onChange={(e) => setPgUniversity(e.target.value)}
                                                        disabled={!isEditing}
                                                        className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Graduation University Name</label>
                                                    <Input
                                                        placeholder="e.g. Delhi University"
                                                        value={graduationUniversity}
                                                        onChange={(e) => setGraduationUniversity(e.target.value)}
                                                        disabled={!isEditing}
                                                        className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* UG sub-fields */}
                                        {(highestEducation === 'UG' || (!isEditing && (ugUniversity || schoolCollegeName))) && (
                                            <>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">University Name (UG)</label>
                                                    <Input
                                                        placeholder="e.g. Stanford University"
                                                        value={ugUniversity}
                                                        onChange={(e) => setUgUniversity(e.target.value)}
                                                        disabled={!isEditing}
                                                        className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">School / College Name</label>
                                                    <Input
                                                        placeholder="e.g. St. Francis College"
                                                        value={schoolCollegeName}
                                                        onChange={(e) => setSchoolCollegeName(e.target.value)}
                                                        disabled={!isEditing}
                                                        className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* ── CERTIFICATIONS SECTION ── */}
                                <div className="pt-4 border-t border-border/60">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Certifications</h3>
                                        {isEditing && (
                                            <Button
                                                type="button"
                                                onClick={() => setCertifications([...certifications, { name: '', status: 'undergoing' }])}
                                                variant="outline"
                                                className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                            >
                                                + Add
                                            </Button>
                                        )}
                                    </div>
                                    {certifications.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">{isEditing ? 'No certifications added. Click + Add to get started.' : 'No certifications listed.'}</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {certifications.map((cert, index) => (
                                                <div key={index} className="flex gap-2 items-center bg-muted/20 p-2.5 rounded-xl border border-border/40">
                                                    {isEditing ? (
                                                        <>
                                                            <Input
                                                                placeholder="Certification Name"
                                                                value={cert.name}
                                                                onChange={(e) => {
                                                                    const copy = [...certifications];
                                                                    copy[index] = { ...copy[index], name: e.target.value };
                                                                    setCertifications(copy);
                                                                }}
                                                                className="h-9 rounded-lg flex-1 text-sm"
                                                            />
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`prof-cert-${index}`}
                                                                    checked={cert.status === 'completed'}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index] = { ...copy[index], status: e.target.checked ? 'completed' : 'undergoing' };
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="rounded border-gray-300 w-4 h-4 cursor-pointer"
                                                                />
                                                                <label htmlFor={`prof-cert-${index}`} className="text-xs font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap">Completed</label>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                onClick={() => setCertifications(certifications.filter((_, i) => i !== index))}
                                                                variant="outline"
                                                                className="h-8 w-8 p-0 text-destructive border-destructive/20 hover:bg-destructive/5 rounded-lg shrink-0"
                                                            >✕</Button>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="text-sm font-medium">{cert.name || '—'}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cert.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {cert.status === 'completed' ? 'Completed' : 'Undergoing'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ── INTERNSHIPS SECTION ── */}
                                <div className="pt-4 border-t border-border/60">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internships</h3>
                                        {isEditing && (
                                            <Button
                                                type="button"
                                                onClick={() => setInternships([...internships, { companyName: '', duration: '', role: '' }])}
                                                variant="outline"
                                                className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                            >
                                                + Add
                                            </Button>
                                        )}
                                    </div>
                                    {internships.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">{isEditing ? 'No internships added. Click + Add to get started.' : 'No internships listed.'}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {internships.map((intern, index) => (
                                                <div key={index} className="bg-muted/20 p-3 rounded-xl border border-border/40 space-y-2">
                                                    {isEditing ? (
                                                        <>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                <Input
                                                                    placeholder="Company Name"
                                                                    value={intern.companyName}
                                                                    onChange={(e) => { const c = [...internships]; c[index] = { ...c[index], companyName: e.target.value }; setInternships(c); }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                                <Input
                                                                    placeholder="Duration (e.g. 3 Months)"
                                                                    value={intern.duration}
                                                                    onChange={(e) => { const c = [...internships]; c[index] = { ...c[index], duration: e.target.value }; setInternships(c); }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                                <Input
                                                                    placeholder="Role"
                                                                    value={intern.role}
                                                                    onChange={(e) => { const c = [...internships]; c[index] = { ...c[index], role: e.target.value }; setInternships(c); }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => setInternships(internships.filter((_, i) => i !== index))}
                                                                    variant="outline"
                                                                    className="h-7 rounded-lg text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5 px-2"
                                                                >Remove</Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-sm font-semibold">{intern.companyName || '—'}</span>
                                                            <span className="text-xs text-muted-foreground">{intern.role}{intern.duration ? ` · ${intern.duration}` : ''}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ── PROJECTS & ACHIEVEMENTS SECTION ── */}
                                <div className="pt-4 border-t border-border/60">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Projects & Achievements</h3>
                                    <div className="space-y-4">
                                        {/* Projects */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Projects</label>
                                            <textarea
                                                placeholder="Write about major projects you worked on..."
                                                value={projects}
                                                onChange={(e) => setProjects(e.target.value)}
                                                disabled={!isEditing}
                                                rows={3}
                                                className={`w-full rounded-md border px-3 py-2.5 text-sm font-medium outline-none transition-all resize-none ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : 'bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20'}`}
                                            />
                                        </div>

                                        {/* Awards */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Awards & Recognitions</label>
                                            <textarea
                                                placeholder="Write about key awards and recognitions..."
                                                value={awards}
                                                onChange={(e) => setAwards(e.target.value)}
                                                disabled={!isEditing}
                                                rows={3}
                                                className={`w-full rounded-md border px-3 py-2.5 text-sm font-medium outline-none transition-all resize-none ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : 'bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20'}`}
                                            />
                                        </div>

                                        {/* Other Achievements */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Other Achievements</label>
                                            <textarea
                                                placeholder="Write about any other accomplishments..."
                                                value={otherAchievements}
                                                onChange={(e) => setOtherAchievements(e.target.value)}
                                                disabled={!isEditing}
                                                rows={3}
                                                className={`w-full rounded-md border px-3 py-2.5 text-sm font-medium outline-none transition-all resize-none ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : 'bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20'}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Submit / Edit Toggle */}
                                {isEditing ? (
                                    <div className="flex gap-3">
                                        {/* Cancel: restores snapshot, no API call */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCancel}
                                            disabled={isSaving}
                                            className="flex-1 h-12 font-bold rounded-xl border-border/60 hover:bg-muted transition-colors"
                                        >
                                            Cancel
                                        </Button>
                                        {/* Save: the ONLY button that submits the form / calls the API */}
                                        <Button
                                            type="submit"
                                            disabled={isSaving}
                                            className="flex-1 h-12 bg-black text-white hover:bg-black/90 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] active:scale-95"
                                        >
                                            {isSaving ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={enterEditMode}
                                        className="w-full h-12 bg-black text-white hover:bg-black/90 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] active:scale-95"
                                    >
                                        Edit Profile
                                    </Button>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right column: CV, Skills badges, Consent ── */}
                <div className="space-y-6 sticky top-6">
                    {/* CV Upload */}
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="text-base">Curriculum Vitae (CV)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {profile.cvUrl ? (
                                <div className="space-y-4">
                                    <div className="p-4 border border-border/60 bg-muted/20 rounded-xl flex items-start gap-4 shadow-sm">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="font-semibold text-sm truncate" title="Uploaded CV">
                                                {profile.cvUrl.replace(/^.*[\\/]/, '') || 'Resume_Document.pdf'}
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Uploaded · Active</p>
                                        </div>
                                        {/* ── Resume view/preview button ── */}
                                        {profile.cvUrl && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                title="Preview Resume"
                                                className="text-primary hover:text-primary hover:bg-primary/10 px-2"
                                                onClick={() => window.open(profile.cvUrl!, '_blank', 'noopener,noreferrer')}
                                            >
                                                <Eye size={16} />
                                            </Button>
                                        )}
                                        {isEditing && (
                                            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2" onClick={removeCV}>
                                                <Trash2 size={16} />
                                            </Button>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <>
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Replace</span></div>
                                            </div>
                                            <Button variant="outline" className="w-full cursor-pointer overflow-hidden relative group">
                                                <span className="flex items-center gap-2 group-hover:text-primary transition-colors">
                                                    <UploadCloud size={18} /> Upload New CV
                                                </span>
                                                <input type="file" onChange={handleCVUpload}
                                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/10 transition-colors relative">
                                    {isUploadingCV ? (
                                        <div className="flex flex-col items-center gap-4 py-8">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            <p className="text-sm font-medium">Processing document...</p>
                                        </div>
                                    ) : isEditing ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer group">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <UploadCloud size={28} />
                                            </div>
                                            <h4 className="font-bold mb-1">Upload your CV</h4>
                                            <p className="text-sm text-muted-foreground max-w-[200px]">PDF, DOC, DOCX up to 5MB</p>
                                            <Button size="sm" className="mt-6 font-medium px-6">Select File</Button>
                                            <input
                                                type="file"
                                                ref={cvInputRef}
                                                onChange={handleCVUpload}
                                                disabled={isUploadingCV}
                                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center py-4">
                                            <div className="w-16 h-16 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-4">
                                                <FileText size={28} />
                                            </div>
                                            <h4 className="font-bold mb-1 text-muted-foreground">No CV Uploaded</h4>
                                            <p className="text-xs text-muted-foreground max-w-[200px]">Click 'Edit Profile' to upload a CV.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Skills Badge Preview */}
                    {skills.length > 0 && (
                        <Card className="border-border/60 shadow-sm bg-card">
                            <CardHeader>
                                <CardTitle className="text-base">Skills Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill, i) => (
                                        <Badge key={i} variant="secondary" className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary/80">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Privacy & Consent */}
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-black" /> Privacy & Consent
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between p-4 border border-border/60 bg-muted/20 rounded-xl shadow-sm">
                                <div className="space-y-0.5 max-w-[70%]">
                                    <h4 className="font-semibold text-sm">Allow Data Processing</h4>
                                    <p className="text-xs text-muted-foreground leading-normal">
                                        Allow SQUREX to process your profile, CV, and preferences to match you with job openings.
                                    </p>
                                </div>
                                {/* When consent is already given, show a locked state — it cannot be revoked from this screen */}
                                {isConsentEnabled ? (
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <Lock size={12} className="text-emerald-600" />
                                            <span className="text-xs font-bold text-emerald-700">Accepted</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground text-center">Cannot be revoked here</span>
                                    </div>
                                ) : (
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input type="checkbox" checked={false} onChange={e => handleConsentToggle(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black" />
                                    </label>
                                )}
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Your Control Rights</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    In compliance with DPDP 2023 & GDPR, you have the right to withdraw consent or delete your account. Email <a href="mailto:privacy@sqrex.com" className="text-primary hover:underline">privacy@sqrex.com</a> for inquiries.
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

            {/* Delete account modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => !isDeleting && setIsDeleteModalOpen(false)} title="Delete Data & Profile?">
                <div className="space-y-5 mt-2">
                    <p className="text-muted-foreground text-[15px] leading-relaxed">
                        Are you absolutely sure you want to delete your profile data? All uploaded certificates, CVs, and applications will be permanently erased in compliance with DPDP 2023.
                        <br /><br />
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

            {/* Toast */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[100]">
                    <Toast variant={toastVariant} title={toastVariant === 'success' ? 'Success' : 'Error'} onClose={() => setToastMessage(null)}>
                        {toastMessage}
                    </Toast>
                </div>
            )}
        </PageTransition>
    );
}
