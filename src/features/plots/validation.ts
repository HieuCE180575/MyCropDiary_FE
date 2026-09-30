import { ACCEPTED_PLOT_IMAGE_EXTENSIONS, MAX_PLOT_COVER_IMAGE_SIZE_MB } from './constants';
import type { PlotAreaUnit, PlotFormErrors, PlotFormValues } from './types';

const MAX_AREA_HECTARES = 100000;

export function validatePlotForm(values: PlotFormValues): PlotFormErrors {
  const errors: PlotFormErrors = {};

  const name = values.plotName.trim();
  if (!name) {
    errors.plotName = 'Vui lòng nhập tên lô đất.';
  } else if (name.length < 2) {
    errors.plotName = 'Tên lô đất quá ngắn.';
  } else if (name.length > 150) {
    errors.plotName = 'Tên lô đất không vượt quá 150 ký tự.';
  }

  const areaRaw = values.areaValue.trim().replace(',', '.');
  if (!areaRaw) {
    errors.areaValue = 'Vui lòng nhập diện tích.';
  } else {
    const areaNumber = Number(areaRaw);
    if (Number.isNaN(areaNumber) || areaNumber <= 0) {
      errors.areaValue = 'Diện tích phải là một số lớn hơn 0.';
    } else if (parseAreaToHectares(areaRaw, values.areaUnit) > MAX_AREA_HECTARES) {
      errors.areaValue = 'Diện tích có vẻ không hợp lý, vui lòng kiểm tra lại.';
    }
  }

  const location = values.locationDescription.trim();
  if (!location) {
    errors.locationDescription = 'Vui lòng nhập vị trí / địa chỉ lô đất.';
  } else if (location.length < 3) {
    errors.locationDescription = 'Vị trí quá ngắn, vui lòng nhập chi tiết hơn.';
  }

  if (values.soilType.trim().length > 100) {
    errors.soilType = 'Loại đất không vượt quá 100 ký tự.';
  }

  if (values.notes.trim().length > 1000) {
    errors.notes = 'Ghi chú không vượt quá 1000 ký tự.';
  }

  if (values.coverImage) {
    const lowerName = values.coverImage.name.toLowerCase();
    const hasValidExtension = ACCEPTED_PLOT_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExtension) {
      errors.coverImage = `Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận ${ACCEPTED_PLOT_IMAGE_EXTENSIONS.join(', ')}.`;
    } else if (values.coverImage.size > MAX_PLOT_COVER_IMAGE_SIZE_MB * 1024 * 1024) {
      errors.coverImage = `Ảnh vượt quá dung lượng tối đa ${MAX_PLOT_COVER_IMAGE_SIZE_MB}MB.`;
    }
  }

  return errors;
}

export function hasPlotFormErrors(errors: PlotFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/** Quy đổi diện tích nhập vào (ha hoặc m²) về hecta để lưu trữ thống nhất (khớp cột AreaHectares). */
export function parseAreaToHectares(areaValue: string, unit: PlotAreaUnit): number {
  const num = Number(areaValue.trim().replace(',', '.'));
  if (Number.isNaN(num)) return 0;
  return unit === 'm2' ? num / 10000 : num;
}
