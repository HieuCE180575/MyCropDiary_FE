import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import type { PagedResult, StaffFormValues, StaffMember, StaffQueryParams } from './types';

export interface BackendFarmMemberResp {
  id: number;
  farmId: number;
  farmName?: string | null;
  userId: number;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  farmRole: string;
  jobTitle?: string | null;
  joinedAt: string;
  leftAt?: string | null;
  status: string;
  activeAssignmentCount?: number;
}

export interface FarmStaffRecord {
  farmMemberId: number;
  userId: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  membershipStatus: string;
  farmRole: string;
  roleLabel: string;
  joinedAt: string;
  activeAssignmentCount: number;
}

function mapDtoToStaffRecord(dto: BackendFarmMemberResp): FarmStaffRecord {
  const rawStatus = (dto.status || 'active').toUpperCase();
  const isActive = rawStatus === 'ACTIVE' || rawStatus === 'INVITED';
  const rawRole = (dto.farmRole || 'staff').toLowerCase();
  const roleLabel =
    dto.jobTitle?.trim() ||
    (rawRole === 'owner'
      ? 'Chủ trang trại'
      : rawRole === 'staff'
        ? 'Nhân viên kỹ thuật'
        : 'Thành viên trang trại');

  return {
    farmMemberId: dto.id,
    userId: dto.userId,
    fullName: dto.fullName || dto.email,
    email: dto.email,
    phoneNumber: dto.phoneNumber ?? undefined,
    status: isActive ? 'ACTIVE' : 'SUSPENDED',
    membershipStatus: dto.status || 'active',
    farmRole: rawRole.toUpperCase(),
    roleLabel,
    joinedAt: dto.joinedAt || new Date().toISOString(),
    activeAssignmentCount: dto.activeAssignmentCount ?? 0,
  };
}

function mapDtoToStaffMember(dto: BackendFarmMemberResp): StaffMember {
  const rec = mapDtoToStaffRecord(dto);
  return {
    farmMemberId: String(rec.farmMemberId),
    userId: String(rec.userId),
    fullName: rec.fullName,
    email: rec.email,
    phoneNumber: rec.phoneNumber,
    status: rec.status === 'ACTIVE' ? 'active' : 'suspended',
    joinedAt: rec.joinedAt,
    suspendedAt: dto.leftAt ?? undefined,
    createdAt: rec.joinedAt,
  };
}

/**
 * UC-14 & UC-33: Lấy danh sách thành viên / nhân sự trang trại từ Backend `/api/v1/farms/{farmId}/members/staff`
 */
export async function getFarmStaffList(
  farmId: number,
  params?: { status?: string; keyword?: string }
): Promise<FarmStaffRecord[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') {
    const mappedStatus = params.status.toUpperCase() === 'ACTIVE' ? 'active' : 'left';
    query.set('status', mappedStatus);
  }
  if (params?.keyword?.trim()) {
    query.set('keyword', params.keyword.trim());
  }
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await apiRequest<ApiResponse<BackendFarmMemberResp[]>>(`/farms/${farmId}/members/staff${qs}`);
  if (!res?.success || !Array.isArray(res.data)) {
    throw new Error(res?.message || 'Không tải được danh sách nhân sự trang trại.');
  }
  return res.data.map(mapDtoToStaffRecord);
}

/**
 * UC-33: Thêm nhân viên vào trang trại qua `/api/v1/farms/{farmId}/members/staff`
 */
export async function addFarmStaffMember(
  farmId: number,
  payload: { email: string; farmRole?: string; jobTitle?: string }
): Promise<FarmStaffRecord> {
  const res = await apiRequest<ApiResponse<BackendFarmMemberResp>>(`/farms/${farmId}/members/staff`, {
    method: 'POST',
    data: {
      email: payload.email.trim(),
      farmRole: payload.farmRole?.toLowerCase() === 'owner' ? 'owner' : 'staff',
      jobTitle: payload.jobTitle?.trim() || undefined,
    },
  });
  if (!res?.success || !res.data) {
    throw new Error(res?.message || 'Không thể thêm nhân viên vào trang trại.');
  }
  return mapDtoToStaffRecord(res.data);
}

/**
 * UC-33: Cập nhật vai trò hoặc kích hoạt lại thành viên qua `PUT /api/v1/farms/{farmId}/members/{memberId}`
 */
export async function updateFarmStaffMember(
  farmId: number,
  memberId: number,
  payload: { farmRole?: 'OWNER' | 'STAFF'; jobTitle?: string; status?: 'INVITED' | 'ACTIVE' | 'INACTIVE' }
): Promise<FarmStaffRecord> {
  const res = await apiRequest<ApiResponse<BackendFarmMemberResp>>(`/farms/${farmId}/members/${memberId}`, {
    method: 'PUT',
    data: payload,
  });
  if (!res?.success || !res.data) {
    throw new Error(res?.message || 'Không thể cập nhật thông tin nhân viên.');
  }
  return mapDtoToStaffRecord(res.data);
}

/**
 * UC-33: Vô hiệu hóa thành viên trang trại qua `PATCH /api/v1/farms/{farmId}/members/{memberId}/deactivate`
 */
export async function deactivateFarmStaffMember(farmId: number, memberId: number): Promise<void> {
  const res = await apiRequest<ApiResponse<void>>(`/farms/${farmId}/members/${memberId}/deactivate`, {
    method: 'PATCH',
  });
  if (res && !res.success) {
    throw new Error(res.message || 'Không thể vô hiệu hóa nhân viên.');
  }
}

/**
 * UC-33: Xóa thành viên khỏi trang trại qua `DELETE /api/v1/farms/{farmId}/members/{memberId}`
 */
export async function deleteFarmStaffMember(farmId: number, memberId: number): Promise<void> {
  const res = await apiRequest<ApiResponse<void>>(`/farms/${farmId}/members/${memberId}`, {
    method: 'DELETE',
  });
  if (res && !res.success) {
    throw new Error(res.message || 'Không thể xóa thành viên khỏi trang trại.');
  }
}

// =========================================================================
// Legacy compatibility helpers (cho các component cũ dùng StaffQueryParams)
// =========================================================================

export async function fetchStaff(params: StaffQueryParams & { farmId?: number }): Promise<PagedResult<StaffMember>> {
  const farmId = params.farmId || 1;
  const { search = '', status = 'all', sortField, sortDirection, page, pageSize } = params;

  try {
    const records = await getFarmStaffList(farmId, {
      status: status === 'all' ? 'ALL' : status.toUpperCase(),
      keyword: search,
    });
    const direction = sortDirection === 'asc' ? 1 : -1;
    const sorted = [...records]
      .map((r): StaffMember => ({
        farmMemberId: String(r.farmMemberId),
        userId: String(r.userId),
        fullName: r.fullName,
        email: r.email,
        phoneNumber: r.phoneNumber,
        status: r.status === 'ACTIVE' ? 'active' : 'suspended',
        joinedAt: r.joinedAt,
        createdAt: r.joinedAt,
      }))
      .sort((a, b) => {
        if (sortField === 'email') return a.email.localeCompare(b.email, 'vi') * direction;
        if (sortField === 'joinedAt') {
          return (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()) * direction;
        }
        return a.fullName.localeCompare(b.fullName, 'vi') * direction;
      });

    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    return { items, page: safePage, pageSize, totalItems, totalPages };
  } catch {
    return { items: [], page: 1, pageSize, totalItems: 0, totalPages: 1 };
  }
}

export async function createStaff(values: StaffFormValues, farmId = 1): Promise<StaffMember> {
  const created = await addFarmStaffMember(farmId, {
    email: values.email,
    farmRole: 'staff',
  });
  return mapDtoToStaffMember({
    id: created.farmMemberId,
    farmId,
    userId: created.userId,
    fullName: created.fullName || values.fullName,
    email: created.email,
    phoneNumber: created.phoneNumber || values.phoneNumber,
    farmRole: created.farmRole,
    joinedAt: created.joinedAt,
    status: created.status,
  });
}

export async function updateStaff(farmMemberId: string, _values: StaffFormValues, farmId = 1): Promise<StaffMember> {
  const updated = await updateFarmStaffMember(farmId, Number(farmMemberId), {
    farmRole: 'STAFF',
    status: 'ACTIVE',
  });
  return {
    farmMemberId: String(updated.farmMemberId),
    userId: String(updated.userId),
    fullName: updated.fullName,
    email: updated.email,
    phoneNumber: updated.phoneNumber,
    status: updated.status === 'ACTIVE' ? 'active' : 'suspended',
    joinedAt: updated.joinedAt,
    createdAt: updated.joinedAt,
  };
}

export async function suspendStaff(farmMemberId: string, farmId = 1): Promise<void> {
  await deactivateFarmStaffMember(farmId, Number(farmMemberId));
}

export async function activateStaff(farmMemberId: string, farmId = 1): Promise<StaffMember> {
  const updated = await updateFarmStaffMember(farmId, Number(farmMemberId), {
    status: 'ACTIVE',
  });
  return {
    farmMemberId: String(updated.farmMemberId),
    userId: String(updated.userId),
    fullName: updated.fullName,
    email: updated.email,
    phoneNumber: updated.phoneNumber,
    status: 'active',
    joinedAt: updated.joinedAt,
    createdAt: updated.joinedAt,
  };
}

export interface CandidateUser {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  systemRole: string;
}

export interface FarmInvitation {
  memberId: number;
  farmId: number;
  farmName: string;
  farmAddress?: string | null;
  ownerName: string;
  farmRole: string;
  jobTitle?: string | null;
  invitedAt: string;
}

export async function fetchCandidateUsers(farmId: number, keyword?: string): Promise<CandidateUser[]> {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  const res = await apiRequest<ApiResponse<CandidateUser[]>>(`/farms/${farmId}/members/candidates${query}`);
  return res.data || [];
}

export async function fetchMyFarmInvitations(): Promise<FarmInvitation[]> {
  const res = await apiRequest<ApiResponse<FarmInvitation[]>>('/user/farm-invitations');
  return res.data || [];
}

export async function respondFarmInvitation(memberId: number, action: 'approve' | 'reject'): Promise<void> {
  const res = await apiRequest<ApiResponse<void>>(`/user/farm-invitations/${memberId}/${action}`, {
    method: 'POST',
  });
  if (!res.success) throw new Error(res.message || 'Không thể phản hồi lời mời tham gia trang trại.');
}
