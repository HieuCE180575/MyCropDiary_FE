import { useLanguage } from '../../shared/i18n/LanguageContext';
import type { ReactNode } from 'react';

export function MaterialUsageFormSection({ number, title, description, children }: {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { t: translate } = useLanguage();
  return <section className={`mu-entry-section mu-entry-section-${number}`} aria-labelledby={`mu-entry-section-${number}`}>
    <div className="mu-entry-section-heading">
      <span className="mu-entry-step" aria-hidden="true">{number}</span>
      <h3 id={`mu-entry-section-${number}`}>{translate(title)}</h3>
      <p>{translate(description)}</p>
    </div>
    {children}
  </section>;
}
