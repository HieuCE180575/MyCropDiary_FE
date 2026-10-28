import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../features/auth/authApi';
import { Icon } from '../shared/components/Icon';

const recoveryBenefits = [
  {
    icon: 'mail',
    title: 'Xác thực OTP qua Email',
    desc: 'Mã xác thực 6 chữ số bảo mật được gửi trực tiếp tới hộp thư điện tử đã đăng ký tài khoản của bạn.',
  },
  {
    icon: 'shield',
    title: 'Tiêu chuẩn mật khẩu an toàn',
    desc: 'Mật khẩu mới được kiểm tra chặt chẽ kết hợp chữ hoa, chữ thường và ký tự đặc biệt để chống xâm nhập.',
  },
  {
    icon: 'leaf',
    title: 'Bảo toàn dữ liệu mùa vụ',
    desc: 'Toàn bộ nhật ký canh tác, phân khu, lô thửa và lịch sử hội thoại AI của bạn được giữ nguyên vẹn 100%.',
  },
  {
    icon: 'lock',
    title: 'Đăng nhập lại tức thì',
    desc: 'Ngay sau khi cập nhật mật khẩu mới thành công, hệ thống tự động chuyển về trang đăng nhập để bạn tiếp tục.',
  },
];

function validateNewPassword(value: string): string {
  if (!value || !value.trim()) return 'Mật khẩu không được chỉ chứa khoảng trắng.';
  if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (value.length > 100) return 'Mật khẩu không được vượt quá 100 ký tự.';
  if (!/[A-Z]/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 chữ in hoa.';
  if (!/[a-z]/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 chữ in thường.';
  if (!/[^a-zA-Z0-9]/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';
  return '';
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirmation, setTouchedConfirmation] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const passwordRuleError = validateNewPassword(password);
  const confirmationRuleError = !confirmation
    ? 'Vui lòng nhập lại mật khẩu mới.'
    : confirmation !== password
      ? 'Mật khẩu nhập lại không khớp.'
      : '';

  const hasMinLength = password.length >= 8 && password.length <= 100;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);

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

    setTouchedPassword(true);
    setTouchedConfirmation(true);
    setError('');

    const pwdError = validateNewPassword(password);
    if (pwdError) {
      setError(pwdError);
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
      navigate('/login', {
        replace: true,
        state: {
          notice: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.',
        },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không đặt lại được mật khẩu. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page forgot-password-page">
      {/* Cột trái: Showcase bảo mật & hướng dẫn khôi phục mật khẩu */}
      <section className="auth-showcase" aria-labelledby="forgot-showcase-title">
        <div className="showcase-inner">
          <div className="showcase-badge">
            <Icon name="shield" />
            <span>Bảo mật Tài khoản &amp; Dữ liệu VietGAP</span>
          </div>

          <div className="showcase-content">
            <h1 id="forgot-showcase-title">
              Khôi phục truy cập<br />
              <span className="gradient-text">Tài khoản MyCropDiary</span><br />
              An toàn &amp; Nhanh chóng.
            </h1>
            <p className="showcase-desc">
              Xác thực bảo mật hai lớp qua mã OTP email giúp bạn đặt lại mật khẩu mới chỉ trong vài bước mà vẫn bảo vệ tuyệt đối dữ liệu trang trại.
            </p>
          </div>

          <div className="feature-grid">
            {recoveryBenefits.map((item) => (
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
              <span className="stat-number">OTP 6 số</span>
              <span className="stat-label">Xác thực email tức thì</span>
            </div>
            <div className="highlight-divider" />
            <div className="highlight-stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">An toàn dữ liệu nông trại</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cột phải: Form Quên mật khẩu & Đặt lại mật khẩu */}
      <section className="auth-panel" aria-labelledby="forgot-password-title">
        <div className="auth-card">
          {/* Thanh chỉ báo bước (Step indicator) */}
          <div className="step-indicator-bar" aria-label="Các bước khôi phục mật khẩu">
            <div className={`step-item ${step === 'email' ? 'is-current' : 'is-done'}`}>
              <span className="step-badge">{step === 'reset' ? <Icon name="check" /> : '1'}</span>
              <span className="step-label">Xác nhận Email</span>
            </div>
            <div className="step-connector" />
            <div className={`step-item ${step === 'reset' ? 'is-current' : ''}`}>
              <span className="step-badge">2</span>
              <span className="step-label">Đặt mật khẩu mới</span>
            </div>
          </div>

          <div className="auth-card-header">
            <div className="auth-card-icon">
              <Icon name={step === 'email' ? 'lock' : 'shield'} />
            </div>
            <h2 id="forgot-password-title">
              {step === 'email' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu mới'}
            </h2>
            <p>
              {step === 'email'
                ? 'Nhập email tài khoản để nhận mã OTP đặt lại mật khẩu.'
                : `Nhập mã OTP gửi tới ${email} và thiết lập mật khẩu mới an toàn.`}
            </p>
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

          <form className="auth-form" onSubmit={submit}>
            {step === 'email' ? (
              <div className="form-group">
                <label htmlFor="recovery-email">
                  Địa chỉ Email <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <span className="input-lead-icon"><Icon name="mail" /></span>
                  <input
                    id="recovery-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    maxLength={254}
                    placeholder="name@example.com"
                    disabled={pending}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError('');
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="recovery-otp">
                    Mã xác thực OTP <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon"><Icon name="shield" /></span>
                    <input
                      id="recovery-otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      required
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="Nhập mã gồm 6 chữ số"
                      disabled={pending}
                      value={otp}
                      onChange={(event) => {
                        setOtp(event.target.value);
                        if (error) setError('');
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="recovery-password">
                    Mật khẩu mới <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon"><Icon name="lock" /></span>
                    <input
                      id="recovery-password"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={100}
                      placeholder="Từ 8 đến 100 ký tự"
                      disabled={pending}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setTouchedPassword(true);
                        if (error) setError('');
                      }}
                      onBlur={() => setTouchedPassword(true)}
                      className={touchedPassword && passwordRuleError ? 'is-invalid' : undefined}
                      aria-invalid={Boolean(touchedPassword && passwordRuleError)}
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
                  {touchedPassword && passwordRuleError && (
                    <small className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{passwordRuleError}</span>
                    </small>
                  )}

                  <div
                    id="recovery-password-hint"
                    className="password-rules-box"
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontWeight: 650, color: '#334155', marginBottom: '2px' }}>
                      Yêu cầu mật khẩu an toàn:
                    </span>
                    <span
                      style={{
                        color: hasMinLength ? '#16a34a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: hasMinLength ? 600 : 400,
                      }}
                    >
                      <Icon name={hasMinLength ? 'check' : 'shield'} size={12} />
                      Từ 8 đến 100 ký tự
                    </span>
                    <span
                      style={{
                        color: hasUpperCase ? '#16a34a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: hasUpperCase ? 600 : 400,
                      }}
                    >
                      <Icon name={hasUpperCase ? 'check' : 'shield'} size={12} />
                      Có ít nhất 1 chữ in hoa (A-Z)
                    </span>
                    <span
                      style={{
                        color: hasLowerCase ? '#16a34a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: hasLowerCase ? 600 : 400,
                      }}
                    >
                      <Icon name={hasLowerCase ? 'check' : 'shield'} size={12} />
                      Có ít nhất 1 chữ in thường (a-z)
                    </span>
                    <span
                      style={{
                        color: hasSpecialChar ? '#16a34a' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: hasSpecialChar ? 600 : 400,
                      }}
                    >
                      <Icon name={hasSpecialChar ? 'check' : 'shield'} size={12} />
                      Có ít nhất 1 ký tự đặc biệt (!@#$%^&amp;*...)
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="recovery-confirmation">
                    Nhập lại mật khẩu mới <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon"><Icon name="lock" /></span>
                    <input
                      id="recovery-confirmation"
                      name="confirmPassword"
                      type={showConfirmation ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={100}
                      placeholder="Nhập lại chính xác mật khẩu mới"
                      disabled={pending}
                      value={confirmation}
                      onChange={(event) => {
                        setConfirmation(event.target.value);
                        setTouchedConfirmation(true);
                        if (error) setError('');
                      }}
                      onBlur={() => setTouchedConfirmation(true)}
                      className={touchedConfirmation && confirmationRuleError ? 'is-invalid' : undefined}
                      aria-invalid={Boolean(touchedConfirmation && confirmationRuleError)}
                    />
                    <button
                      type="button"
                      className="input-trailing-toggle"
                      onClick={() => setShowConfirmation((prev) => !prev)}
                      aria-label={showConfirmation ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                      tabIndex={-1}
                    >
                      <Icon name={showConfirmation ? 'eye-off' : 'eye'} />
                    </button>
                  </div>
                  {touchedConfirmation && confirmationRuleError && (
                    <small className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{confirmationRuleError}</span>
                    </small>
                  )}
                </div>
              </>
            )}

            <button className="btn-primary-auth" type="submit" disabled={pending} aria-busy={pending}>
              <Icon
                name={pending ? 'loader' : step === 'email' ? 'mail' : 'check'}
                className={pending ? 'icon-spin' : undefined}
              />
              <span>{pending ? 'Đang xử lý…' : step === 'email' ? 'Gửi mã OTP' : 'Đặt lại mật khẩu'}</span>
            </button>

            {step === 'reset' && (
              <div className="auth-verify-actions">
                <button className="btn-link-action" type="button" disabled={pending} onClick={sendCode}>
                  Gửi lại mã OTP
                </button>
                <button
                  className="btn-link-subtle"
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setStep('email');
                    setError('');
                    setNotice('');
                    setOtp('');
                    setPassword('');
                    setConfirmation('');
                    setTouchedPassword(false);
                    setTouchedConfirmation(false);
                  }}
                >
                  Đổi email
                </button>
              </div>
            )}

            <p className="auth-switch-prompt">
              Đã nhớ mật khẩu?{' '}
              <Link className="auth-switch-link" to="/login">
                Quay về đăng nhập <Icon name="arrow" />
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
