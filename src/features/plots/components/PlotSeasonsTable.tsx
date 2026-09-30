import type { BadgeTone } from '../../../shared/components/StatusBadge';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import type { PlotSeasonSummary } from '../types';

const SEASON_STATUS_LABEL: Record<PlotSeasonSummary['status'], string> = {
  planned: 'Dự kiến',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

const SEASON_STATUS_TONE: Record<PlotSeasonSummary['status'], BadgeTone> = {
  planned: 'info',
  in_progress: 'success',
  completed: 'neutral',
  cancelled: 'danger',
};

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

interface PlotSeasonsTableProps {
  seasons: PlotSeasonSummary[];
  loading: boolean;
}

export function PlotSeasonsTable({ seasons, loading }: PlotSeasonsTableProps) {
  if (loading) {
    return <p className="status-note">Đang tải mùa vụ liên quan...</p>;
  }

  if (seasons.length === 0) {
    return <p className="status-note">Lô đất này chưa có mùa vụ nào.</p>;
  }

  return (
    <div className="plot-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Mùa vụ</th>
            <th>Cây trồng</th>
            <th>Trạng thái</th>
            <th>Ngày bắt đầu</th>
            <th>Ngày kết thúc</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((season) => (
            <tr key={season.cropSeasonId}>
              <td>{season.seasonName}</td>
              <td>{season.cropName}</td>
              <td>
                <StatusBadge label={SEASON_STATUS_LABEL[season.status]} tone={SEASON_STATUS_TONE[season.status]} />
              </td>
              <td>{formatDate(season.startDate)}</td>
              <td>{formatDate(season.endDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
