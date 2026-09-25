import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// ── Word Boundary Matching Helper ─────────────────────────────────────────────
function hasWordMatch(text: string, term: string): boolean {
    if (!text || !term) return false;
    const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Ensure term is matched as a complete word/token, never a substring of another word
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    return regex.test(text);
}

// ── Smart Match Checking Helpers for Display Scoring ──────────────────────────
function matchCareerStage(job: ApiJobItem, level: string): boolean {
    if (!level || level === 'All') return true;
    const jobExp = (job.experienceLevel || '').toLowerCase().trim();
    const jobTitle = (job.title || '').toLowerCase();

    // Prevent Senior/Lead/Staff roles from incorrectly matching entry-level or junior filters
    const isSeniorTitle = ['senior', 'sr.', 'sr ', 'lead', 'principal', 'staff', 'director', 'head', 'architect'].some(t => jobTitle.includes(t));
    if ((level === 'Fresher' || level === '1-3') && isSeniorTitle) {
        return false;
    }

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

const CITY_SYNONYMS: Record<string, string[]> = {
    bangalore: ['bangalore', 'bengaluru'],
    bengaluru: ['bangalore', 'bengaluru'],
    mumbai: ['mumbai', 'bombay'],
    bombay: ['mumbai', 'bombay'],
    delhi: ['delhi', 'new delhi', 'noida', 'gurgaon', 'gurugram', 'ncr'],
    'new delhi': ['delhi', 'new delhi', 'noida', 'gurgaon', 'gurugram', 'ncr'],
    noida: ['noida', 'delhi', 'ncr'],
    gurgaon: ['gurgaon', 'gurugram', 'delhi', 'ncr'],
    gurugram: ['gurgaon', 'gurugram', 'delhi', 'ncr'],
    chennai: ['chennai', 'madras'],
    madras: ['chennai', 'madras'],
    kolkata: ['kolkata', 'calcutta'],
    calcutta: ['kolkata', 'calcutta'],
    sf: ['san francisco', 'sf', 'bay area'],
    'san francisco': ['san francisco', 'sf', 'bay area'],
    nyc: ['new york', 'nyc', 'new york city', 'ny'],
    'new york': ['new york', 'nyc', 'new york city', 'ny'],
    london: ['london', 'uk', 'united kingdom'],
    singapore: ['singapore'],
    berlin: ['berlin', 'germany'],
    austin: ['austin', 'texas', 'tx'],
    seattle: ['seattle', 'washington', 'wa'],
};

function matchLocation(job: ApiJobItem, locInput: string, preferredLocs: string[]): boolean {
    const rawTokens = [locInput, ...preferredLocs].map(l => l.trim().toLowerCase()).filter(Boolean);
    if (rawTokens.length === 0) return true;

    const jobLoc = (job.location || '').toLowerCase();
    const jobCity = (job.city || '').toLowerCase();
    const jobCountry = (job.country || '').toLowerCase();
    const jobDerived = (job.locationsDerived || []).map(l => l.toLowerCase()).join(' ');
    const fullJobLoc = `${jobLoc} ${jobCity} ${jobCountry} ${jobDerived}`.trim();

    if (!fullJobLoc) return false;

    const isJobRemote = jobLoc.includes('remote') || (job.jobType || '').toLowerCase().includes('remote');

    for (const token of rawTokens) {
        if (token === 'remote') {
            if (isJobRemote) return true;
            continue;
        }

        // Exact city synonyms match
        const synonyms = CITY_SYNONYMS[token] || [token];
        for (const syn of synonyms) {
            if (hasWordMatch(fullJobLoc, syn)) return true;
        }

        // Regional grouping matches
        if (token === 'india' || token === 'in') {
            if (fullJobLoc.includes('india') || INDIA_LOCATIONS.some(city => hasWordMatch(fullJobLoc, city))) return true;
        }
        if (token === 'us' || token === 'usa' || token === 'united states') {
            if (fullJobLoc.includes('united states') || fullJobLoc.includes('usa') || US_LOCATIONS.some(city => hasWordMatch(fullJobLoc, city))) return true;
        }
        if (token === 'uk' || token === 'united kingdom') {
            if (fullJobLoc.includes('united kingdom') || fullJobLoc.includes('uk') || UK_LOCATIONS.some(city => hasWordMatch(fullJobLoc, city))) return true;
        }

        if (hasWordMatch(fullJobLoc, token)) {
            return true;
        }
    }

    return false;
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

    return tokens.some(tok => hasWordMatch(jobText, tok));
}

// ── Industry Configuration with Direct Taxonomies & Boundary Keywords ────────
const INDUSTRY_CONFIG: Record<string, { directTaxonomies: string[]; keywords: string[] }> = {
    IT: {
        directTaxonomies: ['Software Engineering', 'Cloud Architecture', 'Data Science & AI', 'Cybersecurity', 'Game Development', 'Quality Assurance', 'UI/UX Design'],
        keywords: [
            'software', 'information technology', 'tech', 'technology', 'developer', 'engineering',
            'cloud', 'devops', 'frontend', 'backend', 'fullstack', 'full-stack', 'web development',
            'mobile app', 'cybersecurity', 'database', 'system admin', 'data science', 'artificial intelligence',
            'machine learning', 'qa', 'sdet', 'it services', 'programmer', 'coding', 'react', 'node', 'python',
            'java', 'aws', 'azure', 'it'
        ]
    },
    Finance: {
        directTaxonomies: ['Finance & Accounting', 'Venture Capital'],
        keywords: [
            'finance', 'financial', 'banking', 'bank', 'fintech', 'accounting', 'accountant',
            'audit', 'auditor', 'tax', 'taxation', 'investment', 'wealth management', 'equity',
            'trading', 'hedge fund', 'portfolio', 'billing', 'cpa', 'actuary', 'treasury', 'financial analyst'
        ]
    },
    Healthcare: {
        directTaxonomies: ['Healthcare'],
        keywords: [
            'health', 'healthcare', 'medical', 'medicine', 'pharma', 'pharmaceutical', 'biotech',
            'biotechnology', 'clinical', 'hospital', 'nurse', 'nursing', 'doctor', 'physician',
            'patient care', 'pharmacy', 'life sciences', 'therapeutics', 'dental', 'clinic'
        ]
    },
    Education: {
        directTaxonomies: ['Education & EdTech'],
        keywords: [
            'education', 'edtech', 'academic', 'teaching', 'teacher', 'school', 'university',
            'college', 'learning', 'tutor', 'tutoring', 'faculty', 'curriculum', 'instructor',
            'professor', 'pedagogy', 'student affairs'
        ]
    },
    Manufacturing: {
        directTaxonomies: ['Mechanical Engineering', 'Electrical Engineering'],
        keywords: [
            'manufacturing', 'production', 'industrial', 'plant', 'factory', 'mechanical',
            'assembly', 'cnc', 'fabrication', 'machinery', 'automotive', 'aerospace',
            'warehouse', 'maintenance engineer'
        ]
    },
    Retail: {
        directTaxonomies: ['Supply Chain & Logistics', 'Real Estate'],
        keywords: [
            'retail', 'ecommerce', 'e-commerce', 'store', 'merchandise', 'merchandising',
            'fmcg', 'consumer goods', 'supermarket', 'inventory', 'buyer', 'apparel', 'fashion'
        ]
    },
    Consulting: {
        directTaxonomies: ['Management Consulting'],
        keywords: [
            'consulting', 'consultant', 'advisory', 'management consulting', 'strategy consulting',
            'consultancy', 'business advisory', 'solutions consulting'
        ]
    },
    Media: {
        directTaxonomies: ['Media & Journalism'],
        keywords: [
            'media', 'entertainment', 'content', 'journalism', 'journalist', 'broadcast',
            'broadcasting', 'video production', 'creative agency', 'publishing', 'editorial',
            'film', 'television', 'animation', 'multimedia'
        ]
    },
    Telecom: {
        directTaxonomies: ['Telecom'],
        keywords: [
            'telecom', 'telecommunications', 'telecommunication', 'cellular', 'wireless',
            'broadband', 'fiber optic', 'network engineer', 'voip', '5g', 'telephony'
        ]
    },
};

// ── Domain Configuration with Direct Taxonomies & Boundary Keywords ──────────
const DOMAIN_CONFIG: Record<string, { directTaxonomies: string[]; keywords: string[] }> = {
    Engineering: {
        directTaxonomies: ['Software Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Cloud Architecture', 'Game Development'],
        keywords: [
            'software engineer', 'software developer', 'web developer', 'full stack', 'fullstack',
            'frontend', 'front-end', 'backend', 'back-end', 'devops', 'sre', 'site reliability',
            'system architect', 'software architect', 'systems engineer', 'cloud engineer',
            'mobile developer', 'ios developer', 'android developer', 'embedded engineer',
            'firmware', 'programmer', 'coder', 'react developer', 'node developer', 'python developer',
            'java developer', 'engineer', 'engineering'
        ]
    },
    'Data Science': {
        directTaxonomies: ['Data Science', 'Data Science & AI'],
        keywords: [
            'data scientist', 'data science', 'machine learning', 'ml engineer', 'ai engineer',
            'artificial intelligence', 'deep learning', 'data analyst', 'data analytics',
            'big data', 'bi analyst', 'business intelligence', 'nlp', 'computer vision',
            'data engineer', 'statistical', 'statistician', 'data modeling'
        ]
    },
    Design: {
        directTaxonomies: ['UI/UX Design'],
        keywords: [
            'ui/ux', 'ui designer', 'ux designer', 'product designer', 'product design',
            'visual designer', 'graphic designer', 'interaction design', 'user experience',
            'user interface', 'figma', 'wireframe', 'prototyping', 'creative designer', 'designer', 'design'
        ]
    },
    Product: {
        directTaxonomies: ['Product Management'],
        keywords: [
            'product manager', 'product management', 'product owner', 'technical product manager',
            'apm', 'associate product manager', 'head of product', 'product lead', 'product strategy', 'roadmap'
        ]
    },
    Marketing: {
        directTaxonomies: ['Marketing & Growth'],
        keywords: [
            'marketing', 'digital marketing', 'growth marketing', 'growth marketer', 'seo', 'sem',
            'ppc', 'content marketer', 'content marketing', 'social media', 'brand marketing',
            'brand manager', 'performance marketing', 'campaign manager', 'copywriter'
        ]
    },
    Sales: {
        directTaxonomies: ['Sales & BizDev'],
        keywords: [
            'sales', 'business development', 'bdr', 'sdr', 'account executive', 'account manager',
            'client partner', 'inside sales', 'enterprise sales', 'sales representative', 'sales manager', 'revenue'
        ]
    },
    HR: {
        directTaxonomies: ['Human Resources'],
        keywords: [
            'human resources', 'hr manager', 'hr generalist', 'talent acquisition', 'recruiter',
            'recruiting', 'people operations', 'talent partner', 'hrbp', 'people & culture', 'staffing', 'hr'
        ]
    },
    Operations: {
        directTaxonomies: ['Operations & Strategy', 'Supply Chain & Logistics'],
        keywords: [
            'operations', 'operations manager', 'program manager', 'project manager', 'scrum master',
            'agile coach', 'bizops', 'business operations', 'supply chain', 'logistics', 'procurement'
        ]
    },
    'Quality Assurance': {
        directTaxonomies: ['Quality Assurance'],
        keywords: [
            'quality assurance', 'qa engineer', 'software tester', 'test engineer', 'automation engineer',
            'sdet', 'manual tester', 'test automation', 'selenium', 'cypress', 'qa analyst', 'qa'
        ]
    },
    Cybersecurity: {
        directTaxonomies: ['Cybersecurity'],
        keywords: [
            'cybersecurity', 'cyber security', 'information security', 'infosec', 'security engineer',
            'soc analyst', 'penetration tester', 'pen testing', 'ethical hacker', 'vulnerability',
            'cloud security', 'incident response'
        ]
    },
    Legal: {
        directTaxonomies: ['Legal & Compliance'],
        keywords: [
            'legal', 'legal counsel', 'counsel', 'attorney', 'lawyer', 'compliance',
            'regulatory compliance', 'paralegal', 'contract manager', 'contracts'
        ]
    },
};

function matchIndustry(job: ApiJobItem, industry: string): boolean {
    if (!industry || industry === 'All' || industry === 'Other') return true;

    const config = INDUSTRY_CONFIG[industry];
    if (!config) return true;

    // 1. Direct explicit field match on job
    const directVal = [
        job.industry || '',
        job.taxonomy || '',
        job.category || '',
        job.domain || ''
    ].join(' ').toLowerCase();

    if (directVal) {
        if (hasWordMatch(directVal, industry)) return true;
        if (config.directTaxonomies.some(t => directVal.includes(t.toLowerCase()))) return true;
    }

    // 2. High-confidence Title & Company match
    const titleAndCompany = `${job.title || ''} ${job.companyName || ''}`;
    if (config.keywords.some(k => hasWordMatch(titleAndCompany, k))) return true;

    // 3. Key skills match
    const skillsText = (job.skills || []).join(' ');
    if (config.keywords.some(k => hasWordMatch(skillsText, k))) return true;

    // 4. Description match (require distinctive industry terms, not generic words like 'tech', 'technology', or 'it')
    if (job.description) {
        const specificKeywords = config.keywords.filter(k => k !== 'tech' && k !== 'technology' && k !== 'it');
        if (specificKeywords.some(k => hasWordMatch(job.description || '', k))) return true;
    }

    return false;
}

function matchDomain(job: ApiJobItem, domain: string): boolean {
    if (!domain || domain === 'All' || domain === 'Other') return true;

    const config = DOMAIN_CONFIG[domain];
    if (!config) return true;

    // 1. Direct explicit field match on job
    const directVal = [
        job.domain || '',
        job.taxonomy || '',
        job.category || ''
    ].join(' ').toLowerCase();

    if (directVal) {
        if (hasWordMatch(directVal, domain)) return true;
        if (config.directTaxonomies.some(t => directVal.includes(t.toLowerCase()))) return true;
    }

    // 2. High-confidence Title match (title defines the domain role)
    const titleText = job.title || '';
    if (config.keywords.some(k => hasWordMatch(titleText, k))) return true;

    // 3. Key skills match
    const skillsText = (job.skills || []).join(' ');
    if (config.keywords.some(k => hasWordMatch(skillsText, k))) return true;

    // 4. Description match (only with multi-word compound phrases or long specialized terms to avoid false positives)
    if (job.description) {
        const specificKeywords = config.keywords.filter(k => k.includes(' ') || k.length > 5);
        if (specificKeywords.some(k => hasWordMatch(job.description || '', k))) return true;
    }

    return false;
}

export function matchIndustryAndDomain(job: ApiJobItem, industry: string, domain: string): boolean {
    const indMatched = matchIndustry(job, industry);
    const domMatched = matchDomain(job, domain);
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

    // ── Debounced inputs (only hero live search needs debouncing) ──
    const [debouncedQ, setDebouncedQ] = useState('');

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

    // Debounce live hero search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQ(q), 350);
        return () => clearTimeout(timer);
    }, [q]);

    const abortControllerRef = useRef<AbortController | null>(null);

    // ── Strict Filter Predicate ──
    const isJobStrictlyMatching = useCallback((job: ApiJobItem, relaxSalary = false) => {
        if (industry && !matchIndustry(job, industry)) return false;
        if (domain && !matchDomain(job, domain)) return false;
        if ((location || preferredLocations.length > 0) && !matchLocation(job, location, preferredLocations)) return false;
        if (experienceLevel !== 'All' && !matchCareerStage(job, experienceLevel)) return false;
        if (debouncedQ.trim() && !matchKeywords(job, debouncedQ)) return false;
        if (!relaxSalary && (minSalary || maxSalary || currency) && !matchSalary(job, minSalary, maxSalary, currency)) return false;
        return true;
    }, [industry, domain, location, preferredLocations, experienceLevel, debouncedQ, minSalary, maxSalary, currency]);

    // ── Single-Invocation Job Loader ──────────────────────────────────────────
    const loadJobsData = useCallback(async () => {
        // Cancel any pending in-flight request before launching a new one
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setFetchError(null);

        const hasSearch = !!debouncedQ.trim();
        const hasExp = experienceLevel !== 'All';
        const hasLoc = !!location.trim() || preferredLocations.length > 0;
        const hasSal = !!minSalary || !!maxSalary || !!currency;
        const hasIndDom = !!industry || !!domain;

        const hasActiveFilters = hasSearch || hasExp || hasLoc || hasSal || hasIndDom;

        const primaryLocation = location.trim() || preferredLocations[0] || undefined;
        const mappedTaxonomy = mapDomainOrIndustryToTaxonomy(industry, domain);
        const mappedExp = mapExperienceLevelToBackend(experienceLevel);
        const expDoc = experienceStages.find(s => s.id === experienceLevel);
        const expId = expDoc?._id;

        // Targeted semantic search keywords when filtering by domain or industry
        const domainSearchTerms: Record<string, string> = {
            Engineering: 'software engineer developer fullstack frontend backend devops',
            'Data Science': 'data scientist machine learning ai analytics analyst',
            Design: 'ui ux designer product design graphic visual',
            Product: 'product manager product owner pm',
            Marketing: 'marketing growth digital seo content',
            Sales: 'sales business development account executive',
            HR: 'human resources hr recruiter talent',
            Operations: 'operations program manager project supply chain',
            'Quality Assurance': 'quality assurance qa test automation',
            Cybersecurity: 'cybersecurity security infosec analyst',
            Legal: 'legal compliance counsel attorney',
        };

        const industrySearchTerms: Record<string, string> = {
            IT: 'software technology IT developer tech',
            Finance: 'finance banking fintech accounting investment',
            Healthcare: 'healthcare medical pharma biotech clinical',
            Education: 'education edtech academic learning university',
            Manufacturing: 'manufacturing industrial production factory mechanical',
            Retail: 'retail ecommerce store consumer',
            Consulting: 'consulting consultant advisory strategy',
            Media: 'media entertainment journalism content video',
            Telecom: 'telecom telecommunications network wireless',
        };

        const targetDomainTerm = domain ? domainSearchTerms[domain] || domain : '';
        const targetIndustryTerm = industry ? industrySearchTerms[industry] || industry : '';
        const targetedKeywords = [debouncedQ.trim(), targetDomainTerm, targetIndustryTerm].filter(Boolean).join(' ');

        try {
            // Case 1: Recommended Tab
            if (activeTab === 'relevant') {
                const response = await fetchRelevantJobs({ page, limit, signal: controller.signal });
                setJobs(response.jobs);
                setTotal(response.total);
                setIsRelaxed(false);
                setRelaxationReason(null);
                return;
            }

            // Case 2: Unfiltered All Jobs (Full backend catalog)
            if (!hasActiveFilters) {
                const response = await fetchJobs({ page, limit, signal: controller.signal });
                setJobs(response.jobs);
                setTotal(response.total);
                setIsRelaxed(false);
                setRelaxationReason(null);
                return;
            }

            // Case 3: Active Filters — Single deterministic query with active filters
            const attempt1 = await fetchJobs({
                page: 1,
                limit: 50,
                keywords: debouncedQ.trim() || undefined,
                taxonomy: mappedTaxonomy,
                domain: domain || mappedTaxonomy,
                industry: industry || undefined,
                location: primaryLocation,
                experienceLevel: mappedExp || (hasExp && expId ? expId : undefined),
                minSalary: minSalary || undefined,
                maxSalary: maxSalary || undefined,
                currency: currency || undefined,
                signal: controller.signal,
            });

            const valid1 = attempt1.jobs.filter(j => isJobStrictlyMatching(j));
            if (valid1.length > 0) {
                setJobs(valid1);
                setTotal(valid1.length);
                setIsRelaxed(false);
                setRelaxationReason(null);
                return;
            }

            // Fallback attempt: If backend database records omit the taxonomy/industry fields,
            // query with targeted domain/industry keywords so MongoDB text index can match candidate roles
            if (targetedKeywords && !debouncedQ.trim()) {
                const attempt2 = await fetchJobs({
                    page: 1,
                    limit: 50,
                    keywords: targetedKeywords,
                    location: primaryLocation,
                    experienceLevel: mappedExp,
                    minSalary: minSalary || undefined,
                    maxSalary: maxSalary || undefined,
                    currency: currency || undefined,
                    signal: controller.signal,
                });

                const valid2 = attempt2.jobs.filter(j => isJobStrictlyMatching(j));
                if (valid2.length > 0) {
                    setJobs(valid2);
                    setTotal(valid2.length);
                    setIsRelaxed(false);
                    setRelaxationReason(null);
                    return;
                }
            }

            // Zero matching jobs exist for this filter combination
            setJobs([]);
            setTotal(0);
            setIsRelaxed(false);
            setRelaxationReason(null);
        } catch (err: any) {
            if (err.name === 'AbortError') {
                return; // Silently ignore cancelled requests
            }
            console.error('[StudentJobs] Error fetching jobs:', err);
            setFetchError(err?.message || 'Unable to load jobs. Please check connection and try again.');
        } finally {
            if (abortControllerRef.current === controller) {
                setIsLoading(false);
            }
        }
    }, [
        page, 
        limit, 
        activeTab, 
        debouncedQ, 
        experienceLevel, 
        location, 
        preferredLocations, 
        minSalary, 
        maxSalary, 
        currency, 
        industry, 
        domain,
        isJobStrictlyMatching
    ]);

    useEffect(() => {
        loadJobsData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
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

        // Strictly keep ONLY jobs that pass the active filters
        return jobs
            .filter(j => isJobStrictlyMatching(j, isRelaxed))
            .map(job => {
                const matchDetails: string[] = [];
                if (industry) matchDetails.push(industry);
                if (domain) matchDetails.push(domain);
                if (location || preferredLocations.length > 0) matchDetails.push(location || preferredLocations[0]);
                if (experienceLevel !== 'All') matchDetails.push(experienceLevel);
                if (debouncedQ.trim()) matchDetails.push(`"${debouncedQ.trim()}"`);
                if (minSalary || maxSalary || currency) matchDetails.push('Salary');

                return {
                    ...job,
                    matchScore: 100,
                    matchDetails
                };
            });
    }, [jobs, activeFilterCount, isJobStrictlyMatching, isRelaxed, industry, domain, location, preferredLocations, experienceLevel, debouncedQ, minSalary, maxSalary, currency]);

    // ── Filter Actions ──
    const handleQChange = (val: string) => {
        setQ(val);
        setPage(1);
    };

    const clearAllFilters = () => {
        setQ('');
        setDebouncedQ('');
        setLocation('');
        setExperienceLevel('All');
        setMinSalary('');
        setMaxSalary('');
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

    const totalPages = Math.ceil((activeFilterCount > 0 ? scoredJobsList.length : total) / limit) || 1;

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
                        <button onClick={() => { setLocation(''); setPage(1); }} className="ml-0.5 hover:text-purple-900 transition-colors"><X size={11} /></button>
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
            {isRelaxed && !isLoading && scoredJobsList.length > 0 && relaxationReason && (
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/25 text-amber-900 mb-2 shadow-sm">
                    <Sparkles className="w-5 h-5 shrink-0 text-amber-600 animate-pulse" />
                    <div className="flex-1 text-sm font-medium">
                        <span className="font-bold">Filter Notice: </span>
                        {relaxationReason}
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
                        {(activeFilterCount > 0 ? scoredJobsList.length : total).toLocaleString()}
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
