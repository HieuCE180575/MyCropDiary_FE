import type { FarmRegistrationFormErrors, FarmRegistrationFormValues } from './types';

export function validateFarmRegistrationForm(values: FarmRegistrationFormValues): FarmRegistrationFormErrors {
  const errors: FarmRegistrationFormErrors = {};

  const name = values.proposedFarmName.trim();
  if (!name) {
    errors.proposedFarmName = 'Vui lòng nhập tên trang trại dự kiến.';
  } else if (name.length < 3) {
    errors.proposedFarmName = 'Tên trang trại phải có ít nhất 3 ký tự.';
  } else if (name.length > 160) {
    errors.proposedFarmName = 'Tên trang trại không vượt quá 160 ký tự.';
  }

  const address = values.address.trim();
  if (!address) {
    errors.address = 'Vui lòng nhập địa chỉ trang trại.';
  } else if (address.length < 5) {
    errors.address = 'Địa chỉ quá ngắn, vui lòng nhập chi tiết hơn.';
  }

  if (address.length > 300) errors.address = 'Địa chỉ không vượt quá 300 ký tự.';
  if (values.description.trim().length > 1000) errors.description = 'Mô tả không vượt quá 1000 ký tự.';
  for (const field of ['province', 'district', 'ward'] as const) {
    if ((values[field]?.trim().length ?? 0) > 100) errors[field] = 'Không vượt quá 100 ký tự.';
  }
  const documentUrl = values.documentUrl?.trim();
  if (documentUrl) {
    try {
      const url = new URL(documentUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      errors.documentUrl = 'Vui lòng nhập đường dẫn bắt đầu bằng http:// hoặc https://.';
    }
    if (documentUrl.length > 1000) errors.documentUrl = 'Đường dẫn tài liệu không vượt quá 1000 ký tự.';
  }
  return errors;
}

export function hasFormErrors(errors: FarmRegistrationFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
