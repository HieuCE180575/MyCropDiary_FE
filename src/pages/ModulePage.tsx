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

  const displayName = user?.fullName?.trim() || user?.email || 'Người dùng VietGAP';
  const roleName = user?.systemRole === 'ADMIN' ? 'Quản trị viên' : 'Người dùng';

  return (
    <section className={module.key === 'profile' ? 'profile-page-section' : ''}>
      <div className="page-heading">
        <div>
          <h1>{module.key === 'profile' ? `Xin chào, ${user?.fullName?.trim() || user?.email || 'bạn'}!` : module.title}</h1>
          <p className="module-description">{module.description}</p>
        </div>
      </div>
      {module.key === 'profile' ? (
        <div className="profile-container">
          {/* Profile Hero Card */}
          <div className="profile-hero-card">
            <div className="profile-hero-avatar-wrap">
              <span className="profile-hero-avatar">
                <Icon name="user" />
              </span>
              <span className="profile-hero-status-dot" title="Tài khoản trực tuyến"></span>
            </div>
            <div className="profile-hero-info">
              <div className="profile-hero-badges">
                <span className="profile-tag-pill">
                  <Icon name="leaf" /> Hồ sơ cá nhân
                </span>
                <span className="profile-role-pill">
                  {user?.systemRole === 'ADMIN' ? 'Quản trị viên hệ thống' : 'Nông dân VietGAP'}
                </span>
              </div>
              <h2 className="profile-hero-name">{displayName}</h2>
              <p className="profile-hero-email">
                <Icon name="mail" /> {user?.email || 'Chưa cập nhật email'}
              </p>
            </div>
            <div className="profile-hero-meta">
              <div className="profile-meta-stat">
                <span className="meta-label">Mã tài khoản</span>
                <span className="meta-value">#{user?.userId || 'USR-01'}</span>
              </div>
              <div className="profile-meta-stat">
                <span className="meta-label">Bảo mật</span>
                <span className="meta-value meta-secure">Đã bảo vệ</span>
              </div>
            </div>
          </div>

          <div className="profile-layout">
            <section className="panel profile-details" aria-label="Thông tin cá nhân">
              <div className="profile-card-header">
                <span className="shortcut-icon"><Icon name="user" /></span>
                <div>
                  <h2>Thông tin tài khoản</h2>
                  <p className="profile-section-sub">Thông tin định danh và tài khoản đăng nhập của bạn</p>
                </div>
              </div>
              <dl>
                <dt>Họ và tên</dt>
                <dd>{user?.fullName || 'Chưa cập nhật'}</dd>
                <dt>Email</dt>
                <dd>{user?.email || 'Chưa cập nhật'}</dd>
                <dt>Vai trò hệ thống</dt>
                <dd>{roleName}</dd>
                <dt>Trạng thái</dt>
                <dd><span className="status-badge status-badge--success">Đang hoạt động</span></dd>
                <dt>Hệ thống</dt>
                <dd>Nông nghiệp số VietGAP 2026</dd>
              </dl>
              <p className="module-description">Chức năng chỉnh sửa hồ sơ đang được phát triển.</p>
            </section>
            <ChangePasswordPanel />
          </div>
        </div>
      ) : module.key === 'farm' && selectedFarm ? (
        <section className="panel profile-details" aria-label="Trang trại đang chọn">
          <h2>{selectedFarm.farmName}</h2>
          <dl>
            <dt>Mã trang trại</dt>
            <dd>{selectedFarm.farmCode}</dd>
            <dt>Địa điểm</dt>
            <dd>{[selectedFarm.district, selectedFarm.province].filter(Boolean).join(', ') || 'Chưa cập nhật'}</dd>
            <dt>Diện tích</dt>
            <dd>{selectedFarm.totalAreaM2 == null ? 'Chưa cập nhật' : `${selectedFarm.totalAreaM2.toLocaleString('vi-VN')} m²`}</dd>
            <dt>Vai trò của bạn</dt>
            <dd>{farmRole(selectedFarm) === 'OWNER' ? 'Chủ trang trại' : 'Nhân viên trang trại'}</dd>
          </dl>
          {farmRole(selectedFarm) === 'OWNER' && <p className="module-description">Chức năng chỉnh sửa thông tin trang trại đang được phát triển.</p>}
        </section>
      ) : (
        <div className="panel empty-state">
          <span className="shortcut-icon"><Icon name={module.icon} /></span>
          <h2>Chức năng đang được phát triển</h2>
          <p>Chức năng này chưa sẵn sàng để sử dụng.</p>
          <Link className="action-button" to="/dashboard">Về tổng quan</Link>
        </div>
      )}
    </section>
  );
}
