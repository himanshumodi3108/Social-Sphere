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

export const getTimelinePosts= (id, page = 1, limit = 10)=> API.get(`/posts/${id}/timeline?page=${page}&limit=${limit}`);
export const likePost=(id, userId)=>API.put(`posts/${id}/like`, {userId: userId});
export const updatePost = (id, data) => API.put(`/posts/${id}`, data);
export const deletePost = (id) => API.delete(`/posts/${id}`);
export const addComment = (postId, userId, text) => API.post(`/posts/${postId}/comment`, { userId, text });
export const likeComment = (postId, commentId, userId) => API.put(`/posts/${postId}/comment/${commentId}/like`, { userId });
export const savePost = (postId) => API.put(`/posts/${postId}/save`);