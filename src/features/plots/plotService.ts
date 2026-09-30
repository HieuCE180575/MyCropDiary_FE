import { parseAreaToHectares } from './validation';
import type { PagedResult, Plot, PlotFormValues, PlotQueryParams, PlotSeasonSummary } from './types';

// Khi backend UC-17 sẵn sàng, thay các hàm dưới đây bằng lời gọi qua
// `apiRequest<ApiResponse<...>>` tới các endpoint tương ứng, ví dụ:
//   GET    /plots?search=&status=&sortField=&sortDirection=&page=&pageSize=
//   GET    /plots/:id
//   GET    /plots/:id/seasons
//   POST   /plots          (ProductionAreaId, WaterSourceId sẽ được chọn kèm khi 2 module đó có UI)
//   PATCH  /plots/:id
//   PATCH  /plots/:id/archive
//   PATCH  /plots/:id/restore
// Dữ liệu lưu tạm trong bộ nhớ (mất khi tải lại trang) để mô phỏng hành vi API.

interface PlotSeed {
  plotName: string;
  areaHectares: number;
  locationDescription: string;
  soilType: string;
  status: Plot['status'];
  createdAt: string;
  notes?: string;
}

const PLOT_SEEDS: PlotSeed[] = [
  { plotName: 'Khu Bắc', areaHectares: 1.25, locationDescription: 'Thạnh Phú, Bến Tre', soilType: 'Đất phù sa', status: 'active', createdAt: '2026-05-12', notes: 'Lô chính cho rau vụ hè.' },
  { plotName: 'Khu Đông', areaHectares: 0.8, locationDescription: 'Thạnh Phú, Bến Tre', soilType: 'Đất phù sa', status: 'active', createdAt: '2026-05-05' },
  { plotName: 'Khu Tây', areaHectares: 2.0, locationDescription: 'Thạnh Phú, Bến Tre', soilType: 'Đất thịt nhẹ', status: 'active', createdAt: '2026-04-28' },
  { plotName: 'Khu Nam', areaHectares: 1.5, locationDescription: 'Mỏ Cày Nam, Bến Tre', soilType: 'Đất phèn nhẹ', status: 'inactive', createdAt: '2026-03-20', notes: 'Đang cải tạo đất.' },
  { plotName: 'Lô Xoài Cũ', areaHectares: 0.6, locationDescription: 'Thạnh Phú, Bến Tre', soilType: 'Đất cát pha', status: 'archived', createdAt: '2026-01-15', notes: 'Ngừng canh tác từ đầu năm.' },
  { plotName: 'Lô Ao Sen', areaHectares: 0.95, locationDescription: 'Châu Thành, Bến Tre', soilType: 'Đất bùn', status: 'active', createdAt: '2026-02-10' },
  { plotName: 'Lô Ươm Giống', areaHectares: 0.35, locationDescription: 'Giồng Trôm, Bến Tre', soilType: 'Đất thịt nhẹ', status: 'active', createdAt: '2026-02-18' },
  { plotName: 'Khu Trung Tâm', areaHectares: 3.2, locationDescription: 'Thạnh Phú, Bến Tre', soilType: 'Đất phù sa', status: 'active', createdAt: '2026-01-05' },
  { plotName: 'Lô Bờ Kênh', areaHectares: 1.1, locationDescription: 'Ba Tri, Bến Tre', soilType: 'Đất phèn nhẹ', status: 'inactive', createdAt: '2025-12-22' },
  { plotName: 'Lô Dừa Xen Canh', areaHectares: 1.8, locationDescription: 'Bình Đại, Bến Tre', soilType: 'Đất cát pha', status: 'active', createdAt: '2025-12-10' },
  { plotName: 'Lô Rau Sạch 1', areaHectares: 0.45, locationDescription: 'Thạnh Phú, Bến Tre', soilType: 'Đất thịt nhẹ', status: 'active', createdAt: '2025-11-30' },
  { plotName: 'Lô Rau Sạch 2', areaHectares: 0.5, locationDescription: 'Thạnh Phú, Bến Tre', soilType: 'Đất thịt nhẹ', status: 'active', createdAt: '2025-11-30' },
  { plotName: 'Khu Ven Sông', areaHectares: 2.75, locationDescription: 'Châu Thành, Bến Tre', soilType: 'Đất phù sa', status: 'archived', createdAt: '2025-10-14', notes: 'Thu hồi để làm đê bao.' },
  { plotName: 'Lô Thử Nghiệm', areaHectares: 0.2, locationDescription: 'Mỏ Cày Bắc, Bến Tre', soilType: 'Đất thịt nhẹ', status: 'inactive', createdAt: '2025-09-28', notes: 'Khu thử giống mới.' },
  { plotName: 'Khu Mở Rộng 2026', areaHectares: 4.0, locationDescription: 'Thạnh Phú, Bến Tre', soilType: 'Đất phù sa', status: 'active', createdAt: '2026-06-01' },
];

let plots: Plot[] = PLOT_SEEDS.map((seed, index) => {
  const idNumber = index + 1;
  return {
    plotId: `plot-${idNumber}`,
    plotCode: `LOT-${String(idNumber).padStart(4, '0')}`,
    plotName: seed.plotName,
    areaHectares: seed.areaHectares,
    locationDescription: seed.locationDescription,
    soilType: seed.soilType,
    status: seed.status,
    notes: seed.notes,
    createdAt: new Date(`${seed.createdAt}T08:00:00.000Z`).toISOString(),
  };
});

const SEASONS_BY_PLOT: Record<string, PlotSeasonSummary[]> = {
  'plot-1': [
    {
      cropSeasonId: 'season-1',
      seasonName: 'Cà chua - Vụ Hè 2026',
      cropName: 'Cà chua',
      status: 'in_progress',
      startDate: '2026-06-01',
      endDate: '2026-09-15',
    },
    {
      cropSeasonId: 'season-2',
      seasonName: 'Khổ qua - Vụ Xuân 2026',
      cropName: 'Khổ qua',
      status: 'completed',
      startDate: '2026-02-01',
      endDate: '2026-04-30',
    },
  ],
  'plot-6': [
    {
      cropSeasonId: 'season-3',
      seasonName: 'Rau muống - Vụ Đông 2025',
      cropName: 'Rau muống',
      status: 'completed',
      startDate: '2025-10-01',
      endDate: '2025-12-15',
    },
  ],
};

let nextPlotIdNumber = plots.length + 1;
let nextPlotCodeNumber = plots.length + 1;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFC');
}

function matchesSearch(plot: Plot, search: string): boolean {
  const keyword = normalize(search.trim());
  if (!keyword) return true;
  return (
    normalize(plot.plotName).includes(keyword) ||
    normalize(plot.locationDescription).includes(keyword) ||
    normalize(plot.plotCode).includes(keyword)
  );
}

export async function fetchPlots(params: PlotQueryParams): Promise<PagedResult<Plot>> {
  await delay(300);

  const { search = '', status = 'all', sortField, sortDirection, page, pageSize } = params;

  let filtered = plots.filter((plot) => matchesSearch(plot, search));
  if (status !== 'all') {
    filtered = filtered.filter((plot) => plot.status === status);
  }

  const direction = sortDirection === 'asc' ? 1 : -1;
  filtered = [...filtered].sort((a, b) => {
    if (sortField === 'areaHectares') return (a.areaHectares - b.areaHectares) * direction;
    if (sortField === 'createdAt') {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    }
    return a.plotName.localeCompare(b.plotName, 'vi') * direction;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, page: safePage, pageSize, totalItems, totalPages };
}

export async function fetchPlotById(plotId: string): Promise<Plot | null> {
  await delay(220);
  return plots.find((plot) => plot.plotId === plotId) ?? null;
}

export async function fetchPlotSeasons(plotId: string): Promise<PlotSeasonSummary[]> {
  await delay(220);
  return SEASONS_BY_PLOT[plotId] ?? [];
}

export async function createPlot(values: PlotFormValues): Promise<Plot> {
  await delay(400);

  const idNumber = nextPlotIdNumber++;
  const record: Plot = {
    plotId: `plot-${idNumber}`,
    plotCode: `LOT-${String(nextPlotCodeNumber++).padStart(4, '0')}`,
    plotName: values.plotName.trim(),
    areaHectares: Number(parseAreaToHectares(values.areaValue, values.areaUnit).toFixed(4)),
    locationDescription: values.locationDescription.trim(),
    soilType: values.soilType.trim() || undefined,
    status: values.status,
    notes: values.notes.trim() || undefined,
    coverImageUrl: values.coverImage ? URL.createObjectURL(values.coverImage) : undefined,
    createdAt: new Date().toISOString(),
  };

  plots = [record, ...plots];
  return record;
}

export async function updatePlot(plotId: string, values: PlotFormValues): Promise<Plot> {
  await delay(400);

  const existing = plots.find((plot) => plot.plotId === plotId);
  if (!existing) throw new Error('Không tìm thấy lô đất cần cập nhật.');

  const updated: Plot = {
    ...existing,
    plotName: values.plotName.trim(),
    areaHectares: Number(parseAreaToHectares(values.areaValue, values.areaUnit).toFixed(4)),
    locationDescription: values.locationDescription.trim(),
    soilType: values.soilType.trim() || undefined,
    status: values.status,
    notes: values.notes.trim() || undefined,
    coverImageUrl: values.coverImage ? URL.createObjectURL(values.coverImage) : existing.coverImageUrl,
    updatedAt: new Date().toISOString(),
  };

  plots = plots.map((plot) => (plot.plotId === plotId ? updated : plot));
  return updated;
}

export async function archivePlot(plotId: string): Promise<Plot> {
  await delay(300);

  const existing = plots.find((plot) => plot.plotId === plotId);
  if (!existing) throw new Error('Không tìm thấy lô đất cần lưu trữ.');

  const updated: Plot = { ...existing, status: 'archived', updatedAt: new Date().toISOString() };
  plots = plots.map((plot) => (plot.plotId === plotId ? updated : plot));
  return updated;
}

export async function restorePlot(plotId: string): Promise<Plot> {
  await delay(300);

  const existing = plots.find((plot) => plot.plotId === plotId);
  if (!existing) throw new Error('Không tìm thấy lô đất cần khôi phục.');

  const updated: Plot = { ...existing, status: 'active', updatedAt: new Date().toISOString() };
  plots = plots.map((plot) => (plot.plotId === plotId ? updated : plot));
  return updated;
}
