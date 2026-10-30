import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { farmRole } from '../auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import {
  getFarmStaffList,
  addFarmStaffMember,
  updateFarmStaffMember,
  deactivateFarmStaffMember,
  deleteFarmStaffMember,
  type FarmStaffRecord,
} from './staffService';
import {
  fetchZonesByFarm,
  fetchZoneAssignments,
  assignStaffToZone,
  unassignStaffFromZone,
} from '../production/zoneBlockService';
import type { Zone, StaffZoneAssignment } from '../production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

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

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<FarmStaffRecord | null>(null);
  const [editRole, setEditRole] = useState<'OWNER' | 'STAFF'>('STAFF');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Assignment Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState<number | ''>('');
  const [assignZoneId, setAssignZoneId] = useState<number | ''>('');
  const [assignedAtDate, setAssignedAtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingAssign, setSavingAssign] = useState(false);

  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : false;

  useEffect(() => {
    if (!selectedFarm?.id) return;
    void loadData(false);
  }, [selectedFarm?.id, activeTab]);

  useRealtimeSync(() => {
    if (!selectedFarm?.id) return;
    void loadData(true);
  });

  const loadData = async (silent = false) => {
    if (!selectedFarm?.id) return;
    if (!silent) setLoading(true);
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
      if (!silent) {
        setNotification({
          text: err instanceof Error ? err.message : 'Không thể tải dữ liệu nhân sự trang trại.',
          type: 'error',
        });
      }
    } finally {
      if (!silent) setLoading(false);
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

  const openEditModal = (staff: FarmStaffRecord) => {
    setEditingStaff(staff);
    setEditRole(staff.farmRole === 'OWNER' ? 'OWNER' : 'STAFF');
    const isGenericRole = ['chủ trang trại', 'nhân viên kỹ thuật', 'thành viên trang trại'].includes(
      (staff.roleLabel || '').trim().toLowerCase()
    );
    setEditJobTitle(isGenericRole ? '' : staff.roleLabel);
    setEditStatus(staff.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !editingStaff) return;
    setSavingEdit(true);
    setNotification(null);
    try {
      await updateFarmStaffMember(selectedFarm.id, editingStaff.farmMemberId, {
        farmRole: editRole,
        jobTitle: editJobTitle.trim() || undefined,
        status: editStatus,
      });
      setNotification({
        text: `Đã cập nhật thông tin thành viên "${editingStaff.fullName}" thành công!`,
        type: 'success',
      });
      setEditingStaff(null);
      await loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : 'Không thể cập nhật thông tin nhân viên.',
        type: 'error',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStaff = async (memberId: number, name: string) => {
    if (!selectedFarm?.id) return;
    if (!window.confirm(`Xác nhận xóa thành viên "${name}" khỏi trang trại? Thao tác này sẽ hủy mọi quyền truy cập và phân công.`)) return;
    setNotification(null);
    try {
      await deleteFarmStaffMember(selectedFarm.id, memberId);
      setNotification({ text: `Đã xóa thành viên "${name}" khỏi trang trại thành công!`, type: 'success' });
      await loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : `Không thể xóa thành viên "${name}".`,
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

  const getStaffInitials = (name?: string | null): string => {
    if (!name) return 'NS';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <section className="staff-management-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Status / Notification Banner */}
      {notification && (
        <div
          role={notification.type === 'error' ? 'alert' : 'status'}
          className={notification.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginBottom: '16px' }}
        >
          <strong>{notification.type === 'success' ? '✓ Thành công' : '⚠️ Thông báo'}:</strong> {notification.text}
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ float: 'right', border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Page Heading matching FarmHub Modern Mockup */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Người lao động &amp; Phân công
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            {staffList.length} nhân sự · {assignments.length} phân công vùng canh tác VietGAP tại {selectedFarm?.farmName || 'Trang trại'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isOwner &&
            (activeTab === 'staff' ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsAddStaffOpen(true)}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: '#059669',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Icon name="plus" size={17} /> Thêm nhân viên
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={openAssignModal}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: '#059669',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                }}
              >
                <Icon name="plus" size={17} /> Phân công vùng mới
              </button>
            ))}
        </div>
      </div>

      {/* Unified Clean Card Container */}
      <div className="zone-clean-card">
        {/* Integrated Tabs */}
        <div className="zone-integrated-tabs">
          <button
            type="button"
            className={`zone-integrated-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <Icon name="users" size={17} /> Danh sách nhân sự <span className="tab-count">({staffList.length})</span>
          </button>
          <button
            type="button"
            className={`zone-integrated-tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <Icon name="plots" size={17} /> Phân công vùng sản xuất <span className="tab-count">({assignments.length})</span>
          </button>
        </div>

        {activeTab === 'staff' && (
          <>
            {/* Filter Bar */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon">
                  <Icon name="search" size={17} />
                </span>
                <input
                  type="search"
                  placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Lọc theo trạng thái hoạt động"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="SUSPENDED">Đã ngưng hoạt động</option>
                </select>
                <span className="select-arrow">
                  <Icon name="chevron" size={16} />
                </span>
              </div>

              <button
                type="button"
                className="zone-clean-reload-btn"
                title="Làm mới bộ lọc"
                aria-label="Làm mới bộ lọc"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>

            {loading ? (
              <div className="panel empty-state" style={{ padding: '40px 20px', border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">⏳</div>
                <h2>Đang tải danh sách nhân sự...</h2>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="panel empty-state" style={{ padding: '40px 20px', border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">👥</div>
                <h2>Chưa có nhân sự phù hợp</h2>
                <p>Hãy thử tìm kiếm với từ khóa khác hoặc bấm &quot;Thêm nhân viên&quot; bằng email tài khoản đã kích hoạt.</p>
              </div>
            ) : (
              <>
                <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                          <input type="checkbox" aria-label="Chọn tất cả nhân sự" style={{ cursor: 'pointer' }} />
                        </th>
                        <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                          Thành viên
                        </th>
                        <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                          Liên hệ
                        </th>
                        <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                          Vai trò
                        </th>
                        <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                          Số vùng phụ trách
                        </th>
                        <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                          Ngày tham gia
                        </th>
                        <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          Trạng thái
                        </th>
                        {isOwner && (
                          <th style={{ width: '100px', padding: '14px 16px', textAlign: 'right' }}>
                            Thao tác
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((staff) => {
                        const isActive = staff.status === 'ACTIVE';

                        return (
                          <tr key={staff.farmMemberId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <input type="checkbox" aria-label={`Chọn ${staff.fullName}`} style={{ cursor: 'pointer' }} />
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="staff-initials-avatar">
                                  {getStaffInitials(staff.fullName)}
                                </div>
                                <div>
                                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '14.5px' }}>
                                    {staff.fullName}
                                  </strong>
                                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                                    Mã TV: #{staff.farmMemberId}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ color: '#334155', fontSize: '13.5px', fontWeight: 500 }}>{staff.email}</div>
                              <span style={{ color: '#64748b', fontSize: '12.5px' }}>
                                {staff.phoneNumber || 'Chưa cập nhật SĐT'}
                              </span>
                            </td>

                            <td style={{ padding: '14px 16px' }}>
                              <span
                                className="crop-cat-pill"
                                style={{
                                  background: staff.farmRole === 'OWNER' ? '#ecfdf5' : '#f1f5f9',
                                  color: staff.farmRole === 'OWNER' ? '#047857' : '#334155',
                                  borderColor: staff.farmRole === 'OWNER' ? '#a7f3d0' : '#e2e8f0',
                                }}
                              >
                                {staff.roleLabel}
                              </span>
                            </td>

                            <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 600, fontSize: '13.5px' }}>
                              {staff.activeAssignmentCount} vùng
                            </td>

                            <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13.5px' }}>
                              {staff.joinedAt ? new Date(staff.joinedAt).toLocaleDateString('vi-VN') : '—'}
                            </td>

                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <span className={`status-dot-badge ${isActive ? 'active' : 'completed'}`}>
                                <span className="dot" />
                                {isActive ? 'Hoạt động' : 'Đã ngưng'}
                              </span>
                            </td>

                            {isOwner && (
                              <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="table-icon-btn edit"
                                    title="Chỉnh sửa thông tin nhân sự"
                                    aria-label={`Chỉnh sửa ${staff.fullName}`}
                                    onClick={() => openEditModal(staff)}
                                  >
                                    <Icon name="edit" size={15} />
                                    <span className="sr-only">Chỉnh sửa</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="table-icon-btn danger"
                                    title="Xóa nhân sự khỏi trang trại"
                                    aria-label={`Xóa ${staff.fullName}`}
                                    onClick={() => handleDeleteStaff(staff.farmMemberId, staff.fullName)}
                                  >
                                    <Icon name="trash" size={15} />
                                    <span className="sr-only">Xóa</span>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="zone-table-footer">
                  <div>
                    Hiển thị 1–{filteredStaff.length} trong {filteredStaff.length} nhân sự
                  </div>
                  <div className="zone-pagination-wrap">
                    <button type="button" className="zone-page-btn" disabled aria-label="Trang trước">
                      <Icon name="chevron-left" size={15} />
                    </button>
                    <button type="button" className="zone-page-btn active">
                      1
                    </button>
                    <button type="button" className="zone-page-btn" disabled aria-label="Trang sau">
                      <Icon name="chevron-right" size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'assignments' && (
          <div style={{ padding: '24px' }}>
            {loading ? (
              <div className="panel empty-state" style={{ border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">⏳</div>
                <h2>Đang tải danh sách phân công...</h2>
              </div>
            ) : assignments.length === 0 ? (
              <div className="panel empty-state" style={{ border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">🗺️</div>
                <h2>Chưa có phân công nào</h2>
                <p>Phân công nhân viên kỹ thuật phụ trách từng phân khu (Zone) của trang trại.</p>
                {isOwner && (
                  <button type="button" className="primary-button" style={{ marginTop: '12px' }} onClick={openAssignModal}>
                    <Icon name="plus" size={16} /> Phân công ngay
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {assignments.map((item) => (
                  <div
                    key={item.assignmentId}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span className="crop-cat-pill green">
                          📍 {item.zoneName || `Phân khu #${item.zoneId}`}
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            className="table-icon-btn danger"
                            title="Hủy phân công"
                            aria-label={`Hủy phân công cho ${item.staffName}`}
                            onClick={() => handleUnassign(item.assignmentId)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                      <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#0f172a', fontWeight: 750 }}>
                        👤 {item.staffName || `Thành viên #${item.farmMemberId}`}
                      </h3>
                      {item.staffEmail && (
                        <p style={{ margin: '0 0 8px', color: '#475569', fontSize: '13px' }}>
                          ✉️ {item.staffEmail}
                        </p>
                      )}
                      <p style={{ margin: 0, color: '#059669', fontWeight: 650, fontSize: '13.5px' }}>
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
          </div>
        )}
      </div>

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
