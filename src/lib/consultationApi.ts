import { API_BASE_URL as BASE_URL } from './config';
import { getInMemToken } from '@/features/auth/store';

export const getAuthToken = () => getInMemToken();


const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 30000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...rest, signal: controller.signal });
    clearTimeout(id);
    
    if (response.status === 403) {
      const clone = response.clone();
      clone.json().then(body => {
        if (body.message === 'Account not verified' || body.message?.toLowerCase().includes('verify') || body.message?.toLowerCase().includes('not verified')) {
          window.dispatchEvent(new CustomEvent('squrx-unverified-account'));
        }
      }).catch(() => {
        if (url.includes('/user/me') || url.includes('/consultations/')) {
          window.dispatchEvent(new CustomEvent('squrx-unverified-account'));
        }
      });
    }
    
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const consultationApi = {
  // GET /time-slots — returns dates within the current bookable window
  getTimeSlots: async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/time-slots`, { timeout: 30000 });
    if (!res.ok) throw new Error('Failed to fetch time slots');
    const body = await res.json();
    return body;
  },

  // GET /time-slots/calendar?month=YYYY-MM — returns full month calendar view
  getCalendarSlots: async (month?: string) => {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    const res = await fetchWithTimeout(`${BASE_URL}/time-slots/calendar${query}`, { timeout: 30000 });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch calendar slots');
    }
    return res.json();
  },

  // POST /consultations/book — submit consultation booking
  bookConsultation: async (data: any) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const sanitizedData = { ...data };
    if (sanitizedData.appointment) {
      if (typeof sanitizedData.appointment.dateId === 'string' && sanitizedData.appointment.dateId.includes('_')) {
        sanitizedData.appointment.dateId = sanitizedData.appointment.dateId.split('_')[0];
      }
      if (typeof sanitizedData.appointment.timeId === 'string' && sanitizedData.appointment.timeId.includes('_')) {
        sanitizedData.appointment.timeId = sanitizedData.appointment.timeId.split('_')[0];
      }
    }
    const res = await fetchWithTimeout(`${BASE_URL}/consultations/book`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sanitizedData),
      timeout: 30000
    });
    if (!res.ok) {
       const err = await res.json().catch(() => ({}));
       console.error("Booking API Error:", err);
       
       let errorMessage = err.message || 'Failed to book consultation';
       if (err.errors && err.errors.length > 0) {
           errorMessage = `Validation Error: ${err.errors[0].message} (Field: ${err.errors[0].field})`;
       }
       throw new Error(errorMessage);
     }
    const result = await res.json();
    return result;
  },
  getMyAppointments: async () => {
    const token = getAuthToken();
    const res = await fetchWithTimeout(`${BASE_URL}/consultations/my-appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000
    });
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
  },

  // POST /user/me/resume — upload CV/resume (.pdf, .doc, .docx, max 5MB)
  // Backend derives the user from the JWT token; no userId in URL needed.
  uploadCv: async (file: File): Promise<string> => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required to upload CV.');

    const lowerName = file.name.toLowerCase();
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (lowerName.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (lowerName.endsWith('.doc')) {
        mimeType = 'application/msword';
      } else if (lowerName.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
    }

    // Re-wrap with normalized MIME type so multipart header is correct
    const normalizedFile = new File([file], file.name, { type: mimeType });

    const formData = new FormData();
    // Backend accepts multipart field name = "resume"
    formData.append('resume', normalizedFile);

    // Do NOT set Content-Type manually — browser sets it with the correct multipart boundary
    const res = await fetchWithTimeout(`${BASE_URL}/user/me/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      timeout: 30000,
    });

    if (res.status === 413) {
      throw new Error('File size is too large for the server (HTTP 413 Content Too Large). Please upload a smaller file (under 2MB) or ask your backend developer to increase Nginx/Express body size limit (client_max_body_size).');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Resume upload failed with status ${res.status}`);
    }

    const result = await res.json();
    const data = result?.data || result;
    const resumeUrl = typeof data === 'string' ? data : (data?.resume || data?.cvUrl || data?.resumeUrl || data?.url || data?.path || '');
    if (!resumeUrl) {
      throw new Error(result?.message || 'Backend response did not include a valid resume URL.');
    }
    return resumeUrl;
  },

  /**
   * Sends a booking notification email to Counselling@squarex.com via the backend.
   *
   * NOTE: Consultation email sending is NOT built on the backend side.
   * There is no dedicated email/notification endpoint for this feature yet.
   * This method silently tries several common endpoint paths and falls back
   * gracefully so the booking confirmation flow is never blocked.
   * When the backend implements this, point the primary URL at the real endpoint.
   */
  sendBookingNotification: async (details: {
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    bookingDate: string;
    bookingTime: string;
    bookingSource: string;
  }): Promise<void> => {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const body = {
      to: 'Counselling@squarex.com',
      subject: `New Counselling Booking – ${details.bookingSource}`,
      studentName: details.studentName,
      studentEmail: details.studentEmail,
      studentPhone: details.studentPhone,
      bookingDate: details.bookingDate,
      bookingTime: details.bookingTime,
      bookingSource: details.bookingSource,
      // Plain-text body for servers that only accept a `message` field
      message: `New booking received via ${details.bookingSource}.\n\nStudent Name: ${details.studentName}\nStudent Email: ${details.studentEmail}\nPhone: ${details.studentPhone}\nDate: ${details.bookingDate}\nTime: ${details.bookingTime}`,
    };

    // Try the primary endpoint first, then common fallback paths.
    const endpoints = [
      `${BASE_URL}/notifications/booking`,
      `${BASE_URL}/contact`,
      `${BASE_URL}/admin/notify`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (res.ok || res.status === 201) return; // success – stop trying
      } catch {
        // ignore and try next endpoint
      }
    }
    // All endpoints failed – falls back silently; booking flow is unaffected.
    console.warn('[consultationApi] sendBookingNotification: email not built on backend yet. No reachable notification endpoint found.');
  },
};
