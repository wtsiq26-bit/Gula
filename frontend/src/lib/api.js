// ──────────────────────────────────────────────────────────────
// Gula PMS — API Client
// Centralized fetch wrapper with auth token injection,
// error handling, and base URL configuration.
// ──────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Generic fetch wrapper for the Gula API.
 * Automatically injects the JWT token from localStorage.
 *
 * @param {string} endpoint — API path (e.g., "/auth/login")
 * @param {object} options — Fetch options override
 * @returns {Promise<object>} — Parsed JSON response
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Retrieve token from localStorage (client-side only)
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("gula_token");
  }

  // Build headers
  const headers = {
    ...(options.headers || {}),
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Inject auth token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    console.warn(`[API Client Network Warning] Failed to reach ${url}:`, err);
    throw new Error("تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الخادم والاتصال بالشبكة.");
  }

  // Handle non-OK responses
  if (!response.ok) {
    let errorMessage = "An unexpected error occurred.";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Ignore JSON parse error if body is not JSON
    }

    // If token is expired/invalid, clear it and redirect to login
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("gula_token");
      localStorage.removeItem("gula_user");
      localStorage.removeItem("gula_pharmacy");

      // Only redirect if not already on auth pages
      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/register")
      ) {
        window.location.href = "/login";
      }
    }

    throw new Error(errorMessage);
  }

  // Parse response based on responseType option
  if (options.responseType === "blob") {
    const blob = await response.blob();
    return { data: blob }; // Wrapped in data to mimic Axios structure for pos/page.tsx
  }

  // Parse JSON response
  const data = await response.json();
  return data;
}

// ─── Convenience Methods ─────────────────────────────────────

export const api = {
  get: (endpoint, options = {}) => apiClient(endpoint, { method: "GET", ...options }),

  post: (endpoint, body, options = {}) =>
    apiClient(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  put: (endpoint, body, options = {}) =>
    apiClient(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),

  patch: (endpoint, body, options = {}) =>
    apiClient(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...options,
    }),

  delete: (endpoint, options = {}) => apiClient(endpoint, { method: "DELETE", ...options }),
};
