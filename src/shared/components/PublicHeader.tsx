import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { Icon } from './Icon';

export function PublicHeader() {
  const { isAuthenticated, user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || 'My Account';
  const portalPath = user?.systemRole?.toUpperCase() === 'ADMIN' ? '/admin' : '/dashboard';

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="public-header" role="banner">
      <div className="public-header-inner">
        <div className="header-brand-wrap">
          <Link to="/" className="public-brand" aria-label="MyCropDiary Home">
            <span className="brand-icon-box">
              <Icon name="leaf" className="brand-leaf-icon" />
            </span>
            <div className="brand-text-group">
              <strong className="brand-name">MyCropDiary</strong>
              <span className="brand-tag">VietGAP Agriculture</span>
            </div>
          </Link>
        </div>

        <nav className="public-nav-desktop" aria-label="Main Navigation">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'is-active' : ''}`}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            Home
          </Link>
          <Link
            to="/knowledge"
            className={`nav-link ${isActive('/knowledge') ? 'is-active' : ''}`}
          >
            VietGAP Knowledge
          </Link>
          <Link to="/features" className={`nav-link ${isActive('/features') ? 'is-active' : ''}`} aria-current={isActive('/features') ? 'page' : undefined}>
            Features
          </Link>
          <Link to="/about" className={`nav-link ${isActive('/about') ? 'is-active' : ''}`} aria-current={isActive('/about') ? 'page' : undefined}>
            About Us
          </Link>
        </nav>

        <div className="public-header-actions">
          {isAuthenticated ? (
            <div className="public-auth-logged-in">
              <Link to={portalPath} className="btn-portal-entry">
                <Icon name="home" />
                <span>Dashboard</span>
              </Link>
              <Link
                className="account-profile"
                to="/profile"
                title="View user profile"
                aria-label="User Profile"
              >
                <span className="avatar">
                  <Icon name="user" />
                </span>
                <div className="account-profile-info">
                  <strong title={displayName}>{displayName}</strong>
                  <small className="account-sub-label">Profile</small>
                </div>
              </Link>
              <button
                className="account-logout"
                type="button"
                onClick={signOut}
                title="Sign out of system"
              >
                <Icon name="logout" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="auth-btn-group">
              <Link
                to="/login"
                className={`btn-auth-secondary ${isActive('/login') ? 'is-active' : ''}`}
              >
                <Icon name="login" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className={`btn-auth-primary ${isActive('/register') ? 'is-active' : ''}`}
              >
                <Icon name="user-plus" />
                <span>Register</span>
              </Link>
            </div>
          )}

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="public-mobile-drawer" role="dialog" aria-modal="true">
          <div className="mobile-drawer-inner">
            <Link
              to="/"
              className={`mobile-nav-link ${isActive('/') ? 'is-active' : ''}`}
              aria-current={isActive('/') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/knowledge"
              className={`mobile-nav-link ${isActive('/knowledge') ? 'is-active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              VietGAP Knowledge
            </Link>
            <Link
              to="/features"
              className={`mobile-nav-link ${isActive('/features') ? 'is-active' : ''}`}
              aria-current={isActive('/features') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              to="/about"
              className={`mobile-nav-link ${isActive('/about') ? 'is-active' : ''}`}
              aria-current={isActive('/about') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              About Us
            </Link>

            <div className="mobile-drawer-auth">
              {isAuthenticated ? (
                <div className="mobile-auth-logged-in">
                  <Link
                    to="/profile"
                    className="account-profile mobile-profile"
                    onClick={() => setMobileMenuOpen(false)}
                    title="View user profile"
                    aria-label="User Profile"
                  >
                    <span className="avatar">
                      <Icon name="user" />
                    </span>
                    <div className="account-profile-info">
                      <strong>{displayName}</strong>
                      <small className="account-sub-label">Profile</small>
                    </div>
                  </Link>
                  <Link
                    to={portalPath}
                    className="btn-portal-entry full-width"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="home" />
                    <span>Dashboard</span>
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
                    <span>Sign Out</span>
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
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="btn-auth-primary full-width"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="user-plus" />
                    <span>Register</span>
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
