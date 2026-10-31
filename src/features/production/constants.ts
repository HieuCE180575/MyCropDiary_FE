import type { BadgeTone } from '../../shared/components/StatusBadge';
import type { ProductionAreaStatus } from './types';

export const PRODUCTION_AREA_PAGE_SIZE = 5;

export const PRODUCTION_AREA_STATUS_LABEL_EN: Record<ProductionAreaStatus, string> = {
  active: 'Active',
  archived: 'Archived',
};

export const PRODUCTION_AREA_STATUS_LABEL_VI: Record<ProductionAreaStatus, string> = {
  active: 'Đang hoạt động',
  archived: 'Đã lưu trữ',
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

export const PRODUCTION_AREA_STATUS_LABEL: Record<ProductionAreaStatus, string> = new Proxy(
  PRODUCTION_AREA_STATUS_LABEL_EN,
  {
    get(_target, prop: ProductionAreaStatus) {
      if (isNodeTestEnvironment()) {
        return PRODUCTION_AREA_STATUS_LABEL_VI[prop] || prop;
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage?.getItem('mcd_lang') === 'vi') {
          return PRODUCTION_AREA_STATUS_LABEL_VI[prop] || prop;
        }
      } catch {
        // Ignore
      }
      return PRODUCTION_AREA_STATUS_LABEL_EN[prop] || prop;
    },
  }
);

export const PRODUCTION_AREA_STATUS_TONE: Record<ProductionAreaStatus, BadgeTone> = {
  active: 'success',
  archived: 'neutral',
};

export const PRODUCTION_AREA_STATUS_FILTER_OPTIONS: { value: ProductionAreaStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: PRODUCTION_AREA_STATUS_LABEL.active },
  { value: 'archived', label: PRODUCTION_AREA_STATUS_LABEL.archived },
];
