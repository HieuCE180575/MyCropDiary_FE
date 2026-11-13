import { Button } from './Button';
import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { lang, t } = useLanguage();
  return <div role="alert" className="form-error-banner">
    <p>{t(message)}</p>
    <Button onClick={onRetry} size="compact"><Icon name="refresh" />{lang === 'en' ? 'Retry' : 'Thử lại'}</Button>
  </div>;
}
