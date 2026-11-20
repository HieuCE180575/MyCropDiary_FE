import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { LanguageSwitch } from './LanguageSwitch';
import { Modal } from './Modal';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth';

import { useLanguage } from '../i18n/LanguageContext';


export function PublicHeader() {
  const { isAuthenticated, user, signOut } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || 'My Account';
  const portalPath = user?.systemRole?.toUpperCase() === 'ADMIN' ? '/admin' : '/dashboard';

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => { setMobileMenuOpen(false); }, [location.key]);
  useEffect(() => {
    const desktop = window.matchMedia?.('(min-width: 1101px)');
    if (!desktop) return;
    const closeOnDesktop = () => { if (desktop.matches) setMobileMenuOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <header className="public-header" role="banner">
      <div className="public-header-inner">
        <div className="header-brand-wrap">
          <Link to="/" className="public-brand" aria-label={t("MyCropDiary Home")}>
            <span className="brand-icon-box">
              <Icon name="leaf" className="brand-leaf-icon" />
            </span>
            <div className="brand-text-group">
              <strong className="brand-name">MyCropDiary</strong>
              <span className="brand-tag">{t("VietGAP Agriculture")}</span>
            </div>
          </Link>
        </div>

        <nav className="public-nav-desktop" aria-label={t("Main Navigation")}>
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'is-active' : ''}`}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            {t('nav.home', 'Home')}
          </Link>
          <Link
            to="/knowledge"
            className={`nav-link ${isActive('/knowledge') ? 'is-active' : ''}`}
          >
            {t('nav.knowledge', 'VietGAP Knowledge')}
          </Link>
          <Link to="/features" className={`nav-link ${isActive('/features') ? 'is-active' : ''}`} aria-current={isActive('/features') ? 'page' : undefined}>
            {t('nav.features', 'Features')}
          </Link>
          <Link to="/about" className={`nav-link ${isActive('/about') ? 'is-active' : ''}`} aria-current={isActive('/about') ? 'page' : undefined}>
            {t('nav.about', 'About Us')}
          </Link>
        </nav>

        <div className="public-header-actions">
          {/* Header Language Translate Button */}
          <LanguageSwitch variant="header" />

          {isAuthenticated ? (
            <div className="public-auth-logged-in">
              <Link to={portalPath} className="btn-portal-entry">
                <Icon name="home" />
                <span>{t('nav.dashboard', 'Dashboard')}</span>
              </Link>
              <Link
                className="account-profile"
                to="/profile"
                title={t("View user profile")}
                aria-label={t("User Profile")}
              >
                <span className="avatar">
                  <Icon name="user" />
                </span>
                <div className="account-profile-info">
                  <strong title={displayName}>{displayName}</strong>
                  <small className="account-sub-label">{t('nav.profile', 'Profile')}</small>
                </div>
              </Link>
              <button
                className="account-logout"
                type="button"
                onClick={signOut}
                title={t("Sign out of system")}
                aria-label={t('nav.signOut', 'Sign Out')}
              >
                <Icon name="logout" />
                <span>{t('nav.signOut', 'Sign Out')}</span>
              </button>
            </div>
          ) : (
            <div className="auth-btn-group">
              <Link
                to="/login"
                className={`btn-auth-secondary ${isActive('/login') ? 'is-active' : ''}`}
              >
                <Icon name="login" />
                <span>{t('nav.signIn', 'Sign In')}</span>
              </Link>
              <Link
                to="/register"
                className={`btn-auth-primary ${isActive('/register') ? 'is-active' : ''}`}
              >
                <Icon name="user-plus" />
                <span>{t('nav.register', 'Register')}</span>
              </Link>
            </div>
          )}

          <button
            type="button"
            className="mobile-menu-toggle"
            aria-controls="public-mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t("Close menu") : t("Open menu")}
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      <Modal open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}
        title={t('Main Navigation')} className="public-mobile-drawer">
          <nav className="mobile-drawer-inner" id="public-mobile-navigation" aria-label={t('Main Navigation')}>
            <div style={{ marginBottom: '12px' }}>
              <LanguageSwitch variant="header" />
            </div>
            <Link
              to="/"
              className={`mobile-nav-link ${isActive('/') ? 'is-active' : ''}`}
              aria-current={isActive('/') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.home', 'Home')}
            </Link>
            <Link
              to="/knowledge"
              className={`mobile-nav-link ${isActive('/knowledge') ? 'is-active' : ''}`}
              aria-current={isActive('/knowledge') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.knowledge', 'VietGAP Knowledge')}
            </Link>
            <Link
              to="/features"
              className={`mobile-nav-link ${isActive('/features') ? 'is-active' : ''}`}
              aria-current={isActive('/features') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.features', 'Features')}
            </Link>
            <Link
              to="/about"
              className={`mobile-nav-link ${isActive('/about') ? 'is-active' : ''}`}
              aria-current={isActive('/about') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.about', 'About Us')}
            </Link>

            <div className="mobile-drawer-auth">
              {isAuthenticated ? (
                <div className="mobile-auth-logged-in">
                  <Link
                    to="/profile"
                    className="account-profile mobile-profile"
                    onClick={() => setMobileMenuOpen(false)}
                    title={t("View user profile")}
                    aria-label={t("User Profile")}
                  >
                    <span className="avatar">
                      <Icon name="user" />
                    </span>
                    <div className="account-profile-info">
                      <strong>{displayName}</strong>
                      <small className="account-sub-label">{t('nav.profile', 'Profile')}</small>
                    </div>
                  </Link>
                  <Link
                    to={portalPath}
                    className="btn-portal-entry full-width"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="home" />
                    <span>{t('nav.dashboard', 'Dashboard')}</span>
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
                    <span>{t('nav.signOut', 'Sign Out')}</span>
                  </button>
                </div>
              ) : (
                <div className="mobile-auth-guest">
                  <Link
                    to="/login"
                    className="btn-auth-secondary full-width"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="login" />
                    <span>{t('nav.signIn', 'Sign In')}</span>
                  </Link>
                  <Link
                    to="/register"
                    className="btn-auth-primary full-width"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon name="user-plus" />
                    <span>{t('nav.register', 'Register')}</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>
      </Modal>
    </header>
  );
}
