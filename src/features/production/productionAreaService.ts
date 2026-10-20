import type {
  PagedResult,
  ProductionArea,
  ProductionAreaFormValues,
  ProductionAreaQueryParams,
} from './types';
import {
  fetchZonesByFarm,
  fetchZoneById,
  createZone as createZoneApi,
  updateZone as updateZoneApi,
  deleteZone as deleteZoneApi,
} from './zoneBlockService';

export async function fetchProductionAreas(params: ProductionAreaQueryParams, farmId = 1): Promise<PagedResult<ProductionArea>> {
  const { search = '', status = 'all', page = 1, pageSize = 10 } = params;
  const list = await fetchZonesByFarm(farmId, search, status);

  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = list.slice(start, start + pageSize);

  return { items, page: safePage, pageSize, totalItems, totalPages };
}

export async function fetchProductionAreaById(productionAreaId: string): Promise<ProductionArea | null> {
  const id = parseInt(productionAreaId.replace(/^pa-/, ''), 10) || 1;
  return await fetchZoneById(id);
}

export async function createProductionArea(values: ProductionAreaFormValues, farmId = 1): Promise<ProductionArea> {
  return await createZoneApi(farmId, {
    zoneName: values.areaName,
    areaValue: values.areaHectares,
    areaUnit: 'ha',
    description: values.locationDescription,
    imageUrl: '',
  });
}

export async function updateProductionArea(productionAreaId: string, values: ProductionAreaFormValues): Promise<ProductionArea> {
  const id = parseInt(productionAreaId.replace(/^pa-/, ''), 10) || 1;
  return await updateZoneApi(id, {
    zoneName: values.areaName,
    areaValue: values.areaHectares,
    areaUnit: 'ha',
    description: values.locationDescription,
    imageUrl: '',
  });
}

export async function archiveProductionArea(productionAreaId: string): Promise<ProductionArea> {
  const zone = await fetchProductionAreaById(productionAreaId);
  if (!zone) throw new Error('Không tìm thấy vùng sản xuất');
  zone.status = 'archived';
  return zone;
}

export async function restoreProductionArea(productionAreaId: string): Promise<ProductionArea> {
  const zone = await fetchProductionAreaById(productionAreaId);
  if (!zone) throw new Error('Không tìm thấy vùng sản xuất');
  zone.status = 'active';
  return zone;
}

export async function deleteProductionArea(productionAreaId: string): Promise<void> {
  const id = parseInt(productionAreaId.replace(/^pa-/, ''), 10) || 1;
  await deleteZoneApi(id);
}