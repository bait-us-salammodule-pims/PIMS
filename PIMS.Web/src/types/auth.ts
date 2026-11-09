// PIMS Authentication Types
// Sourced strictly from PIMS.Application.DTOs.Auth and PIMS.API.Controllers.AuthController

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: number;
  fullName: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  token: string;
  expiresAt: string;
}

export interface CurrentUserResponse {
  userId: number;
  fullName: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  branchId: number | null;
  departmentId: number | null;
  storeId: number | null;
}

export interface AuthApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiErrorResponse {
  status?: number;
  title?: string;
  message?: string;
  traceId?: string;
  error?: string;
}
