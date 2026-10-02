import { StatusBadge } from '../../../shared/components/StatusBadge';
import type { StaffAreaAssignment } from '../types';

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

interface StaffAssignmentsTableProps {
  assignments: StaffAreaAssignment[];
  loading: boolean;
  endingId: string | null;
  onEnd: (assignment: StaffAreaAssignment) => void;
}

export function StaffAssignmentsTable({ assignments, loading, endingId, onEnd }: StaffAssignmentsTableProps) {
  if (loading) {
    return <p className="status-note">Đang tải danh sách phân công...</p>;
  }

  if (assignments.length === 0) {
    return <p className="status-note">Chưa có nhân viên nào được phân công cho khu sản xuất này.</p>;
  }

  return (
    <div className="plot-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Trạng thái</th>
            <th>Ngày bắt đầu</th>
            <th>Ngày kết thúc</th>
            <th>Ghi chú</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => {
            const isCurrent = !assignment.endsAt;
            return (
              <tr key={assignment.staffAreaAssignmentId}>
                <td>
                  <div className="table-cell-strong">{assignment.staffName}</div>
                  <div className="assignment-email">{assignment.staffEmail}</div>
                </td>
                <td>
                  <StatusBadge
                    label={isCurrent ? 'Đang phụ trách' : 'Đã kết thúc'}
                    tone={isCurrent ? 'success' : 'neutral'}
                  />
                </td>
                <td>{formatDate(assignment.startsAt)}</td>
                <td>{formatDate(assignment.endsAt)}</td>
                <td>{assignment.notes ?? '—'}</td>
                <td>
                  {isCurrent ? (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Kết thúc phân công cho ${assignment.staffName}`}
                      title="Kết thúc phân công"
                      disabled={endingId === assignment.staffAreaAssignmentId}
                      onClick={() => onEnd(assignment)}
                    >
                      {endingId === assignment.staffAreaAssignmentId ? '…' : '✕'}
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}