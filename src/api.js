import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const login = (email, password) => {
  return axios.post(`${API_URL}/login`, { email, password });
};

export const createUser = (userData) => {
  return axios.post(`${API_URL}/users`, userData, { headers: getAuthHeaders() });
};

export const getUsers = () => {
  return axios.get(`${API_URL}/users`, { headers: getAuthHeaders() });
};

export const makeAdmin = (email) => {
  return axios.post(`${API_URL}/users/make-admin`, { email }, { headers: getAuthHeaders() });
};
