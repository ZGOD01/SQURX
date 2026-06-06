export const BASE_URL = 'https://squrx-backend.onrender.com/api/v1';

export const getAuthToken = () => localStorage.getItem('token');

const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 2500, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...rest, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const consultationApi = {
  getTimeSlots: async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/time-slots`, { timeout: 2500 });
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
      timeout: 4000
    });
    if (!res.ok) {
       const err = await res.json().catch(() => ({}));
       console.error("Booking API Validation Error Details:", err);
       
       let errorMessage = err.message || 'Failed to book consultation';
       if (err.errors && err.errors.length > 0) {
           errorMessage = `Validation Error: ${err.errors[0].message} (Field: ${err.errors[0].field})`;
           alert(errorMessage);
       } else {
           alert(errorMessage);
       }
       
       throw new Error(errorMessage);
     }
    const result = await res.json();
    if (result.success && result.data && result.data.token) {
        localStorage.setItem('token', result.data.token);
    }
    return result;
  },
  getMyAppointments: async () => {
    const token = getAuthToken();
    const res = await fetchWithTimeout(`${BASE_URL}/consultations/my-appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 2500
    });
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
  },

  uploadCv: async (userId: string, file: File): Promise<string> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('cv', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Note: Do NOT set Content-Type manually — browser sets it with the correct boundary for multipart/form-data

    const res = await fetchWithTimeout(`${BASE_URL}/students/${userId}`, {
      method: 'PUT',
      headers,
      body: formData,
      timeout: 30000,  // 30s — file uploads can be slow
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'CV upload failed');
    }

    const result = await res.json();
    // Backend returns the updated student object; extract the cvUrl from it
    const cvUrl = result?.data?.cvUrl || result?.data?.student?.cvUrl || '';
    return cvUrl;
  }
};
