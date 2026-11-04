import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface WarehouseResp {
  warehouseId: number;
  farmId: number;
  farmName: string;
  warehouseName: string;
  address?: string | null;
  imageUrl?: string | null;
  totalItemCount: number;
  createdAt: string;
}

export interface InventoryItemResp {
  inventoryId: number;
  warehouseId: number;
  warehouseName: string;
  materialId: number;
  materialName: string;
  materialType?: string | null;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  isLowStock: boolean;
  updatedAt: string;
}

export interface CreateWarehouseReq {
  warehouseName: string;
  address?: string;
  imageUrl?: string;
}

export interface UpdateInventoryReq {
  quantityOnHand: number;
  reorderLevel: number;
}

export async function fetchWarehousesApi(farmId: number): Promise<WarehouseResp[]> {
  const res = await apiRequest<ApiResponse<WarehouseResp[]>>(`/farms/${farmId}/warehouses`);
  return res.data || [];
}

export async function fetchWarehouseDetailsApi(warehouseId: number): Promise<WarehouseResp> {
  const res = await apiRequest<ApiResponse<WarehouseResp>>(`/warehouses/${warehouseId}`);
  return res.data;
}

export async function createWarehouseApi(farmId: number, req: CreateWarehouseReq): Promise<WarehouseResp> {
  const res = await apiRequest<ApiResponse<WarehouseResp>>(`/farms/${farmId}/warehouses`, {
    method: 'POST',
    data: req,
  });
  return res.data;
}

export async function fetchInventoriesApi(
  farmId: number,
  params?: { warehouseId?: number; keyword?: string }
): Promise<InventoryItemResp[]> {
  const query = new URLSearchParams();
  if (params?.warehouseId) query.set('warehouseId', String(params.warehouseId));
  if (params?.keyword) query.set('keyword', params.keyword);

  const qs = query.toString();
  const res = await apiRequest<ApiResponse<InventoryItemResp[]>>(`/farms/${farmId}/inventories${qs ? `?${qs}` : ''}`);
  return res.data || [];
}

export async function fetchInventoryDetailsApi(inventoryId: number): Promise<InventoryItemResp> {
  const res = await apiRequest<ApiResponse<InventoryItemResp>>(`/inventories/${inventoryId}`);
  return res.data;
}

export async function updateInventoryApi(inventoryId: number, req: UpdateInventoryReq): Promise<InventoryItemResp> {
  const res = await apiRequest<ApiResponse<InventoryItemResp>>(`/inventories/${inventoryId}`, {
    method: 'PUT',
    data: req,
  });
  return res.data;
}

