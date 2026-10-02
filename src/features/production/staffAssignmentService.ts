import { fetchStaff } from '../staff/staffService';
import type { AssignStaffFormValues, StaffAreaAssignment } from './types';

// Khi backend UC-16/33-34 sẵn sàng, thay các hàm dưới đây bằng lời gọi qua
// `apiRequest<ApiResponse<...>>` tới các endpoint tương ứng, ví dụ:
//   GET    /production-areas/:id/assignments
//   POST   /production-areas/:id/assignments      (FarmMemberId, StartsAt, Notes)
//   PATCH  /staff-area-assignments/:id/end         (đặt EndsAt = hiện tại)
// Dữ liệu lưu tạm trong bộ nhớ (mất khi tải lại trang) để mô phỏng hành vi API.

let assignments: StaffAreaAssignment[] = [];
let nextIdNumber = 1;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Nhân viên đang hoạt động — dùng để chọn trong form phân công (chỉ phân công được staff đang hoạt động). */
export async function fetchAssignableStaff() {
  const result = await fetchStaff({
    status: 'active',
    sortField: 'fullName',
    sortDirection: 'asc',
    page: 1,
    pageSize: 200,
  });
  return result.items;
}

export async function fetchAssignmentsForArea(productionAreaId: string): Promise<StaffAreaAssignment[]> {
  await delay(220);
  return assignments
    .filter((assignment) => assignment.productionAreaId === productionAreaId)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
}

export async function assignStaffToArea(
  productionAreaId: string,
  values: AssignStaffFormValues,
): Promise<StaffAreaAssignment> {
  await delay(400);

  const staffOptions = await fetchAssignableStaff();
  const staff = staffOptions.find((member) => member.farmMemberId === values.farmMemberId);
  if (!staff) throw new Error('Không tìm thấy nhân viên đã chọn.');

  const alreadyAssigned = assignments.some(
    (assignment) =>
      assignment.productionAreaId === productionAreaId &&
      assignment.farmMemberId === values.farmMemberId &&
      !assignment.endsAt,
  );
  if (alreadyAssigned) {
    throw new Error('Nhân viên này đang được phân công cho khu sản xuất này rồi.');
  }

  const idNumber = nextIdNumber++;
  const record: StaffAreaAssignment = {
    staffAreaAssignmentId: `saa-${idNumber}`,
    productionAreaId,
    farmMemberId: staff.farmMemberId,
    staffName: staff.fullName,
    staffEmail: staff.email,
    startsAt: new Date(`${values.startsAt}T08:00:00.000Z`).toISOString(),
    notes: values.notes.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  assignments = [record, ...assignments];
  return record;
}

export async function endAssignment(staffAreaAssignmentId: string): Promise<StaffAreaAssignment> {
  await delay(300);

  const existing = assignments.find((assignment) => assignment.staffAreaAssignmentId === staffAreaAssignmentId);
  if (!existing) throw new Error('Không tìm thấy lượt phân công cần kết thúc.');

  const updated: StaffAreaAssignment = { ...existing, endsAt: new Date().toISOString() };
  assignments = assignments.map((assignment) =>
    assignment.staffAreaAssignmentId === staffAreaAssignmentId ? updated : assignment,
  );
  return updated;
}