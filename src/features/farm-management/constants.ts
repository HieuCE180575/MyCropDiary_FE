import type { BadgeTone } from '../../shared/components/StatusBadge';
import type { FarmRegistrationStatus } from './types';

export const FARM_REGISTRATION_STATUS_LABEL: Record<FarmRegistrationStatus, string> = {
  pending: 'Đang chờ duyệt',
  approved: 'Đã được duyệt',
  rejected: 'Bị từ chối',
  cancelled: 'Đã hủy',
};

export const FARM_REGISTRATION_STATUS_TONE: Record<FarmRegistrationStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};
