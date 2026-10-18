import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { authenticate } from '../features/auth/authApi';
import { Icon } from '../shared/components/Icon';

export function LoginPage() {
  const { isAuthenticated, user, setSession } = useAuth();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
    const destination = user?.systemRole === 'ADMIN' ? '/admin'
      : /^\/admin(?:\/|$)/i.test(from) ? '/dashboard' : from;
    return <Navigate to={destination} replace />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setError('');
    setPending(true);
    try {
      const authorization = await authenticate(trimmedEmail, password);
      setSession(authorization);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không đăng nhập được. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="login-page-root">
      <section className="auth-panel" aria-label="Đăng nhập tài khoản">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-icon">
              <Icon name="login" />
            </div>
            <h2>Chào mừng bạn trở lại!</h2>
            <p>Đăng nhập để quản lý trang trại và nhật ký canh tác của bạn</p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <Icon name="warning" />
              <span>{error}</span>
            </div>
          )}

          <form id="login-form" className="auth-form" autoComplete="on" onSubmit={submit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">Địa chỉ Email</label>
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
                <label htmlFor="login-password">Mật khẩu</label>
                <Link
                  to="/forgot-password"
                  className="link-forgot-password"
                >
                  Quên mật khẩu?
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
                  placeholder="Nhập mật khẩu tài khoản"
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
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
              <span>{pending ? 'Đang xác thực…' : 'Đăng nhập vào hệ thống'}</span>
            </button>

            <div className="auth-divider">
              <span>hoặc</span>
            </div>

            <button
              className="btn-google-auth"
              type="button"
              disabled
              title="Đăng nhập Google sắp ra mắt"
            >
              <svg className="google-svg-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27A7.195 7.195 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.966 11.966 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Tiếp tục với Google</span>
            </button>

            <p className="auth-switch-prompt">
              Bạn chưa có tài khoản?{' '}
              <Link to="/register" className="auth-switch-link">
                Đăng ký tài khoản mới <Icon name="arrow" />
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
