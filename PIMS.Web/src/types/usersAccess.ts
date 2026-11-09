// Users & Access Management Types
// Sourced strictly from PIMS.Application.DTOs.UsersAccess and backend controllers

export interface UserResponse {
  id: number;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  branchId: number | null;
  departmentId: number | null;
  storeId: number | null;
  roleIds: number[];
}

export interface CreateUserRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
  branchId?: number | null;
  departmentId?: number | null;
  storeId?: number | null;
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  branchId?: number | null;
  departmentId?: number | null;
  storeId?: number | null;
}

export interface AssignUserRoleRequest {
  roleId: number;
}

export interface RoleResponse {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  permissionIds: number[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string | null;
}

export interface UpdateRoleRequest {
  name: string;
  description?: string | null;
}

export interface PermissionResponse {
  id: number;
  code: string;
  name: string;
  module: string;
  isActive: boolean;
}

export interface CreatePermissionRequest {
  code: string;
  name: string;
  module: string;
}

export interface TabDto {
  id: number;
  name: string;
  code: string;
  route: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateTabDto {
  name: string;
  code: string;
  route?: string | null;
  icon?: string | null;
  sortOrder: number;
}

export interface RoleTabAccessDto {
  roleId: number;
  tabId: number;
  tabName: string;
  tabCode: string;
  canView: boolean;
}

export interface AssignRoleTabAccessDto {
  tabId: number;
  canView: boolean;
}

export interface UserStoreAssignmentResponse {
  userId: number;
  storeId: number;
  storeName: string;
  storeCode: string;
  isDefault: boolean;
}

export interface AssignUserStoreRequest {
  storeId: number;
  isDefault?: boolean;
}

