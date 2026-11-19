import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';

import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useState, type FormEvent } from 'react';

import { changeUserPassword } from './authApi';

interface PasswordFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  current?: boolean;
  disabled?: boolean;
}

function PasswordField({ name, label, value, onChange, current = false, disabled = false }: PasswordFieldProps) {
  const { t: translate } = useLanguage();
  const [visible, setVisible] = useState(false);
  return (
    <label className="profile-password-field structured-field-card">
      <span>{translate(label)}</span>
      <span className="profile-password-input">
        <Icon name="lock" />
        <input className="ui-input"
          name={name}
          type={visible ? 'text' : 'password'}
          placeholder={translate(label)}
          autoComplete={current ? 'current-password' : 'new-password'}
          minLength={current ? undefined : 8}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={`${translate(visible ? 'Hide' : 'Show')} ${translate(label)}`}
          aria-pressed={visible}
          tabIndex={-1}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} />
        </button>
      </span>
    </label>
  );
}

export function ChangePasswordPanel({
  embedded = false,
  onSuccess,
}: {
  embedded?: boolean;
  onSuccess?: () => void;
} = {}) {
  const { t: translate } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!currentPassword) {
      setStatus({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setStatus({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword === currentPassword) {
      setStatus({ type: 'error', message: 'New password cannot be the same as your current password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Password confirmation does not match. Please re-enter.' });
      return;
    }

    setLoading(true);
    try {
      await changeUserPassword({ currentPassword, newPassword, confirmPassword });
      setStatus({ type: 'success', message: 'Password changed successfully! Your new password has been updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) {
        setTimeout(onSuccess, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password. Please try again.';
      setStatus({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const formBody = (
    <>
      {status && (
        <div
          className={`notification-popover ${status.type === 'error' ? 'form-error-banner' : ''}`}
          style={{
            position: 'static',
            margin: '12px 0',
            padding: '10px 14px',
            borderRadius: '8px',
            background: status.type === 'success' ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            border: `1px solid ${status.type === 'success' ? "var(--color-border)" : "var(--color-border)"}`,
            color: status.type === 'success' ? "var(--color-success)" : "var(--color-danger)",
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13.5px',
          }}
        >
          <span>{status.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{translate(status.message)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: embedded ? '6px' : '14px' }}>
        <PasswordField
          name="currentPassword"
          label="Current Password"
          value={currentPassword}
          onChange={setCurrentPassword}
          current
          disabled={loading}
        />
        <div>
          <PasswordField
            name="newPassword"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            disabled={loading}
          />
          <small id="new-password-help" style={{ color: "var(--color-muted)", fontSize: '12px', marginTop: '4px', display: 'block' }}>{translate("New password must be at least 8 characters long.")}</small>
        </div>
        <PasswordField
          name="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={loading}
        />

        <div style={{ marginTop: '10px', display: 'flex', justifyContent: embedded ? 'flex-end' : 'flex-start', gap: '10px' }}>
          <Button variant="primary" type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {loading ? translate("Saving password...") : translate("Save New Password")}
          </Button>
        </div>
      </form>
    </>
  );

  if (embedded) {
    return <div style={{ padding: '4px 0' }}>{formBody}</div>;
  }

  return (
    <section className="panel profile-password-panel" id="change-password" aria-labelledby="change-password-heading">
      <div className="profile-card-header">
        <span className="shortcut-icon">
          <Icon name="lock" />
        </span>
        <div>
          <h2 id="change-password-heading">{translate("Change Password")}</h2>
          <p className="profile-password-description">{translate("Protect your account with a strong, secure, and unique password.")}</p>
        </div>
      </div>
      {formBody}
    </section>
  );
}
