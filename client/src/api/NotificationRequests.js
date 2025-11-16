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

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('profile');
      store.dispatch({ type: "LOG_OUT" });
      window.location.href = "/landing";
    }
    return Promise.reject(error);
  }
);

export const getNotifications = (page = 1, limit = 20, unreadOnly = false) => 
  API.get(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`);

export const getUnreadCount = () => API.get('/notifications/unread/count');

export const markAsRead = (notificationId) => 
  API.put(`/notifications/${notificationId}/read`);

export const markAllAsRead = () => API.put('/notifications/read/all');

export const deleteNotification = (notificationId) => 
  API.delete(`/notifications/${notificationId}`);

