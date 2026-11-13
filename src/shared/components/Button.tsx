import { Icon } from './Icon';
import type { ButtonHTMLAttributes } from 'react';


interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'compact';
  loading?: boolean;
}

export function Button({ variant = 'secondary', size = 'default', loading = false, disabled, className = '', children, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}>
    {loading && <Icon name="loader" className="icon-spin" />}{children}
  </button>;
}
