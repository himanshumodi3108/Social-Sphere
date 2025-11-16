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

export const createGroup = (data) => API.post('/groups', data);

export const getGroups = (page = 1, limit = 20, search = '', privacy = '') => 
  API.get(`/groups?page=${page}&limit=${limit}&search=${search}&privacy=${privacy}`);

export const getGroup = (groupId) => API.get(`/groups/${groupId}`);

export const updateGroup = (groupId, data) => API.put(`/groups/${groupId}`, data);

export const deleteGroup = (groupId) => API.delete(`/groups/${groupId}`);

export const joinGroup = (groupId) => API.put(`/groups/${groupId}/join`);

export const leaveGroup = (groupId) => API.put(`/groups/${groupId}/leave`);

export const inviteToGroup = (groupId, inviteUserId) => 
  API.post(`/groups/${groupId}/invite`, { inviteUserId });

export const getGroupPosts = (groupId, page = 1, limit = 20) => 
  API.get(`/groups/${groupId}/posts?page=${page}&limit=${limit}`);

export const createGroupPost = (groupId, data) => 
  API.post(`/groups/${groupId}/posts`, data);

export const getGroupEvents = (groupId, page = 1, limit = 20) => 
  API.get(`/groups/${groupId}/events?page=${page}&limit=${limit}`);

export const createGroupEvent = (groupId, data) => 
  API.post(`/groups/${groupId}/events`, data);

export const rsvpToEvent = (groupId, eventId, rsvp) => 
  API.put(`/groups/${groupId}/events/${eventId}/rsvp`, { rsvp });

