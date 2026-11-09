import { apiClient } from './client';
import type {
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  PermissionResponse,
  CreatePermissionRequest,
  TabDto,
  CreateTabDto,
  RoleTabAccessDto,
  AssignRoleTabAccessDto,
  UserStoreAssignmentResponse,
  AssignUserStoreRequest,
} from '../types/usersAccess';

export const usersAccessService = {
  // ==========================================
  // Users Management APIs (/api/users)
  // ==========================================
  async getUsers(): Promise<UserResponse[]> {
    const response = await apiClient.get<UserResponse[]>('/users');
    return response.data;
  },

  async getUserById(id: number): Promise<UserResponse> {
    const response = await apiClient.get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    const response = await apiClient.post<UserResponse>('/users', data);
    return response.data;
  },

  async updateUser(id: number, data: UpdateUserRequest): Promise<UserResponse> {
    const response = await apiClient.put<UserResponse>(`/users/${id}`, data);
    return response.data;
  },

  async assignUserRole(userId: number, roleId: number): Promise<void> {
    await apiClient.post(`/users/${userId}/roles`, { roleId });
  },

  async activateUser(id: number): Promise<void> {
    await apiClient.post(`/users/${id}/activate`);
  },

  async deactivateUser(id: number): Promise<void> {
    await apiClient.post(`/users/${id}/deactivate`);
  },

  // ==========================================
  // Roles Management APIs (/api/roles)
  // ==========================================
  async getRoles(): Promise<RoleResponse[]> {
    const response = await apiClient.get<RoleResponse[]>('/roles');
    return response.data;
  },

  async getRoleById(id: number): Promise<RoleResponse> {
    const response = await apiClient.get<RoleResponse>(`/roles/${id}`);
    return response.data;
  },

  async createRole(data: CreateRoleRequest): Promise<RoleResponse> {
    const response = await apiClient.post<RoleResponse>('/roles', data);
    return response.data;
  },

  async updateRole(id: number, data: UpdateRoleRequest): Promise<RoleResponse> {
    const response = await apiClient.put<RoleResponse>(`/roles/${id}`, data);
    return response.data;
  },

  async activateRole(id: number): Promise<void> {
    await apiClient.patch(`/roles/${id}/activate`);
  },

  async deactivateRole(id: number): Promise<void> {
    await apiClient.patch(`/roles/${id}/deactivate`);
  },

  // ==========================================
  // Permissions APIs (/api/permissions)
  // ==========================================
  async getPermissions(): Promise<PermissionResponse[]> {
    const response = await apiClient.get<PermissionResponse[]>('/permissions');
    return response.data;
  },

  async getPermissionById(id: number): Promise<PermissionResponse> {
    const response = await apiClient.get<PermissionResponse>(`/permissions/${id}`);
    return response.data;
  },

  async createPermission(data: CreatePermissionRequest): Promise<PermissionResponse> {
    const response = await apiClient.post<PermissionResponse>('/permissions', data);
    return response.data;
  },

  async activatePermission(id: number): Promise<void> {
    await apiClient.post(`/permissions/${id}/activate`);
  },

  async deactivatePermission(id: number): Promise<void> {
    await apiClient.post(`/permissions/${id}/deactivate`);
  },

  // ==========================================
  // Role-Permission Mapping APIs (/api/roles/{roleId}/permissions)
  // ==========================================
  async getRolePermissions(roleId: number): Promise<PermissionResponse[]> {
    const response = await apiClient.get<PermissionResponse[]>(`/roles/${roleId}/permissions`);
    return response.data;
  },

  async assignRolePermission(roleId: number, permissionId: number): Promise<PermissionResponse> {
    const response = await apiClient.post<PermissionResponse>(
      `/roles/${roleId}/permissions/${permissionId}`
    );
    return response.data;
  },

  async removeRolePermission(roleId: number, permissionId: number): Promise<void> {
    await apiClient.delete(`/roles/${roleId}/permissions/${permissionId}`);
  },

  // ==========================================
  // System Tabs APIs (/api/tabs)
  // ==========================================
  async getTabs(): Promise<TabDto[]> {
    const response = await apiClient.get<TabDto[]>('/tabs');
    return response.data;
  },

  async createTab(data: CreateTabDto): Promise<TabDto> {
    const response = await apiClient.post<TabDto>('/tabs', data);
    return response.data;
  },

  // ==========================================
  // Role-Tab Access APIs (/api/roles/{roleId}/tabs)
  // ==========================================
  async getRoleTabs(roleId: number): Promise<RoleTabAccessDto[]> {
    const response = await apiClient.get<RoleTabAccessDto[]>(`/roles/${roleId}/tabs`);
    return response.data;
  },

  async assignRoleTab(roleId: number, data: AssignRoleTabAccessDto): Promise<RoleTabAccessDto> {
    const response = await apiClient.post<RoleTabAccessDto>(`/roles/${roleId}/tabs`, data);
    return response.data;
  },

  async removeRoleTab(roleId: number, tabId: number): Promise<void> {
    await apiClient.delete(`/roles/${roleId}/tabs/${tabId}`);
  },

  // ==========================================
  // User Store Assignment APIs (/api/users/{userId}/stores)
  // ==========================================
  async getUserStores(userId: number): Promise<UserStoreAssignmentResponse[]> {
    const response = await apiClient.get<UserStoreAssignmentResponse[]>(
      `/users/${userId}/stores`
    );
    return response.data;
  },

  async assignUserStore(
    userId: number,
    data: AssignUserStoreRequest
  ): Promise<UserStoreAssignmentResponse> {
    const response = await apiClient.post<UserStoreAssignmentResponse>(
      `/users/${userId}/stores`,
      data
    );
    return response.data;
  },

  async setDefaultUserStore(userId: number, storeId: number): Promise<void> {
    await apiClient.put(`/users/${userId}/stores/${storeId}/default`);
  },

  async removeUserStore(userId: number, storeId: number): Promise<void> {
    await apiClient.delete(`/users/${userId}/stores/${storeId}`);
  },
};

