import API from './apiClient';

export const getUser = (userId) => API.get(`/user/${userId}`);
export const updateUser = (id, formData) => API.put(`/user/${id}`, formData);
export const getAllUser = (page = 1, limit = 20) => API.get(`/user?page=${page}&limit=${limit}`);
export const followUser = (id, data) => API.put(`/user/${id}/follow`, data);
export const unfollowUser = (id, data) => API.put(`/user/${id}/unfollow`, data);
export const blockUser = (id) => API.put(`/user/${id}/block`);
export const unblockUser = (id) => API.put(`/user/${id}/unblock`);
export const getSavedPosts = (userId, page = 1, limit = 20) => API.get(`/user/${userId}/saved?page=${page}&limit=${limit}`);
export const searchUsers = (query, page = 1, limit = 50) => API.get(`/user?page=${page}&limit=${limit}&search=${encodeURIComponent(query)}`);
