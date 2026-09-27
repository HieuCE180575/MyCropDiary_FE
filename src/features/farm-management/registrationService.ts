import type { FarmRegistration, FarmRegistrationFormValues } from './types';

// Khi backend UC-09 sẵn sàng, thay thế các hàm dưới đây bằng lời gọi qua
// `apiRequest<ApiResponse<...>>` tới các endpoint tương ứng, ví dụ:
//   GET    /farm-registrations/me
//   POST   /farm-registrations            (multipart/form-data kèm các tệp minh chứng)
//   PATCH  /farm-registrations/:id/cancel
// Backend thật sẽ tải các tệp lên storage (S3/GCS...) trước, sau đó lưu mảng
// {name, url, sizeKB, type} vào cột EvidenceFiles (jsonb). Ở đây ta chỉ lưu metadata
// (không có url thật) vì chưa có nơi lưu trữ tệp thật sự.
// Dữ liệu được lưu tạm trong bộ nhớ (mất khi tải lại trang) để mô phỏng hành vi API.

let registrations: FarmRegistration[] = [];
let nextId = 1;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lấy đăng ký gần nhất của người dùng (nếu có). */
export async function fetchMyLatestRegistration(userId: string): Promise<FarmRegistration | null> {
  await delay(250);

  const mine = registrations.filter((r) => r.submittedByUserId === userId);
  if (mine.length === 0) return null;

  return [...mine].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
}

export async function submitFarmRegistration(
  userId: string,
  values: FarmRegistrationFormValues,
): Promise<FarmRegistration> {
  await delay(400);

  const hasPending = registrations.some((r) => r.submittedByUserId === userId && r.status === 'pending');
  if (hasPending) {
    throw new Error('Bạn đã có một đăng ký đang chờ duyệt. Vui lòng hủy đăng ký hiện tại trước khi gửi mới.');
  }

  const record: FarmRegistration = {
    farmRegistrationId: `freg-${nextId++}`,
    submittedByUserId: userId,
    proposedFarmName: values.proposedFarmName.trim(),
    address: values.address.trim(),
    contactPhone: values.contactPhone.trim(),
    description: values.description.trim() || undefined,
    evidenceFiles: values.evidenceFiles.map((file) => ({
      name: file.name,
      sizeKB: Math.max(1, Math.round(file.size / 1024)),
      type: file.type || 'application/octet-stream',
    })),
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  registrations = [...registrations, record];
  return record;
}

/** Người nộp đơn tự hủy đăng ký của mình — chỉ được phép khi đang ở trạng thái "chờ duyệt". */
export async function cancelFarmRegistration(registrationId: string, userId: string): Promise<FarmRegistration> {
  await delay(300);

  const record = registrations.find((r) => r.farmRegistrationId === registrationId && r.submittedByUserId === userId);
  if (!record) {
    throw new Error('Không tìm thấy đăng ký cần hủy.');
  }
  if (record.status !== 'pending') {
    throw new Error('Chỉ có thể hủy đăng ký khi đang ở trạng thái chờ duyệt.');
  }

  const updated: FarmRegistration = {
    ...record,
    status: 'cancelled',
    reviewedAt: new Date().toISOString(),
    reviewComment: 'Người nộp đơn đã tự hủy đăng ký.',
  };
  registrations = registrations.map((r) => (r.farmRegistrationId === registrationId ? updated : r));
  return updated;
}