import type { BadgeTone } from '../../shared/components/StatusBadge';
import type { PlotAreaUnit, PlotStatus } from './types';

export const PLOT_PAGE_SIZE = 5;

export const PLOT_STATUS_LABEL: Record<PlotStatus, string> = {
  active: 'Đang sử dụng',
  inactive: 'Ngừng sử dụng',
  archived: 'Đã lưu trữ',
};

export const PLOT_STATUS_TONE: Record<PlotStatus, BadgeTone> = {
  active: 'success',
  inactive: 'warning',
  archived: 'neutral',
};

/** Tuỳ chọn trạng thái cho bộ lọc danh sách (bao gồm "Tất cả"). */
export const PLOT_STATUS_FILTER_OPTIONS: { value: PlotStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: PLOT_STATUS_LABEL.active },
  { value: 'inactive', label: PLOT_STATUS_LABEL.inactive },
  { value: 'archived', label: PLOT_STATUS_LABEL.archived },
];

/** Tuỳ chọn trạng thái khi tạo/sửa — không cho chọn "archived" trực tiếp, phải dùng nút Lưu trữ. */
export const PLOT_FORM_STATUS_OPTIONS: { value: Exclude<PlotStatus, 'archived'>; label: string }[] = [
  { value: 'active', label: PLOT_STATUS_LABEL.active },
  { value: 'inactive', label: PLOT_STATUS_LABEL.inactive },
];

export const PLOT_AREA_UNIT_OPTIONS: { value: PlotAreaUnit; label: string }[] = [
  { value: 'ha', label: 'ha' },
  { value: 'm2', label: 'm²' },
];

export const MAX_PLOT_COVER_IMAGE_SIZE_MB = 5;
export const ACCEPTED_PLOT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
