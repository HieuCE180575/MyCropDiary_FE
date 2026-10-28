import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { Icon } from '../../shared/components/Icon';
import { moduleDefinitions } from '../routes/moduleDefinitions';
import { canAccessModule, farmRole } from '../../features/auth/accessPolicy';
import { FarmWorkspaceProvider, useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';
import { AdminProvider, AdminNotice } from '../../features/admin/AdminProvider';
import { PublicFooter } from '../../shared/components/PublicFooter';

export function AppLayout() {
  const { user } = useAuth();
  const isAdmin = user?.systemRole?.toUpperCase() === 'ADMIN';
  return (
    <FarmWorkspaceProvider key={user?.userId}>
      {isAdmin ? (
        <AdminProvider>
          <WorkspaceLayout />
        </AdminProvider>
      ) : (
        <WorkspaceLayout />
      )}
    </FarmWorkspaceProvider>
  );
}

const adminRouteMeta: Record<string, { title: string; subtitle: string }> = {
  '/admin': {
    title: 'Tổng quan Quản trị',
    subtitle: 'Theo dõi toàn diện vận hành hệ thống & nông trại MyCropDiary hôm nay',
  },
  '/admin/registrations': {
    title: 'Duyệt đăng ký trang trại',
    subtitle: 'Xem xét và phê duyệt hồ sơ tham gia hệ thống của các chủ hộ & hợp tác xã',
  },
  '/admin/users': {
    title: 'Quản lý tài khoản',
    subtitle: 'Quản lý người dùng, phân quyền truy cập và bảo mật tài khoản',
  },
  '/admin/crops': {
    title: 'Danh mục cây trồng',
    subtitle: 'Tiêu chuẩn hóa danh mục cây trồng và thông tin thời vụ VietGAP',
  },
  '/admin/rules': {
    title: 'Quy tắc bảng kiểm',
    subtitle: 'Cấu hình tiêu chí kiểm tra, mức độ bắt buộc và trường dữ liệu VietGAP',
  },
  '/admin/articles': {
    title: 'Bài viết kiến thức',
    subtitle: 'Biên soạn, kiểm duyệt và phát hành cẩm nang canh tác kỹ thuật số',
  },
  '/admin/feedback': {
    title: 'Phản hồi AI',
    subtitle: 'Tổng hợp đánh giá của người dùng để nâng cao chất lượng câu trả lời AI',
  },
  '/admin/statistics': {
    title: 'Thống kê hệ thống',
    subtitle: 'Báo cáo trực quan về người dùng, mùa vụ, chi phí và chất lượng hồ sơ',
  },
  '/admin/audit': {
    title: 'Nhật ký quản trị',
    subtitle: 'Ghi nhận và truy vết toàn bộ thao tác thay đổi dữ liệu trên hệ thống',
  },
};

function getInitialTheme(): 'light' | 'dark' {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
      const saved = window.localStorage.getItem('mcd_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
  } catch {
    // Ignore storage errors in restricted/test environments
  }
  return 'light';
}

function WorkspaceLayout() {
  const { signOut, user } = useAuth();
  const { farms, selectedFarm, selectFarm } = useFarmWorkspace();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
        document.body?.classList.toggle('dark-theme', theme === 'dark');
      }
      if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
        window.localStorage.setItem('mcd_theme', theme);
      }
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  const isZoneRoute = /^\/zones(?:\/|$)/.test(pathname);
  const navigation = moduleDefinitions.filter((module) => canAccessModule(module, user?.systemRole, selectedFarm));
  const displayName = user?.fullName?.trim() || user?.email || 'Quản trị viên';
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isAdmin = user?.systemRole?.toUpperCase() === 'ADMIN';
  const currentFarmRole = farmRole(selectedFarm);
  const activeRoleKey = isAdmin ? 'ADMIN' : currentFarmRole === 'OWNER' ? 'OWNER' : currentFarmRole === 'STAFF' ? 'STAFF' : 'USER';
  const currentAdminMeta = adminRouteMeta[pathname] || {
    title: 'Quản trị MyCropDiary',
    subtitle: 'Bảng điều khiển và quản lý nghiệp vụ nông nghiệp VietGAP',
  };

  return (
    <div className={`app-shell${isAdmin ? ' admin-shell' : ''}${sidebarOpen ? '' : ' sidebar-collapsed'} ${theme === 'dark' ? 'dark' : 'light'}`}>
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="MyCropDiary" title="Về trang chủ">
          <span className="brand-icon-box">
            <Icon name="leaf" />
          </span>
          <span className="brand-text-box" hidden={!sidebarOpen}>
            <strong hidden={!sidebarOpen}>MyCropDiary</strong>
            <span className="brand-admin-tag">
              {activeRoleKey === 'ADMIN'
                ? 'Admin'
                : activeRoleKey === 'OWNER'
                  ? 'Chủ trang trại'
                  : activeRoleKey === 'STAFF'
                    ? 'Kỹ thuật viên'
                    : 'Cá nhân'}
            </span>
          </span>
        </Link>
        <button
          className="sidebar-toggle sidebar-collapse-btn"
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-controls="workspace-sidebar"
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
          title={sidebarOpen ? 'Thu gọn thanh điều hướng' : 'Hiện thanh điều hướng'}
        >
          <Icon name={sidebarOpen ? 'chevron-left' : 'chevron-right'} />
          {sidebarOpen && <span>Thu gọn</span>}
        </button>

        <div className="sidebar-content" id="workspace-sidebar" hidden={!sidebarOpen}>
          {sidebarOpen && (
            <div className="sidebar-role-indicator">
              <span className={`badge-role ${activeRoleKey.toLowerCase()}`}>
                {activeRoleKey === 'ADMIN'
                  ? 'Quản trị viên'
                  : activeRoleKey === 'OWNER'
                    ? 'Chủ trang trại'
                    : activeRoleKey === 'STAFF'
                      ? 'Nhân viên kỹ thuật'
                      : 'Người dùng cá nhân'}
              </span>
            </div>
          )}
          {sidebarOpen && <p className="sidebar-nav-caption">MENU</p>}
          <nav className="nav-list" aria-label="Điều hướng chính">
            <NavLink to={isAdmin ? '/admin' : '/dashboard'} end title={!sidebarOpen ? 'Tổng quan' : undefined}>
              <Icon name="home" />
              {sidebarOpen && <span>Tổng quan</span>}
            </NavLink>
            {navigation
              .filter((module) => module.group !== 'account' && (!isAdmin || (module.group === 'admin' && module.key !== 'admin')))
              .map((module) => (
                <NavLink
                  key={module.key}
                  to={module.key === 'production' && isZoneRoute ? '/zones' : '/' + module.path}
                  title={!sidebarOpen ? module.title : undefined}
                >
                  <Icon name={module.icon} />
                  {sidebarOpen && <span>{module.title}</span>}
                </NavLink>
              ))}
            <div className="nav-divider" />
            {navigation
              .filter((module) => module.group === 'account' && module.key !== 'password')
              .map((module) => (
                <NavLink
                  key={module.key}
                  to={'/' + module.path}
                  title={!sidebarOpen ? (module.key === 'profile' ? 'Hồ sơ' : module.title) : undefined}
                >
                  <Icon name={module.icon} />
                  {sidebarOpen && <span>{module.key === 'profile' ? 'Hồ sơ' : module.title}</span>}
                </NavLink>
              ))}
            <button className="sidebar-logout" type="button" onClick={signOut} title={!sidebarOpen ? 'Đăng xuất' : undefined}>
              <Icon name="logout" />
              {sidebarOpen && <span>Đăng xuất</span>}
            </button>
          </nav>
          {sidebarOpen && user?.systemRole?.toUpperCase() === 'USER' && !selectedFarm && (
            <div className="season-card">
              <strong><Icon name="leaf" />Trang trại của bạn</strong>
              <p>Gửi yêu cầu đăng ký và theo dõi kết quả xét duyệt.</p>
              <Link to="/farm-registration">
                Đăng ký trang trại <Icon name="arrow" />
              </Link>
            </div>
          )}
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            {isAdmin && pathname.startsWith('/admin') ? (
              <div className="admin-header-titles">
                <h1 className="admin-header-title">{currentAdminMeta.title}</h1>
                <p className="admin-header-subtitle">{currentAdminMeta.subtitle}</p>
              </div>
            ) : farms.length > 0 ? (
              <label className="workspace-switcher">
                <span>Không gian</span>
                <select
                  aria-label="Chọn không gian làm việc"
                  value={selectedFarm?.id ?? ''}
                  onChange={(event) => {
                    selectFarm(event.target.value ? Number(event.target.value) : null);
                    navigate('/dashboard');
                  }}
                >
                  <option value="">Cá nhân</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.farmName} · {farmRole(farm) === 'OWNER' ? 'Chủ trang trại' : 'Nhân viên'}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="workspace-label">
                {isAdmin ? 'Quản trị hệ thống' : 'Không gian cá nhân'}
              </span>
            )}
          </div>

          <div className="topbar-actions">
            {/* Dark / Light Mode Switch */}
            <button
              type="button"
              className={`theme-toggle-switch ${theme}`}
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
              title={theme === 'light' ? 'Chuyển sang nền tối' : 'Chuyển sang nền sáng'}
            >
              <span className="theme-toggle-track">
                <span className="theme-icon sun"><Icon name="sun" /></span>
                <span className="theme-icon moon"><Icon name="moon" /></span>
                <span className="theme-toggle-thumb" />
              </span>
            </button>

            {/* Notifications */}
            <div className="notification-wrap">
              <button
                className="icon-button notification-btn"
                aria-label="Thông báo"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Icon name="bell" />
                <span className="notification-dot" />
              </button>
              {notificationsOpen && (
                <div className="notification-popover" role="status">
                  <strong>Thông báo hệ thống</strong>
                  <p>Hệ thống hoạt động ổn định. Chưa có thông báo mới.</p>
                </div>
              )}
            </div>

            {/* Profile Avatar / Menu */}
            <div className="account-menu">
              <Link className="account-profile" to="/profile" title="Xem hồ sơ cá nhân" aria-label="Hồ sơ cá nhân">
                <span className="avatar">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <div className="account-profile-info">
                  <strong title={displayName}>{displayName}</strong>
                  <small className="account-sub-label">
                    {isAdmin
                      ? 'Admin'
                      : currentFarmRole === 'OWNER'
                        ? 'Chủ trang trại'
                        : currentFarmRole === 'STAFF'
                          ? 'Kỹ thuật viên'
                          : 'Cá nhân'}
                  </small>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="page-content">
          {isAdmin && pathname.startsWith('/admin') && <AdminNotice />}
          <Outlet />
        </main>
        {!isAdmin && <PublicFooter />}
      </div>
    </div>
  );
}
