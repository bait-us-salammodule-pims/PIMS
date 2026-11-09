import { apiClient } from './client';
import type {
  Store,
  CreateStoreRequest,
  UpdateStoreRequest,
  StoreLocation,
  CreateStoreLocationRequest,
  UpdateStoreLocationRequest,
} from '../types/store';

export const storeService = {
  // ==========================================
  // Store APIs
  // ==========================================
  async getStores(includeInactive = false): Promise<Store[]> {
    const response = await apiClient.get<Store[]>('/stores', {
      params: { includeInactive },
    });
    return response.data;
  },

  async getStoreById(id: number): Promise<Store> {
    const response = await apiClient.get<Store>(`/stores/${id}`);
    return response.data;
  },

  async createStore(data: CreateStoreRequest): Promise<Store> {
    const response = await apiClient.post<Store>('/stores', data);
    return response.data;
  },

  async updateStore(id: number, data: UpdateStoreRequest): Promise<Store> {
    const response = await apiClient.put<Store>(`/stores/${id}`, data);
    return response.data;
  },

  async deactivateStore(id: number): Promise<void> {
    await apiClient.patch(`/stores/${id}/deactivate`);
  },

  // ==========================================
  // Store Location APIs
  // ==========================================
  async getLocations(storeId: number, includeInactive = false): Promise<StoreLocation[]> {
    const response = await apiClient.get<StoreLocation[]>(`/stores/${storeId}/locations`, {
      params: { includeInactive },
    });
    return response.data;
  },

  async createLocation(
    storeId: number,
    data: CreateStoreLocationRequest
  ): Promise<StoreLocation> {
    const response = await apiClient.post<StoreLocation>(
      `/stores/${storeId}/locations`,
      data
    );
    return response.data;
  },

  async updateLocation(
    storeId: number,
    locationId: number,
    data: UpdateStoreLocationRequest
  ): Promise<StoreLocation> {
    const response = await apiClient.put<StoreLocation>(
      `/stores/${storeId}/locations/${locationId}`,
      data
    );
    return response.data;
  },

  async deactivateLocation(storeId: number, locationId: number): Promise<void> {
    await apiClient.patch(`/stores/${storeId}/locations/${locationId}/deactivate`);
  },
};
