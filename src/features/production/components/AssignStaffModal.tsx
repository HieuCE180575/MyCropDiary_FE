import { useState, useEffect } from 'react';
import type { StaffZoneAssignment, Zone } from '../types';
import { assignStaffToZone, fetchZoneAssignments, unassignStaffFromZone } from '../zoneBlockService';
import { getFarmStaffList } from '../../staff/staffService';
import { useLanguage } from '../../../shared/i18n/LanguageContext';

interface AssignStaffModalProps {
  isOpen: boolean;
  farmId: number;
  zoneId: number;
  zoneName: string;
  availableZones?: Zone[];
  onClose: () => void;
  onSuccess: (assignment: StaffZoneAssignment) => void;
}

interface StaffOption {
  memberId: number;
  fullName: string;
  email: string;
  jobTitle: string;
  status: string;
}

export function AssignStaffModal({
  isOpen,
  farmId,
  zoneId,
  zoneName,
  availableZones = [],
  onClose,
  onSuccess,
}: AssignStaffModalProps) {
  const { lang } = useLanguage();
  const [selectedZoneId, setSelectedZoneId] = useState<number>(zoneId);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<StaffZoneAssignment[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedZoneId(zoneId || availableZones[0]?.zoneId || 1);
    setError(null);
    setNotes('');
  }, [isOpen, zoneId, availableZones]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingStaff(true);

    Promise.all([
      getFarmStaffList(farmId).catch(() => []),
      fetchZoneAssignments(farmId, selectedZoneId).catch(() => []),
    ])
      .then(([members, zAssignments]) => {
        if (cancelled) return;
        const activeMembers = members
          .filter((m) => (m.status || 'ACTIVE').toLowerCase() === 'active')
          .map((m) => ({
            memberId: m.farmMemberId,
            fullName: m.fullName,
            email: m.email,
            jobTitle: m.roleLabel || 'Nhân viên kỹ thuật',
            status: m.status,
          }));
        setStaffOptions(activeMembers);
        setCurrentAssignments(zAssignments.filter((a: StaffZoneAssignment) => a.active));
        if (activeMembers.length > 0) {
          setSelectedMemberId(activeMembers[0].memberId);
        } else {
          setSelectedMemberId(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStaff(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, farmId, selectedZoneId]);

  if (!isOpen) return null;

  const resolvedZoneName =
    availableZones.find((z) => z.zoneId === selectedZoneId)?.zoneName || zoneName || `Khu vực #${selectedZoneId}`;

  const handleUnassign = async (assignmentId: number) => {
    try {
      await unassignStaffFromZone(farmId, assignmentId);
      setCurrentAssignments((prev) => prev.filter((a) => a.assignmentId !== assignmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thu hồi phân công nhân sự.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('Vui lòng chọn nhân sự đủ điều kiện để phân công.');
      return;
    }

    const alreadyAssigned = currentAssignments.find(
      (a) => a.farmMemberId === selectedMemberId && a.active
    );
    if (alreadyAssigned) {
      const staffName = staffOptions.find((s) => s.memberId === selectedMemberId)?.fullName || 'Nhân sự này';
      setError(`${staffName} đã và đang được phân công phụ trách phân khu "${resolvedZoneName}". Không thể phân công trùng lặp!`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const assignedAtIso = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : new Date().toISOString();
      const assignment = await assignStaffToZone(farmId, selectedZoneId, {
        farmMemberId: selectedMemberId,
        assignedAt: assignedAtIso,
        notes,
      });
      onSuccess(assignment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể phân công nhân sự vào khu vực này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ width: 'min(660px, 100%)', maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{lang === 'en' ? 'Staff Assignment' : 'Phân công quản lý'}</span>
            <h2>{lang === 'en' ? 'Assign Staff: ' : 'Phân công nhân sự: '}{resolvedZoneName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {error ? <p className="form-error-banner" role="alert">{error}</p> : null}

          <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
            <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
              <label htmlFor="assign-zone-select" className="structured-field-label" style={{ color: '#065f46' }}>
                {lang === 'en' ? 'Assigned Zone' : 'Khu vực phân công'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">
                {availableZones.length > 1 ? (lang === 'en' ? 'Select Zone' : 'Chọn khu vực') : (lang === 'en' ? 'Fixed Zone' : 'Khu vực cố định')}
              </span>
            </div>
            {availableZones.length > 1 ? (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="assign-zone-select"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                >
                  {availableZones.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>
                      {z.zoneName} ({z.areaValue} {z.areaUnit})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ fontWeight: 700, color: '#047857', fontSize: '15px' }}>🗺️ {resolvedZoneName}</div>
            )}
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <span className="structured-field-label">
                {lang === 'en' ? 'Assigned Staff in Zone' : 'Nhân sự đang phụ trách khu vực'}
              </span>
              <span className="structured-field-badge">{currentAssignments.length} {lang === 'en' ? 'staff member(s)' : 'nhân sự'}</span>
            </div>
            {currentAssignments.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '13.5px' }}>
                {lang === 'en' ? 'No staff currently assigned to this zone.' : 'Chưa có nhân sự nào được phân công phụ trách khu vực này.'}
              </div>
            ) : (
              <div className="file-list" style={{ marginTop: 0 }}>
                {currentAssignments.map((asgn) => (
                  <div key={asgn.assignmentId} className="file-list-item">
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '14px' }}>
                        {asgn.staffName || `Nhân sự #${asgn.farmMemberId}`}
                      </strong>
                      <small style={{ color: '#64748b' }}>
                        {asgn.jobTitle || 'Nhân viên'} · Ngày nhận: {new Date(asgn.assignedAt).toLocaleDateString('vi-VN')}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="action-button danger"
                      style={{ minHeight: '34px', padding: '4px 12px', fontSize: '12.5px' }}
                      onClick={() => handleUnassign(asgn.assignmentId)}
                    >
                      {lang === 'en' ? 'Unassign' : 'Thu hồi'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="assign-staff-select" className="structured-field-label">
                {lang === 'en' ? 'Select Staff Member' : 'Chọn nhân sự phụ trách'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{lang === 'en' ? 'Farm Staff' : 'Nhân sự trang trại'}</span>
            </div>
            {loadingStaff ? (
              <div style={{ color: '#64748b', fontSize: '13.5px' }}>⏳ Đang tải danh sách nhân sự trang trại...</div>
            ) : staffOptions.length === 0 ? (
              <div style={{ color: '#d97706', fontSize: '13.5px' }}>
                ⚠️ Trang trại chưa có nhân sự đang hoạt động. Vui lòng thêm tại mục Quản lý nhân sự.
              </div>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="assign-staff-select"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                >
                  {staffOptions.map((st) => (
                    <option key={st.memberId} value={st.memberId}>
                      {st.fullName} — {st.jobTitle} ({st.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="assign-date-input" className="structured-field-label">
                  {lang === 'en' ? 'Assignment Start Date' : 'Ngày bắt đầu phụ trách'}
                </label>
                <span className="structured-field-badge">Ngày</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="assign-date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="assign-notes-input" className="structured-field-label">
                  {lang === 'en' ? 'Assignment Notes' : 'Ghi chú nhiệm vụ'}
                </label>
                <span className="structured-field-badge">{notes.length}/200 ký tự</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="assign-notes-input"
                  type="text"
                  maxLength={200}
                  placeholder={lang === 'en' ? 'e.g. In charge of field crop care and block condition recording...' : 'VD: Phụ trách chăm sóc và ghi nhận điều kiện các lô đất...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={loading || loadingStaff || staffOptions.length === 0}
            >
              {loading ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Assignment' : 'Lưu phân công')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
