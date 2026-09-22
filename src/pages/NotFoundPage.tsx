import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <main className="auth-page"><div className="auth-card"><h1>404</h1><p>Không tìm thấy trang.</p><Link to="/dashboard">Về tổng quan</Link></div></main>;
}
