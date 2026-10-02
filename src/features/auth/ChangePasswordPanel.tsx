import { useState } from 'react';
import { Icon } from '../../shared/components/Icon';

function PasswordField({ name, label, current = false }: { name: string; label: string; current?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <label className="profile-password-field"><span>{label}</span><span className="profile-password-input">
    <Icon name="lock" />
    <input name={name} type={visible ? 'text' : 'password'} placeholder={label} autoComplete={current ? 'current-password' : 'new-password'} minLength={current ? undefined : 8} required aria-describedby={current ? undefined : 'new-password-help'} />
    <button type="button" onClick={() => setVisible(value => !value)} aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLocaleLowerCase('vi-VN')}`} aria-pressed={visible}><Icon name={visible ? 'eye-off' : 'eye'} /></button>
  </span></label>;
}

export function ChangePasswordPanel() {
  return <section className="panel profile-password-panel" id="change-password" aria-labelledby="change-password-heading">
    <span className="shortcut-icon"><Icon name="lock" /></span>
    <h2 id="change-password-heading">Thay đổi mật khẩu</h2>
    <p className="profile-password-description">Bảo vệ tài khoản bằng mật khẩu riêng, khó đoán.</p>
    <form onSubmit={event => event.preventDefault()} aria-describedby="change-password-availability">
      <PasswordField name="currentPassword" label="Mật khẩu hiện tại" current />
      <PasswordField name="newPassword" label="Mật khẩu mới" />
      <small id="new-password-help">Mật khẩu mới có ít nhất 8 ký tự.</small>
      <PasswordField name="confirmPassword" label="Nhập lại mật khẩu mới" />
      <p id="change-password-availability" className="profile-password-availability">Tính năng đổi mật khẩu hiện chưa sẵn sàng.</p>
      <button className="action-button solid" type="submit" disabled><Icon name="save" />Lưu mật khẩu mới</button>
    </form>
  </section>;
}
