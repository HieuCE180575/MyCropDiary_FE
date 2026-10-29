import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { getFarmById } from '../farm-management/api';
import { fetchBlocks, fetchZonesByFarm } from '../production/zoneBlockService';
import { getFarmStaffList } from '../staff/staffService';
import { aggregateCropAreas, type DashboardSeason, type RecentRecord, type SeasonBlockArea } from './dashboardModel';

async function read<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await apiRequest<ApiResponse<T>>(path, { signal });
  if (!response.success || response.data == null) throw new Error(response.message || 'Không tải được dữ liệu tổng quan.');
  return response.data;
}

async function readPages<T>(path: string, signal: AbortSignal) {
  const items: T[] = [];
  for (let page = 0; ; page++) {
    const result = await read<{ items: T[]; last: boolean }>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=50`, signal);
    if (!Array.isArray(result.items) || typeof result.last !== 'boolean') throw new Error('Dữ liệu phân trang không hợp lệ.');
    items.push(...result.items);
    if (result.last || result.items.length === 0) return items;
  }
}

function valueOrNull<T>(result: PromiseSettledResult<T>) {
  return result.status === 'fulfilled' ? result.value : null;
}

export async function loadOwnerDashboard(farmId: number, signal: AbortSignal) {
  const results = await Promise.allSettled([
    getFarmById(farmId, signal), fetchBlocks(farmId), fetchZonesByFarm(farmId), getFarmStaffList(farmId, { status: 'ACTIVE' }),
    readPages<DashboardSeason>(`/farms/${farmId}/crop-seasons`, signal),
    read<{ items: { materialUsageId: number; materialName: string; quantity: number; unit: string; usedAt: string }[] }>(`/material-usages?farmId=${farmId}&page=0&size=5&sort=usedAt,desc`, signal),
  ] as const);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const labels = ['thông tin trang trại', 'lô đất', 'khu sản xuất', 'nhân sự', 'mùa vụ', 'sử dụng vật tư'];
  const issues = results.flatMap((result, index) => result.status === 'rejected' ? [labels[index]] : []);
  const farm = valueOrNull(results[0]);
  const blocks = valueOrNull(results[1])?.filter(block => block.farmId == null || block.farmId === farmId) ?? null;
  const zones = valueOrNull(results[2])?.filter(zone => zone.farmId === farmId) ?? null;
  const staff = valueOrNull(results[3]);
  const seasons = valueOrNull(results[4])?.filter(season => season.farmId === farmId) ?? null;
  const openSeasons = seasons?.filter(season => season.seasonStatus.toLowerCase() === 'active') ?? [];
  const allocations = await Promise.allSettled(openSeasons.map(season => read<SeasonBlockArea[]>(`/crop-seasons/${season.cropSeasonId}/blocks`, signal)));
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const allocationFailed = allocations.some(result => result.status === 'rejected' || !Array.isArray(result.value));
  if (allocationFailed) issues.push('phân bổ diện tích mùa vụ');
  const crops = allocationFailed || seasons === null ? null : aggregateCropAreas(seasons, allocations.flatMap(result => result.status === 'fulfilled' ? result.value : []));
  const materialPage = valueOrNull(results[5]);
  const recent: RecentRecord[] = (Array.isArray(materialPage?.items) ? materialPage.items : []).map(usage => ({
    id: 'material-' + usage.materialUsageId, title: 'Ghi nhận sử dụng vật tư', detail: `${usage.materialName} · ${usage.quantity} ${usage.unit}`,
    at: usage.usedAt, icon: 'file-text', to: '/materials',
  }));
  for (const season of seasons ?? []) {
    if (season.createdAt) recent.push({ id: 'season-' + season.cropSeasonId, title: 'Thêm mùa vụ mới', detail: season.seasonName, at: season.createdAt, icon: 'sprout', to: '/crop-seasons' });
  }
  return {
    farm, blocks, zones, seasons, crops, issues,
    staffCount: staff === null ? null : new Set(staff.filter(member => member.status === 'ACTIVE' && member.farmRole === 'STAFF').map(member => member.userId)).size,
    recent: recent.filter(record => Number.isFinite(new Date(record.at).getTime())).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 4),
  };
}

export type OwnerDashboardData = Awaited<ReturnType<typeof loadOwnerDashboard>>;
