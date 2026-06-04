import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Tự động nhận diện IP của máy tính chạy server để điện thoại kết nối chính xác qua Wi-Fi
  const hostname = window.location.hostname;
  return `http://${hostname}:5000`;
};

const API = axios.create({
  baseURL: getBaseURL(),
});

// Tự động thêm token vào mỗi request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.authorization = token;
  return config;
});
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;