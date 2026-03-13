import axios from "axios";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:5000";
const LEGACY_API_ORIGIN = "http://localhost:5000";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

axios.defaults.baseURL = apiBaseUrl;

axios.interceptors.request.use((config) => {
  if (!config.url) {
    return config;
  }

  if (config.url.startsWith(LEGACY_API_ORIGIN)) {
    return {
      ...config,
      url: `${apiBaseUrl}${config.url.slice(LEGACY_API_ORIGIN.length)}`
    };
  }

  return config;
});

export { apiBaseUrl };
