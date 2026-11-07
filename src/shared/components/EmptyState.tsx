import { useLanguage } from '../i18n/LanguageContext';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Trạng thái rỗng dùng lại ở nhiều module (không có dữ liệu, không có kết quả tìm kiếm...).
 */
export function EmptyState({ icon = '◫', title, description, action }: EmptyStateProps) {
  const { t: translate } = useLanguage();
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{translate(title)}</h2>
      {description ? <p>{translate(description)}</p> : null}
      {action}
    </div>
  );
}
