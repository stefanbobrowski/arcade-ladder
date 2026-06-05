import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true, // sends the HttpOnly arcade_token cookie automatically
});

// When the server returns 401, the token has expired or is invalid.
// Dispatch a custom event so AuthContext can clear the user state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('arcade:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
