import { apiClient } from './client';
import type { DashboardSummary } from '../types/dashboard';

export const dashboardService = {
  /**
   * Fetches real summary metrics from GET /api/dashboard/summary
   */
  async getSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },
};
