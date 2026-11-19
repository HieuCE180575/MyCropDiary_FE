import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { formatDate, formatNumber } from '../../../shared/format/formatters';
import { useLanguage } from '../../../shared/i18n/LanguageContext';


import { PRODUCTION_AREA_STATUS_LABEL, PRODUCTION_AREA_STATUS_TONE } from '../constants';
import type { ProductionArea, ProductionAreaSortField, SortDirection } from '../types';

interface ProductionAreaTableProps {
  areas: ProductionArea[];
  loading: boolean;
  sortField: ProductionAreaSortField;
  sortDirection: SortDirection;
  onSortChange: (field: ProductionAreaSortField) => void;
  onArchive: (area: ProductionArea) => void;
  onRestore: (area: ProductionArea) => void;
}

const COLUMNS: { field: ProductionAreaSortField | null; label: string }[] = [
  { field: 'areaName', label: 'Tên khu sản xuất' },
  { field: 'areaHectares', label: 'Diện tích' },
  { field: null, label: 'Vị trí' },
  { field: null, label: 'Trạng thái' },
  { field: 'createdAt', label: 'Ngày tạo' },
];


export function ProductionAreaTable({

  areas,
  loading,
  sortField,
  sortDirection,
  onSortChange,
  onArchive,
  onRestore,
}: ProductionAreaTableProps) {
  const { lang, t: translate } = useLanguage();
  return (
    <div className="zone-table-wrap ui-table-scroll" tabIndex={0}>
      <table className="ui-data-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th scope="col" aria-sort={col.field === sortField ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined} key={lang === 'en' ? ({ 'Tên khu sản xuất': 'Production Area Name', 'Diện tích': 'Area', 'Vị trí': 'Location', 'Trạng thái': 'Status', 'Ngày tạo': 'Created Date' }[col.label] || col.label) : col.label}>
                {col.field ? (
                  <button
                    type="button"
                    className="sortable-header"
                    onClick={() => onSortChange(col.field as ProductionAreaSortField)}
                  >
                    {translate(col.label)}
                    <span className="sort-indicator">
                      {sortField === col.field ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                ) : (
                  translate(col.label)
                )}
              </th>
            ))}
            <th scope="col">{lang === 'en' ? 'Actions' : 'Hành động'}</th>
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
            : areas.map((area) => (
              <tr key={area.productionAreaId}>
                <td>
                  <Link to={`/production-areas/${area.productionAreaId}`} className="table-link">
                    {area.areaName || area.zoneName}
                  </Link>
                </td>
                <td>{formatNumber(area.areaHectares ?? (area.areaUnit === 'ha' ? area.areaValue : (area.areaValue || 0) / 10000), lang, { maximumFractionDigits: 4 })} ha</td>
                <td>{area.locationDescription ?? area.description ?? '—'}</td>
                <td>
                  <StatusBadge
                    label={PRODUCTION_AREA_STATUS_LABEL[area.status === 'archived' ? 'archived' : 'active']}
                    tone={PRODUCTION_AREA_STATUS_TONE[area.status === 'archived' ? 'archived' : 'active']}
                  />
                </td>
                <td>{formatDate(area.createdAt, lang)}</td>
                <td>
                  <div className="table-actions">
                    <Link
                      to={`/production-areas/${area.productionAreaId}`}
                      className="icon-button"
                      aria-label={translate("View") + " " + (area.areaName)}
                      title={(lang === 'en' ? "View details" : "Xem chi tiết")}
                    >
                      👁
                    </Link>
                    <Link
                      to={`/production-areas/${area.productionAreaId}/edit`}
                      className={"icon-button" + ' ' + 'ui-edit-action'}
                      aria-label={(lang === 'en' ? `Edit ${area.areaName}` : `Sửa ${area.areaName}`)}
                      title={(lang === 'en' ? "Edit" : "Chỉnh sửa")}
                    >
                      ✏️
                    </Link>
                    {area.status === 'archived' ? (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={(lang === 'en' ? `Restore ${area.areaName}` : `Khôi phục ${area.areaName}`)}
                        title={(lang === 'en' ? "Restore" : "Khôi phục")}
                        onClick={() => onRestore(area)}
                      >
                        ↺
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={(lang === 'en' ? `Archive ${area.areaName}` : `Lưu trữ ${area.areaName}`)}
                        title={(lang === 'en' ? "Archive" : "Lưu trữ")}
                        onClick={() => onArchive(area)}
                      >
                        🗄
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
