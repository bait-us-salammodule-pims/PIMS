import { apiClient } from './client';
import type {
  HeadOffice,
  HeadOfficeFormData,
  Branch,
  BranchFormData,
  Department,
  DepartmentFormData,
  SubDepartment,
  SubDepartmentFormData,
} from '../types/organization';

export const organizationService = {
  // ==========================================
  // Head Offices API
  // ==========================================
  async getHeadOffices(includeInactive = false): Promise<HeadOffice[]> {
    const response = await apiClient.get<HeadOffice[]>('/organization/head-offices', {
      params: { includeInactive },
    });
    return response.data;
  },

  async getHeadOfficeById(id: number): Promise<HeadOffice> {
    const response = await apiClient.get<HeadOffice>(`/organization/head-offices/${id}`);
    return response.data;
  },

  async createHeadOffice(data: HeadOfficeFormData): Promise<HeadOffice> {
    const response = await apiClient.post<HeadOffice>('/organization/head-offices', data);
    return response.data;
  },

  async updateHeadOffice(id: number, data: HeadOfficeFormData): Promise<HeadOffice> {
    const response = await apiClient.put<HeadOffice>(`/organization/head-offices/${id}`, {
      id,
      ...data,
    });
    return response.data;
  },

  async deactivateHeadOffice(id: number): Promise<void> {
    await apiClient.patch(`/organization/head-offices/${id}/deactivate`);
  },

  async activateHeadOffice(id: number): Promise<void> {
    await apiClient.patch(`/organization/head-offices/${id}/activate`);
  },

  // ==========================================
  // Branches API
  // ==========================================
  async getBranches(headOfficeId?: number, includeInactive = false): Promise<Branch[]> {
    const params: Record<string, unknown> = { includeInactive };
    if (headOfficeId && headOfficeId > 0) {
      params.headOfficeId = headOfficeId;
    }
    const response = await apiClient.get<Branch[]>('/organization/branches', { params });
    return response.data;
  },

  async getBranchById(id: number): Promise<Branch> {
    const response = await apiClient.get<Branch>(`/organization/branches/${id}`);
    return response.data;
  },

  async createBranch(data: BranchFormData): Promise<Branch> {
    const response = await apiClient.post<Branch>('/organization/branches', data);
    return response.data;
  },

  async updateBranch(id: number, data: BranchFormData): Promise<Branch> {
    const response = await apiClient.put<Branch>(`/organization/branches/${id}`, {
      id,
      ...data,
    });
    return response.data;
  },

  async deactivateBranch(id: number): Promise<void> {
    await apiClient.patch(`/organization/branches/${id}/deactivate`);
  },

  async activateBranch(id: number): Promise<void> {
    await apiClient.patch(`/organization/branches/${id}/activate`);
  },

  // ==========================================
  // Departments API
  // ==========================================
  async getDepartments(branchId?: number, includeInactive = false): Promise<Department[]> {
    const params: Record<string, unknown> = { includeInactive };
    if (branchId && branchId > 0) {
      params.branchId = branchId;
    }
    const response = await apiClient.get<Department[]>('/organization/departments', { params });
    return response.data;
  },

  async getDepartmentById(id: number): Promise<Department> {
    const response = await apiClient.get<Department>(`/organization/departments/${id}`);
    return response.data;
  },

  async createDepartment(data: DepartmentFormData): Promise<Department> {
    const response = await apiClient.post<Department>('/organization/departments', data);
    return response.data;
  },

  async updateDepartment(id: number, data: DepartmentFormData): Promise<Department> {
    const response = await apiClient.put<Department>(`/organization/departments/${id}`, {
      id,
      ...data,
    });
    return response.data;
  },

  async deactivateDepartment(id: number): Promise<void> {
    await apiClient.patch(`/organization/departments/${id}/deactivate`);
  },

  async activateDepartment(id: number): Promise<void> {
    await apiClient.patch(`/organization/departments/${id}/activate`);
  },

  // ==========================================
  // Sub-Departments API
  // ==========================================
  async getSubDepartments(departmentId?: number, includeInactive = false): Promise<SubDepartment[]> {
    const params: Record<string, unknown> = { includeInactive };
    if (departmentId && departmentId > 0) {
      params.departmentId = departmentId;
    }
    const response = await apiClient.get<SubDepartment[]>('/organization/sub-departments', { params });
    return response.data;
  },

  async getSubDepartmentById(id: number): Promise<SubDepartment> {
    const response = await apiClient.get<SubDepartment>(`/organization/sub-departments/${id}`);
    return response.data;
  },

  async createSubDepartment(data: SubDepartmentFormData): Promise<SubDepartment> {
    const response = await apiClient.post<SubDepartment>('/organization/sub-departments', data);
    return response.data;
  },

  async updateSubDepartment(id: number, data: SubDepartmentFormData): Promise<SubDepartment> {
    const response = await apiClient.put<SubDepartment>(`/organization/sub-departments/${id}`, {
      id,
      ...data,
    });
    return response.data;
  },

  async deactivateSubDepartment(id: number): Promise<void> {
    await apiClient.patch(`/organization/sub-departments/${id}/deactivate`);
  },

  async activateSubDepartment(id: number): Promise<void> {
    await apiClient.patch(`/organization/sub-departments/${id}/activate`);
  },
};
