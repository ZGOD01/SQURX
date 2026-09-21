import { useState, useRef, useEffect, useMemo } from 'react';
import { useStudentStore } from './store';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Toast, Modal, Badge } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { useAuthStore } from '../auth/store';
import { useNavigate } from 'react-router-dom';
import { Loader2, UploadCloud, FileText, Trash2, ShieldCheck, Plus, X, Check, Eye, Lock, Pencil, ExternalLink } from 'lucide-react';
import { consultationApi } from '@/lib/consultationApi';
import { useNotificationStore } from '@/lib/store/notifications';
import type { EducationHistoryItem, EmploymentHistoryItem, ProjectItem, LanguageKnownItem, CertificationItem, OtherAchievementItem } from '@/lib/mockDb/schema';
import { formatJoiningDateDisplay, formatJoiningDatePayload, isCertificationCompleted, toDateInputValue } from '@/lib/mockApi';
import {
    useGetCountriesQuery,
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

const isHexId = (val: any): boolean => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

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
                {skills.filter(s => !/^[0-9a-fA-F]{24}$/.test(s)).map(skill => (
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
    if (!city || /^[0-9a-fA-F]{24}$/.test(city)) return '';
    if (typeof l === 'object' && l) {
        let country = '';
        if (l.country) {
            country = typeof l.country === 'object' ? (l.country.name || '') : String(l.country);
        } else if (l.countryName) {
            country = String(l.countryName);
        }
        if (country && !/^[0-9a-fA-F]{24}$/.test(country)) {
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

// Safe currency ID extractor
const getSafeCurrencyId = (curr: any): string => {
    if (!curr) return '';
    if (typeof curr === 'object' && curr._id) return String(curr._id);
    if (typeof curr === 'string' && curr !== '[object Object]') return curr;
    return '';
};

// Safe salary display amount
const getSalaryDisplayAmount = (amount: any): string => {
    if (amount === null || amount === undefined || amount === '') return '';
    const num = Number(amount);
    if (isNaN(num)) return '';
    return String(amount);
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
    const [domain, setDomain] = useState('');
    const [customDomain, setCustomDomain] = useState('');
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
    const [hometownCountry, setHometownCountry] = useState('');
    const [hometownCountryId, setHometownCountryId] = useState('');
    const [languagesKnown, setLanguagesKnown] = useState<LanguageKnownItem[]>([]);
    const [educationHistory, setEducationHistory] = useState<EducationHistoryItem[]>([]);
    const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistoryItem[]>([]);
    const [certifications, setCertifications] = useState<CertificationItem[]>([]);
    const [awards, setAwards] = useState('');
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [internships, setInternships] = useState<Array<{ companyName: string; duration: string; role: string }>>([]);
    const [profileSummary, setProfileSummary] = useState('');
    const [otherAchievements, setOtherAchievements] = useState<OtherAchievementItem[]>([]);

    // ── Autocomplete dropdowns ───────────────────
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

    // ── Status states ────────────────────────────
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploadingCV, setIsUploadingCV] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
    const [toastTitle, setToastTitle] = useState<string | null>(null);
    const [isConsentEnabled, setIsConsentEnabled] = useState(false);
    const [profileInitialized, setProfileInitialized] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [formSnapshot, setFormSnapshot] = useState<{
        location: string; locationQuery: string; selectedLocationId: string;
        jobType: string; jobTypeQuery: string;
        careerGoal: string;
        domain: string;
        customDomain: string;
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
        hometownCountry: string;
        hometownCountryId: string;
        languagesKnown: LanguageKnownItem[];
        educationHistory: EducationHistoryItem[];
        employmentHistory: EmploymentHistoryItem[];
        certifications: CertificationItem[];
        awards: string;
        projects: ProjectItem[];
        internships: Array<{ companyName: string; duration: string; role: string }>;
        profileSummary: string;
        otherAchievements: OtherAchievementItem[];
    } | null>(null);

    // ── Refs ─────────────────────────────────────
    const cvInputRef = useRef<HTMLInputElement>(null);
    const cvReplaceInputRef = useRef<HTMLInputElement>(null);
    const fetchedRef = useRef(false);

    // ── API queries & mutations ─────────────────
    const { data: countriesData } = useGetCountriesQuery(undefined);
    const { data: currenciesData } = useGetCurrenciesQuery(undefined);
    const { data: educationsData } = useGetEducationsQuery(undefined);
    const { data: experienceLevelsData } = useGetExperienceLevelsQuery(undefined);
    const { data: jobTypesData } = useGetJobTypesQuery(undefined);
    const { data: domainsData } = useGetDomainsQuery({ search: careerGoal.split(',').pop()?.trim() || '' });
    const { data: locationsData } = useGetLocationsQuery({ search: locationQuery });
    const { data: allLocationsData } = useGetLocationsQuery(undefined);
    const { data: skillsData } = useGetSkillsQuery({ search: '' });
    const { data: languagesData } = useGetLanguagesQuery(undefined);
    const { data: languageProficienciesData } = useGetLanguageProficienciesQuery(undefined);
    const { data: universitiesData } = useGetUniversitiesQuery(undefined);
    const { data: coursesData } = useGetCoursesQuery(undefined);
    const { data: specializationsData } = useGetSpecializationsQuery(undefined);
    const { data: rolesData } = useGetRolesQuery(undefined);

    // Dynamic map of all locations from the database for instant, reliable ID resolution
    const locationMap = useMemo(() => {
        const map = new Map<string, any>();
        if (allLocationsData?.data && Array.isArray(allLocationsData.data)) {
            allLocationsData.data.forEach((l: any) => { if (l?._id) map.set(l._id, l); });
        }
        if (locationsData?.data && Array.isArray(locationsData.data)) {
            locationsData.data.forEach((l: any) => { if (l?._id) map.set(l._id, l); });
        }
        return map;
    }, [allLocationsData, locationsData]);

    const [submitEducation] = useSubmitEducationMutation();
    const [submitUniversity] = useSubmitUniversityMutation();
    const [submitCourse] = useSubmitCourseMutation();
    const [submitSpecialization] = useSubmitSpecializationMutation();

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
            const initLoc = profile.location || '';
            const isInitLocRaw = /^[0-9a-fA-F]{24}$/.test(initLoc);
            setLocation(isInitLocRaw ? '' : initLoc);
            setLocationQuery(isInitLocRaw ? '' : initLoc);

            const initJt = profile.jobType || '';
            const isInitJtRaw = /^[0-9a-fA-F]{24}$/.test(initJt);
            setJobType(isInitJtRaw ? '' : initJt);
            setJobTypeQuery(isInitJtRaw ? '' : initJt);

            const initGoal = profile.careerGoal || '';
            const isInitGoalRaw = /^[0-9a-fA-F]{24}$/.test(initGoal);
            setCareerGoal(isInitGoalRaw ? '' : initGoal);
            // Resolve experience level — avoid setting raw ObjectIDs as display text
            const initExpLevel = profile.experienceLevel || '';
            const initExpId = profile.experienceLevelId || '';
            const isInitExpRawId = /^[0-9a-fA-F]{24}$/.test(initExpLevel);
            if (isInitExpRawId || !initExpLevel) {
                const resolveId = initExpId || initExpLevel;
                const expMatch = resolveId ? experienceLevelsData?.data?.find((e: any) => e._id === resolveId) : null;
                if (expMatch) {
                    setExperienceLevel(expMatch.name);
                    setExperienceLevelQuery(expMatch.name === 'Fresher' ? 'Fresher' : `${expMatch.name} Years`);
                    setExperienceLevelId(expMatch._id);
                } else {
                    if (!isInitExpRawId) setExperienceLevel(initExpLevel);
                    setExperienceLevelId(initExpId);
                }
            } else {
                setExperienceLevel(initExpLevel);
                setExperienceLevelQuery(initExpLevel === 'Fresher' ? 'Fresher' : `${initExpLevel} Years`);
                setExperienceLevelId(initExpId);
            }

            // Structured expected salary parsing
            if (profile.expectedSalary) {
                if (typeof profile.expectedSalary === 'object') {
                    setExpectedSalaryAmount(getSalaryDisplayAmount(profile.expectedSalary.amount));
                    const cId = getSafeCurrencyId(profile.expectedSalary.currency);
                    if (cId) setExpectedSalaryCurrency(cId);
                } else {
                    setExpectedSalaryAmount(getSalaryDisplayAmount(profile.expectedSalary));
                }
            }
            // Structured current salary parsing
            if (profile.currentSalary) {
                if (typeof profile.currentSalary === 'object') {
                    setCurrentSalaryAmount(getSalaryDisplayAmount(profile.currentSalary.amount));
                    const cId = getSafeCurrencyId(profile.currentSalary.currency);
                    if (cId) setCurrentSalaryCurrency(cId);
                } else {
                    setCurrentSalaryAmount(getSalaryDisplayAmount(profile.currentSalary));
                }
            }

            // Resolve skills — avoid displaying raw ObjectIDs
            const initSkills = profile.skills || [];
            const initSkillIds = (profile as any).skillIds as string[] | undefined;
            const hasInitRawIds = initSkills.some((s: string) => /^[0-9a-fA-F]{24}$/.test(s));
            if (hasInitRawIds && initSkillIds && skillsData?.data) {
                const resolved = initSkillIds.map((id: string) => {
                    const match = skillsData.data.find((sd: any) => sd._id === id);
                    return match ? match.name : null;
                }).filter(Boolean) as string[];
                setSkills(resolved.length > 0 ? resolved : initSkills);
            } else {
                setSkills(initSkills);
            }
            setSelectedDomainIds(profile.preferredDomainIds || []);
            setSelectedLocationIds(profile.preferredLocationIds || []);
            setSelectedJobTypeIds(profile.preferredJobTypeIds || []);

            setGender(profile.gender || '');
            // Format ISO DOB to DD/MM/YYYY for user-friendly display
            const rawDob = profile.dob || '';
            let displayDob = rawDob;
            if (rawDob && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDob)) {
                const d = new Date(rawDob);
                if (!isNaN(d.getTime())) {
                    const day = String(d.getUTCDate()).padStart(2, '0');
                    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                    displayDob = `${day}/${month}/${d.getUTCFullYear()}`;
                }
            }
            setDob(displayDob);
            const domainVal = typeof profile.domain === 'object' && profile.domain ? ((profile.domain as any)._id || (profile.domain as any).name || '') : (profile.domain || '');
            setDomain(domainVal);
            setCustomDomain(profile.customDomain || '');
            setCurrentLocation(profile.currentLocation || '');
            setHometown(profile.hometown || '');
            
            let initCountryName = '';
            let initCountryId = '';
            if (typeof profile.hometownCountry === 'object' && profile.hometownCountry) {
                initCountryName = (profile.hometownCountry as any).name || '';
                initCountryId = (profile.hometownCountry as any)._id || '';
            } else if (typeof profile.hometownCountry === 'string') {
                if (/^[0-9a-fA-F]{24}$/.test(profile.hometownCountry.trim())) {
                    initCountryId = profile.hometownCountry.trim();
                } else {
                    initCountryName = profile.hometownCountry.trim();
                }
            }
            if ((profile as any).hometownCountryId) {
                initCountryId = (profile as any).hometownCountryId;
            }
            setHometownCountry(initCountryName);
            setHometownCountryId(initCountryId);
            setLanguagesKnown(profile.languagesKnown || []);
            const loadedEduHistory = (profile.educationHistory || []).map((eh, i) => {
                if (i === 0 && !eh.schoolCollegeName && (profile as any)?.schoolCollegeName) {
                    return { ...eh, schoolCollegeName: (profile as any).schoolCollegeName, college: (profile as any).schoolCollegeName };
                }
                return eh;
            });
            setEducationHistory(loadedEduHistory);
            setEmploymentHistory(profile.employmentHistory || []);
            setCertifications(profile.certifications || []);
            setAwards(profile.awards || '');
            const savedProjects = (() => {
                try {
                    const raw = typeof window !== 'undefined' && user?.id ? localStorage.getItem(`squrx_projects_${user.id}`) : null;
                    return raw ? JSON.parse(raw) : null;
                } catch { return null; }
            })();
            const effectiveProjects = (Array.isArray(profile.projects) && profile.projects.length > 0)
                ? profile.projects
                : (Array.isArray(savedProjects) && savedProjects.length > 0 ? savedProjects : (profile.projects || []));
            setProjects(effectiveProjects);
            const savedInternships = (() => {
                try {
                    const raw = typeof window !== 'undefined' && user?.id ? localStorage.getItem(`squrx_internships_${user.id}`) : null;
                    return raw ? JSON.parse(raw) : null;
                } catch { return null; }
            })();
            const effectiveInternships = (profile.internships && profile.internships.length > 0)
                ? profile.internships
                : (Array.isArray(savedInternships) && savedInternships.length > 0 ? savedInternships : (profile.internships || []));
            setInternships(effectiveInternships);
            setProfileSummary(profile.profileSummary || '');
            if (Array.isArray(profile.otherAchievements)) {
                setOtherAchievements(profile.otherAchievements);
            } else if (typeof profile.otherAchievements === 'string' && (profile.otherAchievements as string).trim()) {
                setOtherAchievements([{ name: (profile.otherAchievements as string).trim(), link: '', description: '' }]);
            } else {
                setOtherAchievements([]);
            }

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

    // ── Resolve Experience Level raw ObjectID → human-readable name ──
    // When the backend returns an unpopulated ObjectID string (e.g. "6a26db577b8c3f3b4594e05a"),
    // mockApi stores it in experienceLevelId only. This effect resolves it to a display name
    // once the experienceLevels API data is available.
    useEffect(() => {
        if (!experienceLevelsData?.data || experienceLevelsData.data.length === 0) return;
        const expId = experienceLevelId || profile?.experienceLevelId;
        if (!expId) return;
        // Only resolve if current experienceLevel is empty or is itself a raw ObjectID
        const isRawId = !experienceLevel || /^[0-9a-fA-F]{24}$/.test(experienceLevel);
        if (!isRawId) return;
        const match = experienceLevelsData.data.find((e: any) => e._id === expId);
        if (match) {
            setExperienceLevel(match.name);
            const displayName = match.name === 'Fresher' ? 'Fresher' : `${match.name} Years`;
            setExperienceLevelQuery(displayName);
            setExperienceLevelId(match._id);
        }
    }, [experienceLevelsData, experienceLevelId, experienceLevel, profile]);

    // ── Resolve Hometown Country raw ObjectID → human-readable name ──
    useEffect(() => {
        if (!countriesData?.data || countriesData.data.length === 0) return;
        if (hometownCountryId && (!hometownCountry || /^[0-9a-fA-F]{24}$/.test(hometownCountry))) {
            const match = countriesData.data.find((c: any) => c._id === hometownCountryId);
            if (match) setHometownCountry(match.name);
        } else if (hometownCountry && !hometownCountryId) {
            const match = countriesData.data.find((c: any) => c.name.toLowerCase() === (typeof hometownCountry === 'string' ? hometownCountry.toLowerCase() : ''));
            if (match) setHometownCountryId(match._id);
        }
    }, [countriesData, hometownCountryId, hometownCountry]);

    // ── Resolve Skill raw ObjectIDs → human-readable names ──
    // When the backend returns skills as unpopulated ObjectID strings,
    // mockApi stores the IDs in profile.skillIds. This effect resolves them
    // to skill names once the skills API data is available.
    useEffect(() => {
        if (!skillsData?.data || skillsData.data.length === 0) return;
        if (!profile) return;
        const skillIds = (profile as any).skillIds as string[] | undefined;
        if (!skillIds || skillIds.length === 0) return;
        // Check if current skills array contains raw ObjectIDs that need resolution
        const hasRawIds = skills.some(s => /^[0-9a-fA-F]{24}$/.test(s));
        if (!hasRawIds && skills.length > 0) return; // Already resolved
        const resolvedSkills = skillIds.map((id: string) => {
            const match = skillsData.data.find((sd: any) => sd._id === id);
            return match ? match.name : null;
        }).filter(Boolean) as string[];
        if (resolvedSkills.length > 0) {
            setSkills(resolvedSkills);
        }
    }, [skillsData, profile, skills]);

    // ── Resolve Location raw ObjectIDs → human-readable names dynamically from DB ──
    useEffect(() => {
        if (locationMap.size === 0) return;
        const isLocRawId = !location || /^[0-9a-fA-F]{24}$/.test(location);
        const isLocQueryRawId = !locationQuery || /^[0-9a-fA-F]{24}$/.test(locationQuery);

        if ((isLocRawId || isLocQueryRawId) && selectedLocationIds.length > 0) {
            const resolved = selectedLocationIds
                .map(id => {
                    const found = locationMap.get(id);
                    return found ? getLocationLabel(found) : '';
                })
                .filter(Boolean);
            if (resolved.length > 0) {
                const joined = resolved.join(', ');
                if (isLocRawId) setLocation(joined);
                if (isLocQueryRawId && !isEditing) setLocationQuery(joined);
            }
        } else if (isLocRawId && location) {
            const found = locationMap.get(location);
            if (found) {
                const label = getLocationLabel(found);
                setLocation(label);
                if (!isEditing) setLocationQuery(label);
            }
        } else if (selectedLocationIds.length === 0 && location && !/^[0-9a-fA-F]{24}$/.test(location)) {
            // Reverse lookup: populate selectedLocationIds from DB matching names
            const parts = location.split(',').map(s => s.trim().split('(')[0].trim().toLowerCase()).filter(Boolean);
            const matchedIds = Array.from(locationMap.values())
                .filter((l: any) => l.name && parts.includes(l.name.toLowerCase()))
                .map((l: any) => l._id);
            if (matchedIds.length > 0) {
                setSelectedLocationIds(matchedIds);
            }
        }
    }, [locationMap, selectedLocationIds, location, locationQuery, isEditing]);

    // ── Resolve Job Type raw ObjectIDs → human-readable names dynamically from DB ──
    useEffect(() => {
        if (!jobTypesData?.data || jobTypesData.data.length === 0) return;
        const isJtRawId = !jobType || /^[0-9a-fA-F]{24}$/.test(jobType);
        const isJtQueryRawId = !jobTypeQuery || /^[0-9a-fA-F]{24}$/.test(jobTypeQuery);

        if ((isJtRawId || isJtQueryRawId) && selectedJobTypeIds.length > 0) {
            const resolved = selectedJobTypeIds
                .map(id => jobTypesData.data.find((jt: any) => jt._id === id)?.name)
                .filter(Boolean);
            if (resolved.length > 0) {
                const joined = resolved.join(', ');
                if (isJtRawId) setJobType(joined);
                if (isJtQueryRawId && !isEditing) setJobTypeQuery(joined);
            }
        } else if (isJtRawId && jobType) {
            const found = jobTypesData.data.find((jt: any) => jt._id === jobType);
            if (found) {
                setJobType(found.name);
                if (!isEditing) setJobTypeQuery(found.name);
            }
        }
    }, [jobTypesData, selectedJobTypeIds, jobType, jobTypeQuery, isEditing]);

    // ── Resolve Career Goal / Domain raw ObjectIDs → human-readable names dynamically from DB ──
    useEffect(() => {
        if (!domainsData?.data || domainsData.data.length === 0) return;
        const isGoalRawId = !careerGoal || /^[0-9a-fA-F]{24}$/.test(careerGoal);

        if (isGoalRawId && selectedDomainIds.length > 0) {
            const resolved = selectedDomainIds
                .map(id => domainsData.data.find((d: any) => d._id === id)?.name)
                .filter(Boolean);
            if (resolved.length > 0) {
                setCareerGoal(resolved.join(', '));
            }
        } else if (isGoalRawId && careerGoal) {
            const found = domainsData.data.find((d: any) => d._id === careerGoal);
            if (found) {
                setCareerGoal(found.name);
            }
        }
    }, [domainsData, selectedDomainIds, careerGoal]);

    useEffect(() => {
        if (profile && profileInitialized && !isEditing) {
            const rawLoc = profile.location || '';
            const isRawLocId = /^[0-9a-fA-F]{24}$/.test(rawLoc);
            setLocation(isRawLocId ? '' : rawLoc);
            setLocationQuery(isRawLocId ? '' : rawLoc);

            const rawJt = profile.jobType || '';
            const isRawJtId = /^[0-9a-fA-F]{24}$/.test(rawJt);
            setJobType(isRawJtId ? '' : rawJt);
            setJobTypeQuery(isRawJtId ? '' : rawJt);

            const rawGoal = profile.careerGoal || '';
            const isRawGoalId = /^[0-9a-fA-F]{24}$/.test(rawGoal);
            setCareerGoal(isRawGoalId ? '' : rawGoal);
            // Resolve experience level — avoid setting raw ObjectIDs as display text
            const rawExpLevel = profile.experienceLevel || '';
            const rawExpId = profile.experienceLevelId || '';
            const isExpRawId = /^[0-9a-fA-F]{24}$/.test(rawExpLevel);
            if (isExpRawId || !rawExpLevel) {
                // Try to resolve from API cache
                const resolveId = rawExpId || rawExpLevel;
                const expMatch = resolveId ? experienceLevelsData?.data?.find((e: any) => e._id === resolveId) : null;
                if (expMatch) {
                    setExperienceLevel(expMatch.name);
                    setExperienceLevelQuery(expMatch.name === 'Fresher' ? 'Fresher' : `${expMatch.name} Years`);
                    setExperienceLevelId(expMatch._id);
                } else {
                    // API data not loaded yet — leave empty, the resolution effect will handle it
                    if (!isExpRawId) setExperienceLevel(rawExpLevel);
                    setExperienceLevelId(rawExpId);
                }
            } else {
                setExperienceLevel(rawExpLevel);
                setExperienceLevelQuery(rawExpLevel === 'Fresher' ? 'Fresher' : `${rawExpLevel} Years`);
                setExperienceLevelId(rawExpId);
            }

            // Structured expected salary re-sync
            if (profile.expectedSalary) {
                if (typeof profile.expectedSalary === 'object') {
                    setExpectedSalaryAmount(getSalaryDisplayAmount(profile.expectedSalary.amount));
                    const cId = getSafeCurrencyId(profile.expectedSalary.currency);
                    if (cId) setExpectedSalaryCurrency(cId);
                } else {
                    setExpectedSalaryAmount(getSalaryDisplayAmount(profile.expectedSalary));
                }
            } else {
                setExpectedSalaryAmount('');
            }

            // Structured current salary re-sync
            if (profile.currentSalary) {
                if (typeof profile.currentSalary === 'object') {
                    setCurrentSalaryAmount(getSalaryDisplayAmount(profile.currentSalary.amount));
                    const cId = getSafeCurrencyId(profile.currentSalary.currency);
                    if (cId) setCurrentSalaryCurrency(cId);
                } else {
                    setCurrentSalaryAmount(getSalaryDisplayAmount(profile.currentSalary));
                }
            } else {
                setCurrentSalaryAmount('');
            }

            // Resolve skills — if they contain raw ObjectIDs, resolve from API cache
            const rawSkills = profile.skills || [];
            const skillIdsList = (profile as any).skillIds as string[] | undefined;
            const hasRawSkillIds = rawSkills.some((s: string) => /^[0-9a-fA-F]{24}$/.test(s));
            if (hasRawSkillIds && skillIdsList && skillsData?.data) {
                const resolved = skillIdsList.map((id: string) => {
                    const match = skillsData.data.find((sd: any) => sd._id === id);
                    return match ? match.name : null;
                }).filter(Boolean) as string[];
                setSkills(resolved.length > 0 ? resolved : rawSkills);
            } else {
                setSkills(rawSkills);
            }
            setSelectedDomainIds(profile.preferredDomainIds || []);
            setSelectedLocationIds(profile.preferredLocationIds || []);
            setSelectedJobTypeIds(profile.preferredJobTypeIds || []);

            setGender(profile.gender || '');
            const rawDob = profile.dob || '';
            let displayDob = rawDob;
            if (rawDob && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDob)) {
                const d = new Date(rawDob);
                if (!isNaN(d.getTime())) {
                    const day = String(d.getUTCDate()).padStart(2, '0');
                    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                    displayDob = `${day}/${month}/${d.getUTCFullYear()}`;
                }
            }
            setDob(displayDob);
            const domainVal = typeof profile.domain === 'object' && profile.domain ? ((profile.domain as any)._id || (profile.domain as any).name || '') : (profile.domain || '');
            setDomain(domainVal);
            setCustomDomain(profile.customDomain || '');
            setCurrentLocation(profile.currentLocation || '');
            setHometown(profile.hometown || '');
            
            let reCountryName = '';
            let reCountryId = '';
            if (typeof profile.hometownCountry === 'object' && profile.hometownCountry) {
                reCountryName = (profile.hometownCountry as any).name || '';
                reCountryId = (profile.hometownCountry as any)._id || '';
            } else if (typeof profile.hometownCountry === 'string') {
                if (/^[0-9a-fA-F]{24}$/.test(profile.hometownCountry.trim())) {
                    reCountryId = profile.hometownCountry.trim();
                } else {
                    reCountryName = profile.hometownCountry.trim();
                }
            }
            if ((profile as any).hometownCountryId) {
                reCountryId = (profile as any).hometownCountryId;
            }
            setHometownCountry(reCountryName);
            setHometownCountryId(reCountryId);
            setLanguagesKnown(profile.languagesKnown || []);
            const loadedEduHistory = (profile.educationHistory || []).map((eh, i) => {
                if (i === 0 && !eh.schoolCollegeName && (profile as any)?.schoolCollegeName) {
                    return { ...eh, schoolCollegeName: (profile as any).schoolCollegeName, college: (profile as any).schoolCollegeName };
                }
                return eh;
            });
            setEducationHistory(loadedEduHistory);
            setEmploymentHistory(profile.employmentHistory || []);
            setCertifications(profile.certifications || []);
            setAwards(profile.awards || '');
            const savedProjects2 = (() => {
                try {
                    const raw = typeof window !== 'undefined' && user?.id ? localStorage.getItem(`squrx_projects_${user.id}`) : null;
                    return raw ? JSON.parse(raw) : null;
                } catch { return null; }
            })();
            const effectiveProjects2 = (Array.isArray(profile.projects) && profile.projects.length > 0)
                ? profile.projects
                : (Array.isArray(savedProjects2) && savedProjects2.length > 0 ? savedProjects2 : (profile.projects || []));
            setProjects(effectiveProjects2);
            const savedInternships2 = (() => {
                try {
                    const raw = typeof window !== 'undefined' && user?.id ? localStorage.getItem(`squrx_internships_${user.id}`) : null;
                    return raw ? JSON.parse(raw) : null;
                } catch { return null; }
            })();
            const effectiveInternships2 = (profile.internships && profile.internships.length > 0)
                ? profile.internships
                : (Array.isArray(savedInternships2) && savedInternships2.length > 0 ? savedInternships2 : (profile.internships || []));
            setInternships(effectiveInternships2);
            setProfileSummary(profile.profileSummary || '');
            if (Array.isArray(profile.otherAchievements)) {
                setOtherAchievements(profile.otherAchievements);
            } else if (typeof profile.otherAchievements === 'string' && (profile.otherAchievements as string).trim()) {
                setOtherAchievements([{ name: (profile.otherAchievements as string).trim(), link: '', description: '' }]);
            } else {
                setOtherAchievements([]);
            }
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
    const showToast = (msg: string, variant: 'success' | 'error' = 'success', title?: string) => {
        setToastMessage(msg);
        setToastVariant(variant);
        setToastTitle(title || (variant === 'success' ? 'Success' : 'Error'));
    };

    // ── Enter edit mode ───────────────────────────
    const enterEditMode = () => {
        setSaveSuccess(false);   // clear any stale success badge
        setFormErrors({});       // clear any stale validation errors
        clearSaveError();
        // Take a snapshot of the current form state for cancel
        setFormSnapshot({
            location, locationQuery, selectedLocationId,
            jobType, jobTypeQuery,
            careerGoal,
            domain,
            customDomain,
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
            hometownCountry,
            hometownCountryId,
            languagesKnown: languagesKnown ? [...languagesKnown.map(l => ({ ...l }))] : [],
            educationHistory: educationHistory ? [...educationHistory.map(eh => ({ ...eh }))] : [],
            employmentHistory: employmentHistory ? [...employmentHistory.map(e => ({ ...e }))] : [],
            certifications: certifications ? [...certifications.map(c => ({ ...c }))] : [],
            awards,
            projects: projects ? [...projects.map(p => ({ ...p }))] : [],
            internships: internships ? [...internships.map(i => ({ ...i }))] : [],
            profileSummary,
            otherAchievements: otherAchievements ? [...otherAchievements.map(o => ({ ...o }))] : [],
        });
        setIsEditing(true);
        if (careerGoal && !careerGoal.trim().endsWith(',')) {
            setCareerGoal(prev => prev.trim() + ', ');
        }
    };

    // ── Cancel edit ───────────────────────────────
    const handleCancel = () => {
        if (formSnapshot) {
            setLocation(formSnapshot.location);
            setLocationQuery(formSnapshot.locationQuery);
            setSelectedLocationId(formSnapshot.selectedLocationId);
            setJobType(formSnapshot.jobType);
            setJobTypeQuery(formSnapshot.jobTypeQuery);
            setCareerGoal(formSnapshot.careerGoal);
            setDomain(formSnapshot.domain);
            setCustomDomain(formSnapshot.customDomain);
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
            setHometownCountry(formSnapshot.hometownCountry);
            setHometownCountryId(formSnapshot.hometownCountryId || '');
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

                    if ((copy.education === 'other' || !educationsData?.data?.some((d: any) => d._id === copy.education)) && copy.customEducation?.trim()) {
                        try {
                            const res = await submitEducation({ name: copy.customEducation.trim() }).unwrap();
                            const resData = res?.data ?? res;
                            if (resData?._id) copy.education = resData._id;
                        } catch (err: any) {
                            console.warn('Could not submit custom degree:', err);
                        }
                    }

                    if ((copy.university === 'other' || !universitiesData?.data?.some((u: any) => u._id === copy.university)) && copy.customUniversity?.trim()) {
                        try {
                            const res = await submitUniversity({ name: copy.customUniversity.trim() }).unwrap();
                            const resData = res?.data ?? res;
                            if (resData?._id) copy.university = resData._id;
                        } catch (err: any) {
                            console.warn('Could not submit custom university:', err);
                        }
                    }

                    if (copy.schoolCollegeName?.trim()) {
                        if (copy.university && copy.university !== 'other') {
                            copy.customUniversity = copy.schoolCollegeName.trim();
                        }
                    }

                    if ((copy.course === 'other' || !coursesData?.data?.some((c: any) => c._id === copy.course)) && copy.customCourse?.trim()) {
                        try {
                            const res = await submitCourse({ name: copy.customCourse.trim() }).unwrap();
                            const resData = res?.data ?? res;
                            if (resData?._id) copy.course = resData._id;
                        } catch (err: any) {
                            console.warn('Could not submit custom course:', err);
                        }
                    }

                    if ((copy.specialization === 'other' || !specializationsData?.data?.some((s: any) => s._id === copy.specialization)) && copy.customSpecialization?.trim()) {
                        try {
                            const res = await submitSpecialization({ name: copy.customSpecialization.trim() }).unwrap();
                            const resData = res?.data ?? res;
                            if (resData?._id) copy.specialization = resData._id;
                        } catch (err: any) {
                            console.warn('Could not submit custom specialization:', err);
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
                    .map(l => {
                        const found = Array.from(locationMap.values()).find((ld: any) => ld.name.toLowerCase() === l.toLowerCase()) || locationsData?.data?.find((ld: any) => ld.name.toLowerCase() === l.toLowerCase());
                        return found?._id;
                    })
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

            const expMatch = experienceLevelsData?.data?.find((e: any) => e._id === experienceLevelId || e.name.toLowerCase() === experienceLevel.toLowerCase());
            const expId = experienceLevelId || expMatch?._id || (/^[0-9a-fA-F]{24}$/.test(experienceLevel) ? experienceLevel : undefined);

            const countryMatch = countriesData?.data?.find((c: any) => c._id === hometownCountryId || c.name.toLowerCase() === (typeof hometownCountry === 'string' ? hometownCountry.toLowerCase() : ''));
            const resolvedCountryId = hometownCountryId || countryMatch?._id || (typeof hometownCountry === 'string' && /^[0-9a-fA-F]{24}$/.test(hometownCountry.trim()) ? hometownCountry.trim() : undefined);

            const currentSalaryPayload = (currentSalaryAmount !== '' && !isNaN(Number(currentSalaryAmount))) ? {
                amount: Number(currentSalaryAmount),
                currency: currentSalaryCurrency || defaultCurrId
            } : null;

            await updateProfile(user.id, {
                location,
                jobType,
                careerGoal,
                domain: domain || undefined,
                customDomain: domain === 'other' ? (customDomain || undefined) : undefined,
                experienceLevel: expId,
                experienceLevelId: expId,
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
                hometownCountry: resolvedCountryId || undefined,
                hometownCountryId: resolvedCountryId || undefined,
                languagesKnown: languagesKnown.map(lk => ({
                    language: lk.language,
                    proficiency: lk.proficiency,
                    read: !!lk.read,
                    write: !!lk.write,
                    speak: !!lk.speak,
                    languageName: lk.languageName || '',
                    proficiencyName: lk.proficiencyName || ''
                })),
                educationHistory: processedEducationHistory,
                schoolCollegeName: processedEducationHistory[0]?.schoolCollegeName || (profile as any)?.schoolCollegeName || undefined,
                employmentHistory: employmentHistory.map(e => {
                    let salaryPayload: any = null;
                    if (e.currentSalary) {
                        if (typeof e.currentSalary === 'object') {
                            const salObj = e.currentSalary as any;
                            if (salObj && salObj.amount != null && salObj.amount !== '') {
                                const currId = typeof salObj.currency === 'object' && salObj.currency ? salObj.currency._id : salObj.currency;
                                salaryPayload = {
                                    amount: Number(salObj.amount),
                                    currency: currId || defaultCurrId
                                };
                            }
                        } else if (!isNaN(Number(e.currentSalary)) && String(e.currentSalary) !== '') {
                            salaryPayload = {
                                amount: Number(e.currentSalary),
                                currency: defaultCurrId
                            };
                        }
                    }
                    return {
                        employmentType: e.employmentType || '',
                        isCurrentEmployment: !!e.isCurrentEmployment,
                        totalExperienceYears: e.totalExperienceYears ? Number(e.totalExperienceYears) : undefined,
                        totalExperienceMonths: e.totalExperienceMonths ? Number(e.totalExperienceMonths) : undefined,
                        companyName: e.companyName || '',
                        jobTitle: e.jobTitle || '',
                        joiningDate: formatJoiningDatePayload(e.joiningDate),
                        currentSalary: salaryPayload,
                        skillsUsed: (Array.isArray(e.skillsUsed)
                            ? e.skillsUsed
                            : (typeof e.skillsUsed === 'string' ? (e.skillsUsed as string).split(',').map((s: string) => s.trim()).filter(Boolean) : [])
                        ).map((s: any) => {
                            const str = typeof s === 'object' && s ? (s._id || s.name) : String(s).trim();
                            if (/^[0-9a-fA-F]{24}$/.test(str)) return str;
                            const matched = skillsData?.data?.find((sd: any) => sd.name.toLowerCase() === str.toLowerCase());
                            return matched?._id || '';
                        }).filter((id: string) => /^[0-9a-fA-F]{24}$/.test(id)),
                        jobProfile: e.jobProfile || '',
                        noticePeriod: e.noticePeriod || ''
                    };
                }),
                certifications: certifications.map(c => ({
                    name: c.name || '',
                    status: isCertificationCompleted(c) ? 'Completed' : 'Undergoing',
                    doesNotExpire: !!c.doesNotExpire,
                    completionId: c.completionId || undefined,
                    url: c.url || undefined,
                    validFromMonth: c.validFromMonth ? Number(c.validFromMonth) : undefined,
                    validFromYear: c.validFromYear ? Number(c.validFromYear) : undefined,
                    validToMonth: c.doesNotExpire ? undefined : (c.validToMonth ? Number(c.validToMonth) : undefined),
                    validToYear: c.doesNotExpire ? undefined : (c.validToYear ? Number(c.validToYear) : undefined),
                })),
                awards,
                projects: projects.map(p => ({
                    title: p.title || '',
                    tag: p.tag || undefined,
                    client: p.client || undefined,
                    status: p.status === 'Completed' ? 'Completed' : 'Ongoing',
                    workedFromYear: p.workedFromYear ? Number(p.workedFromYear) : undefined,
                    workedFromMonth: p.workedFromMonth ? Number(p.workedFromMonth) : undefined,
                    workedTillYear: p.status === 'Ongoing' ? undefined : (p.workedTillYear ? Number(p.workedTillYear) : undefined),
                    workedTillMonth: p.status === 'Ongoing' ? undefined : (p.workedTillMonth ? Number(p.workedTillMonth) : undefined),
                    details: p.details || '',
                    location: p.location || undefined,
                    projectSite: p.projectSite || undefined,
                    natureOfEmployment: p.natureOfEmployment || undefined,
                    teamSize: p.teamSize || undefined,
                    role: p.role || undefined,
                    roleDescription: p.roleDescription || undefined,
                    skillsUsed: p.skillsUsed || undefined
                })),
                internships,
                profileSummary,
                otherAchievements: otherAchievements.filter(o => o.name?.trim()).map(o => ({
                    name: o.name.trim(),
                    link: o.link?.trim() || undefined,
                    description: o.description?.trim() || undefined
                })),
                cvUrl: profile?.cvUrl ?? null,
                resume: profile?.resume ?? null,
                cvName: profile?.cvName ?? null,
                resumeName: profile?.resumeName ?? null,
            });

            if (user?.id) {
                try {
                    localStorage.setItem(`squrx_internships_${user.id}`, JSON.stringify(internships));
                    localStorage.setItem(`squrx_projects_${user.id}`, JSON.stringify(projects));
                } catch {}
            }

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
        console.log('[StudentProfile] handleCVUpload triggered for file:', file.name, 'Size:', file.size, 'MIME:', file.type);
        if (file.size > 1 * 1024 * 1024) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            console.error(`[StudentProfile] CV file rejected: Size (${sizeMb}MB) exceeds 1MB server limit.`);
            showToast(`CV should be less than 1MB limit (selected: ${sizeMb}MB). Please upload a smaller file.`, 'error', 'Error');
            return;
        }
        const fileName = file.name;
        const lowerName = fileName.toLowerCase();
        // Backend accepts: .pdf, .doc, .docx
        const isValidExtension = lowerName.endsWith('.pdf') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!validTypes.includes(file.type) && !isValidExtension) {
            console.error('[StudentProfile] CV file rejected: Invalid MIME or extension.', file.type, fileName);
            showToast('Please upload a PDF or Word (DOC/DOCX) file', 'error');
            return;
        }
        if (!user) {
            console.error('[StudentProfile] CV upload aborted: No authenticated user');
            return;
        }

        setIsUploadingCV(true);
        try {
            console.log('[StudentProfile] Uploading resume file to consultationApi.uploadCv...');
            // Upload file to server POST /user/me/resume
            const resumeUrl = await consultationApi.uploadCv(file);
            console.log('[StudentProfile] Successfully uploaded to server, resumeUrl:', resumeUrl);
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
            console.log('[StudentProfile] Profile updated successfully with uploaded CV.');
            showToast('CV uploaded successfully.', 'success');
        } catch (err: any) {
            console.error('[StudentProfile] CV upload failed:', err);
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
        console.log('[StudentProfile] removeCV initiated for user:', user.id);
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
            console.log('[StudentProfile] removeCV succeeded, CV removed from profile.');
            if (cvInputRef.current) cvInputRef.current.value = '';
            if (cvReplaceInputRef.current) cvReplaceInputRef.current.value = '';
            showToast('CV removed successfully.', 'success');
            sendEmail('CV Removed', 'Your CV has been removed from your profile.');
        } catch (err: any) {
            console.error('[StudentProfile] removeCV failed:', err);
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
    const isFresher = (experienceLevel || '').toLowerCase().includes('fresher') ||
        (typeof profile?.experienceLevel === 'object' && profile?.experienceLevel ? (profile.experienceLevel as any).name : String(profile?.experienceLevel || '')).toLowerCase().includes('fresher');

    return (
        <PageTransition className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
                    <p className="text-muted-foreground mt-1">All information filled during signup is shown here. Edit and save to keep your profile up to date.</p>
                </div>
                {!isEditing ? (
                    <Button
                        type="button"
                        onClick={enterEditMode}
                        className="bg-black text-white hover:bg-black/90 font-semibold rounded-xl flex items-center gap-2 shadow-sm shrink-0 self-start sm:self-auto"
                    >
                        <Pencil className="w-4 h-4" /> Edit Profile
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="font-semibold rounded-xl border-border/80"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                const form = document.querySelector('form');
                                if (form) form.requestSubmit();
                            }}
                            disabled={isSaving}
                            className="bg-black text-white hover:bg-black/90 font-semibold rounded-xl flex items-center gap-2 shadow-sm"
                        >
                            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                        </Button>
                    </div>
                )}
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
                            : 'A complete profile is 4x more likely to be noticed. Add your key projects, internships, certifications, or achievements below to reach 100%.'
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
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Account Information</CardTitle>
                            {(profile as any)?.isVerified && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                </span>
                            )}
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
                                    <Input value={((profile as any).countryCode ? `${(profile as any).countryCode} ` : '') + (profile.mobile || user?.mobile || '')} disabled className="bg-muted/50 cursor-not-allowed border-border/40 text-muted-foreground font-medium h-11" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Editable profile form */}
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-base">Professional Details</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">Experience, career domain, and compensation</p>
                            </div>
                            {!isEditing ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={enterEditMode}
                                    className="flex items-center gap-1.5 text-xs font-semibold rounded-lg hover:bg-muted border-border/80"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Edit Details
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancel}
                                        disabled={isSaving}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={(e) => {
                                            const form = (e.currentTarget.closest('.bg-card')?.querySelector('form') as HTMLFormElement);
                                            if (form) form.requestSubmit();
                                        }}
                                        disabled={isSaving}
                                        className="bg-black text-white hover:bg-black/90 text-xs font-semibold rounded-lg px-3 shadow-sm"
                                    >
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            )}
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
                                        {isEditing ? (
                                            <select
                                                value={experienceLevelId || (() => {
                                                    const match = experienceLevelsData?.data?.find((el: any) => el.name.toLowerCase() === experienceLevel.toLowerCase());
                                                    return match?._id || '';
                                                })()}
                                                onChange={(e) => {
                                                    const selId = e.target.value;
                                                    setExperienceLevelId(selId);
                                                    const found = experienceLevelsData?.data?.find((el: any) => el._id === selId);
                                                    setExperienceLevel(found?.name || '');
                                                    setExperienceLevelQuery(found?.name === 'Fresher' ? 'Fresher' : (found ? `${found.name} Years` : ''));
                                                }}
                                                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-medium cursor-pointer"
                                            >
                                                <option value="">Select Experience Level</option>
                                                {experienceLevelsData?.data?.map((el: any) => (
                                                    <option key={el._id} value={el._id}>
                                                        {el.name === 'Fresher' || el.name.includes('Years') ? el.name : `${el.name} Years`}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Input
                                                value={
                                                    (experienceLevelId && experienceLevelsData?.data?.find((el: any) => el._id === experienceLevelId) ? (
                                                        experienceLevelsData.data.find((el: any) => el._id === experienceLevelId).name === 'Fresher'
                                                            ? 'Fresher'
                                                            : `${experienceLevelsData.data.find((el: any) => el._id === experienceLevelId).name} Years`
                                                    ) : '') ||
                                                    experienceLevelQuery ||
                                                    (experienceLevel ? (experienceLevel === 'Fresher' || experienceLevel.includes('Years') ? experienceLevel : `${experienceLevel} Years`) : '') ||
                                                    '—'
                                                }
                                                disabled
                                                className="h-11 bg-muted/30 border-border/40 text-muted-foreground font-medium cursor-not-allowed"
                                            />
                                        )}
                                    </div>

                                    {/* Current Salary (Annual) */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                            <span>Current Salary (Annual)</span>
                                            {experienceLevel === 'Fresher' && (
                                                <span className="text-[10px] text-muted-foreground font-normal lowercase">(fillable for freshers)</span>
                                            )}
                                        </label>
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
                                                placeholder={isEditing ? (experienceLevel === 'Fresher' ? "e.g. 0 or stipend / salary" : "e.g. 1200000") : (experienceLevel === 'Fresher' ? "Fresher / None" : "Not specified")}
                                                value={currentSalaryAmount}
                                                onChange={e => setCurrentSalaryAmount(e.target.value)}
                                                disabled={!isEditing}
                                                className="h-11 flex-1"
                                            />
                                        </div>
                                        {!isEditing && !currentSalaryAmount && experienceLevel !== 'Fresher' && (
                                            <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-1">
                                                <span>⚠️ Current salary not specified — click Edit to add it.</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Expected Salary (Annual) */}
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
                                        {isEditing && showLocationSuggestions && locationMap.size > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 flex flex-col gap-0.5 bg-white">
                                                {Array.from(locationMap.values())
                                                    .filter((l: any) => {
                                                        const label = getLocationLabel(l);
                                                        if (!label) return false;
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
                                                                    const selectedNames = nextIds
                                                                        .map(xId => {
                                                                            const obj = locationMap.get(xId);
                                                                            return obj ? getLocationLabel(obj) : '';
                                                                        })
                                                                        .filter(Boolean);
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
                                                    const locObj = locationMap.get(id) || allLocationsData?.data?.find((l: any) => l._id === id) || locationsData?.data?.find((l: any) => l._id === id);
                                                    let name = locObj ? getLocationLabel(locObj) : '';
                                                    if (!name && profile?.locations) {
                                                        const idx = selectedLocationIds.indexOf(id);
                                                        const cand = profile.locations[idx] || (selectedLocationIds.length === 1 ? profile.location : '');
                                                        if (cand && !/^[0-9a-fA-F]{24}$/.test(cand)) {
                                                            name = cand;
                                                        }
                                                    }
                                                    // NEVER display raw 24-character hexadecimal ObjectId
                                                    if (!name || /^[0-9a-fA-F]{24}$/.test(name)) {
                                                        return null;
                                                    }
                                                    return (
                                                        <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-muted/50 text-foreground font-semibold py-1">
                                                            {name}
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextIds = selectedLocationIds.filter(x => x !== id);
                                                                        setSelectedLocationIds(nextIds);
                                                                        const selectedNames = nextIds
                                                                            .map(xId => {
                                                                                const obj = locationMap.get(xId);
                                                                                return obj ? getLocationLabel(obj) : '';
                                                                            })
                                                                            .filter(Boolean);
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
                                                    const match = jobTypesData?.data?.find((jt: any) => jt._id === id);
                                                    let name = match?.name || '';
                                                    if (!name && profile?.jobTypes) {
                                                        const idx = selectedJobTypeIds.indexOf(id);
                                                        const cand = profile.jobTypes[idx] || (selectedJobTypeIds.length === 1 ? profile.jobType : '');
                                                        if (cand && !/^[0-9a-fA-F]{24}$/.test(cand)) {
                                                            name = cand;
                                                        }
                                                    }
                                                    // NEVER display raw 24-character hexadecimal ObjectId
                                                    if (!name || /^[0-9a-fA-F]{24}$/.test(name)) return null;
                                                    return (
                                                        <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-muted/50 text-foreground font-semibold py-1">
                                                            {name}
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextIds = selectedJobTypeIds.filter(x => x !== id);
                                                                        setSelectedJobTypeIds(nextIds);
                                                                        const selectedNames = nextIds
                                                                            .map(xId => jobTypesData?.data?.find((x: any) => x._id === xId)?.name)
                                                                            .filter(Boolean);
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
                                            onFocus={() => {
                                                setShowDomainSuggestions(true);
                                                if (careerGoal && !careerGoal.trim().endsWith(',')) {
                                                    setCareerGoal(prev => prev.trim() + ', ');
                                                }
                                            }}
                                            onClick={() => {
                                                setShowDomainSuggestions(true);
                                                if (careerGoal && !careerGoal.trim().endsWith(',')) {
                                                    setCareerGoal(prev => prev.trim() + ', ');
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => setShowDomainSuggestions(false), 200)}
                                            disabled={!isEditing}
                                            className={`h-11 ${formErrors.careerGoal ? 'border-destructive' : ''}`}
                                        />
                                        {isEditing && showDomainSuggestions && domainsData?.data && domainsData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-2 flex flex-wrap gap-1.5 bg-white">
                                                {domainsData.data
                                                    .filter((d: any) => {
                                                        const lastPart = careerGoal.split(',').pop()?.trim() || '';
                                                        return d.name.toLowerCase().includes(lastPart.toLowerCase());
                                                    })
                                                    .slice(0, 15)
                                                    .map((d: any) => {
                                                        const selectedNames = careerGoal.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
                                                        const isAlreadySelected = selectedNames.includes(d.name.toLowerCase());
                                                        return (
                                                            <button
                                                                key={d._id}
                                                                type="button"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault(); // Prevent input blur
                                                                    const parts = careerGoal.split(',').map(p => p.trim()).filter(Boolean);
                                                                    const lastQuery = careerGoal.split(',').pop()?.trim().toLowerCase() || '';

                                                                    if (lastQuery && parts.length > 0 && parts[parts.length - 1].toLowerCase().includes(lastQuery)) {
                                                                        parts[parts.length - 1] = d.name;
                                                                    } else if (!parts.map(x => x.toLowerCase()).includes(d.name.toLowerCase())) {
                                                                        parts.push(d.name);
                                                                    }

                                                                    setCareerGoal(parts.join(', ') + ', ');
                                                                    setShowDomainSuggestions(true);
                                                                    if (!selectedDomainIds.includes(d._id)) {
                                                                        setSelectedDomainIds([...selectedDomainIds, d._id]);
                                                                    }
                                                                }}
                                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                                                    isAlreadySelected
                                                                        ? 'bg-primary text-primary-foreground opacity-60 cursor-default'
                                                                        : 'bg-muted hover:bg-black hover:text-white'
                                                                }`}
                                                            >
                                                                {isAlreadySelected ? `✓ ${d.name}` : `+ ${d.name}`}
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                        {/* Selected Domain Chips */}
                                        {careerGoal.split(',').map(d => d.trim()).filter(d => Boolean(d) && !/^[0-9a-fA-F]{24}$/.test(d)).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {careerGoal.split(',').map(d => d.trim()).filter(d => Boolean(d) && !/^[0-9a-fA-F]{24}$/.test(d)).map((domainName, idx) => (
                                                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 bg-muted/50 text-foreground font-semibold py-1">
                                                        {domainName}
                                                        {isEditing && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const remaining = careerGoal.split(',').map(d => d.trim()).filter(Boolean).filter((_, i) => i !== idx);
                                                                    setCareerGoal(remaining.length > 0 ? remaining.join(', ') + ', ' : '');
                                                                    const domMatch = domainsData?.data?.find((x: any) => x.name.toLowerCase() === domainName.toLowerCase());
                                                                    if (domMatch) {
                                                                        setSelectedDomainIds(selectedDomainIds.filter(id => id !== domMatch._id));
                                                                    }
                                                                }}
                                                                className="hover:text-destructive rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] ml-0.5 cursor-pointer font-bold"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        {formErrors.careerGoal && <p className="text-destructive text-xs">{formErrors.careerGoal}</p>}
                                    </div>

                                    {/* Primary Domain */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primary Domain</label>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <select
                                                    value={domain}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDomain(val);
                                                        if (val !== 'other') {
                                                            setCustomDomain('');
                                                        }
                                                    }}
                                                    className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-medium"
                                                >
                                                    <option value="">Select Primary Domain</option>
                                                    {domainsData?.data?.map((d: any) => (
                                                        <option key={d._id} value={d._id}>{d.name}</option>
                                                    ))}
                                                    <option value="other">Other (Custom Domain)</option>
                                                </select>
                                                {domain === 'other' && (
                                                    <Input
                                                        placeholder="Enter custom domain name"
                                                        value={customDomain}
                                                        onChange={(e) => setCustomDomain(e.target.value)}
                                                        className="h-10 text-sm"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-11 px-3 py-2.5 rounded-md border border-border/40 bg-muted/20 text-sm font-medium flex items-center">
                                                {(() => {
                                                    if (domain === 'other' || profile?.domain === 'other') {
                                                        return customDomain || profile?.customDomain || 'Other';
                                                    }
                                                    const rawDomain = profile?.domain;
                                                    const profDomainStr = typeof rawDomain === 'object' && rawDomain ? ((rawDomain as any)._id || (rawDomain as any).name || '') : (rawDomain || '');
                                                    const dId = domain || profDomainStr;
                                                    const match = domainsData?.data?.find((d: any) => d._id === dId || d.name === dId);
                                                    if (match) return match.name;
                                                    if (dId && !/^[0-9a-fA-F]{24}$/.test(dId)) return dId;
                                                    return <span className="text-muted-foreground italic">Not specified</span>;
                                                })()}
                                            </div>
                                        )}
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
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hometown / Native Place</label>
                                            <Input
                                                placeholder="e.g. Mumbai"
                                                value={hometown}
                                                onChange={(e) => setHometown(e.target.value)}
                                                disabled={!isEditing}
                                                className={`h-11 ${!isEditing ? 'bg-muted/30 border-border/40 text-muted-foreground cursor-not-allowed' : ''}`}
                                            />
                                        </div>

                                        {/* Hometown Country */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hometown Country</label>
                                            {isEditing ? (
                                                <select
                                                    value={hometownCountryId || (() => {
                                                        const match = countriesData?.data?.find((c: any) => c.name.toLowerCase() === (typeof hometownCountry === 'string' ? hometownCountry.toLowerCase() : ''));
                                                        return match?._id || '';
                                                    })()}
                                                    onChange={(e) => {
                                                        const selId = e.target.value;
                                                        setHometownCountryId(selId);
                                                        const match = countriesData?.data?.find((c: any) => c._id === selId);
                                                        setHometownCountry(match?.name || '');
                                                    }}
                                                    className="w-full h-11 bg-background border border-input focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-md px-3 text-sm font-medium outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="">Select Country</option>
                                                    {countriesData?.data?.map((c: any) => (
                                                        <option key={c._id || c.name} value={c._id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <Input
                                                    placeholder="e.g. India"
                                                    value={
                                                        (typeof hometownCountry === 'object' && hometownCountry ? (hometownCountry as any).name : (
                                                            (hometownCountry && !/^[0-9a-fA-F]{24}$/.test(hometownCountry)) ? hometownCountry : (
                                                                (hometownCountryId || hometownCountry) && countriesData?.data?.find((c: any) => c._id === (hometownCountryId || hometownCountry))?.name
                                                            )
                                                        )) ||
                                                        '—'
                                                    }
                                                    disabled
                                                    className="h-11 bg-muted/30 border-border/40 text-muted-foreground font-medium cursor-not-allowed"
                                                />
                                            )}
                                        </div>

                                        {/* Languages Known — array of { language, proficiency, read, write, speak } per backend spec */}
                                        <div className="space-y-2 sm:col-span-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Languages Known</label>
                                                {isEditing && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => setLanguagesKnown([...languagesKnown, { language: '', languageName: '', proficiency: '', proficiencyName: '', read: true, write: true, speak: true }])}
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
                                                        <div key={idx} className="bg-muted/20 p-3 rounded-xl border border-border/40 space-y-2">
                                                            {isEditing ? (
                                                                <>
                                                                    <div className="flex gap-2 items-center">
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
                                                                            <option value="">Select Language *</option>
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
                                                                            <option value="">Proficiency Level *</option>
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
                                                                    </div>
                                                                    <div className="flex gap-4 items-center pl-1 text-xs">
                                                                        <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={lk.read ?? false}
                                                                                onChange={(e) => {
                                                                                    const c = [...languagesKnown];
                                                                                    c[idx] = { ...c[idx], read: e.target.checked };
                                                                                    setLanguagesKnown(c);
                                                                                }}
                                                                                className="rounded border-gray-300 w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                                                                            />
                                                                            Read
                                                                        </label>
                                                                        <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={lk.write ?? false}
                                                                                onChange={(e) => {
                                                                                    const c = [...languagesKnown];
                                                                                    c[idx] = { ...c[idx], write: e.target.checked };
                                                                                    setLanguagesKnown(c);
                                                                                }}
                                                                                className="rounded border-gray-300 w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                                                                            />
                                                                            Write
                                                                        </label>
                                                                        <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={lk.speak ?? false}
                                                                                onChange={(e) => {
                                                                                    const c = [...languagesKnown];
                                                                                    c[idx] = { ...c[idx], speak: e.target.checked };
                                                                                    setLanguagesKnown(c);
                                                                                }}
                                                                                className="rounded border-gray-300 w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                                                                            />
                                                                            Speak
                                                                        </label>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col gap-1 w-full">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-semibold">
                                                                            {languagesData?.data?.find((l: any) => l._id === lk.language)?.name || lk.languageName || (/^[0-9a-fA-F]{24}$/.test(lk.language) ? '' : lk.language) || '—'}
                                                                        </span>
                                                                        {(() => {
                                                                            const pLabel = languageProficienciesData?.data?.find((p: any) => p._id === lk.proficiency)?.name || lk.proficiencyName || (/^[0-9a-fA-F]{24}$/.test(lk.proficiency) ? '' : lk.proficiency);
                                                                            return pLabel ? (
                                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-semibold text-muted-foreground">{pLabel}</span>
                                                                            ) : null;
                                                                        })()}
                                                                    </div>
                                                                    <div className="flex gap-2 text-[11px] text-muted-foreground font-medium">
                                                                        {lk.read && <span className="bg-muted/50 px-1.5 py-0.5 rounded">Read</span>}
                                                                        {lk.write && <span className="bg-muted/50 px-1.5 py-0.5 rounded">Write</span>}
                                                                        {lk.speak && <span className="bg-muted/50 px-1.5 py-0.5 rounded">Speak</span>}
                                                                    </div>
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
                                                    courseType: 'Full Time',
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
                                                const matchedDegree = educationsData?.data?.find((d: any) => d._id === item.education)?.name;
                                                const degreeName = item.education === 'other'
                                                    ? (item.customEducation || 'Custom Degree')
                                                    : (matchedDegree || item.customEducation || (!isHexId(item.education) && item.education !== 'other' ? item.education : '') || '—');

                                                const matchedUni = universitiesData?.data?.find((u: any) => u._id === item.university)?.name;
                                                const uniName = item.university === 'other'
                                                    ? (item.customUniversity || 'Custom University')
                                                    : (matchedUni || item.customUniversity || (!isHexId(item.university) && item.university !== 'other' ? item.university : '') || '—');

                                                const matchedCourse = coursesData?.data?.find((c: any) => c._id === item.course)?.name;
                                                const courseName = item.course === 'other'
                                                    ? (item.customCourse || 'Custom Course')
                                                    : (matchedCourse || item.customCourse || (!isHexId(item.course) && item.course !== 'other' ? item.course : ''));

                                                const matchedSpec = specializationsData?.data?.find((s: any) => s._id === item.specialization)?.name;
                                                const specName = item.specialization === 'other'
                                                    ? (item.customSpecialization || 'Custom Specialization')
                                                    : (matchedSpec || item.customSpecialization || (!isHexId(item.specialization) && item.specialization !== 'other' ? item.specialization : ''));

                                                return (
                                                    <div key={idx} className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-3">
                                                        {isEditing ? (
                                                            <>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    {/* Degree */}
                                                                    {(() => {
                                                                        const isKnownDegree = educationsData?.data?.some((d: any) => d._id === item.education);
                                                                        const isCustomDegree = !isKnownDegree && (item.education === 'other' || Boolean(item.customEducation) || isHexId(item.education));
                                                                        const selectDegreeVal = isKnownDegree ? item.education : (isCustomDegree ? 'other' : (item.education || ''));

                                                                        return (
                                                                            <div className="space-y-1">
                                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Degree</label>
                                                                                <select
                                                                                    value={selectDegreeVal}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        const copy = [...educationHistory];
                                                                                        copy[idx] = {
                                                                                            ...copy[idx],
                                                                                            education: val,
                                                                                            customEducation: val === 'other' ? (copy[idx].customEducation || '') : ''
                                                                                        };
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
                                                                                {(selectDegreeVal === 'other' || isCustomDegree) && (
                                                                                    <Input
                                                                                        placeholder="Enter Custom Degree"
                                                                                        value={item.customEducation || ''}
                                                                                        onChange={(e) => {
                                                                                            const copy = [...educationHistory];
                                                                                            copy[idx] = { ...copy[idx], education: 'other', customEducation: e.target.value };
                                                                                            setEducationHistory(copy);
                                                                                        }}
                                                                                        className="h-8 mt-1 text-xs"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* Course */}
                                                                    {(() => {
                                                                        const isKnownCourse = coursesData?.data?.some((c: any) => c._id === item.course);
                                                                        const isCustomCourse = !isKnownCourse && (item.course === 'other' || Boolean(item.customCourse) || isHexId(item.course));
                                                                        const selectCourseVal = isKnownCourse ? item.course : (isCustomCourse ? 'other' : (item.course || ''));

                                                                        return (
                                                                            <div className="space-y-1">
                                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Course</label>
                                                                                <select
                                                                                    value={selectCourseVal}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        const copy = [...educationHistory];
                                                                                        copy[idx] = {
                                                                                            ...copy[idx],
                                                                                            course: val,
                                                                                            customCourse: val === 'other' ? (copy[idx].customCourse || '') : ''
                                                                                        };
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
                                                                                {(selectCourseVal === 'other' || isCustomCourse) && (
                                                                                    <Input
                                                                                        placeholder="Enter Custom Course"
                                                                                        value={item.customCourse || ''}
                                                                                        onChange={(e) => {
                                                                                            const copy = [...educationHistory];
                                                                                            copy[idx] = { ...copy[idx], course: 'other', customCourse: e.target.value };
                                                                                            setEducationHistory(copy);
                                                                                        }}
                                                                                        className="h-8 mt-1 text-xs"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* Specialization */}
                                                                    {(() => {
                                                                        const isKnownSpec = specializationsData?.data?.some((s: any) => s._id === item.specialization);
                                                                        const isCustomSpec = !isKnownSpec && (item.specialization === 'other' || Boolean(item.customSpecialization) || isHexId(item.specialization));
                                                                        const selectSpecVal = isKnownSpec ? item.specialization : (isCustomSpec ? 'other' : (item.specialization || ''));

                                                                        return (
                                                                            <div className="space-y-1">
                                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Specialization</label>
                                                                                <select
                                                                                    value={selectSpecVal}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        const copy = [...educationHistory];
                                                                                        copy[idx] = {
                                                                                            ...copy[idx],
                                                                                            specialization: val,
                                                                                            customSpecialization: val === 'other' ? (copy[idx].customSpecialization || '') : ''
                                                                                        };
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
                                                                                {(selectSpecVal === 'other' || isCustomSpec) && (
                                                                                    <Input
                                                                                        placeholder="Enter Custom Specialization"
                                                                                        value={item.customSpecialization || ''}
                                                                                        onChange={(e) => {
                                                                                            const copy = [...educationHistory];
                                                                                            copy[idx] = { ...copy[idx], specialization: 'other', customSpecialization: e.target.value };
                                                                                            setEducationHistory(copy);
                                                                                        }}
                                                                                        className="h-8 mt-1 text-xs"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* University */}
                                                                    {(() => {
                                                                        const isKnownUni = universitiesData?.data?.some((u: any) => u._id === item.university);
                                                                        const isCustomUni = !isKnownUni && (item.university === 'other' || (Boolean(item.customUniversity) && item.customUniversity !== item.schoolCollegeName) || isHexId(item.university));
                                                                        const selectUniVal = isKnownUni ? item.university : (isCustomUni ? 'other' : (item.university || ''));

                                                                        return (
                                                                            <div className="space-y-1">
                                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">University</label>
                                                                                <select
                                                                                    value={selectUniVal}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        const copy = [...educationHistory];
                                                                                        copy[idx] = {
                                                                                            ...copy[idx],
                                                                                            university: val,
                                                                                            customUniversity: val === 'other' ? (copy[idx].customUniversity || '') : copy[idx].customUniversity
                                                                                        };
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
                                                                                {(selectUniVal === 'other' || isCustomUni) && (
                                                                                    <Input
                                                                                        placeholder="Enter Custom University"
                                                                                        value={item.customUniversity || ''}
                                                                                        onChange={(e) => {
                                                                                            const copy = [...educationHistory];
                                                                                            copy[idx] = { ...copy[idx], university: 'other', customUniversity: e.target.value };
                                                                                            setEducationHistory(copy);
                                                                                        }}
                                                                                        className="h-8 mt-1 text-xs"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* School / College Name */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">School / College Name</label>
                                                                        <Input
                                                                            placeholder="e.g. St. Francis College"
                                                                            value={item.schoolCollegeName || item.college || (item.customUniversity && item.customUniversity !== uniName ? item.customUniversity : '') || (idx === 0 ? (profile as any)?.schoolCollegeName : '') || ''}
                                                                            onChange={(e) => {
                                                                                const copy = [...educationHistory];
                                                                                copy[idx] = {
                                                                                    ...copy[idx],
                                                                                    schoolCollegeName: e.target.value,
                                                                                    college: e.target.value,
                                                                                    customUniversity: (copy[idx].university && copy[idx].university !== 'other') ? e.target.value : copy[idx].customUniversity
                                                                                };
                                                                                setEducationHistory(copy);
                                                                            }}
                                                                            className="h-9 text-xs"
                                                                        />
                                                                    </div>

                                                                    {/* Course Type */}
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Course Type</label>
                                                                        <select
                                                                            value={item.courseType || 'Full Time'}
                                                                            onChange={(e) => {
                                                                                const copy = [...educationHistory];
                                                                                copy[idx] = { ...copy[idx], courseType: e.target.value };
                                                                                setEducationHistory(copy);
                                                                            }}
                                                                            className="w-full h-9 bg-background border border-input rounded-md px-2 text-xs font-medium outline-none"
                                                                        >
                                                                            <option value="Full Time">Full Time</option>
                                                                            <option value="Part Time">Part Time</option>
                                                                            <option value="Distance Learning">Distance Learning</option>
                                                                            <option value="Correspondence">Correspondence</option>
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
                                                                    {item.startYear && item.endYear ? (
                                                                        <span className="text-xs font-medium text-muted-foreground">{item.startYear} - {item.endYear}</span>
                                                                    ) : (item.endYear || item.passingYear || item.startYear) ? (
                                                                        <span className="text-xs font-medium text-muted-foreground">{item.endYear || item.passingYear || item.startYear}</span>
                                                                    ) : null}
                                                                </div>
                                                                {((courseName && courseName !== '—') || (specName && specName !== '—')) && (
                                                                    <span className="text-xs text-foreground font-medium">
                                                                        {courseName && courseName !== '—' ? courseName : ''}
                                                                        {specName && specName !== '—' ? (courseName && courseName !== '—' ? ` · ${specName}` : specName) : ''}
                                                                    </span>
                                                                )}
                                                                {(() => {
                                                                    const collegeVal = item.schoolCollegeName || item.college || item.institute || (item.customUniversity && item.customUniversity !== uniName ? item.customUniversity : '') || (idx === 0 ? (profile as any)?.schoolCollegeName : '');
                                                                    return (
                                                                        <div className="flex flex-col">
                                                                            {collegeVal && (
                                                                                <span className="text-xs font-semibold text-foreground">{collegeVal}</span>
                                                                            )}
                                                                            {uniName && uniName !== '—' && (
                                                                                <span className="text-xs text-muted-foreground">{uniName}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                                                    <span>Course Type: <span className="font-semibold text-foreground">{item.courseType || 'Full Time'}</span></span>
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
                                                onClick={() => setEmploymentHistory([...employmentHistory, {
                                                    employmentType: '',
                                                    companyName: '',
                                                    jobTitle: '',
                                                    joiningDate: '',
                                                    isCurrentEmployment: false,
                                                    totalExperienceYears: undefined,
                                                    totalExperienceMonths: undefined,
                                                    currentSalary: '',
                                                    noticePeriod: '',
                                                    jobProfile: ''
                                                }])}
                                                variant="outline"
                                                className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                            >
                                                + Add Employment
                                            </Button>
                                        )}
                                    </div>
                                    {employmentHistory.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">
                                            {isFresher
                                                ? (isEditing ? 'Fresher candidate (employment history optional). Click + Add Employment if you have prior work experience.' : 'Not applicable for Freshers.')
                                                : (isEditing ? 'No employment history added. Click + Add Employment to get started.' : 'No employment history listed.')}
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {employmentHistory.map((emp, idx) => {
                                                const empTypeName = jobTypesData?.data?.find((jt: any) => jt._id === emp.employmentType)?.name || (!isHexId(emp.employmentType) ? emp.employmentType : '') || '';
                                                return (
                                                    <div key={idx} className="bg-muted/20 p-3.5 rounded-xl border border-border/40 space-y-2.5">
                                                        {isEditing ? (
                                                            <>
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                    {/* Employment Type (required JobType lookup) */}
                                                                    <select
                                                                        value={emp.employmentType || ''}
                                                                        onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], employmentType: e.target.value }; setEmploymentHistory(c); }}
                                                                        className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-medium"
                                                                    >
                                                                        <option value="">Select Employment Type *</option>
                                                                        {jobTypesData?.data?.map((jt: any) => (
                                                                            <option key={jt._id} value={jt._id}>{jt.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <Input
                                                                        placeholder="Company Name"
                                                                        value={emp.companyName || ''}
                                                                        onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], companyName: e.target.value }; setEmploymentHistory(c); }}
                                                                        className="h-9 rounded-lg text-sm"
                                                                    />
                                                                    <Input
                                                                        placeholder="Job Title / Role"
                                                                        value={emp.jobTitle || ''}
                                                                        onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], jobTitle: e.target.value }; setEmploymentHistory(c); }}
                                                                        className="h-9 rounded-lg text-sm"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                    <Input
                                                                        type="date"
                                                                        title="Joining Date"
                                                                        value={toDateInputValue(emp.joiningDate)}
                                                                        onClick={(e) => {
                                                                            try {
                                                                                (e.target as HTMLInputElement).showPicker?.();
                                                                            } catch {}
                                                                        }}
                                                                        onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], joiningDate: e.target.value }; setEmploymentHistory(c); }}
                                                                        className="h-9 rounded-lg text-sm cursor-pointer"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="Total Exp (Years)"
                                                                        value={emp.totalExperienceYears != null ? String(emp.totalExperienceYears) : ''}
                                                                        onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], totalExperienceYears: e.target.value ? Number(e.target.value) : undefined }; setEmploymentHistory(c); }}
                                                                        className="h-9 rounded-lg text-sm"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="Total Exp (Months)"
                                                                        value={emp.totalExperienceMonths != null ? String(emp.totalExperienceMonths) : ''}
                                                                        onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], totalExperienceMonths: e.target.value ? Number(e.target.value) : undefined }; setEmploymentHistory(c); }}
                                                                        className="h-9 rounded-lg text-sm"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    <div className="flex gap-2">
                                                                        <select
                                                                            value={typeof emp.currentSalary === 'object' && emp.currentSalary 
                                                                                ? (typeof emp.currentSalary.currency === 'object' && emp.currentSalary.currency ? emp.currentSalary.currency._id : String(emp.currentSalary.currency || ''))
                                                                                : ''}
                                                                            onChange={(e) => {
                                                                                const c = [...employmentHistory];
                                                                                const prevAmt = typeof c[idx].currentSalary === 'object' && c[idx].currentSalary ? c[idx].currentSalary.amount : c[idx].currentSalary;
                                                                                c[idx] = { 
                                                                                    ...c[idx], 
                                                                                    currentSalary: { 
                                                                                        amount: prevAmt != null && prevAmt !== '' ? Number(prevAmt) : null, 
                                                                                        currency: e.target.value 
                                                                                    } 
                                                                                };
                                                                                setEmploymentHistory(c);
                                                                            }}
                                                                            className="h-9 w-24 bg-background border border-input rounded-lg px-2 text-xs font-semibold outline-none focus:border-ring shrink-0"
                                                                        >
                                                                            <option value="">Currency</option>
                                                                            {currenciesData?.data?.map((curr: any) => (
                                                                                <option key={curr._id} value={curr._id}>{curr.code} ({curr.symbol})</option>
                                                                            ))}
                                                                        </select>
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="Current Salary (e.g. 50000)"
                                                                            value={typeof emp.currentSalary === 'object' && emp.currentSalary 
                                                                                ? (emp.currentSalary.amount != null ? String(emp.currentSalary.amount) : '')
                                                                                : (emp.currentSalary || '')}
                                                                            onChange={(e) => {
                                                                                const c = [...employmentHistory];
                                                                                const prevCurr = typeof c[idx].currentSalary === 'object' && c[idx].currentSalary 
                                                                                    ? (typeof c[idx].currentSalary.currency === 'object' && c[idx].currentSalary.currency ? c[idx].currentSalary.currency._id : c[idx].currentSalary.currency)
                                                                                    : (currenciesData?.data?.[0]?._id || '');
                                                                                c[idx] = { 
                                                                                    ...c[idx], 
                                                                                    currentSalary: { 
                                                                                        amount: e.target.value ? Number(e.target.value) : null, 
                                                                                        currency: prevCurr || (currenciesData?.data?.[0]?._id || '')
                                                                                    } 
                                                                                };
                                                                                setEmploymentHistory(c);
                                                                            }}
                                                                            className="h-9 rounded-lg text-sm flex-1"
                                                                        />
                                                                    </div>
                                                                    <Input
                                                                        placeholder="Notice Period (e.g. 1 Month)"
                                                                        value={emp.noticePeriod || ''}
                                                                        onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], noticePeriod: e.target.value }; setEmploymentHistory(c); }}
                                                                        className="h-9 rounded-lg text-sm"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`emp-current-${idx}`}
                                                                        checked={!!emp.isCurrentEmployment}
                                                                        onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], isCurrentEmployment: e.target.checked }; setEmploymentHistory(c); }}
                                                                        className="rounded border-gray-300 w-4 h-4 cursor-pointer"
                                                                    />
                                                                    <label htmlFor={`emp-current-${idx}`} className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">Current Employment</label>
                                                                </div>
                                                                <textarea
                                                                    placeholder="Job Profile / Description of responsibilities..."
                                                                    value={emp.jobProfile || ''}
                                                                    onChange={(e) => { const c = [...employmentHistory]; c[idx] = { ...c[idx], jobProfile: e.target.value }; setEmploymentHistory(c); }}
                                                                    rows={2}
                                                                    className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-all resize-none bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                                />
                                                                <div>
                                                                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Key Skills Used (comma-separated)</label>
                                                                    <Input
                                                                        placeholder="e.g. React, Node.js, SQL"
                                                                        value={Array.isArray(emp.skillsUsed)
                                                                            ? emp.skillsUsed.map((s: any) => {
                                                                                if (typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s)) {
                                                                                    return skillsData?.data?.find((sk: any) => sk._id === s)?.name || s;
                                                                                }
                                                                                return typeof s === 'object' && s ? (s.name || s._id) : String(s);
                                                                            }).join(', ')
                                                                            : (emp.skillsUsed || '')}
                                                                        onChange={(e) => {
                                                                            const c = [...employmentHistory];
                                                                            c[idx] = {
                                                                                ...c[idx],
                                                                                skillsUsed: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                                            };
                                                                            setEmploymentHistory(c);
                                                                        }}
                                                                        className="h-9 rounded-lg text-sm"
                                                                    />
                                                                </div>
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
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-semibold">{emp.companyName || '—'}</span>
                                                                    {emp.isCurrentEmployment && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">Current</span>}
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                    {emp.jobTitle && <span className="font-medium text-foreground">{emp.jobTitle}</span>}
                                                                    {empTypeName && <span className="px-1.5 py-0.5 rounded bg-muted font-semibold">{empTypeName}</span>}
                                                                    {emp.joiningDate && <span>Joined: {formatJoiningDateDisplay(emp.joiningDate)}</span>}
                                                                </div>
                                                                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-0.5">
                                                                    {(emp.totalExperienceYears != null || emp.totalExperienceMonths != null) && (
                                                                        <span>Experience: {emp.totalExperienceYears || 0} yrs {emp.totalExperienceMonths || 0} mos</span>
                                                                    )}
                                                                    {emp.noticePeriod && <span>Notice: {emp.noticePeriod}</span>}
                                                                    {(() => {
                                                                        if (!emp.currentSalary) return null;
                                                                        if (typeof emp.currentSalary === 'object') {
                                                                            const salObj = emp.currentSalary as any;
                                                                            const amt = salObj?.amount;
                                                                            if (amt == null || amt === '') return null;
                                                                            const currObj = typeof salObj?.currency === 'object' && salObj.currency 
                                                                                ? salObj.currency 
                                                                                : currenciesData?.data?.find((c: any) => c._id === salObj?.currency);
                                                                            const currLabel = currObj?.code ? `${currObj.code} (${currObj.symbol || ''})` : '';
                                                                            return <span>Salary: {currLabel} {Number(amt).toLocaleString()}</span>;
                                                                        }
                                                                        return <span>Salary: {String(emp.currentSalary)}</span>;
                                                                    })()}
                                                                </div>
                                                                {emp.skillsUsed && emp.skillsUsed.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {emp.skillsUsed.map((s, sIdx) => {
                                                                            const item: any = s;
                                                                            const sName = typeof item === 'string' && /^[0-9a-fA-F]{24}$/.test(item)
                                                                                ? (skillsData?.data?.find((sk: any) => sk._id === item)?.name || item)
                                                                                : (typeof item === 'object' && item ? (item.name || item._id) : String(item));
                                                                            return (
                                                                                <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded bg-muted/80 text-foreground font-medium border border-border/40">
                                                                                    {sName}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {emp.jobProfile && <span className="text-xs text-muted-foreground mt-1">{emp.jobProfile}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
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
                                                onClick={() => setCertifications([...certifications, {
                                                    name: '',
                                                    status: 'completed',
                                                    doesNotExpire: false,
                                                    completionId: '',
                                                    url: '',
                                                    validFromMonth: undefined,
                                                    validFromYear: undefined,
                                                    validToMonth: undefined,
                                                    validToYear: undefined
                                                }])}
                                                variant="outline"
                                                className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                            >
                                                + Add Certification
                                            </Button>
                                        )}
                                    </div>
                                    {certifications.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">{isEditing ? 'No certifications added. Click + Add Certification to get started.' : 'No certifications listed.'}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {certifications.map((cert, index) => (
                                                <div key={index} className="bg-muted/20 p-3 rounded-xl border border-border/40 space-y-2.5">
                                                    {isEditing ? (
                                                        <>
                                                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                                                <Input
                                                                    placeholder="Certification Name *"
                                                                    value={cert.name}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index] = { ...copy[index], name: e.target.value };
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 rounded-lg flex-1 text-sm font-medium"
                                                                />
                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`prof-cert-${index}`}
                                                                            checked={isCertificationCompleted(cert)}
                                                                            onChange={(e) => {
                                                                                const copy = [...certifications];
                                                                                copy[index] = {
                                                                                    ...copy[index],
                                                                                    status: e.target.checked ? 'Completed' : 'Undergoing',
                                                                                    completionId: e.target.checked ? copy[index].completionId : ''
                                                                                };
                                                                                setCertifications(copy);
                                                                            }}
                                                                            className="rounded border-gray-300 w-4 h-4 cursor-pointer"
                                                                        />
                                                                        <label htmlFor={`prof-cert-${index}`} className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">Completed</label>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`prof-cert-expire-${index}`}
                                                                            checked={!!cert.doesNotExpire}
                                                                            onChange={(e) => {
                                                                                const copy = [...certifications];
                                                                                copy[index] = {
                                                                                    ...copy[index],
                                                                                    doesNotExpire: e.target.checked,
                                                                                    validToMonth: e.target.checked ? undefined : copy[index].validToMonth,
                                                                                    validToYear: e.target.checked ? undefined : copy[index].validToYear
                                                                                };
                                                                                setCertifications(copy);
                                                                            }}
                                                                            className="rounded border-gray-300 w-4 h-4 cursor-pointer"
                                                                        />
                                                                        <label htmlFor={`prof-cert-expire-${index}`} className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">Does not expire</label>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        onClick={() => setCertifications(certifications.filter((_, i) => i !== index))}
                                                                        variant="outline"
                                                                        className="h-7 w-7 p-0 text-destructive border-destructive/20 hover:bg-destructive/5 rounded-lg shrink-0"
                                                                    >✕</Button>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <Input
                                                                    placeholder="Completion / License ID"
                                                                    value={cert.completionId || ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index] = { ...copy[index], completionId: e.target.value };
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                                <Input
                                                                    placeholder="Verification / Credential URL"
                                                                    value={cert.url || ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index] = { ...copy[index], url: e.target.value };
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Valid From Month (1-12)"
                                                                    min={1}
                                                                    max={12}
                                                                    value={cert.validFromMonth != null ? String(cert.validFromMonth) : ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index] = { ...copy[index], validFromMonth: e.target.value ? Number(e.target.value) : undefined };
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Valid From Year"
                                                                    value={cert.validFromYear != null ? String(cert.validFromYear) : ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index] = { ...copy[index], validFromYear: e.target.value ? Number(e.target.value) : undefined };
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 rounded-lg text-sm"
                                                                />
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Valid To Month"
                                                                    min={1}
                                                                    max={12}
                                                                    disabled={!!cert.doesNotExpire}
                                                                    value={!cert.doesNotExpire && cert.validToMonth != null ? String(cert.validToMonth) : ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index] = { ...copy[index], validToMonth: e.target.value ? Number(e.target.value) : undefined };
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className={`h-9 rounded-lg text-sm ${cert.doesNotExpire ? 'opacity-50 cursor-not-allowed bg-muted/40' : ''}`}
                                                                />
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Valid To Year"
                                                                    disabled={!!cert.doesNotExpire}
                                                                    value={!cert.doesNotExpire && cert.validToYear != null ? String(cert.validToYear) : ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index] = { ...copy[index], validToYear: e.target.value ? Number(e.target.value) : undefined };
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className={`h-9 rounded-lg text-sm ${cert.doesNotExpire ? 'opacity-50 cursor-not-allowed bg-muted/40' : ''}`}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col gap-1.5 w-full">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-semibold">{cert.name || '—'}</span>
                                                                {(() => {
                                                                    const isCompleted = isCertificationCompleted(cert);
                                                                    return (
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                            {isCompleted ? 'Completed' : 'Undergoing'}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                                {cert.completionId && (
                                                                    <span>ID: <span className="font-mono font-medium text-foreground">{cert.completionId}</span></span>
                                                                )}
                                                                {cert.doesNotExpire ? (
                                                                    <span>Valid from {cert.validFromMonth ? `${cert.validFromMonth}/` : ''}{cert.validFromYear || '—'} (Does not expire)</span>
                                                                ) : (
                                                                    (cert.validFromYear || cert.validToYear) && (
                                                                        <span>Valid: {cert.validFromMonth ? `${cert.validFromMonth}/` : ''}{cert.validFromYear || '—'} – {cert.validToMonth ? `${cert.validToMonth}/` : ''}{cert.validToYear || '—'}</span>
                                                                    )
                                                                )}
                                                                {cert.url && (
                                                                    <a
                                                                        href={cert.url.startsWith('http') ? cert.url : `https://${cert.url}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                                                    >
                                                                        Verify Credential <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                )}
                                                            </div>
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
                                        {/* Projects — structured array per backend schema */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Projects</label>
                                                {isEditing && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => setProjects([...projects, {
                                                            title: '',
                                                            tag: '',
                                                            client: '',
                                                            status: 'Ongoing',
                                                            details: '',
                                                            location: '',
                                                            projectSite: 'Onsite',
                                                            teamSize: '1-5',
                                                            role: '',
                                                            roleDescription: '',
                                                            skillsUsed: ''
                                                        }])}
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
                                                    {projects.map((proj, idx) => {
                                                        const roleName = rolesData?.data?.find((r: any) => r._id === proj.role)?.name || proj.role || '';
                                                        return (
                                                            <div key={idx} className="bg-muted/20 p-3.5 rounded-xl border border-border/40 space-y-2.5">
                                                                {isEditing ? (
                                                                    <>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                            <Input
                                                                                placeholder="Project Title *"
                                                                                value={proj.title || ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], title: e.target.value }; setProjects(c); }}
                                                                                className="h-9 rounded-lg text-sm"
                                                                            />
                                                                            <Input
                                                                                placeholder="Tag (e.g. Mobile App)"
                                                                                value={proj.tag || ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], tag: e.target.value }; setProjects(c); }}
                                                                                className="h-9 rounded-lg text-sm"
                                                                            />
                                                                            <Input
                                                                                placeholder="Client (e.g. Internal / ACME)"
                                                                                value={proj.client || ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], client: e.target.value }; setProjects(c); }}
                                                                                className="h-9 rounded-lg text-sm"
                                                                            />
                                                                        </div>

                                                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                                            {/* Status: exact casing 'Ongoing' | 'Completed' */}
                                                                            <select
                                                                                value={proj.status === 'Completed' ? 'Completed' : 'Ongoing'}
                                                                                onChange={(e) => {
                                                                                    const nextStatus = e.target.value as 'Ongoing' | 'Completed';
                                                                                    const c = [...projects];
                                                                                    c[idx] = {
                                                                                        ...c[idx],
                                                                                        status: nextStatus,
                                                                                        workedTillMonth: nextStatus === 'Ongoing' ? undefined : c[idx].workedTillMonth,
                                                                                        workedTillYear: nextStatus === 'Ongoing' ? undefined : c[idx].workedTillYear
                                                                                    };
                                                                                    setProjects(c);
                                                                                }}
                                                                                className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-medium"
                                                                            >
                                                                                <option value="Ongoing">Ongoing</option>
                                                                                <option value="Completed">Completed</option>
                                                                            </select>

                                                                            {/* Project Site */}
                                                                            <select
                                                                                value={proj.projectSite || 'Onsite'}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], projectSite: e.target.value as 'Onsite' | 'Remote' | 'Hybrid' }; setProjects(c); }}
                                                                                className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-medium"
                                                                            >
                                                                                <option value="Onsite">Onsite</option>
                                                                                <option value="Remote">Remote</option>
                                                                                <option value="Hybrid">Hybrid</option>
                                                                            </select>

                                                                            {/* Nature of Employment */}
                                                                            <select
                                                                                value={proj.natureOfEmployment || ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], natureOfEmployment: e.target.value }; setProjects(c); }}
                                                                                className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-medium"
                                                                            >
                                                                                <option value="">Nature of Employment</option>
                                                                                <option value="Full Time">Full Time</option>
                                                                                <option value="Part Time">Part Time</option>
                                                                                <option value="Contract">Contract</option>
                                                                                <option value="Freelance">Freelance</option>
                                                                                <option value="Internship">Internship</option>
                                                                            </select>

                                                                            {/* Team Size */}
                                                                            <select
                                                                                value={proj.teamSize || ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], teamSize: e.target.value as any }; setProjects(c); }}
                                                                                className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-medium"
                                                                            >
                                                                                <option value="">Team Size</option>
                                                                                <option value="1-5">1-5</option>
                                                                                <option value="6-10">6-10</option>
                                                                                <option value="11-20">11-20</option>
                                                                                <option value="21-50">21-50</option>
                                                                                <option value="50+">50+</option>
                                                                            </select>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                            {/* Role (ObjectId from rolesData lookup) */}
                                                                            <select
                                                                                value={proj.role || ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], role: e.target.value }; setProjects(c); }}
                                                                                className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-medium"
                                                                            >
                                                                                <option value="">Select Role</option>
                                                                                {rolesData?.data?.map((r: any) => (
                                                                                    <option key={r._id} value={r._id}>{r.name}</option>
                                                                                ))}
                                                                            </select>

                                                                            <Input
                                                                                placeholder="Location (e.g. London)"
                                                                                value={proj.location || ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], location: e.target.value }; setProjects(c); }}
                                                                                className="h-9 rounded-lg text-sm"
                                                                            />
                                                                        </div>

                                                                        {/* Project Duration */}
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="From Month (1-12)"
                                                                                min={1}
                                                                                max={12}
                                                                                value={proj.workedFromMonth != null ? String(proj.workedFromMonth) : ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], workedFromMonth: e.target.value ? Number(e.target.value) : undefined }; setProjects(c); }}
                                                                                className="h-9 rounded-lg text-sm"
                                                                            />
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="From Year"
                                                                                value={proj.workedFromYear != null ? String(proj.workedFromYear) : ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], workedFromYear: e.target.value ? Number(e.target.value) : undefined }; setProjects(c); }}
                                                                                className="h-9 rounded-lg text-sm"
                                                                            />
                                                                            <Input
                                                                                type="number"
                                                                                placeholder={proj.status === 'Ongoing' ? 'Ongoing' : 'Till Month'}
                                                                                min={1}
                                                                                max={12}
                                                                                disabled={proj.status === 'Ongoing'}
                                                                                value={proj.status !== 'Ongoing' && proj.workedTillMonth != null ? String(proj.workedTillMonth) : ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], workedTillMonth: e.target.value ? Number(e.target.value) : undefined }; setProjects(c); }}
                                                                                className={`h-9 rounded-lg text-sm ${proj.status === 'Ongoing' ? 'opacity-50 cursor-not-allowed bg-muted/40' : ''}`}
                                                                            />
                                                                            <Input
                                                                                type="number"
                                                                                placeholder={proj.status === 'Ongoing' ? 'Present' : 'Till Year'}
                                                                                disabled={proj.status === 'Ongoing'}
                                                                                value={proj.status !== 'Ongoing' && proj.workedTillYear != null ? String(proj.workedTillYear) : ''}
                                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], workedTillYear: e.target.value ? Number(e.target.value) : undefined }; setProjects(c); }}
                                                                                className={`h-9 rounded-lg text-sm ${proj.status === 'Ongoing' ? 'opacity-50 cursor-not-allowed bg-muted/40' : ''}`}
                                                                            />
                                                                        </div>

                                                                        <Input
                                                                            placeholder="Skills Used (e.g. React, Node.js, GraphQL)"
                                                                            value={proj.skillsUsed || ''}
                                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], skillsUsed: e.target.value }; setProjects(c); }}
                                                                            className="h-9 rounded-lg text-sm"
                                                                        />

                                                                        {/* Details (NOT description per spec) */}
                                                                        <textarea
                                                                            placeholder="Project details..."
                                                                            value={proj.details || ''}
                                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], details: e.target.value }; setProjects(c); }}
                                                                            rows={2}
                                                                            className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-all resize-none bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                                        />

                                                                        {/* Role Description */}
                                                                        <textarea
                                                                            placeholder="Role description & key responsibilities..."
                                                                            value={proj.roleDescription || ''}
                                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], roleDescription: e.target.value }; setProjects(c); }}
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
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-semibold">{proj.title || '—'}</span>
                                                                                {proj.tag && <span className="text-[11px] px-2 py-0.5 rounded bg-muted font-medium text-muted-foreground">{proj.tag}</span>}
                                                                            </div>
                                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${proj.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                                {proj.status === 'Completed' ? 'Completed' : 'Ongoing'}
                                                                            </span>
                                                                        </div>
                                                                        {proj.details && <span className="text-xs text-muted-foreground">{proj.details}</span>}
                                                                        {proj.roleDescription && (
                                                                            <p className="text-xs text-muted-foreground mt-0.5"><span className="font-semibold text-foreground">Role:</span> {proj.roleDescription}</p>
                                                                        )}
                                                                        <div className="flex gap-3 mt-0.5 flex-wrap text-[11px] text-muted-foreground font-medium">
                                                                            {(proj.workedFromYear || proj.workedTillYear || proj.status === 'Ongoing') && (
                                                                                <span>Duration: {proj.workedFromMonth ? `${proj.workedFromMonth}/` : ''}{proj.workedFromYear || '—'} – {proj.status === 'Ongoing' ? 'Present' : `${proj.workedTillMonth ? `${proj.workedTillMonth}/` : ''}${proj.workedTillYear || '—'}`}</span>
                                                                            )}
                                                                            {proj.natureOfEmployment && <span>Type: {proj.natureOfEmployment}</span>}
                                                                            {proj.projectSite && <span>Site: {proj.projectSite}</span>}
                                                                            {roleName && <span>Role: {roleName}</span>}
                                                                            {proj.teamSize && <span>Team: {proj.teamSize}</span>}
                                                                            {proj.client && <span>Client: {proj.client}</span>}
                                                                            {proj.location && <span>Location: {proj.location}</span>}
                                                                        </div>
                                                                        {proj.skillsUsed && proj.skillsUsed.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                                {proj.skillsUsed.split(',').map((s: string, sIdx: number) => (
                                                                                    <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded bg-muted/80 text-foreground font-medium border border-border/40">
                                                                                        {s.trim()}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
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
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Other Achievements</label>
                                                {isEditing && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => setOtherAchievements([...otherAchievements, { name: '', link: '', description: '' }])}
                                                        variant="outline"
                                                        className="h-7 rounded-lg text-xs font-bold px-3 border-border/60"
                                                    >
                                                        + Add Achievement
                                                    </Button>
                                                )}
                                            </div>
                                            {otherAchievements.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">
                                                    {isEditing ? 'No other achievements added. Click + Add Achievement to add awards, publications, competitions, or notable milestones.' : 'No other achievements listed.'}
                                                </p>
                                            ) : (
                                                isEditing ? (
                                                    <div className="space-y-3">
                                                        {otherAchievements.map((ach, aIdx) => (
                                                            <div key={aIdx} className="bg-muted/20 p-3 rounded-xl border border-border/40 space-y-2">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    <Input
                                                                        placeholder="Achievement Name / Title *"
                                                                        value={ach.name || ''}
                                                                        onChange={(e) => {
                                                                            const copy = [...otherAchievements];
                                                                            copy[aIdx] = { ...copy[aIdx], name: e.target.value };
                                                                            setOtherAchievements(copy);
                                                                        }}
                                                                        className="h-9 rounded-lg text-sm font-medium"
                                                                    />
                                                                    <Input
                                                                        placeholder="Link / URL (optional)"
                                                                        value={ach.link || ''}
                                                                        onChange={(e) => {
                                                                            const copy = [...otherAchievements];
                                                                            copy[aIdx] = { ...copy[aIdx], link: e.target.value };
                                                                            setOtherAchievements(copy);
                                                                        }}
                                                                        className="h-9 rounded-lg text-sm"
                                                                    />
                                                                </div>
                                                                <textarea
                                                                    placeholder="Description (optional)..."
                                                                    value={ach.description || ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...otherAchievements];
                                                                        copy[aIdx] = { ...copy[aIdx], description: e.target.value };
                                                                        setOtherAchievements(copy);
                                                                    }}
                                                                    rows={2}
                                                                    className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-all resize-none bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20"
                                                                />
                                                                <div className="flex justify-end">
                                                                    <Button
                                                                        type="button"
                                                                        onClick={() => setOtherAchievements(otherAchievements.filter((_, i) => i !== aIdx))}
                                                                        variant="outline"
                                                                        className="h-7 rounded-lg text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/5 px-2"
                                                                    >Remove</Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {otherAchievements.map((ach, aIdx) => (
                                                            <div key={aIdx} className="bg-muted/20 p-3 rounded-xl border border-border/40 flex flex-col gap-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-semibold text-foreground">{ach.name || '—'}</span>
                                                                    {ach.link && (
                                                                        <a
                                                                            href={ach.link.startsWith('http') ? ach.link : `https://${ach.link}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                                                        >
                                                                            View Link <ExternalLink className="w-3 h-3" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                                {ach.description && <p className="text-xs text-muted-foreground">{ach.description}</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            )}
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
                                        {/* ── Delete resume button ── */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            title="Remove CV"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                                            onClick={removeCV}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>

                                    {/* ── Replace resume ── */}
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-semibold">Replace</span></div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isUploadingCV}
                                        className="w-full cursor-pointer overflow-hidden relative group disabled:cursor-wait"
                                    >
                                        <span className="flex items-center gap-2 group-hover:text-primary transition-colors font-semibold">
                                            {isUploadingCV
                                                ? <><Loader2 size={18} className="animate-spin" /> Uploading...</>
                                                : <><UploadCloud size={18} /> Upload New CV</>
                                            }
                                        </span>
                                        <input
                                            ref={cvReplaceInputRef}
                                            type="file"
                                            onClick={e => (e.currentTarget.value = '')}
                                            onChange={handleCVUpload}
                                            disabled={isUploadingCV}
                                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
                                        />
                                    </Button>
                                    <p className="text-[11px] text-center text-muted-foreground">Supported: PDF, DOC, DOCX up to 1MB</p>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/10 transition-colors relative">
                                    {isUploadingCV ? (
                                        <div className="flex flex-col items-center gap-4 py-8">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            <p className="text-sm font-medium">Processing document...</p>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer group">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <UploadCloud size={28} />
                                            </div>
                                            <h4 className="font-bold mb-1">Upload your CV</h4>
                                            <p className="text-sm text-muted-foreground max-w-[200px]">PDF, DOC, DOCX up to 1MB</p>
                                            <Button size="sm" className="mt-6 font-medium px-6 pointer-events-none">Select File</Button>
                                            <input
                                                type="file"
                                                ref={cvInputRef}
                                                onClick={e => (e.currentTarget.value = '')}
                                                onChange={handleCVUpload}
                                                disabled={isUploadingCV}
                                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
                                            />
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
