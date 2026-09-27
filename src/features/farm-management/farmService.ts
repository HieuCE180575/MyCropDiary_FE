import type { Farm } from './types';

// Khi backend UC-13 sẵn sàng, thay hàm dưới đây bằng lời gọi qua
// `apiRequest<ApiResponse<Farm>>` tới GET /farms/me — backend xác định trang trại
// của người dùng hiện tại dựa trên bản ghi FarmMember có FarmRole = 'owner'.

const MOCK_FARM: Farm = {
  farmId: 'farm-1',
  farmRegistrationId: 'freg-1',
  farmCode: 'FARM-0001',
  farmName: 'Trang trại Xanh Cần Thơ',
  address: '123 Đường Nguyễn Văn Cừ, Phường An Bình, Quận Ninh Kiều, TP. Cần Thơ',
  phoneNumber: '0912345678',
  description: 'Trang trại chuyên canh rau ăn lá và rau gia vị theo tiêu chuẩn VietGAP, diện tích khoảng 2.5 ha.',
  status: 'active',
  createdAt: '2026-08-25T09:12:00.000Z',
  updatedAt: '2026-09-10T14:30:00.000Z',
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lấy trang trại của người dùng hiện tại; trả về null nếu họ chưa có trang trại nào. */
export async function fetchMyFarm(userId: string): Promise<Farm | null> {
  await delay(280);
  return userId === 'user-current' ? MOCK_FARM : null;
}
