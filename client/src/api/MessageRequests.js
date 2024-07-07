import axios from 'axios'


const API = axios.create({ baseURL: 'https://social-sphere-da82.onrender.com' });

export const getMessages = (id) => API.get(`/message/${id}`);

export const addMessage = (data) => API.post('/message/', data);