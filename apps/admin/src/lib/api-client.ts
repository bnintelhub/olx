import axios from 'axios';
import { isTokenExpiringSoon } from '../features/auth/service/auth.service';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mutex promise to ensure only one refresh request runs concurrently
let refreshPromise: Promise<string | null> | null = null;

// Silently refreshes the access token using the stored refresh token or HTTP-only cookie
export async function executeSilentRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = localStorage.getItem('admin_refresh_token');

  refreshPromise = axios
    .post(
      '/api/v1/auth/refresh',
      { refreshToken },
      { withCredentials: true }
    )
    .then((res) => {
      const newAccessToken = res.data?.data?.accessToken;
      const newRefreshToken = res.data?.data?.refreshToken;

      if (newAccessToken) {
        localStorage.setItem('admin_access_token', newAccessToken);
        localStorage.setItem('admin_token', newAccessToken);
      }
      if (newRefreshToken) {
        localStorage.setItem('admin_refresh_token', newRefreshToken);
      }
      return newAccessToken || null;
    })
    .catch((err) => {
      // Clear credentials on invalid refresh session
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// Predictive Request Interceptor:
// Checks if the access token will expire within the next 60 seconds.
// If expiring soon, silently refreshes before the request is dispatched.
apiClient.interceptors.request.use(async (config) => {
  // Avoid intercepting refresh or logout endpoints to prevent recursive loops
  const isAuthBypassUrl = config.url?.includes('/auth/refresh') || config.url?.includes('/auth/login');
  let token = localStorage.getItem('admin_access_token') || localStorage.getItem('admin_token');

  if (!isAuthBypassUrl && token && isTokenExpiringSoon(token, 60)) {
    // Proactively refresh before the server rejects the request with a 401
    const freshToken = await executeSilentRefresh();
    if (freshToken) {
      token = freshToken;
    }
  }

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Reactive 401 Response Interceptor:
// Fallback if the token expired server-side unexpectedly (e.g. clock skew or revoked token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isRefreshCall) {
      originalRequest._retry = true;

      const freshToken = await executeSilentRefresh();
      if (freshToken) {
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        return apiClient(originalRequest);
      }

      // If refresh failed completely, redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
