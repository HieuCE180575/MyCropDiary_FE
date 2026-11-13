import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import type { HTMLAttributes, ReactNode } from 'react';


interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

/**
 * Trạng thái rỗng dùng lại ở nhiều module (không có dữ liệu, không có kết quả tìm kiếm...).
 */
export function EmptyState({ icon = 'search', title, description, action, className = '', ...props }: EmptyStateProps) {
  const { t: translate } = useLanguage();
  return (
    <div {...props} className={`empty-state ${className}`}>
      <div className="empty-icon">{typeof icon === 'string' ? <Icon name={icon} /> : icon}</div>
      <h2>{typeof title === 'string' ? translate(title) : title}</h2>
      {description ? <p>{typeof description === 'string' ? translate(description) : description}</p> : null}
      {action}
    </div>
  );
}
