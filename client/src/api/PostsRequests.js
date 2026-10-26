import API from './apiClient';

export const getTimelinePosts = (id, page = 1, limit = 10) => API.get(`/posts/${id}/timeline?page=${page}&limit=${limit}`);
export const getUserPosts = (id, page = 1, limit = 10) => API.get(`/posts/user/${id}?page=${page}&limit=${limit}`);
export const likePost = (id, userId) => API.put(`/posts/${id}/like`, { userId: userId });
export const updatePost = (id, data) => API.put(`/posts/${id}`, data);
export const deletePost = (id) => API.delete(`/posts/${id}`);
export const addComment = (postId, userId, text) => API.post(`/posts/${postId}/comment`, { userId, text });
export const likeComment = (postId, commentId, userId) => API.put(`/posts/${postId}/comment/${commentId}/like`, { userId });
export const savePost = (postId) => API.put(`/posts/${postId}/save`);
