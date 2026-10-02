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

type Coordinate = [number, number];

interface PlotSeed {
  plotName: string;
  areaHectares: number;
  locationDescription: string;
  soilType: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  notes?: string;

  boundary: Coordinate[];
}

const PLOT_SEEDS: PlotSeed[] = [
  {
    plotName: 'Khu Bắc',
    areaHectares: 1.25,
    locationDescription: 'Thạnh Phú, Bến Tre',
    soilType: 'Đất phù sa',
    status: 'active',
    createdAt: '2026-05-12',
    notes: 'Lô chính cho rau vụ hè.',
    boundary: [
      [9.9502, 106.4921],
      [9.9510, 106.4930],
      [9.9505, 106.4941],
      [9.9495, 106.4935],
      [9.9494, 106.4924],
    ],
  },

  {
    plotName: 'Khu Đông',
    areaHectares: 0.8,
    locationDescription: 'Thạnh Phú, Bến Tre',
    soilType: 'Đất phù sa',
    status: 'active',
    createdAt: '2026-05-05',
    boundary: [
      [9.9485, 106.4950],
      [9.9492, 106.4958],
      [9.9487, 106.4968],
      [9.9478, 106.4965],
      [9.9477, 106.4954],
    ],
  },

  {
    plotName: 'Khu Tây',
    areaHectares: 2.0,
    locationDescription: 'Thạnh Phú, Bến Tre',
    soilType: 'Đất thịt nhẹ',
    status: 'active',
    createdAt: '2026-04-28',
    boundary: [
      [9.9530, 106.4875],
      [9.9542, 106.4882],
      [9.9538, 106.4898],
      [9.9524, 106.4895],
      [9.9520, 106.4882],
    ],
  },

  {
    plotName: 'Khu Nam',
    areaHectares: 1.5,
    locationDescription: 'Mỏ Cày Nam, Bến Tre',
    soilType: 'Đất phèn nhẹ',
    status: 'inactive',
    createdAt: '2026-03-20',
    notes: 'Đang cải tạo đất.',
    boundary: [
      [10.1005, 106.3350],
      [10.1014, 106.3362],
      [10.1008, 106.3374],
      [10.0995, 106.3368],
      [10.0994, 106.3355],
    ],
  },

  {
    plotName: 'Lô Xoài Cũ',
    areaHectares: 0.6,
    locationDescription: 'Thạnh Phú, Bến Tre',
    soilType: 'Đất cát pha',
    status: 'archived',
    createdAt: '2026-01-15',
    notes: 'Ngừng canh tác từ đầu năm.',
    boundary: [
      [9.9460, 106.4900],
      [9.9467, 106.4907],
      [9.9462, 106.4916],
      [9.9453, 106.4911],
      [9.9454, 106.4902],
    ],
  },

  {
    plotName: 'Lô Ao Sen',
    areaHectares: 0.95,
    locationDescription: 'Châu Thành, Bến Tre',
    soilType: 'Đất bùn',
    status: 'active',
    createdAt: '2026-02-10',
    boundary: [
      [10.2505, 106.3800],
      [10.2514, 106.3810],
      [10.2508, 106.3821],
      [10.2497, 106.3816],
      [10.2498, 106.3805],
    ],
  },

  {
    plotName: 'Lô Ươm Giống',
    areaHectares: 0.35,
    locationDescription: 'Giồng Trôm, Bến Tre',
    soilType: 'Đất thịt nhẹ',
    status: 'active',
    createdAt: '2026-02-18',
    boundary: [
      [10.1500, 106.4800],
      [10.1505, 106.4807],
      [10.1501, 106.4814],
      [10.1493, 106.4810],
      [10.1494, 106.4802],
    ],
  },

  {
    plotName: 'Khu Trung Tâm',
    areaHectares: 3.2,
    locationDescription: 'Thạnh Phú, Bến Tre',
    soilType: 'Đất phù sa',
    status: 'active',
    createdAt: '2026-01-05',
    boundary: [
      [9.9580, 106.4900],
      [9.9598, 106.4912],
      [9.9592, 106.4935],
      [9.9572, 106.4940],
      [9.9562, 106.4920],
    ],
  },

  {
    plotName: 'Lô Bờ Kênh',
    areaHectares: 1.1,
    locationDescription: 'Ba Tri, Bến Tre',
    soilType: 'Đất phèn nhẹ',
    status: 'inactive',
    createdAt: '2025-12-22',
    boundary: [
      [10.0500, 106.5800],
      [10.0508, 106.5812],
      [10.0502, 106.5823],
      [10.0490, 106.5818],
      [10.0492, 106.5805],
    ],
  },

  {
    plotName: 'Lô Dừa Xen Canh',
    areaHectares: 1.8,
    locationDescription: 'Bình Đại, Bến Tre',
    soilType: 'Đất cát pha',
    status: 'active',
    createdAt: '2025-12-10',
    boundary: [
      [10.1850, 106.7000],
      [10.1863, 106.7010],
      [10.1858, 106.7025],
      [10.1842, 106.7020],
      [10.1840, 106.7007],
    ],
  },

  {
    plotName: 'Lô Rau Sạch 1',
    areaHectares: 0.45,
    locationDescription: 'Thạnh Phú, Bến Tre',
    soilType: 'Đất thịt nhẹ',
    status: 'active',
    createdAt: '2025-11-30',
    boundary: [
      [9.9620, 106.4870],
      [9.9626, 106.4877],
      [9.9621, 106.4885],
      [9.9613, 106.4881],
      [9.9614, 106.4872],
    ],
  },

  {
    plotName: 'Lô Rau Sạch 2',
    areaHectares: 0.5,
    locationDescription: 'Thạnh Phú, Bến Tre',
    soilType: 'Đất thịt nhẹ',
    status: 'active',
    createdAt: '2025-11-30',
    boundary: [
      [9.9630, 106.4875],
      [9.9637, 106.4882],
      [9.9632, 106.4890],
      [9.9624, 106.4886],
      [9.9625, 106.4877],
    ],
  },

  {
    plotName: 'Khu Ven Sông',
    areaHectares: 2.75,
    locationDescription: 'Châu Thành, Bến Tre',
    soilType: 'Đất phù sa',
    status: 'archived',
    createdAt: '2025-10-14',
    notes: 'Thu hồi để làm đê bao.',
    boundary: [
      [10.2700, 106.3750],
      [10.2715, 106.3760],
      [10.2710, 106.3780],
      [10.2692, 106.3775],
      [10.2688, 106.3760],
    ],
  },

  {
    plotName: 'Lô Thử Nghiệm',
    areaHectares: 0.2,
    locationDescription: 'Mỏ Cày Bắc, Bến Tre',
    soilType: 'Đất thịt nhẹ',
    status: 'inactive',
    createdAt: '2025-09-28',
    notes: 'Khu thử giống mới.',
    boundary: [
      [10.1500, 106.2700],
      [10.1505, 106.2705],
      [10.1501, 106.2711],
      [10.1495, 106.2707],
      [10.1496, 106.2701],
    ],
  },

  {
    plotName: 'Khu Mở Rộng 2026',
    areaHectares: 4.0,
    locationDescription: 'Thạnh Phú, Bến Tre',
    soilType: 'Đất phù sa',
    status: 'active',
    createdAt: '2026-06-01',
    boundary: [
      [9.9700, 106.4950],
      [9.9720, 106.4965],
      [9.9712, 106.4990],
      [9.9688, 106.4985],
      [9.9682, 106.4962],
    ],
  },
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

    boundary: seed.boundary,
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
    boundary: values.boundary,
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
