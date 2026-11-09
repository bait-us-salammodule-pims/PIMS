import { apiClient, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './client';
import type {
  LoginRequest,
  AuthResponse,
  CurrentUserResponse,
  AuthApiResponse,
  RegisterRequest,
} from '../types/auth';

export const authService = {
  /**
   * Performs user login via POST /api/auth/login
   * Expects backend response: { success: true, data: AuthResponse }
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Authentication failed.');
    }

    const authData = response.data.data;
    // Persist JWT token
    localStorage.setItem(TOKEN_STORAGE_KEY, authData.token);

    return authData;
  },

  /**
   * Retrieves authenticated profile via GET /api/auth/me
   * Returns CurrentUserResponse including branchId, departmentId, storeId, roles & permissions
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    const response = await apiClient.get<AuthApiResponse<CurrentUserResponse>>(
      '/auth/me'
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to retrieve current user.');
    }

    const user = response.data.data;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  /**
   * Registers a new user via POST /api/auth/register
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthApiResponse<AuthResponse>>(
      '/auth/register',
      data
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Registration failed.');
    }

    return response.data.data;
  },

  /**
   * Clears auth tokens from browser storage
   */
  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  /**
   * Reads stored token if available
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  /**
   * Reads cached user if available
   */
  getCachedUser(): CurrentUserResponse | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUserResponse;
    } catch {
      return null;
    }
  },
};
