import { useState } from 'react';
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
  return <FarmWorkspaceProvider key={user?.userId}>{user?.systemRole === 'ADMIN' ? <AdminProvider><WorkspaceLayout /></AdminProvider> : <WorkspaceLayout />}</FarmWorkspaceProvider>;
}

function WorkspaceLayout() {
  const { signOut, user } = useAuth();
  const { farms, selectedFarm, selectFarm } = useFarmWorkspace();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navigation = moduleDefinitions.filter((module) => canAccessModule(module, user?.systemRole, selectedFarm));
  const displayName = user?.fullName?.trim() || user?.email || 'Tài khoản của bạn';
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isAdmin = user?.systemRole === 'ADMIN';
  return <div className={`app-shell${isAdmin ? ' admin-shell' : ''}${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
    <aside className="sidebar">
      <Link className="brand" to="/dashboard" aria-label="MyCropDiary"><Icon name="leaf" /><strong hidden={!sidebarOpen}>MyCropDiary</strong></Link>
      <button className="sidebar-toggle" type="button" onClick={() => setSidebarOpen(open => !open)} aria-controls="workspace-sidebar" aria-expanded={sidebarOpen} aria-label={sidebarOpen ? 'Ẩn thanh điều hướng' : 'Hiện thanh điều hướng'} title={sidebarOpen ? 'Ẩn thanh điều hướng' : 'Hiện thanh điều hướng'}><Icon name="menu" /></button>
      <div className="sidebar-content" id="workspace-sidebar" hidden={!sidebarOpen}>
      {isAdmin && <p className="admin-nav-caption">QUẢN TRỊ HỆ THỐNG</p>}
      <nav className="nav-list" aria-label="Điều hướng chính">
        <NavLink to={isAdmin ? '/admin' : '/dashboard'} end><Icon name="home" />Tổng quan</NavLink>
        {navigation.filter((module) => module.group !== 'account' && (!isAdmin || module.group === 'admin' && module.key !== 'admin')).map((module) => <NavLink key={module.key} to={'/' + module.path}><Icon name={module.icon} />{module.title}</NavLink>)}
        <div className="nav-divider" />
        {navigation.filter((module) => module.group === 'account' && module.key !== 'password').map((module) => <NavLink key={module.key} to={'/' + module.path}><Icon name={module.icon} />{module.key === 'profile' ? 'Hồ sơ' : module.title}</NavLink>)}
        <button className="sidebar-logout" type="button" onClick={signOut}><Icon name="logout" />Đăng xuất</button>
      </nav>
      {user?.systemRole === 'USER' && !selectedFarm && <div className="season-card"><strong><Icon name="leaf" />Trang trại của bạn</strong><p>Gửi yêu cầu đăng ký và theo dõi kết quả xét duyệt.</p><Link to="/farm-registration">Đăng ký trang trại <Icon name="arrow" /></Link></div>}
      </div>
    </aside>
    <div className="main-area">
      <header className="topbar">
        {farms.length > 0 ? <label className="workspace-switcher"><span>Không gian</span><select aria-label="Chọn không gian làm việc" value={selectedFarm?.id ?? ''} onChange={(event) => {
          selectFarm(event.target.value ? Number(event.target.value) : null);
          navigate('/dashboard');
        }}><option value="">Cá nhân</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.farmName} · {farmRole(farm) === 'OWNER' ? 'Chủ trang trại' : 'Nhân viên'}</option>)}</select></label> : <span className="workspace-label">{user?.systemRole === 'ADMIN' ? 'Quản trị hệ thống' : 'Không gian cá nhân'}</span>}
        <div className="topbar-actions">
          <div className="notification-wrap"><button className="icon-button" aria-label="Thông báo" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Icon name="bell" /></button>{notificationsOpen && <div className="notification-popover" role="status"><strong>Thông báo</strong><p>Bạn chưa có thông báo mới.</p></div>}</div>
          <div className="account-menu">
              <Link className="account-profile" to="/profile" title="Xem hồ sơ cá nhân" aria-label="Hồ sơ cá nhân">
                <span className="avatar"><Icon name="user" /></span>
                <div className="account-profile-info">
                  <strong title={displayName}>{displayName}</strong>
                  <small className="account-sub-label">Hồ sơ cá nhân</small>
                </div>
              </Link>
              <button className="account-logout" type="button" onClick={signOut} title="Đăng xuất khỏi hệ thống"><Icon name="logout" />Đăng xuất</button>
          </div>
        </div>
      </header>
      <main className="page-content">{isAdmin && pathname.startsWith('/admin') && <AdminNotice />}<Outlet /></main>
      {!isAdmin && <PublicFooter />}
    </div>
  </div>;
}
