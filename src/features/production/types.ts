export type ProductionAreaStatus = 'active' | 'archived';

/** Bảng ProductionArea: khu sản xuất của trang trại, chứa nhiều lô đất (Plot) bên trong. */
export interface ProductionArea {
  productionAreaId: string;
  areaCode: string;
  areaName: string;
  locationDescription?: string;
  areaHectares: number;
  status: ProductionAreaStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductionAreaFormValues {
  areaName: string;
  areaHectares: string;
  locationDescription: string;
}

export type ProductionAreaFormErrors = Partial<Record<keyof ProductionAreaFormValues, string>>;

export type ProductionAreaSortField = 'areaName' | 'areaHectares' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ProductionAreaQueryParams {
  search?: string;
  status?: ProductionAreaStatus | 'all';
  sortField: ProductionAreaSortField;
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

/**
 * Bảng StaffAreaAssignment: phân công một nhân viên (FarmMember, role 'staff') phụ trách
 * một khu sản xuất trong một khoảng thời gian. EndsAt rỗng nghĩa là đang được phân công.
 */
export interface StaffAreaAssignment {
  staffAreaAssignmentId: string;
  productionAreaId: string;
  farmMemberId: string;
  staffName: string;
  staffEmail: string;
  startsAt: string;
  endsAt?: string;
  notes?: string;
  createdAt: string;
}

export interface AssignStaffFormValues {
  farmMemberId: string;
  startsAt: string;
  notes: string;
}

export type AssignStaffFormErrors = Partial<Record<keyof AssignStaffFormValues, string>>;