import { createContext, useCallback, useEffect, useRef, useState } from "react";
import "../components/ui/Toast.css";

export const ToastContext = createContext({
  showToast: () => {}
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timersRef = useRef({});
  const lastToastRef = useRef({ message: "", type: "", time: 0 });

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const showToast = useCallback((message, type = "success", duration = 1800) => {
    const now = Date.now();
    const isDuplicate =
      lastToastRef.current.message === message &&
      lastToastRef.current.type === type &&
      now - lastToastRef.current.time < 500;

    if (isDuplicate) return;

    lastToastRef.current = { message, type, time: now };

    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);

    timersRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
      timersRef.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
