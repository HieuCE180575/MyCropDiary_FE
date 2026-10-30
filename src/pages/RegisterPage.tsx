import { type FormEvent, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, GoogleAuthModal } from '../features/auth';
import { registerAccount, resendOtp, verifyOtp } from '../features/auth/authApi';
import { Icon } from '../shared/components/Icon';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_CHARS_REGEX = /^[0-9+\s-]*$/;

interface FormValues {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmation: string;
  otp: string;
}

const INITIAL_VALUES: FormValues = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmation: '',
  otp: '',
};

function validateField(field: keyof FormValues, value: string, values: FormValues): string {
  switch (field) {
    case 'fullName': {
      const trimmed = value.trim();
      if (!trimmed) return 'Please enter your full name.';
      if (trimmed.length < 2) return 'Full name must have at least 2 characters.';
      if (trimmed.length > 150) return 'Full name cannot exceed 150 characters.';
      return '';
    }
    case 'email': {
      const trimmed = value.trim();
      if (!trimmed) return 'Please enter your email.';
      if (!EMAIL_REGEX.test(trimmed)) return 'Invalid email format (e.g. user@gmail.com).';
      return '';
    }
    case 'phoneNumber': {
      const raw = value.trim();
      if (!raw) return ''; // Phone number is optional
      if (/[a-zA-Z]/.test(raw)) {
        return 'Phone number must only contain digits, not letters.';
      }
      if (!PHONE_CHARS_REGEX.test(raw)) {
        return 'Phone number can only contain digits and + sign.';
      }
      const cleaned = raw.replace(/[\s.-]/g, '');
      if (!/^(0|\+84)\d{9}$/.test(cleaned)) {
        return 'Phone number must be a valid 10-digit number starting with 0 or +84.';
      }
      return '';
    }
    case 'password': {
      if (!value) return 'Please enter your password.';
      if (value.length < 8) return 'Password must have at least 8 characters.';
      if (value.length > 100) return 'Password cannot exceed 100 characters.';
      if (!/[A-Z]/.test(value)) return 'Password must contain at least 1 uppercase letter.';
      if (!/[a-z]/.test(value)) return 'Password must contain at least 1 lowercase letter.';
      if (!/[^a-zA-Z0-9]/.test(value)) return 'Password must contain at least 1 special character.';
      return '';
    }
    case 'confirmation': {
      if (!value) return 'Please confirm your password.';
      if (value !== values.password) return 'Password confirmation does not match.';
      return '';
    }
    case 'otp': {
      const trimmed = value.trim();
      if (!trimmed) return 'Please enter the OTP code.';
      if (/[^0-9]/.test(trimmed)) return 'OTP code can only contain digits.';
      if (trimmed.length !== 6) return 'OTP code must be exactly 6 digits.';
      return '';
    }
    default:
      return '';
  }
}

const registerBenefits = [
  {
    icon: 'leaf',
    title: 'Quick Registration',
    desc: 'Create a free account in 2 minutes with secure email OTP verification.',
  },
  {
    icon: 'plots',
    title: 'VietGAP Digital Farm',
    desc: 'Easily create production zones, manage plots, and monitor crops scientifically.',
  },
  {
    icon: 'shield',
    title: 'Secure Cloud Storage',
    desc: 'All season diaries and farm records are encrypted and backed up 24/7.',
  },
  {
    icon: 'bot',
    title: 'Smart AI Assistance',
    desc: 'Lookup pest treatments and harvest intervals compliant with export standards.',
  },
];

export function RegisterPage() {
  const { isAuthenticated, setSession } = useAuth();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [pending, setPending] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const errors: Record<keyof FormValues, string> = {
    fullName: validateField('fullName', values.fullName, values),
    email: validateField('email', values.email, values),
    phoneNumber: validateField('phoneNumber', values.phoneNumber, values),
    password: validateField('password', values.password, values),
    confirmation: validateField('confirmation', values.confirmation, values),
    otp: validateField('otp', values.otp, values),
  };

  function handleChange(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (error) setError('');
  }

  function handleBlur(field: keyof FormValues) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function perform(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Action failed. Please try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === 'verify') {
      setTouched((prev) => ({ ...prev, otp: true }));
      const otpError = validateField('otp', values.otp, values);
      if (otpError) {
        const input = event.currentTarget.elements.namedItem('otp') as HTMLInputElement | null;
        input?.focus();
        return;
      }
      void perform(async () => {
        const session = await verifyOtp(values.email, values.otp);
        setSession(session);
      });
      return;
    }

    const registerFields: (keyof FormValues)[] = ['fullName', 'email', 'phoneNumber', 'password', 'confirmation'];
    const nextTouched: Partial<Record<keyof FormValues, boolean>> = {};
    for (const f of registerFields) {
      nextTouched[f] = true;
    }
    setTouched(nextTouched);

    const hasErrors = registerFields.some((f) => Boolean(errors[f]));
    if (hasErrors) {
      const firstInvalid = registerFields.find((f) => Boolean(errors[f]));
      if (firstInvalid) {
        const input = event.currentTarget.elements.namedItem(firstInvalid) as HTMLElement | null;
        input?.focus();
      }
      return;
    }

    void perform(async () => {
      const fullName = values.fullName.trim();
      const email = values.email.trim();
      const password = values.password;
      const phoneNumber = values.phoneNumber.trim();

      await registerAccount({
        fullName,
        email,
        password,
        phoneNumber: phoneNumber || undefined,
      });

      setValues((prev) => ({ ...prev, password: '', confirmation: '', otp: '' }));
      setTouched({});
      setStep('verify');
      setNotice('Account created successfully! Please check your email inbox and spam folder for your 6-digit OTP code.');
    });
  }

  const hasMinLength = values.password.length >= 8 && values.password.length <= 100;
  const hasUpperCase = /[A-Z]/.test(values.password);
  const hasLowerCase = /[a-z]/.test(values.password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(values.password);

  return (
    <main className="auth-page register-page-root">
      {/* Left Column: Benefits Showcase */}
      <section className="auth-showcase" aria-labelledby="register-showcase-title">
        <div className="showcase-inner">
          <div className="showcase-badge">
            <Icon name="shield" />
            <span>Smart &amp; Sustainable Agriculture</span>
          </div>

          <div className="showcase-content">
            <h1 id="register-showcase-title">
              Start your<br />
              <span className="gradient-text">Digital Farming</span><br />
              journey with MyCropDiary.
            </h1>
            <p className="showcase-desc">
              Create a personal account to register your farm, store cultivation logs, and track production according to VietGAP standards.
            </p>
          </div>

          <div className="feature-grid">
            {registerBenefits.map((item) => (
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
              <span className="stat-number">Free</span>
              <span className="stat-label">Get started today</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Register / OTP Form */}
      <section className="auth-panel" aria-label="Create account">
        <div className="auth-card">
          {/* Step Indicator */}
          <div className="step-indicator-bar" aria-label="Registration steps">
            <div className={`step-item ${step === 'register' ? 'is-current' : 'is-done'}`}>
              <span className="step-badge">{step === 'verify' ? <Icon name="check" /> : '1'}</span>
              <span className="step-label">Information</span>
            </div>
            <div className="step-connector" />
            <div className={`step-item ${step === 'verify' ? 'is-current' : ''}`}>
              <span className="step-badge">2</span>
              <span className="step-label">OTP Verification</span>
            </div>
          </div>

          <div className="auth-card-header">
            <div className="auth-card-icon">
              <Icon name={step === 'register' ? 'user-plus' : 'shield'} />
            </div>
            <h2>{step === 'register' ? 'Create New Account' : 'Verify Email Address'}</h2>
            <p>
              {step === 'register'
                ? 'Sign up to start managing your digital farm and crop seasons'
                : `Enter the 6-digit verification code sent to ${values.email || 'your email'}.`}
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

          <form key={step} onSubmit={submit} className="auth-form" aria-busy={pending} noValidate>
            {step === 'register' ? (
              <>
                <div className="form-group">
                  <label htmlFor="reg-fullname">
                    Full Name <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon">
                      <Icon name="user" />
                    </span>
                    <input
                      id="reg-fullname"
                      name="fullName"
                      autoComplete="name"
                      maxLength={150}
                      placeholder="e.g. John Doe"
                      required
                      value={values.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      onBlur={() => handleBlur('fullName')}
                      className={touched.fullName && errors.fullName ? 'is-invalid' : undefined}
                      aria-invalid={Boolean(touched.fullName && errors.fullName)}
                      aria-describedby={touched.fullName && errors.fullName ? 'fullName-error' : undefined}
                    />
                  </div>
                  {touched.fullName && errors.fullName && (
                    <small id="fullName-error" className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{errors.fullName}</span>
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-email">
                    Email Address <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon">
                      <Icon name="mail" />
                    </span>
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      placeholder="user@gmail.com"
                      required
                      value={values.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={touched.email && errors.email ? 'is-invalid' : undefined}
                      aria-invalid={Boolean(touched.email && errors.email)}
                      aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <small id="email-error" className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{errors.email}</span>
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-phone">
                    Phone Number <span className="optional-tag">(optional)</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon">
                      <Icon name="phone" />
                    </span>
                    <input
                      id="reg-phone"
                      name="phoneNumber"
                      type="tel"
                      autoComplete="tel"
                      maxLength={20}
                      placeholder="e.g. 0912345678"
                      value={values.phoneNumber}
                      onChange={(e) => handleChange('phoneNumber', e.target.value)}
                      onBlur={() => handleBlur('phoneNumber')}
                      className={touched.phoneNumber && errors.phoneNumber ? 'is-invalid' : undefined}
                      aria-invalid={Boolean(touched.phoneNumber && errors.phoneNumber)}
                      aria-describedby={touched.phoneNumber && errors.phoneNumber ? 'phoneNumber-error' : undefined}
                    />
                  </div>
                  {touched.phoneNumber && errors.phoneNumber && (
                    <small id="phoneNumber-error" className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{errors.phoneNumber}</span>
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-password">
                    Password <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon">
                      <Icon name="lock" />
                    </span>
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={100}
                      placeholder="From 8 to 100 characters"
                      required
                      value={values.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      className={touched.password && errors.password ? 'is-invalid' : undefined}
                      aria-invalid={Boolean(touched.password && errors.password)}
                      aria-describedby={touched.password && errors.password ? 'password-error' : 'password-hint'}
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
                  {touched.password && errors.password ? (
                    <small id="password-error" className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{errors.password}</span>
                    </small>
                  ) : null}

                  <div
                    id="password-hint"
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
                      Security Requirements:
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
                      8 to 100 characters
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
                      At least 1 uppercase letter (A-Z)
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
                      At least 1 lowercase letter (a-z)
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
                      At least 1 special character (!@#$%^&*...)
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-confirmation">
                    Confirm Password <span className="required-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <span className="input-lead-icon">
                      <Icon name="lock" />
                    </span>
                    <input
                      id="reg-confirmation"
                      name="confirmation"
                      type={showConfirmation ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={100}
                      placeholder="Re-enter password"
                      required
                      value={values.confirmation}
                      onChange={(e) => handleChange('confirmation', e.target.value)}
                      onBlur={() => handleBlur('confirmation')}
                      className={touched.confirmation && errors.confirmation ? 'is-invalid' : undefined}
                      aria-invalid={Boolean(touched.confirmation && errors.confirmation)}
                      aria-describedby={touched.confirmation && errors.confirmation ? 'confirmation-error' : undefined}
                    />
                    <button
                      type="button"
                      className="input-trailing-toggle"
                      onClick={() => setShowConfirmation((prev) => !prev)}
                      aria-label={showConfirmation ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <Icon name={showConfirmation ? 'eye-off' : 'eye'} />
                    </button>
                  </div>
                  {touched.confirmation && errors.confirmation && (
                    <small id="confirmation-error" className="field-error" role="alert">
                      <Icon name="warning" className="field-error-icon" />
                      <span>{errors.confirmation}</span>
                    </small>
                  )}
                </div>
              </>
            ) : (
              <div className="form-group otp-form-group">
                <label htmlFor="reg-otp">
                  Enter 6-digit OTP Code
                </label>
                <div className="input-with-icon otp-input-wrap">
                  <span className="input-lead-icon">
                    <Icon name="shield" />
                  </span>
                  <input
                    id="reg-otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="••••••"
                    required
                    autoFocus
                    value={values.otp}
                    onChange={(e) => handleChange('otp', e.target.value)}
                    onBlur={() => handleBlur('otp')}
                    className={`otp-digit-input ${touched.otp && errors.otp ? 'is-invalid' : ''}`}
                    aria-invalid={Boolean(touched.otp && errors.otp)}
                    aria-describedby={touched.otp && errors.otp ? 'otp-error' : undefined}
                  />
                </div>
                {touched.otp && errors.otp && (
                  <small id="otp-error" className="field-error" role="alert">
                    <Icon name="warning" className="field-error-icon" />
                    <span>{errors.otp}</span>
                  </small>
                )}
              </div>
            )}

            <button
              className="btn-primary-auth"
              type="submit"
              disabled={pending}
              aria-busy={pending}
            >
              <Icon
                name={pending ? 'loader' : step === 'register' ? 'user-plus' : 'shield'}
                className={pending ? 'icon-spin' : undefined}
              />
              <span>{pending ? 'Processing…' : step === 'register' ? 'Register Account' : 'Verify and Sign In'}</span>
            </button>

            {step === 'register' && (
              <>
                <div className="auth-divider">
                  <span>or</span>
                </div>

                <button
                  className="btn-google-auth"
                  type="button"
                  disabled={pending}
                  onClick={() => setIsGoogleModalOpen(true)}
                  title="Sign up quickly with Google"
                >
                  <svg className="google-svg-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27A7.195 7.195 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.966 11.966 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Quick Register with Google</span>
                </button>
              </>
            )}
          </form>

          {step === 'verify' && (
            <div className="auth-verify-actions">
              <button
                type="button"
                className="btn-link-action"
                disabled={pending}
                onClick={() =>
                  void perform(async () => {
                    await resendOtp(values.email);
                    setNotice('OTP code resent. Please check your email.');
                  })
                }
              >
                <Icon name="refresh" />
                <span>Resend OTP Code</span>
              </button>
              <span className="action-divider">•</span>
              <button
                type="button"
                className="btn-link-action"
                disabled={pending}
                onClick={() => {
                  setStep('register');
                  setError('');
                  setNotice('');
                }}
              >
                <span>Change Email / Back</span>
              </button>
            </div>
          )}

          {step === 'register' && (
            <div className="auth-alternative-actions">
              <button
                type="button"
                className="btn-link-subtle"
                disabled={pending}
                onClick={() => {
                  const trimmedEmail = values.email.trim();
                  if (!trimmedEmail) {
                    setTouched((prev) => ({ ...prev, email: true }));
                    setError('Please enter your registered email to continue verification.');
                    return;
                  }
                  if (!EMAIL_REGEX.test(trimmedEmail)) {
                    setTouched((prev) => ({ ...prev, email: true }));
                    setError('Please enter a valid registered email address.');
                    return;
                  }
                  setStep('verify');
                  setError('');
                  setNotice('You can enter your received OTP code or request a new one.');
                }}
              >
                Already registered but haven't verified email?
              </button>
            </div>
          )}

          <p className="auth-switch-prompt">
            Already have an account?{' '}
            <Link to="/login" className="auth-switch-link">
              Sign in now <Icon name="arrow" />
            </Link>
          </p>
        </div>
      </section>
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        mode="register"
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={(session) => setSession(session)}
      />
    </main>
  );
}
