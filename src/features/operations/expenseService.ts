import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { notifyDataChanged } from '../../shared/realtime/realtimeBus';

export interface ExpenseItem {
  expenseId: number;
  farmId: number;
  cropSeasonId?: number | null;
  seasonName?: string | null;
  farmTaskId?: number | null;
  taskTitle?: string | null;
  expenseCategory: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  recordedByMemberId?: number | null;
  recordedByName?: string | null;
  receiptImageUrl?: string | null;
  createdAt: string;
}

export interface CreateExpensePayload {
  expenseCategory: string;
  amount: number;
  expenseDate?: string;
  cropSeasonId?: number | null;
  farmTaskId?: number | null;
  description?: string;
  receiptImageUrl?: string;
}

export interface UpdateExpensePayload {
  expenseCategory?: string;
  amount?: number;
  expenseDate?: string;
  cropSeasonId?: number | null;
  farmTaskId?: number | null;
  description?: string;
  receiptImageUrl?: string;
}

export interface ExpenseCategorySummary {
  category: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface ExpenseSeasonSummary {
  seasonId: number;
  seasonName: string;
  totalAmount: number;
  count: number;
}

export interface ExpenseSummaryResp {
  farmId: number;
  cropSeasonId?: number | null;
  cropSeasonName?: string | null;
  totalExpenseAmount: number;
  totalExpenseCount: number;
  byCategory: ExpenseCategorySummary[];
  bySeason: ExpenseSeasonSummary[];
}

export interface ExpenseFilterParams {
  cropSeasonId?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

async function request<T>(path: string, options: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
  const res = await apiRequest<ApiResponse<T>>(path, options);
  if (!res?.success || res.data === undefined) {
    throw new Error(res?.message || 'Yêu cầu không thành công.');
  }
  return res.data;
}

/**
 * : View Expense List, Search Expenses, Filter Expenses
 */
export async function fetchExpenses(farmId: number, params: ExpenseFilterParams = {}): Promise<ExpenseItem[]> {
  const searchParams = new URLSearchParams();
  if (params.cropSeasonId) searchParams.append('cropSeasonId', String(params.cropSeasonId));
  if (params.category) searchParams.append('category', params.category);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.keyword) searchParams.append('keyword', params.keyword);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return await request<ExpenseItem[]>(`/farms/${farmId}/expenses${query}`);
}

/**
 * : View Expense Details
 */
export async function fetchExpenseDetails(expenseId: number): Promise<ExpenseItem> {
  return await request<ExpenseItem>(`/expenses/${expenseId}`);
}

/**
 * : Record Expense
 */
export async function recordExpense(farmId: number, payload: CreateExpenseReqPayload): Promise<ExpenseItem> {
  const data = await request<ExpenseItem>(`/farms/${farmId}/expenses`, {
    method: 'POST',
    data: payload,
  });
  notifyDataChanged('/expenses', 'POST');
  return data;
}

export type CreateExpenseReqPayload = CreateExpensePayload;

/**
 * : Update Expense
 */
export async function updateExpense(expenseId: number, payload: UpdateExpensePayload): Promise<ExpenseItem> {
  const data = await request<ExpenseItem>(`/expenses/${expenseId}`, {
    method: 'PUT',
    data: payload,
  });
  notifyDataChanged('/expenses', 'PUT');
  return data;
}

/**
 * : Delete Eligible Expense
 */
export async function deleteExpense(expenseId: number): Promise<void> {
  await request<void>(`/expenses/${expenseId}`, {
    method: 'DELETE',
  });
  notifyDataChanged('/expenses', 'DELETE');
}

/**
 * : View Expense and Production Cost Summary
 */
export async function fetchExpenseSummary(
  farmId: number,
  params: { cropSeasonId?: number; startDate?: string; endDate?: string } = {}
): Promise<ExpenseSummaryResp> {
  const searchParams = new URLSearchParams();
  if (params.cropSeasonId) searchParams.append('cropSeasonId', String(params.cropSeasonId));
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return await request<ExpenseSummaryResp>(`/farms/${farmId}/expenses/summary${query}`);
}
