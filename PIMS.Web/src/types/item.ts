// Sourced strictly from PIMS.Application.DTOs.Items and backend Services

// ==========================================
// Item Category DTOs
// ==========================================
export interface ItemCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
  parentCategoryId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateItemCategoryRequest {
  name: string;
  code: string;
  description?: string | null;
  parentCategoryId?: number | null;
}

export interface UpdateItemCategoryRequest {
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  parentCategoryId?: number | null;
}

export interface ItemCategoryFormData {
  name: string;
  code: string;
  description: string;
  parentCategoryId: number | '';
  isActive: boolean;
}

// ==========================================
// Items Master DTOs
// ==========================================
export interface Item {
  id: number;
  itemCode: string;
  name: string;
  description: string | null;
  barcode: string | null;
  categoryId: number;
  categoryName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateItemRequest {
  itemCode: string;
  name: string;
  description?: string | null;
  barcode?: string | null;
  categoryId: number;
}

export interface UpdateItemRequest {
  itemCode: string;
  name: string;
  description?: string | null;
  barcode?: string | null;
  categoryId: number;
  isActive: boolean;
}

export interface ItemFormData {
  itemCode: string;
  name: string;
  description: string;
  barcode: string;
  categoryId: number | '';
  isActive: boolean;
}

// ==========================================
// Unit of Measure (UOM) DTOs
// ==========================================
export interface UnitOfMeasure {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateUnitOfMeasureRequest {
  name: string;
  code: string;
  description?: string | null;
}

export interface UpdateUnitOfMeasureRequest {
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

export interface UnitOfMeasureFormData {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

// ==========================================
// Package Type DTOs
// ==========================================
export interface PackageType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreatePackageTypeRequest {
  name: string;
  code: string;
  description?: string | null;
}

export interface UpdatePackageTypeRequest {
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

export interface PackageTypeFormData {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

// ==========================================
// Item Pricing DTOs
// ==========================================
export interface ItemPricing {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  unitPrice: number;
  currencyCode: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateItemPricingRequest {
  itemId: number;
  unitPrice: number;
  currencyCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface UpdateItemPricingRequest {
  unitPrice: number;
  currencyCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
}

export interface ItemPricingFormData {
  itemId: number | '';
  unitPrice: number | '';
  currencyCode: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}
