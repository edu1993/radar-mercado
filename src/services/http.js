import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 125000,
  headers: {
    'Content-Type': 'application/json'
  }
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.data?.error) {
      return Promise.reject(new Error(error.response.data.error));
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('El servidor tardó demasiado en responder. Intentá nuevamente.'));
    }
    if (!error.response) {
      return Promise.reject(new Error('No se pudo conectar con el servidor. Verificá que el backend esté activo.'));
    }
    return Promise.reject(new Error(`Error HTTP ${error.response.status}`));
  }
);

export function authConfig(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}
