import { Search, X } from 'lucide-react';
import { PLOT_STATUS_FILTER_OPTIONS } from '../constants';
import type { PlotStatus } from '../types';

interface PlotFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  status: PlotStatus | 'all';
  onStatusChange: (status: PlotStatus | 'all') => void;
}

export function PlotFilterBar({ searchValue, onSearchChange, status, onStatusChange }: PlotFilterBarProps) {
  return (
    <div className="plot-filter-bar">
      <div className="search-input">
        <span className="search-icon" aria-hidden="true">
          <Search size={16} color="#2a8ca7" strokeWidth={1.5} />
          </span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên lô đất hoặc vị trí..."
          aria-label="Tìm kiếm lô đất"
        />
        {/* {searchValue ? (
          // <button type="button"  aria-label="Xoá tìm kiếm" onClick={() => onSearchChange('')}>
            
          // </button>
        ) : null} */}
      </div>

      <label className="plot-status-select">
        <span className="sr-only">Trạng thái</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as PlotStatus | 'all')}>
          {PLOT_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
