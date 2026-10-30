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
  const [assignSearch, setAssignSearch] = useState('');
  const [assignZoneFilter, setAssignZoneFilter] = useState('ALL');
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
  const [assignNotes, setAssignNotes] = useState('');
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
    setAssignNotes('');
    setAssignedAtDate(new Date().toISOString().split('T')[0]);
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
        notes: assignNotes.trim() || undefined,
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

  const filteredAssignments = assignments.filter((item) => {
    const q = assignSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (item.staffName && item.staffName.toLowerCase().includes(q)) ||
      (item.staffEmail && item.staffEmail.toLowerCase().includes(q)) ||
      (item.zoneName && item.zoneName.toLowerCase().includes(q)) ||
      (item.jobTitle && item.jobTitle.toLowerCase().includes(q));
    const matchesZone = assignZoneFilter === 'ALL' || String(item.zoneId) === String(assignZoneFilter);
    return matchesSearch && matchesZone;
  });

  const activeStaffOptions = staffList.filter((s) => s.status === 'ACTIVE');

  const parseStaffName = (rawName?: string | null) => {
    if (!rawName) return { displayName: 'Nhân sự', subTitle: null, initials: 'NS' };
    const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
    let displayName = rawName.trim();
    let subTitle: string | null = null;
    if (match) {
      displayName = match[1].trim();
      subTitle = match[2].trim();
    }
    const parts = displayName.split(/\s+/).filter(Boolean);
    const initials =
      parts.length === 0
        ? 'NS'
        : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

    return { displayName, subTitle, initials };
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
                        <th style={{ width: '44px', padding: '14px 16px', textAlign: 'center' }}>
                          <input type="checkbox" aria-label="Chọn tất cả nhân sự" style={{ cursor: 'pointer' }} />
                        </th>
                        <th style={{ minWidth: '260px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          Thành viên
                        </th>
                        <th style={{ minWidth: '220px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          Liên hệ
                        </th>
                        <th style={{ minWidth: '130px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          Vai trò
                        </th>
                        <th style={{ minWidth: '140px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          Số vùng phụ trách
                        </th>
                        <th style={{ minWidth: '130px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          Ngày tham gia
                        </th>
                        <th style={{ minWidth: '130px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          Trạng thái
                        </th>
                        {isOwner && (
                          <th style={{ width: '130px', padding: '14px 16px', textAlign: 'right' }}>
                            Thao tác
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((staff) => {
                        const isActive = staff.status === 'ACTIVE';
                        const { displayName, subTitle, initials } = parseStaffName(staff.fullName);

                        return (
                          <tr key={staff.farmMemberId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <input type="checkbox" aria-label={`Chọn ${displayName}`} style={{ cursor: 'pointer' }} />
                            </td>

                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="staff-initials-avatar" style={{ flexShrink: 0 }}>
                                  {initials}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <strong style={{ color: '#0f172a', fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                      {displayName}
                                    </strong>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                      #{staff.farmMemberId}
                                    </span>
                                  </div>
                                  {subTitle && (
                                    <span style={{ display: 'block', fontSize: '12px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                                      {subTitle}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                              <div style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: 500 }}>
                                {staff.email}
                              </div>
                              <span style={{ color: '#64748b', fontSize: '12.5px', marginTop: '2px', display: 'block' }}>
                                {staff.phoneNumber || 'Chưa cập nhật SĐT'}
                              </span>
                            </td>

                            <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                className="crop-cat-pill"
                                style={{
                                  background: staff.farmRole === 'OWNER' ? '#ecfdf5' : '#f8fafc',
                                  color: staff.farmRole === 'OWNER' ? '#047857' : '#334155',
                                  borderColor: staff.farmRole === 'OWNER' ? '#a7f3d0' : '#cbd5e1',
                                  fontWeight: 650,
                                }}
                              >
                                {staff.roleLabel}
                              </span>
                            </td>

                            <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: '6px',
                                  background: staff.activeAssignmentCount > 0 ? '#ecfdf5' : '#f1f5f9',
                                  color: staff.activeAssignmentCount > 0 ? '#047857' : '#64748b',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                }}
                              >
                                {staff.activeAssignmentCount} vùng
                              </span>
                            </td>

                            <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', color: '#64748b', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                              {staff.joinedAt ? new Date(staff.joinedAt).toLocaleDateString('vi-VN') : '—'}
                            </td>

                            <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span className={`status-dot-badge ${isActive ? 'active' : 'completed'}`}>
                                <span className="dot" />
                                {isActive ? 'Hoạt động' : 'Đã ngưng'}
                              </span>
                            </td>

                            {isOwner && (
                              <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="table-icon-btn edit"
                                    title="Chỉnh sửa thông tin nhân sự"
                                    aria-label={`Chỉnh sửa ${displayName}`}
                                    onClick={() => openEditModal(staff)}
                                  >
                                    <Icon name="edit" size={15} />
                                    <span className="sr-only">Chỉnh sửa</span>
                                  </button>
                                  {isActive ? (
                                    <button
                                      type="button"
                                      className="table-icon-btn"
                                      title="Tạm ngưng hoạt động nhân viên"
                                      aria-label={`Tạm dừng ${displayName}`}
                                      onClick={() => handleDeactivate(staff.farmMemberId, displayName)}
                                    >
                                      <Icon name="close" size={14} />
                                      <span className="sr-only">Tạm ngưng</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="table-icon-btn edit"
                                      title="Kích hoạt lại nhân viên"
                                      aria-label={`Kích hoạt lại ${displayName}`}
                                      onClick={() => handleReactivate(staff.farmMemberId, displayName)}
                                    >
                                      <Icon name="check" size={14} />
                                      <span className="sr-only">Kích hoạt</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="table-icon-btn danger"
                                    title="Xóa nhân sự khỏi trang trại"
                                    aria-label={`Xóa ${displayName}`}
                                    onClick={() => handleDeleteStaff(staff.farmMemberId, displayName)}
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
          <>
            {/* Filter Bar */}
            <div className="zone-clean-filter-bar">
              <div className="zone-clean-search">
                <span className="search-icon">
                  <Icon name="search" size={17} />
                </span>
                <input
                  type="search"
                  placeholder="Tìm theo tên nhân sự hoặc phân khu phụ trách..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select
                  value={assignZoneFilter}
                  onChange={(e) => setAssignZoneFilter(e.target.value)}
                  aria-label="Lọc theo phân khu sản xuất"
                >
                  <option value="ALL">Tất cả phân khu ({zones.length})</option>
                  {zones.map((z) => (
                    <option key={z.zoneId} value={String(z.zoneId)}>
                      {z.zoneName}
                    </option>
                  ))}
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
                  setAssignSearch('');
                  setAssignZoneFilter('ALL');
                }}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>

            {loading ? (
              <div className="panel empty-state" style={{ padding: '40px 20px', border: 'none', boxShadow: 'none' }}>
                <div className="empty-icon">⏳</div>
                <h2>Đang tải danh sách phân công...</h2>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="panel empty-state" style={{ padding: '60px 20px', border: 'none', boxShadow: 'none' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Icon name="plots" size={32} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                  {assignments.length === 0 ? 'Chưa có phân công nào' : 'Không tìm thấy phân công phù hợp'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                  {assignments.length === 0
                    ? 'Phân công nhân viên kỹ thuật phụ trách từng phân khu sản xuất để quản lý mùa vụ, lô đất và giám sát quy trình VietGAP.'
                    : 'Hãy thử tìm kiếm với từ khóa khác hoặc làm mới bộ lọc phân khu.'}
                </p>
                {isOwner && assignments.length === 0 && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={openAssignModal}
                    style={{
                      padding: '10px 20px',
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
                    <Icon name="plus" size={16} /> Phân công ngay
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ width: '44px', padding: '14px 16px', textAlign: 'center' }}>
                          <input type="checkbox" aria-label="Chọn tất cả phân công" style={{ cursor: 'pointer' }} />
                        </th>
                        <th style={{ minWidth: '220px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          Phân khu sản xuất
                        </th>
                        <th style={{ minWidth: '240px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          Nhân sự phụ trách
                        </th>
                        <th style={{ minWidth: '160px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          Vai trò / Chức vụ
                        </th>
                        <th style={{ minWidth: '130px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                          Ngày bắt đầu
                        </th>
                        <th style={{ minWidth: '140px', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'left' }}>
                          Người giao việc
                        </th>
                        {isOwner && (
                          <th style={{ width: '100px', padding: '14px 16px', textAlign: 'right' }}>
                            Thao tác
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.map((item) => {
                        const { displayName, subTitle, initials } = parseStaffName(item.staffName);

                        return (
                          <tr key={item.assignmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <input
                                type="checkbox"
                                aria-label={`Chọn phân công của ${displayName}`}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>

                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Icon name="plots" size={18} />
                                </span>
                                <div>
                                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '14.5px', fontWeight: 700 }}>
                                    {item.zoneName || `Phân khu #${item.zoneId}`}
                                  </strong>
                                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                                    Mã: KV-00{item.zoneId}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="staff-initials-avatar" style={{ flexShrink: 0 }}>
                                  {initials}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {displayName}
                                  </strong>
                                  <span style={{ fontSize: '12.5px', color: '#64748b', display: 'block' }}>
                                    {item.staffEmail || 'Chưa có email'}
                                  </span>
                                  {subTitle && (
                                    <span style={{ display: 'block', fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                                      {subTitle}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <span
                                className="crop-cat-pill"
                                style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontWeight: 650 }}
                              >
                                {item.jobTitle || 'Kỹ thuật viên phụ trách'}
                              </span>
                            </td>

                            <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13.5px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString('vi-VN') : '—'}
                            </td>

                            <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13.5px', fontWeight: 500, verticalAlign: 'middle' }}>
                              {item.assignedByName || 'Chủ trang trại'}
                            </td>

                            {isOwner && (
                              <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="table-icon-btn danger"
                                    title="Hủy phân công nhân sự khỏi phân khu"
                                    aria-label={`Hủy phân công cho ${displayName}`}
                                    onClick={() => handleUnassign(item.assignmentId)}
                                  >
                                    <Icon name="trash" size={15} />
                                    <span className="sr-only">Hủy phân công</span>
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
                    Hiển thị 1–{filteredAssignments.length} trong {filteredAssignments.length} lượt phân công
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
      </div>

      {/* Add Staff Modal */}
      <Modal
        open={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Thêm nhân viên vào trang trại"
        headerIcon={<Icon name="users" size={20} />}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748b', lineHeight: 1.5 }}>
          Nhập email của người dùng đã có tài khoản trên MyCropDiary để cấp quyền làm việc tại trang trại.
        </p>
        <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="add-staff-email" className="structured-field-label">
                Email tài khoản nhân viên <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">Bắt buộc</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="add-staff-email"
                type="email"
                required
                placeholder="nhanvien@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="add-staff-role" className="structured-field-label">
                Vai trò trong trang trại <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">Phân quyền</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select
                id="add-staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="STAFF">Nhân viên kỹ thuật (STAFF)</option>
                <option value="OWNER">Đồng chủ trang trại (OWNER)</option>
              </select>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="add-staff-job-title" className="structured-field-label">
                Chức danh chuyên môn
              </label>
              <span className="structured-field-badge">Hiển thị</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="add-staff-job-title"
                type="text"
                maxLength={100}
                placeholder="VD: Kỹ sư nông học / Quản lý BVTV..."
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={() => setIsAddStaffOpen(false)} disabled={savingStaff}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={savingStaff}>
              {savingStaff ? 'Đang thêm...' : 'Thêm nhân viên'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        open={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title={`Chỉnh sửa nhân viên: ${editingStaff?.fullName || ''}`}
        headerIcon={<Icon name="edit" size={20} />}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748b' }}>
          Cập nhật vai trò, chức danh chuyên môn hoặc trạng thái làm việc của thành viên.
        </p>
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="edit-staff-role" className="structured-field-label">
                Vai trò trong trang trại <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">Quyền hạn</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select
                id="edit-staff-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as 'OWNER' | 'STAFF')}
              >
                <option value="STAFF">Nhân viên kỹ thuật (STAFF)</option>
                <option value="OWNER">Đồng chủ trang trại (OWNER)</option>
              </select>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="edit-staff-job-title" className="structured-field-label">
                Chức danh chuyên môn
              </label>
              <span className="structured-field-badge">Tùy chỉnh</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="edit-staff-job-title"
                type="text"
                maxLength={100}
                placeholder="VD: Kỹ sư nông học / Quản lý dinh dưỡng..."
                value={editJobTitle}
                onChange={(e) => setEditJobTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="edit-staff-status" className="structured-field-label">
                Trạng thái làm việc
              </label>
              <span className="structured-field-badge">Trạng thái</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select
                id="edit-staff-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
              </select>
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={() => setEditingStaff(null)} disabled={savingEdit}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={savingEdit}>
              {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Staff Modal ("Form phân công") */}
      <Modal
        open={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Phân công nhân sự phụ trách phân khu"
        headerIcon={<Icon name="plots" size={20} />}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#64748b' }}>
          Chỉ định kỹ sư hoặc nhân viên kỹ thuật chịu trách nhiệm giám sát và ghi chép nhật ký canh tác theo chuẩn VietGAP cho phân khu sản xuất.
        </p>
        <form onSubmit={handleAssignZone} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Field 1: Chọn nhân sự */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="assign-staff-select" className="structured-field-label">
                Chọn nhân sự phụ trách <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{activeStaffOptions.length} nhân sự khả dụng</span>
            </div>
            {activeStaffOptions.length === 0 ? (
              <p style={{ color: '#dc2626', fontSize: '13.5px', margin: 0 }}>
                ⚠️ Trang trại chưa có nhân sự đang hoạt động. Vui lòng thêm nhân viên trước khi phân công.
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="assign-staff-select"
                  required
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Chọn thành viên phụ trách --</option>
                  {activeStaffOptions.map((s) => (
                    <option key={s.farmMemberId} value={s.farmMemberId}>
                      {s.fullName} ({s.email}) — {s.roleLabel || 'Nhân sự'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Field 2: Chọn phân khu */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="assign-zone-select" className="structured-field-label">
                Phân khu sản xuất tiếp nhận <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{zones.length} phân khu</span>
            </div>
            {zones.length === 0 ? (
              <p style={{ color: '#dc2626', fontSize: '13.5px', margin: 0 }}>
                ⚠️ Chưa có phân khu sản xuất nào trong trang trại. Vui lòng tạo phân khu trước.
              </p>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="assign-zone-select"
                  required
                  value={assignZoneId}
                  onChange={(e) => setAssignZoneId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Chọn phân khu sản xuất --</option>
                  {zones.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>
                      {z.zoneName} (KV-00{z.zoneId} · {z.areaValue} {z.areaUnit})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Field 3: Ngày bắt đầu & Ghi chú */}
          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="assign-start-date" className="structured-field-label">
                  Ngày bắt đầu phụ trách <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">Ngày</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="assign-start-date"
                  type="date"
                  required
                  value={assignedAtDate}
                  onChange={(e) => setAssignedAtDate(e.target.value)}
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="assign-notes" className="structured-field-label">
                  Nhiệm vụ &amp; Ghi chú
                </label>
                <span className="structured-field-badge">{assignNotes.length}/200 ký tự</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="assign-notes"
                  type="text"
                  maxLength={200}
                  placeholder="VD: Quản lý canh tác, giám sát sâu bệnh..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={() => setIsAssignOpen(false)} disabled={savingAssign}>
              Hủy
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={savingAssign || !assignStaffId || !assignZoneId}
            >
              {savingAssign ? 'Đang phân công...' : 'Xác nhận phân công'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
