import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../features/auth/authApi';
import { Icon } from '../shared/components/Icon';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function sendCode() {
    if (pending) return;
    setError('');
    setNotice('');
    setPending(true);
    try {
      await forgotPassword(email);
      setEmail(email.trim());
      setOtp('');
      setStep('reset');
      setNotice('Nếu email thuộc tài khoản đã kích hoạt, mã OTP đã được gửi. Vui lòng kiểm tra cả thư rác.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không gửi được mã OTP. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!event.currentTarget.reportValidity()) return;
    if (step === 'email') {
      await sendCode();
      return;
    }
    setError('');
    if (!password.trim()) {
      setError('Mật khẩu không được chỉ chứa khoảng trắng.');
      return;
    }
    if (password !== confirmation) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setPending(true);
    try {
      await resetPassword(email, otp, password);
      setPassword('');
      setConfirmation('');
      setOtp('');
      setNotice('');
      setStep('done');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không đặt lại được mật khẩu. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-panel forgot-password-page">
      <section className="auth-card" aria-labelledby="forgot-password-title">
        <div className="auth-card-header">
          <div className="auth-card-icon"><Icon name="lock" /></div>
          <h2 id="forgot-password-title">{step === 'done' ? 'Đặt lại mật khẩu thành công' : 'Quên mật khẩu'}</h2>
          <p>{step === 'email' ? 'Nhập email tài khoản để nhận mã OTP đặt lại mật khẩu.'
            : step === 'reset' ? `Nhập mã OTP gửi tới ${email} và mật khẩu mới.`
            : 'Bạn có thể đăng nhập bằng mật khẩu mới.'}</p>
        </div>

        {error && <div className="auth-error-banner" role="alert">{error}</div>}
        {notice && <div className="auth-notice-banner" role="status">{notice}</div>}

        {step !== 'done' && (
          <form className="auth-form" onSubmit={submit}>
            {step === 'email' ? (
              <div className="form-group">
                <label htmlFor="recovery-email">Địa chỉ email</label>
                <div className="input-with-icon">
                  <span className="input-lead-icon"><Icon name="mail" /></span>
                  <input id="recovery-email" name="email" type="email" autoComplete="email" autoFocus
                    required maxLength={254} placeholder="name@example.com" disabled={pending}
                    value={email} onChange={event => setEmail(event.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="recovery-otp">Mã OTP</label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon"><Icon name="lock" /></span>
                    <input id="recovery-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code"
                      autoFocus required pattern="[0-9]{6}" maxLength={6} placeholder="Mã gồm 6 chữ số" disabled={pending}
                      value={otp} onChange={event => setOtp(event.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="recovery-password">Mật khẩu mới</label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon"><Icon name="lock" /></span>
                    <input id="recovery-password" name="newPassword" type="password" autoComplete="new-password"
                      required minLength={8} maxLength={100} placeholder="Từ 8 đến 100 ký tự" disabled={pending}
                      value={password} onChange={event => setPassword(event.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="recovery-confirmation">Nhập lại mật khẩu mới</label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon"><Icon name="lock" /></span>
                    <input id="recovery-confirmation" name="confirmPassword" type="password" autoComplete="new-password"
                      required minLength={8} maxLength={100} placeholder="Nhập lại mật khẩu mới" disabled={pending}
                      value={confirmation} onChange={event => setConfirmation(event.target.value)} />
                  </div>
                </div>
              </>
            )}
            <button className="btn-primary-auth" type="submit" disabled={pending} aria-busy={pending}>
              {pending ? 'Đang xử lý…' : step === 'email' ? 'Gửi mã OTP' : 'Đặt lại mật khẩu'}
            </button>
            {step === 'reset' && (
              <div className="auth-verify-actions">
                <button className="btn-link-action" type="button" disabled={pending} onClick={sendCode}>Gửi lại mã OTP</button>
                <button className="btn-link-subtle" type="button" disabled={pending} onClick={() => {
                  setStep('email'); setError(''); setNotice(''); setOtp(''); setPassword(''); setConfirmation('');
                }}>Đổi email</button>
              </div>
            )}
          </form>
        )}
        <p className="auth-switch-prompt"><Link className="auth-switch-link" to="/login">Quay về đăng nhập</Link></p>
      </section>
    </main>
  );
}
