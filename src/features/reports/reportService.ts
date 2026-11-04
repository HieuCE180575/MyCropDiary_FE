import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

export interface CategoryExpenseSummary {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface SeasonReportSummary {
  cropSeasonId: number;
  seasonName: string;
  cropCategoryName?: string | null;
  harvestYield: number;
  totalExpense: number;
  status: string;
}

export interface FarmReportResp {
  farmId: number;
  farmName: string;
  totalHarvestYield: number;
  yieldUnit: string;
  totalHarvestBatches: number;
  gradeOnePercentage: number;
  totalExpenseAmount: number;
  totalExpenseCount: number;
  totalPurchasesAmount: number;
  totalPurchasesCount: number;
  estimatedRevenue: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  activeSeasonCount: number;
  totalBlockCount: number;
  expenseBreakdown: CategoryExpenseSummary[];
  seasonSummaries: SeasonReportSummary[];
}

export interface CropSeasonReportResp {
  cropSeasonId: number;
  seasonName: string;
  farmId: number;
  farmName: string;
  cropCategoryName?: string | null;
  startDate: string;
  endDate?: string | null;
  seasonStatus: string;
  totalYield: number;
  unit: string;
  harvestCount: number;
  totalExpenses: number;
  activityCount: number;
  materialUsageCount: number;
  expenseBreakdown: CategoryExpenseSummary[];
}

export async function fetchFarmReportSummaryApi(farmId: number): Promise<FarmReportResp> {
  const res = await apiRequest<ApiResponse<FarmReportResp>>(`/farms/${farmId}/reports/summary`);
  return res.data;
}

export async function fetchCropSeasonReportApi(cropSeasonId: number): Promise<CropSeasonReportResp> {
  const res = await apiRequest<ApiResponse<CropSeasonReportResp>>(`/crop-seasons/${cropSeasonId}/report`);
  return res.data;
}

