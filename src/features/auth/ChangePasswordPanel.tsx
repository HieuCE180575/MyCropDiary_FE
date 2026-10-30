import { useState, type FormEvent } from 'react';
import { Icon } from '../../shared/components/Icon';
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
  const [visible, setVisible] = useState(false);
  return (
    <label className="profile-password-field">
      <span>{label}</span>
      <span className="profile-password-input">
        <Icon name="lock" />
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          placeholder={label}
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
          aria-label={`${visible ? 'Hide' : 'Show'} ${label}`}
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
            background: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: status.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13.5px',
          }}
        >
          <span>{status.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: embedded ? '6px' : '14px' }}>
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
          <small id="new-password-help" style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            New password must be at least 8 characters long.
          </small>
        </div>
        <PasswordField
          name="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={loading}
        />

        <div style={{ marginTop: '10px', display: 'flex', justifyContent: embedded ? 'flex-end' : 'flex-start', gap: '10px' }}>
          <button className="action-button solid primary-button" type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="save" />
            {loading ? 'Saving password...' : 'Save New Password'}
          </button>
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
          <h2 id="change-password-heading">Change Password</h2>
          <p className="profile-password-description">Protect your account with a strong, secure, and unique password.</p>
        </div>
      </div>
      {formBody}
    </section>
  );
}
