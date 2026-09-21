import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store';
import { useStudentStore } from '../student/store';
import { getCleanFileName } from '../student/StudentProfile';
import { Button, Input, Badge } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { ArrowRight, Loader2, Check, UploadCloud } from 'lucide-react';
import { consultationApi } from '@/lib/consultationApi';
import type { EmploymentHistoryItem, CertificationItem, ProjectItem } from '@/lib/mockDb/schema';
import { formatJoiningDatePayload, isCertificationCompleted, toDateInputValue } from '@/lib/mockApi';
import { normalizeInternshipItem, saveStoredInternships, getStoredInternships } from '@/lib/internshipsStorage';
import {
    useGetCountriesQuery,
    useGetEducationsQuery,
    useGetSkillsQuery,
    useGetJobTypesQuery,
    useGetExperienceLevelsQuery,
    useGetLocationsQuery,
    useGetDomainsQuery,
    useGetCurrenciesQuery,
    useGetLanguagesQuery,
    useGetLanguageProficienciesQuery,
    useGetUniversitiesQuery,
    useGetRolesQuery
} from '@/lib/store/authApi';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i));

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

export function Onboarding() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { updateProfile, profile, fetchDashboardData } = useStudentStore();

    // Onboarding step tracking: 0 = Profile Creation, 1 = CV Upload
    const [onboardingStep, setOnboardingStep] = useState<number>(0);


    // Profile state values
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [education, setEducation] = useState('');
    const [educationQuery, setEducationQuery] = useState('');
    const [showEduSuggestions, setShowEduSuggestions] = useState(false);

    const [skills, setSkills] = useState('');

    const [experienceLevel, setExperienceLevel] = useState('');
    const [experienceLevelId, setExperienceLevelId] = useState('');

    const [careerGoal, setCareerGoal] = useState('');
    const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);

    const [location, setLocation] = useState('');
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    // Track IDs of selected locations immediately on selection (not re-resolved at submit)
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

    const [jobType, setJobType] = useState('');
    const [jobTypeQuery, setJobTypeQuery] = useState('');
    const [showJobTypeSuggestions, setShowJobTypeSuggestions] = useState(false);
    const [selectedJobTypeIds, setSelectedJobTypeIds] = useState<string[]>([]);

    const [expectedSalaryAmount, setExpectedSalaryAmount] = useState('');
    const [expectedSalaryCurrency, setExpectedSalaryCurrency] = useState('');
    const [currentSalaryAmount, setCurrentSalaryAmount] = useState('');
    const [currentSalaryCurrency, setCurrentSalaryCurrency] = useState('');

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
    const [certifications, setCertifications] = useState<CertificationItem[]>([]);
    const [awards, setAwards] = useState('');
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [internships, setInternships] = useState<Array<{ companyName: string; duration: string; role: string }>>([]);
    const [profileSummary, setProfileSummary] = useState('');
    const [otherAchievements, setOtherAchievements] = useState('');
    const [domain, setDomain] = useState('');
    const [customDomain, setCustomDomain] = useState('');
    const [hometownCountry, setHometownCountry] = useState('');
    const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistoryItem[]>([]);

    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [isUploadingCV, setIsUploadingCV] = useState(false);
    const [cvName, setCvName] = useState('');
    const [cvError, setCvError] = useState<string | null>(null);
    const [selectedCvFile, setSelectedCvFile] = useState<File | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasCheckedInitialState, setHasCheckedInitialState] = useState(false);

    const currentSkillsParts = skills.split(',');
    const lastSkillPart = currentSkillsParts[currentSkillsParts.length - 1].trim();

    const currentDomainParts = careerGoal.split(',');
    const lastDomainPart = currentDomainParts[currentDomainParts.length - 1].trim();

    const currentLocationParts = location.split(',');
    const lastLocationPart = currentLocationParts[currentLocationParts.length - 1].split('(')[0].trim();

    const { data: educationsData } = useGetEducationsQuery({ search: educationQuery });
    const { data: skillsData } = useGetSkillsQuery({ search: lastSkillPart });
    const { data: jobTypesData } = useGetJobTypesQuery(undefined);
    const { data: experienceLevelsData } = useGetExperienceLevelsQuery(undefined);
    const { data: locationsData } = useGetLocationsQuery({ search: lastLocationPart });
    const { data: domainsData } = useGetDomainsQuery({ search: lastDomainPart });
    const { data: allDomainsData } = useGetDomainsQuery(undefined);
    const { data: currenciesData } = useGetCurrenciesQuery();
    const { data: languagesData } = useGetLanguagesQuery(undefined);
    const { data: languageProficienciesData } = useGetLanguageProficienciesQuery(undefined);
    const { data: universitiesData } = useGetUniversitiesQuery(undefined);
    const { data: countriesData } = useGetCountriesQuery(undefined);
    const { data: allSkillsData } = useGetSkillsQuery(undefined);
    const { data: rolesData } = useGetRolesQuery(undefined);

    const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

    const getFilteredSkills = () => {
        if (!skillsData?.data) return [];
        const parts = skills.split(',');
        const selectedSkillsSet = new Set(parts.slice(0, -1).map(s => s.trim().toLowerCase()));

        return skillsData.data.filter((s: any) => {
            const skillName = s.name.toLowerCase();
            return !selectedSkillsSet.has(skillName);
        }).slice(0, 15);
    };

    const handleAddSkill = (skillName: string) => {
        const parts = skills.split(',');
        parts[parts.length - 1] = ` ${skillName}`;
        setSkills(parts.join(',').trim() + ', ');
        setShowSkillSuggestions(false);
    };

    const getFilteredDomains = () => {
        if (!domainsData?.data) return [];
        const parts = careerGoal.split(',');
        const selectedDomainsSet = new Set(parts.slice(0, -1).map(d => d.trim().toLowerCase()));

        return domainsData.data.filter((d: any) => {
            const domainName = d.name.toLowerCase();
            return !selectedDomainsSet.has(domainName);
        }).slice(0, 15);
    };

    const handleAddDomain = (domainName: string) => {
        const parts = careerGoal.split(',');
        parts[parts.length - 1] = ` ${domainName}`;
        setCareerGoal(parts.join(',').trim() + ', ');
        setShowDomainSuggestions(false);
    };

    const getFilteredLocations = () => {
        if (!locationsData?.data) return [];
        const parts = location.split(',');
        const selectedLocationsSet = new Set(parts.slice(0, -1).map(l => l.trim().toLowerCase()));

        return locationsData.data.filter((l: any) => {
            const locationLabel = getLocationLabel(l).toLowerCase();
            return !selectedLocationsSet.has(locationLabel);
        }).slice(0, 15);
    };

    const handleAddLocation = (locationName: string, locationId?: string) => {
        const parts = location.split(',');
        parts[parts.length - 1] = ` ${locationName}`;
        setLocation(parts.join(',').trim() + ', ');
        setShowLocationSuggestions(false);
        // Capture the ID immediately so submit doesn't need to re-resolve against stale cache
        if (locationId) {
            setSelectedLocationIds(prev => {
                if (prev.includes(locationId)) return prev;
                return [...prev, locationId];
            });
        }
    };

    // Fetch dashboard/profile data on mount
    useEffect(() => {
        if (user && !profile) {
            fetchDashboardData(user.id).catch(console.error);
        }
    }, [user, profile, fetchDashboardData]);

    // Handle skip-checks and automatic stepping based on completed state
    useEffect(() => {
        if (!profile || hasCheckedInitialState) return;

        const hasProfile = !!(profile.careerGoal && profile.location && profile.jobType);
        const hasCv = !!profile.cvUrl;

        if (hasProfile && hasCv) {
            navigate('/student/jobs', { replace: true });
        } else if (hasProfile) {
            setOnboardingStep(1);
        } else {
            setOnboardingStep(0);
        }
        setHasCheckedInitialState(true);
    }, [profile, user, navigate, hasCheckedInitialState]);

    // Initialize local form state values once user profile data loads
    useEffect(() => {
        if ((user || profile) && !isInitialized) {
            setFullName(profile?.fullName || user?.name || user?.fullName || '');
            setEmail(user?.email || '');
            setPhone(user?.mobile || '');
            
            const firstEdu = profile?.educationHistory?.[0];
            const initialEducation = firstEdu?.education || '';
            setEducation(initialEducation);
            setEducationQuery(initialEducation);

            setSkills(profile?.skills ? profile.skills.join(', ') : '');

            const initialExp = profile?.experienceLevel || '';
            const initialExpId = profile?.experienceLevelId || '';
            setExperienceLevel(initialExp);
            setExperienceLevelId(initialExpId);

            const initialCareerGoal = profile?.careerGoal || '';
            setCareerGoal(initialCareerGoal);

            const initialLocation = profile?.location || '';
            setLocation(initialLocation);

            const initialJobType = profile?.jobType || '';
            setJobType(initialJobType);
            setJobTypeQuery('');

            if (profile?.expectedSalary) {
                if (typeof profile.expectedSalary === 'object') {
                    const amt = profile.expectedSalary.amount;
                    setExpectedSalaryAmount(amt != null && amt !== 0 ? String(amt) : (amt === 0 ? '0' : ''));
                    const curr = profile.expectedSalary.currency;
                    const cId = typeof curr === 'object' && curr ? (curr._id || '') : String(curr || '');
                    if (cId && cId !== '[object Object]') setExpectedSalaryCurrency(cId);
                } else {
                    setExpectedSalaryAmount(String(profile.expectedSalary));
                }
            }

            if (profile?.currentSalary) {
                if (typeof profile.currentSalary === 'object') {
                    const amt = profile.currentSalary.amount;
                    setCurrentSalaryAmount(amt != null && amt !== 0 ? String(amt) : (amt === 0 ? '0' : ''));
                    const curr = profile.currentSalary.currency;
                    const cId = typeof curr === 'object' && curr ? (curr._id || '') : String(curr || '');
                    if (cId && cId !== '[object Object]') setCurrentSalaryCurrency(cId);
                } else {
                    setCurrentSalaryAmount(String(profile.currentSalary));
                }
            }

            setGender(profile?.gender || '');
            setDob(profile?.dob || '');
            setCurrentLocation(profile?.currentLocation || '');
            setHometown(profile?.hometown || '');
            const rawCountry = profile?.hometownCountry as any;
            const countryId = typeof rawCountry === 'object' && rawCountry ? (rawCountry._id || '') : (rawCountry || '');
            setHometownCountry(countryId);
            const initialDomain = profile?.domain ? (typeof profile.domain === 'object' ? (profile.domain._id || '') : profile.domain) : '';
            setDomain(initialDomain);
            setCustomDomain(profile?.customDomain || '');
            setEmploymentHistory(profile?.employmentHistory || []);
            
            // Map qualifications fields locally for wizard UI
            if (firstEdu) {
                setHighestEducation((profile as any)?.highestEducation || 'UG');
                setUgUniversity((profile as any)?.ugUniversity || firstEdu.customUniversity || firstEdu.university || '');
                setSchoolCollegeName(firstEdu.schoolCollegeName || firstEdu.college || (profile as any)?.schoolCollegeName || '');
                setPgUniversity((profile as any)?.pgUniversity || '');
                setGraduationUniversity((profile as any)?.graduationUniversity || '');
            }
            setLanguages(
                Array.isArray(profile?.languagesKnown)
                    ? profile!.languagesKnown
                        .map(l => {
                            const found = languagesData?.data?.find((ld: any) => ld._id === l.language);
                            return found?.name || l.languageName || (/^[0-9a-fA-F]{24}$/.test(l.language) ? '' : l.language);
                        })
                        .filter(Boolean)
                        .join(', ')
                    : ''
            );
            setCertifications(profile?.certifications || []);
            setAwards(profile?.awards || '');
            const savedProjects = (() => {
                try {
                    const raw = typeof window !== 'undefined' && user?.id ? localStorage.getItem(`squrx_projects_${user.id}`) : null;
                    return raw ? JSON.parse(raw) : null;
                } catch { return null; }
            })();
            const effectiveProjects = (Array.isArray(profile?.projects) && profile.projects.length > 0)
                ? profile.projects
                : (Array.isArray(savedProjects) && savedProjects.length > 0 ? savedProjects : (profile?.projects || []));
            setProjects(Array.isArray(effectiveProjects) ? effectiveProjects : []);
            const effectiveUserId = user?.id || (profile as any)?._id || (profile as any)?.userId;
            const fallbackInternships = getStoredInternships(effectiveUserId);
            const rawProfileInternships = (profile?.internships && profile.internships.length > 0)
                ? profile.internships
                : ((profile as any)?.internship && (profile as any).internship.length > 0)
                    ? (profile as any).internship
                    : [];
            const effectiveInternships = rawProfileInternships.length > 0
                ? rawProfileInternships.map(normalizeInternshipItem)
                : (Array.isArray(fallbackInternships) ? fallbackInternships : []);
            setInternships(Array.isArray(effectiveInternships) ? effectiveInternships : []);
            setProfileSummary(profile?.profileSummary || '');
            setOtherAchievements(
                Array.isArray(profile?.otherAchievements)
                    ? (profile?.otherAchievements as any[]).map(a => typeof a === 'string' ? a : (a?.name || '')).filter(Boolean).join(', ')
                    : (profile?.otherAchievements || '')
            );

            if (profile?.cvUrl) {
                setCvName(profile.cvName || profile.resumeName || getCleanFileName(profile.cvUrl));
            }

            setIsInitialized(true);
        }
    }, [user, profile, isInitialized]);

    useEffect(() => {
        if (profile?.preferredJobTypeIds && profile.preferredJobTypeIds.length > 0) {
            setSelectedJobTypeIds(profile.preferredJobTypeIds);
        } else if (jobTypesData?.data && jobType) {
            const parsedNames = jobType.split(',').map(j => j.trim()).filter(Boolean);
            const matchingIds = parsedNames
                .map(name => jobTypesData.data.find((x: any) => x.name.toLowerCase() === name.toLowerCase())?._id)
                .filter(Boolean);
            if (matchingIds.length > 0) {
                setSelectedJobTypeIds(matchingIds);
            }
        }
    }, [profile, jobTypesData, jobType]);

    useEffect(() => {
        if (languagesData?.data && Array.isArray(profile?.languagesKnown) && profile.languagesKnown.length > 0 && !languages) {
            const resolved = profile.languagesKnown
                .map(l => {
                    const found = languagesData.data.find((ld: any) => ld._id === l.language);
                    return found?.name || l.languageName || (/^[0-9a-fA-F]{24}$/.test(l.language) ? '' : l.language);
                })
                .filter(Boolean)
                .join(', ');
            if (resolved) {
                setLanguages(resolved);
            }
        }
    }, [languagesData, profile?.languagesKnown, languages]);

    useEffect(() => {
        if (countriesData?.data && hometownCountry && !/^[0-9a-fA-F]{24}$/.test(hometownCountry)) {
            const match = countriesData.data.find((c: any) => c.name.toLowerCase() === hometownCountry.toLowerCase());
            if (match?._id) setHometownCountry(match._id);
        }
    }, [countriesData, hometownCountry]);

    useEffect(() => {
        if (experienceLevelsData?.data && experienceLevelsData.data.length > 0) {
            if (experienceLevelId && !experienceLevel) {
                const match = experienceLevelsData.data.find((el: any) => el._id === experienceLevelId);
                if (match) {
                    setExperienceLevel(match.name);
                }
            } else if (experienceLevel && !experienceLevelId) {
                const match = experienceLevelsData.data.find((el: any) => el.name.toLowerCase() === experienceLevel.toLowerCase() || el._id === experienceLevel);
                if (match) {
                    setExperienceLevelId(match._id);
                    if (match.name) setExperienceLevel(match.name);
                }
            }
        }
    }, [experienceLevelsData, experienceLevelId, experienceLevel]);

    // Auto-select first currency if available and none selected yet
    useEffect(() => {
        if (currenciesData?.data && currenciesData.data.length > 0) {
            const defaultId = currenciesData.data[0]._id;
            if (!expectedSalaryCurrency) setExpectedSalaryCurrency(defaultId);
            if (!currentSalaryCurrency) setCurrentSalaryCurrency(defaultId);
        }
    }, [currenciesData, expectedSalaryCurrency, currentSalaryCurrency]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (isProfileSaving) return;

        if (!fullName || !email || !phone || !education || !skills || !careerGoal || !location || !jobType || !expectedSalaryAmount) {
            alert("All fields are required.");
            return;
        }

        if (experienceLevel !== 'Fresher' && !currentSalaryAmount) {
            alert("Current salary is required for experienced candidates.");
            return;
        }

        setIsProfileSaving(true);
        try {
            const defaultCurrId = currenciesData?.data?.[0]?._id || '';
            const curSalPayload = (currentSalaryAmount !== '' && !isNaN(Number(currentSalaryAmount))) ? {
                amount: Number(currentSalaryAmount),
                currency: currentSalaryCurrency || defaultCurrId
            } : null;
            const expSalPayload = (expectedSalaryAmount !== '' && !isNaN(Number(expectedSalaryAmount))) ? {
                amount: Number(expectedSalaryAmount),
                currency: expectedSalaryCurrency || defaultCurrId
            } : null;

            // Resolve lookup IDs for the backend update request
            const parsedDomains = careerGoal.split(',').map(d => d.trim()).filter(Boolean);
            const domainIds = parsedDomains
                .map(d => domainsData?.data?.find((dd: any) => dd.name.toLowerCase() === d.toLowerCase())?._id)
                .filter(Boolean);

            const eduMatch = educationsData?.data?.find((e: any) => e.name === education);
            const expMatch = experienceLevelsData?.data?.find((e: any) => e._id === experienceLevelId || e.name.toLowerCase() === experienceLevel.toLowerCase());
            const resolvedExpId = experienceLevelId || expMatch?._id || (/^[0-9a-fA-F]{24}$/.test(experienceLevel) ? experienceLevel : undefined);

            // Use pre-captured IDs (populated at selection time) to avoid stale-cache race condition.
            // Fall back to re-resolution only if the user typed locations manually without selecting from dropdown.
            let locationIds = selectedLocationIds.filter(Boolean);
            if (locationIds.length === 0) {
                const parsedLocations = location.split(',').map(l => l.trim().split('(')[0].trim()).filter(Boolean);
                locationIds = parsedLocations
                    .map(l => locationsData?.data?.find((ld: any) => ld.name.toLowerCase() === l.toLowerCase())?._id)
                    .filter(Boolean) as string[];
            }

            const parsedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
            const skillIds = parsedSkills
                .map(s => skillsData?.data?.find((sd: any) => sd.name.toLowerCase() === s.toLowerCase())?._id)
                .filter(Boolean);

            const parsedJobTypes = jobType.split(',').map(j => j.trim()).filter(Boolean);
            let jtIds = selectedJobTypeIds.filter(Boolean);
            if (jtIds.length === 0) {
                jtIds = parsedJobTypes
                    .map(j => jobTypesData?.data?.find((jd: any) => jd.name.toLowerCase() === j.toLowerCase())?._id)
                    .filter(Boolean) as string[];
            }

            const selectedUniName = highestEducation === 'PG' ? pgUniversity : ugUniversity;
            const uniMatch = universitiesData?.data?.find((u: any) => u.name.toLowerCase() === selectedUniName?.trim().toLowerCase());

            const firstEduItem: Record<string, any> = {
                courseType: 'Full Time'
            };
            if (eduMatch?._id) firstEduItem.education = eduMatch._id;
            else if (education && /^[0-9a-fA-F]{24}$/.test(education)) firstEduItem.education = education;

            if (uniMatch?._id) firstEduItem.university = uniMatch._id;
            else if (selectedUniName && /^[0-9a-fA-F]{24}$/.test(selectedUniName)) firstEduItem.university = selectedUniName;

            if (schoolCollegeName && schoolCollegeName.trim()) {
                firstEduItem.schoolCollegeName = schoolCollegeName.trim();
                firstEduItem.college = schoolCollegeName.trim();
                firstEduItem.institute = schoolCollegeName.trim();
                firstEduItem.customUniversity = schoolCollegeName.trim();
            } else if (selectedUniName) {
                firstEduItem.customUniversity = selectedUniName;
            }

            const defaultProfId = languageProficienciesData?.data?.[0]?._id || '';
            const defaultProfName = languageProficienciesData?.data?.[0]?.name || '';

            const cleanInternships = (internships || [])
                .filter(i => (i.companyName || (i as any).company || '').trim() || (i.role || (i as any).title || '').trim())
                .map(normalizeInternshipItem);
            saveStoredInternships(user?.id, cleanInternships);

            const cleanProjects = projects.filter(p => p && p.title?.trim()).map(p => ({
                title: p.title.trim(),
                tag: p.tag?.trim() || undefined,
                client: p.client?.trim() || undefined,
                status: p.status === 'Completed' ? ('Completed' as const) : ('Ongoing' as const),
                workedFromYear: p.workedFromYear ? Number(p.workedFromYear) : undefined,
                workedFromMonth: p.workedFromMonth ? Number(p.workedFromMonth) : undefined,
                workedTillYear: p.status === 'Ongoing' ? undefined : (p.workedTillYear ? Number(p.workedTillYear) : undefined),
                workedTillMonth: p.status === 'Ongoing' ? undefined : (p.workedTillMonth ? Number(p.workedTillMonth) : undefined),
                details: p.details?.trim() || '',
                location: p.location?.trim() || undefined,
                projectSite: p.projectSite || undefined,
                natureOfEmployment: p.natureOfEmployment || undefined,
                teamSize: p.teamSize || undefined,
                role: p.role || undefined,
                roleDescription: p.roleDescription?.trim() || undefined,
                skillsUsed: typeof p.skillsUsed === 'string' ? p.skillsUsed.trim() : (p.skillsUsed || undefined)
            }));

            await updateProfile(user.id, {
                fullName,
                experienceLevel: resolvedExpId,
                experienceLevelId: resolvedExpId,
                currentSalary: curSalPayload,
                expectedSalary: expSalPayload,
                preferredDomains: domainIds,
                skills: skillIds,
                preferredLocations: locationIds,
                preferredJobTypes: jtIds,
                // Local state compatibility
                careerGoal,
                location,
                jobType,
                locations: [location],
                jobTypes: parsedJobTypes,

                // NEW FIELDS
                gender,
                dob,
                currentLocation,
                hometown,
                hometownCountry: (() => {
                    let resolved = hometownCountry;
                    if (hometownCountry && !/^[0-9a-fA-F]{24}$/.test(hometownCountry) && countriesData?.data) {
                        const match = countriesData.data.find((c: any) => c.name.toLowerCase() === hometownCountry.toLowerCase());
                        if (match?._id) resolved = match._id;
                    }
                    return /^[0-9a-fA-F]{24}$/.test(resolved) ? resolved : undefined;
                })(),
                domain: domain || undefined,
                customDomain: domain === 'other' ? customDomain : undefined,
                schoolCollegeName: schoolCollegeName?.trim() || undefined,
                highestEducation: highestEducation || undefined,
                ugUniversity: ugUniversity?.trim() || undefined,
                pgUniversity: pgUniversity?.trim() || undefined,
                graduationUniversity: graduationUniversity?.trim() || undefined,
                educationHistory: [
                    {
                        ...(profile?.educationHistory?.[0] || {}),
                        ...firstEduItem
                    },
                    ...((profile?.educationHistory || []).slice(1))
                ],
                employmentHistory: employmentHistory.map(e => {
                    const rawSkills = Array.isArray(e.skillsUsed)
                        ? e.skillsUsed
                        : (typeof e.skillsUsed === 'string' ? (e.skillsUsed as string).split(',').map(s => s.trim()).filter(Boolean) : []);
                    const resolvedSkillIds = rawSkills
                        .map(s => {
                            const item: any = s;
                            const str = typeof item === 'object' && item ? (item._id || item.name) : String(s).trim();
                            if (/^[0-9a-fA-F]{24}$/.test(str)) return str;
                            const matched = allSkillsData?.data?.find((sd: any) => sd.name.toLowerCase() === str.toLowerCase())
                                || skillsData?.data?.find((sd: any) => sd.name.toLowerCase() === str.toLowerCase());
                            return matched?._id || '';
                        })
                        .filter((id: string) => /^[0-9a-fA-F]{24}$/.test(id));
                    return {
                        ...e,
                        joiningDate: formatJoiningDatePayload(e.joiningDate),
                        skillsUsed: resolvedSkillIds
                    };
                }),
                // Convert comma-separated languages string → languagesKnown array
                // Matches against lookup data so valid MongoDB ObjectIds are provided to the backend
                languagesKnown: languages
                    ? languages.split(',').map(l => l.trim()).filter(Boolean).map(langName => {
                        const input = langName.toLowerCase();
                        const match = languagesData?.data?.find((ld: any) => {
                            const dbName = ld.name.toLowerCase();
                            return dbName === input || dbName.startsWith(input) || input.startsWith(dbName.split(' ')[0]);
                        });
                        return {
                            language: match?._id || '',
                            languageName: match?.name || langName,
                            proficiency: match?._id ? defaultProfId : '',
                            proficiencyName: match?._id ? defaultProfName : '',
                            read: true,
                            write: true,
                            speak: true
                        };
                    })
                    : [],
                certifications: certifications.map(c => ({
                    ...c,
                    status: isCertificationCompleted(c) ? 'Completed' : 'Undergoing'
                })),
                awards,
                projects: cleanProjects,
                internships: cleanInternships,
                internship: cleanInternships as any,
                profileSummary,
                otherAchievements,
            });

            saveStoredInternships(user?.id, cleanInternships);
            if (user?.id) {
                try {
                    localStorage.setItem(`squrx_projects_${user.id}`, JSON.stringify(cleanProjects));
                } catch {}
            }

            setOnboardingStep(1);
        } catch (err) {
            console.error(err);
        } finally {
            setIsProfileSaving(false);
        }
    };

    // Called when user picks a file — validates and stores it, does NOT upload yet.
    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setCvError(null);

        // Limit to 1MB to match server limit
        if (file.size > 1 * 1024 * 1024) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            setCvError(`File is too large (${sizeMb}MB). The server allows up to 1MB. Please compress or choose a file under 1MB.`);
            event.target.value = '';
            return;
        }

        const fileName = file.name;
        const lowerName = fileName.toLowerCase();
        // Backend accepts: .pdf, .doc, .docx per API specification
        const isValidExtension = lowerName.endsWith('.pdf') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
        const validTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!validTypes.includes(file.type) && !isValidExtension) {
            setCvError('Please upload a valid document (.pdf, .doc, or .docx).');
            event.target.value = '';
            return;
        }

        setSelectedCvFile(file);
    };

    // Called when user explicitly clicks the Upload button.
    const handleCVUpload = async () => {
        if (!selectedCvFile || !user) return;
        const file = selectedCvFile;

        setIsUploadingCV(true);
        setCvError(null);
        try {
            const cvUrl = await consultationApi.uploadCv(file);
            const finalUrl = cvUrl || file.name;
            await updateProfile(user.id, {
                cvUrl: finalUrl,
                resume: finalUrl,
                cvName: file.name,
                resumeName: file.name
            });
            if (typeof window !== 'undefined') {
                localStorage.removeItem(`squrx_deleted_cv_${user.id}`);
            }
            setCvName(file.name);
            setSelectedCvFile(null);
        } catch (err: any) {
            console.error('CV upload error:', err);
            const errMsg = String(err?.message || '');
            if (errMsg.includes('413') || errMsg.toLowerCase().includes('large') || errMsg.toLowerCase().includes('size')) {
                setCvError('The server rejected the file because it exceeds 1MB. Please upload a file under 1MB.');
            } else if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('authentication')) {
                setCvError('Your session has expired (HTTP 401). Please refresh the page or log in again to upload your resume.');
            } else {
                // Fallback: Save document filename into user profile so onboarding can be completed even if API endpoint is unreachable
                try {
                    await updateProfile(user.id, {
                        cvUrl: file.name,
                        resume: file.name,
                        cvName: file.name,
                        resumeName: file.name
                    });
                    setCvName(file.name);
                    setSelectedCvFile(null);
                } catch (fallbackErr: any) {
                    console.error('Profile update fallback error:', fallbackErr);
                    setCvError(fallbackErr?.message || 'Failed to save document. Please try again.');
                }
            }
        } finally {
            setIsUploadingCV(false);
        }
    };

    const handleCompleteOnboarding = () => {
        if (user) {
            useAuthStore.getState().setNewUser(false);
        }
        navigate('/student/jobs', { replace: true });
    };

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
                <Loader2 className="animate-spin text-black w-8 h-8" />
            </div>
        );
    }

    const steps = [
        { title: 'Profile', desc: 'Personal & Preference Details' },
        { title: 'CV Upload', desc: 'Professional Resume' }
    ];

    return (
        <PageTransition className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4 sm:p-8 font-sans text-black overflow-hidden relative selection:bg-black/10">
            {/* Elegant Background Grid & Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-black opacity-[0.03] blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10 flex flex-col items-center py-12">

                {/* Step Indicator */}
                <div className="w-full max-w-2xl mx-auto mb-12 relative">
                    <div className="flex justify-between items-center relative z-10">
                        {steps.map((s, idx) => {
                            const isCompleted = onboardingStep > idx;
                            const isActive = onboardingStep === idx;
                            return (
                                <div key={idx} className="flex flex-col items-center flex-1 relative">
                                    {idx < steps.length - 1 && (
                                        <div className="absolute top-5 left-1/2 w-full h-[2px] bg-gray-200 -z-10">
                                            <div
                                                className="h-full bg-black transition-all duration-300"
                                                style={{ width: onboardingStep > idx ? '100%' : '0%' }}
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-2 duration-300 ${isCompleted
                                                ? 'bg-black border-black text-white'
                                                : isActive
                                                    ? 'bg-white border-black text-black ring-4 ring-black/10'
                                                    : 'bg-white border-gray-200 text-gray-400'
                                            }`}
                                    >
                                        {isCompleted ? <Check className="w-5 h-5" /> : idx + 1}
                                    </div>
                                    <span className={`text-xs font-bold mt-2 ${isActive ? 'text-black' : 'text-gray-400'}`}>{s.title}</span>
                                    <span className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{s.desc}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* Profile Step */}
                    {onboardingStep === 0 && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full max-w-3xl bg-white border border-gray-200/80 p-8 sm:p-10 rounded-3xl shadow-xl flex flex-col space-y-8"
                        >
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight text-center">Complete Your Profile</h2>
                                <p className="text-sm text-gray-500 mt-2 text-center leading-relaxed">
                                    Provide your professional criteria. SQUREX matches you with opportunities matching this profile.
                                </p>
                            </div>

                            <form
                                onSubmit={handleProfileSubmit}
                                onKeyDown={(e) => {
                                    // Prevent accidental form submission when pressing Enter in input or select fields
                                    if (e.key === 'Enter') {
                                        const target = e.target as HTMLElement;
                                        const tagName = target?.tagName?.toUpperCase();
                                        if (tagName !== 'TEXTAREA' && tagName !== 'BUTTON') {
                                            e.preventDefault();
                                        }
                                    }
                                }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Full Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Full Legal Name</label>
                                        <Input
                                            required
                                            placeholder="e.g. Jane Doe"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Email Address</label>
                                        <Input
                                            disabled
                                            type="email"
                                            placeholder="e.g. jane.doe@example.com"
                                            value={email}
                                            className="h-12 rounded-xl bg-gray-100 cursor-not-allowed opacity-75"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Phone Number</label>
                                        <div className="flex gap-2 items-center">
                                            {user?.country?.code && (
                                                <div className="flex items-center gap-1.5 h-12 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 select-none">
                                                    <img src={`https://flagcdn.com/w40/${user.country.code.toLowerCase()}.png`} alt={`${user.country.name || ''} flag`} className="w-6 h-4 object-cover rounded" />
                                                    <span>{user.country.phoneCode}</span>
                                                </div>
                                            )}
                                            <Input
                                                disabled
                                                placeholder="e.g. 555-0199"
                                                value={phone}
                                                className="h-12 rounded-xl flex-1 bg-gray-100 cursor-not-allowed opacity-75"
                                            />
                                        </div>
                                    </div>

                                    {/* Education */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Education / Degree</label>
                                        <Input
                                            required
                                            placeholder="Search & select education..."
                                            value={educationQuery}
                                            onChange={(e) => {
                                                setEducationQuery(e.target.value);
                                                setShowEduSuggestions(true);
                                            }}
                                            onFocus={() => setShowEduSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowEduSuggestions(false), 250)}
                                            className="h-12 rounded-xl"
                                        />
                                        {showEduSuggestions && educationsData?.data && educationsData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                                                {educationsData.data.map((edu: any) => (
                                                    <button
                                                        key={edu._id || edu.name}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setEducation(edu.name);
                                                            setEducationQuery(edu.name);
                                                            setShowEduSuggestions(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-black"
                                                    >
                                                        {edu.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Experience Level */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Experience Level</label>
                                        <select
                                            required
                                            value={experienceLevelId}
                                            onChange={(e) => {
                                                const selId = e.target.value;
                                                setExperienceLevelId(selId);
                                                const found = experienceLevelsData?.data?.find((el: any) => el._id === selId);
                                                setExperienceLevel(found?.name || '');
                                            }}
                                            className="w-full h-12 bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-3 text-sm font-semibold outline-none transition-all cursor-pointer"
                                        >
                                            <option value="">Select Experience Level</option>
                                            {experienceLevelsData?.data?.map((el: any) => (
                                                <option key={el._id || el.name} value={el._id}>
                                                    {el.name === 'Fresher' || el.name.includes('Years') ? el.name : `${el.name} Years`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Expected Salary */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Expected Salary (Annual)</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={expectedSalaryCurrency}
                                                onChange={(e) => setExpectedSalaryCurrency(e.target.value)}
                                                className="h-12 w-28 bg-white border border-gray-200 focus:border-black rounded-xl px-2 text-xs font-semibold outline-none transition-all shrink-0"
                                            >
                                                <option value="">Currency</option>
                                                {currenciesData?.data?.map((c: any) => (
                                                    <option key={c._id} value={c._id}>{c.code} ({c.symbol})</option>
                                                ))}
                                            </select>
                                            <Input
                                                type="number"
                                                placeholder="e.g. 1800000"
                                                value={expectedSalaryAmount}
                                                onChange={(e) => setExpectedSalaryAmount(e.target.value)}
                                                className="h-12 rounded-xl flex-1"
                                            />
                                        </div>
                                    </div>

                                    {/* Current Salary */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1 flex items-center justify-between">
                                            <span>Current Salary (Annual)</span>
                                            <span className="text-[10px] text-gray-400 font-normal lowercase">{experienceLevel === 'Fresher' ? '(optional for freshers)' : '(required)'}</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                value={currentSalaryCurrency}
                                                onChange={(e) => setCurrentSalaryCurrency(e.target.value)}
                                                className="h-12 w-28 bg-white border border-gray-200 focus:border-black rounded-xl px-2 text-xs font-semibold outline-none transition-all shrink-0"
                                            >
                                                <option value="">Currency</option>
                                                {currenciesData?.data?.map((c: any) => (
                                                    <option key={c._id} value={c._id}>{c.code} ({c.symbol})</option>
                                                ))}
                                            </select>
                                            <Input
                                                type="number"
                                                placeholder={experienceLevel === 'Fresher' ? "e.g. 0 or stipend / salary" : "e.g. 1200000"}
                                                value={currentSalaryAmount}
                                                onChange={(e) => setCurrentSalaryAmount(e.target.value)}
                                                className="h-12 rounded-xl flex-1"
                                            />
                                        </div>
                                    </div>

                                    {/* Primary Domain */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Primary Domain</label>
                                        <div className="space-y-2">
                                            <select
                                                value={domain}
                                                onChange={(e) => setDomain(e.target.value)}
                                                className="w-full h-12 bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-3 text-sm font-semibold outline-none transition-all cursor-pointer"
                                            >
                                                <option value="">Select Primary Domain</option>
                                                {allDomainsData?.data?.map((d: any) => (
                                                    <option key={d._id || d.name} value={d._id}>{d.name}</option>
                                                ))}
                                                <option value="other">Other</option>
                                            </select>
                                            {domain === 'other' && (
                                                <Input
                                                    placeholder="Enter Custom Domain"
                                                    value={customDomain}
                                                    onChange={(e) => setCustomDomain(e.target.value)}
                                                    className="h-12 rounded-xl"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Preferred Job Role */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Job Role (Domain) (comma-separated)</label>
                                        <Input
                                            required
                                            placeholder="e.g. Software Engineering, UI/UX Design"
                                            value={careerGoal}
                                            onChange={(e) => {
                                                setCareerGoal(e.target.value);
                                                setShowDomainSuggestions(true);
                                            }}
                                            onFocus={() => setShowDomainSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowDomainSuggestions(false), 250)}
                                            className="h-12 rounded-xl"
                                        />
                                        {showDomainSuggestions && getFilteredDomains().length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-2 flex flex-wrap gap-1.5">
                                                {getFilteredDomains().map((d: any) => (
                                                    <button
                                                        key={d._id || d.name}
                                                        type="button"
                                                        onMouseDown={() => handleAddDomain(d.name)}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-black hover:text-white rounded-lg transition-colors cursor-pointer text-black"
                                                    >
                                                        + {d.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Preferred Location */}
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Location (comma-separated)</label>
                                        <Input
                                            required
                                            placeholder="e.g. Remote, New York, San Francisco"
                                            value={location}
                                            onChange={(e) => {
                                                setLocation(e.target.value);
                                                setShowLocationSuggestions(true);
                                            }}
                                            onFocus={() => setShowLocationSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 250)}
                                            className="h-12 rounded-xl"
                                        />
                                        {showLocationSuggestions && getFilteredLocations().length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-2 flex flex-wrap gap-1.5">
                                                {getFilteredLocations().map((l: any) => (
                                                    <button
                                                        key={l._id || l.name}
                                                        type="button"
                                                        onMouseDown={() => handleAddLocation(getLocationLabel(l), l._id)}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-black hover:text-white rounded-lg transition-colors cursor-pointer text-black"
                                                    >
                                                        + {getLocationLabel(l)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>                                    {/* Job Type */}
                                    <div className="space-y-1.5 md:col-span-2 relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Job Type</label>
                                        <Input
                                            required={!jobType}
                                            placeholder="Select preferred job types"
                                            value={jobTypeQuery}
                                            onChange={(e) => {
                                                setJobTypeQuery(e.target.value);
                                                setShowJobTypeSuggestions(true);
                                            }}
                                            onFocus={() => setShowJobTypeSuggestions(true)}
                                            onClick={() => setShowJobTypeSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowJobTypeSuggestions(false), 250)}
                                            className="h-12 rounded-xl"
                                        />
                                        {showJobTypeSuggestions && jobTypesData?.data && jobTypesData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                                                {jobTypesData.data
                                                    .filter((jt: any) => {
                                                        const lastQueryPart = jobTypeQuery.split(',').pop()?.trim() || '';
                                                        return jt.name.toLowerCase().includes(lastQueryPart.toLowerCase());
                                                    })
                                                    .map((jt: any) => {
                                                        const isChecked = selectedJobTypeIds.includes(jt._id);
                                                        return (
                                                            <div
                                                                key={jt._id || jt.name}
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
                                                                    setJobTypeQuery(''); // Keep it blank to show all suggestions
                                                                }}
                                                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors cursor-pointer select-none text-black font-semibold"
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
                                                        <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-gray-100 text-gray-800 font-semibold py-1 px-3 rounded-full text-xs">
                                                            {name}
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
                                                                className="hover:text-red-500 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] ml-0.5 cursor-pointer font-bold border-none bg-transparent"
                                                            >
                                                                ✕
                                                            </button>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Skills */}
                                    <div className="space-y-1.5 md:col-span-2 relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Skills (comma-separated)</label>
                                        <Input
                                            required
                                            placeholder="e.g. React, TypeScript, Python, Tailwind"
                                            value={skills}
                                            onChange={(e) => {
                                                setSkills(e.target.value);
                                                setShowSkillSuggestions(true);
                                            }}
                                            onFocus={() => setShowSkillSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 250)}
                                            className="h-12 rounded-xl"
                                        />
                                        {showSkillSuggestions && getFilteredSkills().length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-2 flex flex-wrap gap-1.5">
                                                {getFilteredSkills().map((s: any) => (
                                                    <button
                                                        key={s._id || s.name}
                                                        type="button"
                                                        onMouseDown={() => handleAddSkill(s.name)}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-black hover:text-white rounded-lg transition-colors cursor-pointer text-black"
                                                    >
                                                        + {s.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── PERSONAL DETAILS ADDITIONS ─── */}
                                    <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Personal Details</h3>
                                    </div>

                                    {/* Gender */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Gender</label>
                                        <select
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                            className="w-full h-12 bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-3 text-sm font-semibold outline-none transition-all"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {/* DOB */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Date of Birth (DOB)</label>
                                        <Input
                                            placeholder="DD/MM/YYYY"
                                            value={dob}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                let formatted = digits;
                                                if (digits.length > 4) {
                                                    formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
                                                } else if (digits.length > 2) {
                                                    formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                                                }
                                                setDob(formatted);
                                            }}
                                            maxLength={10}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Current Location */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Current Location</label>
                                        <Input
                                            placeholder="e.g. London, UK"
                                            value={currentLocation}
                                            onChange={(e) => setCurrentLocation(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Hometown / Native Place */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Hometown / Native Place</label>
                                        <Input
                                            placeholder="e.g. Mumbai"
                                            value={hometown}
                                            onChange={(e) => setHometown(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Hometown Country */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Hometown Country</label>
                                        <select
                                            value={hometownCountry}
                                            onChange={(e) => setHometownCountry(e.target.value)}
                                            className="w-full h-12 bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-3 text-sm font-semibold outline-none transition-all cursor-pointer"
                                        >
                                            <option value="">Select Country</option>
                                            {countriesData?.data?.map((c: any) => (
                                                <option key={c._id || c.name} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Languages Known */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Languages Known</label>
                                        <Input
                                            placeholder="e.g. English, Spanish, Hindi"
                                            value={languages}
                                            onChange={(e) => setLanguages(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Profile Summary */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Profile Summary</label>
                                        <textarea
                                            placeholder="Briefly describe your professional profile and goals..."
                                            value={profileSummary}
                                            onChange={(e) => setProfileSummary(e.target.value)}
                                            rows={3}
                                            className="w-full bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl p-3 text-sm font-semibold outline-none transition-all resize-none shadow-sm"
                                        />
                                    </div>

                                    {/* ─── EDUCATION LEVEL DETAILED ADDITIONS ─── */}
                                    <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Academic Qualifications</h3>
                                    </div>

                                    {/* Highest Education Selector */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Highest Education Level</label>
                                        <select
                                            value={highestEducation}
                                            onChange={(e) => setHighestEducation(e.target.value)}
                                            className="w-full h-12 bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-3 text-sm font-semibold outline-none transition-all"
                                        >
                                            <option value="">Select Level</option>
                                            <option value="PG">Post Graduate (PG)</option>
                                            <option value="UG">Under Graduate (UG)</option>
                                            <option value="High School">High School</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {/* Conditional fields if PG is selected */}
                                    {highestEducation === 'PG' && (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">University Name (PG)</label>
                                                <Input
                                                    placeholder="e.g. Oxford University"
                                                    value={pgUniversity}
                                                    onChange={(e) => setPgUniversity(e.target.value)}
                                                    className="h-12 rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Graduation University Name</label>
                                                <Input
                                                    placeholder="e.g. Delhi University"
                                                    value={graduationUniversity}
                                                    onChange={(e) => setGraduationUniversity(e.target.value)}
                                                    className="h-12 rounded-xl"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Conditional fields if UG is selected */}
                                    {highestEducation === 'UG' && (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">University Name (UG)</label>
                                                <Input
                                                    placeholder="e.g. Stanford University"
                                                    value={ugUniversity}
                                                    onChange={(e) => setUgUniversity(e.target.value)}
                                                    className="h-12 rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">School / College Name</label>
                                                <Input
                                                    placeholder="e.g. St. Francis College"
                                                    value={schoolCollegeName}
                                                    onChange={(e) => setSchoolCollegeName(e.target.value)}
                                                    className="h-12 rounded-xl"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* ─── EMPLOYMENT HISTORY ─── */}
                                    <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Employment History</h3>
                                            <Button
                                                type="button"
                                                onClick={() => setEmploymentHistory([...employmentHistory, {
                                                    companyName: '',
                                                    jobTitle: '',
                                                    employmentType: '',
                                                    isCurrentEmployment: false,
                                                    joiningDate: '',
                                                    totalExperienceYears: undefined,
                                                    totalExperienceMonths: undefined,
                                                    currentSalary: null,
                                                    skillsUsed: [],
                                                    jobProfile: '',
                                                    noticePeriod: ''
                                                }])}
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs font-bold px-3 border-gray-200"
                                            >
                                                + Add Employment
                                            </Button>
                                        </div>
                                        {employmentHistory.length === 0 ? (
                                            <p className="text-xs text-gray-400 pl-1 italic">
                                                {experienceLevel === 'Fresher'
                                                    ? 'Fresher candidate (employment history optional). Click + Add Employment if you have work experience.'
                                                    : 'No employment history added yet. Click + Add Employment to record previous jobs.'}
                                            </p>
                                        ) : (
                                            <div className="space-y-4">
                                                {employmentHistory.map((emp, idx) => (
                                                    <div key={idx} className="bg-gray-50/60 p-4 rounded-2xl border border-gray-100 space-y-3">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                            <select
                                                                value={emp.employmentType || ''}
                                                                onChange={(e) => {
                                                                    const c = [...employmentHistory];
                                                                    c[idx] = { ...c[idx], employmentType: e.target.value };
                                                                    setEmploymentHistory(c);
                                                                }}
                                                                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-black/10"
                                                            >
                                                                <option value="">Select Employment Type</option>
                                                                {jobTypesData?.data?.map((jt: any) => (
                                                                    <option key={jt._id} value={jt._id}>{jt.name}</option>
                                                                ))}
                                                            </select>
                                                            <Input
                                                                placeholder="Company Name"
                                                                value={emp.companyName || ''}
                                                                onChange={(e) => {
                                                                    const c = [...employmentHistory];
                                                                    c[idx] = { ...c[idx], companyName: e.target.value };
                                                                    setEmploymentHistory(c);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                            <Input
                                                                placeholder="Job Title / Role"
                                                                value={emp.jobTitle || ''}
                                                                onChange={(e) => {
                                                                    const c = [...employmentHistory];
                                                                    c[idx] = { ...c[idx], jobTitle: e.target.value };
                                                                    setEmploymentHistory(c);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                            <Input
                                                                type="date"
                                                                title="Joining Date"
                                                                value={toDateInputValue(emp.joiningDate)}
                                                                onClick={(e) => {
                                                                    try {
                                                                        (e.target as HTMLInputElement).showPicker?.();
                                                                    } catch {}
                                                                }}
                                                                onChange={(e) => {
                                                                    const c = [...employmentHistory];
                                                                    c[idx] = { ...c[idx], joiningDate: e.target.value };
                                                                    setEmploymentHistory(c);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold cursor-pointer"
                                                            />
                                                            <Input
                                                                type="number"
                                                                placeholder="Total Exp (Years)"
                                                                value={emp.totalExperienceYears != null ? String(emp.totalExperienceYears) : ''}
                                                                onChange={(e) => {
                                                                    const c = [...employmentHistory];
                                                                    c[idx] = { ...c[idx], totalExperienceYears: e.target.value ? Number(e.target.value) : undefined };
                                                                    setEmploymentHistory(c);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                            <Input
                                                                type="number"
                                                                placeholder="Total Exp (Months)"
                                                                value={emp.totalExperienceMonths != null ? String(emp.totalExperienceMonths) : ''}
                                                                onChange={(e) => {
                                                                    const c = [...employmentHistory];
                                                                    c[idx] = { ...c[idx], totalExperienceMonths: e.target.value ? Number(e.target.value) : undefined };
                                                                    setEmploymentHistory(c);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                                                                    className="h-11 w-28 bg-white border border-gray-200 rounded-xl px-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-black/10 shrink-0"
                                                                >
                                                                    <option value="">Currency</option>
                                                                    {currenciesData?.data?.map((curr: any) => (
                                                                        <option key={curr._id} value={curr._id}>{curr.code} ({curr.symbol})</option>
                                                                    ))}
                                                                </select>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Salary (e.g. 50000)"
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
                                                                    className="h-11 rounded-xl bg-white text-xs font-semibold flex-1"
                                                                />
                                                            </div>
                                                            <Input
                                                                placeholder="Notice Period (e.g. 1 Month)"
                                                                value={emp.noticePeriod || ''}
                                                                onChange={(e) => {
                                                                    const c = [...employmentHistory];
                                                                    c[idx] = { ...c[idx], noticePeriod: e.target.value };
                                                                    setEmploymentHistory(c);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                id={`onb-emp-current-${idx}`}
                                                                checked={!!emp.isCurrentEmployment}
                                                                onChange={(e) => {
                                                                    const c = [...employmentHistory];
                                                                    c[idx] = { ...c[idx], isCurrentEmployment: e.target.checked };
                                                                    setEmploymentHistory(c);
                                                                }}
                                                                className="rounded border-gray-300 w-4 h-4 cursor-pointer"
                                                            />
                                                            <label htmlFor={`onb-emp-current-${idx}`} className="text-xs font-semibold text-gray-600 cursor-pointer select-none">
                                                                Current Employment
                                                            </label>
                                                        </div>
                                                        <div>
                                                            <Input
                                                                placeholder="Key Skills Used (comma-separated, e.g. React, Node.js)"
                                                                value={Array.isArray(emp.skillsUsed)
                                                                    ? emp.skillsUsed.map((s: any) => {
                                                                        if (typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s)) {
                                                                            const found = allSkillsData?.data?.find((sd: any) => sd._id === s) || skillsData?.data?.find((sd: any) => sd._id === s);
                                                                            return found?.name || s;
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
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <textarea
                                                            placeholder="Job Profile / Description of responsibilities..."
                                                            value={emp.jobProfile || ''}
                                                            onChange={(e) => {
                                                                const c = [...employmentHistory];
                                                                c[idx] = { ...c[idx], jobProfile: e.target.value };
                                                                setEmploymentHistory(c);
                                                            }}
                                                            rows={2}
                                                            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-black/10 transition-all resize-none shadow-sm"
                                                        />
                                                        <div className="flex justify-end">
                                                            <Button
                                                                type="button"
                                                                onClick={() => setEmploymentHistory(employmentHistory.filter((_, i) => i !== idx))}
                                                                variant="outline"
                                                                className="h-8 rounded-lg text-xs font-bold text-red-500 border-red-100 hover:bg-red-50 px-2"
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── CERTIFICATIONS DYNAMIC ADD LIST ─── */}
                                    <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Certifications</h3>
                                            <Button
                                                type="button"
                                                onClick={() => setCertifications([...certifications, {
                                                    name: '',
                                                    status: 'undergoing',
                                                    doesNotExpire: false,
                                                    completionId: '',
                                                    url: '',
                                                    validFromMonth: '',
                                                    validFromYear: '',
                                                    validToMonth: '',
                                                    validToYear: ''
                                                }])}
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs font-bold px-3 border-gray-200"
                                            >
                                                + Add Certification
                                            </Button>
                                        </div>
                                        {certifications.length === 0 ? (
                                            <p className="text-xs text-gray-400 pl-1 italic">No certifications added yet.</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {certifications.map((cert, index) => (
                                                    <div key={index} className="bg-gray-50/60 p-4 rounded-2xl border border-gray-100 space-y-3">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                            <Input
                                                                placeholder="Certification Name"
                                                                value={cert.name}
                                                                onChange={(e) => {
                                                                    const copy = [...certifications];
                                                                    copy[index].name = e.target.value;
                                                                    setCertifications(copy);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                            <Input
                                                                placeholder="Completion / License ID"
                                                                value={cert.completionId || ''}
                                                                onChange={(e) => {
                                                                    const copy = [...certifications];
                                                                    copy[index].completionId = e.target.value;
                                                                    setCertifications(copy);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                            <Input
                                                                placeholder="Credential URL (https://...)"
                                                                value={cert.url || ''}
                                                                onChange={(e) => {
                                                                    const copy = [...certifications];
                                                                    copy[index].url = e.target.value;
                                                                    setCertifications(copy);
                                                                }}
                                                                className="h-11 rounded-xl bg-white text-xs font-semibold"
                                                            />
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`cert-status-${index}`}
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
                                                                        className="rounded border-gray-300 text-primary w-4 h-4 cursor-pointer"
                                                                    />
                                                                    <label htmlFor={`cert-status-${index}`} className="text-xs font-semibold text-gray-600 select-none cursor-pointer">
                                                                        Completed
                                                                    </label>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`cert-expire-${index}`}
                                                                        checked={!!cert.doesNotExpire}
                                                                        onChange={(e) => {
                                                                            const copy = [...certifications];
                                                                            copy[index].doesNotExpire = e.target.checked;
                                                                            if (e.target.checked) {
                                                                                copy[index].validToMonth = '';
                                                                                copy[index].validToYear = '';
                                                                            }
                                                                            setCertifications(copy);
                                                                        }}
                                                                        className="rounded border-gray-300 text-primary w-4 h-4 cursor-pointer"
                                                                    />
                                                                    <label htmlFor={`cert-expire-${index}`} className="text-xs font-semibold text-gray-600 select-none cursor-pointer">
                                                                        Does Not Expire
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                            <div>
                                                                <label className="text-[11px] font-bold text-gray-400 block mb-1">Valid From (Month)</label>
                                                                <select
                                                                    value={cert.validFromMonth || ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index].validFromMonth = e.target.value;
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 w-full bg-white border border-gray-200 rounded-lg px-2 text-xs font-semibold outline-none"
                                                                >
                                                                    <option value="">Month</option>
                                                                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-bold text-gray-400 block mb-1">Valid From (Year)</label>
                                                                <select
                                                                    value={cert.validFromYear || ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index].validFromYear = e.target.value;
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 w-full bg-white border border-gray-200 rounded-lg px-2 text-xs font-semibold outline-none"
                                                                >
                                                                    <option value="">Year</option>
                                                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-bold text-gray-400 block mb-1">Valid Till (Month)</label>
                                                                <select
                                                                    disabled={cert.doesNotExpire}
                                                                    value={cert.validToMonth || ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index].validToMonth = e.target.value;
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 w-full bg-white border border-gray-200 rounded-lg px-2 text-xs font-semibold outline-none disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <option value="">Month</option>
                                                                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-bold text-gray-400 block mb-1">Valid Till (Year)</label>
                                                                <select
                                                                    disabled={cert.doesNotExpire}
                                                                    value={cert.validToYear || ''}
                                                                    onChange={(e) => {
                                                                        const copy = [...certifications];
                                                                        copy[index].validToYear = e.target.value;
                                                                        setCertifications(copy);
                                                                    }}
                                                                    className="h-9 w-full bg-white border border-gray-200 rounded-lg px-2 text-xs font-semibold outline-none disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <option value="">Year</option>
                                                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                type="button"
                                                                onClick={() => setCertifications(certifications.filter((_, i) => i !== index))}
                                                                variant="outline"
                                                                className="h-8 rounded-lg text-xs font-bold text-red-500 border-red-100 hover:bg-red-50 px-2"
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── INTERNSHIPS DYNAMIC ADD LIST ─── */}
                                    <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Internships</h3>
                                            <Button
                                                type="button"
                                                onClick={() => setInternships([...(internships || []), { companyName: '', company: '', duration: '', role: '', title: '' } as any])}
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs font-bold px-3 border-gray-200"
                                            >
                                                + Add Internship
                                            </Button>
                                        </div>
                                        {(!internships || internships.length === 0) ? (
                                            <p className="text-xs text-gray-400 pl-1 italic">No internships added yet.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {(internships || []).map((intern, index) => (
                                                    <div key={index} className="space-y-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <Input
                                                                placeholder="Company Name"
                                                                value={intern.companyName || (intern as any).company || ''}
                                                                onChange={(e) => {
                                                                    const copy = [...(internships || [])];
                                                                    copy[index] = {
                                                                        ...copy[index],
                                                                        companyName: e.target.value,
                                                                        company: e.target.value
                                                                    } as any;
                                                                    setInternships(copy);
                                                                }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                            <Input
                                                                placeholder="Duration (e.g. 3 Months)"
                                                                value={intern.duration || ''}
                                                                onChange={(e) => {
                                                                    const copy = [...(internships || [])];
                                                                    copy[index] = {
                                                                        ...copy[index],
                                                                        duration: e.target.value
                                                                    } as any;
                                                                    setInternships(copy);
                                                                }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                            <Input
                                                                placeholder="Role (e.g. Frontend Intern)"
                                                                value={intern.role || (intern as any).title || (intern as any).position || ''}
                                                                onChange={(e) => {
                                                                    const copy = [...(internships || [])];
                                                                    copy[index] = {
                                                                        ...copy[index],
                                                                        role: e.target.value,
                                                                        title: e.target.value,
                                                                        position: e.target.value,
                                                                        designation: e.target.value
                                                                    } as any;
                                                                    setInternships(copy);
                                                                }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                type="button"
                                                                onClick={() => setInternships((internships || []).filter((_, i) => i !== index))}
                                                                variant="outline"
                                                                className="h-8 rounded-lg text-xs font-bold text-red-500 border-red-100 hover:bg-red-50 px-2"
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── AWARDS, PROJECTS & ACHIEVEMENTS ─── */}
                                    <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Projects & Achievements</h3>
                                    </div>

                                    {/* Projects */}
                                    <div className="space-y-2 md:col-span-2">
                                        <div className="flex justify-between items-center pl-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Key Projects</label>
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
                                                className="h-8 rounded-lg text-xs font-bold px-3 border-gray-200"
                                            >
                                                + Add Project
                                            </Button>
                                        </div>
                                        {projects.length === 0 ? (
                                            <p className="text-xs text-gray-400 pl-1 italic">No projects added yet. Click + Add Project to add your major projects.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {projects.map((proj, idx) => (
                                                    <div key={idx} className="space-y-2.5 bg-gray-50/50 p-3.5 rounded-xl border border-gray-100">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <Input
                                                                placeholder="Project Title *"
                                                                value={proj.title || ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], title: e.target.value }; setProjects(c); }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                            <Input
                                                                placeholder="Tag (e.g. #Mobile / Web App)"
                                                                value={proj.tag || ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], tag: e.target.value }; setProjects(c); }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                            <Input
                                                                placeholder="Client (e.g. Internal / ACME)"
                                                                value={proj.client || ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], client: e.target.value }; setProjects(c); }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                            {/* Status */}
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
                                                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10 shadow-sm"
                                                            >
                                                                <option value="Ongoing">Ongoing</option>
                                                                <option value="Completed">Completed</option>
                                                            </select>

                                                            {/* Project Site */}
                                                            <select
                                                                value={proj.projectSite || 'Onsite'}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], projectSite: e.target.value as 'Onsite' | 'Remote' | 'Hybrid' }; setProjects(c); }}
                                                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10 shadow-sm"
                                                            >
                                                                <option value="Onsite">Onsite</option>
                                                                <option value="Remote">Remote</option>
                                                                <option value="Hybrid">Hybrid</option>
                                                            </select>

                                                            {/* Nature of Employment */}
                                                            <select
                                                                value={proj.natureOfEmployment || ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], natureOfEmployment: e.target.value }; setProjects(c); }}
                                                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10 shadow-sm"
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
                                                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10 shadow-sm"
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
                                                            {/* Role (lookup from rolesData) */}
                                                            <select
                                                                value={proj.role || ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], role: e.target.value }; setProjects(c); }}
                                                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10 shadow-sm"
                                                            >
                                                                <option value="">Select Role</option>
                                                                {rolesData?.data?.map((r: any) => (
                                                                    <option key={r._id} value={r._id}>{r.name}</option>
                                                                ))}
                                                            </select>

                                                            <Input
                                                                placeholder="Location (e.g. London / India)"
                                                                value={proj.location || ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], location: e.target.value }; setProjects(c); }}
                                                                className="h-10 rounded-lg bg-white"
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
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                            <Input
                                                                type="number"
                                                                placeholder="From Year"
                                                                value={proj.workedFromYear != null ? String(proj.workedFromYear) : ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], workedFromYear: e.target.value ? Number(e.target.value) : undefined }; setProjects(c); }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                            <Input
                                                                type="number"
                                                                placeholder={proj.status === 'Ongoing' ? 'Ongoing' : 'Till Month'}
                                                                min={1}
                                                                max={12}
                                                                disabled={proj.status === 'Ongoing'}
                                                                value={proj.status !== 'Ongoing' && proj.workedTillMonth != null ? String(proj.workedTillMonth) : ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], workedTillMonth: e.target.value ? Number(e.target.value) : undefined }; setProjects(c); }}
                                                                className={`h-10 rounded-lg bg-white ${proj.status === 'Ongoing' ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                                                            />
                                                            <Input
                                                                type="number"
                                                                placeholder={proj.status === 'Ongoing' ? 'Present' : 'Till Year'}
                                                                disabled={proj.status === 'Ongoing'}
                                                                value={proj.status !== 'Ongoing' && proj.workedTillYear != null ? String(proj.workedTillYear) : ''}
                                                                onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], workedTillYear: e.target.value ? Number(e.target.value) : undefined }; setProjects(c); }}
                                                                className={`h-10 rounded-lg bg-white ${proj.status === 'Ongoing' ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                                                            />
                                                        </div>

                                                        <Input
                                                            placeholder="Skills Used (e.g. React, Node.js, GraphQL)"
                                                            value={proj.skillsUsed || ''}
                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], skillsUsed: e.target.value }; setProjects(c); }}
                                                            className="h-10 rounded-lg bg-white"
                                                        />

                                                        {/* Details */}
                                                        <textarea
                                                            placeholder="Project details..."
                                                            value={proj.details || ''}
                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], details: e.target.value }; setProjects(c); }}
                                                            rows={2}
                                                            className="w-full bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl p-3 text-sm font-semibold outline-none transition-all resize-none shadow-sm"
                                                        />

                                                        {/* Role Description */}
                                                        <textarea
                                                            placeholder="Role description & key responsibilities..."
                                                            value={proj.roleDescription || ''}
                                                            onChange={(e) => { const c = [...projects]; c[idx] = { ...c[idx], roleDescription: e.target.value }; setProjects(c); }}
                                                            rows={2}
                                                            className="w-full bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl p-3 text-sm font-semibold outline-none transition-all resize-none shadow-sm"
                                                        />

                                                        <div className="flex justify-end">
                                                            <Button
                                                                type="button"
                                                                onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                                                                variant="outline"
                                                                className="h-8 rounded-lg text-xs font-bold text-red-500 border-red-100 hover:bg-red-50 px-2"
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Awards */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Awards & Recognitions</label>
                                        <textarea
                                            placeholder="Write about key awards and recognitions..."
                                            value={awards}
                                            onChange={(e) => setAwards(e.target.value)}
                                            rows={3}
                                            className="w-full bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl p-3 text-sm font-semibold outline-none transition-all resize-none shadow-sm"
                                        />
                                    </div>

                                    {/* Other Achievements */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Other Achievements</label>
                                        <textarea
                                            placeholder="Write about any other key accomplishments..."
                                            value={otherAchievements}
                                            onChange={(e) => setOtherAchievements(e.target.value)}
                                            rows={3}
                                            className="w-full bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl p-3 text-sm font-semibold outline-none transition-all resize-none shadow-sm"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isProfileSaving}
                                    className="w-full h-14 bg-black text-white hover:bg-black/90 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] active:scale-95 mt-4"
                                >
                                    {isProfileSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Save & Continue <ArrowRight className="w-5 h-5" /></>}
                                </Button>
                            </form>
                        </motion.div>
                    )}

                    {/* CV Upload Step */}
                    {onboardingStep === 1 && (
                        <motion.div
                            key="cv"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full max-w-xl bg-white border border-gray-200/80 p-8 rounded-3xl shadow-xl flex flex-col items-center text-center space-y-6"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <UploadCloud className="w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Upload Your Curriculum Vitae (CV)</h2>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    Recruiters will view this document when you apply to roles. Make sure it is clear and up to date.
                                </p>
                            </div>

                            {cvError && (
                                <div className="w-full p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-600 flex items-center gap-2.5">
                                    <span className="text-sm shrink-0">⚠️</span>
                                    <span>{cvError}</span>
                                </div>
                            )}

                            <div className="border-2 border-dashed border-gray-200 hover:border-black/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-gray-50 transition-colors relative cursor-pointer group w-full">
                                {isUploadingCV ? (
                                    <div className="flex flex-col items-center gap-4 py-8">
                                        <Loader2 className="w-8 h-8 text-black animate-spin" />
                                        <p className="text-sm font-medium">Uploading your document...</p>
                                    </div>
                                ) : profile?.cvUrl ? (
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <Check className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-bold text-gray-900">Document Uploaded Successfully!</h4>
                                        <p className="text-xs text-gray-500 truncate max-w-[250px]">{cvName || "Resume_Document.pdf"}</p>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (typeof window !== 'undefined') {
                                                    localStorage.setItem(`squrx_deleted_cv_${user.id}`, 'true');
                                                }
                                                await updateProfile(user.id, { cvUrl: null, resume: null, cvName: null, resumeName: null });
                                                setCvName("");
                                                setSelectedCvFile(null);
                                                setCvError(null);
                                            }}
                                            className="text-red-500 hover:underline text-xs font-bold mt-2"
                                        >
                                            Remove & Re-upload
                                        </button>
                                    </div>
                                ) : selectedCvFile ? (
                                    <div className="flex flex-col items-center gap-4 py-4 w-full">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <UploadCloud className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-gray-900 mb-1">Ready to upload</h4>
                                            <p className="text-xs text-gray-500 truncate max-w-[260px] font-medium">{selectedCvFile.name}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">{(selectedCvFile.size / 1024).toFixed(0)} KB</p>
                                        </div>
                                        <div className="flex gap-3 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedCvFile(null); setCvError(null); }}
                                                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-100 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCVUpload}
                                                className="px-5 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-black/90 transition-colors flex items-center gap-2"
                                            >
                                                <UploadCloud className="w-3.5 h-3.5" /> Upload Document
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={24} />
                                        </div>
                                        <h4 className="font-bold text-gray-900 mb-1">Select your CV / Resume</h4>
                                        <p className="text-xs text-gray-500 max-w-[220px]">PDF, DOC, DOCX · Max 1MB</p>
                                        <Button size="sm" className="mt-6 font-semibold px-6 bg-black text-white hover:bg-black/90">Browse File</Button>
                                    </>
                                )}
                                {!profile?.cvUrl && !selectedCvFile && (
                                    <input
                                        type="file"
                                        onChange={handleFileSelected}
                                        disabled={isUploadingCV}
                                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
                                    />
                                )}
                            </div>

                            <Button
                                onClick={handleCompleteOnboarding}
                                disabled={!profile?.cvUrl}
                                className="w-full h-14 bg-black text-white hover:bg-black/90 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95"
                            >
                                Complete Onboarding & Find Jobs <ArrowRight className="w-5 h-5" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
