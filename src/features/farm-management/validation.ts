import type { FarmRegistrationFormErrors, FarmRegistrationFormValues } from './types';

// Chấp nhận số điện thoại VN dạng 0xxxxxxxxx hoặc +84xxxxxxxxx (9-10 số sau đầu số).
const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

export const MAX_EVIDENCE_FILES = 5;
export const MAX_EVIDENCE_FILE_SIZE_MB = 10;
export const ACCEPTED_EVIDENCE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.zip'];

function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EVIDENCE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function validateFarmRegistrationForm(values: FarmRegistrationFormValues): FarmRegistrationFormErrors {
  const errors: FarmRegistrationFormErrors = {};

  const name = values.proposedFarmName.trim();
  if (!name) {
    errors.proposedFarmName = 'Vui lòng nhập tên trang trại dự kiến.';
  } else if (name.length < 3) {
    errors.proposedFarmName = 'Tên trang trại phải có ít nhất 3 ký tự.';
  } else if (name.length > 200) {
    errors.proposedFarmName = 'Tên trang trại không vượt quá 200 ký tự.';
  }

  const address = values.address.trim();
  if (!address) {
    errors.address = 'Vui lòng nhập địa chỉ trang trại.';
  } else if (address.length < 5) {
    errors.address = 'Địa chỉ quá ngắn, vui lòng nhập chi tiết hơn.';
  }

  const phone = values.contactPhone.trim().replace(/[\s.-]/g, '');
  if (!phone) {
    errors.contactPhone = 'Vui lòng nhập số điện thoại liên hệ.';
  } else if (!PHONE_REGEX.test(phone)) {
    errors.contactPhone = 'Số điện thoại không hợp lệ (ví dụ: 0912345678).';
  }

  if (values.description.trim().length > 2000) {
    errors.description = 'Mô tả không vượt quá 2000 ký tự.';
  }

  if (values.evidenceFiles.length === 0) {
    errors.evidenceFiles = 'Vui lòng đính kèm ít nhất 1 tài liệu minh chứng (hình ảnh, PDF hoặc tệp .zip).';
  } else if (values.evidenceFiles.length > MAX_EVIDENCE_FILES) {
    errors.evidenceFiles = `Chỉ được đính kèm tối đa ${MAX_EVIDENCE_FILES} tệp.`;
  } else {
    const invalidTypeFile = values.evidenceFiles.find((file) => !hasAcceptedExtension(file.name));
    const oversizedFile = values.evidenceFiles.find(
      (file) => file.size > MAX_EVIDENCE_FILE_SIZE_MB * 1024 * 1024,
    );

    if (invalidTypeFile) {
      errors.evidenceFiles = `Định dạng không được hỗ trợ: "${invalidTypeFile.name}". Chỉ chấp nhận ${ACCEPTED_EVIDENCE_EXTENSIONS.join(', ')}.`;
    } else if (oversizedFile) {
      errors.evidenceFiles = `Tệp "${oversizedFile.name}" vượt quá dung lượng tối đa ${MAX_EVIDENCE_FILE_SIZE_MB}MB.`;
    }
  }

  return errors;
}

export function hasFormErrors(errors: FarmRegistrationFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}