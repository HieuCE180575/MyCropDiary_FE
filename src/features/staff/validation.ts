import type { StaffFormErrors, StaffFormValues } from './types';

// Chấp nhận số điện thoại VN dạng 0xxxxxxxxx hoặc +84xxxxxxxxx (9-10 số sau đầu số).
const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStaffForm(values: StaffFormValues): StaffFormErrors {
  const errors: StaffFormErrors = {};

  const name = values.fullName.trim();
  if (!name) {
    errors.fullName = 'Vui lòng nhập họ tên nhân viên.';
  } else if (name.length < 2) {
    errors.fullName = 'Họ tên quá ngắn.';
  } else if (name.length > 150) {
    errors.fullName = 'Họ tên không vượt quá 150 ký tự.';
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = 'Vui lòng nhập email của nhân viên.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Email không hợp lệ.';
  } else if (email.length > 254) {
    errors.email = 'Email quá dài.';
  }

  const phone = values.phoneNumber.trim().replace(/[\s.-]/g, '');
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phoneNumber = 'Số điện thoại không hợp lệ (ví dụ: 0912345678).';
  }

  return errors;
}

export function hasStaffFormErrors(errors: StaffFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
