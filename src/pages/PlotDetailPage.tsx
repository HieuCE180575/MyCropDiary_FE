import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../shared/components/ConfirmDialog';
import { StatusBadge } from '../shared/components/StatusBadge';
import { PlotSeasonsTable } from '../features/plots/components/PlotSeasonsTable';
import { useArchivePlot } from '../features/plots/hooks/useArchivePlot';
import { PLOT_STATUS_LABEL, PLOT_STATUS_TONE } from '../features/plots/constants';
import { fetchPlotById, fetchPlotSeasons, restorePlot } from '../features/plots/plotService';
import type { Plot, PlotSeasonSummary } from '../features/plots/types';
import { Archive, SquarePen, Undo2 } from 'lucide-react';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatArea(hectares: number): string {
  return `${hectares.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} ha`;
}

export function PlotDetailPage() {
  const { plotId } = useParams<{ plotId: string }>();

  const [plot, setPlot] = useState<Plot | null>(null);
  const [seasons, setSeasons] = useState<PlotSeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!plotId) return;
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchPlotById(plotId)
      .then((data) => {
        if (ignore) return;
        if (!data) setError('Không tìm thấy lô đất.');
        setPlot(data);
      })
      .catch(() => {
        if (!ignore) setError('Không thể tải thông tin lô đất.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    setSeasonsLoading(true);
    fetchPlotSeasons(plotId)
      .then((data) => {
        if (!ignore) setSeasons(data);
      })
      .finally(() => {
        if (!ignore) setSeasonsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [plotId]);

  const {
    target: archiveTarget,
    requestArchive,
    cancelArchive,
    confirmArchive,
    archiving,
    error: archiveError,
  } = useArchivePlot((updated) => setPlot(updated));

  async function handleRestore() {
    if (!plot) return;
    setRestoreError(null);
    try {
      const updated = await restorePlot(plot.plotId);
      setPlot(updated);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Khôi phục lô đất thất bại. Vui lòng thử lại.');
    }
  }

  if (loading) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin lô đất...</h2>
        </div>
      </section>
    );
  }

  if (error || !plot) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>{error ?? 'Không tìm thấy lô đất.'}</h2>
          <Link to="/land-plots" className="primary-button">
            Về danh sách lô đất
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/land-plots">Lô đất</Link>
            <span>›</span>
            <span>{plot.plotName}</span>
          </nav>
          <h1>Chi tiết lô đất</h1>
        </div>
        <div className="farm-registration-actions">
          <Link to={`/land-plots/${plot.plotId}/edit`} className="ghost-button edit-button">
            Chỉnh sửa <SquarePen style={{ marginBottom: "-3px" }} size={16} strokeWidth={1.5} />
          </Link>
          {plot.status === 'archived' ? (
            <button type="button" className="primary-button edit-button" onClick={handleRestore}>
              Khôi phục <Undo2 size={16} strokeWidth={1.5} style={{ marginBottom: "-3px" }}/>
            </button>
          ) : (
            <button type="button" className="danger-button delete-button" onClick={() => requestArchive(plot)}>
              Lưu trữ <Archive size={16} style={{ marginBottom: "-3px" }} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {restoreError ? <p className="form-error-banner">{restoreError}</p> : null}
      {archiveError ? <p className="form-error-banner">{archiveError}</p> : null}

      <div className="panel plot-detail-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{plot.plotCode}</span>
            <h2>Thông tin lô đất</h2>
          </div>
          <StatusBadge label={PLOT_STATUS_LABEL[plot.status]} tone={PLOT_STATUS_TONE[plot.status]} />
        </div>

        <div className="plot-detail-body">
          <dl className="detail-list">
            <div>
              <dt>Tên lô đất</dt>
              <dd>{plot.plotName}</dd>
            </div>
            <div>
              <dt>Diện tích</dt>
              <dd>{formatArea(plot.areaHectares)}</dd>
            </div>
            <div>
              <dt>Vị trí / Địa chỉ</dt>
              <dd>{plot.locationDescription}</dd>
            </div>
            {plot.soilType ? (
              <div>
                <dt>Loại đất</dt>
                <dd>{plot.soilType}</dd>
              </div>
            ) : null}
            {plot.notes ? (
              <div>
                <dt>Ghi chú</dt>
                <dd>{plot.notes}</dd>
              </div>
            ) : null}
            <div>
              <dt>Ngày tạo</dt>
              <dd>{formatDateTime(plot.createdAt)}</dd>
            </div>
            {plot.updatedAt ? (
              <div>
                <dt>Cập nhật lần cuối</dt>
                <dd>{formatDateTime(plot.updatedAt)}</dd>
              </div>
            ) : null}
          </dl>

          {plot.coverImageUrl ? (
            <img src={plot.coverImageUrl} alt={`Ảnh lô đất ${plot.plotName}`} className="plot-detail-image" />
          ) : null}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>Mùa vụ liên quan ({seasons.length})</h2>
          </div>
        </div>
        <PlotSeasonsTable seasons={seasons} loading={seasonsLoading} />
      </div>

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Lưu trữ lô đất?"
        description={
          archiveTarget
            ? `Lô đất "${archiveTarget.plotName}" sẽ không thể dùng để tạo mùa vụ mới, nhưng lịch sử dữ liệu vẫn được giữ lại.`
            : undefined
        }
        confirmLabel="Lưu trữ"
        cancelLabel="Huỷ"
        tone="danger"
        loading={archiving}
        onConfirm={confirmArchive}
        onClose={cancelArchive}
      />
    </section>
  );
}
