import { type FormEvent, useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth, GoogleAuthModal } from '../features/auth';
import { authenticate } from '../features/auth/authApi';
import { signInWithGoogleDirect, initializeGoogleOneTap } from '../features/auth/googleAuthService';
import { Icon } from '../shared/components/Icon';
import { useLanguage } from '../shared/i18n/LanguageContext';

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
  const { t: translate } = useLanguage();
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
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      void initializeGoogleOneTap((session) => {
        setSession(session);
      });
    }
  }, [isAuthenticated, setSession]);

  const handleGoogleSignInClick = async () => {
    if (pending || googleLoading) return;
    setError('');
    setNotice('');
    setGoogleLoading(true);
    try {
      const session = await signInWithGoogleDirect();
      setSession(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('hủy') && !msg.includes('cancelled') && !msg.includes('access_denied')) {
        setError(msg);
        setIsGoogleModalOpen(true);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

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
      setError(translate('Please enter both email and password.'));
      return;
    }

    setError('');
    setNotice('');
    setPending(true);
    try {
      const authorization = await authenticate(trimmedEmail, password);
      setSession(authorization);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : translate('Login failed. Please try again.'));
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
            <span>{translate("Smart & Sustainable Agriculture")}</span>
          </div>

          <div className="showcase-content">
            <h1 id="login-showcase-title">
              {translate("Transparent Cultivation.")}
              <br />
              <span className="text-gradient">{translate("Elevating Vietnamese Agriculture.")}</span>
            </h1>
            <p className="showcase-desc">
              {translate("MyCropDiary enables precision farm and block management, full traceability, standard-compliant digital logging, and an intelligent audit-support AI assistant.")}
            </p>
          </div>

          <div className="showcase-cards">
            {loginBenefits.map((b) => (
              <div key={b.title} className="benefit-card">
                <div className="benefit-icon-wrapper">
                  <Icon name={b.icon} />
                </div>
                <div>
                  <h2 className="benefit-title">{translate(b.title)}</h2>
                  <p className="benefit-desc">{translate(b.desc)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="showcase-footer">
            <span className="showcase-dot" />
            <span>{translate("Compliant with VietGAP Standards TCVN 11892-1:2017")}</span>
          </div>
        </div>
      </section>

      {/* Right Column: Interactive Login Card */}
      <section className="auth-form-column" aria-label="Sign-in form">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-brand-pill">
              <span className="brand-dot" />
              <span>{translate("Crop Management Portal")}</span>
            </div>
            <h2 className="auth-title">{translate("Welcome Back")}</h2>
            <p className="auth-subtitle">{translate("Sign in with your email and password to access the workspace.")}</p>
          </div>

          {notice && (
            <div className="auth-alert success" role="status">
              <Icon name="check" size={16} />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="auth-alert error" role="alert">
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">{translate("Work / Personal Email")}</label>
              <div className="input-affix-wrapper">
                <span className="input-prefix-icon" aria-hidden="true">
                  <Icon name="mail" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder={translate("Enter your email address…")}
                  value={email}
                  disabled={pending}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-group-label-row">
                <label htmlFor="login-password">{translate("Password")}</label>
                <Link to="/forgot-password" className="auth-forgot-link">
                  {translate("Forgot password?")}
                </Link>
              </div>
              <div className="input-affix-wrapper">
                <span className="input-prefix-icon" aria-hidden="true">
                  <Icon name="lock" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={translate("Enter your account password…")}
                  value={password}
                  disabled={pending}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-suffix-action"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? translate("Hide password") : translate("Show password")}
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
              <span>{pending ? translate("Authenticating…") : translate("Sign In")}</span>
            </button>

            <div className="auth-divider">
              <span>{translate("or")}</span>
            </div>

            <button
              className="btn-google-auth"
              type="button"
              disabled={pending || googleLoading}
              onClick={() => void handleGoogleSignInClick()}
              title={translate("Sign in with Google")}
            >
              <svg className="google-svg-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27A7.195 7.195 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.966 11.966 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>{googleLoading ? translate("Authenticating...") : translate("Continue with Google")}</span>
            </button>

            <p className="auth-switch-prompt">{translate("Don't have an account yet?")}{' '}
              <Link to="/register" className="auth-switch-link">{translate("Register now")}{' '}<Icon name="arrow" />
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
