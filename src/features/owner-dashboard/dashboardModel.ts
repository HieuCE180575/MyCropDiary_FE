export interface DashboardSeason {
  cropSeasonId: number;
  farmId: number;
  seasonName: string;
  cropCategoryName: string;
  seasonStatus: string;
  startDate: string | null;
  endDate: string | null;
  createdAt?: string;
}

export interface SeasonBlockArea {
  cropSeasonId: number;
  blockId: number;
  plantedArea: number | null;
  areaUnit: string | null;
}

export interface CropArea { name: string; areaM2: number }
export interface RecentRecord { id: string; title: string; detail: string; at: string; icon: string; to: string }

export function areaInM2(value: number | null | undefined, unit: string | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) < 0) return null;
  const normalized = unit?.trim().toLowerCase();
  if (normalized === 'ha' || normalized === 'hectare') return Number(value) * 10000;
  if (normalized === 'm2' || normalized === 'm²') return Number(value);
  return null;
}

export function timeProgress(start: string | null, end: string | null, now = Date.now()): number | null {
  if (!start || !end) return null;
  const first = new Date(start + 'T00:00:00').getTime();
  const last = new Date(end + 'T23:59:59').getTime();
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return null;
  return Math.round(Math.min(1, Math.max(0, (now - first) / (last - first))) * 100);
}

export function aggregateCropAreas(seasons: DashboardSeason[], allocations: SeasonBlockArea[]): CropArea[] | null {
  const active = new Map(seasons.filter(season => season.seasonStatus.toLowerCase() === 'active').map(season => [season.cropSeasonId, season]));
  const seen = new Set<number>();
  const totals = new Map<string, number>();
  for (const allocation of allocations) {
    const season = active.get(allocation.cropSeasonId);
    if (!season) continue;
    // Multiple active allocations on the same plot need a backend allocation rule.
    if (seen.has(allocation.blockId)) return null;
    seen.add(allocation.blockId);
    const area = areaInM2(allocation.plantedArea, allocation.areaUnit);
    if (area === null || !season.cropCategoryName?.trim()) return null;
    totals.set(season.cropCategoryName, (totals.get(season.cropCategoryName) ?? 0) + area);
  }
  if ([...active.keys()].some(id => !allocations.some(allocation => allocation.cropSeasonId === id))) return null;
  return [...totals].map(([name, areaM2]) => ({ name, areaM2 })).filter(crop => crop.areaM2 > 0).sort((a, b) => b.areaM2 - a.areaM2);
}

export function formatArea(areaM2: number): string {
  return areaM2 >= 10000 ? `${(areaM2 / 10000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ha`
    : `${areaM2.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²`;
}

export function formatDate(value: string | null) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleDateString('vi-VN');
}

export function relativeTime(value: string) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  if (!Number.isFinite(seconds)) return 'Chưa rõ thời gian';
  const format = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  if (Math.abs(seconds) < 3600) return format.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86400) return format.format(Math.round(seconds / 3600), 'hour');
  return format.format(Math.round(seconds / 86400), 'day');
}

function dayOffset(days: number, now: Date) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

// Visual demo data stays separate from backend records and is never persisted.
export function makeDashboardDemo(now = new Date()) {
  const year = now.getFullYear();
  const seasons: DashboardSeason[] = [
    { cropSeasonId: -1, farmId: -1, seasonName: `Vụ dưa lưới Xuân ${year}`, cropCategoryName: 'Dưa lưới', seasonStatus: 'active', startDate: dayOffset(-60, now), endDate: dayOffset(40, now) },
    { cropSeasonId: -2, farmId: -1, seasonName: `Vụ rau ăn lá ${year}`, cropCategoryName: 'Rau ăn lá', seasonStatus: 'active', startDate: dayOffset(-30, now), endDate: dayOffset(70, now) },
  ];
  const crops: CropArea[] = [{ name: 'Dưa lưới', areaM2: 25000 }, { name: 'Rau ăn lá', areaM2: 15000 }, { name: 'Rau gia vị', areaM2: 5000 }, { name: 'Khác', areaM2: 5000 }];
  const tasks = [
    { date: dayOffset(0, now), name: 'Bón phân định kỳ', detail: 'Vụ dưa lưới · Lô A1', icon: 'leaf' },
    { date: dayOffset(2, now), name: 'Phun thuốc phòng trừ sâu', detail: 'Vụ dưa lưới · Lô A2', icon: 'bug' },
    { date: dayOffset(4, now), name: 'Tưới nước', detail: 'Vụ rau ăn lá · Lô B1', icon: 'drop' },
  ];
  const recent: RecentRecord[] = [
    { id: 'demo-material', title: 'Ghi nhận sử dụng vật tư', detail: 'Phân NPK 16-16-8 · 10 kg', at: new Date(now.getTime() - 7200000).toISOString(), icon: 'file-text', to: '/materials' },
    { id: 'demo-zone', title: 'Cập nhật khu vực trồng', detail: 'Lô A1 · 500 m²', at: new Date(now.getTime() - 86400000).toISOString(), icon: 'plots', to: '/production-areas' },
    { id: 'demo-season', title: 'Thêm mùa vụ mới', detail: 'Vụ rau ăn lá', at: new Date(now.getTime() - 2 * 86400000).toISOString(), icon: 'sprout', to: '/crop-seasons' },
    { id: 'demo-farm', title: 'Cập nhật thông tin trang trại', detail: 'Chỉnh sửa thông tin chung', at: new Date(now.getTime() - 3 * 86400000).toISOString(), icon: 'edit', to: '/farm' },
  ];
  return { seasons, crops, tasks, recent, areaM2: 50000, staffCount: 8, zonesCount: 3, blocksCount: 6 };
}
