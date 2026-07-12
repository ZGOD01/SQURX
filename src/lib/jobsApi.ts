import { API_BASE_URL } from './config';
import { getInMemToken } from '@/features/auth/store';
import type { JobVacancy } from './mockDb/schema';

// ─── Raw API job shape returned by GET /jobs ─────────────────────────────────
// The backend syncs from Fantastic.jobs so field names can vary; we handle
// multiple possible names defensively.
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

  // Job meta
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

  // Skills / tags
  skills?: string[];
  tags?: string[];
  keywords?: string[];

  // Apply link
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
 * Normalises job-type strings from the API (e.g. FULL_TIME, full_time, Full Time)
 * to the labels expected by the UI filter buttons.
 */
function normalizeJobType(raw: string): string {
  const v = raw.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
  if (v.includes('full')) return 'Full-Time';
  if (v.includes('part')) return 'Part-Time';
  if (v.includes('remote')) return 'Remote';
  if (v.includes('hybrid')) return 'Hybrid';
  if (v.includes('contract') || v.includes('freelance')) return 'Contract';
  if (v.includes('intern')) return 'Internship';
  // Title-case any remaining value as a safe fallback
  return raw
    .split(/[_\s-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('-');
}

/**
 * Normalises experience-level strings from the API (e.g. senior, MID, junior, FRESHER)
 * to the labels expected by the UI career-stage filter buttons.
 */
function normalizeExperienceLevel(raw: string): string {
  const v = raw.toLowerCase().trim();
  // Fresher / Entry
  if (v === 'fresher' || v === 'entry' || v === 'entry level' || v === 'entry-level' || v.includes('0-1') || v === '0') {
    return 'Fresher';
  }
  // Junior / 1-3
  if (v === 'junior' || v.includes('1-3') || v.includes('1 to 3') || v.includes('0-2') || v.includes('0-3')) {
    return '1-3 Years';
  }
  // Mid / 3-5
  if (v === 'mid' || v === 'middle' || v.includes('3-5') || v.includes('2-5') || v.includes('mid level') || v.includes('mid-level')) {
    return '3-5 Years';
  }
  // Senior / 5+
  if (v === 'senior' || v === 'lead' || v === 'staff' || v === 'principal' || v === 'expert' || v.includes('5+') || v.includes('5 ') || v.includes('+5') || v.includes('senior')) {
    return '5+ Years';
  }
  // Return as-is if no match (will simply not match any filter button, which is fine)
  return raw;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────
/**
 * Adapts a raw API job object to the `JobVacancy` shape used across the
 * frontend. Handles various possible field names defensively.
 */
export function mapApiJobToVacancy(job: ApiJob): JobVacancy {
  const id =
    job._id ||
    job.id ||
    job.externalId ||
    `job-${Math.random().toString(36).slice(2)}`;

  const title = extractString(job.title) || 'Untitled Role';

  const description = extractString(job.description || job.summary);

  const location = extractString(
    job.location ||
    job.locationText ||
    (job.city && job.country ? `${job.city}, ${job.country}` : null) ||
    job.city
  ) || 'Remote';

  const companyName = extractString(
    job.organizationName ||
    job.companyName ||
    job.company
  ) || 'Company';

  const applyLink = extractString(job.applyUrl || job.applyLink || job.url);

  const rawJobType = extractString(
    job.jobType ||
    job.type ||
    job.employmentType ||
    job.taxonomy ||
    job.category
  ) || 'Full-Time';
  // Normalize to UI label (FULL_TIME → Full-Time, etc.)
  const jobType = normalizeJobType(rawJobType);

  const rawExperienceLevel = extractString(
    job.experienceLevel || job.seniority
  );
  // Normalize to UI label (senior → 5+ Years, mid → 3-5 Years, etc.)
  const experienceLevel = rawExperienceLevel ? normalizeExperienceLevel(rawExperienceLevel) : '';

  const salary = extractString(
    job.salary || job.salaryRange || job.compensation
  ) || 'Competitive';

  const skills = extractStringArray(
    job.skills ||
    job.tags ||
    job.keywords
  );

  const createdAt = extractString(
    job.createdAt ||
    job.publishedAt ||
    job.postedAt ||
    job.updatedAt
  ) || new Date().toISOString();

  return {
    id,
    recruiterId: 'api',
    companyName,
    title,
    degree: '',
    location,
    skills,
    jobType,
    experienceLevel,
    salary,
    description,
    applyLink,
    status: 'Active',
    createdAt,
    views: 0,
    clicks: 0,
  };
}

// ─── API call ─────────────────────────────────────────────────────────────────
/**
 * Fetches active jobs from the real Squrx backend (`GET /jobs`).
 * Requires a valid JWT bearer token — the student must be logged in.
 */
export async function fetchJobs(
  params: FetchJobsParams = {}
): Promise<JobVacancy[]> {
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

  // ── Normalise the response — the backend may wrap data in several ways ──
  let rawJobs: ApiJob[] = [];

  const payload = json?.data ?? json;

  if (Array.isArray(payload)) {
    // data is directly an array
    rawJobs = payload;
  } else if (payload && typeof payload === 'object') {
    // data is an object with a nested array
    if (Array.isArray(payload.jobs)) {
      rawJobs = payload.jobs;
    } else if (Array.isArray(payload.data)) {
      rawJobs = payload.data;
    } else if (Array.isArray(payload.results)) {
      rawJobs = payload.results;
    }
  }

  return rawJobs.map(mapApiJobToVacancy);
}
