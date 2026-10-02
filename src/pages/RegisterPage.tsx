import { type FormEvent, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { registerAccount, resendOtp, verifyOtp } from '../features/auth/authApi';
import { Icon } from '../shared/components/Icon';

export function RegisterPage() {
  const { isAuthenticated, setSession } = useAuth();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function perform(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try { await action(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Yêu cầu không thành công. Vui lòng thử lại.'); }
    finally { busy.current = false; setPending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    void perform(async () => {
      if (step === 'verify') {
        const session = await verifyOtp(email, String(fields.get('otp') ?? ''));
        setSession(session);
        return;
      }
      const password = String(fields.get('password') ?? '');
      const fullName = String(fields.get('fullName') ?? '').trim();
      if (!fullName) throw new Error('Vui lòng nhập họ tên.');
      if (password !== fields.get('confirmation')) throw new Error('Mật khẩu xác nhận không khớp.');
      // BCrypt used by the backend accepts at most 72 UTF-8 bytes.
      if (new TextEncoder().encode(password).length > 72) throw new Error('Mật khẩu quá dài. Vui lòng dùng tối đa 72 byte ký tự.');
      await registerAccount({ fullName, email, password, phoneNumber: String(fields.get('phoneNumber') ?? '') });
      form.reset();
      setEmail(email.trim());
      setStep('verify');
      setNotice('Đã tạo tài khoản. Kiểm tra hộp thư và thư rác để lấy mã OTP.');
    });
  }

  return <main className="registration-page">
    <section className="registration-card">
      <Link to="/login" className="login-brand"><Icon name="leaf" /><strong>MyCropDiary</strong></Link>
      <h1>{step === 'register' ? 'Tạo tài khoản' : 'Xác thực email'}</h1>
      <p>{step === 'register' ? 'Đăng ký để bắt đầu quản lý trang trại của bạn.' : `Nhập mã OTP gồm 6 chữ số được gửi tới ${email}.`}</p>
      {error && <p className="api-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form key={step} onSubmit={submit} className="registration-form" aria-busy={pending}>
        <fieldset disabled={pending}>
          {step === 'register' ? <>
            <label>Họ tên<input name="fullName" autoComplete="name" maxLength={150} required /></label>
            <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Số điện thoại (không bắt buộc)<input name="phoneNumber" type="tel" autoComplete="tel" maxLength={20} /></label>
            <label>Mật khẩu<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required aria-describedby="password-help" /></label>
            <small id="password-help">Ít nhất 8 ký tự.</small>
            <label>Nhập lại mật khẩu<input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
          </> : <label>Mã OTP<input name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus /></label>}
          <button type="submit" className="primary-button"><Icon name={pending ? 'loader' : step === 'register' ? 'user-plus' : 'shield'} className={pending ? 'icon-spin' : undefined} />{pending ? 'Đang xử lý…' : step === 'register' ? 'Đăng ký' : 'Xác thực và đăng nhập'}</button>
        </fieldset>
      </form>
      {step === 'verify' && <button type="button" disabled={pending} onClick={() => void perform(async () => {
        await resendOtp(email);
        setNotice('Đã yêu cầu gửi lại OTP. Vui lòng kiểm tra email và sử dụng mã mới nhất.');
      })}>Gửi lại OTP</button>}
      {step === 'register' && <button type="button" disabled={pending} onClick={() => {
        if (!email.trim()) { setError('Nhập email đã đăng ký để tiếp tục xác thực.'); return; }
        setEmail(email.trim()); setStep('verify'); setError(''); setNotice('Bạn có thể dùng mã đã nhận hoặc yêu cầu gửi lại OTP.');
      }}>Đã đăng ký nhưng chưa xác thực email?</button>}
      {step === 'verify' && <button type="button" disabled={pending} onClick={() => { setStep('register'); setError(''); setNotice(''); }}>Đổi email / quay lại đăng ký</button>}
      <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </section>
  </main>;
}
