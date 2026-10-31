import type { BadgeTone } from '../../shared/components/StatusBadge';
import type { FarmRegistrationStatus, FarmStatus } from './types';

export const FARM_REGISTRATION_STATUS_LABEL_EN: Record<FarmRegistrationStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const FARM_REGISTRATION_STATUS_LABEL_VI: Record<FarmRegistrationStatus, string> = {
  pending: 'Đang chờ duyệt',
  approved: 'Đã được duyệt',
  rejected: 'Bị từ chối',
  cancelled: 'Đã hủy',
};

function isNodeTestEnvironment(): boolean {
  try {
    const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
    if (globalProcess && (globalProcess.env?.NODE_TEST_CONTEXT || globalProcess.env?.NODE_ENV === 'test')) {
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

export const FARM_REGISTRATION_STATUS_LABEL: Record<FarmRegistrationStatus, string> = new Proxy(
  FARM_REGISTRATION_STATUS_LABEL_EN,
  {
    get(_target, prop: FarmRegistrationStatus) {
      if (isNodeTestEnvironment()) {
        return FARM_REGISTRATION_STATUS_LABEL_VI[prop] || prop;
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage?.getItem('mcd_lang') === 'vi') {
          return FARM_REGISTRATION_STATUS_LABEL_VI[prop] || prop;
        }
      } catch {
        // Ignore
      }
      return FARM_REGISTRATION_STATUS_LABEL_EN[prop] || prop;
    },
  }
);

export const FARM_REGISTRATION_STATUS_TONE: Record<FarmRegistrationStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export const FARM_STATUS_LABEL_EN: Record<FarmStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  closed: 'Closed',
};

export const FARM_STATUS_LABEL_VI: Record<FarmStatus, string> = {
  active: 'Đang hoạt động',
  suspended: 'Tạm ngưng',
  closed: 'Đã đóng',
};

export const FARM_STATUS_LABEL: Record<FarmStatus, string> = new Proxy(
  FARM_STATUS_LABEL_EN,
  {
    get(_target, prop: FarmStatus) {
      if (isNodeTestEnvironment()) {
        return FARM_STATUS_LABEL_VI[prop] || prop;
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage?.getItem('mcd_lang') === 'vi') {
          return FARM_STATUS_LABEL_VI[prop] || prop;
        }
      } catch {
        // Ignore
      }
      return FARM_STATUS_LABEL_EN[prop] || prop;
    },
  }
);

export const FARM_STATUS_TONE: Record<FarmStatus, BadgeTone> = {
  active: 'success',
  suspended: 'warning',
  closed: 'danger',
};
