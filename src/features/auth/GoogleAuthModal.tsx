import { useState, useEffect, type FormEvent } from 'react';
import { authenticateWithGoogle, type GoogleAuthRequest } from './authApi';
import type { AuthSession } from './authStorage';

interface GoogleAuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          prompt: () => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const PRESET_GOOGLE_ACCOUNTS = [
  {
    email: 'hieuntce180575@fpt.edu.vn',
    name: 'Hiếu Nguyễn',
    avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    desc: 'Tài khoản Google sinh viên FPT',
  },
  {
    email: 'nongdan.vietgap@gmail.com',
    name: 'Nguyễn Văn Nông (VietGAP)',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
    desc: 'Hộ nông dân liên kết tiêu chuẩn VietGAP',
  },
  {
    email: 'kythuat.dalatfarm@gmail.com',
    name: 'Lê Hoàng Kỹ Thuật',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    desc: 'Kỹ sư nông nghiệp quản lý vùng trồng',
  },
];

export function GoogleAuthModal({ isOpen, mode, onClose, onSuccess }: GoogleAuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Google account form
  const [isCustom, setIsCustom] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsCustom(false);
      return;
    }

    // Attempt GSI prompt if client ID configured and google script present
    if (clientId && typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            if (resp.credential) {
              void handleGooglePayload({ idToken: resp.credential });
            }
          },
        });
        window.google.accounts.id.prompt();
      } catch {
        // Fallback to modal dialog
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const handleGooglePayload = async (payload: GoogleAuthRequest) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authenticateWithGoogle(payload);
      onSuccess(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác thực Google thất bại. Vui lòng thử lại.');
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
    void handleGooglePayload({
      email,
      fullName: customName.trim() || email.split('@')[0],
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    });
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="modal-card"
        style={{
          width: 'min(480px, 100%)',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.25)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27A7.195 7.195 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.966 11.966 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {mode === 'login' ? 'Đăng nhập với Google' : 'Đăng ký nhanh với Google'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                Đăng nhập tức thì, bảo mật và an toàn qua Google OAuth2
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13.5px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Account Selector */}
        {!isCustom ? (
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: '0 0 10px' }}>
              Chọn tài khoản Google để tiếp tục:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {PRESET_GOOGLE_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void handleGooglePayload({
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
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#10b981';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://lh3.googleusercontent.com/a/default-user=s96-c';
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>{acc.name}</strong>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#64748b' }}>{acc.email}</span>
                  </div>
                  <span style={{ color: '#10b981', fontSize: '16px', fontWeight: 700 }}>→</span>
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#059669',
                  fontSize: '13px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                + Sử dụng tài khoản Google khác...
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Email tài khoản Google *
              </label>
              <input
                type="email"
                required
                placeholder="ten.nguoidung@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Họ và tên
              </label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsCustom(false)}
                disabled={loading}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 650,
                  fontSize: '13.5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

