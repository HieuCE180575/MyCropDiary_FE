import { formatDateTime } from '../../shared/format/formatters';
import type { Language } from '../../shared/i18n/translations';

// Calendar arithmetic keeps the entered local wall-clock time and does not convert it to UTC.
export function isolationEnd(usedAt: string, days: number | '' | null | undefined, lang: Language = 'vi'): string {
  if (days === '' || days == null || !Number.isInteger(days) || days < 0) return '';
  const match = usedAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return '';
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, 0, 0);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59) return '';
  date.setUTCDate(date.getUTCDate() + days);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() > 9999) return '';
  if (lang === 'en') {
    const local = new Date(0);
    local.setFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    local.setHours(hour, minute, 0, 0);
    return formatDateTime(local, lang);
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${String(date.getUTCFullYear()).padStart(4, '0')} ${pad(hour)}:${pad(minute)}`;
}
