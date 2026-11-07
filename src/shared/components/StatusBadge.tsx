import { useLanguage } from '../i18n/LanguageContext';
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

/** Nhãn trạng thái dùng lại cho đăng ký, checklist, đơn hàng... */
export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const { t: translate } = useLanguage();
  return <span className={`status-badge status-badge--${tone}`}>{translate(label)}</span>;
}
