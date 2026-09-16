// export const API_BASE_URL = 'http://localhost:8000/api/v1';
// export const API_BASE_URL = 'https://squrx-backend.onrender.com/api/v1';
export const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : 'https://api.squrex.com/api/v1';

