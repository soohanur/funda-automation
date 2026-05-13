/**
 * Axios HTTP client. Reads JWT from localStorage and attaches Authorization.
 * Base URL = NEXT_PUBLIC_API_BASE (default http://localhost:8000/api/v1).
 */
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("auth_token");
    if (token) {
      cfg.headers = cfg.headers ?? {};
      cfg.headers.Authorization = `Bearer ${token}`;
    }
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("auth_token");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const API_BASE = BASE;
