import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { useArchiveProductionArea } from '../../features/production/hooks/useArchiveProductionArea';
import { PRODUCTION_AREA_STATUS_LABEL, PRODUCTION_AREA_STATUS_TONE } from '../../features/production/constants';
import { fetchProductionAreaById, restoreProductionArea } from '../../features/production/productionAreaService';
import type { ProductionArea } from '../../features/production/types';
import { Archive, SquarePen, Undo2 } from 'lucide-react';

interface PlotSeasonSummary {
  id: number;
  name: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatArea(hectares: number): string {
  return `${hectares.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} ha`;
}

function PlotSeasonsTable({ seasons, loading }: { seasons: PlotSeasonSummary[]; loading: boolean }) {
  if (loading) return <p className="table-loading-note">Đang tải danh sách mùa vụ...</p>;
  if (seasons.length === 0) return <p className="table-empty-note">Chưa có mùa vụ nào gắn với khu vực canh tác này.</p>;
  return (
    <ul className="season-summary-list">
      {seasons.map((s) => (
        <li key={s.id}>{s.name}</li>
      ))}
    </ul>
  );
}

export function PlotDetailPage() {
  const { plotId } = useParams<{ plotId: string }>();
  const productionAreaId = plotId;

  const [productionArea, setProductionArea] = useState<ProductionArea | null>(null);
  const [seasons, setSeasons] = useState<PlotSeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!productionAreaId) return;
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchProductionAreaById(productionAreaId)
      .then((data) => {
        if (ignore) return;
        if (!data) setError('Không tìm thấy vùng canh tác.');
        setProductionArea(data);
      })
      .catch(() => {
        if (!ignore) setError('Không thể tải thông tin vùng canh tác.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [productionAreaId]);

  const {
    target: archiveTarget,
    requestArchive,
    cancelArchive,
    confirmArchive,
    archiving,
    error: archiveError,
  } = useArchiveProductionArea((updated) => setProductionArea(updated));

  async function handleRestore() {
    if (!productionArea) return;
    setRestoreError(null);
    try {
      const updated = await restoreProductionArea(productionArea.productionAreaId);
      setProductionArea(updated);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Khôi phục vùng canh tác thất bại. Vui lòng thử lại.');
    }
  }

  if (loading) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin vùng canh tác...</h2>
        </div>
      </section>
    );
  }

  if (error || !productionArea) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>{error ?? 'Không tìm thấy vùng canh tác.'}</h2>
          <Link to="/production-areas" className="primary-button">
            Về danh sách vùng canh tác
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
            <Link to="/production-areas">Vùng canh tác</Link>
            <span>›</span>
            <span>{productionArea.areaName}</span>
          </nav>
          <h1>Chi tiết vùng canh tác</h1>
        </div>
        <div className="farm-registration-actions">
          <Link to={`/production-areas/${productionArea.productionAreaId}/edit`} className="ghost-button edit-button">
            Chỉnh sửa <SquarePen style={{ marginBottom: '-3px' }} size={16} strokeWidth={1.5} />
          </Link>
          {productionArea.status === 'archived' ? (
            <button type="button" className="primary-button edit-button" onClick={handleRestore}>
              Khôi phục <Undo2 size={16} strokeWidth={1.5} style={{ marginBottom: '-3px' }} />
            </button>
          ) : (
            <button type="button" className="danger-button delete-button" onClick={() => requestArchive(productionArea)}>
              Lưu trữ <Archive size={16} style={{ marginBottom: '-3px' }} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {restoreError ? <p className="form-error-banner">{restoreError}</p> : null}
      {archiveError ? <p className="form-error-banner">{archiveError}</p> : null}

      <div className="panel plot-detail-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{productionArea.areaCode}</span>
            <h2>Thông tin vùng canh tác</h2>
          </div>
          <StatusBadge label={PRODUCTION_AREA_STATUS_LABEL[productionArea.status]} tone={PRODUCTION_AREA_STATUS_TONE[productionArea.status]} />
        </div>

        <div className="plot-detail-body">
          <dl className="detail-list">
            <div>
              <dt>Tên vùng canh tác</dt>
              <dd>{productionArea.areaName}</dd>
            </div>
            <div>
              <dt>Diện tích</dt>
              <dd>{formatArea(productionArea.areaHectares)}</dd>
            </div>
            {productionArea.locationDescription ? (
              <div>
                <dt>Địa điểm / Vị trí</dt>
                <dd>{productionArea.locationDescription}</dd>
              </div>
            ) : null}
            <div>
              <dt>Ngày tạo</dt>
              <dd>{formatDateTime(productionArea.createdAt)}</dd>
            </div>
            {productionArea.updatedAt ? (
              <div>
                <dt>Cập nhật lần cuối</dt>
                <dd>{formatDateTime(productionArea.updatedAt)}</dd>
              </div>
            ) : null}
          </dl>
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
        title="Lưu trữ vùng canh tác?"
        description={
          archiveTarget
            ? `Vùng canh tác "${archiveTarget.areaName}" sẽ không thể dùng để tạo mùa vụ mới, nhưng lịch sử dữ liệu vẫn được giữ lại.`
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
