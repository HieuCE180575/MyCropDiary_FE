import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { authenticate } from '../features/auth/authApi';
import { Icon } from '../shared/components/Icon';

const features: { icon: string; title: string }[] = [
  { icon: 'book', title: 'Nhật ký canh tác' }, { icon: 'box', title: 'Quản lý vật tư' },
  { icon: 'money', title: 'Theo dõi chi phí' }, { icon: 'report', title: 'Báo cáo mùa vụ' },
];

export function LoginPage() {
  const { isAuthenticated, user, setSession } = useAuth();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
    const destination = user?.systemRole === 'ADMIN' ? '/admin'
      : /^\/admin(?:\/|$)/i.test(from) ? '/dashboard' : from;
    return <Navigate to={destination} replace />;
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setError('');
    setPending(true);
    try {
      const authorization = await authenticate(String(fields.get('email') ?? ''), String(fields.get('password') ?? ''));
      form.reset();
      setSession(authorization);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không đăng nhập được. Vui lòng thử lại.');
    } finally { setPending(false); }
  };

  return <>
  <header className="public-header">
    <div className="public-header-inner">
      <Link className="login-brand" to="/" aria-label="Trang chủ MyCropDiary">
        <Icon name="leaf" /><strong>MyCropDiary</strong>
      </Link>
      <nav className="public-navigation" aria-label="Điều hướng chính">
        <Link to="/">Trang chủ</Link>
        <Link to="/knowledge">Kiến thức</Link>
        <a href="#footer-brand-heading">Giới thiệu</a>
        <button type="button" disabled>Liên hệ</button>
        <a href="#login-form" aria-current="page">Đăng nhập</a>
        <Link className="public-sign-up" to="/register">Đăng ký</Link>
      </nav>
    </div>
  </header>
  <main className="login-page">
    <section className="login-showcase" aria-labelledby="showcase-title">
      <div className="showcase-content"><h1 id="showcase-title">Nhật ký canh tác<br />Quản lý chi phí<br />Tối ưu mùa vụ</h1><p>Đồng hành cùng bạn ghi chép hoạt động canh tác, quản lý vật tư, theo dõi chi phí và tổng hợp báo cáo mùa vụ.</p></div>
      <div className="feature-list">{features.map((feature) => <article className="feature-tile" key={feature.icon}><span className="feature-icon-wrap"><Icon name={feature.icon} className="feature-icon" /></span><strong>{feature.title}</strong></article>)}</div>
    </section>

    <section className="login-panel" aria-label="Đăng nhập">
      <form id="login-form" className="login-form" autoComplete="off" onSubmit={submit}>
        <div className="login-form-heading"><h2>Chào mừng bạn trở lại!</h2><p>Đăng nhập để quản lý nhật ký canh tác của bạn</p></div>
        <label className="login-field"><span>Email</span><span className="input-control"><Icon name="mail" /><input name="email" disabled={pending} type="email" maxLength={254} placeholder="Nhập địa chỉ email" autoComplete="off" required /></span></label>
        <label className="login-field"><span>Mật khẩu</span><span className="input-control"><Icon name="lock" /><input name="password" disabled={pending} type={showPassword ? 'text' : 'password'} placeholder="Nhập mật khẩu" autoComplete="new-password" required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}><Icon name={showPassword ? 'eye-off' : 'eye'} /></button></span></label>
        <button className="forgot-password" type="button" disabled title="Sắp ra mắt">Quên mật khẩu?</button>
        <p className="login-auth-note">Đăng nhập bằng email và mật khẩu đã đăng ký. Bạn cần đăng nhập lại khi tải lại trang.</p>{error && <p className="api-error" role="alert">{error}</p>}<button className="sign-in-button" type="submit" disabled={pending} aria-busy={pending}><Icon name={pending ? 'loader' : 'login'} className={pending ? 'icon-spin' : undefined} /> {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <div className="login-divider"><span>hoặc đăng nhập bằng</span></div>
        <button className="google-button" type="button" disabled title="Sắp ra mắt"><span className="google-mark">G</span> Tiếp tục với Google</button>
        <p className="sign-up-prompt">Bạn chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
      </form>
    </section>
  </main>
  <footer className="login-footer">
    <div className="login-footer-content">
      <section className="login-footer-about" aria-labelledby="footer-brand-heading">
        <h2 id="footer-brand-heading">MyCropDiary</h2>
        <p>Đồng hành cùng nhà nông quản lý nhật ký canh tác, chi phí sản xuất và thông tin trang trại theo định hướng VietGAP.</p>
      </section>
      <nav aria-labelledby="footer-explore-heading">
        <h2 id="footer-explore-heading">Khám phá</h2>
        <ul>
          <li><Link to="/">Trang chủ</Link></li>
          <li><Link to="/knowledge">Kiến thức nông nghiệp</Link></li>
          <li><a href="#footer-brand-heading">Về MyCropDiary</a></li>
        </ul>
      </nav>
      <nav aria-labelledby="footer-resources-heading">
        <h2 id="footer-resources-heading">Tài nguyên</h2>
        <ul>
          <li><Link to="/knowledge">Kiến thức VietGAP</Link></li>
          <li><Link to="/ai">Trợ lý AI</Link></li>
          <li><span className="login-footer-pending" aria-disabled="true">Trợ giúp &amp; Hỗ trợ</span></li>
        </ul>
      </nav>
    </div>
    <div className="login-footer-bottom">
      <small>© 2026 MyCropDiary. Bảo lưu mọi quyền.</small>
    </div>
  </footer>
  </>;
}
