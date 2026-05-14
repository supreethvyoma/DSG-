import axios from "axios";

const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");

if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl;
}

export { apiBaseUrl };
