import { useLanguage } from '../i18n/LanguageContext';
import type { HTMLAttributes, ReactNode } from 'react';
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  label: ReactNode;
  tone?: BadgeTone;
}

/** Nhãn trạng thái dùng lại cho đăng ký, checklist, đơn hàng... */
export function StatusBadge({ label, tone = 'neutral', className = '', ...props }: StatusBadgeProps) {
  const { t: translate } = useLanguage();
  return <span {...props} className={`status-badge status-badge--${tone} ${className}`}>{typeof label === 'string' ? translate(label) : label}</span>;
}
