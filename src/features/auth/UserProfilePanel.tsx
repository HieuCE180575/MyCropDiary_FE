import { useState, useEffect, type FormEvent } from 'react';
import { Icon } from '../../shared/components/Icon';
import { useAuth } from './AuthProvider';
import { getUserProfile, updateUserProfile, type UserProfile } from './authApi';

export function UserProfilePanel() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập họ và tên.' });
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

      setMessage({ type: 'success', text: 'Cập nhật hồ sơ cá nhân thành công!' });
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật hồ sơ.';
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

  const isAdmin = (profile?.systemRole || user?.systemRole)?.toUpperCase() === 'ADMIN';
  const roleName = isAdmin ? 'Quản trị viên hệ thống' : 'Nông dân VietGAP';

  return (
    <section className="panel profile-details" aria-label="Thông tin cá nhân">
      <div className="profile-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="shortcut-icon"><Icon name="user" /></span>
          <div>
            <h2>Thông tin tài khoản</h2>
            <p className="profile-section-sub">Thông tin định danh và tài khoản đăng nhập của bạn</p>
          </div>
        </div>
        {!isEditing && (
          <button
            type="button"
            className="action-button"
            onClick={() => { setIsEditing(true); setMessage(null); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Icon name="file" /> Chỉnh sửa hồ sơ
          </button>
        )}
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
        <p style={{ color: '#64748b', padding: '16px 0' }}>Đang nạp thông tin...</p>
      ) : isEditing ? (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Họ và tên *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              disabled={saving}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Email đăng nhập (Không thể thay đổi)
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
              Số điện thoại
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              disabled={saving}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Đường dẫn ảnh đại diện (Avatar URL)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              disabled={saving}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="action-button" onClick={handleCancel} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="save" /> {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </button>
          </div>
        </form>
      ) : (
        <dl>
          <dt>Họ và tên</dt>
          <dd style={{ fontWeight: 600, color: '#0f172a' }}>{profile?.fullName || user?.fullName || 'Chưa cập nhật'}</dd>
          
          <dt>Email</dt>
          <dd>{profile?.email || user?.email || 'Chưa cập nhật'}</dd>

          <dt>Số điện thoại</dt>
          <dd>{profile?.phone || 'Chưa cập nhật'}</dd>

          <dt>Vai trò hệ thống</dt>
          <dd><span className="profile-role-pill" style={{ display: 'inline-block' }}>{roleName}</span></dd>

          <dt>Trạng thái</dt>
          <dd><span className="status-badge status-badge--success">Đang hoạt động</span></dd>

          <dt>Hệ thống</dt>
          <dd>Nông nghiệp số VietGAP 2026</dd>
        </dl>
      )}
    </section>
  );
}
