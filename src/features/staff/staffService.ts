import type { PagedResult, StaffFormValues, StaffMember, StaffQueryParams } from './types';

// Khi backend UC-14-15 san sang, thay cac ham duoi day bang loi goi qua
// `apiRequest<ApiResponse<...>>` toi cac endpoint tuong ung, vi du:
//   GET    /farms/:farmId/members?role=staff&search=&status=&sortField=&sortDirection=&page=&pageSize=
//   POST   /farms/:farmId/members            (role='staff'; backend tim User theo email hoac gui loi moi
//                                              qua AccountToken neu email chua co tai khoan)
//   PATCH  /farms/:farmId/members/:id
//   PATCH  /farms/:farmId/members/:id/suspend
//   PATCH  /farms/:farmId/members/:id/activate
// Du lieu luu tam trong bo nho (mat khi tai lai trang) de mo phong hanh vi API; FarmMemberId
// va UserId o day chi la id gia, khong co bang User/FarmMember that phia sau.

interface StaffSeed {
  fullName: string;
  email: string;
  phoneNumber: string;
  status: StaffMember['status'];
  joinedAt: string;
  suspendedAt?: string;
}

const STAFF_SEEDS: StaffSeed[] = [
  { fullName: 'Nguyễn Văn An', email: 'an.nguyen@gmail.com', phoneNumber: '0901234567', status: 'active', joinedAt: '2024-02-01' },
  { fullName: 'Trần Thị Bích', email: 'bich.tran@gmail.com', phoneNumber: '0912345678', status: 'active', joinedAt: '2024-05-15' },
  { fullName: 'Lê Văn Cường', email: 'cuong.le@gmail.com', phoneNumber: '0923456789', status: 'active', joinedAt: '2023-09-10' },
  { fullName: 'Phạm Thị Duyên', email: 'duyen.pham@gmail.com', phoneNumber: '0934567890', status: 'active', joinedAt: '2025-01-20' },
  { fullName: 'Hoàng Văn Em', email: 'em.hoang@gmail.com', phoneNumber: '0945678901', status: 'active', joinedAt: '2022-11-05' },
  { fullName: 'Võ Thị Phượng', email: 'phuong.vo@gmail.com', phoneNumber: '0956789012', status: 'suspended', joinedAt: '2023-03-01', suspendedAt: '2025-06-30' },
  { fullName: 'Đặng Văn Giang', email: 'giang.dang@gmail.com', phoneNumber: '0967890123', status: 'active', joinedAt: '2024-08-12' },
  { fullName: 'Bùi Thị Hoa', email: 'hoa.bui@gmail.com', phoneNumber: '0978901234', status: 'active', joinedAt: '2025-02-14' },
  { fullName: 'Ngô Văn Inh', email: 'inh.ngo@gmail.com', phoneNumber: '0989012345', status: 'active', joinedAt: '2023-12-01' },
  { fullName: 'Đỗ Thị Kim', email: 'kim.do@gmail.com', phoneNumber: '0990123456', status: 'suspended', joinedAt: '2022-06-20', suspendedAt: '2024-12-15' },
  { fullName: 'Vũ Văn Long', email: 'long.vu@gmail.com', phoneNumber: '0901112233', status: 'active', joinedAt: '2025-04-03' },
  { fullName: 'Phan Thị Mai', email: 'mai.phan@gmail.com', phoneNumber: '0912223344', status: 'active', joinedAt: '2026-01-10' },
];

let staffList: StaffMember[] = STAFF_SEEDS.map((seed, index) => {
  const idNumber = index + 1;
  return {
    farmMemberId: `fm-${idNumber}`,
    userId: `user-${idNumber}`,
    fullName: seed.fullName,
    email: seed.email,
    phoneNumber: seed.phoneNumber,
    status: seed.status,
    joinedAt: new Date(`${seed.joinedAt}T08:00:00.000Z`).toISOString(),
    suspendedAt: seed.suspendedAt ? new Date(`${seed.suspendedAt}T08:00:00.000Z`).toISOString() : undefined,
    createdAt: new Date(`${seed.joinedAt}T08:00:00.000Z`).toISOString(),
  };
});

let nextIdNumber = staffList.length + 1;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFC');
}

function matchesSearch(staff: StaffMember, search: string): boolean {
  const keyword = normalize(search.trim());
  if (!keyword) return true;
  return (
    normalize(staff.fullName).includes(keyword) ||
    normalize(staff.email).includes(keyword) ||
    (staff.phoneNumber ?? '').includes(keyword)
  );
}

export async function fetchStaff(params: StaffQueryParams): Promise<PagedResult<StaffMember>> {
  await delay(300);

  const { search = '', status = 'all', sortField, sortDirection, page, pageSize } = params;

  let filtered = staffList.filter((staff) => matchesSearch(staff, search));
  if (status !== 'all') {
    filtered = filtered.filter((staff) => staff.status === status);
  }

  const direction = sortDirection === 'asc' ? 1 : -1;
  filtered = [...filtered].sort((a, b) => {
    if (sortField === 'email') return a.email.localeCompare(b.email, 'vi') * direction;
    if (sortField === 'joinedAt') {
      return (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()) * direction;
    }
    return a.fullName.localeCompare(b.fullName, 'vi') * direction;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, page: safePage, pageSize, totalItems, totalPages };
}

export async function createStaff(values: StaffFormValues): Promise<StaffMember> {
  await delay(400);

  const email = values.email.trim().toLowerCase();
  const alreadyMember = staffList.some((staff) => staff.email.toLowerCase() === email);
  if (alreadyMember) {
    throw new Error('Email này đã là nhân viên của trang trại.');
  }

  const idNumber = nextIdNumber++;
  const record: StaffMember = {
    farmMemberId: `fm-${idNumber}`,
    userId: `user-${idNumber}`,
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phoneNumber: values.phoneNumber.trim() || undefined,
    status: 'active',
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  staffList = [record, ...staffList];
  return record;
}

export async function updateStaff(farmMemberId: string, values: StaffFormValues): Promise<StaffMember> {
  await delay(400);

  const existing = staffList.find((staff) => staff.farmMemberId === farmMemberId);
  if (!existing) throw new Error('Không tìm thấy nhân viên cần cập nhật.');

  const email = values.email.trim().toLowerCase();
  const emailTakenByAnother = staffList.some(
    (staff) => staff.farmMemberId !== farmMemberId && staff.email.toLowerCase() === email,
  );
  if (emailTakenByAnother) {
    throw new Error('Email này đã được dùng bởi một nhân viên khác.');
  }

  const updated: StaffMember = {
    ...existing,
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phoneNumber: values.phoneNumber.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  staffList = staffList.map((staff) => (staff.farmMemberId === farmMemberId ? updated : staff));
  return updated;
}

export async function suspendStaff(farmMemberId: string): Promise<StaffMember> {
  await delay(300);

  const existing = staffList.find((staff) => staff.farmMemberId === farmMemberId);
  if (!existing) throw new Error('Không tìm thấy nhân viên cần vô hiệu hoá.');

  const updated: StaffMember = {
    ...existing,
    status: 'suspended',
    suspendedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  staffList = staffList.map((staff) => (staff.farmMemberId === farmMemberId ? updated : staff));
  return updated;
}

export async function activateStaff(farmMemberId: string): Promise<StaffMember> {
  await delay(300);

  const existing = staffList.find((staff) => staff.farmMemberId === farmMemberId);
  if (!existing) throw new Error('Không tìm thấy nhân viên cần kích hoạt lại.');

  const updated: StaffMember = {
    ...existing,
    status: 'active',
    suspendedAt: undefined,
    updatedAt: new Date().toISOString(),
  };
  staffList = staffList.map((staff) => (staff.farmMemberId === farmMemberId ? updated : staff));
  return updated;
}