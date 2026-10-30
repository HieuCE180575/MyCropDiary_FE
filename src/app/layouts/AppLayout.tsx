import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { Icon } from '../../shared/components/Icon';
import { moduleDefinitions } from '../routes/moduleDefinitions';
import { canAccessModule, farmRole } from '../../features/auth/accessPolicy';
import { fetchMyFarmInvitations, respondFarmInvitation, type FarmInvitation } from '../../features/staff/staffService';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
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
    title: 'Admin Overview',
    subtitle: 'Comprehensive overview of system and MyCropDiary farm operations today',
  },
  '/admin/registrations': {
    title: 'Farm Registrations Review',
    subtitle: 'Review and approve farm registration requests from owners and cooperatives',
  },
  '/admin/users': {
    title: 'User Management',
    subtitle: 'Manage user accounts, system roles, permissions, and security',
  },
  '/admin/crops': {
    title: 'Crop Categories',
    subtitle: 'Standardize crop categories and VietGAP seasonal guidelines',
  },
  '/admin/rules': {
    title: 'Checklist Rules',
    subtitle: 'Configure inspection criteria, mandatory levels, and VietGAP compliance rules',
  },
  '/admin/articles': {
    title: 'Knowledge Articles',
    subtitle: 'Author, review, and publish digital agricultural handbooks and guides',
  },
  '/admin/feedback': {
    title: 'AI Feedback',
    subtitle: 'Aggregate user ratings and suggestions to improve AI accuracy',
  },
  '/admin/statistics': {
    title: 'System Analytics',
    subtitle: 'Visual reports on user engagement, seasons, costs, and compliance records',
  },
  '/admin/audit': {
    title: 'Audit Logs',
    subtitle: 'Track and audit administrative activities and data changes across the system',
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
  const displayName = user?.fullName?.trim() || user?.email || 'Administrator';
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    setAccountMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);
  const [invitations, setInvitations] = useState<FarmInvitation[]>([]);
  const [respondingInvId, setRespondingInvId] = useState<number | null>(null);

  const loadInvitations = async () => {
    if (!user || user?.systemRole?.toUpperCase() === 'ADMIN') return;
    try {
      const list = await fetchMyFarmInvitations();
      setInvitations(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadInvitations();
  }, [user]);

  useRealtimeSync(() => {
    void loadInvitations();
  });

  const handleRespondInvitation = async (inv: FarmInvitation, action: 'approve' | 'reject') => {
    setRespondingInvId(inv.memberId);
    try {
      await respondFarmInvitation(inv.memberId, action);
      setInvitations((prev) => prev.filter((item) => item.memberId !== inv.memberId));
      if (action === 'approve') {
        window.location.reload();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi phản hồi lời mời.');
    } finally {
      setRespondingInvId(null);
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isAdmin = user?.systemRole?.toUpperCase() === 'ADMIN';
  const currentFarmRole = farmRole(selectedFarm);
  const activeRoleKey = isAdmin ? 'ADMIN' : currentFarmRole === 'OWNER' ? 'OWNER' : currentFarmRole === 'STAFF' ? 'STAFF' : 'USER';
  const currentAdminMeta = adminRouteMeta[pathname] || {
    title: 'MyCropDiary Administration',
    subtitle: 'Control center and VietGAP agricultural management system',
  };

  return (
    <div className={`app-shell${isAdmin ? ' admin-shell' : ''}${sidebarOpen ? '' : ' sidebar-collapsed'} ${theme === 'dark' ? 'dark' : 'light'}`}>
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="MyCropDiary" title="Back to Home">
          <span className="brand-icon-box">
            <Icon name="leaf" />
          </span>
          <span className="brand-text-box" hidden={!sidebarOpen}>
            <strong hidden={!sidebarOpen}>MyCropDiary</strong>
            <span className="brand-admin-tag">
              {activeRoleKey === 'ADMIN'
                ? 'Admin'
                : activeRoleKey === 'OWNER'
                  ? 'Farm Owner'
                  : activeRoleKey === 'STAFF'
                    ? 'Staff'
                    : 'Personal'}
            </span>
          </span>
        </Link>
        <button
          className="sidebar-toggle sidebar-collapse-btn"
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-controls="workspace-sidebar"
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Icon name={sidebarOpen ? 'chevron-left' : 'chevron-right'} />
          {sidebarOpen && <span>Collapse</span>}
        </button>

        <div className="sidebar-content" id="workspace-sidebar" hidden={!sidebarOpen}>
          {sidebarOpen && (
            <div className="sidebar-role-indicator">
              <span className={`badge-role ${activeRoleKey.toLowerCase()}`}>
                {activeRoleKey === 'ADMIN'
                  ? 'Administrator'
                  : activeRoleKey === 'OWNER'
                    ? 'Farm Owner'
                    : activeRoleKey === 'STAFF'
                      ? 'Technical Staff'
                      : 'Personal User'}
              </span>
            </div>
          )}
          {sidebarOpen && <p className="sidebar-nav-caption">MENU</p>}
          <nav className="nav-list" aria-label="Primary navigation">
            <NavLink to={isAdmin ? '/admin' : '/dashboard'} end title={!sidebarOpen ? 'Dashboard' : undefined}>
              <Icon name="home" />
              {sidebarOpen && <span>Dashboard</span>}
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
                  title={!sidebarOpen ? (module.key === 'profile' ? 'Profile' : module.title) : undefined}
                >
                  <Icon name={module.icon} />
                  {sidebarOpen && <span>{module.key === 'profile' ? 'Profile' : module.title}</span>}
                </NavLink>
              ))}
            <button className="sidebar-logout" type="button" onClick={signOut} title={!sidebarOpen ? 'Sign Out' : undefined}>
              <Icon name="logout" />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </nav>
          {sidebarOpen && user?.systemRole?.toUpperCase() === 'USER' && !selectedFarm && (
            <div className="season-card">
              <strong><Icon name="leaf" />Your Farm</strong>
              <p>Submit farm registration request and track approval progress.</p>
              <Link to="/farm-registration">
                Register Farm <Icon name="arrow" />
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
                <span>Workspace</span>
                <select
                  aria-label="Select workspace"
                  value={selectedFarm?.id ?? ''}
                  onChange={(event) => {
                    selectFarm(event.target.value ? Number(event.target.value) : null);
                    navigate('/dashboard');
                  }}
                >
                  <option value="">Personal</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.farmName} · {farmRole(farm) === 'OWNER' ? 'Farm Owner' : 'Staff'}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="workspace-label">
                {isAdmin ? 'System Administration' : 'Personal Workspace'}
              </span>
            )}
          </div>

          <div className="topbar-actions">
            {/* Dark / Light Mode Switch */}
            <button
              type="button"
              className={`theme-toggle-switch ${theme}`}
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
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
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{ position: 'relative' }}
              >
                <Icon name="bell" />
                {invitations.length > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      padding: '1px 5px',
                      minWidth: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {invitations.length}
                  </span>
                ) : (
                  <span className="notification-dot" />
                )}
              </button>
              {notificationsOpen && (
                <div
                  className="notification-popover"
                  role="status"
                  style={{
                    width: '360px',
                    maxWidth: '90vw',
                    padding: '14px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      System Notifications
                    </strong>
                    {invitations.length > 0 && (
                      <span className="crop-cat-pill" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a', fontWeight: 700, fontSize: '11px' }}>
                        {invitations.length} lời mời
                      </span>
                    )}
                  </div>

                  {invitations.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      All systems operational. No new notifications.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                      {invitations.map((inv) => (
                        <div
                          key={inv.memberId}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🌿</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block' }}>
                                {inv.farmName}
                              </strong>
                              <span style={{ fontSize: '12px', color: '#475569', display: 'block', marginTop: '2px' }}>
                                Lời mời tham gia: <strong>{inv.farmRole?.toLowerCase() === 'owner' ? 'Đồng sở hữu (Co-Owner)' : 'Nhân viên kỹ thuật (Staff)'}</strong>
                              </span>
                              <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>
                                Người mời: {inv.ownerName}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <button
                              type="button"
                              className="primary-button"
                              disabled={respondingInvId === inv.memberId}
                              onClick={() => handleRespondInvitation(inv, 'approve')}
                              style={{ flex: 1, padding: '5px 10px', fontSize: '12px', justifyContent: 'center' }}
                            >
                              ✓ Chấp nhận
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              disabled={respondingInvId === inv.memberId}
                              onClick={() => handleRespondInvitation(inv, 'reject')}
                              style={{ padding: '5px 10px', fontSize: '12px', color: '#dc2626' }}
                            >
                              ✕ Từ chối
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar / Dropdown Menu */}
            <div className="account-menu" ref={accountMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="account-profile"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                title="Tài khoản & Thiết lập"
                aria-label="User Profile Menu"
                aria-expanded={accountMenuOpen}
              >
                <span className="avatar" style={user?.avatarUrl ? { padding: 0, overflow: 'hidden' } : undefined}>
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </span>
                <div className="account-profile-info">
                  <strong title={displayName}>{displayName}</strong>
                  <small className="account-sub-label">
                    {isAdmin
                      ? 'Admin'
                      : currentFarmRole === 'OWNER'
                        ? 'Farm Owner'
                        : currentFarmRole === 'STAFF'
                          ? 'Staff'
                          : 'Personal'}
                  </small>
                </div>
                <Icon name={accountMenuOpen ? 'chevron-up' : 'chevron-down'} size={14} style={{ color: '#64748b', marginLeft: '4px' }} />
              </button>

              {accountMenuOpen && (
                <div
                  className="account-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '240px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e2e8f0',
                    padding: '8px',
                    zIndex: 1000,
                  }}
                >
                  <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: '6px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{displayName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.email || ''}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#047857',
                        background: '#d1fae5',
                        padding: '2px 8px',
                        borderRadius: '12px',
                      }}
                    >
                      {isAdmin
                        ? 'Hệ thống Quản trị viên (Admin)'
                        : currentFarmRole === 'OWNER'
                          ? 'Chủ trang trại (Farm Owner)'
                          : currentFarmRole === 'STAFF'
                            ? 'Nhân viên trang trại (Staff)'
                            : 'Cá nhân (Personal)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        navigate('/profile');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: '#334155',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="user" size={17} style={{ color: '#059669' }} />
                      <span>Hồ sơ cá nhân (Profile)</span>
                    </button>

                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        navigate('/profile');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: '#334155',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="lock" size={17} style={{ color: '#64748b' }} />
                      <span>Đổi mật khẩu</span>
                    </button>

                    <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        signOut();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: '#dc2626',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="log-out" size={17} style={{ color: '#dc2626' }} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
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
