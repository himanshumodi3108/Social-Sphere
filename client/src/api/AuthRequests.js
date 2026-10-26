import axios from 'axios';
import { getBaseUrl } from '../config';

const API = axios.create({ baseURL: getBaseUrl() });

export const logIn = (formData) => API.post('/auth/login', formData);

export const signUp = (formData) => API.post('/auth/register', formData);
