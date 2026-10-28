import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Icon } from '../../../shared/components/Icon';
import { assignStaffToZone } from '../zoneBlockService';
import { getFarmMembers, type FarmMemberItem } from '../../farm-management/api';
import type { StaffZoneAssignment } from '../types';

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: number;
  zoneId: number;
  zoneName: string;
  onSuccess: (assignment: StaffZoneAssignment) => void;
}

export function AssignStaffModal({ isOpen, onClose, farmId, zoneId, zoneName, onSuccess }: AssignStaffModalProps) {
  const [members, setMembers] = useState<FarmMemberItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
  const [assignedAt, setAssignedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !farmId) return;
    setError(null);
    setMembers([]);
    setSelectedMemberId('');
    setLoadingMembers(true);
    getFarmMembers(farmId)
      .then((data) => {
        setMembers(data);
        if (data.length > 0) {
          setSelectedMemberId(data[0].id);
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Không tải được danh sách nhân viên.'))
      .finally(() => setLoadingMembers(false));
  }, [isOpen, farmId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('Vui lòng chọn nhân viên cần phân công.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const assignment = await assignStaffToZone(farmId, zoneId, {
        farmMemberId: selectedMemberId,
        assignedAt: assignedAt ? new Date(assignedAt).toISOString() : undefined,
        notes,
      });
      onSuccess(assignment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phân công nhân viên thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`Phân công phụ trách: ${zoneName}`}>
      <form onSubmit={handleSubmit} className="form-layout">
        {error && <div className="alert alert--error">{error}</div>}

        <div className="form-group">
          <label className="form-label" htmlFor="staffSelect">
            Chọn nhân sự trang trại <span className="required-star">*</span>:
          </label>
          {loadingMembers ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>Đang tải danh sách nhân sự...</p>
          ) : (
            <select
              id="staffSelect"
              className="form-select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(Number(e.target.value))}
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.email}) - {m.role}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="assignedDateInput">Ngày bắt đầu phụ trách:</label>
          <input
            id="assignedDateInput"
            type="date"
            className="form-input"
            value={assignedAt}
            onChange={(e) => setAssignedAt(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="assignNotesInput">Ghi chú phân công / Trách nhiệm chính:</label>
          <textarea
            id="assignNotesInput"
            className="form-textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Phụ trách giám sát nước tưới và sâu bệnh theo lịch VietGAP..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary-emerald" disabled={submitting}>
            {submitting ? (
              <>
                <Icon name="loader" className="animate-spin" /> Đang phân công...
              </>
            ) : (
              <>
                <Icon name="user-plus" /> Xác nhận phân công
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
