import { STAFF_STATUS_FILTER_OPTIONS } from '../constants';
import type { StaffMemberStatus } from '../types';

interface StaffFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: StaffMemberStatus | 'all';
  onStatusChange: (status: StaffMemberStatus | 'all') => void;
}

export function StaffFilterBar({ searchValue, onSearchChange, status, onStatusChange }: StaffFilterBarProps) {
  return (
    <div className="list-filter-bar">
      <div className="search-input">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên, email hoặc số điện thoại..."
          aria-label="Tìm kiếm nhân viên"
        />
        {searchValue ? (
          <button type="button" className="search-clear" aria-label="Xoá tìm kiếm" onClick={() => onSearchChange('')}>
            ✕
          </button>
        ) : null}
      </div>

      <label className="status-select">
        <span className="sr-only">Trạng thái</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as StaffMemberStatus | 'all')}>
          {STAFF_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
