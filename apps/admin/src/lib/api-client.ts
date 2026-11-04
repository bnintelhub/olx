import axios from 'axios';

// Base Axios client configured for secure, HTTP-only cookie authentication
export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Automatically sends and receives HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mutex promise to prevent duplicate concurrent refresh requests
let refreshPromise: Promise<boolean> | null = null;

// Silently refreshes authentication cookies using the HTTP-only refresh_token cookie
export async function executeSilentRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  // Use raw axios to bypass apiClient interceptors and avoid recursion
  refreshPromise = axios
    .post('/api/v1/auth/refresh', {}, { withCredentials: true })
    .then((res) => {
      return Boolean(res.data?.success);
    })
    .catch(() => {
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
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');
    const isLoginCall = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/admin-login');

    if (error.response?.status === 401 && !originalRequest?._retry && !isRefreshCall && !isLoginCall) {
      originalRequest._retry = true;

      const refreshSuccess = await executeSilentRefresh();
      if (refreshSuccess) {
        // Retry original request with newly issued session cookies
        return apiClient(originalRequest);
      }

      // If refresh failed completely, session is invalid
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
