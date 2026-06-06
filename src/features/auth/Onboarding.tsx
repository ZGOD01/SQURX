import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store';
import { useStudentStore } from '../student/store';
import { Button, Input } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { ArrowRight, Loader2, Check, UploadCloud } from 'lucide-react';

const ALL_DOMAINS = [
    'Software Engineering', 'Data Science & AI', 'Product Management', 'UI/UX Design',
    'Operations & Strategy', 'Quality Assurance', 'Marketing & Growth', 'Sales & BizDev',
    'Finance & Accounting', 'Venture Capital', 'Management Consulting', 'Healthcare',
    'Supply Chain & Logistics', 'Human Resources', 'Legal & Compliance', 'Cybersecurity',
    'Cloud Architecture', 'Mechanical Engineering', 'Electrical Engineering', 'Media & Journalism',
    'Education & EdTech', 'Real Estate', 'Game Development'
].sort();

export function Onboarding() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { updateProfile, profile, fetchDashboardData } = useStudentStore();

    // Onboarding step tracking: 0 = Profile Creation, 1 = CV Upload
    const [onboardingStep, setOnboardingStep] = useState<number>(0);
    const [domainsList, setDomainsList] = useState<string[]>(ALL_DOMAINS);

    // Profile state values
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [education, setEducation] = useState('');
    const [skills, setSkills] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('Fresher');
    const [careerGoal, setCareerGoal] = useState('');
    const [location, setLocation] = useState('');
    const [jobType, setJobType] = useState('Full-Time');
    const [expectedSalary, setExpectedSalary] = useState('');

    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [isUploadingCV, setIsUploadingCV] = useState(false);
    const [cvName, setCvName] = useState(localStorage.getItem('squrx_cv_name') || '');
    const [isInitialized, setIsInitialized] = useState(false);

    // Fetch dashboard/profile data on mount
    useEffect(() => {
        if (user && !profile) {
            fetchDashboardData(user.id).catch(console.error);
        }
    }, [user, profile, fetchDashboardData]);

    // Handle skip-checks and automatic stepping based on completed state
    useEffect(() => {
        if (!profile) return;

        const hasProfile = !!(profile.careerGoal && profile.location && profile.jobType);
        const hasCv = !!profile.cvUrl;

        if (hasProfile && hasCv) {
            navigate('/student/jobs', { replace: true });
        } else if (hasProfile) {
            setOnboardingStep(1);
        } else {
            setOnboardingStep(0);
        }
    }, [profile, user, navigate]);

    // Initialize local form state values once user profile data loads
    useEffect(() => {
        if ((user || profile) && !isInitialized) {
            const savedProfile = JSON.parse(localStorage.getItem('squrx_onboarding_profile') || '{}');
            setFullName(savedProfile.fullName || user?.name || user?.fullName || '');
            setEmail(savedProfile.email || user?.email || '');
            setPhone(savedProfile.phone || user?.mobile || '');
            setEducation(savedProfile.education || '');
            setSkills(savedProfile.skills || (profile?.skills ? profile.skills.join(', ') : ''));
            setExperienceLevel(savedProfile.experienceLevel || 'Fresher');
            setCareerGoal(savedProfile.careerGoal || profile?.careerGoal || '');
            setLocation(savedProfile.location || profile?.location || '');
            setJobType(savedProfile.jobType || profile?.jobType || 'Full-Time');
            setExpectedSalary(savedProfile.expectedSalary || '');
            setIsInitialized(true);
        }
    }, [user, profile, isInitialized]);

    // Fetch available career domains
    useEffect(() => {
        fetch('https://squrx-backend.onrender.com/api/v1/domains')
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    const fetchedDomains = res.data.map((d: any) => d.name);
                    const merged = Array.from(new Set([...ALL_DOMAINS, ...fetchedDomains])).sort();
                    setDomainsList(merged);
                }
            })
            .catch(console.error);
    }, []);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!fullName || !email || !phone || !education || !skills || !careerGoal || !location || !jobType || !expectedSalary) {
            alert("All fields are required.");
            return;
        }

        setIsProfileSaving(true);
        try {
            const onboardingProfile = {
                fullName,
                email,
                phone,
                education,
                skills,
                experienceLevel,
                careerGoal,
                location,
                jobType,
                expectedSalary
            };
            localStorage.setItem('squrx_onboarding_profile', JSON.stringify(onboardingProfile));

            const parsedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
            await updateProfile(user.id, {
                careerGoal,
                location,
                jobType,
                skills: parsedSkills,
                locations: [location],
                jobTypes: [jobType]
            });
            setOnboardingStep(1);
        } catch (err) {
            console.error(err);
        } finally {
            setIsProfileSaving(false);
        }
    };

    const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Max size is 5MB.");
            return;
        }
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
            alert("Invalid format. PDF/DOC/DOCX only.");
            return;
        }

        setIsUploadingCV(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockUrl = URL.createObjectURL(file);
            await updateProfile(user.id, { cvUrl: mockUrl });
            setCvName(file.name);
            localStorage.setItem('squrx_cv_name', file.name);
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploadingCV(false);
        }
    };

    const handleCompleteOnboarding = () => {
        if (user) {
            localStorage.removeItem(`squrx_new_user_${user.id}`);
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
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-2 duration-300 ${
                                            isCompleted 
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
                                    Provide your professional criteria. SQURX matches you with opportunities matching this profile.
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
                                            required
                                            type="email"
                                            placeholder="e.g. jane.doe@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Phone Number</label>
                                        <Input
                                            required
                                            placeholder="e.g. +1 555-0199"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Education */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Education / Degree</label>
                                        <Input
                                            required
                                            placeholder="e.g. B.S. in Computer Science"
                                            value={education}
                                            onChange={(e) => setEducation(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Experience Level */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Experience Level</label>
                                        <select
                                            value={experienceLevel}
                                            onChange={(e) => setExperienceLevel(e.target.value)}
                                            className="w-full h-12 bg-gray-50/50 border border-gray-200 rounded-xl px-4 text-sm font-semibold text-gray-900 transition-all outline-none focus:border-black focus:ring-1 focus:ring-black cursor-pointer"
                                        >
                                            <option value="Fresher">Fresher</option>
                                            <option value="1-3 Years">1-3 Years</option>
                                            <option value="3-5 Years">3-5 Years</option>
                                            <option value="5+ Years">5+ Years</option>
                                        </select>
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

                                    {/* Preferred Job Role */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Job Role (Domain)</label>
                                        <select
                                            value={careerGoal}
                                            onChange={(e) => setCareerGoal(e.target.value)}
                                            className="w-full h-12 bg-gray-50/50 border border-gray-200 rounded-xl px-4 text-sm font-semibold text-gray-900 transition-all outline-none focus:border-black focus:ring-1 focus:ring-black cursor-pointer"
                                        >
                                            <option value="" disabled>Select Preferred Domain</option>
                                            {domainsList.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Preferred Location */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Location</label>
                                        <Input
                                            required
                                            placeholder="e.g. Remote, New York, San Francisco"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className="h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Job Type */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Preferred Job Type</label>
                                        <select
                                            value={jobType}
                                            onChange={(e) => setJobType(e.target.value)}
                                            className="w-full h-12 bg-gray-50/50 border border-gray-200 rounded-xl px-4 text-sm font-semibold text-gray-900 transition-all outline-none focus:border-black focus:ring-1 focus:ring-black cursor-pointer"
                                        >
                                            <option value="Full-Time">Full-Time</option>
                                            <option value="Remote">Remote</option>
                                            <option value="Hybrid">Hybrid</option>
                                            <option value="Contract">Contract</option>
                                        </select>
                                    </div>

                                    {/* Skills */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Skills (comma-separated)</label>
                                        <Input
                                            required
                                            placeholder="e.g. React, TypeScript, Python, Tailwind"
                                            value={skills}
                                            onChange={(e) => setSkills(e.target.value)}
                                            className="h-12 rounded-xl"
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
                                        <p className="text-sm font-medium">Processing document...</p>
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
                                                localStorage.removeItem('squrx_cv_name');
                                            }}
                                            className="text-red-500 hover:underline text-xs font-bold mt-2"
                                        >
                                            Remove & Re-upload
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={24} />
                                        </div>
                                        <h4 className="font-bold text-gray-900 mb-1">Upload your CV</h4>
                                        <p className="text-xs text-gray-500 max-w-[200px]">PDF, DOC, DOCX up to 5MB</p>
                                        <Button size="sm" className="mt-6 font-semibold px-6 bg-black text-white hover:bg-black/90">Select File</Button>
                                    </>
                                )}
                                {!profile?.cvUrl && (
                                    <input
                                        type="file"
                                        onChange={handleCVUpload}
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
