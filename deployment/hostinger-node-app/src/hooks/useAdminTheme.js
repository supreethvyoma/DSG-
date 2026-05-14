import { useEffect, useState } from "react";

const STORAGE_KEY = "admin-theme";

export function useAdminTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "dark";
  });

  useEffect(() => {
    document.body.classList.toggle("admin-dark", isDarkMode);
    localStorage.setItem(STORAGE_KEY, isDarkMode ? "dark" : "light");

    return () => {
      document.body.classList.remove("admin-dark");
    };
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  return { isDarkMode, toggleDarkMode };
}
