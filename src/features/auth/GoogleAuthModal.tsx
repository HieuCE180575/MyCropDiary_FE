import { Modal } from '../../shared/components/Modal';

import { useLanguage } from '../../shared/i18n/LanguageContext';
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
    name: 'Hieu Nguyen',
    avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    desc: 'FPT University Student Account',
  },
  {
    email: 'nongdan.vietgap@gmail.com',
    name: 'Nguyen Van Nong (VietGAP)',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
    desc: 'VietGAP Certified Farmer Account',
  },
  {
    email: 'kythuat.dalatfarm@gmail.com',
    name: 'Le Hoang Technical',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    desc: 'Agricultural Area Field Engineer',
  },
];

export function GoogleAuthModal({ isOpen, mode, onClose, onSuccess }: GoogleAuthModalProps) {
  const { t: translate } = useLanguage();
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
      setError(err instanceof Error ? err.message : 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    const email = customEmail.trim();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid Google email address.');
      return;
    }
    void handleGooglePayload({
      email,
      fullName: customName.trim() || email.split('@')[0],
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    });
  };

  return (
    <Modal open={isOpen} customLayout onClose={onClose} style={{ width: 'min(480px, 100%)' }}>
      <div className="modal-body">
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: "var(--color-text)" }}>
                {mode === 'login' ? translate("Sign in with Google") : translate("Register with Google")}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: "var(--color-muted)" }}>{translate("Instant, secure login via Google OAuth2")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={translate("Close")}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              color: "var(--color-muted)",
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
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-border)",
              color: "var(--color-danger)",
              fontSize: '13.5px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            ⚠️ {translate(error)}
          </div>
        )}

        {/* Account Selector */}
        {!isCustom ? (
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: "var(--color-body)", margin: '0 0 10px' }}>{translate("Choose a Google account to continue:")}</p>
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
                    border: "1.5px solid var(--color-border)",
                    background: "var(--color-surface)",
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = 'var(--color-page)';
                      e.currentTarget.style.borderColor = 'var(--color-primary-text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
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
                    <strong style={{ display: 'block', fontSize: '14px', color: "var(--color-text)" }}>{acc.name}</strong>
                    <span style={{ display: 'block', fontSize: '12.5px', color: "var(--color-muted)" }}>{acc.email}</span>
                  </div>
                  <span style={{ color: 'var(--color-primary-text)', fontSize: '16px', fontWeight: 700 }}>→</span>
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
                  color: 'var(--color-primary-text)',
                  fontSize: '13px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >{translate("+ Use another Google account...")}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="structured-field-card">
              <label htmlFor="google-auth-modal-field-1">{translate("Google Account Email *")}</label>
              <input id="google-auth-modal-field-1" className="ui-input"
                type="email"
                required
                placeholder="user.name@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px' }}
              />
            </div>

            <div className="structured-field-card">
              <label htmlFor="google-auth-modal-field-2">{translate("Full Name")}</label>
              <input id="google-auth-modal-field-2" className="ui-input"
                type="text"
                placeholder={translate("John Doe")}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px' }}
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
                  border: "1px solid var(--color-input-border)",
                  background: "var(--color-surface)",
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >{translate("Back")}</button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  fontWeight: 650,
                  fontSize: '13.5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? translate("Authenticating...") : translate("Sign In Now")}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
