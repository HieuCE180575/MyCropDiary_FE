import { Link, Outlet } from 'react-router-dom';
import { SidebarNavigation } from './SidebarNavigation';
import { Icon } from '../../shared/components/Icon';
import { FarmWorkspaceProvider } from '../../features/farm-management/FarmWorkspace';
import { AdminProvider, AdminNotice } from '../../features/admin/AdminProvider';
import { PublicFooter } from '../../shared/components/PublicFooter';
import { LanguageSwitch } from '../../shared/components/LanguageSwitch';

import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';

import { moduleDefinitions } from '../routes/moduleDefinitions';
import { canAccessModule, farmRole } from '../../features/auth/accessPolicy';
import { fetchMyFarmInvitations, respondFarmInvitation, type FarmInvitation } from '../../features/staff/staffService';

import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';


import { useLanguage } from '../../shared/i18n/LanguageContext';
import { NotificationPopover } from './NotificationPopover';
import { FloatingAIChatbox } from '../../features/ai/FloatingAIChatbox';
import {
  fetchMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from '../../features/notifications/notificationService';


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
  const { lang, t, t: translate } = useLanguage();
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

  const navigation = moduleDefinitions.filter((module) => canAccessModule(module, user?.systemRole, selectedFarm));
  const displayName = user?.fullName?.trim() || user?.email || translate('Administrator');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const notificationWrapRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const loadNotifications = async (silent = false) => {
    if (!silent) setLoadingNotifications(true);
    try {
      const result = await fetchMyNotifications(20);
      setNotifications(result.items);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      if (!silent) setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (user && user?.systemRole?.toUpperCase() !== 'ADMIN') {
      void loadNotifications(!notificationsOpen);
    }
  }, [notificationsOpen, user?.userId]);

  useEffect(() => {
    if (!user || user?.systemRole?.toUpperCase() === 'ADMIN') return;
    const refresh = () => void loadNotifications(true);
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [user?.userId]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      if (!notification.isRead) {
        const updated = await markNotificationAsRead(notification.id);
        if (updated) {
          setNotifications((prev) =>
            prev.map((item) => (item.id === notification.id ? updated : item))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
      setNotificationsOpen(false);
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
      }
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (notificationWrapRef.current && !notificationWrapRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    if (accountMenuOpen || notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen, notificationsOpen]);

  useEffect(() => {
    setAccountMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);
  const [invitations, setInvitations] = useState<FarmInvitation[]>([]);
  const [respondingInvId, setRespondingInvId] = useState<number | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const totalUnread = invitations.length + unreadCount;

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
    void loadNotifications(true);
  });

  const handleRespondInvitation = async (inv: FarmInvitation, action: 'approve' | 'reject') => {
    setInvitationError(null);
    setRespondingInvId(inv.memberId);
    try {
      await respondFarmInvitation(inv.memberId, action);
      setInvitations((prev) => prev.filter((item) => item.memberId !== inv.memberId));
      if (action === 'approve') {
        window.location.reload();
      }
    } catch (err) {
      setInvitationError((lang === 'en' ? err instanceof Error ? err.message : "Unable to respond to the invitation." : err instanceof Error ? err.message : 'Lỗi phản hồi lời mời.'));
    } finally {
      setRespondingInvId(null);
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(max-width: 768px)').matches);

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 768px)');
    if (!media) return;
    const onResize = () => setSidebarOpen(!media.matches);
    media.addEventListener('change', onResize);
    return () => media.removeEventListener('change', onResize);
  }, []);

  useEffect(() => {
    if (window.matchMedia?.('(max-width: 768px)').matches) setSidebarOpen(false);
  }, [pathname]);
  const isAdmin = user?.systemRole?.toUpperCase() === 'ADMIN';
  const currentFarmRole = farmRole(selectedFarm);
  const activeRoleKey = isAdmin ? 'ADMIN' : currentFarmRole === 'OWNER' ? 'OWNER' : currentFarmRole === 'STAFF' ? 'STAFF' : 'USER';
  const currentAdminMeta = adminRouteMeta[pathname] || {
    title: 'MyCropDiary Administration',
    subtitle: 'Control center and VietGAP agricultural management system',
  };

  return (
    <div className={`app-shell${isAdmin ? ' admin-shell' : ''}${sidebarOpen ? '' : ' sidebar-collapsed'} ${theme === 'dark' ? 'dark' : 'light'}`}>
      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label={lang === 'en' ? 'Close navigation' : 'Đóng menu'} onClick={() => setSidebarOpen(false)} />}
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="MyCropDiary" title={translate('Back to Home')}>
          <span className="brand-icon-box">
            <Icon name="leaf" />
          </span>
          <span className="brand-text-box" hidden={!sidebarOpen}>
            <strong hidden={!sidebarOpen}>MyCropDiary</strong>
            <span className="brand-admin-tag">
              {activeRoleKey === 'ADMIN'
                ? translate('Admin')
                : activeRoleKey === 'OWNER'
                  ? translate('Farm Owner')
                  : activeRoleKey === 'STAFF'
                    ? translate('Staff')
                    : translate('Personal')}
            </span>
          </span>
        </Link>
        <button
          className="sidebar-toggle sidebar-collapse-btn"
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-controls="workspace-sidebar"
          aria-expanded={sidebarOpen}
          aria-label={translate(sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar')}
          title={translate(sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar')}
        >
          <Icon name={sidebarOpen ? 'chevron-left' : 'chevron-right'} />
          {sidebarOpen && <span>{translate('Collapse')}</span>}
        </button>

        <div className="sidebar-content" id="workspace-sidebar" hidden={!sidebarOpen}>
          {sidebarOpen && (
            <div className="sidebar-role-indicator">
              <span className={`badge-role ${activeRoleKey.toLowerCase()}`}>
                {activeRoleKey === 'ADMIN'
                  ? translate('Administrator')
                  : activeRoleKey === 'OWNER'
                    ? translate('Farm Owner')
                    : activeRoleKey === 'STAFF'
                      ? translate('Technical Staff')
                      : translate('Personal User')}
              </span>
            </div>
          )}
          {sidebarOpen && <p className="sidebar-nav-caption">{translate('MENU')}</p>}
          <SidebarNavigation navigation={navigation} isAdmin={isAdmin} sidebarOpen={sidebarOpen} signOut={signOut} />
          {sidebarOpen && user?.systemRole?.toUpperCase() === 'USER' && !selectedFarm && (
            <div className="season-card">
              <strong><Icon name="leaf" />{translate('Your Farm')}</strong>
              <p>{translate('Submit farm registration request and track approval progress.')}</p>
              <Link to="/farm?tab=register">
                {translate('Farm Management')} <Icon name="arrow" />
              </Link>
            </div>
          )}
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="mobile-sidebar-toggle" aria-controls="workspace-sidebar" aria-expanded={sidebarOpen}
              aria-label={lang === 'en' ? 'Open navigation' : 'Mở menu'} onClick={() => setSidebarOpen(open => !open)}><Icon name="menu" /></button>
            {isAdmin && pathname.startsWith('/admin') ? (
              ['/admin/users', '/admin/registrations', '/admin/farms', '/admin/zones', '/admin/blocks', '/admin/compliance', '/admin/crops', '/admin/rules', '/admin/articles', '/admin/feedback', '/admin/audit', '/admin/statistics'].includes(pathname) ? null : (
                <div className="admin-header-titles">
                  <h1 className="admin-header-title">{translate(currentAdminMeta.title)}</h1>
                  <p className="admin-header-subtitle">{translate(currentAdminMeta.subtitle)}</p>
                </div>
              )
            ) : farms.length > 0 ? (
              <label className="workspace-switcher">
                <span>{translate('Workspace')}</span>
                <select className="ui-select"
                  aria-label={translate('Select workspace')}
                  value={selectedFarm?.id ?? ''}
                  onChange={(event) => {
                    selectFarm(event.target.value ? Number(event.target.value) : null);
                    navigate('/dashboard');
                  }}
                >
                  <option value="">{translate('Personal')}</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.farmName} · {farmRole(farm) === 'OWNER' ? translate('Farm Owner') : translate('Staff')}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="workspace-label">
                {isAdmin ? translate('System Administration') : translate('Personal Workspace')}
              </span>
            )}
          </div>

          <div className="topbar-actions">
            {/* Header Language Switcher */}
            <LanguageSwitch variant="header" />

            {/* Dark / Light Mode Switch */}
            <button
              type="button"
              className={`theme-toggle-switch ${theme}`}
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              aria-label={theme === 'light' ? t("Switch to dark mode") : t("Switch to light mode")}
              title={theme === 'light' ? t("Switch to dark mode") : t("Switch to light mode")}
            >
              <span className="theme-toggle-track">
                <span className="theme-icon sun"><Icon name="sun" /></span>
                <span className="theme-icon moon"><Icon name="moon" /></span>
                <span className="theme-toggle-thumb" />
              </span>
            </button>

            {/* Notifications */}
            <div className="notification-wrap" ref={notificationWrapRef}>
              <button
                className="icon-button notification-btn"
                aria-label={translate('Notifications')}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{ position: 'relative' }}
              >
                <Icon name="bell" />
                {totalUnread > 0 && (
                  <span className="notification-badge">
                    {totalUnread}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationPopover
                  lang={lang}
                  notifications={notifications}
                  unreadCount={unreadCount}
                  loading={loadingNotifications}
                  invitations={invitations}
                  respondingInvId={respondingInvId}
                  invitationError={invitationError}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onNotificationClick={handleNotificationClick}
                  onRespond={handleRespondInvitation}
                />
              )}
            </div>

            {/* Profile Avatar / Dropdown Menu */}
            <div className="account-menu" ref={accountMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="account-profile"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                title={lang === 'en' ? 'Account & Settings' : 'Tài khoản & Thiết lập'}
                aria-label={t("User Profile Menu")}
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
                      ? translate('Admin')
                      : currentFarmRole === 'OWNER'
                        ? translate('Farm Owner')
                        : currentFarmRole === 'STAFF'
                          ? translate('Staff')
                          : translate('Personal')}
                  </small>
                </div>
                <Icon name="chevron" size={14} style={{ color: 'var(--color-muted)', marginLeft: '4px', transform: accountMenuOpen ? 'rotate(180deg)' : undefined }} />
              </button>

              {accountMenuOpen && (
                <div
                  className="account-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '240px',
                    background: 'var(--color-surface)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                    border: '1px solid var(--color-border)',
                    padding: '8px',
                    zIndex: 1000,
                  }}
                >
                  <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--color-subtle)', marginBottom: '6px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--color-text)' }}>{displayName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.email || ''}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-primary-text)',
                        background: 'var(--color-success-bg)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                      }}
                    >
                      {isAdmin
                        ? t('role.admin', 'System Administrator')
                        : currentFarmRole === 'OWNER'
                          ? t('role.owner', translate('Farm Owner'))
                          : currentFarmRole === 'STAFF'
                            ? t('role.staff', 'Farm Staff')
                            : t('role.personal', translate('Personal'))}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <LanguageSwitch variant="menu-item" />
                    <div style={{ height: '1px', background: 'var(--color-subtle)', margin: '4px 0' }} />
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
                        color: 'var(--color-body)',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-page)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="user" size={17} style={{ color: 'var(--color-primary-text)' }} />
                      <span>{t('nav.profile', 'Profile')}</span>
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
                        color: 'var(--color-body)',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-page)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon name="lock" size={17} style={{ color: 'var(--color-muted)' }} />
                      <span>{t('nav.changePassword', 'Change Password')}</span>
                    </button>

                    <div style={{ height: '1px', background: 'var(--color-subtle)', margin: '4px 0' }} />

                    <button
                      type="button"
                      className="dropdown-item logout-action"
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
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: '#dc2626',
                        textAlign: 'left',
                      }}
                    >
                      <Icon name="logout" size={17} style={{ color: '#dc2626' }} />
                      <span>{t('nav.signOut', 'Sign Out')}</span>
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
        <FloatingAIChatbox />
      </div>
    </div>
  );
}
