import { message, type TranslationMessage } from "../../../shared/i18n/translate";
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import { Modal } from '../../../shared/components/Modal';
import { formatDate as uiFormatDate } from '../../../shared/format/formatters';

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
  const { lang, t: translate } = useLanguage();
  const [selectedZoneId, setSelectedZoneId] = useState<number>(zoneId);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<StaffZoneAssignment[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [error, setError] = useState<TranslationMessage | null>(null);

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
      setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to revoke staff assignment." : err instanceof Error ? err.message : 'Không thể thu hồi phân công nhân sự.'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError((lang === 'en' ? "Select an eligible staff member to assign." : 'Vui lòng chọn nhân sự đủ điều kiện để phân công.'));
      return;
    }

    const alreadyAssigned = currentAssignments.find(
      (a) => a.farmMemberId === selectedMemberId && a.active
    );
    if (alreadyAssigned) {
      const staffName = staffOptions.find((s) => s.memberId === selectedMemberId)?.fullName || 'Nhân sự này';
      setError((message("{value1} is already assigned to zone \"{value2}\". Duplicate assignments are not allowed!", { value1: staffName, value2: resolvedZoneName })));
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
      setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to assign staff to this zone." : err instanceof Error ? err.message : 'Không thể phân công nhân sự vào khu vực này.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open customLayout onClose={onClose} style={{ width: 'min(660px, 100%)', maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{lang === 'en' ? 'Staff Assignment' : 'Phân công quản lý'}</span>
            <h2>{lang === 'en' ? 'Assign Staff: ' : 'Phân công nhân sự: '}{resolvedZoneName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={(lang === 'en' ? "Close" : "Đóng")}><Icon name="close" /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {error ? <p className="form-error-banner" role="alert">{translate(error)}</p> : null}

          <div className="structured-field-card" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-border)', marginBottom: 0 }}>
            <div className="structured-field-header" style={{ borderBottomColor: 'var(--color-border)' }}>
              <label htmlFor="assign-zone-select" className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>
                {lang === 'en' ? 'Assigned Zone' : 'Khu vực phân công'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">
                {availableZones.length > 1 ? (lang === 'en' ? 'Select Zone' : 'Chọn khu vực') : (lang === 'en' ? 'Fixed Zone' : 'Khu vực cố định')}
              </span>
            </div>
            {availableZones.length > 1 ? (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="assign-zone-select"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                >
                  {availableZones.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>
                      {z.zoneName} ({z.areaValue} {translate(z.areaUnit)})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ fontWeight: 700, color: 'var(--color-primary-text)', fontSize: '15px' }}>🗺️ {resolvedZoneName}</div>
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
              <div style={{ color: 'var(--color-muted)', fontSize: '13.5px' }}>
                {lang === 'en' ? 'No staff currently assigned to this zone.' : 'Chưa có nhân sự nào được phân công phụ trách khu vực này.'}
              </div>
            ) : (
              <div className="file-list" style={{ marginTop: 0 }}>
                {currentAssignments.map((asgn) => (
                  <div key={asgn.assignmentId} className="file-list-item">
                    <div>
                      <strong style={{ color: 'var(--color-text)', display: 'block', fontSize: '14px' }}>
                        {(lang === 'en' ? asgn.staffName || `Staff #${asgn.farmMemberId}` : asgn.staffName || `Nhân sự #${asgn.farmMemberId}`)}
                      </strong>
                      <small style={{ color: 'var(--color-muted)' }}>
                        {(lang === 'en' ? asgn.jobTitle || "Staff" : asgn.jobTitle || 'Nhân viên')} {(lang === 'en' ? " · Assigned date: " : " · Ngày nhận: ")} {uiFormatDate(asgn.assignedAt, lang)}
                      </small>
                    </div>
                    <Button
                      type="button"
                      variant="danger"

                      onClick={() => handleUnassign(asgn.assignmentId)}
                    >
                      {lang === 'en' ? 'Unassign' : 'Thu hồi'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="assign-staff-select" className="structured-field-label">
                {lang === 'en' ? 'Select Staff Member' : 'Chọn nhân sự phụ trách'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">{lang === 'en' ? 'Farm Staff' : 'Nhân sự trang trại'}</span>
            </div>
            {loadingStaff ? (
              <div style={{ color: 'var(--color-muted)', fontSize: '13.5px' }}>{(lang === 'en' ? "⏳ Loading farm staff..." : "⏳ Đang tải danh sách nhân sự trang trại...")}</div>
            ) : staffOptions.length === 0 ? (
              <div style={{ color: 'var(--color-warning)', fontSize: '13.5px' }}>
                {(lang === 'en' ? "⚠️ The farm has no active staff. Add staff under Staff Management." : "⚠️ Trang trại chưa có nhân sự đang hoạt động. Vui lòng thêm tại mục Quản lý nhân sự.")}
              </div>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="assign-staff-select"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                >
                  {staffOptions.map((st) => (
                    <option key={st.memberId} value={st.memberId}>
                      {st.fullName} — {translate(st.jobTitle)} ({st.email})
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
                <label htmlFor="assign-date-input" className="structured-field-badge">{(lang === 'en' ? "Date" : "Ngày")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
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
                <label htmlFor="assign-notes-input" className="structured-field-badge">{notes.length}{(lang === 'en' ? "/200 characters" : "/200 ký tự")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
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
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>{translate("Cancel")}</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || loadingStaff || staffOptions.length === 0}
            >
              {loading ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Assignment' : 'Lưu phân công')}
            </Button>
          </div>
        </form>
      </Modal>
  );
}
