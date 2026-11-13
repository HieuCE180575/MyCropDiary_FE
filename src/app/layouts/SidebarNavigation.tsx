import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import type { ModuleDefinition } from '../../shared/types/module';

const sidebarGroups = [
  { id: 'overview', title: 'Dashboard', keys: ['dashboard'] },
  { id: 'farm', title: 'Farm Setup', keys: ['farm-registration', 'farm', 'members', 'production'] },
  { id: 'supplies', title: 'Material Preparation', keys: ['suppliers', 'purchases'] },
  { id: 'cultivation', title: 'Cultivation', keys: ['seasons', 'tasks', 'activities', 'materials', 'harvests'] },
  { id: 'compliance', title: 'VietGAP Compliance', keys: ['checklists', 'assessments', 'environment', 'training'] },
  { id: 'reports', title: 'Costs & Reports', keys: ['expenses', 'reports'] },
  { id: 'knowledge', title: 'Knowledge & AI', keys: ['knowledge', 'ai', 'ai-history', 'ai-feedback', 'ai-drafts'] },
  { id: 'account', title: 'Account', keys: ['profile', 'logout'] },
];

export function SidebarNavigation({ navigation, isAdmin, sidebarOpen, signOut }: {
  navigation: ModuleDefinition[];
  isAdmin: boolean;
  sidebarOpen: boolean;
  signOut: () => void;
}) {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isZoneRoute = /^\/zones(?:\/|$)/.test(pathname);
  const activeKey = /^\/(zones|blocks|production-areas)(?:\/|$)/.test(pathname) ? 'production'
    : pathname.startsWith('/crop-seasons/') ? 'seasons'
      : pathname === '/dashboard' ? 'dashboard'
        : navigation.find(module => pathname === `/${module.path}` || pathname.startsWith(`/${module.path}/`))?.key;
  const activeGroup = sidebarGroups.find(group => group.keys.includes(activeKey || ''))?.id;

  useEffect(() => {
    if (activeGroup) setExpanded(previous => previous[activeGroup] === false ? { ...previous, [activeGroup]: true } : previous);
  }, [pathname, activeGroup]);

  const renderLink = (module: ModuleDefinition) => <NavLink key={module.key}
    to={module.key === 'production' && isZoneRoute ? '/zones' : `/${module.path}`}
    title={!sidebarOpen ? t(module.key === 'profile' ? 'Profile' : module.title) : undefined}>
    <Icon name={module.icon} />
    {sidebarOpen && <span>{t(module.key === 'profile' ? 'Profile' : module.title)}</span>}
  </NavLink>;
  const logout = <button className="sidebar-logout logout-action" type="button" onClick={signOut} title={!sidebarOpen ? t('Sign Out') : undefined}>
    <Icon name="logout" />{sidebarOpen && <span>{t('Sign Out')}</span>}
  </button>;

  return <nav className="nav-list" aria-label={t('Primary navigation')}>
    {isAdmin ? <>
      <NavLink to="/admin" end title={!sidebarOpen ? t('Dashboard') : undefined}>
        <Icon name="home" />{sidebarOpen && <span>{t('Dashboard')}</span>}
      </NavLink>
      {navigation.filter(module => module.group === 'admin' && module.key !== 'admin').map(renderLink)}
      <div className="nav-divider" />
      {navigation.filter(module => module.group === 'account' && module.key !== 'password').map(renderLink)}
      {logout}
    </> : sidebarGroups.map(group => {
      const items = group.keys.flatMap(key => {
        if (key === 'dashboard' || key === 'logout') return [key];
        return navigation.some(module => module.key === key) ? [key] : [];
      });
      if (!items.length) return null;
      const open = expanded[group.id] !== false;
      return <section className="sidebar-nav-group" key={group.id} data-group={group.id}>
        <button className="sidebar-group-toggle" type="button" aria-expanded={open}
          aria-controls={`sidebar-group-${group.id}`}
          onClick={() => setExpanded(previous => ({ ...previous, [group.id]: !open }))}>
          <span>{t(group.title)}</span><Icon name="chevron" className={open ? 'group-chevron is-open' : 'group-chevron'} />
        </button>
        <div className="sidebar-group-items" id={`sidebar-group-${group.id}`} hidden={!open}>
          {items.map(key => key === 'dashboard'
            ? <NavLink key={key} to="/dashboard" end title={!sidebarOpen ? t('Dashboard') : undefined}><Icon name="home" />{sidebarOpen && <span>{t('Dashboard')}</span>}</NavLink>
            : key === 'logout' ? <div key={key}>{logout}</div>
              : renderLink(navigation.find(module => module.key === key)!))}
        </div>
      </section>;
    })}
  </nav>;
}
