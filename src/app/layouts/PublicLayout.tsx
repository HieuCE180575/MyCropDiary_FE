import { Link, NavLink, Outlet } from 'react-router-dom';

/**
 * Layout dành cho khách (chưa đăng nhập) — ví dụ trang Kiến thức VietGAP công khai.
 * Không dùng chung với AppLayout (sidebar quản lý trang trại) vì người dùng ở đây
 * chưa có tài khoản/trang trại nào để hiển thị.
 */
export function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-topbar">
        <Link to="/knowledge" className="public-brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>MyCropDiary</strong>
            <small>Thư viện công khai</small>
          </div>
        </Link>

        <nav className="public-nav" aria-label="Điều hướng công khai">
          <NavLink to="/knowledge">Kiến thức VietGAP</NavLink>
        </nav>

        <div className="public-actions">
          <Link to="/login" className="ghost-button">Đăng nhập</Link>
          <Link to="/login" className="primary-button">Dùng thử miễn phí</Link>
        </div>
      </header>

      <main className="public-content">
        <Outlet />
      </main>
    </div>
  );
}