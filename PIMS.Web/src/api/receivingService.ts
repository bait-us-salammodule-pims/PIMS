import { apiClient } from './client';
import type {
  GoodsReceiptResponse,
  CreateGoodsReceiptDto,
} from '../types/receiving';

export interface StockMovementCheckDto {
  id: number;
  storeId: number;
  referenceType: string;
  referenceNumber: string;
}

export const receivingService = {
  // ==========================================
  // Goods Receipts APIs (/api/goods-receipts)
  // ==========================================

  async getGoodsReceipts(): Promise<GoodsReceiptResponse[]> {
    const response = await apiClient.get<GoodsReceiptResponse[]>('/goods-receipts');
    return response.data;
  },

  async getGoodsReceiptById(id: number): Promise<GoodsReceiptResponse> {
    const response = await apiClient.get<GoodsReceiptResponse>(`/goods-receipts/${id}`);
    return response.data;
  },

  async createGoodsReceipt(data: CreateGoodsReceiptDto): Promise<GoodsReceiptResponse> {
    const response = await apiClient.post<GoodsReceiptResponse>('/goods-receipts', data);
    return response.data;
  },

  async submitGoodsReceipt(id: number): Promise<GoodsReceiptResponse> {
    const response = await apiClient.post<GoodsReceiptResponse>(
      `/goods-receipts/${id}/submit`
    );
    return response.data;
  },

  async inspectGoodsReceipt(id: number): Promise<GoodsReceiptResponse> {
    const response = await apiClient.post<GoodsReceiptResponse>(
      `/goods-receipts/${id}/inspect`
    );
    return response.data;
  },

  async recordInspectionResult(id: number): Promise<GoodsReceiptResponse> {
    const response = await apiClient.post<GoodsReceiptResponse>(
      `/goods-receipts/${id}/record-inspection-result`
    );
    return response.data;
  },

  async cancelGoodsReceipt(id: number): Promise<GoodsReceiptResponse> {
    const response = await apiClient.post<GoodsReceiptResponse>(
      `/goods-receipts/${id}/cancel`
    );
    return response.data;
  },

  async postToInventory(id: number): Promise<GoodsReceiptResponse> {
    const response = await apiClient.post<GoodsReceiptResponse>(
      `/goods-receipts/${id}/post-to-inventory`
    );
    return response.data;
  },

  /**
   * Checks whether items for a given receipt number have been posted to inventory
   * by inspecting stock movements for the destination store.
   */
  async checkReceiptPosted(storeId: number, receiptNumber: string): Promise<boolean> {
    try {
      const response = await apiClient.get<StockMovementCheckDto[]>('/inventory/movements', {
        params: { storeId },
      });
      const movements = response.data;
      if (!Array.isArray(movements)) return false;
      const prefix = `${receiptNumber}:`;
      return movements.some(
        (m) => m.referenceType === 'GoodsReceipt' && m.referenceNumber.startsWith(prefix)
      );
    } catch {
      return false;
    }
  },
};

