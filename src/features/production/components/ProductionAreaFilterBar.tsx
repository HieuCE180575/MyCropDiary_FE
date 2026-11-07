import { useLanguage } from '../../../shared/i18n/LanguageContext';
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
  const { lang, t: translate } = useLanguage();
  return (
    <div className="list-filter-bar">
      <div className="search-input">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={(lang === 'en' ? "Search by production area name or location..." : "Tìm theo tên khu sản xuất hoặc vị trí...")}
          aria-label={(lang === 'en' ? "Search production areas" : "Tìm kiếm khu sản xuất")}
        />
        {searchValue ? (
          <button type="button" className="search-clear" aria-label={(lang === 'en' ? "Clear search" : "Xoá tìm kiếm")} onClick={() => onSearchChange('')}>
            ✕
          </button>
        ) : null}
      </div>

      <label className="status-select">
        <span className="sr-only">{(lang === 'en' ? "Status" : "Trạng thái")}</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as ProductionAreaStatus | 'all')}>
          {PRODUCTION_AREA_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {translate(option.label)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}