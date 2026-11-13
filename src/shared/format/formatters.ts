import type { Language } from '../i18n/translations';

export const localeFor = (language: Language) => language === 'en' ? 'en-US' : 'vi-VN';

export function formatNumber(value: number | string | null | undefined, language: Language = 'vi', options?: Intl.NumberFormatOptions) {
  const number = value == null || value === '' ? NaN : Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat(localeFor(language), options).format(number) : '—';
}

export function formatCurrency(value: number | string | null | undefined, language: Language = 'vi') {
  return formatNumber(value, language, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
}

export function formatDate(value: string | number | Date | null | undefined, language: Language = 'vi', options?: Intl.DateTimeFormatOptions) {
  if (value == null || value === '') return '—';
  // Parse date-only values locally so a calendar date cannot move to the previous day.
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(localeFor(language), options).format(date);
}

export function formatDateTime(value: string | number | Date | null | undefined, language: Language = 'vi', options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (value == null || value === '') return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(localeFor(language), options).format(date);
}
