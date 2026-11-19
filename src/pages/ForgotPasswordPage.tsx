import { Link } from 'react-router-dom';
import { Icon } from '../shared/components/Icon';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../features/auth/authApi';


const recoveryBenefits = [
  {
    icon: 'mail',
    title: 'Email OTP Verification',
    desc: 'A secure 6-digit verification code is delivered directly to your registered email address.',
  },
  {
    icon: 'shield',
    title: 'High Security Standards',
    desc: 'Passwords are validated against strict criteria combining uppercase, lowercase, and special characters.',
  },
  {
    icon: 'leaf',
    title: 'Farm Data Preservation',
    desc: 'All cultivation diaries, zones, plots, and AI chat history remain 100% intact and secured.',
  },
  {
    icon: 'lock',
    title: 'Instant Sign In',
    desc: 'Once your new password is saved, return straight to the sign-in page to resume operations.',
  },
];

function validateNewPassword(value: string): string {
  if (!value || !value.trim()) return 'Password cannot contain only whitespace.';
  if (value.length < 8) return 'Password must have at least 8 characters.';
  if (value.length > 100) return 'Password cannot exceed 100 characters.';
  if (!/[A-Z]/.test(value)) return 'Password must contain at least 1 uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Password must contain at least 1 lowercase letter.';
  if (!/[^a-zA-Z0-9]/.test(value)) return 'Password must contain at least 1 special character.';
  return '';
}

export function ForgotPasswordPage() {
  const { lang, t: translate } = useLanguage();
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
    ? 'Please re-enter your new password.'
    : confirmation !== password
      ? 'Password confirmation does not match.'
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
      setNotice('If the email belongs to an activated account, an OTP code has been sent. Please also check your spam folder.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send OTP code. Please try again.');
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
      setError('Password confirmation does not match.');
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
          notice: 'Password reset successfully! Please sign in with your new password.',
        },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to reset password. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page forgot-password-page">
      {/* Left Column: Security & Recovery Showcase */}
      <section className="auth-showcase" aria-labelledby="forgot-showcase-title">
        <div className="showcase-inner">
          <div className="showcase-badge">
            <Icon name="shield" />
            <span>{translate("Account Security & VietGAP Data")}</span>
          </div>

          <div className="showcase-content">
            <h1 id="forgot-showcase-title">{translate("Recover Access to")}<br />
              <span className="gradient-text">{translate("MyCropDiary Account")}</span><br />{translate("Safely & Quickly.")}</h1>
            <p className="showcase-desc">{translate("Two-factor email OTP verification allows you to set a new password in minutes while keeping your farm data completely confidential.")}</p>
          </div>

          <div className="feature-grid">
            {recoveryBenefits.map((item) => (
              <article className="feature-card" key={item.title}>
                <div className="feature-icon-wrapper">
                  <Icon name={item.icon} className="feature-icon" />
                </div>
                <div className="feature-body">
                  <strong>{translate(item.title)}</strong>
                  <p>{item.desc}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="showcase-highlight-card">
            <div className="highlight-stat">
              <span className="stat-number">{translate('6-Digit OTP')}</span>
              <span className="stat-label">{translate("Instant email verification")}</span>
            </div>
            <div className="highlight-divider" />
            <div className="highlight-stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">{translate("Farm data secured")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Reset Password Form */}
      <section className="auth-panel" aria-labelledby="forgot-password-title">
        <div className="auth-card">
          {/* Step Indicator */}
          <div className="step-indicator-bar" aria-label={translate("Password recovery steps")}>
            <div className={`step-item ${step === 'email' ? 'is-current' : 'is-done'}`}>
              <span className="step-badge">{step === 'reset' ? <Icon name="check" /> : '1'}</span>
              <span className="step-label">{translate("Confirm Email")}</span>
            </div>
            <div className="step-connector" />
            <div className={`step-item ${step === 'reset' ? 'is-current' : ''}`}>
              <span className="step-badge">2</span>
              <span className="step-label">{translate("Set New Password")}</span>
            </div>
          </div>

          <div className="auth-card-header">
            <div className="auth-card-icon">
              <Icon name={step === 'email' ? 'lock' : 'shield'} />
            </div>
            <h2 id="forgot-password-title">
              {step === 'email' ? translate("Forgot Password") : translate("Set New Password")}
            </h2>
            <p>
              {step === 'email'
                ? translate("Enter your account email to receive an OTP code to reset your password.")
                : lang === 'en' ? `Enter the OTP code sent to ${email} and set a secure new password.` : `Nhập mã OTP đã gửi đến ${email} và đặt mật khẩu mới an toàn.`}
            </p>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <Icon name="warning" />
              <span>{translate(error)}</span>
            </div>
          )}

          {notice && (
            <div className="auth-notice-banner" role="status">
              <Icon name="check-circle" />
              <span>{translate(notice)}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            {step === 'email' ? (
              <div className="form-group structured-field-card">
                <label htmlFor="recovery-email">{translate("Email Address")}{' '}<span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <span className="input-lead-icon" aria-hidden="true"><Icon name="mail" /></span>
                  <input className="ui-input"
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
                <div className="form-group structured-field-card">
                  <label htmlFor="recovery-otp">{translate("OTP Verification Code")}{' '}<span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon" aria-hidden="true"><Icon name="shield" /></span>
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
                      placeholder={translate("Enter 6-digit code")}
                      disabled={pending}
                      value={otp}
                      onChange={(event) => {
                        setOtp(event.target.value);
                        if (error) setError('');
                      }}
                    />
                  </div>
                </div>

                <div className="form-group structured-field-card">
                  <label htmlFor="recovery-password">{translate("New Password")}{' '}<span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon" aria-hidden="true"><Icon name="lock" /></span>
                    <input
                      id="recovery-password"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={100}
                      placeholder={translate("From 8 to 100 characters")}
                      disabled={pending}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setTouchedPassword(true);
                        if (error) setError('');
                      }}
                      onBlur={() => setTouchedPassword(true)}
                      className={(((touchedPassword && passwordRuleError ? 'is-invalid' : undefined)) ?? '') + ' ui-input'}
                      aria-invalid={Boolean(touchedPassword && passwordRuleError)}
                    />
                    <button
                      type="button"
                      className="input-trailing-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={(lang === 'en' ? showPassword ? "Hide password" : "Show password" : showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')}
                      tabIndex={-1}
                    >
                      <Icon name={showPassword ? 'eye-off' : 'eye'} />
                    </button>
                  </div>
                  {touchedPassword && passwordRuleError && (
                    <small className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{translate(passwordRuleError)}</span>
                    </small>
                  )}

                  <div
                    id="recovery-password-hint"
                    className="password-rules-box"
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: 'var(--color-page)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontWeight: 650, color: 'var(--color-body)', marginBottom: '2px' }}>{translate("Security Requirements:")}</span>
                    <span
                      style={{
                        color: hasMinLength ? 'var(--color-success)' : 'var(--color-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: hasMinLength ? 600 : 400,
                      }}
                    >
                      <Icon name={hasMinLength ? 'check' : 'shield'} size={12} />
                      {translate('8 to 100 characters')}
                    </span>
                    <span
                      style={{
                        color: hasUpperCase ? 'var(--color-success)' : 'var(--color-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: hasUpperCase ? 600 : 400,
                      }}
                    >
                      <Icon name={hasUpperCase ? 'check' : 'shield'} size={12} />{translate("At least 1 uppercase letter (A-Z)")}</span>
                    <span
                      style={{
                        color: hasLowerCase ? 'var(--color-success)' : 'var(--color-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: hasLowerCase ? 600 : 400,
                      }}
                    >
                      <Icon name={hasLowerCase ? 'check' : 'shield'} size={12} />{translate("At least 1 lowercase letter (a-z)")}</span>
                    <span
                      style={{
                        color: hasSpecialChar ? 'var(--color-success)' : 'var(--color-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: hasSpecialChar ? 600 : 400,
                      }}
                    >
                      <Icon name={hasSpecialChar ? 'check' : 'shield'} size={12} />
                      {translate('At least 1 special character (!@#$%^&*...)')}
                    </span>
                  </div>
                </div>

                <div className="form-group structured-field-card">
                  <label htmlFor="recovery-confirmation">{translate("Confirm New Password")}{' '}<span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon" aria-hidden="true"><Icon name="lock" /></span>
                    <input
                      id="recovery-confirmation"
                      name="confirmPassword"
                      type={showConfirmation ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={100}
                      placeholder={translate("Re-enter your new password")}
                      disabled={pending}
                      value={confirmation}
                      onChange={(event) => {
                        setConfirmation(event.target.value);
                        setTouchedConfirmation(true);
                        if (error) setError('');
                      }}
                      onBlur={() => setTouchedConfirmation(true)}
                      className={(((touchedConfirmation && confirmationRuleError ? 'is-invalid' : undefined)) ?? '') + ' ui-input'}
                      aria-invalid={Boolean(touchedConfirmation && confirmationRuleError)}
                    />
                    <button
                      type="button"
                      className="input-trailing-toggle"
                      onClick={() => setShowConfirmation((prev) => !prev)}
                      aria-label={(lang === 'en' ? showConfirmation ? "Hide password confirmation" : "Show password confirmation" : showConfirmation ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận')}
                      tabIndex={-1}
                    >
                      <Icon name={showConfirmation ? 'eye-off' : 'eye'} />
                    </button>
                  </div>
                  {touchedConfirmation && confirmationRuleError && (
                    <small className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{translate(confirmationRuleError)}</span>
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
              <span>{pending ? translate("Processing…") : step === 'email' ? translate("Send OTP Code") : translate("Reset Password")}</span>
            </button>

            {step === 'reset' && (
              <div className="auth-verify-actions">
                <button className="btn-link-action" type="button" disabled={pending} onClick={sendCode}>{translate("Resend OTP Code")}</button>
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
                >{translate("Change Email")}</button>
              </div>
            )}

            <p className="auth-switch-prompt">{translate("Remembered your password?")}{' '}
              <Link className="auth-switch-link ui-back-action" to="/login">{translate("Back to sign in")}{' '}
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
