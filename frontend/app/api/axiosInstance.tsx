import axios from "axios";
import BASE_URL from "./BaseUrl";
import { triggerUnauthenticatedModal } from "@/components/common/UnauthenticatedModal";

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      message?: unknown;
      error?: unknown;
      error_type?: unknown;
    };
  };
}

const clearAuthState = () => {
  if (typeof document !== "undefined") {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
    localStorage.removeItem("user_type");
  }
};

const isUnauthenticatedError = (error: unknown) => {
  const response = (error as ApiErrorShape | undefined)?.response;
  const status = response?.status;
  const payload = response?.data;

  const message = typeof payload?.message === "string" ? payload.message : "";
  const errorText = typeof payload?.error === "string" ? payload.error : "";

  return (
    status === 401 ||
    status === 403 ||
    message.toLowerCase().includes("unauthenticated") ||
    errorText.toLowerCase().includes("authentication required")
  );
};

// Read token from cookies
const getTokenFromCookies = () => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
};

// Read token from localStorage
const getTokenFromLocalStorage = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

// REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getTokenFromCookies() || getTokenFromLocalStorage();

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR - Handle subscription expiration and unauthenticated sessions
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isUnauthenticatedError(error)) {
      clearAuthState();
      triggerUnauthenticatedModal();
      return Promise.reject(error);
    }

    // Check if error is due to subscription expiration
    if (
      error?.response?.status === 403 &&
      error?.response?.data?.error_type === "SUBSCRIPTION_EXPIRED"
    ) {
      // Only redirect if not already on subscription page or auth pages
      const currentPath = window.location.pathname;
      const isAdmin = () => {
        try {
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          return (user?.role || "").toLowerCase() === "admin";
        } catch {
          return false;
        }
      };

      // Admin can access subscription page even if expired
      if (isAdmin() && (currentPath.includes("/admin/subscription") || currentPath.includes("/subscription-expired"))) {
        return Promise.reject(error);
      }

      // Redirect to subscription expired page
      if (!currentPath.includes("/subscription-expired") && !currentPath.includes("/auth")) {
        window.location.href = "/subscription-expired";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
