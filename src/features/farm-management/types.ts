export type FarmRegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** Metadata của một tệp minh chứng — hình dạng lưu trong cột EvidenceFiles (jsonb). */
export interface EvidenceFileMeta {
  name: string;
  sizeKB: number;
  type: string;
}

export interface FarmRegistration {
  farmRegistrationId: string;
  submittedByUserId: string;
  reviewedByUserId?: string;
  proposedFarmName: string;
  address: string;
  contactPhone: string;
  description?: string;
  evidenceFiles: EvidenceFileMeta[];
  status: FarmRegistrationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export interface FarmRegistrationFormValues {
  proposedFarmName: string;
  address: string;
  contactPhone: string;
  description: string;
  /** Tệp thật do người dùng chọn (ảnh, PDF, .zip...); chỉ tồn tại phía client trước khi gửi. */
  evidenceFiles: File[];
}

export type FarmRegistrationFormErrors = Partial<Record<keyof FarmRegistrationFormValues, string>>;

export type FarmStatus = 'active' | 'suspended' | 'closed';

/** Thông tin chung của trang trại — hiển thị cho chủ trang trại (bảng Farm). */
export interface Farm {
  farmId: string;
  farmRegistrationId: string;
  farmCode: string;
  farmName: string;
  address: string;
  phoneNumber?: string;
  description?: string;
  status: FarmStatus;
  createdAt: string;
  updatedAt?: string;
}
