import type { ModuleDefinition } from '../shared/types/module';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { useFarmWorkspace } from '../features/farm-management/FarmWorkspace';
import { farmRole } from '../features/auth/accessPolicy';
import { Icon } from '../shared/components/Icon';
import { ChangePasswordPanel } from '../features/auth/ChangePasswordPanel';

export function ModulePage({ module }: { module: ModuleDefinition }) {
  const { user } = useAuth();
  const { selectedFarm } = useFarmWorkspace();
  if (module.key === 'password') return <Navigate to="/profile#change-password" replace />;
  return (
    <section>
      <div className="page-heading">
        <div><h1>{module.key === 'profile' ? `Xin chào, ${user?.fullName?.trim() || user?.email || 'bạn'}!` : module.title}</h1><p className="module-description">{module.description}</p></div>
      </div>
      {module.key === 'profile' ? <div className="profile-layout"><section className="panel profile-details" aria-label="Thông tin cá nhân">
        <span className="shortcut-icon"><Icon name="user" /></span>
        <h2>Thông tin tài khoản</h2><dl><dt>Họ và tên</dt><dd>{user?.fullName || 'Chưa cập nhật'}</dd><dt>Email</dt><dd>{user?.email || 'Chưa cập nhật'}</dd><dt>Vai trò hệ thống</dt><dd>{user?.systemRole === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}</dd></dl>
        <p className="module-description">Chức năng chỉnh sửa hồ sơ đang được phát triển.</p>
      </section><ChangePasswordPanel /></div> : module.key === 'farm' && selectedFarm ? <section className="panel profile-details" aria-label="Trang trại đang chọn">
        <h2>{selectedFarm.farmName}</h2><dl><dt>Mã trang trại</dt><dd>{selectedFarm.farmCode}</dd><dt>Địa điểm</dt><dd>{[selectedFarm.district, selectedFarm.province].filter(Boolean).join(', ') || 'Chưa cập nhật'}</dd><dt>Diện tích</dt><dd>{selectedFarm.totalAreaM2 == null ? 'Chưa cập nhật' : `${selectedFarm.totalAreaM2.toLocaleString('vi-VN')} m²`}</dd><dt>Vai trò của bạn</dt><dd>{farmRole(selectedFarm) === 'OWNER' ? 'Chủ trang trại' : 'Nhân viên trang trại'}</dd></dl>
        {farmRole(selectedFarm) === 'OWNER' && <p className="module-description">Chức năng chỉnh sửa thông tin trang trại đang được phát triển.</p>}
      </section> : <div className="panel empty-state">
        <span className="shortcut-icon"><Icon name={module.icon} /></span>
        <h2>Chức năng đang được phát triển</h2>
        <p>Chức năng này chưa sẵn sàng để sử dụng.</p>
        <Link className="action-button" to="/dashboard">Về tổng quan</Link>
      </div>}
    </section>
  );
}
