import type { PagedResult, ProductionArea, ProductionAreaFormValues, ProductionAreaQueryParams } from './types';

// Khi backend UC-16 sẵn sàng, thay các hàm dưới đây bằng lời gọi qua
// `apiRequest<ApiResponse<...>>` tới các endpoint tương ứng, ví dụ:
//   GET    /production-areas?search=&status=&sortField=&sortDirection=&page=&pageSize=
//   GET    /production-areas/:id
//   POST   /production-areas
//   PATCH  /production-areas/:id
//   PATCH  /production-areas/:id/archive
//   PATCH  /production-areas/:id/restore
// Dữ liệu lưu tạm trong bộ nhớ (mất khi tải lại trang) để mô phỏng hành vi API.

interface ProductionAreaSeed {
  areaName: string;
  locationDescription: string;
  areaHectares: number;
  status: ProductionArea['status'];
  createdAt: string;
}

const PRODUCTION_AREA_SEEDS: ProductionAreaSeed[] = [
  { areaName: 'Khu sản xuất rau an toàn', locationDescription: 'Thạnh Phú, Bến Tre', areaHectares: 5.5, status: 'active', createdAt: '2024-01-10' },
  { areaName: 'Khu trồng cây ăn trái', locationDescription: 'Châu Thành, Bến Tre', areaHectares: 8.2, status: 'active', createdAt: '2023-11-05' },
  { areaName: 'Khu ươm giống', locationDescription: 'Giồng Trôm, Bến Tre', areaHectares: 1.2, status: 'active', createdAt: '2024-03-20' },
  { areaName: 'Khu canh tác lúa', locationDescription: 'Mỏ Cày Nam, Bến Tre', areaHectares: 12.0, status: 'active', createdAt: '2022-08-15' },
  { areaName: 'Khu trồng dừa', locationDescription: 'Bình Đại, Bến Tre', areaHectares: 9.4, status: 'active', createdAt: '2023-05-02' },
  { areaName: 'Khu rau màu vụ đông', locationDescription: 'Thạnh Phú, Bến Tre', areaHectares: 3.1, status: 'active', createdAt: '2025-02-18' },
  { areaName: 'Khu thử nghiệm giống mới', locationDescription: 'Giồng Trôm, Bến Tre', areaHectares: 0.8, status: 'active', createdAt: '2025-06-01' },
  { areaName: 'Khu chăn nuôi kết hợp', locationDescription: 'Ba Tri, Bến Tre', areaHectares: 4.6, status: 'active', createdAt: '2024-09-12' },
  { areaName: 'Khu sản xuất hữu cơ', locationDescription: 'Châu Thành, Bến Tre', areaHectares: 2.9, status: 'active', createdAt: '2025-04-07' },
  { areaName: 'Khu mở rộng 2026', locationDescription: 'Thạnh Phú, Bến Tre', areaHectares: 6.0, status: 'active', createdAt: '2026-01-15' },
  { areaName: 'Khu ven sông', locationDescription: 'Châu Thành, Bến Tre', areaHectares: 3.75, status: 'archived', createdAt: '2022-10-20' },
  { areaName: 'Khu đất phèn cải tạo', locationDescription: 'Mỏ Cày Bắc, Bến Tre', areaHectares: 2.3, status: 'archived', createdAt: '2023-02-14' },
];

let productionAreas: ProductionArea[] = PRODUCTION_AREA_SEEDS.map((seed, index) => {
  const idNumber = index + 1;
  return {
    productionAreaId: `pa-${idNumber}`,
    areaCode: `KSX-${String(idNumber).padStart(4, '0')}`,
    areaName: seed.areaName,
    locationDescription: seed.locationDescription,
    areaHectares: seed.areaHectares,
    status: seed.status,
    createdAt: new Date(`${seed.createdAt}T08:00:00.000Z`).toISOString(),
  };
});

let nextIdNumber = productionAreas.length + 1;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFC');
}

function matchesSearch(area: ProductionArea, search: string): boolean {
  const keyword = normalize(search.trim());
  if (!keyword) return true;
  return (
    normalize(area.areaName).includes(keyword) ||
    normalize(area.locationDescription ?? '').includes(keyword) ||
    normalize(area.areaCode).includes(keyword)
  );
}

export async function fetchProductionAreas(params: ProductionAreaQueryParams): Promise<PagedResult<ProductionArea>> {
  await delay(300);

  const { search = '', status = 'all', sortField, sortDirection, page, pageSize } = params;

  let filtered = productionAreas.filter((area) => matchesSearch(area, search));
  if (status !== 'all') {
    filtered = filtered.filter((area) => area.status === status);
  }

  const direction = sortDirection === 'asc' ? 1 : -1;
  filtered = [...filtered].sort((a, b) => {
    if (sortField === 'areaHectares') return (a.areaHectares - b.areaHectares) * direction;
    if (sortField === 'createdAt') {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    }
    return a.areaName.localeCompare(b.areaName, 'vi') * direction;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, page: safePage, pageSize, totalItems, totalPages };
}

export async function fetchProductionAreaById(productionAreaId: string): Promise<ProductionArea | null> {
  await delay(220);
  return productionAreas.find((area) => area.productionAreaId === productionAreaId) ?? null;
}

export async function createProductionArea(values: ProductionAreaFormValues): Promise<ProductionArea> {
  await delay(400);

  const idNumber = nextIdNumber++;
  const record: ProductionArea = {
    productionAreaId: `pa-${idNumber}`,
    areaCode: `KSX-${String(idNumber).padStart(4, '0')}`,
    areaName: values.areaName.trim(),
    locationDescription: values.locationDescription.trim() || undefined,
    areaHectares: Number(Number(values.areaHectares.trim().replace(',', '.')).toFixed(4)),
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  productionAreas = [record, ...productionAreas];
  return record;
}

export async function updateProductionArea(
  productionAreaId: string,
  values: ProductionAreaFormValues,
): Promise<ProductionArea> {
  await delay(400);

  const existing = productionAreas.find((area) => area.productionAreaId === productionAreaId);
  if (!existing) throw new Error('Không tìm thấy khu sản xuất cần cập nhật.');

  const updated: ProductionArea = {
    ...existing,
    areaName: values.areaName.trim(),
    locationDescription: values.locationDescription.trim() || undefined,
    areaHectares: Number(Number(values.areaHectares.trim().replace(',', '.')).toFixed(4)),
    updatedAt: new Date().toISOString(),
  };

  productionAreas = productionAreas.map((area) => (area.productionAreaId === productionAreaId ? updated : area));
  return updated;
}

export async function archiveProductionArea(productionAreaId: string): Promise<ProductionArea> {
  await delay(300);

  const existing = productionAreas.find((area) => area.productionAreaId === productionAreaId);
  if (!existing) throw new Error('Không tìm thấy khu sản xuất cần lưu trữ.');

  const updated: ProductionArea = { ...existing, status: 'archived', updatedAt: new Date().toISOString() };
  productionAreas = productionAreas.map((area) => (area.productionAreaId === productionAreaId ? updated : area));
  return updated;
}

export async function restoreProductionArea(productionAreaId: string): Promise<ProductionArea> {
  await delay(300);

  const existing = productionAreas.find((area) => area.productionAreaId === productionAreaId);
  if (!existing) throw new Error('Không tìm thấy khu sản xuất cần khôi phục.');

  const updated: ProductionArea = { ...existing, status: 'active', updatedAt: new Date().toISOString() };
  productionAreas = productionAreas.map((area) => (area.productionAreaId === productionAreaId ? updated : area));
  return updated;
}