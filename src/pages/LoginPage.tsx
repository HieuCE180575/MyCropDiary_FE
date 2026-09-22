import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/dashboard');
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="brand-mark large">M</span>
        <div><span className="eyebrow">Chào mừng trở lại</span><h1>Đăng nhập MyCropDiary</h1></div>
        <label>Email<input type="email" placeholder="owner@farm.vn" required /></label>
        <label>Mật khẩu<input type="password" placeholder="••••••••" required /></label>
        <button className="primary-button" type="submit">Đăng nhập</button>
        <p className="hint">Đây là màn hình khung; chưa kết nối xác thực JWT.</p>
      </form>
    </main>
  );
}
