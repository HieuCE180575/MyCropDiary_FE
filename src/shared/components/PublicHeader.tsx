import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { Icon } from './Icon';

export function PublicHeader() {
  const { isAuthenticated, user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || 'Tài khoản của bạn';

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="public-header" role="banner">
      <div className="public-header-inner">
        <div className="header-brand-wrap">
          <Link to="/" className="public-brand" aria-label="Trang chủ MyCropDiary">
            <span className="brand-icon-box">
              <Icon name="leaf" className="brand-leaf-icon" />
            </span>
            <div className="brand-text-group">
              <strong className="brand-name">MyCropDiary</strong>
              <span className="brand-tag">Nông nghiệp VietGAP</span>
            </div>
          </Link>
        </div>

        <nav className="public-nav-desktop" aria-label="Điều hướng chính">
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            className={`nav-link ${isActive('/login') || isActive('/dashboard') || isActive('/') ? 'is-active' : ''}`}
          >
            Trang chủ
          </Link>
          <Link
            to="/knowledge"
            className={`nav-link ${isActive('/knowledge') ? 'is-active' : ''}`}
          >
            Kiến thức VietGAP
          </Link>
          <a href="#features-section" className="nav-link">
            Tính năng nổi bật
          </a>
          <a href="#footer-brand-heading" className="nav-link">
            Giới thiệu
          </a>
        </nav>

        <div className="public-header-actions">
          {isAuthenticated ? (
            <div className="public-auth-logged-in">
              <Link to="/dashboard" className="btn-portal-entry">
                <Icon name="home" />
                <span>Vào trang quản lý</span>
              </Link>
              <Link
                className="account-profile"
                to="/profile"
                title="Xem hồ sơ cá nhân"
                aria-label="Hồ sơ cá nhân"
              >
                <span className="avatar">
                  <Icon name="user" />
                </span>
                <div className="account-profile-info">
                  <strong title={displayName}>{displayName}</strong>
                  <small className="account-sub-label">Hồ sơ cá nhân</small>
                </div>
              </Link>
              <button
                className="account-logout"
                type="button"
                onClick={signOut}
                title="Đăng xuất khỏi hệ thống"
              >
                <Icon name="logout" />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="auth-btn-group">
              <Link
                to="/login"
                className={`btn-auth-secondary ${isActive('/login') ? 'is-active' : ''}`}
              >
                <Icon name="login" />
                <span>Đăng nhập</span>
              </Link>
              <Link
                to="/register"
                className={`btn-auth-primary ${isActive('/register') ? 'is-active' : ''}`}
              >
                <Icon name="user-plus" />
                <span>Đăng ký ngay</span>
              </Link>
            </div>
          )}

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="public-mobile-drawer" role="dialog" aria-modal="true">
          <div className="mobile-drawer-inner">
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className={`mobile-nav-link ${isActive('/login') || isActive('/dashboard') || isActive('/') ? 'is-active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Trang chủ
            </Link>
            <Link
              to="/knowledge"
              className={`mobile-nav-link ${isActive('/knowledge') ? 'is-active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Kiến thức VietGAP
            </Link>
            <a
              href="#features-section"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tính năng nổi bật
            </a>
            <a
              href="#footer-brand-heading"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Giới thiệu
            </a>

            <div className="mobile-drawer-auth">
              {isAuthenticated ? (
                <div className="mobile-auth-logged-in">
                  <Link
                    to="/profile"
                    className="account-profile mobile-profile"
                    onClick={() => setMobileMenuOpen(false)}
                    title="Xem hồ sơ cá nhân"
                    aria-label="Hồ sơ cá nhân"
                  >
                    <span className="avatar">
                      <Icon name="user" />
                    </span>
                    <div className="account-profile-info">
                      <strong>{displayName}</strong>
                      <small className="account-sub-label">Hồ sơ cá nhân</small>
                    </div>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="btn-portal-entry full-width"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="home" />
                    <span>Vào trang quản lý</span>
                  </Link>
                  <button
                    type="button"
                    className="account-logout full-width"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                  >
                    <Icon name="logout" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <div className="mobile-auth-stack">
                  <Link
                    to="/login"
                    className="btn-auth-secondary full-width"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="login" />
                    <span>Đăng nhập</span>
                  </Link>
                  <Link
                    to="/register"
                    className="btn-auth-primary full-width"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="user-plus" />
                    <span>Đăng ký tài khoản</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
