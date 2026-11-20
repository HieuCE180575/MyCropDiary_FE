import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '../../shared/components/Modal';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { authenticateWithGoogle, type GoogleAuthRequest } from './authApi';
import type { AuthSession } from './authStorage';
import { signInWithGoogleDirect } from './googleAuthService';

interface GoogleAuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

const PRESET_GOOGLE_ACCOUNTS = [
  {
    email: 'hieuntce180575@fpt.edu.vn',
    name: 'Hieu Nguyen',
    avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    desc: 'Tài khoản Sinh viên FPT',
  },
  {
    email: 'nongdan.vietgap@gmail.com',
    name: 'Nguyễn Văn Nông (VietGAP)',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
    desc: 'Chủ trang trại VietGAP',
  },
  {
    email: 'kythuat.dalatfarm@gmail.com',
    name: 'Lê Hoàng Kỹ Thuật',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    desc: 'Kỹ sư Nông nghiệp Hiện trường',
  },
];

export function GoogleAuthModal({ isOpen, mode, onClose, onSuccess }: GoogleAuthModalProps) {
  const { t: translate } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual fallback form
  const [showManual, setShowManual] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setShowManual(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLaunchGooglePopup = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await signInWithGoogleDirect();
      onSuccess(session);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      if (msg.includes('hủy') || msg.includes('cancelled') || msg.includes('access_denied')) {
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualPayload = async (payload: GoogleAuthRequest) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authenticateWithGoogle(payload);
      onSuccess(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    const email = customEmail.trim();
    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email Google hợp lệ.');
      return;
    }
    void handleManualPayload({
      email,
      fullName: customName.trim() || email.split('@')[0],
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    });
  };

  return (
    <Modal structured open={isOpen} customLayout onClose={onClose} style={{ width: 'min(490px, 100%)' }}>
      <div className="modal-body" style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27A7.195 7.195 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.966 11.966 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text, #0f172a)' }}>
                {mode === 'login' ? translate('Sign in with Google') : translate('Register with Google')}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--color-muted, #64748b)' }}>
                Google OAuth 2.0 • {translate('Instant, secure login via Google OAuth2')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: 'var(--color-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--color-danger-bg, #fef2f2)',
              border: '1px solid var(--color-border, #fecaca)',
              color: 'var(--color-danger, #b91c1c)',
              fontSize: '13.5px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            ⚠️ {translate(error)}
          </div>
        )}

        {/* Primary Action: Official Google Account Chooser */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleLaunchGooglePopup()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '14px 20px',
              borderRadius: '14px',
              border: '2px solid #4285f4',
              background: '#f8fafc',
              color: '#1e293b',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(66, 133, 244, 0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27A7.195 7.195 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.966 11.966 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>{loading ? translate('Authenticating...') : translate('Chọn tài khoản Google trên máy bạn')}</span>
          </button>
          <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: '12px', color: 'var(--color-muted, #64748b)' }}>
            Popup Google chính thức sẽ hiển thị tất cả các tài khoản bạn đã đăng nhập.
          </p>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border, #e2e8f0)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted, #94a3b8)', textTransform: 'uppercase' }}>
            {translate('hoặc đăng nhập nhanh demo')}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border, #e2e8f0)' }} />
        </div>

        {/* Preset accounts or manual */}
        {!showManual ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {PRESET_GOOGLE_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void handleManualPayload({
                      email: acc.email,
                      fullName: acc.name,
                      avatarUrl: acc.avatar,
                    })
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--color-border, #e2e8f0)',
                    background: 'var(--color-surface, #ffffff)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://lh3.googleusercontent.com/a/default-user=s96-c';
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '13.5px', color: 'var(--color-text, #0f172a)' }}>{acc.name}</strong>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-muted, #64748b)' }}>{acc.email}</span>
                  </div>
                  <span style={{ color: 'var(--color-primary-text, #10b981)', fontSize: '15px', fontWeight: 700 }}>→</span>
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowManual(true)}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary-text, #059669)',
                  fontSize: '13px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {translate('+ Use another Google account...')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="structured-field-card">
              <label htmlFor="google-auth-modal-field-1">{translate('Google Account Email *')}</label>
              <input
                id="google-auth-modal-field-1"
                className="ui-input"
                type="email"
                required
                placeholder="your.email@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px' }}
              />
            </div>

            <div className="structured-field-card">
              <label htmlFor="google-auth-modal-field-2">{translate('Full Name')}</label>
              <input
                id="google-auth-modal-field-2"
                className="ui-input"
                type="text"
                placeholder={translate('John Doe')}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button className="ui-back-action"
                type="button"
                onClick={() => setShowManual(false)}
                disabled={loading}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  background: 'var(--color-surface, #ffffff)',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                {translate('Back')}
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--color-primary, #059669)',
                  color: '#ffffff',
                  fontWeight: 650,
                  fontSize: '13.5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? translate('Authenticating...') : translate('Sign In Now')}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
