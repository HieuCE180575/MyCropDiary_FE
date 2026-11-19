import { Icon } from './Icon';
import { Children, isValidElement, type ButtonHTMLAttributes, type ReactNode } from 'react';


interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'compact';
  loading?: boolean;
}

export function Button({ variant = 'secondary', size = 'default', loading = false, disabled, className = '', children, type = 'button', ...props }: ButtonProps) {
  const hasIcon = (nodes: ReactNode): boolean => Children.toArray(nodes).some(node =>
    isValidElement<{ children?: ReactNode }>(node) &&
    (node.type === Icon || node.type === 'svg' || hasIcon(node.props.children))
  );
  const showEditIcon = className.split(/\s+/).includes('ui-edit-action') && !hasIcon(children);
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}>
    {loading && <Icon name="loader" className="icon-spin" />}
    {showEditIcon && <Icon name="edit" size={16} />}{children}
  </button>;
}
