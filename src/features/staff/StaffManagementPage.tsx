import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { farmRole } from '../auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import {
  getFarmStaffList,
  addFarmStaffMember,
  updateFarmStaffMember,
  deactivateFarmStaffMember,
  type FarmStaffRecord,
} from './staffService';
import {
  fetchZonesByFarm,
  fetchZoneAssignments,
  assignStaffToZone,
  unassignStaffFromZone,
} from '../production/zoneBlockService';
import type { Zone, StaffZoneAssignment } from '../production/types';

export function StaffManagementPage() {
  const { selectedFarm } = useFarmWorkspace();
  const [activeTab, setActiveTab] = useState<'staff' | 'assignments'>('staff');
  const [staffList, setStaffList] = useState<FarmStaffRecord[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [assignments, setAssignments] = useState<StaffZoneAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [jobTitle, setJobTitle] = useState('Kỹ sư nông nghiệp');
  const [savingStaff, setSavingStaff] = useState(false);

  // Add Assignment Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState<number | ''>('');
  const [assignZoneId, setAssignZoneId] = useState<number | ''>('');
  const [assignedAtDate, setAssignedAtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingAssign, setSavingAssign] = useState(false);

  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : false;

  useEffect(() => {
    if (!selectedFarm?.id) return;
    void loadData();
  }, [selectedFarm?.id, activeTab]);

  const loadData = async () => {
    if (!selectedFarm?.id) return;
    setLoading(true);
    try {
      const [staffData, zoneData, assignData] = await Promise.all([
        getFarmStaffList(selectedFarm.id),
        fetchZonesByFarm(selectedFarm.id).catch(() => [] as Zone[]),
        fetchZoneAssignments(selectedFarm.id).catch(() => [] as StaffZoneAssignment[]),
      ]);
      setStaffList(staffData);
      setZones(zoneData);
      setAssignments(assignData);
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể tải dữ liệu nhân sự trang trại.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !email.trim()) return;
    setSavingStaff(true);
    setNotification(null);
    try {
      const created = await addFarmStaffMember(selectedFarm.id, {
        email: email.trim(),
        farmRole: role.toLowerCase(),
        jobTitle: jobTitle.trim() || undefined,
      });
      setNotification({
        text: `Đã thêm thành viên "${created.fullName}" (${created.email}) vào trang trại thành công!`,
        type: 'success',
      });
      setIsAddStaffOpen(false);
      setEmail('');
      setRole('STAFF');
      setJobTitle('Kỹ sư nông nghiệp');
      await loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể thêm nhân viên. Vui lòng kiểm tra email tài khoản đã kích hoạt.',
        type: 'error',
      });
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeactivate = async (memberId: number, name: string) => {
    if (!selectedFarm?.id) return;
    if (!window.confirm(`Ngừng kích hoạt thành viên "${name}" khỏi trang trại?`)) return;
    setNotification(null);
    try {
      await deactivateFarmStaffMember(selectedFarm.id, memberId);
      setNotification({ text: `Đã tạm dừng quyền truy cập của "${name}".`, type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : `Không thể vô hiệu hóa thành viên "${name}".`,
        type: 'error',
      });
    }
  };

  const handleReactivate = async (memberId: number, name: string) => {
    if (!selectedFarm?.id) return;
    setNotification(null);
    try {
      await updateFarmStaffMember(selectedFarm.id, memberId, { status: 'ACTIVE' });
      setNotification({ text: `Đã kích hoạt lại thành viên "${name}" thành công!`, type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : `Không thể kích hoạt lại "${name}".`,
        type: 'error',
      });
    }
  };

  const openAssignModal = () => {
    const activeMembers = staffList.filter((s) => s.status === 'ACTIVE');
    if (activeMembers.length > 0 && !assignStaffId) {
      setAssignStaffId(activeMembers[0].farmMemberId);
    }
    if (zones.length > 0 && !assignZoneId) {
      setAssignZoneId(zones[0].zoneId);
    }
    setIsAssignOpen(true);
  };

  const handleAssignZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !assignStaffId || !assignZoneId) return;
    setSavingAssign(true);
    setNotification(null);
    try {
      const assignedIso = assignedAtDate ? new Date(`${assignedAtDate}T08:00:00`).toISOString() : new Date().toISOString();
      await assignStaffToZone(selectedFarm.id, Number(assignZoneId), {
        farmMemberId: Number(assignStaffId),
        assignedAt: assignedIso,
      });
      setNotification({ text: 'Đã phân công nhân viên phụ trách phân khu thành công!', type: 'success' });
      setIsAssignOpen(false);
      await loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể phân công nhân viên vào phân khu.',
        type: 'error',
      });
    } finally {
      setSavingAssign(false);
    }
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!selectedFarm?.id) return;
    if (!window.confirm('Bạn có chắc muốn hủy lượt phân công này?')) return;
    setNotification(null);
    try {
      await unassignStaffFromZone(selectedFarm.id, assignmentId);
      setNotification({ text: 'Đã hủy phân công nhân viên khỏi phân khu thành công.', type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể hủy phân công.',
        type: 'error',
      });
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phoneNumber || '').includes(q);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeStaffOptions = staffList.filter((s) => s.status === 'ACTIVE');

  return (
    <section className="staff-management-page">
      <div className="page-heading">
        <div>
          <h1>Quản lý nhân sự &amp; Phân công</h1>
          <p className="page-subtitle">
            Hồ sơ thành viên trang trại, nhân viên kỹ thuật và phân quyền phụ trách theo vùng sản xuất VietGAP
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isOwner &&
            (activeTab === 'staff' ? (
              <button type="button" className="primary-button" onClick={() => setIsAddStaffOpen(true)}>
                <Icon name="plus" /> Thêm nhân viên
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={openAssignModal}>
                <Icon name="plus" /> Phân công vùng mới
              </button>
            ))}
        </div>
      </div>

      {notification && (
        <div
          role={notification.type === 'error' ? 'alert' : 'status'}
          className={`notification-popover ${notification.type === 'error' ? 'form-error-banner' : ''}`}
          style={{ marginBottom: '16px', position: 'static' }}
        >
          <strong>{notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {notification.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '10px 18px',
            fontSize: '14.5px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'staff' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'staff' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          👥 Danh sách nhân sự ({staffList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '10px 18px',
            fontSize: '14.5px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'assignments' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'assignments' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          🗺️ Phân công vùng sản xuất ({assignments.length})
        </button>
      </div>

      {activeTab === 'staff' && (
        <>
          {/* Filter Bar */}
          <div
            className="panel"
            style={{
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="🔍 Tìm theo họ tên, email hoặc số điện thoại..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>Trạng thái:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="SUSPENDED">Đã ngưng hoạt động</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="panel empty-state">
              <div className="empty-icon">⏳</div>
              <h2>Đang tải danh sách nhân sự...</h2>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">👥</div>
              <h2>Chưa có nhân sự phù hợp</h2>
              <p>Hãy thử tìm kiếm với từ khóa khác hoặc bấm &quot;Thêm nhân viên&quot; bằng email tài khoản đã kích hoạt.</p>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr
                    style={{
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      color: '#475569',
                      fontSize: '13px',
                    }}
                  >
                    <th style={{ padding: '14px 20px' }}>Thành viên</th>
                    <th style={{ padding: '14px 20px' }}>Liên hệ</th>
                    <th style={{ padding: '14px 20px' }}>Vai trò</th>
                    <th style={{ padding: '14px 20px' }}>Số vùng phụ trách</th>
                    <th style={{ padding: '14px 20px' }}>Ngày tham gia</th>
                    <th style={{ padding: '14px 20px' }}>Trạng thái</th>
                    {isOwner && <th style={{ padding: '14px 20px', textAlign: 'right' }}>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => (
                    <tr key={staff.farmMemberId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="profile-hero-avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                            <Icon name="user" />
                          </span>
                          <div>
                            <strong style={{ display: 'block', color: '#0f172a' }}>{staff.fullName}</strong>
                            <small style={{ color: '#94a3b8' }}>Mã TV: #{staff.farmMemberId}</small>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ color: '#334155' }}>{staff.email}</div>
                        <small style={{ color: '#64748b' }}>{staff.phoneNumber || 'Chưa cập nhật SĐT'}</small>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          className="profile-tag-pill"
                          style={{
                            fontSize: '12px',
                            background: staff.farmRole === 'OWNER' ? '#ecfdf5' : '#f1f5f9',
                            color: staff.farmRole === 'OWNER' ? '#047857' : '#334155',
                          }}
                        >
                          {staff.roleLabel}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#334155', fontWeight: 600 }}>
                        {staff.activeAssignmentCount} vùng
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>
                        {staff.joinedAt ? new Date(staff.joinedAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`status-badge ${staff.status === 'ACTIVE' ? 'status-badge--success' : ''}`}>
                          {staff.status === 'ACTIVE' ? 'Hoạt động' : 'Đã ngưng'}
                        </span>
                      </td>
                      {isOwner && (
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          {staff.farmRole === 'OWNER' ? (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Chủ trại</span>
                          ) : staff.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              className="action-button"
                              style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444' }}
                              onClick={() => handleDeactivate(staff.farmMemberId, staff.fullName)}
                            >
                              Tạm dừng
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="action-button"
                              style={{ padding: '4px 10px', fontSize: '12px', color: '#059669' }}
                              onClick={() => handleReactivate(staff.farmMemberId, staff.fullName)}
                            >
                              Kích hoạt lại
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'assignments' && (
        <>
          {loading ? (
            <div className="panel empty-state">
              <div className="empty-icon">⏳</div>
              <h2>Đang tải danh sách phân công...</h2>
            </div>
          ) : assignments.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">🗺️</div>
              <h2>Chưa có phân công nào</h2>
              <p>Phân công nhân viên kỹ thuật phụ trách từng phân khu (Zone) của trang trại.</p>
              {isOwner && (
                <button type="button" className="primary-button" style={{ marginTop: '12px' }} onClick={openAssignModal}>
                  + Phân công ngay
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {assignments.map((item) => (
                <div
                  key={item.assignmentId}
                  className="panel"
                  style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span className="profile-tag-pill" style={{ background: '#ecfdf5', color: '#059669', fontSize: '12px' }}>
                        📍 {item.zoneName || `Phân khu #${item.zoneId}`}
                      </span>
                      {isOwner && (
                        <button
                          type="button"
                          className="icon-button"
                          title="Hủy phân công"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleUnassign(item.assignmentId)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#0f172a' }}>
                      👤 {item.staffName || `Thành viên #${item.farmMemberId}`}
                    </h3>
                    {item.staffEmail && (
                      <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '13px' }}>
                        ✉️ {item.staffEmail}
                      </p>
                    )}
                    <p style={{ margin: 0, color: '#059669', fontWeight: 600, fontSize: '13.5px' }}>
                      {item.jobTitle || 'Nhân viên kỹ thuật phụ trách phân khu'}
                    </p>
                  </div>
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8' }}>
                    Phân công từ ngày: {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString('vi-VN') : '—'}
                    {item.assignedByName ? ` • Giao bởi: ${item.assignedByName}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div className="panel" style={{ width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Thêm nhân viên vào trang trại</h2>
            <p style={{ margin: '6px 0 16px', fontSize: '13px', color: '#64748b' }}>
              Nhập địa chỉ email của tài khoản người dùng đã đăng ký và kích hoạt trên hệ thống MyCropDiary.
            </p>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Email tài khoản nhân viên *
                </label>
                <input
                  type="email"
                  required
                  placeholder="nhanvien@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Vai trò trong trang trại *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="STAFF">Nhân viên kỹ thuật (STAFF)</option>
                  <option value="OWNER">Đồng chủ trang trại (OWNER)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Chức danh chuyên môn
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Kỹ sư nông học / Phụ trách BVTV..."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsAddStaffOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary-button" disabled={savingStaff}>
                  {savingStaff ? 'Đang lưu...' : 'Thêm nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assignment Modal */}
      {isAssignOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div className="panel" style={{ width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Phân công nhân sự vào Phân khu</h2>
            <form onSubmit={handleAssignZone} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Chọn thành viên trang trại *
                </label>
                <select
                  required
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Chọn nhân viên đang hoạt động --</option>
                  {activeStaffOptions.map((s) => (
                    <option key={s.farmMemberId} value={s.farmMemberId}>
                      {s.fullName} ({s.email}) — {s.roleLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Chọn Phân khu (Zone) *
                </label>
                {zones.length > 0 ? (
                  <select
                    required
                    value={assignZoneId}
                    onChange={(e) => setAssignZoneId(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Chọn phân khu sản xuất --</option>
                    {zones.map((z) => (
                      <option key={z.zoneId} value={z.zoneId}>
                        {z.zoneName} ({z.areaValue} {z.areaUnit})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    required
                    placeholder="Nhập ID phân khu (Zone ID)"
                    value={assignZoneId}
                    onChange={(e) => setAssignZoneId(e.target.value ? Number(e.target.value) : '')}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                  Ngày bắt đầu phụ trách *
                </label>
                <input
                  type="date"
                  required
                  value={assignedAtDate}
                  onChange={(e) => setAssignedAtDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsAssignOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary-button" disabled={savingAssign}>
                  {savingAssign ? 'Đang phân công...' : 'Xác nhận phân công'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
