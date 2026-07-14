import { API_BASE_URL } from './config';
import { getInMemToken } from '@/features/auth/store';

// ─── Clean API job item shape returned to UI ─────────────────────────────────
export interface ApiJobItem {
  id: string;
  title: string;
  companyName?: string;
  location?: string;
  jobType?: string;
  experienceLevel?: string;
  salary?: string;
  skills?: string[];
  description?: string;
  applyLink?: string;
  createdAt: string;
  source?: string;
  status?: string;
  visaSponsorship?: string;
}

// ─── Raw API job shape returned by GET /jobs ─────────────────────────────────
export interface ApiJob {
  _id?: string;
  id?: string;
  externalId?: string;
  title?: string;
  description?: string;
  summary?: string;
  
  // Location
  location?: string;
  locationText?: string;
  city?: string;
  country?: string;

  // Company
  organizationName?: string;
  companyName?: string;
  company?: string;
  organizationSlug?: string;

  // Job Type
  jobType?: string;
  type?: string;
  employmentType?: string;
  taxonomy?: string;
  category?: string;

  // Experience
  experienceLevel?: string;
  seniority?: string;

  // Compensation
  salary?: string;
  salaryRange?: string;
  compensation?: string;

  // Skills
  skills?: string[];
  tags?: string[];
  keywords?: string[];

  // Apply Link
  applyUrl?: string;
  applyLink?: string;
  url?: string;

  // Dates
  createdAt?: string;
  publishedAt?: string;
  postedAt?: string;
  updatedAt?: string;

  // Source
  source?: string;
  status?: string;

  // Real backend fields from sync
  organization?: string;
  locationsDerived?: string[];
  citiesDerived?: string[];
  countriesDerived?: string[];
  workArrangement?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  keySkills?: string[];
  datePosted?: string;
  dateValidThrough?: string;
  visaSponsorship?: string | boolean;
}

export interface FetchJobsParams {
  q?: string;
  taxonomy?: string;
  location?: string;
  experienceLevel?: string;
  source?: string;
  page?: number;
  limit?: number;
}

export interface FetchJobsResponse {
  jobs: ApiJobItem[];
  total: number;
  page: number;
  limit: number;
}

// Helper to extract a string from various possible representations (string, object, array)
function extractString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    if (val.length === 0) return '';
    return extractString(val[0]);
  }
  if (typeof val === 'object') {
    return val.name || val.title || val.label || val.value || '';
  }
  return String(val);
}

// Helper to extract an array of strings from various possible representations
function extractStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(item => extractString(item)).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [extractString(val)].filter(Boolean);
}

/**
 * Normalises job-type strings from the API to the labels expected by the UI.
 */
function normalizeJobType(raw: string): string {
  const v = raw.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
  if (v.includes('full')) return 'Full-Time';
  if (v.includes('part')) return 'Part-Time';
  if (v.includes('remote')) return 'Remote';
  if (v.includes('hybrid')) return 'Hybrid';
  if (v.includes('contract') || v.includes('freelance')) return 'Contract';
  if (v.includes('intern')) return 'Internship';
  return raw
    .split(/[_\s-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');
}

/**
 * Normalises experience-level strings from the API to UI-friendly labels.
 */
function normalizeExperienceLevel(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (v === 'fresher' || v === 'entry' || v === 'entry level' || v === 'entry-level' || v.includes('0-1') || v === '0') {
    return 'Fresher';
  }
  if (v === 'junior' || v.includes('1-3') || v.includes('1 to 3') || v.includes('0-2') || v.includes('0-3')) {
    return '1-3 Years';
  }
  if (v === 'mid' || v === 'middle' || v.includes('3-5') || v.includes('2-5') || v.includes('mid level') || v.includes('mid-level')) {
    return '3-5 Years';
  }
  if (v === 'senior' || v === 'lead' || v === 'staff' || v === 'principal' || v === 'expert' || v.includes('5+') || v.includes('5 ') || v.includes('+5') || v.includes('senior')) {
    return '5+ Years';
  }
  return raw;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────
/**
 * Adapts a raw API job object to the clean ApiJobItem shape.
 * Preserves actual API data, using optional fields rather than mock fallbacks.
 */
export function mapApiJobToItem(job: ApiJob): ApiJobItem {
  const id =
    job._id ||
    job.id ||
    job.externalId ||
    `job-${Math.random().toString(36).slice(2)}`;

  const title = extractString(job.title) || 'Untitled Role';

  const description = extractString(job.description || job.summary) || undefined;

  const location = extractString(
    job.locationsDerived ||
    job.location ||
    job.locationText ||
    (job.city && job.country ? `${job.city}, ${job.country}` : null) ||
    job.city
  ) || undefined;

  const companyName = extractString(
    job.organizationName ||
    job.organization ||
    job.companyName ||
    job.company
  ) || undefined;

  const applyLink = extractString(job.applyUrl || job.applyLink || job.url) || undefined;

  const rawJobType = extractString(
    job.jobType ||
    job.type ||
    job.employmentType ||
    job.taxonomy ||
    job.category ||
    job.workArrangement
  );
  const jobType = rawJobType ? normalizeJobType(rawJobType) : undefined;

  const rawExperienceLevel = extractString(
    job.experienceLevel || job.seniority
  );
  const experienceLevel = rawExperienceLevel ? normalizeExperienceLevel(rawExperienceLevel) : undefined;

  let salary = extractString(
    job.salary || job.salaryRange || job.compensation
  );
  if (!salary && (job.salaryMin !== undefined || job.salaryMax !== undefined)) {
    const currency = job.salaryCurrency || 'USD';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    });
    if (job.salaryMin !== undefined && job.salaryMax !== undefined) {
      salary = `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
    } else if (job.salaryMin !== undefined) {
      salary = `${formatter.format(job.salaryMin)}+`;
    } else if (job.salaryMax !== undefined) {
      salary = `Up to ${formatter.format(job.salaryMax)}`;
    }
  }

  const skills = extractStringArray(
    job.keySkills ||
    job.skills ||
    job.tags ||
    job.keywords
  );

  const createdAt = extractString(
    job.datePosted ||
    job.createdAt ||
    job.publishedAt ||
    job.postedAt ||
    job.updatedAt
  ) || new Date().toISOString();

  const visaSponsorship = job.visaSponsorship !== undefined ? String(job.visaSponsorship) : undefined;

  return {
    id,
    title,
    companyName,
    location,
    jobType,
    experienceLevel,
    salary: salary || undefined,
    skills: skills.length > 0 ? skills : undefined,
    description,
    applyLink,
    createdAt,
    source: job.source || undefined,
    status: job.status || undefined,
    visaSponsorship
  };
}

// ─── API call ─────────────────────────────────────────────────────────────────
/**
 * Fetches active jobs from the real Squrx backend (`GET /jobs`).
 * Requires a valid JWT bearer token. Returns paginated list of jobs.
 */
export async function fetchJobs(
  params: FetchJobsParams = {}
): Promise<FetchJobsResponse> {
  const token = getInMemToken();
  if (!token) {
    throw new Error('Authentication required to fetch jobs.');
  }

  // Build query string from non-empty params only
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.taxonomy) query.set('taxonomy', params.taxonomy);
  if (params.location) query.set('location', params.location);
  if (params.experienceLevel) query.set('experienceLevel', params.experienceLevel);
  if (params.source) query.set('source', params.source);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${API_BASE_URL}/jobs${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Failed to fetch jobs (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.message) message = errJson.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const json = await response.json();

  let rawJobs: ApiJob[] = [];
  let total = 0;
  let page = 1;
  let limit = 10;

  const payload = json?.data ?? json;

  if (Array.isArray(payload)) {
    rawJobs = payload;
    total = payload.length;
  } else if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.jobs)) {
      rawJobs = payload.jobs;
    } else if (Array.isArray(payload.data)) {
      rawJobs = payload.data;
    } else if (Array.isArray(payload.results)) {
      rawJobs = payload.results;
    }
    total = payload.total !== undefined ? payload.total : rawJobs.length;
    page = payload.page !== undefined ? payload.page : 1;
    limit = payload.limit !== undefined ? payload.limit : 10;
  }

  return {
    jobs: rawJobs.map(mapApiJobToItem),
    total,
    page,
    limit
  };
}
