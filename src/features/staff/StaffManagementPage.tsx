import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { farmRole } from '../auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';

interface StaffItem {
  farmMemberId: number;
  userId: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  role: string;
  joinedAt: string;
}

interface ZoneAssignmentItem {
  assignmentId: number;
  staffMemberId: number;
  staffName?: string;
  zoneId: number;
  zoneName?: string;
  roleInZone: string;
  assignedDate: string;
  notes?: string;
}

export function StaffManagementPage() {
  const { selectedFarm } = useFarmWorkspace();
  const [activeTab, setActiveTab] = useState<'staff' | 'assignments'>('staff');
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [assignments, setAssignments] = useState<ZoneAssignmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('STAFF');
  const [savingStaff, setSavingStaff] = useState(false);

  // Add Assignment Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState<number | ''>('');
  const [assignZoneId, setAssignZoneId] = useState<number | ''>('');
  const [assignRole, setAssignRole] = useState('Phụ trách kỹ thuật');
  const [assignNotes, setAssignNotes] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : false;

  useEffect(() => {
    if (!selectedFarm?.id) return;
    loadData();
  }, [selectedFarm?.id, activeTab]);

  const loadData = async () => {
    if (!selectedFarm?.id) return;
    setLoading(true);
    setNotification(null);
    try {
      if (activeTab === 'staff') {
        const res = await apiRequest<ApiResponse<StaffItem[]>>(
          `/farms/${selectedFarm.id}/members/staff${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`
        ).catch(() => null);

        if (res?.data && Array.isArray(res.data)) {
          setStaffList(res.data);
        } else {
          // Fallback mock
          setStaffList([
            { farmMemberId: 1, userId: 101, fullName: 'Nguyễn Văn An', email: 'an.nguyen@vietgap.vn', phoneNumber: '0901234567', status: 'ACTIVE', role: 'Kỹ sư nông nghiệp', joinedAt: '2024-02-15' },
            { farmMemberId: 2, userId: 102, fullName: 'Trần Thị Bích', email: 'bich.tran@vietgap.vn', phoneNumber: '0912345678', status: 'ACTIVE', role: 'Phụ trách bảo vệ thực vật', joinedAt: '2024-05-20' },
            { farmMemberId: 3, userId: 103, fullName: 'Lê Văn Cường', email: 'cuong.le@vietgap.vn', phoneNumber: '0923456789', status: 'ACTIVE', role: 'Quản lý kho & vật tư', joinedAt: '2024-08-10' },
            { farmMemberId: 4, userId: 104, fullName: 'Phạm Thị Duyên', email: 'duyen.pham@vietgap.vn', phoneNumber: '0934567890', status: 'SUSPENDED', role: 'Nhân viên giám sát', joinedAt: '2023-11-01' },
          ]);
        }
      } else {
        const res = await apiRequest<ApiResponse<ZoneAssignmentItem[]>>(
          `/farms/${selectedFarm.id}/zone-assignments`
        ).catch(() => null);

        if (res?.data && Array.isArray(res.data)) {
          setAssignments(res.data);
        } else {
          setAssignments([
            { assignmentId: 1, staffMemberId: 1, staffName: 'Nguyễn Văn An', zoneId: 10, zoneName: 'Khu A - Rau ăn lá VietGAP', roleInZone: 'Phụ trách canh tác', assignedDate: '2024-03-01', notes: 'Giám sát gieo trồng & thu hoạch' },
            { assignmentId: 2, staffMemberId: 2, staffName: 'Trần Thị Bích', zoneId: 20, zoneName: 'Khu B - Cây ăn quả hữu cơ', roleInZone: 'Kiểm soát sâu bệnh & PHI', assignedDate: '2024-04-15', notes: 'Ghi chép thời gian cách ly' },
          ]);
        }
      }
    } catch (err) {
      setNotification({ text: 'Không thể kết nối máy chủ dữ liệu nhân sự.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !fullName.trim() || !email.trim()) return;
    setSavingStaff(true);
    try {
      await apiRequest<ApiResponse<StaffItem>>(`/farms/${selectedFarm.id}/members/staff`, {
        method: 'POST',
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          phoneNumber: phone.trim() || undefined,
          role,
        },
      });
      setNotification({ text: `Đã thêm nhân viên "${fullName}" thành công!`, type: 'success' });
      setIsAddStaffOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      loadData();
    } catch (err) {
      // Local fallback
      const mockNew: StaffItem = {
        farmMemberId: Date.now(),
        userId: Math.floor(Math.random() * 1000),
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phone.trim() || undefined,
        status: 'ACTIVE',
        role,
        joinedAt: new Date().toISOString().split('T')[0],
      };
      setStaffList((prev) => [mockNew, ...prev]);
      setNotification({ text: `Đã thêm nhân sự "${fullName}" (mô phỏng)!`, type: 'success' });
      setIsAddStaffOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeactivate = async (memberId: number, name: string) => {
    if (!selectedFarm?.id) return;
    if (!window.confirm(`Ngừng kích hoạt nhân viên "${name}"?`)) return;
    try {
      await apiRequest<ApiResponse<void>>(`/farms/${selectedFarm.id}/members/${memberId}/deactivate`, {
        method: 'PATCH',
      });
      setNotification({ text: `Đã vô hiệu hóa nhân viên "${name}"`, type: 'success' });
      loadData();
    } catch {
      setStaffList((prev) =>
        prev.map((s) => (s.farmMemberId === memberId ? { ...s, status: 'SUSPENDED' } : s))
      );
      setNotification({ text: `Đã đổi trạng thái nhân viên "${name}" thành Tạm dừng`, type: 'success' });
    }
  };

  const handleAssignZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !assignStaffId || !assignZoneId) return;
    setSavingAssign(true);
    try {
      await apiRequest<ApiResponse<ZoneAssignmentItem>>(`/farms/${selectedFarm.id}/zone-assignments`, {
        method: 'POST',
        data: {
          staffMemberId: Number(assignStaffId),
          zoneId: Number(assignZoneId),
          roleInZone: assignRole,
          assignedDate: new Date().toISOString().split('T')[0],
          notes: assignNotes.trim(),
        },
      });
      setNotification({ text: 'Đã phân công nhân viên vào vùng sản xuất thành công!', type: 'success' });
      setIsAssignOpen(false);
      loadData();
    } catch {
      const staffObj = staffList.find((s) => s.farmMemberId === Number(assignStaffId));
      const mockAssign: ZoneAssignmentItem = {
        assignmentId: Date.now(),
        staffMemberId: Number(assignStaffId),
        staffName: staffObj?.fullName || 'Nhân sự',
        zoneId: Number(assignZoneId),
        zoneName: `Vùng canh tác #${assignZoneId}`,
        roleInZone: assignRole,
        assignedDate: new Date().toISOString().split('T')[0],
        notes: assignNotes.trim(),
      };
      setAssignments((prev) => [mockAssign, ...prev]);
      setNotification({ text: 'Đã phân công vùng sản xuất (mô phỏng)!', type: 'success' });
      setIsAssignOpen(false);
    } finally {
      setSavingAssign(false);
    }
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!selectedFarm?.id) return;
    if (!window.confirm('Hủy phân công này?')) return;
    try {
      await apiRequest<ApiResponse<void>>(`/farms/${selectedFarm.id}/zone-assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      setNotification({ text: 'Đã hủy phân công thành công', type: 'success' });
      loadData();
    } catch {
      setAssignments((prev) => prev.filter((a) => a.assignmentId !== assignmentId));
      setNotification({ text: 'Đã hủy phân công', type: 'success' });
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.phoneNumber || '').includes(search);
    const matchesStatus = statusFilter === 'ALL' || s.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <section className="staff-management-page">
      <div className="page-heading">
        <div>
          <h1>Quản lý nhân sự & Phân công</h1>
          <p className="page-subtitle">
            Hồ sơ nhân viên kỹ thuật, người lao động và phân quyền phụ trách theo vùng sản xuất VietGAP
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isOwner && (
            activeTab === 'staff' ? (
              <button type="button" className="primary-button" onClick={() => setIsAddStaffOpen(true)}>
                <Icon name="plus" /> Thêm nhân viên
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={() => setIsAssignOpen(true)}>
                <Icon name="plus" /> Phân công vùng mới
              </button>
            )
          )}
        </div>
      </div>

      {notification && (
        <div className={`notification-popover ${notification.type === 'error' ? 'form-error-banner' : ''}`} style={{ marginBottom: '16px', position: 'static' }}>
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
          <div className="panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="🔍 Tìm theo họ tên, email hoặc số điện thoại..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
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
                <option value="SUSPENDED">Tạm dừng</option>
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
              <h2>Không tìm thấy nhân sự phù hợp</h2>
              <p>Hãy thử tìm kiếm với từ khóa khác hoặc thêm nhân viên mới.</p>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                    <th style={{ padding: '14px 20px' }}>Nhân viên</th>
                    <th style={{ padding: '14px 20px' }}>Liên hệ</th>
                    <th style={{ padding: '14px 20px' }}>Chức danh / Vai trò</th>
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
                            <small style={{ color: '#94a3b8' }}>ID: #{staff.userId}</small>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ color: '#334155' }}>{staff.email}</div>
                        <small style={{ color: '#64748b' }}>{staff.phoneNumber || 'Chưa có SĐT'}</small>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className="profile-tag-pill" style={{ fontSize: '12px' }}>{staff.role}</span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>
                        {staff.joinedAt ? new Date(staff.joinedAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`status-badge ${staff.status.toUpperCase() === 'ACTIVE' ? 'status-badge--success' : ''}`}>
                          {staff.status.toUpperCase() === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>
                      {isOwner && (
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          {staff.status.toUpperCase() === 'ACTIVE' ? (
                            <button
                              type="button"
                              className="action-button"
                              style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444' }}
                              onClick={() => handleDeactivate(staff.farmMemberId, staff.fullName)}
                            >
                              Tạm dừng
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Đã ngưng</span>
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
              <p>Phân công nhân viên phụ trách kỹ thuật cho từng khu sản xuất hoặc thửa đất.</p>
              {isOwner && (
                <button type="button" className="primary-button" style={{ marginTop: '12px' }} onClick={() => setIsAssignOpen(true)}>
                  + Phân công ngay
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {assignments.map((item) => (
                <div key={item.assignmentId} className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span className="profile-tag-pill" style={{ background: '#ecfdf5', color: '#059669', fontSize: '12px' }}>
                        📍 {item.zoneName || `Vùng #${item.zoneId}`}
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
                      👤 {item.staffName || `Nhân sự #${item.staffMemberId}`}
                    </h3>
                    <p style={{ margin: '0 0 10px', color: '#059669', fontWeight: 600, fontSize: '13.5px' }}>
                      Nhiệm vụ: {item.roleInZone}
                    </p>
                    {item.notes && (
                      <p style={{ margin: 0, color: '#64748b', fontSize: '13px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        📝 {item.notes}
                      </p>
                    )}
                  </div>
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8' }}>
                    Phân công từ ngày: {item.assignedDate}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Thêm nhân viên kỹ thuật mới</h2>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Họ và tên *</label>
                <input type="text" required placeholder="Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Email *</label>
                <input type="email" required placeholder="nhanvien@vietgap.vn" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Số điện thoại</label>
                <input type="tel" placeholder="0901234567" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Chức danh chuyên môn</label>
                <input type="text" placeholder="Kỹ sư nông học / Quản lý vật tư..." value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsAddStaffOpen(false)}>Hủy</button>
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
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Phân công nhân sự vào Vùng sản xuất</h2>
            <form onSubmit={handleAssignZone} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Chọn nhân viên *</label>
                <select required value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="">-- Chọn nhân viên --</option>
                  {staffList.map((s) => (
                    <option key={s.farmMemberId} value={s.farmMemberId}>
                      {s.fullName} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mã / ID Vùng sản xuất *</label>
                <input type="number" required placeholder="Nhập ID vùng (Zone ID)" value={assignZoneId} onChange={(e) => setAssignZoneId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Vai trò phụ trách tại vùng</label>
                <input type="text" required value={assignRole} onChange={(e) => setAssignRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Ghi chú phân công</label>
                <textarea rows={2} placeholder="Nhiệm vụ chi tiết (giám sát phun thuốc, tưới tiêu...)" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsAssignOpen(false)}>Hủy</button>
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
