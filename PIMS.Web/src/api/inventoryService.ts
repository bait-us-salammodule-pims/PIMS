import { apiClient } from './client';
import type {
  InventoryBalanceResponse,
  StockMovementResponse,
  StockAdjustmentDto,
  StockReservationDto,
  StockTransferResponse,
  CreateStockTransferDto,
  ApproveStockTransferDto,
  UpdateStockTransferNotesDto,
} from '../types/inventory';

export const inventoryService = {
  // ==========================================
  // Inventory Balances APIs (/api/inventory/balances)
  // ==========================================

  async getBalances(storeId?: number, itemId?: number): Promise<InventoryBalanceResponse[]> {
    const params: Record<string, number> = {};
    if (storeId) params.storeId = storeId;
    if (itemId) params.itemId = itemId;

    const response = await apiClient.get<InventoryBalanceResponse[]>('/inventory/balances', {
      params,
    });
    return response.data;
  },

  async getBalance(storeId: number, itemId: number): Promise<InventoryBalanceResponse> {
    const response = await apiClient.get<InventoryBalanceResponse>(
      `/inventory/balances/${storeId}/${itemId}`
    );
    return response.data;
  },

  // ==========================================
  // Stock Movements Ledger APIs (/api/inventory/movements)
  // ==========================================

  async getMovements(storeId?: number, itemId?: number): Promise<StockMovementResponse[]> {
    const params: Record<string, number> = {};
    if (storeId) params.storeId = storeId;
    if (itemId) params.itemId = itemId;

    const response = await apiClient.get<StockMovementResponse[]>('/inventory/movements', {
      params,
    });
    return response.data;
  },

  // ==========================================
  // Stock Adjustments APIs (/api/inventory/adjustments)
  // ==========================================

  async increaseStock(data: StockAdjustmentDto): Promise<StockMovementResponse> {
    const response = await apiClient.post<StockMovementResponse>(
      '/inventory/adjustments/increase',
      data
    );
    return response.data;
  },

  async decreaseStock(data: StockAdjustmentDto): Promise<StockMovementResponse> {
    const response = await apiClient.post<StockMovementResponse>(
      '/inventory/adjustments/decrease',
      data
    );
    return response.data;
  },

  // ==========================================
  // Stock Reservations APIs (/api/inventory/reservations)
  // ==========================================

  async reserveStock(data: StockReservationDto): Promise<InventoryBalanceResponse> {
    const response = await apiClient.post<InventoryBalanceResponse>(
      '/inventory/reservations',
      data
    );
    return response.data;
  },

  async releaseReservation(data: StockReservationDto): Promise<InventoryBalanceResponse> {
    const response = await apiClient.post<InventoryBalanceResponse>(
      '/inventory/reservations/release',
      data
    );
    return response.data;
  },

  // ==========================================
  // Stock Transfers APIs (/api/stock-transfers)
  // ==========================================

  async getStockTransfers(): Promise<StockTransferResponse[]> {
    const response = await apiClient.get<StockTransferResponse[]>('/stock-transfers');
    return response.data;
  },

  async getStockTransferById(id: number): Promise<StockTransferResponse> {
    const response = await apiClient.get<StockTransferResponse>(`/stock-transfers/${id}`);
    return response.data;
  },

  async createStockTransfer(data: CreateStockTransferDto): Promise<StockTransferResponse> {
    const response = await apiClient.post<StockTransferResponse>('/stock-transfers', data);
    return response.data;
  },

  async submitStockTransfer(id: number): Promise<StockTransferResponse> {
    const response = await apiClient.post<StockTransferResponse>(
      `/stock-transfers/${id}/submit`
    );
    return response.data;
  },

  async approveStockTransfer(id: number, approvedBy: string): Promise<StockTransferResponse> {
    const payload: ApproveStockTransferDto = { approvedBy };
    const response = await apiClient.post<StockTransferResponse>(
      `/stock-transfers/${id}/approve`,
      payload
    );
    return response.data;
  },

  async rejectStockTransfer(id: number): Promise<StockTransferResponse> {
    const response = await apiClient.post<StockTransferResponse>(
      `/stock-transfers/${id}/reject`
    );
    return response.data;
  },

  async dispatchStockTransfer(id: number): Promise<StockTransferResponse> {
    const response = await apiClient.post<StockTransferResponse>(
      `/stock-transfers/${id}/dispatch`
    );
    return response.data;
  },

  async receiveStockTransfer(id: number): Promise<StockTransferResponse> {
    const response = await apiClient.post<StockTransferResponse>(
      `/stock-transfers/${id}/receive`
    );
    return response.data;
  },

  async cancelStockTransfer(id: number): Promise<StockTransferResponse> {
    const response = await apiClient.post<StockTransferResponse>(
      `/stock-transfers/${id}/cancel`
    );
    return response.data;
  },

  async updateStockTransferNotes(
    id: number,
    notes: string | null
  ): Promise<StockTransferResponse> {
    const payload: UpdateStockTransferNotesDto = { notes };
    const response = await apiClient.patch<StockTransferResponse>(
      `/stock-transfers/${id}/notes`,
      payload
    );
    return response.data;
  },
};

