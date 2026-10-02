import type {
  AssignStaffFormErrors,
  AssignStaffFormValues,
  ProductionAreaFormErrors,
  ProductionAreaFormValues,
} from './types';

const MAX_AREA_HECTARES = 100000;

export function validateProductionAreaForm(values: ProductionAreaFormValues): ProductionAreaFormErrors {
  const errors: ProductionAreaFormErrors = {};

  const name = values.areaName.trim();
  if (!name) {
    errors.areaName = 'Vui lòng nhập tên khu sản xuất.';
  } else if (name.length < 2) {
    errors.areaName = 'Tên khu sản xuất quá ngắn.';
  } else if (name.length > 150) {
    errors.areaName = 'Tên khu sản xuất không vượt quá 150 ký tự.';
  }

  const areaRaw = values.areaHectares.trim().replace(',', '.');
  if (!areaRaw) {
    errors.areaHectares = 'Vui lòng nhập diện tích.';
  } else {
    const areaNumber = Number(areaRaw);
    if (Number.isNaN(areaNumber) || areaNumber <= 0) {
      errors.areaHectares = 'Diện tích phải là một số lớn hơn 0.';
    } else if (areaNumber > MAX_AREA_HECTARES) {
      errors.areaHectares = 'Diện tích có vẻ không hợp lý, vui lòng kiểm tra lại.';
    }
  }

  if (values.locationDescription.trim().length > 1000) {
    errors.locationDescription = 'Mô tả vị trí không vượt quá 1000 ký tự.';
  }

  return errors;
}

export function hasProductionAreaFormErrors(errors: ProductionAreaFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function validateAssignStaffForm(values: AssignStaffFormValues): AssignStaffFormErrors {
  const errors: AssignStaffFormErrors = {};

  if (!values.farmMemberId) {
    errors.farmMemberId = 'Vui lòng chọn nhân viên cần phân công.';
  }

  const startsAt = values.startsAt.trim();
  if (!startsAt) {
    errors.startsAt = 'Vui lòng chọn ngày bắt đầu.';
  } else if (!isValidDateString(startsAt)) {
    errors.startsAt = 'Ngày bắt đầu không hợp lệ.';
  }

  if (values.notes.trim().length > 500) {
    errors.notes = 'Ghi chú không vượt quá 500 ký tự.';
  }

  return errors;
}

export function hasAssignStaffFormErrors(errors: AssignStaffFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}