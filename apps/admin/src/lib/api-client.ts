import axios from 'axios';

// Base Axios client configured for secure, HTTP-only cookie authentication.
// Automatically attaches and receives HTTP-only cookies on every request.
export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Context': 'admin',
  },
});

// Request interceptor guaranteeing Admin application context header on every outbound request
apiClient.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['X-App-Context'] = 'admin';
  return config;
});

// Mutex promise to prevent duplicate concurrent refresh requests
let refreshPromise: Promise<boolean> | null = null;

// Silently refreshes authentication cookies using the HTTP-only admin_refresh_token cookie.
// Returns a boolean indicating whether the refresh attempt succeeded.
export async function executeSilentRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  // Use raw axios to bypass apiClient interceptors and avoid recursion
  refreshPromise = axios
    .post(
      '/api/v1/auth/refresh',
      {},
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'X-App-Context': 'admin',
        },
      }
    )
    .then((res) => {
      return Boolean(res.data?.success);
    })
    .catch((err) => {
      console.warn('Silent refresh failed:', err.response?.data?.message || err.message);
      return false;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// Reactive 401 Interceptor:
// If an access token expires, catches the 401, renews cookies via silent refresh,
// and replays the original request automatically without disturbing the user.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    const isRefreshCall = url.includes('/auth/refresh');
    const isPublicAuthCall =
      url.includes('/auth/login') ||
      url.includes('/auth/admin-login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/invitation') ||
      url.includes('/auth/accept-invitation') ||
      url.includes('/auth/otp') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    // Do not attempt token refresh for public auth endpoints or logout
    if (isRefreshCall || isPublicAuthCall) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshSuccess = await executeSilentRefresh();
      if (refreshSuccess) {
        return apiClient(originalRequest);
      }

      // If refresh fails on protected routes, wipe cached session before redirecting to avoid infinite reload loops
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const loginPath = base ? `${base}/login` : '/login';
      const isPublicPage =
        window.location.pathname === loginPath ||
        window.location.pathname.startsWith(`${base}/accept-invite`);

      if (!isPublicPage) {
        try {
          localStorage.removeItem('olx-admin-user');
        } catch {
          // ignore
        }
        window.location.href = loginPath;
      }
    }

    return Promise.reject(error);
  }
);
