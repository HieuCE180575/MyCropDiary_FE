import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface CropSeasonOption {
  cropSeasonId: number;
  farmId: number;
  seasonName: string;
  seasonStatus: string;
}

export interface FarmingActivityOption {
  farmingActivityId: number;
  cropSeasonId: number;
  activityName: string;
}

interface OptionPage<T> {
  items: T[];
  last: boolean;
}

// Pickers need every page, including options beyond the first 50 records.
async function loadOptions<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; ; page++) {
    const result = await apiRequest<ApiResponse<OptionPage<T>>>(
      `${path}${path.includes('?') ? '&' : '?'}page=${page}&size=50`, { signal },
    );
    if (!result.success || !Array.isArray(result.data?.items) || typeof result.data.last !== 'boolean') {
      throw new Error(result.message || 'Không tải được danh sách lựa chọn.');
    }
    items.push(...result.data.items);
    if (result.data.last || result.data.items.length === 0) return items;
  }
}

export async function fetchOpenCropSeasonOptions(farmId: number, signal: AbortSignal) {
  const seasons = await loadOptions<CropSeasonOption>(`/farms/${farmId}/crop-seasons`, signal);
  return seasons.filter(season => season.farmId === farmId
    && !['completed', 'cancelled', 'archived'].includes(season.seasonStatus?.toLowerCase()));
}

export async function fetchFarmingActivityOptions(cropSeasonId: number, signal: AbortSignal) {
  const activities = await loadOptions<FarmingActivityOption>(`/farming-activities?cropSeasonId=${cropSeasonId}`, signal);
  return activities.filter(activity => activity.cropSeasonId === cropSeasonId);
}
