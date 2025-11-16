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

export const uploadImage = (data) => API.post("/upload/", data);
export const uploadPost = (data) => API.post("/posts", data);
