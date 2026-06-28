import { create } from 'zustand';
import { API_BASE_URL } from '@/lib/config';

// ─────────────────────────────────────────────────────────────────────────────
let inMemoryToken: string | null = null;
let inMemoryIsNewUser = false;

export const getInMemToken = () => {
  if (!inMemoryToken) {
    inMemoryToken = sessionStorage.getItem('token');
  }
  return inMemoryToken;
};

export const setInMemToken = (token: string | null) => {
  inMemoryToken = token;
  if (token) {
    sessionStorage.setItem('token', token);
  } else {
    sessionStorage.removeItem('token');
  }
};

export const getInMemIsNewUser = () => inMemoryIsNewUser;
export const setInMemIsNewUser = (isNew: boolean) => {
  inMemoryIsNewUser = isNew;
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Wipe all SQURX-related keys from localStorage (app start / logout). */
export function clearSqurxLocalStorageKeys() {
  const keysToRemove: string[] = [];
  const prefixes = [
    'squrx_',
    'squrx-',
    'nexus-',
    'admin'
  ];
  const specificKeys = [
    'activemoduleid',
    'activesubmoduleid',
    'lastexternalreferrer',
    'lastexternalreferrertime'
  ];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const lowerKey = key.toLowerCase();
      const matchesPattern = prefixes.some(p => lowerKey.startsWith(p)) || 
                             lowerKey === 'token' || 
                             lowerKey.includes('squrx') ||
                             specificKeys.includes(lowerKey);
      if (matchesPattern) {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

/** Wipe all SQURX-related keys from sessionStorage (logout / failure). */
export function clearSqurxSessionStorageKeys() {
  const ssKeysToRemove: string[] = [];
  const prefixes = [
    'squrx_',
    'squrx-',
    'nexus-',
    'admin'
  ];
  const specificKeys = [
    'activemoduleid',
    'activesubmoduleid',
    'lastexternalreferrer',
    'lastexternalreferrertime'
  ];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      const lowerKey = key.toLowerCase();
      const matchesPattern = prefixes.some(p => lowerKey.startsWith(p)) || 
                             lowerKey === 'token' || 
                             lowerKey.includes('squrx') ||
                             specificKeys.includes(lowerKey);
      if (matchesPattern) {
        ssKeysToRemove.push(key);
      }
    }
  }
  ssKeysToRemove.forEach(k => sessionStorage.removeItem(k));
}

interface AuthStore {
  user: any | null;
  isAuthLoading: boolean;   // true while /me is in-flight on app load
  isAuthVerified: boolean;  // true once /me has resolved (success or failure)
  isNewUser: boolean;       // in-memory flag for signup trapping
  error: string | null;

  setAuth: (user: any, token: string) => void;
  logout: () => void;
  setNewUser: (isNew: boolean) => void;
  /** Called once on app mount. Validates token with /user/me before rendering protected routes. */
  verifySession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthLoading: true,   // start true so guards show spinner on first load
  isAuthVerified: false,
  isNewUser: false,
  error: null,

  setAuth: (user: any, token: string) => {
    // Normalise role to uppercase to match frontend role-checking
    const role = String(user.role).toUpperCase();
    const mappedUser = {
      ...user,
      role,
      name: user.fullName || user.name,
      id: user._id || user.id,
    };
    set({ user: mappedUser, isAuthVerified: true, isAuthLoading: false });
    setInMemToken(token);
  },

  setNewUser: (isNew: boolean) => {
    set({ isNewUser: isNew });
    setInMemIsNewUser(isNew);
  },

  logout: () => {
    // Clear session-scoped keys
    clearSqurxSessionStorageKeys();
    // Clear SQURX-related keys from localStorage
    clearSqurxLocalStorageKeys();
    setInMemToken(null);
    setInMemIsNewUser(false);

    set({ user: null, isAuthLoading: false, isAuthVerified: true, isNewUser: false, error: null });

    // Also reset the student store so stale profile data is gone immediately
    // (imported lazily to avoid circular deps at module level)
    import('@/features/student/store').then(({ useStudentStore }) => {
      useStudentStore.getState().reset();
    });

    // Reset RTK Query cache to clear sensitive details
    import('@/lib/store').then(({ store }) => {
      import('@/lib/store/api').then(({ baseApi }) => {
        store.dispatch(baseApi.util.resetApiState());
      });
    });
  },

  verifySession: async () => {
    // Aggressively clear any residual or legacy local storage SQURX keys on app startup
    clearSqurxLocalStorageKeys();

    const token = getInMemToken();

    if (!token) {
      // No active session token — show landing page, not dashboard.
      set({ user: null, isAuthLoading: false, isAuthVerified: true, isNewUser: false });
      return;
    }

    set({ isAuthLoading: true, isAuthVerified: false });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${API_BASE_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        // Bypass any stale browser cache for this auth check
        cache: 'no-store',
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;

        const role = String(data.role).toUpperCase();
        const mappedUser = {
          ...data,
          role,
          name: data.fullName || data.name,
          id: data._id || data.id,
        };
        set({ user: mappedUser, isAuthLoading: false, isAuthVerified: true });
      } else {
        // 401 / 403 / any non-OK → token is invalid or expired
        clearSqurxSessionStorageKeys();
        clearSqurxLocalStorageKeys();
        setInMemToken(null);
        setInMemIsNewUser(false);
        set({ user: null, isAuthLoading: false, isAuthVerified: true, isNewUser: false });

        import('@/lib/store').then(({ store }) => {
          import('@/lib/store/api').then(({ baseApi }) => {
            store.dispatch(baseApi.util.resetApiState());
          });
        });
      }
    } catch {
      // Network error / timeout — treat as not logged in
      clearSqurxSessionStorageKeys();
      clearSqurxLocalStorageKeys();
      setInMemToken(null);
      setInMemIsNewUser(false);
      set({ user: null, isAuthLoading: false, isAuthVerified: true, isNewUser: false });

      import('@/lib/store').then(({ store }) => {
        import('@/lib/store/api').then(({ baseApi }) => {
          store.dispatch(baseApi.util.resetApiState());
        });
      });
    }
  },
}));
