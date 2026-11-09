// Store Management Types
// Derived strictly from backend DTOs and Enums:
// PIMS.Application.DTOs.Stores & PIMS.Domain.Enums
// Defined using `as const` for TypeScript erasableSyntaxOnly compatibility.

export const StoreType = {
  MainStore: 1,
  SubStore: 2,
  DepartmentStore: 3,
  Pharmacy: 4,
  LabStore: 5,
  Other: 6,
} as const;
export type StoreType = (typeof StoreType)[keyof typeof StoreType];

export const StoreTypeLabels: Record<StoreType, string> = {
  [StoreType.MainStore]: 'Main Store',
  [StoreType.SubStore]: 'Sub Store',
  [StoreType.DepartmentStore]: 'Department Store',
  [StoreType.Pharmacy]: 'Pharmacy',
  [StoreType.LabStore]: 'Lab Store',
  [StoreType.Other]: 'Other',
};

export const PosType = {
  None: 1,
  Retail: 2,
  Wholesale: 3,
  Other: 4,
} as const;
export type PosType = (typeof PosType)[keyof typeof PosType];

export const PosTypeLabels: Record<PosType, string> = {
  [PosType.None]: 'None',
  [PosType.Retail]: 'Retail POS',
  [PosType.Wholesale]: 'Wholesale POS',
  [PosType.Other]: 'Other POS',
};

export const ReceiptFormat = {
  A4: 1,
  Thermal: 2,
} as const;
export type ReceiptFormat = (typeof ReceiptFormat)[keyof typeof ReceiptFormat];

export const ReceiptFormatLabels: Record<ReceiptFormat, string> = {
  [ReceiptFormat.A4]: 'Standard A4',
  [ReceiptFormat.Thermal]: 'Thermal Slip',
};

export const StoreLocationType = {
  Rack: 1,
  Drawer: 2,
} as const;
export type StoreLocationType = (typeof StoreLocationType)[keyof typeof StoreLocationType];

export const StoreLocationTypeLabels: Record<StoreLocationType, string> = {
  [StoreLocationType.Rack]: 'Rack',
  [StoreLocationType.Drawer]: 'Drawer',
};

export interface Store {
  id: number;
  name: string;
  code: string;
  imageUrl?: string | null;
  storeType: StoreType;
  receiptFormat: ReceiptFormat;
  posType: PosType;
  buildingLocation?: string | null;
  roomLocation?: string | null;
  email?: string | null;
  cellNo?: string | null;
  description?: string | null;
  branchId?: number | null;
  departmentId?: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStoreRequest {
  name: string;
  code: string;
  imageUrl?: string | null;
  storeType: StoreType;
  receiptFormat: ReceiptFormat;
  posType: PosType;
  buildingLocation?: string | null;
  roomLocation?: string | null;
  email?: string | null;
  cellNo?: string | null;
  description?: string | null;
  branchId?: number | null;
  departmentId?: number | null;
}

export interface UpdateStoreRequest {
  name: string;
  code: string;
  imageUrl?: string | null;
  storeType: StoreType;
  receiptFormat: ReceiptFormat;
  posType: PosType;
  buildingLocation?: string | null;
  roomLocation?: string | null;
  email?: string | null;
  cellNo?: string | null;
  description?: string | null;
  branchId?: number | null;
  departmentId?: number | null;
}

export interface StoreLocation {
  id: number;
  storeId: number;
  type: StoreLocationType;
  name: string;
  code: string;
  parentLocationId?: number | null;
  parentLocationName?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStoreLocationRequest {
  type: StoreLocationType;
  name: string;
  code: string;
  parentLocationId?: number | null;
}

export interface UpdateStoreLocationRequest {
  name: string;
  code: string;
}
