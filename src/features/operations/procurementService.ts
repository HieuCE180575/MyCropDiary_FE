import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { notifyDataChanged } from '../../shared/realtime/realtimeBus';

export interface SupplierItem {
  supplierId: number;
  farmId: number;
  supplierName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  totalPurchasesCount?: number;
}

export interface CreateSupplierPayload {
  supplierName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateSupplierPayload {
  supplierName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface PurchaseItemPayload {
  materialId: number;
  quantity: number;
  unitCost: number;
  warehouseId?: number;
}

export interface PurchaseItemResp {
  purchaseItemId: number;
  materialId: number;
  materialName: string;
  materialType?: string;
  unit: string;
  warehouseId?: number | null;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface InputPurchaseItem {
  purchaseId: number;
  farmId: number;
  supplierId?: number | null;
  supplierName?: string | null;
  purchasedByMemberId?: number | null;
  purchasedByName?: string | null;
  purchaseDate: string;
  referenceNo?: string | null;
  totalAmount: number;
  receiptImageUrl?: string | null;
  warehouseReceiptNo?: string | null;
  notes?: string | null;
  createdAt: string;
  items: PurchaseItemResp[];
}

export interface CreateInputPurchasePayload {
  supplierId?: number;
  purchaseDate?: string;
  referenceNo?: string;
  receiptImageUrl?: string;
  warehouseReceiptNo?: string;
  notes?: string;
  items: PurchaseItemPayload[];
}

export interface UpdateInputPurchasePayload {
  supplierId?: number;
  purchaseDate?: string;
  referenceNo?: string;
  receiptImageUrl?: string;
  warehouseReceiptNo?: string;
  notes?: string;
  items?: PurchaseItemPayload[];
}

export interface LinkWarehouseReceiptPayload {
  warehouseReceiptNo: string;
  warehouseId?: number;
  notes?: string;
}

async function request<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  const res = await apiRequest<ApiResponse<T>>(path, options);
  if (!res?.success || res.data === undefined) {
    throw new Error(res?.message || 'Yêu cầu không thành công.');
  }
  return res.data;
}

// ==========================================
// UC-35: Supplier APIs
// ==========================================

export async function fetchSuppliers(farmId: number, keyword?: string): Promise<SupplierItem[]> {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return await request<SupplierItem[]>(`/farms/${farmId}/suppliers${query}`);
}

export async function fetchSupplierDetails(supplierId: number): Promise<SupplierItem> {
  return await request<SupplierItem>(`/suppliers/${supplierId}`);
}

export async function createSupplier(farmId: number, payload: CreateSupplierPayload): Promise<SupplierItem> {
  const data = await request<SupplierItem>(`/farms/${farmId}/suppliers`, {
    method: 'POST',
    data: payload,
  });
  notifyDataChanged('/procurement/suppliers', 'POST');
  return data;
}

export async function updateSupplier(supplierId: number, payload: UpdateSupplierPayload): Promise<SupplierItem> {
  const data = await request<SupplierItem>(`/suppliers/${supplierId}`, {
    method: 'PUT',
    data: payload,
  });
  notifyDataChanged('/procurement/suppliers', 'PUT');
  return data;
}

export async function deleteSupplier(supplierId: number): Promise<void> {
  await request<void>(`/suppliers/${supplierId}`, {
    method: 'DELETE',
  });
  notifyDataChanged('/procurement/suppliers', 'DELETE');
}

// ==========================================
// UC-36: Input Purchases & Warehouse Linking APIs
// ==========================================

export async function fetchInputPurchases(farmId: number): Promise<InputPurchaseItem[]> {
  return await request<InputPurchaseItem[]>(`/farms/${farmId}/input-purchases`);
}

export async function fetchInputPurchaseDetails(purchaseId: number): Promise<InputPurchaseItem> {
  return await request<InputPurchaseItem>(`/input-purchases/${purchaseId}`);
}

export async function searchInputPurchases(
  farmId: number,
  params: { keyword?: string; supplierId?: number; fromDate?: string; toDate?: string }
): Promise<InputPurchaseItem[]> {
  const searchParams = new URLSearchParams();
  if (params.keyword) searchParams.append('keyword', params.keyword);
  if (params.supplierId) searchParams.append('supplierId', String(params.supplierId));
  if (params.fromDate) searchParams.append('fromDate', params.fromDate);
  if (params.toDate) searchParams.append('toDate', params.toDate);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return await request<InputPurchaseItem[]>(`/farms/${farmId}/input-purchases/search${query}`);
}

export async function recordInputPurchase(farmId: number, payload: CreateInputPurchasePayload): Promise<InputPurchaseItem> {
  const data = await request<InputPurchaseItem>(`/farms/${farmId}/input-purchases`, {
    method: 'POST',
    data: payload,
  });
  notifyDataChanged('/procurement/purchases', 'POST');
  return data;
}

export async function updateInputPurchase(purchaseId: number, payload: UpdateInputPurchasePayload): Promise<InputPurchaseItem> {
  const data = await request<InputPurchaseItem>(`/input-purchases/${purchaseId}`, {
    method: 'PUT',
    data: payload,
  });
  notifyDataChanged('/procurement/purchases', 'PUT');
  return data;
}

export async function deleteInputPurchase(purchaseId: number): Promise<void> {
  await request<void>(`/input-purchases/${purchaseId}`, {
    method: 'DELETE',
  });
  notifyDataChanged('/procurement/purchases', 'DELETE');
}

export async function linkWarehouseReceipt(purchaseId: number, payload: LinkWarehouseReceiptPayload): Promise<InputPurchaseItem> {
  const data = await request<InputPurchaseItem>(`/input-purchases/${purchaseId}/link-warehouse-receipt`, {
    method: 'POST',
    data: payload,
  });
  notifyDataChanged('/procurement/purchases', 'PATCH');
  return data;
}

