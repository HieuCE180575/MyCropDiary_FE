import { StatusBadge } from '../../shared/components/StatusBadge';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { ChangePasswordPanel } from './ChangePasswordPanel';


import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';


import { useAuth } from './AuthProvider';
import { getUserProfile, updateUserProfile, type UserProfile } from './authApi';


export function UserProfilePanel() {
  const { t: translate } = useLanguage();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadProfile();
  }, [user?.userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getUserProfile();
      setProfile(data);
      setFullName(data.fullName || '');
      setPhone(data.phone || '');
      setAvatarUrl(data.avatarUrl || '');
    } catch {
      // Fallback from auth context
      if (user) {
        setFullName(user.fullName || '');
        setPhone(user.phone || '');
        setAvatarUrl(user.avatarUrl || '');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Maximum image size is 2MB. Please choose a smaller file.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Please enter your full name.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateUserProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      setProfile(updated);
      updateUser({
        fullName: updated.fullName,
        phone: updated.phone || undefined,
        avatarUrl: updated.avatarUrl || undefined,
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatarUrl || '');
    }
    setIsEditing(false);
    setMessage(null);
  };

  const currentAvatar = (avatarUrl || profile?.avatarUrl || user?.avatarUrl || '').trim();

  return (
    <>
      <section className="panel profile-details" aria-label={translate("Personal Information")} style={{ width: '100%' }}>
        <div className="profile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="shortcut-icon"><Icon name="user" /></span>
            <div>
              <h2>{translate("Account Information")}</h2>
              <p className="profile-section-sub">{translate("Identity and login information of your account")}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {!isEditing && (
              <>
                <Button type="button" variant="secondary" onClick={() => setIsChangePasswordOpen(true)}><Icon name="lock" size={17} />{translate("Change Password")}</Button>
                <Button
                  type="button"
                  variant="secondary" className="ui-edit-action"
                  onClick={() => { setIsEditing(true); setMessage(null); }}
                  title={translate("Edit Profile")}
                  aria-label={translate("Edit Profile")}
                >
                  <Icon name="edit" size={17} />
                  {translate("Edit Profile")}
                </Button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div
            role={message.type === 'error' ? 'alert' : 'status'}
            className={message.type === 'error' ? 'form-error-banner' : undefined}
            style={{
              margin: '14px 0',
              padding: '10px 14px',
              borderRadius: '8px',
              background: message.type === 'success' ? "var(--color-success-bg)" : "var(--color-danger-bg)",
              border: `1px solid ${message.type === 'success' ? "var(--color-border)" : "var(--color-border)"}`,
              color: message.type === 'success' ? "var(--color-success)" : "var(--color-danger)",
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px',
            }}
          >
            <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{translate(message.text)}</span>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--color-muted)", padding: '16px 0' }}>{translate("Loading profile information...")}</p>
        ) : isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {/* Avatar */}
            <div className="structured-field-card">
              <label>{translate("Profile Avatar")}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: "2px solid var(--color-primary-text)",
                    background: "var(--color-subtle)",
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={translate("Avatar preview")}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Icon name="user" size={28} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Icon name="camera" size={15} />{translate("Upload Photo")}</Button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        disabled={saving}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: "var(--color-danger)",
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                        }}
                      >{translate("✕ Remove Photo")}</button>
                    )}
                  </div>
                  <label htmlFor="user-profile-panel-control-1" style={{ fontSize: '11.5px', color: "var(--color-muted)" }}>{translate("JPG, PNG format or paste direct image link (max 2MB)")}</label>
                  <input id="user-profile-panel-control-1"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageFileChange}
                  />
                </div>
              </div>

              <input aria-label={translate("https://example.com/photo.jpg or direct image URL...")} className="ui-input"
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder={translate("https://example.com/photo.jpg or direct image URL...")}
                style={{ width: '100%', padding: '9px 12px' }}
                disabled={saving}
              />
            </div>

            <div className="structured-field-card">
              <label htmlFor="user-profile-panel-field-1">{translate("Full Name *")}</label>
              <input id="user-profile-panel-field-1" className="ui-input"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={translate("John Doe")}
                style={{ width: '100%', padding: '9px 12px' }}
                disabled={saving}
              />
            </div>

            <div className="structured-field-card ui-form-context">
              <label htmlFor="user-profile-panel-field-2">{translate("Login Email (Cannot be changed)")}</label>
              <input id="user-profile-panel-field-2" className="ui-input"
                type="email"
                readOnly
                disabled
                value={profile?.email || user?.email || ''}
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            <div className="structured-field-card">
              <label htmlFor="user-profile-panel-field-3">{translate("Phone Number")}</label>
              <input id="user-profile-panel-field-3" className="ui-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84 912 345 678"
                style={{ width: '100%', padding: '9px 12px' }}
                disabled={saving}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
              <Button className="ui-cancel-button"
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}
              >
                <Icon name="close" size={16} />{translate("Cancel")}</Button>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}
              >
                {saving ? translate("Saving...") : translate("Save Profile")}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="profile-info-grid">
            <div><dt>{translate('Full Name')}</dt><dd>{profile?.fullName || user?.fullName || translate('Not specified')}</dd></div>
            <div><dt>Email</dt><dd>{profile?.email || user?.email || translate('Not specified')}</dd></div>
            <div><dt>{translate('Phone Number')}</dt><dd>{profile?.phone || user?.phone || translate('Not specified')}</dd></div>
            <div><dt>{translate('Status')}</dt><dd><StatusBadge tone={profile?.accountStatus && profile.accountStatus !== 'ACTIVE' ? 'neutral' : 'success'} label={profile?.accountStatus && profile.accountStatus !== 'ACTIVE' ? translate(profile.accountStatus) : translate('Active')} /></dd></div>
          </dl>
        )}
      </section>

      {/* Change Password Modal */}
      <Modal structured className="modal-form-layout"
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title={translate("Change Password")}
        headerIcon={<Icon name="lock" />}
      >
        <ChangePasswordPanel
          embedded
          onCancel={() => setIsChangePasswordOpen(false)}
          onSuccess={() => setIsChangePasswordOpen(false)}
        />
      </Modal>
    </>
  );
}
