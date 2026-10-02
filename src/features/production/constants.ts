import type { BadgeTone } from '../../shared/components/StatusBadge';
import type { ProductionAreaStatus } from './types';

export const PRODUCTION_AREA_PAGE_SIZE = 5;

export const PRODUCTION_AREA_STATUS_LABEL: Record<ProductionAreaStatus, string> = {
  active: 'Đang hoạt động',
  archived: 'Đã lưu trữ',
};

export const PRODUCTION_AREA_STATUS_TONE: Record<ProductionAreaStatus, BadgeTone> = {
  active: 'success',
  archived: 'neutral',
};

export const PRODUCTION_AREA_STATUS_FILTER_OPTIONS: { value: ProductionAreaStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: PRODUCTION_AREA_STATUS_LABEL.active },
  { value: 'archived', label: PRODUCTION_AREA_STATUS_LABEL.archived },
];