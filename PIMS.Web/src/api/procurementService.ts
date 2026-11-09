import { apiClient } from './client';
import type {
  PurchaseRequestResponse,
  CreatePurchaseRequestDto,
  UpdatePurchaseRequestDto,
  CreatePurchaseRequestItemDto,
  UpdatePurchaseRequestItemDto,
  PurchaseRequestItemResponse,
  QuotationRequestResponse,
  CreateQuotationRequestDto,
  UpdateQuotationRequestDto,
  CreateVendorQuotationDto,
  VendorQuotationResponse,
  QuotationComparisonItemDto,
  PurchaseOrderResponse,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../types/procurement';

export const procurementService = {
  // ==========================================
  // Purchase Requests APIs (/api/purchase-requests)
  // ==========================================
  async getPurchaseRequests(): Promise<PurchaseRequestResponse[]> {
    const response = await apiClient.get<PurchaseRequestResponse[]>('/purchase-requests');
    return response.data;
  },

  async getPurchaseRequestById(id: number): Promise<PurchaseRequestResponse> {
    const response = await apiClient.get<PurchaseRequestResponse>(`/purchase-requests/${id}`);
    return response.data;
  },

  async createPurchaseRequest(data: CreatePurchaseRequestDto): Promise<PurchaseRequestResponse> {
    const response = await apiClient.post<PurchaseRequestResponse>('/purchase-requests', data);
    return response.data;
  },

  async updatePurchaseRequest(
    id: number,
    data: UpdatePurchaseRequestDto
  ): Promise<PurchaseRequestResponse> {
    const response = await apiClient.put<PurchaseRequestResponse>(`/purchase-requests/${id}`, data);
    return response.data;
  },

  async addPurchaseRequestItem(
    id: number,
    data: CreatePurchaseRequestItemDto
  ): Promise<PurchaseRequestItemResponse> {
    const response = await apiClient.post<PurchaseRequestItemResponse>(
      `/purchase-requests/${id}/items`,
      data
    );
    return response.data;
  },

  async updatePurchaseRequestItem(
    id: number,
    itemId: number,
    data: UpdatePurchaseRequestItemDto
  ): Promise<PurchaseRequestItemResponse> {
    const response = await apiClient.put<PurchaseRequestItemResponse>(
      `/purchase-requests/${id}/items/${itemId}`,
      data
    );
    return response.data;
  },

  async removePurchaseRequestItem(id: number, itemId: number): Promise<void> {
    await apiClient.delete(`/purchase-requests/${id}/items/${itemId}`);
  },

  async submitPurchaseRequest(id: number): Promise<PurchaseRequestResponse> {
    const response = await apiClient.post<PurchaseRequestResponse>(`/purchase-requests/${id}/submit`);
    return response.data;
  },

  async startReviewPurchaseRequest(id: number): Promise<PurchaseRequestResponse> {
    const response = await apiClient.post<PurchaseRequestResponse>(
      `/purchase-requests/${id}/start-review`
    );
    return response.data;
  },

  async approvePurchaseRequest(id: number): Promise<PurchaseRequestResponse> {
    const response = await apiClient.post<PurchaseRequestResponse>(`/purchase-requests/${id}/approve`);
    return response.data;
  },

  async rejectPurchaseRequest(id: number): Promise<PurchaseRequestResponse> {
    const response = await apiClient.post<PurchaseRequestResponse>(`/purchase-requests/${id}/reject`);
    return response.data;
  },

  async cancelPurchaseRequest(id: number): Promise<PurchaseRequestResponse> {
    const response = await apiClient.post<PurchaseRequestResponse>(`/purchase-requests/${id}/cancel`);
    return response.data;
  },

  // ==========================================
  // Quotations / RFQs APIs (/api/quotations)
  // ==========================================
  async getQuotations(): Promise<QuotationRequestResponse[]> {
    const response = await apiClient.get<QuotationRequestResponse[]>('/quotations');
    return response.data;
  },

  async getQuotationById(id: number): Promise<QuotationRequestResponse> {
    const response = await apiClient.get<QuotationRequestResponse>(`/quotations/${id}`);
    return response.data;
  },

  async createQuotation(data: CreateQuotationRequestDto): Promise<QuotationRequestResponse> {
    const response = await apiClient.post<QuotationRequestResponse>('/quotations', data);
    return response.data;
  },

  async updateQuotation(
    id: number,
    data: UpdateQuotationRequestDto
  ): Promise<QuotationRequestResponse> {
    const response = await apiClient.put<QuotationRequestResponse>(`/quotations/${id}`, data);
    return response.data;
  },

  async sendQuotationToVendors(id: number): Promise<QuotationRequestResponse> {
    const response = await apiClient.post<QuotationRequestResponse>(`/quotations/${id}/send-to-vendors`);
    return response.data;
  },

  async addVendorQuotation(
    id: number,
    data: CreateVendorQuotationDto
  ): Promise<VendorQuotationResponse> {
    const response = await apiClient.post<VendorQuotationResponse>(
      `/quotations/${id}/vendor-quotations`,
      data
    );
    return response.data;
  },

  async markResponsesReceived(id: number): Promise<QuotationRequestResponse> {
    const response = await apiClient.post<QuotationRequestResponse>(
      `/quotations/${id}/responses-received`
    );
    return response.data;
  },

  async startComparison(id: number): Promise<QuotationRequestResponse> {
    const response = await apiClient.post<QuotationRequestResponse>(
      `/quotations/${id}/start-comparison`
    );
    return response.data;
  },

  async getComparison(id: number): Promise<QuotationComparisonItemDto[]> {
    const response = await apiClient.get<QuotationComparisonItemDto[]>(`/quotations/${id}/comparison`);
    return response.data;
  },

  async selectVendorQuotation(
    id: number,
    vendorQuotationId: number
  ): Promise<QuotationRequestResponse> {
    const response = await apiClient.post<QuotationRequestResponse>(
      `/quotations/${id}/vendor-quotations/${vendorQuotationId}/select`
    );
    return response.data;
  },

  async cancelQuotation(id: number): Promise<QuotationRequestResponse> {
    const response = await apiClient.post<QuotationRequestResponse>(`/quotations/${id}/cancel`);
    return response.data;
  },

  // ==========================================
  // Purchase Orders APIs (/api/purchase-orders)
  // ==========================================
  async getPurchaseOrders(): Promise<PurchaseOrderResponse[]> {
    const response = await apiClient.get<PurchaseOrderResponse[]>('/purchase-orders');
    return response.data;
  },

  async getPurchaseOrderById(id: number): Promise<PurchaseOrderResponse> {
    const response = await apiClient.get<PurchaseOrderResponse>(`/purchase-orders/${id}`);
    return response.data;
  },

  async createPurchaseOrder(data: CreatePurchaseOrderDto): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>('/purchase-orders', data);
    return response.data;
  },

  async updatePurchaseOrder(
    id: number,
    data: UpdatePurchaseOrderDto
  ): Promise<PurchaseOrderResponse> {
    const response = await apiClient.put<PurchaseOrderResponse>(`/purchase-orders/${id}`, data);
    return response.data;
  },

  async submitPurchaseOrderForApproval(id: number): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(
      `/purchase-orders/${id}/submit-for-approval`
    );
    return response.data;
  },

  async approvePurchaseOrder(id: number): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(`/purchase-orders/${id}/approve`);
    return response.data;
  },

  async issuePurchaseOrder(id: number): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(`/purchase-orders/${id}/issue`);
    return response.data;
  },

  async cancelPurchaseOrder(id: number): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(`/purchase-orders/${id}/cancel`);
    return response.data;
  },
};
