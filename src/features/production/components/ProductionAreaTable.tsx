import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../shared/components/StatusBadge';
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatArea(hectares: number): string {
  return `${hectares.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} ha`;
}

export function ProductionAreaTable({
  areas,
  loading,
  sortField,
  sortDirection,
  onSortChange,
  onArchive,
  onRestore,
}: ProductionAreaTableProps) {
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
                    onClick={() => onSortChange(col.field as ProductionAreaSortField)}
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
            : areas.map((area) => (
              <tr key={area.productionAreaId}>
                <td>
                  <Link to={`/production-areas/${area.productionAreaId}`} className="table-link">
                    {area.areaName}
                  </Link>
                </td>
                <td>{formatArea(area.areaHectares)}</td>
                <td>{area.locationDescription ?? '—'}</td>
                <td>
                  <StatusBadge
                    label={PRODUCTION_AREA_STATUS_LABEL[area.status]}
                    tone={PRODUCTION_AREA_STATUS_TONE[area.status]}
                  />
                </td>
                <td>{formatDate(area.createdAt)}</td>
                <td>
                  <div className="table-actions">
                    <Link
                      to={`/production-areas/${area.productionAreaId}`}
                      className="icon-button"
                      aria-label={`Xem ${area.areaName}`}
                      title="Xem chi tiết"
                    >
                      👁
                    </Link>
                    <Link
                      to={`/production-areas/${area.productionAreaId}/edit`}
                      className="icon-button"
                      aria-label={`Sửa ${area.areaName}`}
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </Link>
                    {area.status === 'archived' ? (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Khôi phục ${area.areaName}`}
                        title="Khôi phục"
                        onClick={() => onRestore(area)}
                      >
                        ↺
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Lưu trữ ${area.areaName}`}
                        title="Lưu trữ"
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