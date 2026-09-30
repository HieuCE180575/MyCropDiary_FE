export type PlotStatus = 'active' | 'inactive' | 'archived';
export type PlotAreaUnit = 'ha' | 'm2';

/** Bảng Plot: mỗi lô đất thuộc một khu sản xuất, gắn với một nguồn nước. */
export interface Plot {
  plotId: string;
  plotCode: string;
  plotName: string;
  areaHectares: number;
  locationDescription: string;
  soilType?: string;
  status: PlotStatus;
  notes?: string;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PlotSeasonSummary {
  cropSeasonId: string;
  seasonName: string;
  cropName: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
}

export interface PlotFormValues {
  plotName: string;
  areaValue: string;
  areaUnit: PlotAreaUnit;
  locationDescription: string;
  soilType: string;
  status: Exclude<PlotStatus, 'archived'>;
  notes: string;
  coverImage: File | null;
}

export type PlotFormErrors = Partial<Record<keyof Omit<PlotFormValues, 'coverImage'> | 'coverImage', string>>;

export type PlotSortField = 'plotName' | 'areaHectares' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface PlotQueryParams {
  search?: string;
  status?: PlotStatus | 'all';
  sortField: PlotSortField;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
