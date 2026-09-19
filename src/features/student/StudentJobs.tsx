import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PageTransition, HoverLift } from '@/components/motion';
import { Card, Button, Badge, Skeleton, Modal, Toast } from '@/components/ui';
import { 
    Search, 
    MapPin, 
    Building2, 
    Briefcase, 
    Filter, 
    Sparkles, 
    Award, 
    Clock, 
    ArrowRight, 
    CheckCircle2,
    WifiOff,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Globe,
    Loader2,
    Star,
    Banknote,
    X,
    SlidersHorizontal
} from 'lucide-react';
import { fetchJobs, fetchJobDetails, fetchRelevantJobs, type ApiJobItem } from '@/lib/jobsApi';
import { useGetCurrenciesQuery, useGetExperienceLevelsQuery } from '@/lib/store/authApi';
import { useNotificationStore } from '@/lib/store/notifications';
import { useStudentStore } from './store';
import { useAuthStore } from '@/features/auth/store';

// ── Country / City mapping for smart location matching ────────────────────────
const INDIA_LOCATIONS = [
    'india', 'in', 'bangalore', 'bengaluru', 'pune', 'mumbai', 'delhi', 
    'new delhi', 'noida', 'gurgaon', 'gurugram', 'hyderabad', 'chennai', 
    'kolkata', 'ahmedabad', 'jaipur', 'chandigarh', 'kochi', 'kerala', 
    'indore', 'bhopal', 'nagpur', 'surat', 'vadodara'
];

const US_LOCATIONS = [
    'us', 'usa', 'united states', 'san francisco', 'sf', 'new york', 'nyc', 
    'austin', 'seattle', 'boston', 'chicago', 'los angeles', 'la', 'california', 
    'texas', 'washington', 'denver', 'atlanta'
];

const UK_LOCATIONS = [
    'uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'edinburgh', 
    'bristol', 'cambridge', 'oxford', 'leeds'
];

// ── Backend Parameter Mappings ───────────────────────────────────────────────
/**
 * Map UI Career Stage directly to backend experienceLevel values: 'Fresher' | '1-3' | '3-5' | '5+'
 */
function mapExperienceLevelToBackend(level: string): string | undefined {
    if (!level || level === 'All') return undefined;
    return level;
}

/**
 * Map UI Industry and Domain to backend taxonomy string (verified from GET /api/v1/domains)
 */
function mapDomainOrIndustryToTaxonomy(industry: string, domain: string): string | undefined {
    const d = (domain || '').trim();
    if (d === 'Engineering') return 'Software Engineering';
    if (d === 'Data Science') return 'Data Science & AI';
    if (d === 'Design') return 'UI/UX Design';
    if (d === 'Product') return 'Product Management';
    if (d === 'Marketing') return 'Marketing & Growth';
    if (d === 'Sales') return 'Sales & BizDev';
    if (d === 'HR') return 'Human Resources';
    if (d === 'Operations') return 'Operations & Strategy';
    if (d === 'Legal') return 'Legal & Compliance';
    if (d === 'Cybersecurity') return 'Cybersecurity';
    if (d === 'Quality Assurance') return 'Quality Assurance';
    if (d && d !== 'Other') return d;

    const ind = (industry || '').trim();
    if (ind === 'IT') return 'Software Engineering';
    if (ind === 'Finance') return 'Finance & Accounting';
    if (ind === 'Healthcare') return 'Healthcare';
    if (ind === 'Education') return 'Education & EdTech';
    if (ind === 'Consulting') return 'Management Consulting';
    if (ind === 'Media') return 'Media & Journalism';
    if (ind === 'Retail') return 'Supply Chain & Logistics';
    if (ind && ind !== 'Other') return ind;

    return undefined;
}

// ── Smart Match Checking Helpers for Display Scoring ──────────────────────────
function matchCareerStage(job: ApiJobItem, level: string): boolean {
    if (!level || level === 'All') return true;
    const jobExp = (job.experienceLevel || '').toLowerCase().trim();
    const jobTitle = (job.title || '').toLowerCase();

    if (level === 'Fresher') {
        if (jobExp === 'fresher' || jobExp === '0' || jobExp === '0-1') return true;
        const fresherTokens = ['fresher', 'entry', '0-1', '0-2', 'graduate', 'intern', 'trainee', 'junior', 'beginner', 'associate'];
        return fresherTokens.some(t => jobExp.includes(t) || jobTitle.includes(t));
    }

    if (level === '1-3') {
        if (jobExp === '1-3' || jobExp.includes('1-3') || jobExp.includes('1 to 3')) return true;
        const jrTokens = ['junior', 'associate', '1 yr', '2 yr', '3 yr', '0-2', '1-2', '2-3'];
        return jrTokens.some(t => jobExp.includes(t) || jobTitle.includes(t)) || !jobExp;
    }

    if (level === '3-5') {
        if (jobExp === '3-5' || jobExp.includes('3-5') || jobExp.includes('3 to 5')) return true;
        const midTokens = ['mid', 'middle', 'intermediate', '3 yr', '4 yr', '5 yr'];
        return midTokens.some(t => jobExp.includes(t) || jobTitle.includes(t)) || !jobExp;
    }

    if (level === '5+') {
        if (jobExp === '5+' || jobExp.includes('5+') || jobExp.includes('5-10') || jobExp.includes('10+')) return true;
        const srTokens = ['senior', 'lead', 'principal', 'staff', 'head', 'architect', 'manager', 'director'];
        return srTokens.some(t => jobExp.includes(t) || jobTitle.includes(t));
    }

    return jobExp.includes(level.toLowerCase()) || level.toLowerCase().includes(jobExp);
}

function matchLocation(job: ApiJobItem, locInput: string, preferredLocs: string[]): boolean {
    const rawTokens = [locInput, ...preferredLocs].map(l => l.trim().toLowerCase()).filter(Boolean);
    if (rawTokens.length === 0) return true;

    const jobLoc = (job.location || '').toLowerCase();
    const isJobRemote = jobLoc.includes('remote') || (job.jobType || '').toLowerCase().includes('remote');

    for (const token of rawTokens) {
        if (token === 'remote' && isJobRemote) return true;
        if (jobLoc.includes(token) || token.includes(jobLoc)) return true;

        if (token.includes('india') || token === 'in') {
            if (isJobRemote || INDIA_LOCATIONS.some(city => jobLoc.includes(city))) return true;
        }
        if (token.includes('us') || token.includes('usa') || token.includes('united states')) {
            if (isJobRemote || US_LOCATIONS.some(city => jobLoc.includes(city))) return true;
        }
        if (token.includes('uk') || token.includes('united kingdom')) {
            if (isJobRemote || UK_LOCATIONS.some(city => jobLoc.includes(city))) return true;
        }
        if (jobLoc.split(/[\s,/-]+/).some(part => part && (part === token || token.includes(part)))) {
            return true;
        }
    }

    return isJobRemote;
}

function matchSalary(job: ApiJobItem, minSalary: string, maxSalary: string, currency: string): boolean {
    if (!minSalary && !maxSalary && !currency) return true;

    const min = minSalary ? parseFloat(minSalary) : 0;
    const max = maxSalary ? parseFloat(maxSalary) : Infinity;

    if (job.salaryMin != null || job.salaryMax != null) {
        const jMin = job.salaryMin ?? 0;
        const jMax = job.salaryMax ?? Infinity;
        return jMax >= min && jMin <= max;
    }

    if (job.salary) {
        const rawNums = job.salary.match(/\d[\d,]*/g)?.map(n => parseFloat(n.replace(/,/g, ''))) || [];
        if (rawNums.length >= 2) {
            const jMin = Math.min(...rawNums);
            const jMax = Math.max(...rawNums);
            return jMax >= min && jMin <= max;
        } else if (rawNums.length === 1) {
            const val = rawNums[0];
            return val >= min * 0.7 && val <= max * 1.3;
        }
    }

    return true;
}

function matchKeywords(job: ApiJobItem, keywords: string): boolean {
    const trimmed = keywords.trim().toLowerCase();
    if (!trimmed) return true;

    const tokens = trimmed.split(/\s+/).filter(t => t.length > 1);
    if (tokens.length === 0) return true;

    const jobText = [
        job.title || '',
        job.description || '',
        ...(job.skills || []),
        job.companyName || '',
        job.location || '',
    ].join(' ').toLowerCase();

    return tokens.some(tok => jobText.includes(tok));
}

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
    IT: ['software', 'developer', 'engineer', 'tech', 'technology', 'it', 'web', 'cloud', 'data', 'react', 'node', 'python', 'java', 'fullstack', 'frontend', 'backend', 'devops', 'mobile', 'ai'],
    Finance: ['finance', 'financial', 'banking', 'bank', 'fintech', 'accounting', 'audit', 'tax', 'investment', 'wealth', 'analyst', 'equity', 'trading'],
    Healthcare: ['health', 'healthcare', 'medical', 'pharma', 'pharmaceutical', 'biotech', 'clinical', 'hospital', 'care', 'nurse', 'doctor'],
    Education: ['education', 'edtech', 'academic', 'teaching', 'school', 'university', 'college', 'learning', 'tutor'],
    Manufacturing: ['manufacturing', 'production', 'industrial', 'plant', 'factory', 'mechanical', 'supply chain', 'warehouse', 'assembly'],
    Retail: ['retail', 'ecommerce', 'e-commerce', 'store', 'merchandise', 'fmcg', 'consumer', 'shop', 'inventory'],
    Consulting: ['consulting', 'consultant', 'advisory', 'strategy', 'solutions'],
    Media: ['media', 'entertainment', 'content', 'video', 'creative', 'journalism', 'digital', 'broadcast'],
    Telecom: ['telecom', 'telecommunications', 'network', 'wireless', 'cellular', 'broadband'],
};

const DOMAIN_KEYWORDS: Record<string, string[]> = {
    Engineering: ['engineering', 'engineer', 'developer', 'software', 'devops', 'architect', 'frontend', 'backend', 'fullstack'],
    'Data Science': ['data', 'analytics', 'analyst', 'machine learning', 'ml', 'ai', 'bi', 'big data', 'sql', 'python'],
    Design: ['design', 'designer', 'ui', 'ux', 'product design', 'graphic', 'figma', 'visual', 'interface'],
    Marketing: ['marketing', 'growth', 'seo', 'sem', 'content', 'brand', 'campaign', 'social media', 'digital marketing'],
    Sales: ['sales', 'business development', 'bdr', 'sdr', 'account executive', 'client', 'revenue'],
    HR: ['hr', 'human resources', 'talent', 'recruiting', 'recruiter', 'people'],
    Operations: ['operations', 'ops', 'project management', 'program manager', 'scrum', 'agile', 'logistics'],
    Product: ['product', 'product manager', 'pm', 'product owner', 'roadmap'],
    Legal: ['legal', 'law', 'compliance', 'counsel', 'attorney'],
    Cybersecurity: ['security', 'cyber', 'soc', 'infosec', 'penetration', 'vulnerability'],
    'Quality Assurance': ['qa', 'testing', 'automation', 'test engineer', 'selenium', 'cypress', 'quality'],
};

function matchIndustryAndDomain(job: ApiJobItem, industry: string, domain: string): boolean {
    if (!industry && !domain) return true;

    const jobText = [
        job.title || '',
        job.description || '',
        ...(job.skills || []),
        job.companyName || '',
        job.jobType || '',
    ].join(' ').toLowerCase();

    let indMatched = !industry || industry === 'Other';
    if (industry && industry !== 'Other') {
        const keywords = INDUSTRY_KEYWORDS[industry] || [industry.toLowerCase()];
        indMatched = keywords.some(k => jobText.includes(k));
    }

    let domMatched = !domain || domain === 'Other';
    if (domain && domain !== 'Other') {
        const keywords = DOMAIN_KEYWORDS[domain] || [domain.toLowerCase()];
        domMatched = keywords.some(k => jobText.includes(k));
    }

    if (industry && domain) {
        return indMatched || domMatched;
    }
    return indMatched && domMatched;
}

export interface ScoredJobItem extends ApiJobItem {
    matchScore: number;
    matchDetails?: string[];
}

export function StudentJobs() {
    const { user } = useAuthStore();
    const { applications, applyForJob } = useStudentStore();
    const { sendEmail } = useNotificationStore();

    // ── API State ──
    const [jobs, setJobs] = useState<ApiJobItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(12);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [retryTrigger, setRetryTrigger] = useState(0);

    // ── Relaxation / Smart Fallback State ──
    const [isRelaxed, setIsRelaxed] = useState(false);
    const [relaxationReason, setRelaxationReason] = useState<string | null>(null);

    // ── Active Filters ──
    const [q, setQ] = useState('');
    const [location, setLocation] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('All');
    const [minSalary, setMinSalary] = useState('');
    const [maxSalary, setMaxSalary] = useState('');
    const [currency, setCurrency] = useState('');
    const [industry, setIndustry] = useState('');
    const [domain, setDomain] = useState('');
    const [preferredLocations, setPreferredLocations] = useState<string[]>([]);

    // ── Tabs ──
    const [activeTab, setActiveTab] = useState<'all' | 'relevant'>('all');

    // ── Debounced inputs ──
    const [debouncedQ, setDebouncedQ] = useState('');
    const [debouncedLocation, setDebouncedLocation] = useState('');
    const [debouncedMinSalary, setDebouncedMinSalary] = useState('');
    const [debouncedMaxSalary, setDebouncedMaxSalary] = useState('');

    // ── Live Lookups directly from backend API ──
    const { data: currenciesData } = useGetCurrenciesQuery();
    const { data: experienceLevelsData } = useGetExperienceLevelsQuery();

    // Dynamically build experience stages from database / API
    const experienceStages = useMemo(() => {
        const list: Array<{ id: string; label: string; _id?: string }> = [
            { id: 'All', label: 'Any Stage' }
        ];

        if (experienceLevelsData?.data && Array.isArray(experienceLevelsData.data) && experienceLevelsData.data.length > 0) {
            experienceLevelsData.data.forEach((item: any) => {
                if (item?.name) {
                    list.push({
                        id: item.name,
                        label: item.name,
                        _id: item._id
                    });
                }
            });
        } else {
            // Direct database canonical values fallback
            list.push(
                { id: 'Fresher', label: 'Fresher' },
                { id: '1-3', label: '1-3' },
                { id: '3-5', label: '3-5' },
                { id: '5+', label: '5+' }
            );
        }
        return list;
    }, [experienceLevelsData]);

    // ── Modal & UI State ──
    const [selectedJob, setSelectedJob] = useState<ApiJobItem | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

    // ── Drawer Temporary filter state (applied on button click) ──
    const [tempExperienceLevel, setTempExperienceLevel] = useState('All');
    const [tempLocation, setTempLocation] = useState('');
    const [tempMinSalary, setTempMinSalary] = useState('');
    const [tempMaxSalary, setTempMaxSalary] = useState('');
    const [tempCurrency, setTempCurrency] = useState('');
    const [tempIndustry, setTempIndustry] = useState('');
    const [tempDomain, setTempDomain] = useState('');
    const [tempPreferredLocations, setTempPreferredLocations] = useState<string[]>([]);
    const [tempPrefLocInput, setTempPrefLocInput] = useState('');

    const appliedJobs = applications.map(app => app.vacancyId);

    // Debounce text inputs
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQ(q), 350);
        return () => clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedLocation(location), 350);
        return () => clearTimeout(timer);
    }, [location]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedMinSalary(minSalary), 350);
        return () => clearTimeout(timer);
    }, [minSalary]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedMaxSalary(maxSalary), 350);
        return () => clearTimeout(timer);
    }, [maxSalary]);

    // ── Smart Dynamic Search Engine ──────────────────────────────────────────
    const loadJobsData = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);

        const hasSearch = !!debouncedQ.trim();
        const hasExp = experienceLevel !== 'All';
        const hasLoc = !!debouncedLocation.trim() || preferredLocations.length > 0;
        const hasSal = !!debouncedMinSalary || !!debouncedMaxSalary || !!currency;
        const hasIndDom = !!industry || !!domain;

        const hasActiveFilters = hasSearch || hasExp || hasLoc || hasSal || hasIndDom;

        const primaryLocation = debouncedLocation.trim() || preferredLocations[0] || undefined;
        const mappedTaxonomy = mapDomainOrIndustryToTaxonomy(industry, domain);
        const mappedExp = mapExperienceLevelToBackend(experienceLevel);
        const expDoc = experienceStages.find(s => s.id === experienceLevel);
        const expId = expDoc?._id;

        try {
            // Case 1: Recommended Tab
            if (activeTab === 'relevant') {
                const response = await fetchRelevantJobs({ page, limit });
                setJobs(response.jobs);
                setTotal(response.total);
                setIsRelaxed(false);
                setRelaxationReason(null);
                return;
            }

            // Case 2: Unfiltered All Jobs (Full backend catalog with real ~7k+ count)
            if (!hasActiveFilters) {
                const response = await fetchJobs({ page, limit });
                setJobs(response.jobs);
                setTotal(response.total);
                setIsRelaxed(false);
                setRelaxationReason(null);
                return;
            }

            // Case 3: Active Filters — Progressive Quick-Match Strategy
            // Attempt 1: Strict query matching active filters with exact database experience name
            const attempt1 = await fetchJobs({
                page,
                limit,
                keywords: debouncedQ.trim() || undefined,
                taxonomy: mappedTaxonomy,
                location: primaryLocation,
                experienceLevel: mappedExp,
                minSalary: debouncedMinSalary || undefined,
                maxSalary: debouncedMaxSalary || undefined,
                currency: currency || undefined,
            });

            if (attempt1.total > 0) {
                setJobs(attempt1.jobs);
                setTotal(attempt1.total);
                setIsRelaxed(false);
                setRelaxationReason(null);
                return;
            }

            // Attempt 1b: If experience level was chosen and returned 0, check if backend queries by ObjectId
            if (hasExp && expId) {
                const attemptExpId = await fetchJobs({
                    page,
                    limit,
                    keywords: debouncedQ.trim() || undefined,
                    taxonomy: mappedTaxonomy,
                    location: primaryLocation,
                    experienceLevel: expId,
                    minSalary: debouncedMinSalary || undefined,
                    maxSalary: debouncedMaxSalary || undefined,
                    currency: currency || undefined,
                });

                if (attemptExpId.total > 0) {
                    setJobs(attemptExpId.jobs);
                    setTotal(attemptExpId.total);
                    setIsRelaxed(false);
                    setRelaxationReason(null);
                    return;
                }
            }

            // Attempt 2: If strict query gave 0, relax salary constraint
            if (hasSal) {
                const attempt2 = await fetchJobs({
                    page: 1,
                    limit,
                    keywords: debouncedQ.trim() || undefined,
                    taxonomy: mappedTaxonomy,
                    location: primaryLocation,
                    experienceLevel: mappedExp,
                });

                if (attempt2.total > 0) {
                    setJobs(attempt2.jobs);
                    setTotal(attempt2.total);
                    setIsRelaxed(true);
                    setRelaxationReason('Broadened salary range to show all matching roles.');
                    return;
                }
            }

            // Attempt 3: Try alternate preferred locations if multiple were specified
            if (preferredLocations.length > 1) {
                for (let i = 1; i < preferredLocations.length; i++) {
                    const altLoc = preferredLocations[i];
                    const attemptLoc = await fetchJobs({
                        page: 1,
                        limit,
                        keywords: debouncedQ.trim() || undefined,
                        taxonomy: mappedTaxonomy,
                        location: altLoc,
                        experienceLevel: mappedExp,
                    });
                    if (attemptLoc.total > 0) {
                        setJobs(attemptLoc.jobs);
                        setTotal(attemptLoc.total);
                        setIsRelaxed(true);
                        setRelaxationReason(`Showing matching roles in ${altLoc} (from your preferred locations).`);
                        return;
                    }
                }
            }

            // Attempt 4: Expand location when domain/stage/keywords were specified
            if (hasLoc && (hasIndDom || hasExp || hasSearch)) {
                const attempt4 = await fetchJobs({
                    page: 1,
                    limit,
                    keywords: debouncedQ.trim() || undefined,
                    taxonomy: mappedTaxonomy,
                    experienceLevel: mappedExp,
                });

                if (attempt4.total > 0) {
                    const activeCriteriaLabels = [
                        domain || industry,
                        experienceLevel !== 'All' ? experienceLevel : null
                    ].filter(Boolean).join(' • ');

                    setJobs(attempt4.jobs);
                    setTotal(attempt4.total);
                    setIsRelaxed(true);
                    setRelaxationReason(`Showing ${activeCriteriaLabels || 'relevant'} opportunities across all locations & remote.`);
                    return;
                }
            }

            // Attempt 5: Experience Level semantic search if database lacks structured experienceLevel field
            if (hasExp && mappedExp) {
                const semanticKeywords = mappedExp === 'Fresher' ? 'fresher entry graduate junior intern'
                    : mappedExp === '1-3' ? 'junior associate'
                    : mappedExp === '3-5' ? 'developer engineer'
                    : 'senior lead architect';

                const queryWords = debouncedQ.trim() ? `${debouncedQ.trim()} ${semanticKeywords}` : semanticKeywords;
                const attemptExpSemantic = await fetchJobs({
                    page: 1,
                    limit,
                    keywords: queryWords,
                    taxonomy: mappedTaxonomy,
                    location: primaryLocation,
                });

                if (attemptExpSemantic.total > 0) {
                    setJobs(attemptExpSemantic.jobs);
                    setTotal(attemptExpSemantic.total);
                    setIsRelaxed(true);
                    setRelaxationReason(`Showing available opportunities matching ${mappedExp} level.`);
                    return;
                }
            }

            // Attempt 6: Broaden to domain or search keyword alone
            if (mappedTaxonomy || hasSearch) {
                const attempt6 = await fetchJobs({
                    page: 1,
                    limit,
                    keywords: debouncedQ.trim() || undefined,
                    taxonomy: mappedTaxonomy,
                });

                if (attempt6.total > 0) {
                    setJobs(attempt6.jobs);
                    setTotal(attempt6.total);
                    setIsRelaxed(true);
                    setRelaxationReason(`Showing opportunities in ${mappedTaxonomy || debouncedQ.trim()}.`);
                    return;
                }
            }

            // Attempt 7: Catalog fallback so the user never gets an empty screen
            const attemptCatalog = await fetchJobs({
                page: 1,
                limit,
            });

            if (attemptCatalog.total > 0) {
                setJobs(attemptCatalog.jobs);
                setTotal(attemptCatalog.total);
                setIsRelaxed(true);
                setRelaxationReason(`Showing top available opportunities matching your profile.`);
                return;
            }

            // If truly zero
            setJobs([]);
            setTotal(0);
            setIsRelaxed(false);
            setRelaxationReason(null);
        } catch (err: any) {
            console.error('[StudentJobs] Error fetching jobs:', err);
            setFetchError(err?.message || 'Unable to load jobs. Please check connection and try again.');
        } finally {
            setIsLoading(false);
        }
    }, [
        page, 
        limit, 
        activeTab, 
        debouncedQ, 
        experienceLevel, 
        debouncedLocation, 
        preferredLocations, 
        debouncedMinSalary, 
        debouncedMaxSalary, 
        currency, 
        industry, 
        domain,
        experienceStages
    ]);

    useEffect(() => {
        loadJobsData();
    }, [loadJobsData, retryTrigger]);

    // ── Calculate Match Scores for Rendered Jobs ──────────────────────────────
    const activeFilterCount = [
        experienceLevel !== 'All',
        !!location,
        !!minSalary,
        !!maxSalary,
        !!currency,
        !!industry,
        !!domain,
        preferredLocations.length > 0,
        !!debouncedQ.trim()
    ].filter(Boolean).length;

    const scoredJobsList: ScoredJobItem[] = useMemo(() => {
        if (activeFilterCount === 0) {
            return jobs.map(j => ({ ...j, matchScore: 100 }));
        }

        return jobs.map(job => {
            let matchedCriteria = 0;
            const matchDetails: string[] = [];

            if (experienceLevel !== 'All') {
                if (matchCareerStage(job, experienceLevel)) {
                    matchedCriteria++;
                    matchDetails.push(experienceLevel);
                }
            }

            if (location || preferredLocations.length > 0) {
                if (matchLocation(job, location, preferredLocations)) {
                    matchedCriteria++;
                    matchDetails.push(location || preferredLocations[0]);
                }
            }

            if (minSalary || maxSalary || currency) {
                if (matchSalary(job, minSalary, maxSalary, currency)) {
                    matchedCriteria++;
                    matchDetails.push('Salary');
                }
            }

            if (industry || domain) {
                if (matchIndustryAndDomain(job, industry, domain)) {
                    matchedCriteria++;
                    matchDetails.push(domain || industry);
                }
            }

            if (debouncedQ.trim()) {
                if (matchKeywords(job, debouncedQ)) {
                    matchedCriteria++;
                    matchDetails.push(`"${debouncedQ.trim()}"`);
                }
            }

            const rawScore = Math.round((matchedCriteria / activeFilterCount) * 100);
            const matchScore = Math.max(50, rawScore);

            return {
                ...job,
                matchScore,
                matchDetails
            };
        });
    }, [jobs, activeFilterCount, experienceLevel, location, preferredLocations, minSalary, maxSalary, currency, industry, domain, debouncedQ]);

    // ── Filter Actions ──
    const handleQChange = (val: string) => {
        setQ(val);
        setPage(1);
    };

    const clearAllFilters = () => {
        setQ('');
        setDebouncedQ('');
        setLocation('');
        setDebouncedLocation('');
        setExperienceLevel('All');
        setMinSalary('');
        setDebouncedMinSalary('');
        setMaxSalary('');
        setDebouncedMaxSalary('');
        setCurrency('');
        setIndustry('');
        setDomain('');
        setPreferredLocations([]);
        setPage(1);
        setIsRelaxed(false);
        setRelaxationReason(null);

        // Drawer temp state
        setTempExperienceLevel('All');
        setTempLocation('');
        setTempMinSalary('');
        setTempMaxSalary('');
        setTempCurrency('');
        setTempIndustry('');
        setTempDomain('');
        setTempPreferredLocations([]);
        setTempPrefLocInput('');
    };

    const openFilterDrawer = () => {
        setTempExperienceLevel(experienceLevel);
        setTempLocation(location);
        setTempMinSalary(minSalary);
        setTempMaxSalary(maxSalary);
        setTempCurrency(currency);
        setTempIndustry(industry);
        setTempDomain(domain);
        setTempPreferredLocations([...preferredLocations]);
        setTempPrefLocInput('');
        setFilterDrawerOpen(true);
    };

    const applyFilters = () => {
        setExperienceLevel(tempExperienceLevel);
        setLocation(tempLocation);
        setMinSalary(tempMinSalary);
        setMaxSalary(tempMaxSalary);
        setCurrency(tempCurrency);
        setIndustry(tempIndustry);
        setDomain(tempDomain);
        setPreferredLocations([...tempPreferredLocations]);
        setPage(1);
        setFilterDrawerOpen(false);
    };

    const totalPages = Math.ceil(total / limit) || 1;

    // View Details Modal
    const handleViewDetails = async (job: ApiJobItem) => {
        setSelectedJob(job);
        setDetailError(null);
        setIsDetailLoading(true);
        try {
            const idToFetch = job.externalId || job.id;
            const fullDetails = await fetchJobDetails(idToFetch);
            setSelectedJob(fullDetails);
        } catch (err: any) {
            console.error('[StudentJobs] Failed to fetch job details:', err);
            setDetailError('Could not load full details. Showing preview data.');
        } finally {
            setIsDetailLoading(false);
        }
    };

    const handleApply = (job: ApiJobItem) => {
        if (user) {
            applyForJob(user.id, job.id).catch(console.error);
        }

        if (job.applyLink) {
            window.open(job.applyLink, '_blank', 'noopener,noreferrer');
        }

        setToastMessage(`Application logged for ${job.title}`);
        
        try {
            sendEmail(
                'Your Job Application Data Received',
                `You tracked an application for the role ${job.title} at ${job.companyName || 'your selected company'}. It is securely synced to your Squrex account.`
            );
        } catch (emailErr) {
            console.error('Failed to send email notification:', emailErr);
        }
        
        setSelectedJob(null);
    };

    const handleTabChange = (tab: 'all' | 'relevant') => {
        setActiveTab(tab);
        setPage(1);
    };

    return (
        <PageTransition className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* API Error Banner */}
            {fetchError && (
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 shadow-sm">
                    <WifiOff className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-rose-800">Could not load jobs</p>
                        <p className="text-sm text-rose-600 mt-0.5 leading-relaxed">{fetchError}</p>
                    </div>
                    <button
                        onClick={() => {
                            setFetchError(null);
                            setRetryTrigger(prev => prev + 1);
                        }}
                        className="shrink-0 px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Hero and Search Section */}
            <div className="relative overflow-hidden rounded-[2rem] bg-black p-8 md:p-12 mb-4 border border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-600/30 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/30 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-widest pl-2 pr-4 mb-6 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Live Opportunities
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                            Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Perfect Role</span>
                        </h1>
                        <p className="text-white/60 text-lg font-medium max-w-md">Browse thousands of active listings synced in real-time across partner hiring networks.</p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
                        <div className="relative flex items-center bg-white/10 border border-white/20 rounded-2xl backdrop-blur-xl shadow-inner-light overflow-hidden transition-all focus-within:bg-white/15 focus-within:border-white/30">
                            <Search className="absolute left-4 text-white/50 w-5 h-5 pointer-events-none" />
                            <input
                                placeholder="Search by keyword, designation or title..."
                                className="w-full h-14 pl-12 pr-4 bg-transparent text-white placeholder:text-white/40 focus:outline-none text-lg"
                                value={q}
                                onChange={(e) => handleQChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Compact Filter Bar & Chips ── */}
            <div className="flex items-center gap-3 mb-4 mt-4 flex-wrap">
                {/* Filter Trigger Button */}
                <button
                    onClick={openFilterDrawer}
                    className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border transition-all bg-background hover:bg-muted border-border/60 hover:border-border hover:shadow-sm"
                >
                    <SlidersHorizontal size={15} className="text-muted-foreground" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {/* Active filter chips */}
                {experienceLevel !== 'All' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20 text-xs font-semibold">
                        <Award size={11} /> {experienceLevel}
                        <button onClick={() => { setExperienceLevel('All'); setPage(1); }} className="ml-0.5 hover:text-blue-900 transition-colors"><X size={11} /></button>
                    </span>
                )}
                {location && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-700 border border-purple-500/20 text-xs font-semibold">
                        <MapPin size={11} /> {location}
                        <button onClick={() => { setLocation(''); setDebouncedLocation(''); setPage(1); }} className="ml-0.5 hover:text-purple-900 transition-colors"><X size={11} /></button>
                    </span>
                )}
                {(minSalary || maxSalary) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-xs font-semibold">
                        <Banknote size={11} /> {currency || ''} {minSalary && `${minSalary}`}{minSalary && maxSalary && ' – '}{maxSalary && `${maxSalary}`}
                        <button onClick={() => { setMinSalary(''); setMaxSalary(''); setCurrency(''); setPage(1); }} className="ml-0.5 hover:text-emerald-900 transition-colors"><X size={11} /></button>
                    </span>
                )}
                {industry && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-semibold">
                        <Building2 size={11} /> {industry}
                        <button onClick={() => { setIndustry(''); setPage(1); }} className="ml-0.5 hover:text-amber-900 transition-colors"><X size={11} /></button>
                    </span>
                )}
                {domain && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-700 border border-cyan-500/20 text-xs font-semibold">
                        <Globe size={11} /> {domain}
                        <button onClick={() => { setDomain(''); setPage(1); }} className="ml-0.5 hover:text-cyan-900 transition-colors"><X size={11} /></button>
                    </span>
                )}
                {preferredLocations.map((loc, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 text-xs font-semibold">
                        <MapPin size={11} /> {loc}
                        <button onClick={() => { setPreferredLocations(preferredLocations.filter((_, idx) => idx !== i)); setPage(1); }} className="ml-0.5 hover:text-indigo-900 transition-colors"><X size={11} /></button>
                    </span>
                ))}
                {activeFilterCount > 0 && (
                    <button
                        onClick={clearAllFilters}
                        className="ml-auto text-xs font-bold text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border/60 hover:border-border px-3 py-1.5 rounded-xl"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* ── Progressive Relaxation Banner ── */}
            {isRelaxed && !isLoading && jobs.length > 0 && (
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/25 text-amber-900 mb-2 shadow-sm">
                    <Sparkles className="w-5 h-5 shrink-0 text-amber-600 animate-pulse" />
                    <div className="flex-1 text-sm font-medium">
                        <span className="font-bold">Showing closest matches: </span>
                        {relaxationReason || 'We dynamically broadened the search parameters to present available matching opportunities.'}
                    </div>
                    <button
                        onClick={clearAllFilters}
                        className="shrink-0 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            )}

            {/* ── Filter Side Drawer ── */}
            {filterDrawerOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        style={{ animation: 'fadeIn 0.2s ease' }}
                        onClick={() => setFilterDrawerOpen(false)}
                    />
                    {/* Drawer panel */}
                    <div
                        className="fixed top-0 right-0 h-full z-50 w-[380px] max-w-[95vw] bg-background border-l border-border/60 shadow-2xl flex flex-col"
                        style={{ animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)' }}
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-gradient-to-br from-background to-muted/30 shrink-0">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal size={18} className="text-primary" />
                                <span className="font-extrabold text-lg">Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-black">{activeFilterCount} active</span>
                                )}
                            </div>
                            <button
                                onClick={() => setFilterDrawerOpen(false)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Scrollable Filter Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

                            {/* Career Stage (Rendered directly from Database / API) */}
                            <div>
                                <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Career Stage
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {experienceStages.map(stage => {
                                        const isActive = tempExperienceLevel === stage.id;
                                        return (
                                            <button
                                                key={stage.id}
                                                onClick={() => setTempExperienceLevel(stage.id)}
                                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                                    isActive
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/20'
                                                    : 'bg-background hover:bg-muted text-muted-foreground border-border/40 hover:border-border'
                                                }`}
                                            >
                                                {stage.id === 'All' ? <Sparkles size={13} className={isActive ? 'text-white' : ''} /> : <Award size={13} className={isActive ? 'text-white' : ''} />}
                                                {stage.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="h-px w-full bg-border/40" />

                            {/* Location */}
                            <div>
                                <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Location
                                </p>
                                <div className="relative flex items-center bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm focus-within:border-primary/50 transition-colors">
                                    <MapPin className="absolute left-3 text-muted-foreground w-4 h-4 pointer-events-none" />
                                    <input
                                        placeholder="e.g. San Francisco, Bangalore..."
                                        className="w-full h-11 pl-9 pr-3 bg-transparent text-sm focus:outline-none"
                                        value={tempLocation}
                                        onChange={(e) => setTempLocation(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="h-px w-full bg-border/40" />

                            {/* Salary Range */}
                            <div>
                                <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Salary Range
                                </p>
                                <div className="flex flex-col gap-2.5">
                                    <select
                                        value={tempCurrency}
                                        onChange={(e) => setTempCurrency(e.target.value)}
                                        className="h-11 w-full bg-background border border-border/60 rounded-xl px-3 text-sm font-semibold outline-none focus:border-primary/50 transition-colors cursor-pointer"
                                    >
                                        <option value="">Any Currency</option>
                                        {currenciesData?.data?.map((c: any) => (
                                            <option key={c._id} value={c.code}>{c.code} – {c.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2 items-center">
                                        <div className="relative flex items-center bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm focus-within:border-primary/50 transition-colors flex-1">
                                            <div className="absolute left-3 text-muted-foreground text-xs font-bold pointer-events-none flex items-center gap-1">
                                                {(() => {
                                                    const match = currenciesData?.data?.find((c: any) => c.code === tempCurrency);
                                                    return match?.symbol ? <span className="text-sm font-semibold">{match.symbol}</span> : <Banknote size={15} />;
                                                })()}
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                className="w-full h-11 pl-9 pr-3 bg-transparent text-sm focus:outline-none"
                                                value={tempMinSalary}
                                                onChange={(e) => setTempMinSalary(e.target.value)}
                                            />
                                        </div>
                                        <span className="text-muted-foreground text-sm font-medium shrink-0">–</span>
                                        <div className="relative flex items-center bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm focus-within:border-primary/50 transition-colors flex-1">
                                            <div className="absolute left-3 text-muted-foreground text-xs font-bold pointer-events-none flex items-center gap-1">
                                                {(() => {
                                                    const match = currenciesData?.data?.find((c: any) => c.code === tempCurrency);
                                                    return match?.symbol ? <span className="text-sm font-semibold">{match.symbol}</span> : <Banknote size={15} />;
                                                })()}
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="Max"
                                                className="w-full h-11 pl-9 pr-3 bg-transparent text-sm focus:outline-none"
                                                value={tempMaxSalary}
                                                onChange={(e) => setTempMaxSalary(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px w-full bg-border/40" />

                            {/* Industry & Domain */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Industry
                                    </p>
                                    <select
                                        value={tempIndustry}
                                        onChange={(e) => setTempIndustry(e.target.value)}
                                        className="w-full h-11 bg-background border border-border/60 rounded-xl px-3 text-sm font-medium outline-none focus:border-primary/50 transition-colors cursor-pointer"
                                    >
                                        <option value="">All Industries</option>
                                        <option value="IT">IT / Software</option>
                                        <option value="Finance">Finance / Banking</option>
                                        <option value="Healthcare">Healthcare</option>
                                        <option value="Education">Education</option>
                                        <option value="Manufacturing">Manufacturing</option>
                                        <option value="Retail">Retail / Logistics</option>
                                        <option value="Consulting">Consulting</option>
                                        <option value="Media">Media / Entertainment</option>
                                        <option value="Telecom">Telecom</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Domain / Specialization
                                    </p>
                                    <select
                                        value={tempDomain}
                                        onChange={(e) => setTempDomain(e.target.value)}
                                        className="w-full h-11 bg-background border border-border/60 rounded-xl px-3 text-sm font-medium outline-none focus:border-primary/50 transition-colors cursor-pointer"
                                    >
                                        <option value="">All Domains</option>
                                        <option value="Engineering">Software Engineering</option>
                                        <option value="Data Science">Data Science & AI</option>
                                        <option value="Design">UI/UX Design</option>
                                        <option value="Product">Product Management</option>
                                        <option value="Marketing">Marketing & Growth</option>
                                        <option value="Sales">Sales & BizDev</option>
                                        <option value="HR">Human Resources</option>
                                        <option value="Operations">Operations & Strategy</option>
                                        <option value="Quality Assurance">Quality Assurance</option>
                                        <option value="Cybersecurity">Cybersecurity</option>
                                        <option value="Legal">Legal & Compliance</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="h-px w-full bg-border/40" />

                            {/* Preferred Locations */}
                            <div>
                                <p className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Preferred Locations
                                </p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tempPreferredLocations.map((loc, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 rounded-lg text-xs font-semibold">
                                            {loc}
                                            <button
                                                type="button"
                                                onClick={() => setTempPreferredLocations(tempPreferredLocations.filter((_, idx) => idx !== i))}
                                                className="ml-0.5 hover:text-destructive transition-colors font-bold"
                                            >×</button>
                                        </span>
                                    ))}
                                </div>
                                <div className="relative flex items-center bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm focus-within:border-primary/50 transition-colors">
                                    <MapPin className="absolute left-3 text-muted-foreground w-4 h-4 pointer-events-none" />
                                    <input
                                        placeholder="Type city & press Enter..."
                                        className="w-full h-11 pl-9 pr-3 bg-transparent text-sm focus:outline-none"
                                        value={tempPrefLocInput}
                                        onChange={(e) => setTempPrefLocInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.key === 'Enter' || e.key === ',') && tempPrefLocInput.trim()) {
                                                e.preventDefault();
                                                const val = tempPrefLocInput.trim().replace(/,$/, '');
                                                if (val && !tempPreferredLocations.includes(val)) {
                                                    setTempPreferredLocations([...tempPreferredLocations, val]);
                                                }
                                                setTempPrefLocInput('');
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5">Press <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">Enter</kbd> to add.</p>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="px-6 py-5 border-t border-border/50 flex gap-3 shrink-0 bg-background">
                            <button
                                onClick={() => {
                                    setTempExperienceLevel('All');
                                    setTempLocation('');
                                    setTempMinSalary('');
                                    setTempMaxSalary('');
                                    setTempCurrency('');
                                    setTempIndustry('');
                                    setTempDomain('');
                                    setTempPreferredLocations([]);
                                    setTempPrefLocInput('');
                                }}
                                className="flex-1 h-11 rounded-xl border border-border/60 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                            >
                                Reset
                            </button>
                            <button
                                onClick={applyFilters}
                                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    `}</style>
                </>
            )}

            {/* Layout bar: real backend total count + All/Recommended tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
                <div className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                    <span className="flex items-center justify-center bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-black">
                        {total.toLocaleString()}
                    </span>
                    {activeTab === 'relevant' ? 'Recommended Opportunities' : 'Jobs Available'}
                </div>
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                    <button
                        onClick={() => handleTabChange('all')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Briefcase size={13} /> All Jobs
                    </button>
                    <button
                        onClick={() => handleTabChange('relevant')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'relevant' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Star size={13} /> Recommended
                    </button>
                </div>
            </div>

            {/* Job Grid & States */}
            <div className="min-h-[400px]">
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i} className="border-border/60 p-6 flex flex-col h-full space-y-4 shadow-sm bg-card/50">
                                <div className="flex justify-between">
                                    <Skeleton style={{ height: "40px", width: "40px" }} className="rounded-xl" />
                                    <Skeleton style={{ height: "24px", width: "80px" }} className="rounded-full" />
                                </div>
                                <div>
                                    <Skeleton style={{ height: "24px", width: "80%" }} className="mb-2" />
                                    <Skeleton style={{ height: "16px", width: "50%" }} />
                                </div>
                                <div className="mt-auto pt-4 space-y-2">
                                    <Skeleton style={{ height: "16px", width: "100%" }} />
                                    <Skeleton style={{ height: "16px", width: "90%" }} />
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : scoredJobsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center bg-muted/20 border border-dashed border-border/60 rounded-[2rem] shadow-sm relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
                        <Filter className="w-16 h-16 text-muted-foreground opacity-30 mb-6 drop-shadow-sm" />
                        <h3 className="text-2xl font-black mb-3 text-foreground">No jobs are currently available.</h3>
                        <p className="text-muted-foreground max-w-sm mb-8 text-lg">We couldn't find any opportunities matching this combination. Try adjusting or resetting your filters.</p>
                        <Button variant="outline" className="rounded-xl font-bold px-8" onClick={clearAllFilters}>Reset Filters</Button>
                    </div>
                ) : (
                    <>
                        {/* Reliable visible responsive grid (free from opacity: 0 Stagger bugs) */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {scoredJobsList.map((job) => {
                                const applied = appliedJobs.includes(job.id);

                                return (
                                    <motion.div 
                                        key={job.id} 
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="h-full"
                                    >
                                        <HoverLift className="h-full block">
                                            <Card
                                                className="h-full border-border/40 hover:border-primary/50 cursor-pointer shadow-md hover:shadow-xl bg-card transition-all duration-300 flex flex-col p-6 relative overflow-hidden group rounded-3xl"
                                                onClick={() => handleViewDetails(job)}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                                {/* Header Row: Avatar + Company */}
                                                <div className="flex justify-between items-start mb-4 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm bg-gradient-to-br from-muted to-muted/50 text-foreground border border-border/50">
                                                            <Building2 size={20} />
                                                        </div>
                                                        <div>
                                                            {job.companyName && <p className="font-bold text-sm text-foreground/80">{job.companyName}</p>}
                                                            {job.location && (
                                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                    <MapPin size={10} /> {job.location}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Status Badges */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        {applied && (
                                                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 flex items-center gap-1 text-[10px] uppercase shadow-none">
                                                                <CheckCircle2 size={10} /> Applied
                                                            </Badge>
                                                        )}
                                                        {job.relevanceScore !== undefined && (
                                                            <Badge variant="secondary" className="bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-blue-700 border-blue-400/30 flex items-center gap-1 text-[10px] font-bold">
                                                                <Sparkles size={9} className="fill-blue-500 text-blue-500" />
                                                                Recommended
                                                            </Badge>
                                                        )}
                                                        {activeFilterCount > 0 && job.matchScore !== undefined && (
                                                            <Badge variant="secondary" className={`border flex items-center gap-1 text-[10px] font-bold ${
                                                                job.matchScore === 100
                                                                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-400/30'
                                                                    : job.matchScore >= 70
                                                                    ? 'bg-blue-500/15 text-blue-700 border-blue-400/30'
                                                                    : 'bg-amber-500/15 text-amber-700 border-amber-400/30'
                                                            }`}>
                                                                <Sparkles size={9} className={job.matchScore === 100 ? 'fill-emerald-500 text-emerald-500' : 'fill-blue-500 text-blue-500'} />
                                                                {job.matchScore}% Match
                                                            </Badge>
                                                        )}
                                                        {job.source && (
                                                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] uppercase font-bold">
                                                                {job.source}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Job Title */}
                                                <h3 className="text-lg font-extrabold leading-tight mb-3 group-hover:text-primary transition-colors relative z-10 line-clamp-2">
                                                    {job.title}
                                                </h3>

                                                {/* Description Snippet */}
                                                {job.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                                                        {job.description}
                                                    </p>
                                                )}

                                                {/* Key Skills Tags */}
                                                {job.skills && job.skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-4 z-10 relative">
                                                        {job.skills.slice(0, 4).map((skill, index) => (
                                                            <Badge 
                                                                key={index}
                                                                variant="secondary"
                                                                className="px-2 py-0.5 rounded text-[10px] font-medium border border-border/60 bg-muted/40 text-muted-foreground"
                                                            >
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                        {job.skills.length > 4 && (
                                                            <span className="text-[10px] text-muted-foreground font-medium self-center ml-1">
                                                                +{job.skills.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Badges Row */}
                                                <div className="flex flex-wrap gap-2 mb-6 relative z-10 mt-auto">
                                                    {job.jobType && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-[10px] font-semibold text-muted-foreground border border-border/50">
                                                            <Briefcase size={10} /> {job.jobType}
                                                        </span>
                                                    )}
                                                    {job.salary && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-[10px] font-semibold text-muted-foreground border border-border/50">
                                                            <Banknote size={11} /> {job.salary}
                                                        </span>
                                                    )}
                                                    {job.experienceLevel && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-[10px] font-semibold text-muted-foreground border border-border/50">
                                                            <Sparkles size={10} /> {job.experienceLevel}
                                                        </span>
                                                    )}
                                                    {job.visaSponsorship && job.visaSponsorship === 'true' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                                                            <Globe size={10} /> Visa OK
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Footer Row with Safe Date Handling */}
                                                <div className="pt-4 border-t border-border/40 flex items-center justify-between relative z-10">
                                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                        <Clock size={12} />
                                                        {job.createdAt && !isNaN(new Date(job.createdAt).getTime())
                                                            ? new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                                            : 'Recently'}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 text-sm font-bold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                        View Details <ArrowRight size={14} />
                                                    </div>
                                                </div>
                                            </Card>
                                        </HoverLift>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Real Server-Side Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-12">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPage(p => Math.max(p - 1, 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page === 1 || isLoading}
                                    className="rounded-xl flex items-center gap-1.5"
                                >
                                    <ChevronLeft size={16} /> Previous
                                </Button>
                                <span className="text-sm font-bold text-muted-foreground">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPage(p => Math.min(p + 1, totalPages));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page >= totalPages || isLoading}
                                    className="rounded-xl flex items-center gap-1.5"
                                >
                                    Next <ChevronRight size={16} />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Central Job Detail Modal */}
            <Modal
                isOpen={!!selectedJob}
                onClose={() => { setSelectedJob(null); setDetailError(null); setIsDetailLoading(false); }}
                title="Role Overview"
                className="max-w-2xl"
            >
                {selectedJob && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        {isDetailLoading && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm font-medium">
                                <Loader2 size={14} className="animate-spin" />
                                Syncing full details from backend...
                            </div>
                        )}
                        {detailError && !isDetailLoading && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm font-medium">
                                <WifiOff size={14} />
                                {detailError}
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <Building2 size={32} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold leading-tight">{selectedJob.title}</h2>
                                    <p className="text-muted-foreground font-medium flex items-center gap-1 mt-1">
                                        {selectedJob.companyName || 'Corporate Partner'} • <span className="text-xs">
                                            {selectedJob.createdAt && !isNaN(new Date(selectedJob.createdAt).getTime())
                                                ? new Date(selectedJob.createdAt).toLocaleDateString()
                                                : 'Recently'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {selectedJob.location && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Location</div>
                                    <div className="font-medium text-sm">{selectedJob.location}</div>
                                </div>
                            )}
                            {selectedJob.jobType && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12} /> Type</div>
                                    <div className="font-medium text-sm">{selectedJob.jobType}</div>
                                </div>
                            )}
                            {selectedJob.experienceLevel && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Award size={12} /> Experience</div>
                                    <div className="font-medium text-sm">{selectedJob.experienceLevel}</div>
                                </div>
                            )}
                            {selectedJob.salary && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Banknote size={12} /> Salary Range</div>
                                    <div className="font-medium text-sm">{selectedJob.salary}</div>
                                </div>
                            )}
                            {selectedJob.source && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Globe size={12} /> Sync Source</div>
                                    <div className="font-medium text-sm capitalize">{selectedJob.source}</div>
                                </div>
                            )}
                            {selectedJob.visaSponsorship && (
                                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 col-span-2 md:col-span-1">
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Globe size={12} /> Visa Sponsorship</div>
                                    <div className="font-medium text-sm capitalize">{selectedJob.visaSponsorship === 'true' ? 'Available' : 'Not Provided'}</div>
                                </div>
                            )}
                        </div>

                        {selectedJob.skills && selectedJob.skills.length > 0 && (
                            <div>
                                <h3 className="font-bold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Keywords / Designation</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedJob.skills.map((skill, index) => (
                                        <Badge 
                                            key={index}
                                            variant="secondary"
                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-muted text-muted-foreground border-border/60"
                                        >
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedJob.description && (
                            <div>
                                <h3 className="font-bold mb-3 text-lg">About the Role</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                    {selectedJob.description}
                                </p>
                            </div>
                        )}

                        <div className="pt-6 border-t border-border flex flex-col gap-4">
                            {appliedJobs.includes(selectedJob.id) ? (
                                <Button disabled className="w-full h-12 font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Application Submitted</Button>
                            ) : (
                                <div className="space-y-2">
                                    <Button className="w-full h-12 gap-2 font-bold" onClick={() => handleApply(selectedJob)}>
                                        Apply<ExternalLink size={16} />
                                    </Button>
                                    {selectedJob.applyLink && (
                                        <p className="text-[11px] text-center text-muted-foreground font-light leading-normal">
                                            By clicking apply you will be redirected to the external site to complete your application
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
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
