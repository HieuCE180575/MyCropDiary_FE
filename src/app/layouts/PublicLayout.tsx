import { Outlet } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { PublicHeader } from '../../shared/components/PublicHeader';
import { PublicFooter } from '../../shared/components/PublicFooter';

export function PublicLayout() {
  useLayoutEffect(() => {
    // Public pages use the light palette; keep the saved workspace preference.
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark-theme');
  }, []);

  return (
    <div className="public-shell">
      <PublicHeader />
      <div className="public-content">
        <Outlet />
      </div>
      <PublicFooter />
    </div>
  );
}
