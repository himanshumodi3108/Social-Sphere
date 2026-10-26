import API from './apiClient';

export const createStory = (data) => API.post('/stories', data);

export const getUserStories = (userId) => API.get(`/stories/${userId}`);

export const getTimelineStories = () => API.get('/stories/timeline');

export const viewStory = (storyId) => API.put(`/stories/${storyId}/view`);

export const deleteStory = (storyId) => API.delete(`/stories/${storyId}`);

export const reactToStory = (storyId, userId) => API.put(`/stories/${storyId}/react`, { userId });
