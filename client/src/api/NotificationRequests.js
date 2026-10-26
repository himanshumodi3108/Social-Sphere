import API from './apiClient';

export const getNotifications = (page = 1, limit = 20, unreadOnly = false) => 
  API.get(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`);

export const getUnreadCount = () => API.get('/notifications/unread/count');

export const markAsRead = (notificationId) => 
  API.put(`/notifications/${notificationId}/read`);

export const markAllAsRead = () => API.put('/notifications/read/all');

export const deleteNotification = (notificationId) => 
  API.delete(`/notifications/${notificationId}`);
