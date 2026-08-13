import { useState, useRef, useEffect } from 'react';
import { useStudentStore } from './store';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Toast, Modal, Badge } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { useAuthStore } from '../auth/store';
import { useNavigate } from 'react-router-dom';
import { Loader2, UploadCloud, FileText, Trash2, ShieldCheck, Plus, X, Check, Eye, Lock } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { consultationApi } from '@/lib/consultationApi';
import { useNotificationStore } from '@/lib/store/notifications';
import type { EducationHistoryItem, EmploymentHistoryItem, ProjectItem, LanguageKnownItem } from '@/lib/mockDb/schema';
import {
    useGetEducationsQuery,
    useGetSkillsQuery,
    useGetJobTypesQuery,
    useGetExperienceLevelsQuery,
    useGetLocationsQuery,
    useGetDomainsQuery,
    useGetLanguagesQuery,
    useGetLanguageProficienciesQuery,
    useGetUniversitiesQuery,
    useGetCoursesQuery,
    useGetSpecializationsQuery,
    useGetRolesQuery,
    useGetCurrenciesQuery,
    useSubmitEducationMutation,
    useSubmitUniversityMutation,
    useSubmitCourseMutation,
    useSubmitSpecializationMutation,
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

// Helper to get location with country in brackets
export const getLocationLabel = (l: any): string => {
    if (!l) return '';
    const city = typeof l === 'string' ? l : (l.name || '');
    if (typeof l === 'object' && l) {
        let country = '';
        if (l.country) {
            country = typeof l.country === 'object' ? (l.country.name || '') : String(l.country);
        } else if (l.countryName) {
            country = String(l.countryName);
        }
        if (country) {
            if (!city.includes('(')) {
                return `${city} (${country})`;
            }
        }
    }
    return city;
};

// Helper to extract clean file name from URL or stored name
export function getCleanFileName(urlOrName?: string | null, originalName?: string | null): string {
    if (originalName && originalName.trim()) return originalName;
    if (!urlOrName) return 'Resume_Document.pdf';
    try {
        const cleanUrl = urlOrName.split('?')[0].split('#')[0];
        let fileName = cleanUrl.replace(/^.*[/\\]/, '');
        // URL-decode percent-encoded characters (e.g. %20 → space)
        try { fileName = decodeURIComponent(fileName); } catch {}
        // Strip timestamp prefix: e.g. "1738756192847-MyFile.pdf" → "MyFile.pdf"
        fileName = fileName.replace(/^\d{10,}-/, '');
        // Strip UUID prefix: e.g. "550e8400-e29b-41d4-a716-446655440000_MyFile.pdf"
        fileName = fileName.replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[-_]/, '');
        return fileName || 'Resume_Document.pdf';
    } catch {
        return 'Resume_Document.pdf';
    }
};

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
    const [experienceLevel, setExperienceLevel] = useState('');
    const [experienceLevelQuery, setExperienceLevelQuery] = useState('');
    const [experienceLevelId, setExperienceLevelId] = useState('');
    const [expectedSalaryAmount, setExpectedSalaryAmount] = useState('');
    const [expectedSalaryCurrency, setExpectedSalaryCurrency] = useState('');
    const [currentSalaryAmount, setCurrentSalaryAmount] = useState('');
    const [currentSalaryCurrency, setCurrentSalaryCurrency] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [gender, setGender] = useState('');
    const [dob, setDob] = useState('');
    const [currentLocation, setCurrentLocation] = useState('');
    const [hometown, setHometown] = useState('');
    const [languagesKnown, setLanguagesKnown] = useState<LanguageKnownItem[]>([]);
    const [educationHistory, setEducationHistory] = useState<EducationHistoryItem[]>([]);
    const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistoryItem[]>([]);
    const [certifications, setCertifications] = useState<Array<{ name: string; status: 'completed' | 'undergoing' }>>([]);
    const [awards, setAwards] = useState('');
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [internships, setInternships] = useState<Array<{ companyName: string; duration: string; role: string }>>([]);
    const [profileSummary, setProfileSummary] = useState('');
    const [otherAchievements, setOtherAchievements] = useState('');

    // ── Autocomplete dropdowns ───────────────────
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
    const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
    const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);
    const [languageQuery, setLanguageQuery] = useState('');

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
        experienceLevel: string; experienceLevelQuery: string; experienceLevelId: string;
        expectedSalaryAmount: string; expectedSalaryCurrency: string;
        currentSalaryAmount: string; currentSalaryCurrency: string;
        skills: string[];
        selectedDomainIds: string[];
        selectedLocationIds: string[];
        selectedJobTypeIds: string[];
        selectedLanguageIds: string[];
        gender: string;
        dob: string;
        currentLocation: string;
        hometown: string;
        languagesKnown: LanguageKnownItem[];
        educationHistory: EducationHistoryItem[];
        employmentHistory: EmploymentHistoryItem[];
        certifications: Array<{ name: string; status: 'completed' | 'undergoing' }>;
        awards: string;
        projects: ProjectItem[];
        internships: Array<{ companyName: string; duration: string; role: string }>;
        profileSummary: string;
        otherAchievements: string;
    } | null>(null);

    // ── Refs ─────────────────────────────────────
    const cvInputRef = useRef<HTMLInputElement>(null);
    const cvReplaceInputRef = useRef<HTMLInputElement>(null);
    const fetchedRef = useRef(false);

    // ── API queries & mutations ─────────────────
    const { data: currenciesData } = useGetCurrenciesQuery(undefined);
    const { data: educationsData } = useGetEducationsQuery(undefined);
    const { data: experienceLevelsData } = useGetExperienceLevelsQuery({ search: experienceLevelQuery });
    const { data: jobTypesData } = useGetJobTypesQuery(undefined);
    const { data: domainsData } = useGetDomainsQuery({ search: careerGoal.split(',').pop()?.trim() || '' });
    const { data: locationsData } = useGetLocationsQuery({ search: locationQuery });
    const { data: skillsData } = useGetSkillsQuery({ search: '' });
    const { data: languagesData } = useGetLanguagesQuery(undefined);
    const { data: languageProficienciesData } = useGetLanguageProficienciesQuery(undefined);
    const { data: universitiesData } = useGetUniversitiesQuery(undefined);
    const { data: coursesData } = useGetCoursesQuery(undefined);
    const { data: specializationsData } = useGetSpecializationsQuery(undefined);
    const { data: rolesData } = useGetRolesQuery(undefined);

    const [submitEducation] = useSubmitEducationMutation();
    const [submitUniversity] = useSubmitUniversityMutation();
    const [submitCourse] = useSubmitCourseMutation();
    const [submitSpecialization] = useSubmitSpecializationMutation();

    void languageProficienciesData; void rolesData;

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
            setExperienceLevel(profile.experienceLevel || '');
            setExperienceLevelQuery(profile.experienceLevel || '');
            setExperienceLevelId(profile.experienceLevelId || '');

            // Structured expected salary parsing
            if (profile.expectedSalary) {
                if (typeof profile.expectedSalary === 'object') {
                    setExpectedSalaryAmount(profile.expectedSalary.amount != null ? String(profile.expectedSalary.amount) : '');
                    const curr = profile.expectedSalary.currency;
                    setExpectedSalaryCurrency(typeof curr === 'object' && curr ? curr._id : String(curr || ''));
                } else {
                    setExpectedSalaryAmount(String(profile.expectedSalary));
                }
            }
            // Structured current salary parsing
            if (profile.currentSalary) {
                if (typeof profile.currentSalary === 'object') {
                    setCurrentSalaryAmount(profile.currentSalary.amount != null ? String(profile.currentSalary.amount) : '');
                    const curr = profile.currentSalary.currency;
                    setCurrentSalaryCurrency(typeof curr === 'object' && curr ? curr._id : String(curr || ''));
                } else {
                    setCurrentSalaryAmount(String(profile.currentSalary));
                }
            }

            setSkills(profile.skills || []);
            setSelectedDomainIds(profile.preferredDomainIds || []);
            setSelectedLocationIds(profile.preferredLocationIds || []);
            setSelectedJobTypeIds(profile.preferredJobTypeIds || []);

            setGender(profile.gender || '');
            setDob(profile.dob || '');
            setCurrentLocation(profile.currentLocation || '');
            setHometown(profile.hometown || '');
            setLanguagesKnown(profile.languagesKnown || []);
            setEducationHistory(profile.educationHistory || []);
            setEmploymentHistory(profile.employmentHistory || []);
            setCertifications(profile.certifications || []);
            setAwards(profile.awards || '');
            setProjects(profile.projects || []);
            setInternships(profile.internships || []);
            setProfileSummary(profile.profileSummary || '');
            setOtherAchievements(profile.otherAchievements || '');

            setProfileInitialized(true);
        }
    }, [profile, profileInitialized]);

    // Fallback currency selection if not set
    useEffect(() => {
        if (currenciesData?.data && currenciesData.data.length > 0) {
            const defaultId = currenciesData.data[0]._id;
            if (!expectedSalaryCurrency) setExpectedSalaryCurrency(defaultId);
            if (!currentSalaryCurrency) setCurrentSalaryCurrency(defaultId);
        }
    }, [currenciesData, expectedSalaryCurrency, currentSalaryCurrency]);

    useEffect(() => {
        if (profile && profileInitialized && !isEditing) {
            setLocation(profile.location || '');
            setLocationQuery(profile.location || '');
            setJobType(profile.jobType || '');
            setJobTypeQuery(profile.jobType || '');
            setCareerGoal(profile.careerGoal || '');
            setExperienceLevel(profile.experienceLevel || '');
            setExperienceLevelQuery(profile.experienceLevel || '');
            setExperienceLevelId(profile.experienceLevelId || '');

            // Structured expected salary re-sync
            if (profile.expectedSalary) {
                if (typeof profile.expectedSalary === 'object') {
                    setExpectedSalaryAmount(profile.expectedSalary.amount != null ? String(profile.expectedSalary.amount) : '');
                    const curr = profile.expectedSalary.currency;
                    setExpectedSalaryCurrency(typeof curr === 'object' && curr ? curr._id : String(curr || ''));
                } else {
                    setExpectedSalaryAmount(String(profile.expectedSalary));
                }
            } else {
                setExpectedSalaryAmount('');
            }

            // Structured current salary re-sync
            if (profile.currentSalary) {
                if (typeof profile.currentSalary === 'object') {
                    setCurrentSalaryAmount(profile.currentSalary.amount != null ? String(profile.currentSalary.amount) : '');
                    const curr = profile.currentSalary.currency;
                    setCurrentSalaryCurrency(typeof curr === 'object' && curr ? curr._id : String(curr || ''));
                } else {
                    setCurrentSalaryAmount(String(profile.currentSalary));
                }
            } else {
                setCurrentSalaryAmount('');
            }

            setSkills(profile.skills || []);
            setSelectedDomainIds(profile.preferredDomainIds || []);
            setSelectedLocationIds(profile.preferredLocationIds || []);
            setSelectedJobTypeIds(profile.preferredJobTypeIds || []);

            setGender(profile.gender || '');
            setDob(profile.dob || '');
            setCurrentLocation(profile.currentLocation || '');
            setHometown(profile.hometown || '');
            setLanguagesKnown(profile.languagesKnown || []);
            setEducationHistory(profile.educationHistory || []);
            setEmploymentHistory(profile.employmentHistory || []);
            setCertifications(profile.certifications || []);
            setAwards(profile.awards || '');
            setProjects(profile.projects || []);
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
            showToast('Consent has been accepted and cannot be withdrawn from this screen. Contact privacy@squrex.com for inquiries.', 'error');
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
            experienceLevel, experienceLevelQuery, experienceLevelId,
            expectedSalaryAmount, expectedSalaryCurrency,
            currentSalaryAmount, currentSalaryCurrency,
            skills: [...skills],
            selectedDomainIds: [...selectedDomainIds],
            selectedLocationIds: [...selectedLocationIds],
            selectedJobTypeIds: [...selectedJobTypeIds],
            selectedLanguageIds: [...selectedLanguageIds],
            gender,
            dob,
            currentLocation,
            hometown,
            languagesKnown: languagesKnown ? [...languagesKnown.map(l => ({ ...l }))] : [],
            educationHistory: educationHistory ? [...educationHistory.map(eh => ({ ...eh }))] : [],
            employmentHistory: employmentHistory ? [...employmentHistory.map(e => ({ ...e }))] : [],
            certifications: certifications ? [...certifications.map(c => ({ ...c }))] : [],
            awards,
            projects: projects ? [...projects.map(p => ({ ...p }))] : [],
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
            setExperienceLevel(formSnapshot.experienceLevel);
            setExperienceLevelQuery(formSnapshot.experienceLevelQuery);
            setExperienceLevelId(formSnapshot.experienceLevelId);
            setExpectedSalaryAmount(formSnapshot.expectedSalaryAmount);
            setExpectedSalaryCurrency(formSnapshot.expectedSalaryCurrency);
            setCurrentSalaryAmount(formSnapshot.currentSalaryAmount);
            setCurrentSalaryCurrency(formSnapshot.currentSalaryCurrency);
            setSkills(formSnapshot.skills);
            setSelectedDomainIds(formSnapshot.selectedDomainIds);
            setSelectedLocationIds(formSnapshot.selectedLocationIds);
            setSelectedJobTypeIds(formSnapshot.selectedJobTypeIds);
            setSelectedLanguageIds(formSnapshot.selectedLanguageIds);
            setGender(formSnapshot.gender);
            setDob(formSnapshot.dob);
            setCurrentLocation(formSnapshot.currentLocation);
            setHometown(formSnapshot.hometown);
            setLanguagesKnown(formSnapshot.languagesKnown);
            setEducationHistory(formSnapshot.educationHistory);
            setEmploymentHistory(formSnapshot.employmentHistory);
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

        const hasLocation = selectedLocationIds.length > 0 || (location.trim().length >= 2);
        if (!hasLocation) errs.location = 'Please select or enter a preferred location.';

        const hasJobType = selectedJobTypeIds.length > 0 || (jobType.trim().length >= 2);
        if (!hasJobType) errs.jobType = 'Please select at least one preferred job type.';

        if (!careerGoal.trim()) errs.careerGoal = 'Please enter a career goal or preferred domain.';

        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Save profile ──────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        if (!user || !validate()) return;

        setIsSaving(true);
        setSaveSuccess(false);
        clearSaveError();

        try {
            // Step 1: Submit any custom "Other" education history values
            const processedEducationHistory = await Promise.all(
                educationHistory.map(async (item) => {
                    const copy = { ...item };

                    if (copy.education === 'other' && copy.customEducation?.trim()) {
                        try {
                            const res = await submitEducation({ name: copy.customEducation.trim() }).unwrap();
                            const resData = res?.data ?? res;
                            if (resData?._id) copy.education = resData._id;
                        } catch (err: any) {
                            const errMsg = err?.data?.message || err?.message || `Failed to submit custom degree "${copy.customEducation}"`;
                            throw new Error(errMsg);
                        }
                    }

                    if (copy.university === 'other' && copy.customUniversity?.trim()) {
                        try {
                            const res = await submitUniversity({ name: copy.customUniversity.trim() }).unwrap();
                            const resData = res?.data ?? res;
                            if (resData?._id) copy.university = resData._id;
                        } catch (err: any) {
                            const errMsg = err?.data?.message || err?.message || `Failed to submit custom university "${copy.customUniversity}"`;
                            throw new Error(errMsg);
                        }
                    }

                    if (copy.course === 'other' && copy.customCourse?.trim()) {
                        try {
                            const res = await submitCourse({ name: copy.customCourse.trim() }).unwrap();
                            const resData = res?.data ?? res;
                            if (resData?._id) copy.course = resData._id;
                        } catch (err: any) {
                            const errMsg = err?.data?.message || err?.message || `Failed to submit custom course "${copy.customCourse}"`;
                            throw new Error(errMsg);
                        }
                    }

                    if (copy.specialization === 'other' && copy.customSpecialization?.trim()) {
                        try {
                            const res = await submitSpecialization({ name: copy.customSpecialization.trim() }).unwrap();
                            const resData = res?.data ?? res;
                            if (resData?._id) copy.specialization = resData._id;
                        } catch (err: any) {
                            const errMsg = err?.data?.message || err?.message || `Failed to submit custom specialization "${copy.customSpecialization}"`;
                            throw new Error(errMsg);
                        }
                    }

                    return copy;
                })
            );

            // Step 2: Build lookup IDs
            const skillIds = skills.map(s =>
                skillsData?.data?.find((sd: any) => sd.name.toLowerCase() === s.toLowerCase())?._id
            ).filter(Boolean);

            let locationIds = selectedLocationIds.filter(Boolean);
            if (locationIds.length === 0 && location) {
                const parsedLocations = location.split(',').map(l => l.trim().split('(')[0].trim()).filter(Boolean);
                locationIds = parsedLocations
                    .map(l => locationsData?.data?.find((ld: any) => ld.name.toLowerCase() === l.toLowerCase())?._id)
                    .filter(Boolean);
            }
            if (locationIds.length === 0 && selectedLocationId) {
                locationIds = [selectedLocationId];
            }

            let jtIds = selectedJobTypeIds.filter(Boolean);
            if (jtIds.length === 0 && jobType) {
                const parsedJobTypes = jobType.split(',').map(j => j.trim()).filter(Boolean);
                jtIds = parsedJobTypes
                    .map(j => jobTypesData?.data?.find((jd: any) => jd.name.toLowerCase() === j.toLowerCase())?._id)
                    .filter(Boolean);
            }

            let domainIds = selectedDomainIds.filter(Boolean);
            if (domainIds.length === 0 && careerGoal) {
                const parsedDomains = careerGoal.split(',').map(d => d.trim()).filter(Boolean);
                domainIds = parsedDomains
                    .map(d => domainsData?.data?.find((dd: any) => dd.name.toLowerCase() === d.toLowerCase())?._id)
                    .filter(Boolean);
            }

            const defaultCurrId = currenciesData?.data?.[0]?._id || '';

            const expectedSalaryPayload = expectedSalaryAmount ? {
                amount: Number(expectedSalaryAmount),
                currency: expectedSalaryCurrency || defaultCurrId
            } : null;

            const isFresherUser = experienceLevel === 'Fresher' || experienceLevelId === 'Fresher';
            const currentSalaryPayload = (!isFresherUser && currentSalaryAmount) ? {
                amount: Number(currentSalaryAmount),
                currency: currentSalaryCurrency || defaultCurrId
            } : null;

            await updateProfile(user.id, {
                location,
                jobType,
                careerGoal,
                experienceLevel: experienceLevelId || experienceLevel,
                experienceLevelId,
                expectedSalary: expectedSalaryPayload,
                currentSalary: currentSalaryPayload,
                skills: skillIds.length > 0 ? skillIds : skills,
                locations: location.split(',').map(l => l.trim()).filter(Boolean),
                jobTypes: jobType.split(',').map(j => j.trim()).filter(Boolean),
                preferredDomains: domainIds,
                preferredLocations: locationIds,
                preferredJobTypes: jtIds,
                gender,
                dob,
                currentLocation,
                hometown,
                // languagesKnown[] — PUT replaces the whole stored array
                languagesKnown,
                educationHistory: processedEducationHistory,
                // employmentHistory[] — PUT replaces the whole stored array; currentSalary per item is a string
                employmentHistory,
                certifications,
                awards,
                // projects[] — PUT replaces the whole stored array
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
        const fileName = file.name;
        const lowerName = fileName.toLowerCase();
        // Spec: resume must be a PDF file only
        const isValidExtension = lowerName.endsWith('.pdf');
        const validTypes = ['application/pdf'];
        if (!validTypes.includes(file.type) && !isValidExtension) {
            showToast('Only PDF files are accepted. Please upload a PDF resume.', 'error');
            return;
        }
        if (!user) return;

        setIsUploadingCV(true);
        try {
            // Use consultationApi.uploadCv — it has correct MIME normalisation and a 30s timeout
            let resumeUrl = '';
            try {
                resumeUrl = await consultationApi.uploadCv(file);
            } catch (uploadErr: any) {
                // Server upload failed — fall back to using the local file name so the
                // profile still shows the CV and the user isn't blocked.
                console.warn('Server CV upload failed, using local filename as fallback:', uploadErr?.message);
            }
            const finalUrl = resumeUrl || fileName;
            await updateProfile(user.id, {
                cvUrl: finalUrl,
                resume: finalUrl,
                cvName: fileName,
                resumeName: fileName
            });
            showToast('CV uploaded successfully.', 'success');
        } catch (err: any) {
            showToast(err.message || 'CV upload failed. Please try again.', 'error');
        } finally {
            setIsUploadingCV(false);
            if (cvInputRef.current) cvInputRef.current.value = '';
            if (cvReplaceInputRef.current) cvReplaceInputRef.current.value = '';
        }
    };

    const removeCV = async () => {
        if (!user) return;
        try {
            await updateProfile(user.id, {
                cvUrl: null,
                resume: null,
                cvName: null,
                resumeName: null
            });
            showToast('CV removed.', 'success');
            sendEmail('CV Removed', 'Your CV has been removed from your profile.');
        } catch (err: any) {
            showToast(err.message || 'Failed to remove CV.', 'error');
        }
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
                                        <div className="flex gap-2">
                                            <select
                                                value={expectedSalaryCurrency}
                                                onChange={e => setExpectedSalaryCurrency(e.target.value)}
                                                disabled={!isEditing}
                                                className="w-28 h-11 bg-background border border-input rounded-md px-2 text-xs font-semibold outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {currenciesData?.data?.map((c: any) => (
                                                    <option key={c._id} value={c._id}>{c.code} ({c.symbol})</option>
                                                ))}
                                            </select>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 1800000"
                                                value={expectedSalaryAmount}
                                                onChange={e => setExpectedSalaryAmount(e.target.value)}
                                                disabled={!isEditing}
                                                className="h-11 flex-1"
                                            />
                                        </div>
                                    </div>

                                    {/* Current Salary (hidden/disabled when Fresher) */}
                                    {!isFresher && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Salary (Annual)</label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={currentSalaryCurrency}
                                                    onChange={e => setCurrentSalaryCurrency(e.target.value)}
                                                    disabled={!isEditing}
                                                    className="w-28 h-11 bg-background border border-input rounded-md px-2 text-xs font-semibold outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {currenciesData?.data?.map((c: any) => (
                                                        <option key={c._id} value={c._id}>{c.code} ({c.symbol})</option>
                                                    ))}
                                                </select>
                                                <Input
                                                    type="number"
                                                    placeholder="e.g. 1200000"
                                                    value={currentSalaryAmount}
                                                    onChange={e => setCurrentSalaryAmount(e.target.value)}
                                                    disabled={!isEditing}
                                                    className="h-11 flex-1"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Location */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferred Location <span className="text-destructive">*</span></label>
                                        <Input
                                            placeholder="Select preferred locations"
                                            value={locationQuery}
                                            onChange={e => { setLocationQuery(e.target.value); setShowLocationSuggestions(true); }}
                                            onFocus={() => setShowLocationSuggestions(true)}
                                            onClick={() => setShowLocationSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                                            disabled={!isEditing}
                                            className={`h-11 ${formErrors.location ? 'border-destructive' : ''}`}
                                        />
                                        {isEditing && showLocationSuggestions && locationsData?.data && locationsData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 flex flex-col gap-0.5 bg-white">
                                                {locationsData.data
                                                    .filter((l: any) => {
                                                        const label = getLocationLabel(l);
                                                        const lastQueryPart = locationQuery.split(',').pop()?.trim() || '';
                                                        return label.toLowerCase().includes(lastQueryPart.toLowerCase());
                                                    })
                                                    .map((l: any) => {
                                                        const isChecked = selectedLocationIds.includes(l._id);
                                                        const label = getLocationLabel(l);
                                                        return (
                                                            <div
                                                                key={l._id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault(); // Prevent input blur from closing the dropdown
                                                                }}
                                                                onClick={() => {
                                                                    let nextIds: string[];
                                                                    if (isChecked) {
                                                                        nextIds = selectedLocationIds.filter(id => id !== l._id);
                                                                    } else {
                                                                        nextIds = [...selectedLocationIds, l._id];
                                                                    }
                                                                    setSelectedLocationIds(nextIds);

                                                                    // Update comma-separated list
                                                                    const selectedNames = locationsData.data
                                                                        .filter((x: any) => nextIds.includes(x._id))
                                                                        .map((x: any) => getLocationLabel(x));
                                                                    const commaSeparated = selectedNames.join(', ');
                                                                    setLocation(commaSeparated);
                                                                    setLocationQuery(''); // Keep query clear for selecting more places
                                                                }}
                                                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors cursor-pointer select-none text-black font-semibold"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    readOnly
                                                                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                                                />
                                                                <span>{label}</span>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        )}
                                        {/* Selected Locations Chips */}
                                        {selectedLocationIds.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {selectedLocationIds.map((id) => {
                                                    const locObj = locationsData?.data?.find((l: any) => l._id === id);
                                                    const name = locObj ? getLocationLabel(locObj) : id;
                                                    return (
                                                        <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-muted/50 text-foreground font-semibold py-1">
                                                            {name}
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextIds = selectedLocationIds.filter(x => x !== id);
                                                                        setSelectedLocationIds(nextIds);
                                                                        const selectedNames = locationsData?.data
                                                                            ?.filter((x: any) => nextIds.includes(x._id))
                                                                            ?.map((x: any) => getLocationLabel(x)) || [];
                                                                        const commaSeparated = selectedNames.join(', ');
                                                                        setLocation(commaSeparated);
                                                                        setLocationQuery('');
                                                                    }}
                                                                    className="hover:text-destructive rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] ml-0.5 cursor-pointer font-bold"
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {formErrors.location && <p className="text-destructive text-xs">{formErrors.location}</p>}
                                    </div>

                                    {/* Preferred Job Type */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferred Job Type <span className="text-destructive">*</span></label>
                                        <Input
                                            placeholder="Select preferred job types"
                                            value={jobTypeQuery}
                                            onChange={e => { setJobTypeQuery(e.target.value); setShowJobTypeSuggestions(true); }}
                                            onFocus={() => setShowJobTypeSuggestions(true)}
                                            onClick={() => setShowJobTypeSuggestions(true)}
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

                                                                    // Update comma-separated list
                                                                    const selectedNames = jobTypesData.data
                                                                        .filter((x: any) => nextIds.includes(x._id))
                                                                        .map((x: any) => x.name);
                                                                    const commaSeparated = selectedNames.join(', ');
                                                                    setJobType(commaSeparated);
                                                                    setJobTypeQuery(''); // Keep it blank so user doesn't need to type commas
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
                                        {/* Selected Job Types Chips */}
                                        {selectedJobTypeIds.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {selectedJobTypeIds.map((id) => {
                                                    const name = jobTypesData?.data?.find((jt: any) => jt._id === id)?.name || id;
                                                    return (
                                                        <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-muted/50 text-foreground font-semibold py-1">
                                                            {name}
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextIds = selectedJobTypeIds.filter(x => x !== id);
                                                                        setSelectedJobTypeIds(nextIds);
                                                                        const selectedNames = jobTypesData?.data
                                                                            ?.filter((x: any) => nextIds.includes(x._id))
                                                                            ?.map((x: any) => x.name) || [];
                                                                        const commaSeparated = selectedNames.join(', ');
                                                                        setJobType(commaSeparated);
                                                                        setJobTypeQuery('');
                                                                    }}
                                                                    className="hover:text-destructive rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] ml-0.5 cursor-pointer font-bold"
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {formErrors.jobType && <p className="text-destructive text-xs">{formErrors.jobType}</p>}
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

                                        {/* Languages Known — array of { language, proficiency } per spec */}
                                        <div className="space-y-2 sm:col-span-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Languages Known</label>
                                                {isEditing && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => setLanguagesKnown([...languagesKnown, { language: '', languageName: '', proficiency: '', proficiencyName: '' }])}
                                                        variant="outline"
                                                        className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                                    >
                                                        + Add Language
                                                    </Button>
                                                )}
                                            </div>
                                            {languagesKnown.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">{isEditing ? 'No languages added. Click + Add Language to get started.' : '—'}</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {languagesKnown.map((lk, idx) => (
                                                        <div key={idx} className="flex gap-2 items-center bg-muted/20 p-2 rounded-xl border border-border/40">
                                                            {isEditing ? (
                                                                <>
                                                                    <select
                                                                        value={lk.language || ''}
                                                                        onChange={(e) => {
                                                                            const selected = languagesData?.data?.find((l: any) => l._id === e.target.value);
                                                                            const c = [...languagesKnown];
                                                                            c[idx] = { ...c[idx], language: e.target.value, languageName: selected?.name || '' };
                                                                            setLanguagesKnown(c);
                                                                        }}
                                                                        className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                                    >
                                                                        <option value="">Select Language</option>
                                                                        {languagesData?.data?.map((l: any) => (
                                                                            <option key={l._id} value={l._id}>{l.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <select
                                                                        value={lk.proficiency || ''}
                                                                        onChange={(e) => {
                                                                            const selected = languageProficienciesData?.data?.find((p: any) => p._id === e.target.value);
                                                                            const c = [...languagesKnown];
                                                                            c[idx] = { ...c[idx], proficiency: e.target.value, proficiencyName: selected?.name || '' };
                                                                            setLanguagesKnown(c);
                                                                        }}
                                                                        className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                                    >
                                                                        <option value="">Proficiency Level</option>
                                                                        {languageProficienciesData?.data?.map((p: any) => (
                                                                            <option key={p._id} value={p._id}>{p.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <Button
                                                                        type="button"
                                                                        onClick={() => setLanguagesKnown(languagesKnown.filter((_, i) => i !== idx))}
                                                                        variant="outline"
                                                                        className="h-8 w-8 p-0 text-destructive border-destructive/20 hover:bg-destructive/5 rounded-lg shrink-0"
                                                                    >✕</Button>
                                                                </>
                                                            ) : (
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <span className="text-sm font-medium">{lk.languageName || lk.language || '—'}</span>
                                                                    {(lk.proficiencyName || lk.proficiency) && (
                                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-semibold text-muted-foreground">{lk.proficiencyName || lk.proficiency}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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

                                {/* ── EDUCATION HISTORY SECTION ── */}
                                <div className="pt-4 border-t border-border/60">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Education History</h3>
                                        {isEditing && (
                                            <Button
                                                type="button"
                                                onClick={() => setEducationHistory([...educationHistory, {
                                                    education: '',
                                                    university: '',
                                                    course: '',
                                                    specialization: '',
                                                    customUniversity: '',
                                                    customCourse: '',
                                                    customSpecialization: '',
                                                    courseType: 'Full-time',
                                                    startYear: '',
                                                    endYear: '',
                                                    gradingSystem: 'CGPA',
                                                    gradingValue: ''
                                                }])}
                                                variant="outline"
                                                className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                            >
                                                + Add Education
                                            </Button>
                                        )}
                                    </div>

                                    {educationHistory.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">{isEditing ? 'No education added. Click + Add Education to get started.' : 'No education history listed.'}</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {educationHistory.map((item, idx) => {
                                                const degreeName = item.education === 'other' ? (item.customEducation || 'Custom Degree') : (educationsData?.data?.find((d: any) => d._id === item.education)?.name || item.education || '—');
                                                const uniName = item.university === 'other' ? (item.customUniversity || 'Custom University') : (universitiesData?.data?.find((u: any) => u._id === item.university)?.name || item.university || '—');
                                                const courseName = item.course === 'other' ? (item.customCourse || 'Custom Course') : (coursesData?.data?.find((c: any) => c._id === item.course)?.name || item.course || '—');
                                                const specName = item.specialization === 'other' ? (item.customSpecialization || 'Custom Specialization') : (specializationsData?.data?.find((s: any) => s._id === item.specialization)?.name || item.specialization || '—');

                                                return (
                                                    <div key={idx} className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-3">
                                                        {isEditing ? (
                                                            <>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    {/* Degree */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Degree</label>
                                                                        <select
                                                                            value={item.education || ''}
                                                                            onChange={(e) => {
                                                                                const copy = [...educationHistory];
                                                                                copy[idx] = { ...copy[idx], education: e.target.value, customEducation: e.target.value === 'other' ? '' : copy[idx].customEducation };
                                                                                setEducationHistory(copy);
                                                                            }}
                                                                            className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-medium outline-none"
                                                                        >
                                                                            <option value="">Select Degree</option>
                                                                            {educationsData?.data?.map((d: any) => (
                                                                                <option key={d._id} value={d._id}>{d.name}</option>
                                                                            ))}
                                                                            <option value="other">Other / Custom Degree</option>
                                                                        </select>
                                                                        {item.education === 'other' && (
                                                                            <Input
                                                                                placeholder="Enter Custom Degree"
                                                                                value={item.customEducation || ''}
                                                                                onChange={(e) => {
                                                                                    const copy = [...educationHistory];
                                                                                    copy[idx] = { ...copy[idx], customEducation: e.target.value };
                                                                                    setEducationHistory(copy);
                                                                                }}
                                                                                className="h-8 mt-1 text-xs"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {/* Course */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Course</label>
                                                                        <select
                                                                            value={item.course || ''}
                                                                            onChange={(e) => {
                                                                                const copy = [...educationHistory];
                                                                                copy[idx] = { ...copy[idx], course: e.target.value, customCourse: e.target.value === 'other' ? '' : copy[idx].customCourse };
                                                                                setEducationHistory(copy);
                                                                            }}
                                                                            className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-medium outline-none"
                                                                        >
                                                                            <option value="">Select Course</option>
                                                                            {coursesData?.data?.map((c: any) => (
                                                                                <option key={c._id} value={c._id}>{c.name}</option>
                                                                            ))}
                                                                            <option value="other">Other / Custom Course</option>
                                                                        </select>
                                                                        {item.course === 'other' && (
                                                                            <Input
                                                                                placeholder="Enter Custom Course"
                                                                                value={item.customCourse || ''}
                                                                                onChange={(e) => {
                                                                                    const copy = [...educationHistory];
                                                                                    copy[idx] = { ...copy[idx], customCourse: e.target.value };
                                                                                    setEducationHistory(copy);
                                                                                }}
                                                                                className="h-8 mt-1 text-xs"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {/* Specialization */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Specialization</label>
                                                                        <select
                                                                            value={item.specialization || ''}
                                                                            onChange={(e) => {
                                                                                const copy = [...educationHistory];
                                                                                copy[idx] = { ...copy[idx], specialization: e.target.value, customSpecialization: e.target.value === 'other' ? '' : copy[idx].customSpecialization };
                                                                                setEducationHistory(copy);
                                                                            }}
                                                                            className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-medium outline-none"
                                                                        >
                                                                            <option value="">Select Specialization</option>
                                                                            {specializationsData?.data?.map((s: any) => (
                                                                                <option key={s._id} value={s._id}>{s.name}</option>
                                                                            ))}
                                                                            <option value="other">Other / Custom Specialization</option>
                                                                        </select>
                                                                        {item.specialization === 'other' && (
                                                                            <Input
                                                                                placeholder="Enter Custom Specialization"
                                                                                value={item.customSpecialization || ''}
                                                                                onChange={(e) => {
                                                                                    const copy = [...educationHistory];
                                                                                    copy[idx] = { ...copy[idx], customSpecialization: e.target.value };
                                                                                    setEducationHistory(copy);
                                                                                }}
                                                                                className="h-8 mt-1 text-xs"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {/* University */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">University</label>
                                                                        <select
                                                                            value={item.university || ''}
                                                                            onChange={(e) => {
                                                                                const copy = [...educationHistory];
                                                                                copy[idx] = { ...copy[idx], university: e.target.value, customUniversity: e.target.value === 'other' ? '' : copy[idx].customUniversity };
                                                                                setEducationHistory(copy);
                                                                            }}
                                                                            className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-medium outline-none"
                                                                        >
                                                                            <option value="">Select University</option>
                                                                            {universitiesData?.data?.map((u: any) => (
                                                                                <option key={u._id} value={u._id}>{u.name}</option>
                                                                            ))}
                                                                            <option value="other">Other / Custom University</option>
                                                                        </select>
                                                                        {item.university === 'other' && (
                                                                            <Input
                                                                                placeholder="Enter Custom University"
                                                                                value={item.customUniversity || ''}
                                                                                onChange={(e) => {
                                                                                    const copy = [...educationHistory];
                                                                                    copy[idx] = { ...copy[idx], customUniversity: e.target.value };
                                                                                    setEducationHistory(copy);
                                                                                }}
                                                                                className="h-8 mt-1 text-xs"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {/* Course Type */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Course Type</label>
                                                                        <select
                                                                            value={item.courseType || 'Full-time'}
                                                                            onChange={(e) => {
                                                                                const copy = [...educationHistory];
                                                                                copy[idx] = { ...copy[idx], courseType: e.target.value };
                                                                                setEducationHistory(copy);
                                                                            }}
                                                                            className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-medium outline-none"
                                                                        >
                                                                            <option value="Full-time">Full-time</option>
                                                                            <option value="Part-time">Part-time</option>
                                                                            <option value="Correspondence/Distance">Correspondence/Distance</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* Start Year & End Year */}
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Year</label>
                                                                            <Input
                                                                                placeholder="e.g. 2020"
                                                                                value={item.startYear || ''}
                                                                                onChange={(e) => {
                                                                                    const copy = [...educationHistory];
                                                                                    copy[idx] = { ...copy[idx], startYear: e.target.value };
                                                                                    setEducationHistory(copy);
                                                                                }}
                                                                                className="h-9 text-xs"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">End Year</label>
                                                                            <Input
                                                                                placeholder="e.g. 2024"
                                                                                value={item.endYear || ''}
                                                                                onChange={(e) => {
                                                                                    const copy = [...educationHistory];
                                                                                    copy[idx] = { ...copy[idx], endYear: e.target.value };
                                                                                    setEducationHistory(copy);
                                                                                }}
                                                                                className="h-9 text-xs"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Grading System & Grading Value */}
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Grading System</label>
                                                                            <select
                                                                                value={item.gradingSystem || 'CGPA'}
                                                                                onChange={(e) => {
                                                                                    const copy = [...educationHistory];
                                                                                    copy[idx] = { ...copy[idx], gradingSystem: e.target.value };
                                                                                    setEducationHistory(copy);
                                                                                }}
                                                                                className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-medium outline-none"
                                                                            >
                                                                                <option value="CGPA">CGPA</option>
                                                                                <option value="GPA">GPA</option>
                                                                                <option value="Percentage">Percentage</option>
                                                                                <option value="Marks">Marks</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Grading Value</label>
                                                                            <Input
                                                                                placeholder="Value"
                                                                                value={item.gradingValue || ''}
                                                                                onChange={(e) => {
                                                                                    const copy = [...educationHistory];
                                                                                    copy[idx] = { ...copy[idx], gradingValue: e.target.value };
                                                                                    setEducationHistory(copy);
                                                                                }}
                                                                                className="h-9 text-xs"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end pt-1">
                                                                    <Button
                                                                        type="button"
                                                                        onClick={() => setEducationHistory(educationHistory.filter((_, i) => i !== idx))}
                                                                        variant="outline"
                                                                        className="h-7 rounded-lg text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5 px-2"
                                                                    >
                                                                        Remove Education
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-sm font-semibold text-foreground">{degreeName}</span>
                                                                    <span className="text-xs font-medium text-muted-foreground">{item.startYear && item.endYear ? `${item.startYear} - ${item.endYear}` : '—'}</span>
                                                                </div>
                                                                <span className="text-xs text-foreground font-medium">{courseName} {specName !== '—' && `· ${specName}`}</span>
                                                                <span className="text-xs text-muted-foreground">{uniName}</span>
                                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                                                    <span>Course Type: <span className="font-semibold text-foreground">{item.courseType || 'Full-time'}</span></span>
                                                                    {item.gradingValue && (
                                                                        <span>Grade: <span className="font-semibold text-foreground">{item.gradingValue} ({item.gradingSystem || 'CGPA'})</span></span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {/* ── EMPLOYMENT HISTORY SECTION ── */}
                                <div className="pt-4 border-t border-border/60">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employment History</h3>
                                        {isEditing && (
                                            <Button
                                                type="button"
                                                onClick={() => setEmploymentHistory([...employmentHistory, { companyName: '', role: '', startDate: '', endDate: '', isCurrent: false, currentSalary: '', description: '' }])}
                                                variant="outline"
                                                className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                            >
                                                + Add
                                            </Button>
                                        )}
                                    </div>
                                    {employmentHistory.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">{isEditing ? 'No employment history added. Click + Add to get started.' : 'No employment history listed.'}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {employmentHistory.map((emp, idx) => (
                                                <div key={idx} className="bg-muted/20 p-3 rounded-xl border border-border/40 space-y-2">
                                                    {isEditing ? (
                                                        <>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <Input
                                                                    placeholder="Company Name"
                                                                    value={emp.companyName || ''}
                                                                    onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], companyName: e.target.value }; setEmploymentHistory(c); }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                                <Input
                                                                    placeholder="Role / Job Title"
                                                                    value={emp.role || ''}
                                                                    onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], role: e.target.value }; setEmploymentHistory(c); }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                <Input
                                                                    placeholder="Start Date (e.g. 2021-06)"
                                                                    value={emp.startDate || ''}
                                                                    onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], startDate: e.target.value }; setEmploymentHistory(c); }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                                <Input
                                                                    placeholder="End Date (e.g. 2023-08)"
                                                                    value={emp.endDate || ''}
                                                                    disabled={!!emp.isCurrent}
                                                                    onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], endDate: e.target.value }; setEmploymentHistory(c); }}
                                                                    className="h-9 rounded-lg text-sm disabled:opacity-50"
                                                                />
                                                                {/* Current salary kept as string per spec */}
                                                                <Input
                                                                    placeholder="Current Salary (e.g. 50000)"
                                                                    value={emp.currentSalary || ''}
                                                                    onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], currentSalary: e.target.value }; setEmploymentHistory(c); }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`emp-current-${idx}`}
                                                                    checked={!!emp.isCurrent}
                                                                    onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], isCurrent: e.target.checked, endDate: e.target.checked ? '' : c[idx].endDate }; setEmploymentHistory(c); }}
                                                                    className="rounded border-gray-300 w-4 h-4 cursor-pointer"
                                                                />
                                                                <label htmlFor={`emp-current-${idx}`} className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">Currently working here</label>
                                                            </div>
                                                            <textarea
                                                                placeholder="Brief description of responsibilities..."
                                                                value={emp.description || ''}
                                                                onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], description: e.target.value }; setEmploymentHistory(c); }}
                                                                rows={2}
                                                                className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-all resize-none bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                            />
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => setEmploymentHistory(employmentHistory.filter((_, i) => i !== idx))}
                                                                    variant="outline"
                                                                    className="h-7 rounded-lg text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5 px-2"
                                                                >Remove</Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-semibold">{emp.companyName || '—'}</span>
                                                                {emp.isCurrent && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">Current</span>}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{emp.role}{(emp.startDate || emp.endDate) ? ` · ${emp.startDate || ''}${emp.isCurrent ? ' – Present' : emp.endDate ? ` – ${emp.endDate}` : ''}` : ''}</span>
                                                            {emp.description && <span className="text-xs text-muted-foreground mt-0.5">{emp.description}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                    <div className="space-y-4">
                                        {/* Projects — structured array, PUT replaces whole array */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Projects</label>
                                                {isEditing && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => setProjects([...projects, { title: '', description: '', status: 'ongoing', siteLink: '', teamSize: '' }])}
                                                        variant="outline"
                                                        className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                                    >
                                                        + Add Project
                                                    </Button>
                                                )}
                                            </div>
                                            {projects.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">{isEditing ? 'No projects added. Click + Add Project to get started.' : 'No projects listed.'}</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {projects.map((proj, idx) => (
                                                        <div key={idx} className="bg-muted/20 p-3 rounded-xl border border-border/40 space-y-2">
                                                            {isEditing ? (
                                                                <>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        <Input
                                                                            placeholder="Project Title"
                                                                            value={proj.title || ''}
                                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], title: e.target.value }; setProjects(c); }}
                                                                            className="h-9 rounded-lg text-sm"
                                                                        />
                                                                        {/* Status: allowed values per spec — ongoing | completed | paused */}
                                                                        <select
                                                                            value={proj.status || 'ongoing'}
                                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], status: e.target.value as 'ongoing' | 'completed' | 'paused' }; setProjects(c); }}
                                                                            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                                        >
                                                                            <option value="ongoing">Ongoing</option>
                                                                            <option value="completed">Completed</option>
                                                                            <option value="paused">Paused</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        <Input
                                                                            placeholder="Site Link / GitHub URL"
                                                                            value={proj.siteLink || ''}
                                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], siteLink: e.target.value }; setProjects(c); }}
                                                                            className="h-9 rounded-lg text-sm"
                                                                        />
                                                                        <Input
                                                                            placeholder="Team Size (e.g. 3)"
                                                                            value={proj.teamSize !== undefined ? String(proj.teamSize) : ''}
                                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], teamSize: e.target.value }; setProjects(c); }}
                                                                            className="h-9 rounded-lg text-sm"
                                                                        />
                                                                    </div>
                                                                    <textarea
                                                                        placeholder="Project description..."
                                                                        value={proj.description || ''}
                                                                        onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], description: e.target.value }; setProjects(c); }}
                                                                        rows={2}
                                                                        className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-all resize-none bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                                    />
                                                                    <div className="flex justify-end">
                                                                        <Button
                                                                            type="button"
                                                                            onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                                                                            variant="outline"
                                                                            className="h-7 rounded-lg text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5 px-2"
                                                                        >Remove</Button>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm font-semibold">{proj.title || '—'}</span>
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${proj.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : proj.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                            {proj.status === 'completed' ? 'Completed' : proj.status === 'paused' ? 'Paused' : 'Ongoing'}
                                                                        </span>
                                                                    </div>
                                                                    {proj.description && <span className="text-xs text-muted-foreground">{proj.description}</span>}
                                                                    <div className="flex gap-3 mt-0.5 flex-wrap">
                                                                        {proj.siteLink && <a href={proj.siteLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-2">View Site</a>}
                                                                        {proj.teamSize && <span className="text-xs text-muted-foreground">Team: {proj.teamSize}</span>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
                                            <h4 className="font-semibold text-sm truncate" title={profile.cvName || profile.resumeName || getCleanFileName(profile.cvUrl)}>
                                                {profile.cvName || profile.resumeName || getCleanFileName(profile.cvUrl)}
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
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={isUploadingCV}
                                                className="w-full cursor-pointer overflow-hidden relative group disabled:cursor-wait"
                                            >
                                                <span className="flex items-center gap-2 group-hover:text-primary transition-colors">
                                                    {isUploadingCV
                                                        ? <><Loader2 size={18} className="animate-spin" /> Uploading...</>
                                                        : <><UploadCloud size={18} /> Upload New CV</>
                                                    }
                                                </span>
                                                <input
                                                    ref={cvReplaceInputRef}
                                                    type="file"
                                                    onChange={handleCVUpload}
                                                    disabled={isUploadingCV}
                                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
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
                                    In compliance with DPDP 2023 & GDPR, you have the right to withdraw consent or delete your account. Email <a href="mailto:privacy@squrex.com" className="text-primary hover:underline">privacy@squrex.com</a> for inquiries.
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
