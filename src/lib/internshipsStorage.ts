export interface InternshipItem {
  companyName: string;
  company?: string;
  duration: string;
  role: string;
  title?: string;
  position?: string;
  designation?: string;
  _id?: string;
}

/**
 * Normalizes an internship record so that all standard field aliases
 * (companyName, company, duration, role, title, position, designation)
 * are populated. This avoids discrepancies between MongoDB schemas and UI bindings.
 */
export function normalizeInternshipItem(item: any): InternshipItem {
  if (!item || typeof item !== 'object') {
    return { companyName: '', company: '', duration: '', role: '', title: '' };
  }
  const comp = String(item.companyName || item.company || '').trim();
  const dur = String(item.duration || '').trim();
  const r = String(item.role || item.title || item.position || item.designation || item.jobTitle || '').trim();
  return {
    companyName: comp,
    company: comp,
    duration: dur,
    role: r,
    title: r,
    position: r,
    designation: r,
    ...(item._id ? { _id: item._id } : {})
  };
}

// Auto cleanup any old cross-user leak keys
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('squrx_internships_current');
  } catch {}
}

/**
 * Safely persists cleaned internships to localStorage strictly for the given user ID.
 * If the cleaned internships array is empty, removes the key so deleted internships stay deleted.
 */
export function saveStoredInternships(userId?: string, internships: any[] = []): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('squrx_internships_current');
    if (!userId || typeof userId !== 'string' || !userId.trim()) return;

    const cleaned = (Array.isArray(internships) ? internships : [])
      .filter((i: any) => i && (i.companyName?.trim() || i.company?.trim() || i.role?.trim() || i.title?.trim() || i.duration?.trim()))
      .map(normalizeInternshipItem);

    const key = `squrx_internships_${userId.trim()}`;
    if (cleaned.length > 0) {
      localStorage.setItem(key, JSON.stringify(cleaned));
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('[internshipsStorage] Failed to save stored internships:', err);
  }
}

/**
 * Retrieves stored internships strictly for the given user ID.
 * Never leaks data across different users or sessions.
 */
export function getStoredInternships(userId?: string): InternshipItem[] {
  if (typeof window === 'undefined') return [];
  if (!userId || typeof userId !== 'string' || !userId.trim()) return [];
  try {
    const key = `squrx_internships_${userId.trim()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeInternshipItem);
      }
    }
  } catch (err) {
    console.warn('[internshipsStorage] Failed to get stored internships:', err);
  }
  return [];
}
