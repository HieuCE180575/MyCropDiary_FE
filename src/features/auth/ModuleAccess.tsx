import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ModuleDefinition } from '../../shared/types/module';
import { useAuth } from './AuthProvider';
import { canAccessModule } from './accessPolicy';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';

export function ModuleAccess({ module, children }: { module: ModuleDefinition; children: ReactNode }) {
  const { user } = useAuth();
  const { selectedFarm, loading, error, retry } = useFarmWorkspace();
  const farmModule = module.access === 'farm' || module.access === 'owner';
  if (farmModule && loading) return <p role="status">Đang kiểm tra quyền truy cập trang trại…</p>;
  if (farmModule && error) return <section className="panel"><h1>Chưa xác minh được quyền trang trại</h1><p role="alert">{error}</p><button className="action-button" onClick={retry}>Thử lại</button></section>;
  if (!canAccessModule(module, user?.systemRole, selectedFarm)) return <section className="panel access-notice"><h1>Chức năng chưa khả dụng trong không gian này</h1><p>{farmModule ? 'Hãy chọn trang trại mà bạn là thành viên đang hoạt động. Một số chức năng chỉ dành cho chủ trang trại.' : 'Tài khoản của bạn không có quyền sử dụng chức năng này.'}</p><Link className="action-button solid" to="/dashboard">Về tổng quan</Link></section>;
  return children;
}
