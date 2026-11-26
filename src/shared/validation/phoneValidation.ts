export function validateVietnamPhone(value: string, lang: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/\D/.test(trimmed)) {
    return lang === 'en'
      ? 'Phone number must contain digits only (no letters or special characters).'
      : 'Số điện thoại chỉ được chứa chữ số (không được nhập chữ cái hoặc ký tự đặc biệt).';
  }
  if (!trimmed.startsWith('0')) {
    return lang === 'en'
      ? 'Phone number must start with 0.'
      : 'Số điện thoại phải bắt đầu bằng số 0.';
  }
  if (trimmed.length !== 10) {
    return lang === 'en'
      ? 'Phone number must be exactly 10 digits.'
      : 'Số điện thoại phải gồm đúng 10 chữ số.';
  }
  return null;
}
