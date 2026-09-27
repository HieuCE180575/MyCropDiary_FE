import { NavLink, Outlet } from 'react-router-dom';
import { moduleDefinitions } from '../routes/moduleDefinitions';

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div><strong>MyCropDiary</strong><small>Farm workspace</small></div>
        </div>
        <nav className="nav-list" aria-label="Điều hướng chính">
          <NavLink to="/dashboard">Tổng quan</NavLink>
          {moduleDefinitions
            .filter((module) => module.key !== 'knowledge')
            .map((module) => (
              <NavLink key={module.key} to={`/${module.path}`}>{module.title}</NavLink>
            ))}
        </nav>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div><span className="eyebrow">Trang trại đang chọn</span><strong>Green Valley Farm</strong></div>
          <div className="user-chip">Owner</div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}