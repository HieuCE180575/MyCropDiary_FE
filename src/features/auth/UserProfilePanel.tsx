import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { useAuth } from './AuthProvider';
import { getUserProfile, updateUserProfile, type UserProfile } from './authApi';
import { ChangePasswordPanel } from './ChangePasswordPanel';

export function UserProfilePanel() {
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
      <section className="panel profile-details" aria-label="Personal Information" style={{ width: '100%' }}>
        <div className="profile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="shortcut-icon"><Icon name="user" /></span>
            <div>
              <h2>Account Information</h2><span className="sr-only">Thông tin tài khoản</span>
              <p className="profile-section-sub">Identity and login information of your account</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isEditing && (
              <>
                <button
                  type="button"
                  className="profile-icon-btn"
                  onClick={() => setIsChangePasswordOpen(true)}
                  title="Change Password"
                  aria-label="Change Password"
                >
                  <Icon name="lock" size={17} />
                </button>
                <button
                  type="button"
                  className="profile-icon-btn primary"
                  onClick={() => { setIsEditing(true); setMessage(null); }}
                  title="Edit Profile"
                  aria-label="Edit Profile"
                >
                  <Icon name="edit" size={17} />
                </button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div
            style={{
              margin: '14px 0',
              padding: '10px 14px',
              borderRadius: '8px',
              background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              color: message.type === 'success' ? '#065f46' : '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px',
            }}
          >
            <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <p style={{ color: '#64748b', padding: '16px 0' }}>Loading profile information...</p>
        ) : isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {/* Avatar */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Profile Avatar
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #10b981',
                    background: '#f1f5f9',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt="Avatar preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Icon name="user" size={28} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      style={{ fontSize: '12.5px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Icon name="camera" size={15} /> Upload Photo
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        disabled={saving}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                        }}
                      >
                        ✕ Remove Photo
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    JPG, PNG format or paste direct image link (max 2MB)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageFileChange}
                  />
                </div>
              </div>

              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg or direct image URL..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                disabled={saving}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                disabled={saving}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Login Email (Cannot be changed)
              </label>
              <input
                type="email"
                readOnly
                disabled
                value={profile?.email || user?.email || ''}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84 912 345 678"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                disabled={saving}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
              <button
                type="button"
                className="action-button"
                onClick={handleCancel}
                disabled={saving}
                style={{ height: '40px', padding: '0 18px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}
              >
                <Icon name="x" size={16} /> Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
                style={{ height: '40px', padding: '0 20px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}
              >
                <Icon name="save" size={16} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        ) : (
          <dl>
            <dt>Profile Avatar</dt>
            <dd>
              {currentAvatar ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={currentAvatar}
                    alt={profile?.fullName || 'Avatar'}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid #cbd5e1',
                    }}
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <span style={{ fontSize: '13px', color: '#64748b', wordBreak: 'break-all' }}>
                    {currentAvatar.startsWith('data:') ? 'Custom profile photo (Uploaded)' : currentAvatar}
                  </span>
                </div>
              ) : (
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>No avatar uploaded</span>
              )}
            </dd>

            <dt>Full Name</dt>
            <dd style={{ fontWeight: 600, color: '#0f172a' }}>{profile?.fullName || user?.fullName || 'Not specified'}</dd>

            <dt>Email</dt>
            <dd>{profile?.email || user?.email || 'Not specified'}</dd>

            <dt>Phone Number</dt>
            <dd>{profile?.phone || 'Not specified'}</dd>

            <dt>Status</dt>
            <dd><span className="status-badge status-badge--success">Active</span></dd>
          </dl>
        )}
      </section>

      {/* Change Password Modal */}
      <Modal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title="Change Password"
        headerIcon={<Icon name="lock" />}
      >
        <ChangePasswordPanel
          embedded
          onSuccess={() => setIsChangePasswordOpen(false)}
        />
      </Modal>
    </>
  );
}
