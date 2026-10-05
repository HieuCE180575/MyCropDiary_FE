import { type FormEvent, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
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
      if (!trimmed) return 'Vui lòng nhập họ tên.';
      if (trimmed.length < 2) return 'Họ tên phải có ít nhất 2 ký tự.';
      if (trimmed.length > 150) return 'Họ tên không được vượt quá 150 ký tự.';
      return '';
    }
    case 'email': {
      const trimmed = value.trim();
      if (!trimmed) return 'Vui lòng nhập email.';
      if (!EMAIL_REGEX.test(trimmed)) return 'Email không đúng định dạng (ví dụ: ten@gmail.com).';
      return '';
    }
    case 'phoneNumber': {
      const raw = value.trim();
      if (!raw) return ''; // Số điện thoại là không bắt buộc
      if (/[a-zA-Z]/.test(raw)) {
        return 'Số điện thoại chỉ được chứa chữ số, không được chứa chữ cái.';
      }
      if (!PHONE_CHARS_REGEX.test(raw)) {
        return 'Số điện thoại chỉ được chứa chữ số và dấu +.';
      }
      const cleaned = raw.replace(/[\s.-]/g, '');
      if (!/^(0|\+84)\d{9}$/.test(cleaned)) {
        return 'Số điện thoại không đúng định dạng (gồm 10 số, bắt đầu bằng 0).';
      }
      return '';
    }
    case 'password': {
      if (!value) return 'Vui lòng nhập mật khẩu.';
      if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
      if (new TextEncoder().encode(value).length > 72) return 'Mật khẩu quá dài. Vui lòng dùng tối đa 72 byte ký tự.';
      return '';
    }
    case 'confirmation': {
      if (!value) return 'Vui lòng nhập lại mật khẩu.';
      if (value !== values.password) return 'Mật khẩu xác nhận không khớp.';
      return '';
    }
    case 'otp': {
      const trimmed = value.trim();
      if (!trimmed) return 'Vui lòng nhập mã OTP.';
      if (/[^0-9]/.test(trimmed)) return 'Mã OTP chỉ được chứa chữ số.';
      if (trimmed.length !== 6) return 'Mã OTP phải gồm đúng 6 chữ số.';
      return '';
    }
    default:
      return '';
  }
}

const registerBenefits = [
  {
    icon: 'leaf',
    title: 'Khởi tạo nhanh chóng',
    desc: 'Đăng ký tài khoản miễn phí chỉ trong 2 phút, kích hoạt xác thực bảo mật OTP email.',
  },
  {
    icon: 'plots',
    title: 'Số hoá trang trại chuẩn VietGAP',
    desc: 'Dễ dàng tạo vùng canh tác, quản lý lô thửa và theo dõi tình trạng cây trồng khoa học.',
  },
  {
    icon: 'shield',
    title: 'Lưu trữ an toàn đám mây',
    desc: 'Toàn bộ hồ sơ mùa vụ và chứng từ nông trại được bảo mật, sao lưu định kỳ 24/7.',
  },
  {
    icon: 'bot',
    title: 'Hỗ trợ kỹ thuật thông minh',
    desc: 'Tra cứu kiến thức phòng trừ sâu bệnh, cách ly thuốc BVTV đạt chuẩn xuất khẩu.',
  },
];

export function RegisterPage() {
  const { isAuthenticated, setSession } = useAuth();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [pending, setPending] = useState(false);
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
      setError(reason instanceof Error ? reason.message : 'Yêu cầu không thành công. Vui lòng thử lại.');
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
      setNotice('Đã tạo tài khoản thành công! Vui lòng kiểm tra email và thư rác để lấy mã OTP.');
    });
  }

  return (
    <main className="auth-page register-page-root">
      {/* Cột trái: Showcase lợi ích tạo tài khoản */}
      <section className="auth-showcase" aria-labelledby="register-showcase-title">
        <div className="showcase-inner">
          <div className="showcase-badge">
            <Icon name="shield" />
            <span>Nông nghiệp Thông minh &amp; Bền vững</span>
          </div>

          <div className="showcase-content">
            <h1 id="register-showcase-title">
              Bắt đầu hành trình<br />
              <span className="gradient-text">Số hoá nông trại</span><br />
              cùng MyCropDiary.
            </h1>
            <p className="showcase-desc">
              Tạo tài khoản cá nhân để chuẩn bị đăng ký thông tin trang trại, lưu trữ dữ liệu canh tác và theo dõi sản xuất theo chuẩn VietGAP.
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
              <span className="stat-label">Bản ghi nhật ký đã tạo</span>
            </div>
            <div className="highlight-divider" />
            <div className="highlight-stat">
              <span className="stat-number">Miễn phí</span>
              <span className="stat-label">Bắt đầu trải nghiệm ngay</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cột phải: Form Đăng ký / Xác thực */}
      <section className="auth-panel" aria-label="Tạo tài khoản">
        <div className="auth-card">
          {/* Thanh chỉ báo bước (Step indicator) */}
          <div className="step-indicator-bar" aria-label="Các bước đăng ký">
            <div className={`step-item ${step === 'register' ? 'is-current' : 'is-done'}`}>
              <span className="step-badge">{step === 'verify' ? <Icon name="check" /> : '1'}</span>
              <span className="step-label">Thông tin</span>
            </div>
            <div className="step-connector" />
            <div className={`step-item ${step === 'verify' ? 'is-current' : ''}`}>
              <span className="step-badge">2</span>
              <span className="step-label">Xác thực OTP</span>
            </div>
          </div>

          <div className="auth-card-header">
            <div className="auth-card-icon">
              <Icon name={step === 'register' ? 'user-plus' : 'shield'} />
            </div>
            <h2>{step === 'register' ? 'Tạo tài khoản mới' : 'Xác thực địa chỉ Email'}</h2>
            <p>
              {step === 'register'
                ? 'Đăng ký tài khoản để bắt đầu quản lý trang trại của bạn'
                : `Nhập mã xác thực gồm 6 chữ số vừa được gửi tới email ${values.email || 'của bạn'}.`}
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
                    Họ và tên <span className="required-star">*</span>
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
                      placeholder="VD: Nguyễn Văn Nông"
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
                    Địa chỉ Email <span className="required-star">*</span>
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
                      placeholder="nongdan@gmail.com"
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
                    Số điện thoại <span className="optional-tag">(không bắt buộc)</span>
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
                      placeholder="VD: 0912345678"
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
                    Mật khẩu <span className="required-star">*</span>
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
                      maxLength={72}
                      placeholder="Ít nhất 8 ký tự"
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
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                  ) : (
                    <small id="password-hint" className="field-hint">
                      Mật khẩu tối thiểu 8 ký tự bảo mật.
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-confirmation">
                    Nhập lại mật khẩu <span className="required-star">*</span>
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
                      maxLength={72}
                      placeholder="Nhập lại chính xác mật khẩu"
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
                      aria-label={showConfirmation ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                  Nhập mã OTP gồm 6 chữ số
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
              <span>{pending ? 'Đang xử lý…' : step === 'register' ? 'Đăng ký tài khoản' : 'Xác thực và đăng nhập'}</span>
            </button>
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
                    setNotice('Đã gửi lại mã OTP. Vui lòng kiểm tra email của bạn.');
                  })
                }
              >
                <Icon name="refresh" />
                <span>Gửi lại mã OTP</span>
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
                <span>Đổi email / Quay lại</span>
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
                    setError('Nhập email đã đăng ký để tiếp tục xác thực.');
                    return;
                  }
                  if (!EMAIL_REGEX.test(trimmedEmail)) {
                    setTouched((prev) => ({ ...prev, email: true }));
                    setError('Vui lòng nhập đúng định dạng email đã đăng ký.');
                    return;
                  }
                  setStep('verify');
                  setError('');
                  setNotice('Bạn có thể nhập mã OTP đã nhận hoặc yêu cầu gửi lại mã mới.');
                }}
              >
                Đã đăng ký nhưng chưa xác thực email?
              </button>
            </div>
          )}

          <p className="auth-switch-prompt">
            Đã có tài khoản?{' '}
            <Link to="/login" className="auth-switch-link">
              Đăng nhập ngay <Icon name="arrow" />
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
