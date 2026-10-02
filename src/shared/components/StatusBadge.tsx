export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
}

/** Nhãn trạng thái dùng lại cho đăng ký, checklist, đơn hàng... */
export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}
