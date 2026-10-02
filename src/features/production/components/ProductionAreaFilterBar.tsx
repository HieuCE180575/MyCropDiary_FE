import { PRODUCTION_AREA_STATUS_FILTER_OPTIONS } from '../constants';
import type { ProductionAreaStatus } from '../types';

interface ProductionAreaFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: ProductionAreaStatus | 'all';
  onStatusChange: (status: ProductionAreaStatus | 'all') => void;
}

export function ProductionAreaFilterBar({
  searchValue,
  onSearchChange,
  status,
  onStatusChange,
}: ProductionAreaFilterBarProps) {
  return (
    <div className="list-filter-bar">
      <div className="search-input">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên khu sản xuất hoặc vị trí..."
          aria-label="Tìm kiếm khu sản xuất"
        />
        {searchValue ? (
          <button type="button" className="search-clear" aria-label="Xoá tìm kiếm" onClick={() => onSearchChange('')}>
            ✕
          </button>
        ) : null}
      </div>

      <label className="status-select">
        <span className="sr-only">Trạng thái</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as ProductionAreaStatus | 'all')}>
          {PRODUCTION_AREA_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}