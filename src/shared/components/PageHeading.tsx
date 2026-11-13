import type { HTMLAttributes, ReactNode } from 'react';

export function PageHeading({ title, description, leading, children, level = 1, className = '', ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title: ReactNode; description?: ReactNode; leading?: ReactNode; children?: ReactNode; level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return <div {...props} className={`ui-page-heading${level === 2 ? ' ui-page-heading--section' : ''} ${className}`}>
    <div>{leading}<Heading>{title}</Heading>{description && <p>{description}</p>}</div>
    {children && <div className="ui-page-heading-actions">{children}</div>}
  </div>;
}
