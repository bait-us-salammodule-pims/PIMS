// Sourced strictly from PIMS.Application.DTOs.Vendors and PIMS.Domain.Enums.VendorApprovalStatus

export const VendorApprovalStatus = {
  PendingApproval: 0,
  Approved: 1,
  Blocked: 2,
} as const;

export type VendorApprovalStatus = (typeof VendorApprovalStatus)[keyof typeof VendorApprovalStatus];

export const VENDOR_APPROVAL_STATUS_LABELS: Record<VendorApprovalStatus, string> = {
  [VendorApprovalStatus.PendingApproval]: 'Pending Approval',
  [VendorApprovalStatus.Approved]: 'Approved',
  [VendorApprovalStatus.Blocked]: 'Blocked',
};

// ==========================================
// Vendor Directory Types
// ==========================================
export interface Vendor {
  id: number;
  code: string;
  name: string;
  legalName: string | null;
  taxRegistrationNumber: string | null;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  postalCode: string | null;
  paymentTermsDays: number;
  notes: string | null;
  approvalStatus: VendorApprovalStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateVendorRequest {
  code: string;
  name: string;
  legalName?: string | null;
  taxRegistrationNumber?: string | null;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  postalCode?: string | null;
  paymentTermsDays: number;
  notes?: string | null;
}

export interface UpdateVendorRequest extends CreateVendorRequest {}

export interface VendorFormData {
  code: string;
  name: string;
  legalName: string;
  taxRegistrationNumber: string;
  registrationNumber: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  paymentTermsDays: number | '';
  notes: string;
}

// ==========================================
// Vendor Contact Types
// ==========================================
export interface VendorContact {
  id: number;
  vendorId: number;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateVendorContactRequest {
  name: string;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

export interface UpdateVendorContactRequest extends CreateVendorContactRequest {}

export interface VendorContactFormData {
  name: string;
  designation: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

// ==========================================
// Vendor Item Pricing Types
// ==========================================
export interface VendorItemPrice {
  id: number;
  vendorId: number;
  itemId: number;
  itemName: string;
  itemCode: string;
  unitPrice: number;
  currencyCode: string;
  minimumOrderQuantity: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateVendorItemPriceRequest {
  itemId: number;
  unitPrice: number;
  currencyCode: string;
  minimumOrderQuantity: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface UpdateVendorItemPriceRequest extends CreateVendorItemPriceRequest {}

export interface VendorItemPriceFormData {
  itemId: number | '';
  unitPrice: number | '';
  currencyCode: string;
  minimumOrderQuantity: number | '';
  effectiveFrom: string;
  effectiveTo: string;
}
