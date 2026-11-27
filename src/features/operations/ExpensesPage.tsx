import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { LoadError } from '../../shared/components/LoadError';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TablePagination } from '../../shared/components/TablePagination';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';


import { formatDate } from '../../shared/format/formatters';
import { getLocalDateInput } from '../../shared/format/localDateTime';
import { usePagination } from '../../shared/hooks/usePagination';

import { formatCurrency as currency, formatDateTime } from '../../shared/format/formatters';
import { useEffect, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';


import { useLanguage } from '../../shared/i18n/LanguageContext';
import { fetchCropSeasonsByFarm, type CropSeasonResp } from './cropSeasonService';
import {
  fetchExpenses,
  fetchExpenseSummary,
  type ExpenseSummaryResp,
  fetchExpenseDetails,
  recordExpense,
  updateExpense,
  deleteExpense,
  type ExpenseItem,
  type CreateExpensePayload,
  type UpdateExpensePayload,
  type ExpenseFilterParams,
} from './expenseService';

const DEFAULT_CATEGORIES = [
  'Materials & Fertilizers',
  'Labor',
  'Utilities & Power',
  'Machinery & Fuel',
  'Pest Control',
  'Packaging',
  'Irrigation & Water',
  'Other',
];

export function ExpensesPage({ embedded = false }: { embedded?: boolean }) {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;

  // Data states
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [seasons, setSeasons] = useState<CropSeasonResp[]>([]);
  const [summary, setSummary] = useState<ExpenseSummaryResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter & Search states
  const [keyword, setKeyword] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');


  // View Details Modal
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);


  // Record Expense Modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<CreateExpensePayload>({
    expenseCategory: 'Materials & Fertilizers',
    amount: 0,
    expenseDate: getLocalDateInput(),
    cropSeasonId: undefined,
    description: '',
    receiptImageUrl: '',
  });
  const [submittingRecord, setSubmittingRecord] = useState(false);

  // Update Expense Modal
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateExpensePayload>({
    expenseCategory: '',
    amount: 0,
    expenseDate: '',
    cropSeasonId: undefined,
    description: '',
    receiptImageUrl: '',
  });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Delete Expense Modal
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Load Seasons
  useEffect(() => { if (isRecordOpen || editingExpense || deletingExpense) setNotification(null); }, [isRecordOpen, editingExpense?.expenseId, deletingExpense?.expenseId]);

  useEffect(() => {
    if (!farmId) return;
    fetchCropSeasonsByFarm(farmId)
      .then((data) => setSeasons(data))
      .catch(() => setSeasons([]));
  }, [farmId]);

  // Load Expenses & Summary
  const loadData = async (paramsOverride?: ExpenseFilterParams) => {
    if (!farmId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const activeParams: ExpenseFilterParams = paramsOverride ?? {
        cropSeasonId: selectedSeasonId,
        category: selectedCategory || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        keyword: keyword.trim() || undefined,
      };

      const [expenseList, summaryData] = await Promise.all([
        fetchExpenses(farmId, activeParams),
        fetchExpenseSummary(farmId, {
          cropSeasonId: activeParams.cropSeasonId,
          startDate: activeParams.startDate,
          endDate: activeParams.endDate,
        }),
      ]);

      setExpenses(expenseList);
      setSummary(summaryData);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load expenses.' : 'Không thể tải danh sách chi phí.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [farmId, selectedSeasonId, selectedCategory, startDate, endDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadData();
  };

  const handleClearFilters = () => {
    setKeyword('');
    setSelectedSeasonId(undefined);
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    void loadData({
      keyword: undefined,
      category: undefined,
      cropSeasonId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  // View Details
  const handleOpenDetails = async (expenseId: number) => {

    try {
      const detail = await fetchExpenseDetails(expenseId);
      setSelectedExpense(detail);
    } catch {
      const fallback = expenses.find((e) => e.expenseId === expenseId) || null;
      setSelectedExpense(fallback);
    } finally {

    }
  };

  // Record Expense
  const handleOpenRecord = () => {
    setRecordForm({
      expenseCategory: 'Materials & Fertilizers',
      amount: 0,
      expenseDate: getLocalDateInput(),
      cropSeasonId: seasons[0]?.cropSeasonId || undefined,
      description: '',
      receiptImageUrl: '',
    });
    setIsRecordOpen(true);
  };

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;

    if (!recordForm.expenseCategory?.trim()) {
      setNotification({ text: lang === 'en' ? 'Expense category is required.' : 'Danh mục chi phí không được để trống.', type: 'error' });
      return;
    }
    if (recordForm.amount == null || Number(recordForm.amount) < 0) {
      setNotification({ text: lang === 'en' ? 'Amount must be 0 or greater.' : 'Số tiền không được âm.', type: 'error' });
      return;
    }

    setSubmittingRecord(true);
    try {
      await recordExpense(farmId, {
        ...recordForm,
        amount: Number(recordForm.amount),
        cropSeasonId: recordForm.cropSeasonId ? Number(recordForm.cropSeasonId) : undefined,
      });
      setNotification({ text: lang === 'en' ? 'Expense recorded successfully!' : 'Ghi nhận chi phí thành công!', type: 'success' });
      setIsRecordOpen(false);
      void loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : (lang === 'en' ? 'Failed to record expense.' : 'Ghi nhận chi phí thất bại.'),
        type: 'error',
      });
    } finally {
      setSubmittingRecord(false);
    }
  };

  // Update Expense
  const handleOpenUpdate = (item: ExpenseItem) => {
    setEditingExpense(item);
    setUpdateForm({
      expenseCategory: item.expenseCategory,
      amount: item.amount,
      expenseDate: item.expenseDate ? item.expenseDate.slice(0, 10) : '',
      cropSeasonId: item.cropSeasonId || undefined,
      description: item.description || '',
      receiptImageUrl: item.receiptImageUrl || '',
    });
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    if (updateForm.amount != null && Number(updateForm.amount) < 0) {
      setNotification({ text: lang === 'en' ? 'Amount must be 0 or greater.' : 'Số tiền không được âm.', type: 'error' });
      return;
    }

    setSubmittingUpdate(true);
    try {
      await updateExpense(editingExpense.expenseId, {
        ...updateForm,
        amount: updateForm.amount != null ? Number(updateForm.amount) : undefined,
        cropSeasonId: updateForm.cropSeasonId ? Number(updateForm.cropSeasonId) : undefined,
      });
      setNotification({ text: lang === 'en' ? 'Expense updated successfully!' : 'Cập nhật chi phí thành công!', type: 'success' });
      setEditingExpense(null);
      void loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : (lang === 'en' ? 'Failed to update expense.' : 'Cập nhật chi phí thất bại.'),
        type: 'error',
      });
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Delete Eligible Expense
  const handleOpenDelete = (item: ExpenseItem) => {
    setDeletingExpense(item);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    setSubmittingDelete(true);
    try {
      await deleteExpense(deletingExpense.expenseId);
      setNotification({
        text: lang === 'en' ? 'Expense deleted successfully.' : 'Đã xóa khoản chi phí thành công.',
        type: 'success',
      });
      setDeletingExpense(null);
      void loadData();
    } catch (err) {
      setNotification({
        text: err instanceof Error ? err.message : (lang === 'en' ? 'Failed to delete expense.' : 'Không thể xóa chi phí.'),
        type: 'error',
      });
    } finally {
      setSubmittingDelete(false);
    }
  };

  const formatCurrency = (val?: number) => currency(val ?? 0, lang);
  const pagination = usePagination(expenses, JSON.stringify([farmId, keyword, selectedSeasonId, selectedCategory, startDate, endDate]));

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Status / Action Notification Banner */}
      {notification && (isDeleteError(translate(notification.text), notification.type)
        ? <DeleteErrorToast text={translate(notification.text)} onClose={() => setNotification(null)} />
        : (<div
          className={notification.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginTop: 0, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>
            <strong>{(lang === 'en' ? notification.type === 'success' ? "✓ Success: " : "⚠️ Notice: " : notification.type === 'success' ? '✓ Thành công: ' : '⚠️ Thông báo: ')}</strong>
            {translate(notification.text)}
          </span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}
          >
            ✕
          </button>
        </div>))}

      {/* Main Page Heading matching Mockup */}
      <PageHeading level={embedded ? 2 : 1}   title={<>
            {lang === 'en' ? 'Farm Expenses' : 'Chi phí sản xuất'}
          </>} description={<>
            {lang === 'en'
              ? `${expenses.length} expense records · Total: ${formatCurrency(summary?.totalExpenseAmount)}`
              : `${expenses.length} khoản chi phí · Tổng: ${formatCurrency(summary?.totalExpenseAmount)} tại ${selectedFarm?.farmName || 'trang trại'}`}
          </>}><div>
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenRecord}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Record Expense' : 'Ghi nhận chi phí'}
          </Button>
        </div></PageHeading>

      {/* Main Unified Clean Card Container matching Mockup */}
      <div className="zone-clean-card">
        {/* Filter Bar */}
        <form onSubmit={handleSearch} className="zone-clean-filter-bar">
          <div className="zone-clean-search" style={{ flex: '1 1 220px' }}>
            <span className="search-icon" aria-hidden="true">
              <Icon name="search" size={17} />
            </span>
            <input aria-label={lang === 'en' ? 'Search description, category...' : 'Tìm theo diễn giải, danh mục chi phí...'} id="expenses-page-control-9" className="ui-input"
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={lang === 'en' ? 'Search description, category...' : 'Tìm theo diễn giải, danh mục chi phí...'}
            />
          </div>

          <div className="zone-clean-select-wrap">
            <select className="ui-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label={(lang === 'en' ? "Filter by expense category" : "Lọc theo danh mục chi phí")}
            >
              <option value="">{lang === 'en' ? 'All Categories' : 'Tất cả danh mục'}</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{translate(cat)}</option>
              ))}
            </select>
            <span className="select-arrow" aria-hidden="true"><Icon name="chevron" size={16} /></span>
          </div>

          <div className="zone-clean-select-wrap">
            <select id="expenses-page-control-10" className="ui-select"
              value={selectedSeasonId ?? ''}
              onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : undefined)}
              aria-label={(lang === 'en' ? "Filter by season" : "Lọc theo mùa vụ")}
            >
              <option value="">{lang === 'en' ? 'All Crop Seasons' : 'Tất cả mùa vụ'}</option>
              {seasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>{s.seasonName}</option>
                ))}
            </select>
            <span className="select-arrow"><Icon name="chevron" size={16} /></span>
          </div>

          <Button
            type="submit"
            variant="primary"

          >
            {lang === 'en' ? 'Filter' : 'Lọc'}
          </Button>

          {(keyword || selectedCategory || selectedSeasonId !== undefined || startDate || endDate) && (
            <button
              type="button"
              className="zone-clean-reload-btn"
              title={(lang === 'en' ? "Reset filters" : "Đặt lại bộ lọc")}
              onClick={handleClearFilters}
            >
              <Icon name="refresh" size={16} />
            </button>
          )}
        </form>

        {/* Table Wrap */}
        <div className="zone-table-wrap ui-table-scroll" style={{ margin: 0, border: 'none', borderRadius: 0 }} tabIndex={0}>
          <table className="ui-data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--color-page)' }}>

                <th scope="col">
                  {lang === 'en' ? 'EXPENSE DESCRIPTION' : 'DIỄN GIẢI KHOẢN CHI'}
                </th>
                <th scope="col">
                  {lang === 'en' ? 'CATEGORY' : 'DANH MỤC'}
                </th>
                <th scope="col">
                  {lang === 'en' ? 'SEASON' : 'MÙA VỤ'}
                </th>
                <th scope="col">
                  {lang === 'en' ? 'DATE' : 'NGÀY CHI'}
                </th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  {lang === 'en' ? 'AMOUNT' : 'SỐ TIỀN'}
                </th>
                <th scope="col" style={{ width: '140px', textAlign: 'right' }}>
                  {lang === 'en' ? 'Actions' : 'Thao tác'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'Loading expenses data...' : 'Đang tải dữ liệu chi phí sản xuất...'}
                  </td>
                </tr>
              ) : loadError ? (
                <tr><td colSpan={6}><LoadError message={loadError} onRetry={() => { void loadData(); }} /></td></tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    {lang === 'en' ? 'No expense records found.' : 'Không tìm thấy khoản chi phí nào phù hợp.'}
                  </td>
                </tr>
              ) : (
                pagination.items.map((item) => {
                  return (
                    <tr key={item.expenseId} style={{ borderBottom: '1px solid var(--color-border)' }}>

                      <td>
                        <span
                          onClick={() => handleOpenDetails(item.expenseId)}
                          style={{
                            fontWeight: 750,
                            fontSize: '15px',
                            color: 'var(--color-text)',
                            cursor: 'pointer',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-primary-text)')}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--color-text)')}
                        >
                          {item.description || (lang === 'en' ? 'No description' : 'Không có ghi chú')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-body)', fontSize: '13.5px' }}>
                        {translate(item.expenseCategory)}
                      </td>
                      <td style={{ color: 'var(--color-body)', fontSize: '13.5px' }}>
                        <div>{item.seasonName || (lang === 'en' ? 'General farm expense' : 'Chi phí chung toàn trang trại')}</div>
                      </td>
                      <td style={{ fontSize: '13.5px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(item.expenseDate, lang)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text)', fontSize: '14.5px', whiteSpace: 'nowrap' }}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-action-btns zone-card-actions">
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title={lang === 'en' ? 'View Details' : 'Xem chi tiết'}
                            aria-label={(lang === 'en' ? `View expense details` : `Xem chi tiết chi phí`)}
                            onClick={() => handleOpenDetails(item.expenseId)}
                          >
                            <Icon name="eye" size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            title={lang === 'en' ? 'Update Expense' : 'Sửa chi phí'}
                            aria-label={(lang === 'en' ? `Edit expense` : `Sửa chi phí`)}
                            onClick={() => handleOpenUpdate(item)}
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn danger"
                            title={lang === 'en' ? 'Delete Expense' : 'Xóa chi phí'}
                            aria-label={(lang === 'en' ? `Delete expense` : `Xóa chi phí`)}
                            onClick={() => handleOpenDelete(item)}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <TablePagination {...pagination} disabled={loading} />
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: VIEW EXPENSE DETAILS                    */}
      {/* ========================================================= */}
      <Modal structured
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        title={lang === 'en' ? 'Expense Details' : 'Chi tiết khoản chi phí sản xuất'}
      >
        {selectedExpense && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="ui-detail-field ui-detail-primary">
              <span>{lang === 'en' ? 'Expense Amount' : 'Số tiền chi'}</span>
              <div>{formatCurrency(selectedExpense.amount)}</div>
            </div>

            {/* Field Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="ui-detail-field">
                <span>{lang === 'en' ? 'Expense Category' : 'Danh mục chi phí'}</span>
                <div>{translate(selectedExpense.expenseCategory)}</div>
              </div>
              <div className="ui-detail-field">
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Expense Date' : 'Ngày chi tiêu'}:</span>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>{formatDate(selectedExpense.expenseDate, lang)}</div>
              </div>

              <div className="ui-detail-field">
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Crop Season' : 'Mùa vụ canh tác'}:</span>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                  {selectedExpense.seasonName || (lang === 'en' ? 'General farm expense' : 'Chi phí chung toàn trang trại')}
                </div>
              </div>

              <div className="ui-detail-field">
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Associated Task' : 'Công việc liên quan'}:</span>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                  {selectedExpense.taskTitle || (lang === 'en' ? 'None' : 'Không có')}
                </div>
              </div>

              <div className="ui-detail-field">
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Recorded By' : 'Người ghi nhận'}:</span>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                  {selectedExpense.recordedByName || (lang === 'en' ? 'System Member' : 'Thành viên trang trại')}
                </div>
              </div>
              <div className="ui-detail-field">
                <span>{lang === 'en' ? 'Recorded At' : 'Thời điểm ghi nhận'}</span>
                <div>{formatDateTime(selectedExpense.createdAt, lang)}</div>
              </div>
            </div>

            {/* Description */}
            <div className="ui-detail-field">
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Description & Notes' : 'Diễn giải / Ghi chú'}:</span>
                <div
                style={{
                  backgroundColor: 'var(--color-page)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-body)',
                  marginTop: '4px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
              >
                {selectedExpense.description || (lang === 'en' ? 'No notes provided.' : 'Không có ghi chú chi tiết.')}
              </div>
            </div>

            {/* Receipt Image Preview */}
            {selectedExpense.receiptImageUrl && (
              <div className="ui-detail-field">
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Receipt / Invoice Photo' : 'Ảnh hóa đơn / Chứng từ thanh toán'}:</span>
                <div style={{ marginTop: '6px', textAlign: 'center' }}>
                  <img
                    src={selectedExpense.receiptImageUrl}
                    alt={translate("Receipt")}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button className={'ui-close-action'} variant="secondary"
                type="button"
                onClick={() => setSelectedExpense(null)}

              >
                {lang === 'en' ? 'Close' : 'Đóng'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: RECORD EXPENSE                          */}
      {/* ========================================================= */}
      <Modal structured
        open={isRecordOpen}
        onClose={() => !submittingRecord && setIsRecordOpen(false)}
        title={lang === 'en' ? 'Record Production Expense' : 'Ghi nhận chi phí sản xuất mới'}
      >
        <form onSubmit={handleSubmitRecord} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {notification?.type === 'error' && !isDeleteError(translate(notification.text), notification.type) && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
          <div className="structured-field-card">
            <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-field-1">{lang === 'en' ? 'Expense Category' : 'Danh mục chi phí'} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <span className="structured-field-badge">{lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
            </div>
            <select id="expenses-page-field-1" className="ui-select"
              value={recordForm.expenseCategory}
              onChange={(e) => setRecordForm({ ...recordForm, expenseCategory: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
              required
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{translate(cat)}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="structured-field-card">
              <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-control-1">{lang === 'en' ? 'Amount (VND)' : 'Số tiền (VND)'} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <span className="structured-field-badge">{lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
            </div>
              <input id="expenses-page-control-1" className="ui-input"
                type="number"
                min="0"
                step="1000"
                value={recordForm.amount || ''}
                onChange={(e) => setRecordForm({ ...recordForm, amount: Number(e.target.value) })}
                placeholder={(lang === 'en' ? "e.g. 15000000" : "vd: 15000000")}
                style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
                required
              />
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-control-2">{lang === 'en' ? 'Expense Date' : 'Ngày chi'}</label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
              <input id="expenses-page-control-2" className="ui-input"
                type="date"
                value={recordForm.expenseDate}
                onChange={(e) => setRecordForm({ ...recordForm, expenseDate: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
              />
            </div>
          </div>

          <div className="structured-field-card">
            <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-field-2">{lang === 'en' ? 'Associated Crop Season' : 'Mùa vụ áp dụng'}</label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
            <select id="expenses-page-field-2" className="ui-select"
              value={recordForm.cropSeasonId ?? ''}
              onChange={(e) => setRecordForm({ ...recordForm, cropSeasonId: e.target.value ? Number(e.target.value) : undefined })}
              style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
            >
              <option value="">{lang === 'en' ? 'General farm expense (no season)' : 'Chi phí chung (không gán mùa vụ)'}</option>
              {seasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>{s.seasonName}</option>
                ))}
            </select>
          </div>

          <div className="structured-field-card">
            <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-control-3">{lang === 'en' ? 'Description' : 'Diễn giải nội dung chi'}</label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
            <textarea id="expenses-page-control-3" className="ui-textarea"
              rows={3}
              value={recordForm.description}
              onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
              placeholder={lang === 'en' ? 'Describe expense details, supplier, invoice no...' : 'Mô tả chi tiết khoản chi, nhà cung cấp, số hóa đơn...'}
              style={{ width: '100%', padding: '9px 12px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div className="structured-field-card">
            <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-control-4">{lang === 'en' ? 'Receipt Photo URL' : 'Đường dẫn ảnh hóa đơn / chứng từ'}</label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
            <input id="expenses-page-control-4" className="ui-input"
              type="url"
              value={recordForm.receiptImageUrl}
              onChange={(e) => setRecordForm({ ...recordForm, receiptImageUrl: e.target.value })}
              placeholder={(lang === 'en' ? "https://images.unsplash.com/... or receipt image URL" : "https://images.unsplash.com/... hoặc link ảnh chứng từ")}
              style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
            />
          </div>

          <div className="confirm-dialog-actions" style={{ flexWrap: 'wrap' }}>
            <small style={{ order: -2, marginRight: 'auto', color: 'var(--color-muted)' }}><span style={{ color: 'var(--color-danger)' }}>*</span> {lang === 'en' ? 'Required information' : 'Thông tin bắt buộc'}</small>
            <Button className="ui-cancel-button" variant="secondary"
              type="button"
              disabled={submittingRecord}
              onClick={() => setIsRecordOpen(false)}

            >
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant="primary"
              type="submit"
              loading={submittingRecord}

            >
              {submittingRecord ? (lang === 'en' ? 'Recording...' : 'Đang lưu...') : (lang === 'en' ? 'Save Expense' : 'Lưu khoản chi')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: UPDATE EXPENSE                          */}
      {/* ========================================================= */}
      <Modal structured
        open={Boolean(editingExpense)}
        onClose={() => !submittingUpdate && setEditingExpense(null)}
        title={lang === 'en' ? 'Update Production Expense' : 'Cập nhật khoản chi phí sản xuất'}
      >
        {editingExpense && (
          <form onSubmit={handleSubmitUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {notification?.type === 'error' && !isDeleteError(translate(notification.text), notification.type) && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
            <div className="structured-field-card">
              <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-field-3">{lang === 'en' ? 'Expense Category' : 'Danh mục chi phí'} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <span className="structured-field-badge">{lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
            </div>
              <select required id="expenses-page-field-3" className="ui-select"
                value={updateForm.expenseCategory}
                onChange={(e) => setUpdateForm({ ...updateForm, expenseCategory: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{translate(cat)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="structured-field-card">
                <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-control-5">{lang === 'en' ? 'Amount (VND)' : 'Số tiền (VND)'} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <span className="structured-field-badge">{lang === 'en' ? 'Required' : 'Bắt buộc'}</span>
            </div>
                <input required id="expenses-page-control-5" className="ui-input"
                  type="number"
                  min="0"
                  step="1000"
                  value={updateForm.amount ?? ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, amount: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
                />
              </div>

              <div className="structured-field-card">
                <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-control-6">{lang === 'en' ? 'Expense Date' : 'Ngày chi'}</label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
                <input id="expenses-page-control-6" className="ui-input"
                  type="date"
                  value={updateForm.expenseDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, expenseDate: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
                />
              </div>
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-field-4">{lang === 'en' ? 'Associated Crop Season' : 'Mùa vụ áp dụng'}</label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
              <select id="expenses-page-field-4" className="ui-select"
                value={updateForm.cropSeasonId ?? ''}
                onChange={(e) => setUpdateForm({ ...updateForm, cropSeasonId: e.target.value ? Number(e.target.value) : undefined })}
                style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
              >
                <option value="">{lang === 'en' ? 'General farm expense' : 'Chi phí chung toàn trang trại'}</option>
                {seasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>{s.seasonName}</option>
                ))}
              </select>
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-control-7">{lang === 'en' ? 'Description' : 'Diễn giải nội dung chi'}</label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
              <textarea id="expenses-page-control-7" className="ui-textarea"
                rows={3}
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div className="structured-field-card">
              <div className="structured-field-header">
              <label className="structured-field-label" htmlFor="expenses-page-control-8">{lang === 'en' ? 'Receipt Photo URL' : 'Đường dẫn ảnh hóa đơn / chứng từ'}</label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
              <input id="expenses-page-control-8" className="ui-input"
                type="url"
                value={updateForm.receiptImageUrl}
                onChange={(e) => setUpdateForm({ ...updateForm, receiptImageUrl: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', outline: 'none' }}
              />
            </div>

            <div className="confirm-dialog-actions" style={{ flexWrap: 'wrap' }}>
            <small style={{ order: -2, marginRight: 'auto', color: 'var(--color-muted)' }}><span style={{ color: 'var(--color-danger)' }}>*</span> {lang === 'en' ? 'Required information' : 'Thông tin bắt buộc'}</small>
              <Button className="ui-cancel-button" variant="secondary"
                type="button"
                disabled={submittingUpdate}
                onClick={() => setEditingExpense(null)}

              >
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button variant="primary"
                type="submit"
                loading={submittingUpdate}

              >
                {submittingUpdate ? (lang === 'en' ? 'Updating...' : 'Đang cập nhật...') : (lang === 'en' ? 'Save Changes' : 'Cập nhật')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: DELETE ELIGIBLE EXPENSE                 */}
      {/* ========================================================= */}
      <Modal structured
        open={Boolean(deletingExpense)}
        onClose={() => !submittingDelete && setDeletingExpense(null)}
        title={lang === 'en' ? 'Delete Eligible Expense' : 'Xóa chi phí đủ điều kiện'}
      >
        {deletingExpense && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notification?.type === 'error' && !isDeleteError(translate(notification.text), notification.type) && <p role="alert" className="form-error-banner">{translate(notification.text)}</p>}
            <div
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
            >
              ⚠️ {lang === 'en'
                ? 'Are you sure you want to delete this expense record? This action will permanently remove it from the farm financial ledger.'
                : 'Bạn có chắc chắn muốn xóa khoản chi phí này? Thao tác này sẽ xóa vĩnh viễn khỏi sổ cái tài chính của trang trại.'}
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-page)',
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-muted)' }}>{lang === 'en' ? 'Category:' : 'Danh mục:'}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{translate(deletingExpense.expenseCategory)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-muted)' }}>{lang === 'en' ? 'Amount:' : 'Số tiền:'}</span>
                <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{formatCurrency(deletingExpense.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-muted)' }}>{lang === 'en' ? 'Date:' : 'Ngày chi:'}</span>
                <span style={{ color: 'var(--color-text)' }}>{formatDate(deletingExpense.expenseDate, lang)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>{lang === 'en' ? 'Description:' : 'Nội dung:'}</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{deletingExpense.description || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button className="ui-cancel-button" variant="secondary"
                type="button"
                disabled={submittingDelete}
                onClick={() => setDeletingExpense(null)}

              >
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </Button>
              <Button variant="danger"
                type="button"
                loading={submittingDelete}
                onClick={handleConfirmDelete}

              >
                {submittingDelete ? (lang === 'en' ? 'Deleting...' : 'Đang xóa...') : (lang === 'en' ? 'Confirm Delete' : 'Xác nhận xóa')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
