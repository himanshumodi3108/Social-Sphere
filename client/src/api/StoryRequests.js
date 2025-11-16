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

export const createStory = (data) => API.post('/stories', data);

export const getUserStories = (userId) => API.get(`/stories/${userId}`);

export const getTimelineStories = () => API.get('/stories/timeline');

export const viewStory = (storyId) => API.put(`/stories/${storyId}/view`);

export const deleteStory = (storyId) => API.delete(`/stories/${storyId}`);

export const reactToStory = (storyId, userId) => API.put(`/stories/${storyId}/react`, { userId });

