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

export const getUser = (userId) => API.get(`/user/${userId}`);
export const updateUser = (id, formData) =>  API.put(`/user/${id}`, formData);
export const getAllUser = (page = 1, limit = 20)=> API.get(`/user?page=${page}&limit=${limit}`)
export const followUser = (id,data)=> API.put(`/user/${id}/follow`, data)
export const unfollowUser = (id, data)=> API.put(`/user/${id}/unfollow`, data)
export const blockUser = (id) => API.put(`/user/${id}/block`);
export const unblockUser = (id) => API.put(`/user/${id}/unblock`);
export const getSavedPosts = (userId, page = 1, limit = 20) => API.get(`/user/${userId}/saved?page=${page}&limit=${limit}`);