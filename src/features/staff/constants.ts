import type { BadgeTone } from '../../shared/components/StatusBadge';
import type { StaffMemberStatus } from './types';

export const STAFF_PAGE_SIZE = 5;

export const STAFF_STATUS_LABEL: Record<StaffMemberStatus, string> = {
  active: 'Đang hoạt động',
  suspended: 'Đã vô hiệu hoá',
};

export const STAFF_STATUS_TONE: Record<StaffMemberStatus, BadgeTone> = {
  active: 'success',
  suspended: 'neutral',
};

export const STAFF_STATUS_FILTER_OPTIONS: { value: StaffMemberStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: STAFF_STATUS_LABEL.active },
  { value: 'suspended', label: STAFF_STATUS_LABEL.suspended },
];
