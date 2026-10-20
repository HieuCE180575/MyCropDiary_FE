export type FarmRegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface FarmRegistration {
  farmRegistrationId: string;
  proposedFarmName: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  documentUrl?: string;
  description?: string;
  status: FarmRegistrationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export interface FarmRegistrationFormValues {
  proposedFarmName: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  documentUrl?: string;
  description: string;
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
