import { apiClient } from './client';
import type {
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorContact,
  CreateVendorContactRequest,
  UpdateVendorContactRequest,
  VendorItemPrice,
  CreateVendorItemPriceRequest,
  UpdateVendorItemPriceRequest,
} from '../types/vendor';

export const vendorService = {
  // ==========================================
  // Vendor Directory APIs (/api/vendors)
  // ==========================================
  async getVendors(): Promise<Vendor[]> {
    const response = await apiClient.get<Vendor[]>('/vendors');
    return response.data;
  },

  async getVendorById(id: number): Promise<Vendor> {
    const response = await apiClient.get<Vendor>(`/vendors/${id}`);
    return response.data;
  },

  async createVendor(data: CreateVendorRequest): Promise<Vendor> {
    const response = await apiClient.post<Vendor>('/vendors', data);
    return response.data;
  },

  async updateVendor(id: number, data: UpdateVendorRequest): Promise<Vendor> {
    const response = await apiClient.put<Vendor>(`/vendors/${id}`, data);
    return response.data;
  },

  async deleteVendor(id: number): Promise<{ message: string }> {
    // Note: Backend deactivates rather than hard deletes
    const response = await apiClient.delete<{ message: string }>(`/vendors/${id}`);
    return response.data;
  },

  async activateVendor(id: number): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(`/vendors/${id}/activate`);
    return response.data;
  },

  async approveVendor(id: number): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(`/vendors/${id}/approve`);
    return response.data;
  },

  async blockVendor(id: number): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(`/vendors/${id}/block`);
    return response.data;
  },

  // ==========================================
  // Vendor Contacts APIs (/api/vendors/{vendorId}/contacts)
  // ==========================================
  async getContacts(vendorId: number): Promise<VendorContact[]> {
    const response = await apiClient.get<VendorContact[]>(`/vendors/${vendorId}/contacts`);
    return response.data;
  },

  async getContactById(vendorId: number, contactId: number): Promise<VendorContact> {
    const response = await apiClient.get<VendorContact>(`/vendors/${vendorId}/contacts/${contactId}`);
    return response.data;
  },

  async createContact(vendorId: number, data: CreateVendorContactRequest): Promise<VendorContact> {
    const response = await apiClient.post<VendorContact>(`/vendors/${vendorId}/contacts`, data);
    return response.data;
  },

  async updateContact(
    vendorId: number,
    contactId: number,
    data: UpdateVendorContactRequest
  ): Promise<VendorContact> {
    const response = await apiClient.put<VendorContact>(`/vendors/${vendorId}/contacts/${contactId}`, data);
    return response.data;
  },

  async deactivateContact(vendorId: number, contactId: number): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      `/vendors/${vendorId}/contacts/${contactId}/deactivate`
    );
    return response.data;
  },

  async activateContact(vendorId: number, contactId: number): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      `/vendors/${vendorId}/contacts/${contactId}/activate`
    );
    return response.data;
  },

  // ==========================================
  // Vendor Item Prices APIs (/api/vendors/{vendorId}/item-prices)
  // ==========================================
  async getItemPrices(vendorId: number): Promise<VendorItemPrice[]> {
    const response = await apiClient.get<VendorItemPrice[]>(`/vendors/${vendorId}/item-prices`);
    return response.data;
  },

  async getItemPriceById(vendorId: number, priceId: number): Promise<VendorItemPrice> {
    const response = await apiClient.get<VendorItemPrice>(`/vendors/${vendorId}/item-prices/${priceId}`);
    return response.data;
  },

  async createItemPrice(
    vendorId: number,
    data: CreateVendorItemPriceRequest
  ): Promise<VendorItemPrice> {
    const response = await apiClient.post<VendorItemPrice>(`/vendors/${vendorId}/item-prices`, data);
    return response.data;
  },

  async updateItemPrice(
    vendorId: number,
    priceId: number,
    data: UpdateVendorItemPriceRequest
  ): Promise<VendorItemPrice> {
    const response = await apiClient.put<VendorItemPrice>(
      `/vendors/${vendorId}/item-prices/${priceId}`,
      data
    );
    return response.data;
  },

  async deactivateItemPrice(vendorId: number, priceId: number): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      `/vendors/${vendorId}/item-prices/${priceId}/deactivate`
    );
    return response.data;
  },

  async activateItemPrice(vendorId: number, priceId: number): Promise<{ message: string }> {
    const response = await apiClient.patch<{ message: string }>(
      `/vendors/${vendorId}/item-prices/${priceId}/activate`
    );
    return response.data;
  },
};
