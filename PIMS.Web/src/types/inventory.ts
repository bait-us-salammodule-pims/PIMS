// PIMS Inventory & Stock Transfers Types
// Sourced strictly from PIMS.Application.DTOs.Inventory and PIMS.Domain.Enums

// ==========================================
// Status Enums (Const Objects for erasableSyntaxOnly compatibility)
// ==========================================

export const StockMovementType = {
  GoodsReceipt: 0,
  StockIssue: 1,
  TransferIn: 2,
  TransferOut: 3,
  AdjustmentIn: 4,
  AdjustmentOut: 5,
} as const;

export type StockMovementType =
  (typeof StockMovementType)[keyof typeof StockMovementType];

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  [StockMovementType.GoodsReceipt]: 'Goods Receipt',
  [StockMovementType.StockIssue]: 'Stock Issue',
  [StockMovementType.TransferIn]: 'Transfer In',
  [StockMovementType.TransferOut]: 'Transfer Out',
  [StockMovementType.AdjustmentIn]: 'Adjustment In',
  [StockMovementType.AdjustmentOut]: 'Adjustment Out',
};

export const STOCK_MOVEMENT_TYPE_BADGE_CLASSES: Record<StockMovementType, string> = {
  [StockMovementType.GoodsReceipt]: 'badge-success',
  [StockMovementType.StockIssue]: 'badge-warning',
  [StockMovementType.TransferIn]: 'badge-cyan',
  [StockMovementType.TransferOut]: 'badge-purple',
  [StockMovementType.AdjustmentIn]: 'badge-success',
  [StockMovementType.AdjustmentOut]: 'badge-danger',
};

export const StockTransferStatus = {
  Draft: 0,
  Submitted: 1,
  Approved: 2,
  Dispatched: 3,
  Received: 4,
  Rejected: 5,
  Cancelled: 6,
} as const;

export type StockTransferStatus =
  (typeof StockTransferStatus)[keyof typeof StockTransferStatus];

export const STOCK_TRANSFER_STATUS_LABELS: Record<StockTransferStatus, string> = {
  [StockTransferStatus.Draft]: 'Draft',
  [StockTransferStatus.Submitted]: 'Submitted (Pending Approval)',
  [StockTransferStatus.Approved]: 'Approved (Ready to Dispatch)',
  [StockTransferStatus.Dispatched]: 'Dispatched (In Transit)',
  [StockTransferStatus.Received]: 'Received (Completed)',
  [StockTransferStatus.Rejected]: 'Rejected',
  [StockTransferStatus.Cancelled]: 'Cancelled',
};

export const STOCK_TRANSFER_STATUS_BADGE_CLASSES: Record<StockTransferStatus, string> = {
  [StockTransferStatus.Draft]: 'badge-secondary',
  [StockTransferStatus.Submitted]: 'badge-warning',
  [StockTransferStatus.Approved]: 'badge-primary',
  [StockTransferStatus.Dispatched]: 'badge-purple',
  [StockTransferStatus.Received]: 'badge-success',
  [StockTransferStatus.Rejected]: 'badge-danger',
  [StockTransferStatus.Cancelled]: 'badge-secondary',
};

// ==========================================
// DTOs matching backend C# records
// ==========================================

export interface InventoryBalanceResponse {
  id: number;
  storeId: number;
  storeName: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
}

export interface StockMovementResponse {
  id: number;
  storeId: number;
  storeName: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  movementType: StockMovementType;
  quantity: number;
  movementDate: string;
  referenceType: string;
  referenceNumber: string;
  notes: string | null;
}

export interface StockAdjustmentDto {
  storeId: number;
  itemId: number;
  quantity: number;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface StockReservationDto {
  storeId: number;
  itemId: number;
  quantity: number;
}

export interface CreateStockTransferItemDto {
  itemId: number;
  requestedQuantity: number;
  notes?: string | null;
}

export interface CreateStockTransferDto {
  sourceStoreId: number;
  destinationStoreId: number;
  requestedBy?: string | null;
  notes?: string | null;
  items: CreateStockTransferItemDto[];
}

export interface StockTransferItemResponse {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  requestedQuantity: number;
  dispatchedQuantity: number;
  receivedQuantity: number;
  notes: string | null;
}

export interface StockTransferResponse {
  id: number;
  transferNumber: string;
  sourceStoreId: number;
  sourceStoreName: string;
  destinationStoreId: number;
  destinationStoreName: string;
  transferDate: string;
  status: StockTransferStatus;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  items: StockTransferItemResponse[];
}

export interface ApproveStockTransferDto {
  approvedBy: string;
}

export interface UpdateStockTransferNotesDto {
  notes?: string | null;
}

// ==========================================
// UI Helpers & Line Item Form State
// ==========================================

export interface TransferFormItemState {
  key: string;
  itemId: number | '';
  requestedQuantity: number | '';
  notes: string;
  availableQuantity?: number;
}

