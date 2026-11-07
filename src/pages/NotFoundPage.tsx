import { useLanguage } from '../shared/i18n/LanguageContext';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  const { lang } = useLanguage();
  return <main className="auth-page"><div className="auth-card"><h1>404</h1><p>{(lang === 'en' ? "Page not found." : "Không tìm thấy trang.")}</p><Link to="/dashboard">{(lang === 'en' ? "Back to dashboard" : "Về tổng quan")}</Link></div></main>;
}
