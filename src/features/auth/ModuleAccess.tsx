import { useLanguage } from '../../shared/i18n/LanguageContext';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ModuleDefinition } from '../../shared/types/module';
import { useAuth } from './AuthProvider';
import { canAccessModule } from './accessPolicy';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';

export function ModuleAccess({ module, children }: { module: ModuleDefinition; children: ReactNode }) {
  const { lang, t: translate } = useLanguage();
  const { user } = useAuth();
  const { selectedFarm, loading, error, retry } = useFarmWorkspace();
  const farmModule = module.access === 'farm' || module.access === 'owner';
  if (farmModule && loading) return <p role="status">{(lang === 'en' ? "Checking farm access…" : "Đang kiểm tra quyền truy cập trang trại…")}</p>;
  if (farmModule && error) return <section className="panel"><h1>{(lang === 'en' ? "Unable to verify farm access" : "Chưa xác minh được quyền trang trại")}</h1><p role="alert">{translate(error)}</p><button className="action-button" onClick={retry}>{(lang === 'en' ? "Retry" : "Thử lại")}</button></section>;
  if (!canAccessModule(module, user?.systemRole, selectedFarm)) return <section className="panel access-notice"><h1>{(lang === 'en' ? "This feature is unavailable in this workspace" : "Chức năng chưa khả dụng trong không gian này")}</h1><p>{(lang === 'en' ? farmModule ? "Select a farm where you are an active member. Some features are available only to farm owners." : "Your account does not have permission to use this feature." : farmModule ? 'Hãy chọn trang trại mà bạn là thành viên đang hoạt động. Một số chức năng chỉ dành cho chủ trang trại.' : 'Tài khoản của bạn không có quyền sử dụng chức năng này.')}</p><Link className="action-button solid" to="/dashboard">{(lang === 'en' ? "Back to dashboard" : "Về tổng quan")}</Link></section>;
  return children;
}
