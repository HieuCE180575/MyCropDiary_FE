import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import type { AdminAIFeedbackItem, AdminFarmDirectoryItem, AdminZoneDirectoryItem, AdminBlockDirectoryItem, AdminComplianceDirectoryItem } from './adminService';
import type { ExpenseItem } from '../operations/expenseService';
export type AnalyticsTab = 'farms' | 'seasons' | 'costs' | 'registrations' | 'feedback';
type Dated<T> = T & { createdAt?: string | null };
export type AnalyticsData = {
  farms: Dated<AdminFarmDirectoryItem>[];
  zones: Dated<AdminZoneDirectoryItem>[];
  blocks: AdminBlockDirectoryItem[];
  seasons: (Dated<AdminComplianceDirectoryItem> & { startDate?: string | null; endDate?: string | null })[];
  feedback: AdminAIFeedbackItem[];
  expenses: ExpenseItem[];
};
export const emptyAnalyticsData = (): AnalyticsData => ({ farms: [], zones: [], blocks: [], seasons: [], feedback: [], expenses: [] });
async function list<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const result = await apiRequest<ApiResponse<T[]>>(path, { signal });
  if (!result?.success || !Array.isArray(result.data)) throw new Error('Analytics data unavailable');
  return result.data;
}
export async function loadAdminAnalytics(tab: AnalyticsTab, signal: AbortSignal): Promise<AnalyticsData> {
  const data = emptyAnalyticsData();
  if (tab === 'feedback') data.feedback = await list('/admin/ai-feedback', signal);
  if (tab === 'seasons') data.seasons = await list('/admin/compliance', signal);
  if (tab === 'farms') [data.farms, data.zones, data.blocks] = await Promise.all([
    list<Dated<AdminFarmDirectoryItem>>('/admin/farms', signal), list<Dated<AdminZoneDirectoryItem>>('/admin/zones', signal), list<AdminBlockDirectoryItem>('/admin/blocks', signal),
  ]);
  if (tab === 'costs') {
    data.farms = await list('/admin/farms', signal);
    // A failed farm must fail the aggregate rather than silently undercount system costs.
    const records: ExpenseItem[] = [];
    for (const id of new Set(data.farms.map(farm => farm.farmId ?? farm.id))) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      records.push(...await list<ExpenseItem>(`/farms/${id}/expenses`, signal));
    }
    data.expenses = [...new Map(records.map(item => [item.expenseId, item])).values()];
  }
  return data;
}
export function areaHectares(value: unknown, unit: string | undefined): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  switch (unit?.trim().toLowerCase()) {
    case 'ha': return number;
    case 'm2': case 'm²': return number / 10000;
    default: return null;
  }
}
export function monthBuckets(months: number, now = new Date()) {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1);
    return { start: date, end: new Date(date.getFullYear(), date.getMonth() + 1, 1) };
  });
}
export function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const result = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isFinite(result.getTime()) ? result : null;
}
