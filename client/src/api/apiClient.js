import axios from "axios";
import { getBaseUrl } from '../config';
import store from '../store/ReduxStore';

const API = axios.create({ baseURL: getBaseUrl() });

// Request interceptor: attach auth token
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Response interceptor: handle token expiration / 401 errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Don't auto-redirect on failed login or register attempts
      const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');
      
      if (!isAuthAttempt) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('profile');
        store.dispatch({ type: "LOG_OUT" });
        if (typeof window !== 'undefined' && 
            window.location.pathname !== '/landing' && 
            window.location.pathname !== '/auth') {
          window.location.href = "/landing";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
export { API };
