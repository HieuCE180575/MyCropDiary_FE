import { CircleMinus, PencilSparkles, Undo2 } from 'lucide-react';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { STAFF_STATUS_LABEL, STAFF_STATUS_TONE } from '../constants';
import type { SortDirection, StaffMember, StaffSortField } from '../types';

interface StaffTableProps {
  staff: StaffMember[];
  loading: boolean;
  sortField: StaffSortField;
  sortDirection: SortDirection;
  onSortChange: (field: StaffSortField) => void;
  onEdit: (staff: StaffMember) => void;
  onSuspend: (staff: StaffMember) => void;
  onActivate: (staff: StaffMember) => void;
}

const COLUMNS: { field: StaffSortField | null; label: string }[] = [
  { field: 'fullName', label: 'Họ tên' },
  { field: 'email', label: 'Email' },
  { field: null, label: 'Số điện thoại' },
  { field: null, label: 'Trạng thái' },
  { field: 'joinedAt', label: 'Ngày vào làm' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function StaffTable({
  staff,
  loading,
  sortField,
  sortDirection,
  onSortChange,
  onEdit,
  onSuspend,
  onActivate,
}: StaffTableProps) {
  return (
    <div className="plot-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.label}>
                {col.field ? (
                  <button
                    type="button"
                    className="sortable-header"
                    onClick={() => onSortChange(col.field as StaffSortField)}
                  >
                    {col.label}
                    <span className="sort-indicator">
                      {sortField === col.field ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx} aria-hidden="true">
                <td colSpan={COLUMNS.length + 1}>
                  <div className="skeleton-line" />
                </td>
              </tr>
            ))
            : staff.map((member) => (
              <tr key={member.farmMemberId}>
                <td className="table-cell-strong">{member.fullName}</td>
                <td>{member.email}</td>
                <td>{member.phoneNumber ?? '—'}</td>
                <td>
                  <StatusBadge label={STAFF_STATUS_LABEL[member.status]} tone={STAFF_STATUS_TONE[member.status]} />
                </td>
                <td>{formatDate(member.joinedAt)}</td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="icon-button edit-button"
                      aria-label={`Sửa ${member.fullName}`}
                      title="Chỉnh sửa"
                      onClick={() => onEdit(member)}
                    >
                      <PencilSparkles size={16} strokeWidth={1.5} />
                    </button>
                    {member.status === 'suspended' ? (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Kích hoạt ${member.fullName}`}
                        title="Kích hoạt lại"
                        onClick={() => onActivate(member)}
                      >
                        <Undo2 size={16} strokeWidth={1.5} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-button delete-button"
                        aria-label={`Vô hiệu hoá ${member.fullName}`}
                        title="Vô hiệu hoá"
                        onClick={() => onSuspend(member)}
                      >
                        <CircleMinus size={16} strokeWidth={1.5}/>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
