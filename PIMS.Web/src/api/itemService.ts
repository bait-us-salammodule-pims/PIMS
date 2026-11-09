import { apiClient } from './client';
import type {
  ItemCategory,
  CreateItemCategoryRequest,
  UpdateItemCategoryRequest,
  Item,
  CreateItemRequest,
  UpdateItemRequest,
  UnitOfMeasure,
  CreateUnitOfMeasureRequest,
  UpdateUnitOfMeasureRequest,
  PackageType,
  CreatePackageTypeRequest,
  UpdatePackageTypeRequest,
  ItemPricing,
  CreateItemPricingRequest,
  UpdateItemPricingRequest,
} from '../types/item';

export const itemService = {
  // ==========================================
  // Item Categories APIs (/api/item-categories)
  // ==========================================
  async getCategories(): Promise<ItemCategory[]> {
    const response = await apiClient.get<ItemCategory[]>('/item-categories');
    return response.data;
  },

  async getCategoryById(id: number): Promise<ItemCategory> {
    const response = await apiClient.get<ItemCategory>(`/item-categories/${id}`);
    return response.data;
  },

  async createCategory(data: CreateItemCategoryRequest): Promise<ItemCategory> {
    const response = await apiClient.post<ItemCategory>('/item-categories', data);
    return response.data;
  },

  async updateCategory(id: number, data: UpdateItemCategoryRequest): Promise<ItemCategory> {
    const response = await apiClient.put<ItemCategory>(`/item-categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`/item-categories/${id}`);
  },

  // ==========================================
  // Items Master APIs (/api/items)
  // ==========================================
  async getItems(): Promise<Item[]> {
    const response = await apiClient.get<Item[]>('/items');
    return response.data;
  },

  async getItemById(id: number): Promise<Item> {
    const response = await apiClient.get<Item>(`/items/${id}`);
    return response.data;
  },

  async createItem(data: CreateItemRequest): Promise<Item> {
    const response = await apiClient.post<Item>('/items', data);
    return response.data;
  },

  async updateItem(id: number, data: UpdateItemRequest): Promise<Item> {
    const response = await apiClient.put<Item>(`/items/${id}`, data);
    return response.data;
  },

  async deleteItem(id: number): Promise<void> {
    await apiClient.delete(`/items/${id}`);
  },

  // ==========================================
  // Units of Measure APIs (/api/units-of-measure)
  // ==========================================
  async getUnitsOfMeasure(): Promise<UnitOfMeasure[]> {
    const response = await apiClient.get<UnitOfMeasure[]>('/units-of-measure');
    return response.data;
  },

  async getUnitOfMeasureById(id: number): Promise<UnitOfMeasure> {
    const response = await apiClient.get<UnitOfMeasure>(`/units-of-measure/${id}`);
    return response.data;
  },

  async createUnitOfMeasure(data: CreateUnitOfMeasureRequest): Promise<UnitOfMeasure> {
    const response = await apiClient.post<UnitOfMeasure>('/units-of-measure', data);
    return response.data;
  },

  async updateUnitOfMeasure(id: number, data: UpdateUnitOfMeasureRequest): Promise<UnitOfMeasure> {
    const response = await apiClient.put<UnitOfMeasure>(`/units-of-measure/${id}`, data);
    return response.data;
  },

  async deleteUnitOfMeasure(id: number): Promise<void> {
    // Note: Backend deactivates rather than hard deletes
    await apiClient.delete(`/units-of-measure/${id}`);
  },

  // ==========================================
  // Package Types APIs (/api/package-types)
  // ==========================================
  async getPackageTypes(): Promise<PackageType[]> {
    const response = await apiClient.get<PackageType[]>('/package-types');
    return response.data;
  },

  async getPackageTypeById(id: number): Promise<PackageType> {
    const response = await apiClient.get<PackageType>(`/package-types/${id}`);
    return response.data;
  },

  async createPackageType(data: CreatePackageTypeRequest): Promise<PackageType> {
    const response = await apiClient.post<PackageType>('/package-types', data);
    return response.data;
  },

  async updatePackageType(id: number, data: UpdatePackageTypeRequest): Promise<PackageType> {
    const response = await apiClient.put<PackageType>(`/package-types/${id}`, data);
    return response.data;
  },

  async deletePackageType(id: number): Promise<void> {
    await apiClient.delete(`/package-types/${id}`);
  },

  // ==========================================
  // Item Pricing APIs (/api/item-pricing)
  // ==========================================
  async getItemPricings(itemId?: number): Promise<ItemPricing[]> {
    const response = await apiClient.get<ItemPricing[]>('/item-pricing', {
      params: itemId ? { itemId } : undefined,
    });
    return response.data;
  },

  async getItemPricingById(id: number): Promise<ItemPricing> {
    const response = await apiClient.get<ItemPricing>(`/item-pricing/${id}`);
    return response.data;
  },

  async createItemPricing(data: CreateItemPricingRequest): Promise<ItemPricing> {
    const response = await apiClient.post<ItemPricing>('/item-pricing', data);
    return response.data;
  },

  async updateItemPricing(id: number, data: UpdateItemPricingRequest): Promise<ItemPricing> {
    const response = await apiClient.put<ItemPricing>(`/item-pricing/${id}`, data);
    return response.data;
  },

  async deleteItemPricing(id: number): Promise<void> {
    await apiClient.delete(`/item-pricing/${id}`);
  },
};
