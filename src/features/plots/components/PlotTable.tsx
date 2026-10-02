import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { PLOT_STATUS_LABEL, PLOT_STATUS_TONE } from '../constants';
import type { Plot, PlotSortField, SortDirection } from '../types';
import { PencilSparkles, Eye, Archive, Undo2 } from 'lucide-react';

interface PlotTableProps {
  plots: Plot[];
  loading: boolean;
  sortField: PlotSortField;
  sortDirection: SortDirection;
  onSortChange: (field: PlotSortField) => void;
  onArchive: (plot: Plot) => void;
  onRestore: (plot: Plot) => void;
}

const COLUMNS: { field: PlotSortField | null; label: string }[] = [
  { field: 'plotName', label: 'Tên lô đất' },
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

export function PlotTable({
  plots,
  loading,
  sortField,
  sortDirection,
  onSortChange,
  onArchive,
  onRestore,
}: PlotTableProps) {
  return (
    <div className="plot-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.label}>
                {col.field ? (
                  <button type="button" className="sortable-header" onClick={() => onSortChange(col.field as PlotSortField)}>
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
            : plots.map((plot) => (
              <tr key={plot.plotId}>
                <td>
                  <Link to={`/land-plots/${plot.plotId}`} className="table-link">
                    {plot.plotName}
                  </Link>
                </td>
                <td>{formatArea(plot.areaHectares)}</td>
                <td>{plot.locationDescription}</td>
                <td>
                  <StatusBadge label={PLOT_STATUS_LABEL[plot.status]} tone={PLOT_STATUS_TONE[plot.status]} />
                </td>
                <td>{formatDate(plot.createdAt)}</td>
                <td>
                  <div className="table-actions">
                    <Link
                      to={`/land-plots/${plot.plotId}`}
                      className="icon-button view-button"
                      aria-label={`Xem ${plot.plotName}`}
                      title="Xem chi tiết"
                    >
                      <Eye size={16} strokeWidth={1.5} />
                    </Link>
                    <Link
                      to={`/land-plots/${plot.plotId}/edit`}
                      className="icon-button edit-button"
                      aria-label={`Sửa ${plot.plotName}`}
                      title="Chỉnh sửa"
                    >
                      <PencilSparkles size={16} strokeWidth={1.5} />
                    </Link>
                    {plot.status === 'archived' ? (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Khôi phục ${plot.plotName}`}
                        title="Khôi phục"
                        onClick={() => onRestore(plot)}
                      >
                        <Undo2 size={16} strokeWidth={1.5} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-button delete-button"
                        aria-label={`Lưu trữ ${plot.plotName}`}
                        title="Lưu trữ"
                        onClick={() => onArchive(plot)}
                      >
                        <Archive size={16} strokeWidth={1.5} />
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
