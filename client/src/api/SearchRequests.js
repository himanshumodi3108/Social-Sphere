import axios from "axios";
import { getBaseUrl } from '../config';
import store from '../store/ReduxStore';

const API = axios.create({ baseURL: getBaseUrl() });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Response interceptor to handle 401 errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired - clear token and logout
      localStorage.removeItem('authToken');
      localStorage.removeItem('profile'); // Remove old profile if exists
      store.dispatch({ type: "LOG_OUT" });
      window.location.href = "/landing";
    }
    return Promise.reject(error);
  }
);

export const search = (query, filters = {}) => {
  const params = new URLSearchParams();
  params.append('query', query);
  
  if (filters.type) params.append('type', filters.type);
  if (filters.hashtag) params.append('hashtag', filters.hashtag);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  
  return API.get(`/search?${params.toString()}`);
};

