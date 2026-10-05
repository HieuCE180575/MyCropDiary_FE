import { Outlet } from 'react-router-dom';
import { PublicHeader } from '../../shared/components/PublicHeader';
import { PublicFooter } from '../../shared/components/PublicFooter';

export function PublicLayout() {
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
