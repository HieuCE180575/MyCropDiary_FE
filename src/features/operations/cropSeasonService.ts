import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface CropCategoryResp {
  id: number;
  categoryName: string;
  description?: string | null;
  imageUrl?: string | null;
}

export interface CropSeasonResp {
  cropSeasonId: number;
  farmId: number;
  farmName?: string | null;
  cropCategoryId: number;
  cropCategoryName?: string | null;
  seasonName: string;
  startDate: string;
  endDate?: string | null;
  seasonStatus: 'planned' | 'active' | 'completed' | 'cancelled' | string;
  notes?: string | null;
  createdByUserId?: number | null;
  createdByFullName?: string | null;
  createdAt?: string | null;
}

export interface CropSeasonBlockResp {
  cropSeasonId: number;
  seasonName?: string | null;
  blockId: number;
  blockName?: string | null;
  zoneId?: number | null;
  zoneName?: string | null;
  blockArea?: number | null;
  blockAreaUnit?: string | null;
  soilType?: string | null;
  plantedArea?: number | null;
  areaUnit?: string | null;
  plantedAt?: string | null;
  expectedHarvestAt?: string | null;
}

export interface CreateCropSeasonReq {
  seasonName: string;
  cropCategoryId?: number;
  cropCategoryName?: string;
  startDate: string;
  endDate?: string | null;
  seasonStatus?: string;
  notes?: string | null;
}

export interface UpdateCropSeasonReq {
  seasonName: string;
  cropCategoryId?: number;
  cropCategoryName?: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export interface AssignCropSeasonBlockReq {
  blockId: number;
  plantedArea?: number | null;
  areaUnit?: string | null;
  plantedAt?: string | null;
  expectedHarvestAt?: string | null;
}

export interface UpdateCropSeasonBlockReq {
  plantedArea?: number | null;
  areaUnit?: string | null;
  plantedAt?: string | null;
  expectedHarvestAt?: string | null;
}

interface PageResp<T> {
  items?: T[];
  content?: T[];
  page?: number;
  pageNumber?: number;
  size?: number;
  pageSize?: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

async function request<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  const res = await apiRequest<ApiResponse<T>>(path, options);
  if (!res?.success || res.data === undefined) {
    throw new Error(res?.message || 'Yêu cầu không thành công.');
  }
  return res.data;
}

export const SHORT_TERM_CROPS: CropCategoryResp[] = [
  { id: 5, categoryName: 'Rau Muống', description: 'Cây ngắn ngày (20-30 ngày), thu hoạch nhiều lứa' },
  { id: 6, categoryName: 'Xà Lách (Lettuce)', description: 'Cây ngắn ngày (30-45 ngày), VietGAP ăn sống' },
  { id: 7, categoryName: 'Cải Thìa (Bok Choy)', description: 'Cây ngắn ngày (30-35 ngày), giàu vitamin' },
  { id: 8, categoryName: 'Cải Bó Xôi (Spinach)', description: 'Cây ngắn ngày (35-45 ngày), giá trị dinh dưỡng cao' },
  { id: 9, categoryName: 'Cải Ngọt', description: 'Cây ngắn ngày (25-30 ngày), dễ canh tác VietGAP' },
  { id: 10, categoryName: 'Dưa Leo (Cucumber)', description: 'Cây ngắn ngày (40-50 ngày), leo giàn ăn trái' },
  { id: 11, categoryName: 'Đậu Cô Ve', description: 'Cây ngắn ngày (50-60 ngày), thu hoạch quả non' },
  { id: 12, categoryName: 'Đậu Bắp (Okra)', description: 'Cây ngắn ngày (45-55 ngày), thu trái liên tục' },
  { id: 13, categoryName: 'Cà Rốt Baby', description: 'Cây củ ngắn ngày (60-70 ngày)' },
  { id: 14, categoryName: 'Củ Cải Trắng', description: 'Cây củ ngắn ngày (45-55 ngày), sinh trưởng nhanh' },
  { id: 15, categoryName: 'Hành Lá & Gia Vị', description: 'Cây gia vị ngắn ngày (40-50 ngày)' },
  { id: 16, categoryName: 'Rau Mồng Tơi', description: 'Cây ngắn ngày (30-40 ngày), thanh mát mùa hè' },
  { id: 17, categoryName: 'Bắp Cải Mini', description: 'Cây ngắn ngày vụ đông xuân (65-75 ngày)' },
  { id: 18, categoryName: 'Dưa Hấu VietGAP', description: 'Cây ngắn ngày (65-75 ngày), thu hoạch 1 vụ' },
  { id: 19, categoryName: 'Bí Đao Chanh', description: 'Cây ngắn ngày (60-70 ngày), năng suất cao' },
  { id: 20, categoryName: 'Bắp Ngọt (Sweet Corn)', description: 'Cây ngắn ngày (65-75 ngày), thu hoạch bắp tươi' },
];

const DEFAULT_CATEGORIES: CropCategoryResp[] = [
  { id: 1, categoryName: 'Rau ăn lá', description: 'Cải ngọt, cải xanh, xà lách, rau muống, cải bó xôi' },
  { id: 2, categoryName: 'Rau ăn quả', description: 'Cà chua, dưa leo, ớt chuông, đậu bắp, khổ qua' },
  { id: 3, categoryName: 'Rau ăn củ', description: 'Cà rốt, củ cải trắng, khoai tây, hành tây' },
  { id: 4, categoryName: 'Cây ăn quả', description: 'Cam, bưởi, xoài, nhãn, thanh long, dưa lưới' },
  { id: 5, categoryName: 'Cây gia vị & rau thơm', description: 'Húng quế, ngò rí, hành lá, tía tô' },
];

let cachedCategories: CropCategoryResp[] | null = null;

export async function fetchCropCategories(): Promise<CropCategoryResp[]> {
  try {
    const list = await request<CropCategoryResp[]>('/crop-categories');
    const existingNames = new Set((list || []).map(c => c.categoryName.trim().toLowerCase()));
    const merged = [...(list || [])];
    for (const crop of SHORT_TERM_CROPS) {
      if (!existingNames.has(crop.categoryName.trim().toLowerCase())) {
        merged.push(crop);
      }
    }
    cachedCategories = merged.length > 0 ? merged : SHORT_TERM_CROPS;
    return cachedCategories;
  } catch {
    cachedCategories = SHORT_TERM_CROPS;
    return SHORT_TERM_CROPS;
  }
}

async function unusedOriginalFetch(): Promise<CropCategoryResp[]> {
  try {
    const list = await request<CropCategoryResp[]>('/crop-categories');
    cachedCategories = list && list.length > 0 ? list : DEFAULT_CATEGORIES;
    return cachedCategories;
  } catch {
    cachedCategories = DEFAULT_CATEGORIES;
    return DEFAULT_CATEGORIES;
  }
}



export async function fetchCropSeasonsByFarm(
  farmId: number,
  params?: { status?: string; cropCategoryId?: number; keyword?: string; size?: number }
): Promise<CropSeasonResp[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') query.append('status', params.status);
  if (params?.cropCategoryId) query.append('cropCategoryId', String(params.cropCategoryId));
  if (params?.keyword?.trim()) query.append('keyword', params.keyword.trim());
  query.append('size', String(params?.size ?? 100));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const data = await request<PageResp<CropSeasonResp> | CropSeasonResp[]>(`/farms/${farmId}/crop-seasons${qs}`);
  if (Array.isArray(data)) return data;
  return data?.items || data?.content || [];
}

export async function fetchCropSeasonDetail(cropSeasonId: number): Promise<CropSeasonResp> {
  return request<CropSeasonResp>(`/crop-seasons/${cropSeasonId}`);
}

export async function createCropSeason(farmId: number, payload: CreateCropSeasonReq): Promise<CropSeasonResp> {
  return request<CropSeasonResp>(`/farms/${farmId}/crop-seasons`, {
    method: 'POST',
    data: payload,
  });
}

export async function updateCropSeason(cropSeasonId: number, payload: UpdateCropSeasonReq): Promise<CropSeasonResp> {
  return request<CropSeasonResp>(`/crop-seasons/${cropSeasonId}`, {
    method: 'PUT',
    data: payload,
  });
}

export async function updateCropSeasonStatus(cropSeasonId: number, status: string): Promise<CropSeasonResp> {
  return request<CropSeasonResp>(`/crop-seasons/${cropSeasonId}/status`, {
    method: 'PATCH',
    data: { status },
  });
}

export async function fetchBlocksInSeason(cropSeasonId: number): Promise<CropSeasonBlockResp[]> {
  return request<CropSeasonBlockResp[]>(`/crop-seasons/${cropSeasonId}/blocks`);
}

export async function assignBlockToSeason(
  cropSeasonId: number,
  payload: AssignCropSeasonBlockReq
): Promise<CropSeasonBlockResp> {
  return request<CropSeasonBlockResp>(`/crop-seasons/${cropSeasonId}/blocks`, {
    method: 'POST',
    data: payload,
  });
}

export async function updateSeasonBlock(
  cropSeasonId: number,
  blockId: number,
  payload: UpdateCropSeasonBlockReq
): Promise<CropSeasonBlockResp> {
  return request<CropSeasonBlockResp>(`/crop-seasons/${cropSeasonId}/blocks/${blockId}`, {
    method: 'PUT',
    data: payload,
  });
}

export async function deleteCropSeason(cropSeasonId: number): Promise<void> {
  await request<void>(`/crop-seasons/${cropSeasonId}`, {
    method: 'DELETE',
  });
}

export async function removeBlockFromSeason(cropSeasonId: number, blockId: number): Promise<void> {
  await request<void>(`/crop-seasons/${cropSeasonId}/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

export async function fetchCropSeasonsForBlock(
  farmId: number,
  blockId: number
): Promise<Array<CropSeasonResp & { blockMapping?: CropSeasonBlockResp }>> {
  const seasons = await fetchCropSeasonsByFarm(farmId);
  const results: Array<CropSeasonResp & { blockMapping?: CropSeasonBlockResp }> = [];
  await Promise.all(
    seasons.map(async (season) => {
      try {
        const seasonBlocks = await fetchBlocksInSeason(season.cropSeasonId);
        const match = seasonBlocks.find((b) => Number(b.blockId) === Number(blockId));
        if (match) {
          results.push({ ...season, blockMapping: match });
        }
      } catch {
        // ignore individual block lookup error
      }
    })
  );
  return results.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
}


