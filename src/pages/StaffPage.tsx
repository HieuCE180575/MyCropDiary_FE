import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../shared/components/ConfirmDialog';
import { EmptyState } from '../shared/components/EmptyState';
import { Pagination } from '../shared/components/Pagination';
import { useDebounce } from '../shared/hooks/useDebounce';
import { StaffFilterBar } from '../features/staff/components/StaffFilterBar';
import { StaffFormModal } from '../features/staff/components/StaffFormModal';
import { StaffTable } from '../features/staff/components/StaffTable';
import { useSuspendStaff } from '../features/staff/hooks/useSuspendStaff';
import { STAFF_PAGE_SIZE } from '../features/staff/constants';
import { activateStaff, createStaff, fetchStaff, updateStaff } from '../features/staff/staffService';
import type {
  PagedResult,
  SortDirection,
  StaffFormValues,
  StaffMember,
  StaffMemberStatus,
  StaffSortField,
} from '../features/staff/types';

const EMPTY_RESULT: PagedResult<StaffMember> = {
  items: [],
  page: 1,
  pageSize: STAFF_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

export function StaffPage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [status, setStatus] = useState<StaffMemberStatus | 'all'>('all');
  const [sortField, setSortField] = useState<StaffSortField>('fullName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PagedResult<StaffMember>>(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [activateError, setActivateError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasActiveFilters = debouncedSearch.trim() !== '' || status !== 'all';

  const {
    target: suspendTarget,
    requestSuspend,
    cancelSuspend,
    confirmSuspend,
    suspending,
    error: suspendError,
  } = useSuspendStaff(() => setReloadToken((t) => t + 1));

  // Quay về trang 1 mỗi khi từ khoá tìm kiếm hoặc bộ lọc trạng thái thay đổi.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchStaff({ search: debouncedSearch, status, sortField, sortDirection, page, pageSize: STAFF_PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult(data);
      })
      .catch(() => {
        if (!ignore) setError('Không thể tải danh sách nhân viên. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, status, sortField, sortDirection, page, reloadToken]);

  function handleSortChange(field: StaffSortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  async function handleActivate(staff: StaffMember) {
    setActivateError(null);
    try {
      await activateStaff(staff.farmMemberId);
      setReloadToken((t) => t + 1);
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : 'Kích hoạt nhân viên thất bại. Vui lòng thử lại.');
    }
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingStaff(null);
    setSubmitError(null);
    setModalOpen(true);
  }

  function openEditModal(staff: StaffMember) {
    setModalMode('edit');
    setEditingStaff(staff);
    setSubmitError(null);
    setModalOpen(true);
  }

  async function handleModalSubmit(values: StaffFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (modalMode === 'edit' && editingStaff) {
        await updateStaff(editingStaff.farmMemberId, values);
      } else {
        await createStaff(values);
      }
      setModalOpen(false);
      setReloadToken((t) => t + 1);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Lưu nhân viên thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
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
        )} trên ${result.totalItems} nhân viên`
      : null;

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Nhân sự &amp; phân công</h1>
          <p className="page-subtitle">
            Quản lý danh sách nhân viên: xem, tìm kiếm, lọc, thêm mới, chỉnh sửa và vô hiệu hoá.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          + Thêm nhân viên
        </button>
      </div>

      <div className="panel">
        <StaffFilterBar searchValue={searchInput} onSearchChange={setSearchInput} status={status} onStatusChange={setStatus} />
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
          {activateError ? <p className="form-error-banner">{activateError}</p> : null}
          {suspendError ? <p className="form-error-banner">{suspendError}</p> : null}
          {resultSummary && !loading ? <p className="list-result-summary">{resultSummary}</p> : null}

          {!loading && result.items.length === 0 ? (
            <EmptyState
              icon="🧑‍🌾"
              title="Không tìm thấy nhân viên phù hợp"
              description={
                hasActiveFilters
                  ? 'Hãy thử từ khoá khác hoặc bỏ bớt bộ lọc đang áp dụng.'
                  : 'Chưa có nhân viên nào trong trang trại.'
              }
              action={
                hasActiveFilters ? (
                  <button type="button" className="primary-button" onClick={handleResetFilters}>
                    Đặt lại bộ lọc
                  </button>
                ) : (
                  <button type="button" className="primary-button" onClick={openCreateModal}>
                    + Thêm nhân viên
                  </button>
                )
              }
            />
          ) : (
            <StaffTable
              staff={result.items}
              loading={loading}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              onEdit={openEditModal}
              onSuspend={requestSuspend}
              onActivate={handleActivate}
            />
          )}

          {!loading ? <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} /> : null}
        </div>
      )}

      <StaffFormModal
        open={modalOpen}
        mode={modalMode}
        initialStaff={editingStaff}
        submitting={submitting}
        submitError={submitError}
        onSubmit={handleModalSubmit}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={suspendTarget !== null}
        title="Vô hiệu hoá nhân viên?"
        description={
          suspendTarget
            ? `"${suspendTarget.fullName}" sẽ không thể truy cập trang trại cho đến khi được kích hoạt lại.`
            : undefined
        }
        confirmLabel="Vô hiệu hoá"
        cancelLabel="Huỷ"
        tone="danger"
        loading={suspending}
        onConfirm={confirmSuspend}
        onClose={cancelSuspend}
      />
    </section>
  );
}
