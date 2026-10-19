import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFarmWorkspace } from '../features/farm-management/FarmWorkspace';
import { farmRole } from '../features/auth/accessPolicy';
import { Icon } from '../shared/components/Icon';
import {
  getFarmById,
  updateFarm,
  getFarmMembers,
  addFarmMember,
  removeFarmMember,
  createFarm,
  type FarmDetail,
  type FarmMemberItem,
} from '../features/farm-management/api';

export function FarmInfoPage() {
  const { selectedFarm, farms, selectFarm, retry } = useFarmWorkspace();
  const [farmDetail, setFarmDetail] = useState<FarmDetail | null>(null);
  const [members, setMembers] = useState<FarmMemberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Farm Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add Member Modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'STAFF' | 'OWNER'>('STAFF');
  const [addingMember, setAddingMember] = useState(false);

  // Create Farm Modal state
  const [isCreateFarmOpen, setIsCreateFarmOpen] = useState(false);
  const [createFarmName, setCreateFarmName] = useState('');
  const [createFarmAddress, setCreateFarmAddress] = useState('');
  const [createFarmDesc, setCreateFarmDesc] = useState('');
  const [creatingFarm, setCreatingFarm] = useState(false);

  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : false;

  useEffect(() => {
    if (!selectedFarm?.id) {
      setFarmDetail(null);
      setMembers([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getFarmById(selectedFarm.id).catch(() => null),
      getFarmMembers(selectedFarm.id).catch(() => []),
    ])
      .then(([detail, memberList]) => {
        if (!active) return;
        if (detail) {
          setFarmDetail(detail);
          setEditName(detail.farmName || '');
          setEditAddress(detail.address || '');
          setEditDesc(detail.description || '');
        } else {
          setFarmDetail({
            id: selectedFarm.id,
            farmName: selectedFarm.farmName,
            description: 'Trang trại chuẩn VietGAP',
            address: [selectedFarm.district, selectedFarm.province].filter(Boolean).join(', ') || 'Chưa cập nhật',
            latitude: null,
            longitude: null,
            coverImageUrl: null,
            status: selectedFarm.status || 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            currentUserRole: selectedFarm.currentUserRole,
          });
        }
        setMembers(memberList);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Lỗi tải thông tin trang trại');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFarm?.id]);

  const handleUpdateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id) return;
    setUpdating(true);
    setActionMsg(null);
    try {
      const updated = await updateFarm(selectedFarm.id, {
        farmName: editName.trim(),
        address: editAddress.trim(),
        description: editDesc.trim(),
      });
      setFarmDetail(updated);
      setIsEditOpen(false);
      setActionMsg({ text: 'Cập nhật thông tin trang trại thành công!', type: 'success' });
      retry();
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : 'Cập nhật thất bại', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !newMemberEmail.trim()) return;
    setAddingMember(true);
    setActionMsg(null);
    try {
      const newMember = await addFarmMember(selectedFarm.id, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setMembers((prev) => [...prev, newMember]);
      setNewMemberEmail('');
      setIsAddMemberOpen(false);
      setActionMsg({ text: `Đã thêm thành viên ${newMember.fullName || newMember.email}`, type: 'success' });
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : 'Thêm thành viên thất bại', type: 'error' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (!selectedFarm?.id) return;
    if (!window.confirm(`Bạn có chắc muốn xóa thành viên "${memberName}" khỏi trang trại?`)) return;
    try {
      await removeFarmMember(selectedFarm.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setActionMsg({ text: `Đã xóa thành viên "${memberName}"`, type: 'success' });
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : 'Xóa thành viên thất bại', type: 'error' });
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFarmName.trim()) return;
    setCreatingFarm(true);
    setActionMsg(null);
    try {
      const newFarm = await createFarm({
        farmName: createFarmName.trim(),
        address: createFarmAddress.trim(),
        description: createFarmDesc.trim(),
      });
      setIsCreateFarmOpen(false);
      setCreateFarmName('');
      setCreateFarmAddress('');
      setCreateFarmDesc('');
      setActionMsg({ text: `Tạo trang trại "${newFarm.farmName}" thành công!`, type: 'success' });
      retry();
      selectFarm(newFarm.id);
    } catch (err) {
      setActionMsg({ text: err instanceof Error ? err.message : 'Tạo trang trại thất bại', type: 'error' });
    } finally {
      setCreatingFarm(false);
    }
  };

  return (
    <section className="farm-info-page">
      <div className="page-heading">
        <div>
          <h1>Hồ sơ trang trại</h1>
          <p className="page-subtitle">Thông tin chi tiết quy mô canh tác, nhân sự và tiêu chuẩn VietGAP</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedFarm && isOwner && (
            <button type="button" className="primary-button" onClick={() => setIsEditOpen(true)}>
              <Icon name="check" /> Chỉnh sửa trang trại
            </button>
          )}
          <button type="button" className="action-button" onClick={() => setIsCreateFarmOpen(true)}>
            <Icon name="plus" /> Thêm trang trại mới
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`notification-popover ${actionMsg.type === 'error' ? 'form-error-banner' : ''}`} style={{ marginBottom: '16px', position: 'static' }}>
          <strong>{actionMsg.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {actionMsg.text}
        </div>
      )}

      {!selectedFarm ? (
        <div className="panel empty-state">
          <div className="empty-icon">🚜</div>
          <h2>Chọn hoặc tạo không gian trang trại</h2>
          <p>Bạn hiện đang ở không gian cá nhân. Hãy chọn một trang trại bên dưới để quản lý chi tiết.</p>
          {farms.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', width: '100%', maxWidth: '900px', marginTop: '20px' }}>
              {farms.map((f) => (
                <div key={f.id} className="farm-card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => selectFarm(f.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="profile-tag-pill" style={{ background: '#ecfdf5', color: '#059669' }}>
                      <Icon name="leaf" /> {farmRole(f) === 'OWNER' ? 'Chủ trang trại' : 'Nhân viên'}
                    </span>
                    <span className="status-badge status-badge--success">{f.status || 'Hoạt động'}</span>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0f172a' }}>{f.farmName}</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                    📍 {[f.district, f.province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}
                  </p>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Mở quản lý <Icon name="arrow" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button type="button" className="primary-button" onClick={() => setIsCreateFarmOpen(true)}>
                + Tạo trang trại ngay
              </button>
              <Link to="/farm-registration" className="action-button">
                Gửi đơn đăng ký VietGAP
              </Link>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải hồ sơ trang trại...</h2>
        </div>
      ) : error ? (
        <div className="panel empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>Không thể tải thông tin</h2>
          <p>{error}</p>
        </div>
      ) : farmDetail ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Main Info Card */}
          <div className="panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px' }}>
                  🌱
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>{farmDetail.farmName}</h2>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Mã trang trại: #{farmDetail.id}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="status-badge status-badge--success">Chuẩn VietGAP</span>
                <span className="profile-role-pill">{isOwner ? 'Chủ sở hữu' : 'Nhân sự vận hành'}</span>
              </div>
            </div>

            <p style={{ margin: '20px 0', color: '#334155', fontSize: '15px', lineHeight: 1.6, background: '#f8fafc', padding: '16px', borderRadius: '10px' }}>
              {farmDetail.description || 'Trang trại áp dụng quy chuẩn Thực hành nông nghiệp tốt (VietGAP) hướng đến nông sản an toàn, minh bạch và truy xuất nguồn gốc số.'}
            </p>

            <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', margin: '20px 0 0', fontSize: '14px' }}>
              <dt style={{ color: '#64748b', fontWeight: 600 }}>Địa chỉ:</dt>
              <dd style={{ margin: 0, color: '#0f172a', fontWeight: 500 }}>{farmDetail.address || 'Chưa cập nhật'}</dd>

              <dt style={{ color: '#64748b', fontWeight: 600 }}>Diện tích:</dt>
              <dd style={{ margin: 0, color: '#0f172a', fontWeight: 500 }}>
                {selectedFarm.totalAreaM2 ? `${selectedFarm.totalAreaM2.toLocaleString('vi-VN')} m²` : 'Quy mô đạt chuẩn'}
              </dd>

              <dt style={{ color: '#64748b', fontWeight: 600 }}>Trạng thái:</dt>
              <dd style={{ margin: 0 }}>
                <span className="status-badge status-badge--success">{farmDetail.status || 'Đang hoạt động'}</span>
              </dd>

              <dt style={{ color: '#64748b', fontWeight: 600 }}>Tạo lúc:</dt>
              <dd style={{ margin: 0, color: '#64748b' }}>
                {new Date(farmDetail.createdAt).toLocaleDateString('vi-VN')}
              </dd>
            </dl>

            {/* Quick Links inside Farm */}
            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <Link to="/production-areas" className="action-button" style={{ fontSize: '13px' }}>
                🗺️ Vùng & Lô đất
              </Link>
              <Link to="/crop-seasons" className="action-button" style={{ fontSize: '13px' }}>
                🌾 Mùa vụ
              </Link>
              <Link to="/activities" className="action-button" style={{ fontSize: '13px' }}>
                📖 Nhật ký canh tác
              </Link>
              <Link to="/harvests" className="action-button" style={{ fontSize: '13px' }}>
                📦 Thu hoạch & Truy xuất
              </Link>
            </div>
          </div>

          {/* Members Panel */}
          <div className="panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Thành viên & Nhân sự</h2>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>{members.length} thành viên tham gia canh tác</p>
              </div>
              {isOwner && (
                <button type="button" className="action-button" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setIsAddMemberOpen(true)}>
                  <Icon name="plus" /> Thêm thành viên
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
                <Icon name="user" />
                <p style={{ marginTop: '8px' }}>Chưa có thành viên nào khác trong trang trại.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {members.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="profile-hero-avatar" style={{ width: '38px', height: '38px', fontSize: '15px' }}>
                        <Icon name="user" />
                      </span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>{m.fullName || m.email}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{m.email}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="profile-tag-pill" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                        {m.role === 'OWNER' ? 'Chủ trại' : 'Nhân viên'}
                      </span>
                      {isOwner && m.role !== 'OWNER' && (
                        <button type="button" className="icon-button" title="Xóa thành viên" style={{ color: '#ef4444' }} onClick={() => handleRemoveMember(m.id, m.fullName || m.email)}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Edit Farm Modal */}
      {isEditOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '520px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Chỉnh sửa thông tin trang trại</h2>
            <form onSubmit={handleUpdateFarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Tên trang trại</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Địa chỉ</label>
                <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mô tả quy mô / Giới thiệu</label>
                <textarea rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsEditOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button" disabled={updating}>
                  {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '460px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Thêm thành viên mới</h2>
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Email tài khoản</label>
                <input type="email" required placeholder="nhanvien@example.com" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Vai trò trong trang trại</label>
                <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as 'STAFF' | 'OWNER')} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                  <option value="STAFF">Nhân viên canh tác (Staff)</option>
                  <option value="OWNER">Đồng sở hữu (Owner)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsAddMemberOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button" disabled={addingMember}>
                  {addingMember ? 'Đang thêm...' : 'Xác nhận thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Farm Modal */}
      {isCreateFarmOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '520px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Tạo không gian trang trại mới</h2>
            <form onSubmit={handleCreateFarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Tên trang trại *</label>
                <input type="text" required placeholder="Ví dụ: Nông trại Hữu cơ An Nhiên" value={createFarmName} onChange={(e) => setCreateFarmName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Địa chỉ</label>
                <input type="text" placeholder="Xã/Huyện/Tỉnh..." value={createFarmAddress} onChange={(e) => setCreateFarmAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mô tả quy mô</label>
                <textarea rows={3} placeholder="Mô tả các loại cây trồng và diện tích dự kiến..." value={createFarmDesc} onChange={(e) => setCreateFarmDesc(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsCreateFarmOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button" disabled={creatingFarm}>
                  {creatingFarm ? 'Đang tạo...' : 'Tạo trang trại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
