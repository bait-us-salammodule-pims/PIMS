// PIMS Receiving / Goods Receipt (GRN) Types
// Sourced strictly from PIMS.Application.DTOs.Procurement and PIMS.Domain.Enums.GoodsReceiptStatus

// ==========================================
// Status Enums (Const Objects for erasableSyntaxOnly compatibility)
// ==========================================
export const GoodsReceiptStatus = {
  Draft: 0,
  Submitted: 1,
  Inspected: 2,
  Accepted: 3,
  PartiallyAccepted: 4,
  Rejected: 5,
  Cancelled: 6,
} as const;

export type GoodsReceiptStatus =
  (typeof GoodsReceiptStatus)[keyof typeof GoodsReceiptStatus];

export const GOODS_RECEIPT_STATUS_LABELS: Record<GoodsReceiptStatus, string> = {
  [GoodsReceiptStatus.Draft]: 'Draft',
  [GoodsReceiptStatus.Submitted]: 'Submitted (Pending Inspection)',
  [GoodsReceiptStatus.Inspected]: 'Inspected (Pending Decision)',
  [GoodsReceiptStatus.Accepted]: 'Accepted',
  [GoodsReceiptStatus.PartiallyAccepted]: 'Partially Accepted',
  [GoodsReceiptStatus.Rejected]: 'Rejected',
  [GoodsReceiptStatus.Cancelled]: 'Cancelled',
};

export const GOODS_RECEIPT_STATUS_BADGE_CLASSES: Record<GoodsReceiptStatus, string> = {
  [GoodsReceiptStatus.Draft]: 'badge-secondary',
  [GoodsReceiptStatus.Submitted]: 'badge-warning',
  [GoodsReceiptStatus.Inspected]: 'badge-purple',
  [GoodsReceiptStatus.Accepted]: 'badge-success',
  [GoodsReceiptStatus.PartiallyAccepted]: 'badge-cyan',
  [GoodsReceiptStatus.Rejected]: 'badge-danger',
  [GoodsReceiptStatus.Cancelled]: 'badge-secondary',
};

// ==========================================
// DTOs matching backend C# records
// ==========================================

export interface CreateGoodsReceiptItemDto {
  purchaseOrderItemId: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
  remarks?: string | null;
}

export interface CreateGoodsReceiptDto {
  purchaseOrderId: number;
  storeId: number;
  receiptDate: string;
  deliveryChallanNumber?: string | null;
  notes?: string | null;
  items: CreateGoodsReceiptItemDto[];
}

export interface GoodsReceiptItemResponse {
  id: number;
  purchaseOrderItemId: number;
  itemId: number;
  itemName: string | null;
  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason: string | null;
  remarks: string | null;
}

export interface GoodsReceiptResponse {
  id: number;
  receiptNumber: string;
  purchaseOrderId: number;
  purchaseOrderNumber: string | null;
  storeId: number;
  receiptDate: string;
  deliveryChallanNumber: string | null;
  notes: string | null;
  status: GoodsReceiptStatus;
  createdAt: string;
  items: GoodsReceiptItemResponse[];
}

// ==========================================
// UI Helpers & Form State
// ==========================================

export interface CreateReceiptLineItemState {
  purchaseOrderItemId: number;
  itemId: number;
  itemName: string;
  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  remainingQuantity: number;
  selected: boolean;
  receivedQuantity: number | '';
  acceptedQuantity: number | '';
  rejectedQuantity: number | '';
  rejectionReason: string;
  remarks: string;
  validationError?: string | null;
}

