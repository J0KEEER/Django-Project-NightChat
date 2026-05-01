import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Use a new axios instance to avoid infinite loops if refresh fails with 401
        const response = await axios.post(`${apiClient.defaults.baseURL}/api/accounts/login/refresh/`, {
          refresh: refreshToken
        });
        
        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);
        
        // If the refresh token also changed, update it
        if (response.data.refresh) {
          localStorage.setItem('refresh_token', response.data.refresh);
        }
        
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and let auth store handle logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // We could emit an event here if we wanted to strictly decouple from the store
        // but for now, we'll let components fetching data fail and trigger their own logout/redirects.
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
