import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import type { StaffAreaAssignment } from '../types';

function formatDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

interface StaffAssignmentsTableProps {
  assignments: StaffAreaAssignment[];
  loading: boolean;
  endingId: string | null;
  onEnd: (assignment: StaffAreaAssignment) => void;
}

export function StaffAssignmentsTable({ assignments, loading, endingId, onEnd }: StaffAssignmentsTableProps) {
  const { lang } = useLanguage();
  if (loading) {
    return <p className="status-note">{(lang === 'en' ? "Loading assignments..." : "Đang tải danh sách phân công...")}</p>;
  }

  if (assignments.length === 0) {
    return <p className="status-note">{(lang === 'en' ? "No staff have been assigned to this production area." : "Chưa có nhân viên nào được phân công cho khu sản xuất này.")}</p>;
  }

  return (
    <div className="zone-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{(lang === 'en' ? "Staff" : "Nhân viên")}</th>
            <th>{(lang === 'en' ? "Status" : "Trạng thái")}</th>
            <th>{(lang === 'en' ? "Start date" : "Ngày bắt đầu")}</th>
            <th>{(lang === 'en' ? "End date" : "Ngày kết thúc")}</th>
            <th>{(lang === 'en' ? "Notes" : "Ghi chú")}</th>
            <th>{(lang === 'en' ? "Actions" : "Hành động")}</th>
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
                    label={(lang === 'en' ? isCurrent ? "Currently assigned" : "Ended" : isCurrent ? 'Đang phụ trách' : 'Đã kết thúc')}
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
                      aria-label={(lang === 'en' ? `End assignment for ${assignment.staffName}` : `Kết thúc phân công cho ${assignment.staffName}`)}
                      title={(lang === 'en' ? "End assignment" : "Kết thúc phân công")}
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