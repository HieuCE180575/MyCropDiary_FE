export type StaffMemberStatus = 'active' | 'suspended';

/**
 * Một thành viên trang trại có FarmRole = 'staff' — kết hợp dữ liệu từ bảng
 * FarmMember (FarmMemberId, UserId, Status, JoinedAt, SuspendedAt) và bảng
 * User (FullName, Email, PhoneNumber) mà nó tham chiếu tới.
 */
export interface StaffMember {
  farmMemberId: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: StaffMemberStatus;
  joinedAt: string;
  suspendedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffFormValues {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export type StaffFormErrors = Partial<Record<keyof StaffFormValues, string>>;

export type StaffSortField = 'fullName' | 'email' | 'joinedAt';
export type SortDirection = 'asc' | 'desc';

export interface StaffQueryParams {
  search?: string;
  status?: StaffMemberStatus | 'all';
  sortField: StaffSortField;
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
