import axios from 'axios';

// In-Memory Access Token Storage (Never persisted to localStorage/sessionStorage to block XSS attacks)
let inMemoryAccessToken: string | null = null;

export function getInMemoryAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setInMemoryAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  // Automatically purge legacy localStorage credentials to prevent token leakage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('olx_access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('olx_refresh_token');
    } catch {
      // Storage unavailable or disabled
    }
  }
}

// Base Axios client configured for secure, HTTP-only cookie authentication.
// Automatically attaches and receives HTTP-only cookies on every request.
export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Context': 'client',
  },
});

// Proactively check if JWT token expires within 60 seconds to prevent 401 waterfall delays
function isTokenExpiringSoon(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return payload.exp * 1000 - Date.now() < 60_000;
  } catch {
    return false;
  }
}

// Request interceptor guaranteeing Client application context header and proactive token freshness
apiClient.interceptors.request.use(async (config) => {
  config.headers = config.headers || {};
  config.headers['X-App-Context'] = 'client';
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  let token = inMemoryAccessToken;

  // Proactive refresh: if token is close to expiry or missing, refresh silently via HttpOnly cookie
  const url = config.url || '';
  const isAuthBypass = url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/logout');
  if (!isAuthBypass && (!token || isTokenExpiringSoon(token))) {
    await executeSilentRefresh();
    token = inMemoryAccessToken;
  }

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mutex promise to prevent duplicate concurrent refresh requests
let refreshPromise: Promise<boolean> | null = null;

// Silently refreshes authentication cookies using the HTTP-only refresh_token cookie.
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
          'X-App-Context': 'client',
        },
      }
    )
    .then((res) => {
      const newToken =
        res.data?.data?.accessToken ||
        res.data?.data?.tokens?.accessToken ||
        res.data?.tokens?.accessToken ||
        null;
      setInMemoryAccessToken(newToken);
      return Boolean(res.data?.success && newToken);
    })
    .catch((err) => {
      // If refresh fails, clear in-memory token
      setInMemoryAccessToken(null);
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
      url.includes('/auth/register') ||
      url.includes('/auth/logout') ||
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
        const freshToken = inMemoryAccessToken;
        if (freshToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        }
        return apiClient(originalRequest);
      }
    }

    // Automatic Load Balancer Failover Retry:
    // If a server replica crashes mid-flight (502 Bad Gateway, 503 Unavailable, 504 Timeout, or network drop),
    // retry idempotent GET requests once so the Load Balancer routes to an active healthy server replica.
    const status = error.response?.status;
    const isFailoverCandidate = !error.response || status === 502 || status === 503 || status === 504;
    const isSafeMethod = !originalRequest.method || originalRequest.method.toLowerCase() === 'get';

    if (isFailoverCandidate && isSafeMethod && !originalRequest._failoverRetry) {
      originalRequest._failoverRetry = true;
      await new Promise((resolve) => setTimeout(resolve, 800));
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

