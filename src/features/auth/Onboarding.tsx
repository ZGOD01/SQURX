import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store';
import { useStudentStore } from '../student/store';
import { Button, Input } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { ArrowRight, Loader2, Check, UploadCloud } from 'lucide-react';
import { consultationApi } from '@/lib/consultationApi';
import {
    useGetEducationsQuery,
    useGetSkillsQuery,
    useGetJobTypesQuery,
    useGetExperienceLevelsQuery,
    useGetLocationsQuery,
    useGetDomainsQuery
} from '@/lib/store/authApi';



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

    const [experienceLevel, setExperienceLevel] = useState('Fresher');
    const [experienceLevelQuery, setExperienceLevelQuery] = useState('Fresher');
    const [showExpSuggestions, setShowExpSuggestions] = useState(false);

    const [careerGoal, setCareerGoal] = useState('');
    const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);

    const [location, setLocation] = useState('');
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    // Track IDs of selected locations immediately on selection (not re-resolved at submit)
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

    const [jobType, setJobType] = useState('Full-Time');
    const [jobTypeQuery, setJobTypeQuery] = useState('Full-Time');
    const [showJobTypeSuggestions, setShowJobTypeSuggestions] = useState(false);
    const [selectedJobTypeIds, setSelectedJobTypeIds] = useState<string[]>([]);

    const [expectedSalary, setExpectedSalary] = useState('');
    const [currentSalary, setCurrentSalary] = useState('');

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

    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [isUploadingCV, setIsUploadingCV] = useState(false);
    const [cvName, setCvName] = useState('');
    const [selectedCvFile, setSelectedCvFile] = useState<File | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasCheckedInitialState, setHasCheckedInitialState] = useState(false);

    const currentSkillsParts = skills.split(',');
    const lastSkillPart = currentSkillsParts[currentSkillsParts.length - 1].trim();

    const currentDomainParts = careerGoal.split(',');
    const lastDomainPart = currentDomainParts[currentDomainParts.length - 1].trim();

    const currentLocationParts = location.split(',');
    const lastLocationPart = currentLocationParts[currentLocationParts.length - 1].trim();

    const { data: educationsData } = useGetEducationsQuery({ search: educationQuery });
    const { data: skillsData } = useGetSkillsQuery({ search: lastSkillPart });
    const { data: jobTypesData } = useGetJobTypesQuery(undefined);
    const { data: experienceLevelsData } = useGetExperienceLevelsQuery({ search: experienceLevelQuery });
    const { data: locationsData } = useGetLocationsQuery({ search: lastLocationPart });
    const { data: domainsData } = useGetDomainsQuery({ search: lastDomainPart });

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
            const locationName = l.name.toLowerCase();
            return !selectedLocationsSet.has(locationName);
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
            const initialEducation = profile?.education || '';
            setEducation(initialEducation);
            setEducationQuery(initialEducation);

            setSkills(profile?.skills ? profile.skills.join(', ') : '');

            const initialExp = profile?.experienceLevel || 'Fresher';
            setExperienceLevel(initialExp);
            setExperienceLevelQuery(initialExp === 'Fresher' || initialExp.includes('Years') ? initialExp : `${initialExp} Years`);

            const initialCareerGoal = profile?.careerGoal || '';
            setCareerGoal(initialCareerGoal);

            const initialLocation = profile?.location || '';
            setLocation(initialLocation);

            const initialJobType = profile?.jobType || 'Full-Time';
            setJobType(initialJobType);
            setJobTypeQuery(initialJobType);

            setExpectedSalary(profile?.expectedSalary || '');
            setCurrentSalary(profile?.currentSalary || '');

            setGender(profile?.gender || '');
            setDob(profile?.dob || '');
            setCurrentLocation(profile?.currentLocation || '');
            setHometown(profile?.hometown || '');
            setHighestEducation(profile?.highestEducation || '');
            setPgUniversity(profile?.pgUniversity || '');
            setGraduationUniversity(profile?.graduationUniversity || '');
            setUgUniversity(profile?.ugUniversity || '');
            setSchoolCollegeName(profile?.schoolCollegeName || '');
            setLanguages(profile?.languages || '');
            setCertifications(profile?.certifications || []);
            setAwards(profile?.awards || '');
            setProjects(profile?.projects || '');
            setInternships(profile?.internships || []);
            setProfileSummary(profile?.profileSummary || '');
            setOtherAchievements(profile?.otherAchievements || '');

            if (profile?.cvUrl) {
                const parts = profile.cvUrl.split('/');
                setCvName(parts[parts.length - 1] || 'Resume_Document.pdf');
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



    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!fullName || !email || !phone || !education || !skills || !careerGoal || !location || !jobType || !expectedSalary) {
            alert("All fields are required.");
            return;
        }

        if (experienceLevel !== 'Fresher' && !currentSalary) {
            alert("Current salary is required for experienced candidates.");
            return;
        }

        setIsProfileSaving(true);
        try {
            // Resolve lookup IDs for the backend update request
            const parsedDomains = careerGoal.split(',').map(d => d.trim()).filter(Boolean);
            const domainIds = parsedDomains
                .map(d => domainsData?.data?.find((dd: any) => dd.name.toLowerCase() === d.toLowerCase())?._id)
                .filter(Boolean);

            const eduMatch = educationsData?.data?.find((e: any) => e.name === education);
            const expMatch = experienceLevelsData?.data?.find((e: any) => e.name === experienceLevel);

            // Use pre-captured IDs (populated at selection time) to avoid stale-cache race condition.
            // Fall back to re-resolution only if the user typed locations manually without selecting from dropdown.
            let locationIds = selectedLocationIds.filter(Boolean);
            if (locationIds.length === 0) {
                const parsedLocations = location.split(',').map(l => l.trim()).filter(Boolean);
                locationIds = parsedLocations
                    .map(l => locationsData?.data?.find((ld: any) => ld.name.toLowerCase() === l.toLowerCase())?._id)
                    .filter(Boolean) as string[];
            }

            const parsedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
            const skillIds = parsedSkills
                .map(s => skillsData?.data?.find((sd: any) => sd.name.toLowerCase() === s.toLowerCase())?._id)
                .filter(Boolean);

            const parsedJobTypes = jobType.split(',').map(j => j.trim()).filter(Boolean);

            await updateProfile(user.id, {
                fullName,
                education: eduMatch?._id || education,
                experienceLevel: expMatch?._id || experienceLevel,
                currentSalary: experienceLevel === 'Fresher' ? '' : currentSalary,
                expectedSalary,
                preferredDomains: domainIds,
                skills: skillIds,
                preferredLocations: locationIds,
                preferredJobTypes: selectedJobTypeIds,
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
                otherAchievements
            });
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

        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large. Max size is 5MB.');
            event.target.value = '';
            return;
        }
        const fileName = file.name.toLowerCase();
        const isValidExtension = fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx');
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type) && !isValidExtension) {
            alert('Invalid format. PDF, DOC or DOCX only.');
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
        try {
            const cvUrl = await consultationApi.uploadCv(file);
            await updateProfile(user.id, { cvUrl: cvUrl || file.name });
            setCvName(file.name);
            setSelectedCvFile(null);
        } catch (err) {
            console.error('CV upload error:', err);
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

                            <form onSubmit={handleProfileSubmit} className="space-y-6">
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
                                    <div className="space-y-1.5 relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Experience Level</label>
                                        <Input
                                            required
                                            placeholder="Search & select experience..."
                                            value={experienceLevelQuery}
                                            onChange={(e) => {
                                                setExperienceLevelQuery(e.target.value);
                                                setShowExpSuggestions(true);
                                            }}
                                            onFocus={() => setShowExpSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowExpSuggestions(false), 250)}
                                            className="h-12 rounded-xl"
                                        />
                                        {showExpSuggestions && experienceLevelsData?.data && experienceLevelsData.data.length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto p-1.5 flex flex-col gap-0.5">
                                                {experienceLevelsData.data.map((el: any) => (
                                                    <button
                                                        key={el._id || el.name}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            const displayName = el.name === 'Fresher' ? 'Fresher' : `${el.name} Years`;
                                                            setExperienceLevel(el.name);
                                                            setExperienceLevelQuery(displayName);
                                                            setShowExpSuggestions(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-black"
                                                    >
                                                        {el.name === 'Fresher' ? 'Fresher' : `${el.name} Years`}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Expected Salary */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Expected Salary (Annual)</label>
                                        <Input
                                            required
                                            placeholder="e.g. $85,000"
                                            value={expectedSalary}
                                            onChange={(e) => setExpectedSalary(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Current Salary */}
                                    {experienceLevel !== 'Fresher' && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Current Salary (Annual)</label>
                                            <Input
                                                required
                                                placeholder="e.g. $70,000"
                                                value={currentSalary}
                                                onChange={(e) => setCurrentSalary(e.target.value)}
                                                className="h-12 rounded-xl"
                                            />
                                        </div>
                                    )}                                    {/* Preferred Job Role */}
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
                                                        onMouseDown={() => handleAddLocation(l.name, l._id)}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-black hover:text-white rounded-lg transition-colors cursor-pointer text-black"
                                                    >
                                                        + {l.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Job Type */}
                                    <div className="space-y-1.5 md:col-span-2 relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Job Type</label>
                                        <Input
                                            required
                                            placeholder="Search & select job type..."
                                            value={jobTypeQuery}
                                            onChange={(e) => {
                                                setJobTypeQuery(e.target.value);
                                                setShowJobTypeSuggestions(true);
                                            }}
                                            onFocus={() => setShowJobTypeSuggestions(true)}
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
                                                                    setJobTypeQuery(commaSeparated);
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

                                    {/* Hometown / Native Place & Country */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Hometown / Native Place & Country</label>
                                        <Input
                                            placeholder="e.g. Mumbai, India"
                                            value={hometown}
                                            onChange={(e) => setHometown(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
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

                                    {/* ─── CERTIFICATIONS DYNAMIC ADD LIST ─── */}
                                    <div className="md:col-span-2 border-t border-gray-100 pt-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Certifications</h3>
                                            <Button
                                                type="button"
                                                onClick={() => setCertifications([...certifications, { name: '', status: 'undergoing' }])}
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs font-bold px-3 border-gray-200"
                                            >
                                                + Add Certification
                                            </Button>
                                        </div>
                                        {certifications.length === 0 ? (
                                            <p className="text-xs text-gray-400 pl-1 italic">No certifications added yet.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {certifications.map((cert, index) => (
                                                    <div key={index} className="flex gap-3 items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                        <Input
                                                            placeholder="Certification Name"
                                                            value={cert.name}
                                                            onChange={(e) => {
                                                                const copy = [...certifications];
                                                                copy[index].name = e.target.value;
                                                                setCertifications(copy);
                                                            }}
                                                            className="h-10 rounded-lg flex-1 bg-white"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                id={`cert-status-${index}`}
                                                                checked={cert.status === 'completed'}
                                                                onChange={(e) => {
                                                                    const copy = [...certifications];
                                                                    copy[index].status = e.target.checked ? 'completed' : 'undergoing';
                                                                    setCertifications(copy);
                                                                }}
                                                                className="rounded border-gray-300 text-primary w-4 h-4 cursor-pointer"
                                                            />
                                                            <label htmlFor={`cert-status-${index}`} className="text-xs font-semibold text-gray-600 select-none cursor-pointer">
                                                                Completed
                                                            </label>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            onClick={() => setCertifications(certifications.filter((_, i) => i !== index))}
                                                            variant="outline"
                                                            className="h-8 w-8 p-0 text-red-500 border-red-100 hover:bg-red-50 rounded-lg flex items-center justify-center"
                                                        >
                                                            ✕
                                                        </Button>
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
                                                onClick={() => setInternships([...internships, { companyName: '', duration: '', role: '' }])}
                                                variant="outline"
                                                className="h-8 rounded-lg text-xs font-bold px-3 border-gray-200"
                                            >
                                                + Add Internship
                                            </Button>
                                        </div>
                                        {internships.length === 0 ? (
                                            <p className="text-xs text-gray-400 pl-1 italic">No internships added yet.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {internships.map((intern, index) => (
                                                    <div key={index} className="space-y-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <Input
                                                                placeholder="Company Name"
                                                                value={intern.companyName}
                                                                onChange={(e) => {
                                                                    const copy = [...internships];
                                                                    copy[index].companyName = e.target.value;
                                                                    setInternships(copy);
                                                                }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                            <Input
                                                                placeholder="Duration (e.g. 3 Months)"
                                                                value={intern.duration}
                                                                onChange={(e) => {
                                                                    const copy = [...internships];
                                                                    copy[index].duration = e.target.value;
                                                                    setInternships(copy);
                                                                }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                            <Input
                                                                placeholder="Role (e.g. Frontend Intern)"
                                                                value={intern.role}
                                                                onChange={(e) => {
                                                                    const copy = [...internships];
                                                                    copy[index].role = e.target.value;
                                                                    setInternships(copy);
                                                                }}
                                                                className="h-10 rounded-lg bg-white"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                type="button"
                                                                onClick={() => setInternships(internships.filter((_, i) => i !== index))}
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
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Key Projects</label>
                                        <textarea
                                            placeholder="Write about major projects you worked on..."
                                            value={projects}
                                            onChange={(e) => setProjects(e.target.value)}
                                            rows={3}
                                            className="w-full bg-white border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl p-3 text-sm font-semibold outline-none transition-all resize-none shadow-sm"
                                        />
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

                            <div className="border-2 border-dashed border-gray-200 hover:border-black/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-gray-50 transition-colors relative cursor-pointer group w-full">
                                {isUploadingCV ? (
                                    <div className="flex flex-col items-center gap-4 py-8">
                                        <Loader2 className="w-8 h-8 text-black animate-spin" />
                                        <p className="text-sm font-medium">Uploading your CV...</p>
                                    </div>
                                ) : profile?.cvUrl ? (
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <Check className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-bold text-gray-900">CV Uploaded Successfully!</h4>
                                        <p className="text-xs text-gray-500 truncate max-w-[250px]">{cvName || "Resume_Document.pdf"}</p>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                await updateProfile(user.id, { cvUrl: null });
                                                setCvName("");
                                                setSelectedCvFile(null);
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
                                                onClick={() => setSelectedCvFile(null)}
                                                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-100 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCVUpload}
                                                className="px-5 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-black/90 transition-colors flex items-center gap-2"
                                            >
                                                <UploadCloud className="w-3.5 h-3.5" /> Upload CV
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={24} />
                                        </div>
                                        <h4 className="font-bold text-gray-900 mb-1">Select your CV</h4>
                                        <p className="text-xs text-gray-500 max-w-[200px]">PDF, DOC, DOCX up to 5MB</p>
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
