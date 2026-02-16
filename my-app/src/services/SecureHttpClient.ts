import AuthService from './AuthService';

/**
 * Secure HTTP Client
 * Wraps fetch with automatic token management
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  timeout?: number;
}

export class SecureHttpClient {
  private static apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  private static timeout = 30000; // 30 seconds

  /**
   * Secure fetch wrapper
   */
  static async fetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    const { skipAuth = false, timeout = this.timeout, ...fetchOptions } = options;

    let url = endpoint;
    if (!endpoint.startsWith('http')) {
      url = `${this.apiBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    }

    // Add auth header if not skipped
    if (!skipAuth && !endpoint.includes('/auth/login')) {
      const authHeader = await AuthService.getAuthHeader();
      fetchOptions.headers = {
        ...fetchOptions.headers,
        ...authHeader
      };
    }

    // Add default headers
    fetchOptions.headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...fetchOptions.headers
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Handle 401 - token expired or invalid
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await AuthService.refreshToken();
        if (refreshed) {
          // Retry request with new token
          return this.fetch(endpoint, options);
        } else {
          // Refresh failed, logout
          await AuthService.logout();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Convenience methods
   */
  static get(endpoint: string, options: FetchOptions = {}) {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  }

  static post(endpoint: string, body?: any, options: FetchOptions = {}) {
    return this.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static put(endpoint: string, body?: any, options: FetchOptions = {}) {
    return this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static delete(endpoint: string, options: FetchOptions = {}) {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * FormData for multipart requests (file uploads)
   */
  static async fetchFormData(
    endpoint: string,
    formData: FormData,
    options: FetchOptions = {}
  ): Promise<Response> {
    const { skipAuth = false, timeout = this.timeout, ...fetchOptions } = options;

    let url = endpoint;
    if (!endpoint.startsWith('http')) {
      url = `${this.apiBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    }

    // Add auth header
    if (!skipAuth) {
      const token = await AuthService.getValidToken();
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`
        };
      }
    }

    // Don't set Content-Type for FormData - browser will set it automatically
    if (fetchOptions.headers && typeof fetchOptions.headers === 'object' && !Array.isArray(fetchOptions.headers)) {
      const headersObj = fetchOptions.headers as Record<string, string>;
      const { 'Content-Type': _, ...restHeaders } = headersObj;
      fetchOptions.headers = restHeaders;
    }

    fetchOptions.body = formData;
    fetchOptions.method = 'POST';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (response.status === 401) {
        const refreshed = await AuthService.refreshToken();
        if (refreshed) {
          return this.fetchFormData(endpoint, formData, options);
        } else {
          await AuthService.logout();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

export default SecureHttpClient;
