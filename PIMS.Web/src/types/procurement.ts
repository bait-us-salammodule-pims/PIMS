// Sourced strictly from PIMS.Application.DTOs.Procurement and PIMS.Domain.Enums

// ==========================================
// Status Enums (Const Objects for erasableSyntaxOnly)
// ==========================================
export const PurchaseRequestStatus = {
  Draft: 0,
  Submitted: 1,
  UnderReview: 2,
  Approved: 3,
  Rejected: 4,
  Cancelled: 5,
} as const;

export type PurchaseRequestStatus =
  (typeof PurchaseRequestStatus)[keyof typeof PurchaseRequestStatus];

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  [PurchaseRequestStatus.Draft]: 'Draft',
  [PurchaseRequestStatus.Submitted]: 'Submitted',
  [PurchaseRequestStatus.UnderReview]: 'Under Review',
  [PurchaseRequestStatus.Approved]: 'Approved',
  [PurchaseRequestStatus.Rejected]: 'Rejected',
  [PurchaseRequestStatus.Cancelled]: 'Cancelled',
};

export const QuotationStatus = {
  Draft: 0,
  SentToVendors: 1,
  ResponsesReceived: 2,
  UnderComparison: 3,
  Awarded: 4,
  Cancelled: 5,
} as const;

export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  [QuotationStatus.Draft]: 'Draft',
  [QuotationStatus.SentToVendors]: 'Sent to Vendors',
  [QuotationStatus.ResponsesReceived]: 'Responses Received',
  [QuotationStatus.UnderComparison]: 'Under Comparison',
  [QuotationStatus.Awarded]: 'Awarded',
  [QuotationStatus.Cancelled]: 'Cancelled',
};

export const PurchaseOrderStatus = {
  Draft: 0,
  PendingApproval: 1,
  Approved: 2,
  Issued: 3,
  PartiallyReceived: 4,
  FullyReceived: 5,
  Cancelled: 6,
} as const;

export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.Draft]: 'Draft',
  [PurchaseOrderStatus.PendingApproval]: 'Pending Approval',
  [PurchaseOrderStatus.Approved]: 'Approved',
  [PurchaseOrderStatus.Issued]: 'Issued',
  [PurchaseOrderStatus.PartiallyReceived]: 'Partially Received',
  [PurchaseOrderStatus.FullyReceived]: 'Fully Received',
  [PurchaseOrderStatus.Cancelled]: 'Cancelled',
};

// ==========================================
// Purchase Request DTOs
// ==========================================
export interface CreatePurchaseRequestItemDto {
  itemId: number;
  quantity: number;
  unitOfMeasureId?: number | null;
  remarks?: string | null;
}

export interface CreatePurchaseRequestDto {
  requestNumber: string;
  departmentId: number;
  subDepartmentId?: number | null;
  requiredDate: string;
  justification: string;
  items: CreatePurchaseRequestItemDto[];
}

export interface UpdatePurchaseRequestDto {
  departmentId: number;
  subDepartmentId?: number | null;
  requiredDate: string;
  justification: string;
}

export interface UpdatePurchaseRequestItemDto {
  quantity: number;
  unitOfMeasureId?: number | null;
  remarks?: string | null;
}

export interface PurchaseRequestItemResponse {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitOfMeasureId?: number | null;
  unitOfMeasureName?: string | null;
  remarks?: string | null;
}

export interface PurchaseRequestResponse {
  id: number;
  requestNumber: string;
  requestedByUserId: number;
  requestedByName: string;
  departmentId: number;
  departmentName: string;
  subDepartmentId?: number | null;
  subDepartmentName?: string | null;
  requiredDate: string;
  justification: string;
  status: PurchaseRequestStatus;
  createdAt: string;
  updatedAt?: string | null;
  items: PurchaseRequestItemResponse[];
}

// ==========================================
// Quotation / RFQ DTOs
// ==========================================
export interface CreateQuotationRequestDto {
  quotationNumber: string;
  purchaseRequestId: number;
  closingDate: string;
  notes?: string | null;
}

export interface UpdateQuotationRequestDto {
  closingDate: string;
  notes?: string | null;
}

export interface CreateVendorQuotationItemDto {
  purchaseRequestItemId: number;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  remarks?: string | null;
}

export interface CreateVendorQuotationDto {
  vendorId: number;
  vendorQuotationNumber: string;
  submittedAt: string;
  validUntil: string;
  notes?: string | null;
  items: CreateVendorQuotationItemDto[];
}

export interface VendorQuotationItemResponse {
  id: number;
  purchaseRequestItemId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  lineTotal: number;
  remarks?: string | null;
}

export interface VendorQuotationResponse {
  id: number;
  quotationRequestId: number;
  vendorId: number;
  vendorName: string;
  vendorQuotationNumber: string;
  submittedAt: string;
  validUntil: string;
  notes?: string | null;
  isSelected: boolean;
  totalAmount: number;
  items: VendorQuotationItemResponse[];
}

export interface QuotationRequestResponse {
  id: number;
  quotationNumber: string;
  purchaseRequestId: number;
  purchaseRequestNumber: string;
  closingDate: string;
  notes?: string | null;
  status: QuotationStatus;
  createdAt: string;
  updatedAt?: string | null;
  vendorQuotations: VendorQuotationResponse[];
}

export interface QuotationComparisonItemDto {
  vendorQuotationId: number;
  vendorId: number;
  vendorName: string;
  vendorQuotationNumber: string;
  totalAmount: number;
  isSelected: boolean;
}

// ==========================================
// Purchase Order DTOs
// ==========================================
export interface CreatePurchaseOrderItemDto {
  purchaseRequestItemId: number;
  quantity: number;
  unitPrice: number;
  taxPercentage?: number;
  remarks?: string | null;
}

export interface CreatePurchaseOrderDto {
  quotationRequestId: number;
  vendorQuotationId: number;
  orderDate: string;
  expectedDeliveryDate: string;
  notes?: string | null;
  items: CreatePurchaseOrderItemDto[];
}

export interface UpdatePurchaseOrderDto {
  expectedDeliveryDate: string;
  notes?: string | null;
}

export interface PurchaseOrderItemResponse {
  id: number;
  purchaseRequestItemId: number;
  itemId: number;
  itemName?: string | null;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  remarks?: string | null;
}

export interface PurchaseOrderResponse {
  id: number;
  orderNumber: string;
  purchaseRequestId: number;
  quotationRequestId: number;
  vendorQuotationId: number;
  vendorId: number;
  vendorName?: string | null;
  orderDate: string;
  expectedDeliveryDate: string;
  notes?: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  items: PurchaseOrderItemResponse[];
}
