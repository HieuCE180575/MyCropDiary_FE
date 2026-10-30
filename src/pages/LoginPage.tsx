import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth, GoogleAuthModal } from '../features/auth';
import { authenticate } from '../features/auth/authApi';
import { Icon } from '../shared/components/Icon';

const loginBenefits = [
  {
    icon: 'leaf',
    title: 'VietGAP Digital Diary',
    desc: 'Record planting batches, fertilizing, irrigation, and harvest intervals transparently every day.',
  },
  {
    icon: 'plots',
    title: 'Zone & Block Management',
    desc: 'Synchronized Zone & Block architecture, monitoring soil health and field conditions in real time.',
  },
  {
    icon: 'shield',
    title: 'Security & Access Control',
    desc: 'Fine-grained role permissions for Administrators, Farm Owners, and Technical Staff.',
  },
  {
    icon: 'bot',
    title: 'AI Assistant & Reports',
    desc: 'Receive disease advisory, quarantine safety alerts, and generate automated audit portfolios.',
  },
];

export function LoginPage() {
  const { isAuthenticated, user, setSession } = useAuth();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const initialNotice = (location.state as { notice?: string } | null)?.notice ?? '';
  const [notice, setNotice] = useState(initialNotice);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
    const isAdmin = user?.systemRole?.toUpperCase() === 'ADMIN';
    const destination = isAdmin ? '/admin'
      : /^\/admin(?:\/|$)/i.test(from) ? '/dashboard' : from;
    return <Navigate to={destination} replace />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setNotice('');
    setPending(true);
    try {
      const authorization = await authenticate(trimmedEmail, password);
      setSession(authorization);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Login failed. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-page login-page-root">
      {/* Left Column: Showcase Banner */}
      <section className="auth-showcase" aria-labelledby="login-showcase-title">
        <div className="showcase-inner">
          <div className="showcase-badge">
            <Icon name="shield" />
            <span>Smart &amp; Sustainable Agriculture</span>
          </div>

          <div className="showcase-content">
            <h1 id="login-showcase-title">
              Welcome back to<br />
              <span className="gradient-text">MyCropDiary</span><br />
              VietGAP Digital Diary.
            </h1>
            <p className="showcase-desc">
              Log in to manage crop seasons, update farming diaries by Zone &amp; Block, and synchronize origin traceability records.
            </p>
          </div>

          <div className="feature-grid">
            {loginBenefits.map((item) => (
              <article className="feature-card" key={item.title}>
                <div className="feature-icon-wrapper">
                  <Icon name={item.icon} className="feature-icon" />
                </div>
                <div className="feature-body">
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="showcase-highlight-card">
            <div className="highlight-stat">
              <span className="stat-number">10,000+</span>
              <span className="stat-label">Diaries Logged</span>
            </div>
            <div className="highlight-divider" />
            <div className="highlight-stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">VietGAP Standardized</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Login Form */}
      <section className="auth-panel" aria-label="Sign in to your account">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-icon">
              <Icon name="login" />
            </div>
            <h2>Welcome Back!</h2>
            <p>Sign in to manage your digital farm and cultivation diaries</p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <Icon name="warning" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="auth-notice-banner" role="status">
              <Icon name="check-circle" />
              <span>{notice}</span>
            </div>
          )}

          <form id="login-form" className="auth-form" autoComplete="on" onSubmit={submit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-with-icon">
                <span className="input-lead-icon">
                  <Icon name="mail" />
                </span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="name@example.com"
                  required
                  disabled={pending}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-action">
                <label htmlFor="login-password">Password</label>
                <Link
                  to="/forgot-password"
                  className="link-forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="input-with-icon">
                <span className="input-lead-icon">
                  <Icon name="lock" />
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  disabled={pending}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                />
                <button
                  type="button"
                  className="input-trailing-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} />
                </button>
              </div>
            </div>

            <button
              className="btn-primary-auth"
              type="submit"
              disabled={pending}
              aria-busy={pending}
            >
              <Icon
                name={pending ? 'loader' : 'login'}
                className={pending ? 'icon-spin' : undefined}
              />
              <span>{pending ? 'Authenticating…' : 'Sign In'}</span>
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              className="btn-google-auth"
              type="button"
              disabled={pending}
              onClick={() => setIsGoogleModalOpen(true)}
              title="Sign in with Google"
            >
              <svg className="google-svg-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27A7.195 7.195 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.966 11.966 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <p className="auth-switch-prompt">
              Don't have an account yet?{' '}
              <Link to="/register" className="auth-switch-link">
                Register now <Icon name="arrow" />
              </Link>
            </p>
          </form>
        </div>
      </section>
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        mode="login"
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={(session) => setSession(session)}
      />
    </main>
  );
}
