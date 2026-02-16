/**
 * Secure Authentication Service
 * Gestisce token, refresh, e sicurezza della sessione
 */

const TOKEN_KEY = 'auth_token';
const EXPIRY_KEY = 'token_expiry';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_BUFFER = 5 * 60 * 1000; // Refresh 5 minuti prima della scadenza

interface AuthTokenPayload {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

export class AuthService {
  private static apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  /**
   * Store token securely
   */
  static setToken(payload: AuthTokenPayload): void {
    try {
      if (payload.token) {
        localStorage.setItem(TOKEN_KEY, payload.token);
        
        // Set token expiry (default 24 hours)
        const expiresIn = payload.expiresIn || 24 * 60 * 60 * 1000;
        const expiry = Date.now() + expiresIn;
        localStorage.setItem(EXPIRY_KEY, expiry.toString());
      }

      if (payload.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
      }
    } catch (e) {
      console.error('Failed to store token:', e);
    }
  }

  /**
   * Get valid token, refreshing if necessary
   */
  static async getValidToken(): Promise<string | null> {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);

    if (!token) return null;

    // Check if token is expired or expiring soon
    if (expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() > expiryTime - TOKEN_BUFFER) {
        // Token is expired or expiring soon, try to refresh
        const refreshed = await this.refreshToken();
        return refreshed ? localStorage.getItem(TOKEN_KEY) : null;
      }
    }

    return token;
  }

  /**
   * Refresh token from backend
   */
  static async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        this.clearAuth();
        return false;
      }

      const response = await fetch(`${this.apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      const data = await response.json();
      this.setToken(data);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuth();
      return false;
    }
  }

  /**
   * Get authorization header
   */
  static async getAuthHeader(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Clear all auth data
   */
  static clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.clear();
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);

    if (!token) return false;
    if (!expiry) return true;

    const expiryTime = parseInt(expiry, 10);
    return Date.now() < expiryTime;
  }

  /**
   * Logout and clear session
   */
  static async logout(): Promise<void> {
    try {
      const token = await this.getValidToken();
      if (token) {
        // Notify backend of logout
        await fetch(`${this.apiBase}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }).catch(() => {
          // Logout still happens even if server call fails
        });
      }
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Validate token structure (JWT parse without verification)
   */
  static parseToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(
        decodeURIComponent(atob(parts[1]).split('').map(c => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''))
      );
      
      return payload;
    } catch (e) {
      return null;
    }
  }
}

export default AuthService;
