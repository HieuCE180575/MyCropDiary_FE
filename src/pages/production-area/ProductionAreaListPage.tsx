import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { EmptyState } from '../../shared/components/EmptyState';
import { Pagination } from '../../shared/components/Pagination';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { ProductionAreaFilterBar } from '../../features/production/components/ProductionAreaFilterBar';
import { ProductionAreaTable } from '../../features/production/components/ProductionAreaTable';
import { useArchiveProductionArea } from '../../features/production/hooks/useArchiveProductionArea';
import { PRODUCTION_AREA_PAGE_SIZE } from '../../features/production/constants';
import { fetchProductionAreas, restoreProductionArea } from '../../features/production/productionAreaService';
import type { PagedResult, ProductionArea, ProductionAreaSortField, ProductionAreaStatus, SortDirection } from '../../features/production/types';

const EMPTY_RESULT: PagedResult<ProductionArea> = {
  items: [],
  page: 1,
  pageSize: PRODUCTION_AREA_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

export function ProductionAreaListPage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [status, setStatus] = useState<ProductionAreaStatus | 'all'>('all');
  const [sortField, setSortField] = useState<ProductionAreaSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PagedResult<ProductionArea>>(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const hasActiveFilters = debouncedSearch.trim() !== '' || status !== 'all';

  const {
    target: archiveTarget,
    requestArchive,
    cancelArchive,
    confirmArchive,
    archiving,
    error: archiveError,
  } = useArchiveProductionArea(() => setReloadToken((t) => t + 1));

  // Quay về trang 1 mỗi khi từ khoá tìm kiếm hoặc bộ lọc trạng thái thay đổi.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchProductionAreas({ search: debouncedSearch, status, sortField, sortDirection, page, pageSize: PRODUCTION_AREA_PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult(data);
      })
      .catch(() => {
        if (!ignore) setError('Không thể tải danh sách khu sản xuất. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, status, sortField, sortDirection, page, reloadToken]);

  function handleSortChange(field: ProductionAreaSortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  async function handleRestore(productionArea: ProductionArea) {
    setRestoreError(null);
    try {
      await restoreProductionArea(productionArea.productionAreaId);
      setReloadToken((t) => t + 1);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Khôi phục khu sản xuất thất bại. Vui lòng thử lại.');
    }
  }

  function handleResetFilters() {
    setSearchInput('');
    setStatus('all');
    setPage(1);
  }

  const resultSummary =
    result.totalItems > 0
      ? `Hiển thị ${(result.page - 1) * result.pageSize + 1}–${Math.min(
          result.page * result.pageSize,
          result.totalItems,
        )} trên ${result.totalItems} lô đất`
      : null;

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Quản lý khu sản xuất</h1>
          <p className="page-subtitle">Quản lý danh sách khu sản xuất: xem, tìm kiếm, lọc, tạo mới, chỉnh sửa và lưu trữ.</p>
        </div>
        <Link to="/production-areas/new" className="primary-button">
          + Thêm khu sản xuất 
        </Link>
      </div>

      <div className="panel">
        <ProductionAreaFilterBar searchValue={searchInput} onSearchChange={setSearchInput} status={status} onStatusChange={setStatus} />
      </div>

      {error ? (
        <div className="panel empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>Đã có lỗi xảy ra</h2>
          <p>{error}</p>
          <button type="button" className="primary-button" onClick={() => setReloadToken((t) => t + 1)}>
            Thử lại
          </button>
        </div>
      ) : (
        <div className="panel">
          {restoreError ? <p className="form-error-banner">{restoreError}</p> : null}
          {archiveError ? <p className="form-error-banner">{archiveError}</p> : null}
          {resultSummary && !loading ? <p className="list-result-summary">{resultSummary}</p> : null}

          {!loading && result.items.length === 0 ? (
            <EmptyState
              icon="🗺️"
              title="Không tìm thấy khu sản xuất phù hợp"
              description={
                hasActiveFilters
                  ? 'Hãy thử từ khoá khác hoặc bỏ bớt bộ lọc đang áp dụng.'
                  : 'Chưa có khu sản xuất nào được tạo.'
              }
              action={
                hasActiveFilters ? (
                  <button type="button" className="primary-button" onClick={handleResetFilters}>
                    Đặt lại bộ lọc
                  </button>
                ) : (
                  <Link to="/production-areas/new" className="primary-button">
                    + Thêm khu sản xuất
                  </Link>
                )
              }
            />
          ) : (
            <ProductionAreaTable
              areas={result.items}
              loading={loading}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              onArchive={requestArchive}
              onRestore={handleRestore}
            />
          )}

          {!loading ? <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} /> : null}
        </div>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Lưu trữ khu sản xuất?"
        description={
          archiveTarget
            ? `Khu sản xuất"${archiveTarget.areaName}" sẽ không thể dùng để tạo khu vực mới, nhưng lịch sử dữ liệu vẫn được giữ lại.`
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
