import { normalizeModalForms } from '../../shared/components/modalFormLayout';
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
  help?: string;
}

function PasswordField({ name, label, value, onChange, current = false, disabled = false, help }: PasswordFieldProps) {
  const { t: translate, lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  return (
    <div className="profile-password-field structured-field-card">
      <div className="structured-field-header">
        <label className="structured-field-label" htmlFor={`password-${name}`}>{translate(label)} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
        <span className="structured-field-badge">{lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
      </div>
      <span className="profile-password-input">
        <Icon name="lock" />
        <input className="ui-input"
          id={`password-${name}`}
          name={name}
          type={visible ? 'text' : 'password'}
          placeholder={translate(label)}
          autoComplete={current ? 'current-password' : 'new-password'}
          minLength={current ? undefined : 8}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby={help ? `${name}-help` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={`${translate(visible ? 'Hide' : 'Show')} ${translate(label)}`}
          aria-pressed={visible}
          disabled={disabled}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} />
        </button>
      </span>
      {help && <small id={`${name}-help`} style={{ color: 'var(--color-muted)', fontSize: '12px', lineHeight: 1.5 }}>{help}</small>}
    </div>
  );
}

function validateNewPassword(value: string): string {
  if (!value || !value.trim()) return 'Password cannot contain only whitespace.';
  if (value.length < 8) return 'Password must have at least 8 characters.';
  if (value.length > 100) return 'Password cannot exceed 100 characters.';
  if (!/[A-Z]/.test(value)) return 'Password must contain at least 1 uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Password must contain at least 1 lowercase letter.';
  if (!/[^a-zA-Z0-9]/.test(value)) return 'Password must contain at least 1 special character.';
  return '';
}

export function ChangePasswordPanel({
  embedded = false,
  onSuccess,
  onCancel,
}: {
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
} = {}) {
  const { t: translate, lang } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const hasMinLength = newPassword.length >= 8 && newPassword.length <= 100;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(newPassword);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!currentPassword) {
      setStatus({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    const passwordRuleError = validateNewPassword(newPassword);
    if (passwordRuleError) {
      setStatus({ type: 'error', message: passwordRuleError });
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


      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: embedded ? '6px' : '14px' }}>
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
        <PasswordField
          name="currentPassword"
          label="Current Password"
          value={currentPassword}
          onChange={setCurrentPassword}
          current
          disabled={loading}
        />
          <PasswordField
            name="newPassword"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            disabled={loading}
            help={lang === 'en'
              ? '8-100 characters, including at least 1 uppercase letter, 1 lowercase letter, and 1 special character.'
              : 'Từ 8–100 ký tự, gồm ít nhất 1 chữ in hoa, 1 chữ in thường, 1 ký tự đặc biệt và khác mật khẩu hiện tại.'}
          />
          {newPassword.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '-6px 0 4px', padding: '8px 12px', borderRadius: '8px', background: 'var(--color-page)', border: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '4px 12px', fontSize: '12px' }}>
              <li style={{ color: hasMinLength ? '#059669' : '#dc2626', fontWeight: 500 }}>
                {hasMinLength ? '✓' : '•'} {lang === 'en' ? '8–100 characters' : 'Từ 8–100 ký tự'}
              </li>
              <li style={{ color: hasUpperCase ? '#059669' : '#dc2626', fontWeight: 500 }}>
                {hasUpperCase ? '✓' : '•'} {lang === 'en' ? 'At least 1 uppercase (A-Z)' : 'Ít nhất 1 chữ in hoa (A-Z)'}
              </li>
              <li style={{ color: hasLowerCase ? '#059669' : '#dc2626', fontWeight: 500 }}>
                {hasLowerCase ? '✓' : '•'} {lang === 'en' ? 'At least 1 lowercase (a-z)' : 'Ít nhất 1 chữ in thường (a-z)'}
              </li>
              <li style={{ color: hasSpecialChar ? '#059669' : '#dc2626', fontWeight: 500 }}>
                {hasSpecialChar ? '✓' : '•'} {lang === 'en' ? 'At least 1 special character' : 'Ít nhất 1 ký tự đặc biệt'}
              </li>
            </ul>
          )}
        <PasswordField
          name="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={loading}
          help={lang === 'en' ? 'Re-enter the new password exactly.' : 'Nhập lại chính xác mật khẩu mới.'}
        />

        <div className="confirm-dialog-actions" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '10px' }}>
          <small style={{ order: -2, marginRight: 'auto', color: 'var(--color-muted)' }}><span style={{ color: 'var(--color-danger)' }}>*</span> {lang === 'en' ? 'Required information' : 'Thông tin bắt buộc'}</small>
          {onCancel && <Button type="button" variant="secondary" className="ui-cancel-button" disabled={loading} onClick={onCancel}>{translate('Cancel')}</Button>}
          <Button variant="primary" type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {loading ? translate("Saving password...") : translate("Save New Password")}
          </Button>
        </div>
      </form>
    </>
  );

  if (embedded) {
    return <div className="modal-form-wrapper">{normalizeModalForms(formBody).content}</div>;
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
