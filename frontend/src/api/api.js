// src/api/api.js
// All HTTP calls to the backend go through this module.
// Axios interceptors automatically attach the JWT to every request.

import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({ baseURL: BASE_URL });

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 globally ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login    = (email, password) => api.post("/auth/login",    { email, password });
export const register = (name, email, password) => api.post("/auth/register", { name, email, password });

// ── Leaves ───────────────────────────────────────────────────────────────────
export const getLeaves      = ()           => api.get("/leaves");
export const getLeave       = (id)         => api.get(`/leaves/${id}`);
export const createLeave    = (data)       => api.post("/leaves", data);
export const updateStatus   = (id, status) => api.patch(`/leaves/${id}/status`, { status });
export const deleteLeave    = (id)         => api.delete(`/leaves/${id}`);
export const getAllUsers     = ()           => api.get("/leaves/users/all");

export default api;
