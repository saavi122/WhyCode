import axios from "axios";

export const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return "/api";
  }
  return "http://localhost:5000/api";
};

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 45000,
});

// Request interceptor: attach Authorization header
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle cold-start retries, 401s, and waking up banner
API.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("whycode:server-status", { detail: { waking: false } }));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle cold-start 502, 503, 504, or network timeout on free tiers
    const isColdStart =
      !error.response ||
      error.response.status === 502 ||
      error.response.status === 503 ||
      error.response.status === 504 ||
      error.code === "ECONNABORTED";

    if (isColdStart && !originalRequest._isRetry && originalRequest.method === "get") {
      originalRequest._isRetry = true;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("whycode:server-status", {
            detail: { waking: true, message: "Waking up the server... Please wait a moment." },
          })
        );
      }

      // Wait 3 seconds and retry once
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return API(originalRequest);
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default API;
