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
    return res.json();
  },
  bookConsultation: async (data: any) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetchWithTimeout(`${BASE_URL}/consultations/book`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
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

  // POST /user/me/resume — upload CV/resume (PDF, DOC, DOCX supported, max 5MB)
  // Backend derives the user from the JWT token; no userId in URL needed.
  uploadCv: async (file: File): Promise<string> => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required to upload CV.');

    // Normalize the MIME type based on the file extension.
    // Windows browsers sometimes report .doc/.docx as 'application/octet-stream'
    // which causes the backend to reject the file even though it's valid.
    const name = file.name.toLowerCase();
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (name.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (name.endsWith('.doc')) {
        mimeType = 'application/msword';
      } else if (name.endsWith('.pdf')) {
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
  }
};
