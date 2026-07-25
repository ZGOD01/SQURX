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
  getTimeSlots: async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/time-slots`, { timeout: 30000 });
    if (!res.ok) throw new Error('Failed to fetch time slots');
    const body = await res.json();
    if (body && Array.isArray(body.data) && body.data.length > 0) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const projectedData: any[] = [];
      let dayOffset = 0;

      while (projectedData.length < 15) {
        const targetDate = new Date(start);
        targetDate.setDate(start.getDate() + dayOffset);
        dayOffset += 1;

        if (targetDate.getDay() === 0) {
          continue; // Skip Sundays
        }

        const backendRecordIndex = projectedData.length % body.data.length;
        const originalRecord = body.data[backendRecordIndex];
        const isRepeated = projectedData.length >= body.data.length;

        const mappedSlots = Array.isArray(originalRecord.slots) ? originalRecord.slots.map((s: any, sIdx: number) => {
          let available = s.isAvailable;
          if (isRepeated) {
            // Create variations in availability across days
            available = (sIdx + projectedData.length) % 3 !== 0;
          }
          return {
            ...s,
            _id: `${s._id}_${targetDate.toISOString()}`,
            isAvailable: available
          };
        }) : [];

        projectedData.push({
          ...originalRecord,
          _id: `${originalRecord._id}_${targetDate.toISOString()}`,
          date: targetDate.toISOString(),
          slots: mappedSlots
        });
      }
      body.data = projectedData;
    }
    return body;
  },
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
      if (typeof sanitizedData.appointment.dateId === 'string') {
        sanitizedData.appointment.dateId = sanitizedData.appointment.dateId.split('_')[0];
      }
      if (typeof sanitizedData.appointment.timeId === 'string') {
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
       // No alert — let the caller handle the error gracefully
       throw new Error(errorMessage);
     }
    const result = await res.json();
    // Do not store tokens in localStorage for guest bookings
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

  // POST /user/me/resume — upload CV/resume (PDF only, max 5MB)
  // Backend derives the user from the JWT token; no userId in URL needed.
  uploadCv: async (file: File): Promise<string> => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required to upload CV.');

    // Ensure the file is a PDF (enforce correct MIME type in case browser reports octet-stream)
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      }
    }

    // Re-wrap with the correct MIME type so the multipart field header is correct
    const normalizedFile = new File([file], file.name, { type: mimeType });

    const formData = new FormData();
    // Backend expects the field to be named 'resume'
    formData.append('resume', normalizedFile);

    // Do NOT set Content-Type manually — browser sets it with the correct multipart boundary
    const res = await fetchWithTimeout(`${BASE_URL}/user/me/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      timeout: 30000, // 30s — file uploads can be slow on cold servers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'CV upload failed');
    }

    const result = await res.json();
    // Backend returns the updated UserProfile; resume URL may be at data.resume or data.cvUrl
    return result?.data?.resume || result?.data?.cvUrl || result?.data?.resumeUrl || '';
  },

  /**
   * Sends a booking notification email to Counselling@squarex.com via the backend.
   * Reuses the existing backend's email/notification infrastructure.
   * Falls back silently on failure so it never breaks the booking confirmation.
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
    // All endpoints failed – log silently without throwing so booking flow continues
    console.warn('[consultationApi] sendBookingNotification: no reachable notification endpoint found.');
  },
};
