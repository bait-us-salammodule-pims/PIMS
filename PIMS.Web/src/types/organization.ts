// Organization Module Types
// Derived strictly from backend DTOs:
// PIMS.Application.DTOs.Organization (HeadOfficeDto, BranchDto, DepartmentDto, SubDepartmentDto)

export interface HeadOffice {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface HeadOfficeFormData {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Branch {
  id: number;
  headOfficeId: number;
  headOfficeName: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BranchFormData {
  headOfficeId: number;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Department {
  id: number;
  branchId: number;
  branchName: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DepartmentFormData {
  branchId: number;
  code: string;
  name: string;
  description?: string;
}

export interface SubDepartment {
  id: number;
  departmentId: number;
  departmentName: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SubDepartmentFormData {
  departmentId: number;
  code: string;
  name: string;
  description?: string;
}
