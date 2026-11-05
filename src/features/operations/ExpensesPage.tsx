import { useEffect, useState, useMemo } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { fetchCropSeasonsByFarm, type CropSeasonResp } from './cropSeasonService';
import {
  fetchExpenses,
  fetchExpenseDetails,
  recordExpense,
  updateExpense,
  deleteExpense,
  fetchExpenseSummary,
  type ExpenseItem,
  type CreateExpensePayload,
  type UpdateExpensePayload,
  type ExpenseSummaryResp,
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Materials & Fertilizers': { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  'Labor': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  'Utilities & Power': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  'Machinery & Fuel': { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  'Pest Control': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  'Packaging': { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' },
  'Irrigation & Water': { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4' },
  'Other': { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

export function ExpensesPage() {
  const { lang } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;

  // Data states
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [seasons, setSeasons] = useState<CropSeasonResp[]>([]);
  const [summary, setSummary] = useState<ExpenseSummaryResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter & Search states
  const [keyword, setKeyword] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);

  // View Details Modal
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Record Expense Modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<CreateExpensePayload>({
    expenseCategory: 'Materials & Fertilizers',
    amount: 0,
    expenseDate: new Date().toISOString().slice(0, 10),
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
      setNotification({
        text: err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load expenses.' : 'Không thể tải danh sách chi phí.'),
        type: 'error',
      });
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
    setLoadingDetail(true);
    try {
      const detail = await fetchExpenseDetails(expenseId);
      setSelectedExpense(detail);
    } catch {
      const fallback = expenses.find((e) => e.expenseId === expenseId) || null;
      setSelectedExpense(fallback);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Record Expense 
  const handleOpenRecord = () => {
    setRecordForm({
      expenseCategory: 'Materials & Fertilizers',
      amount: 0,
      expenseDate: new Date().toISOString().slice(0, 10),
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

  const formatCurrency = (val?: number) => {
    if (val == null) return '0 ₫';
    return `${Number(val).toLocaleString('vi-VN')} ₫`;
  };

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Status / Action Notification Banner */}
      {notification && (
        <div
          className={notification.type === 'error' ? 'form-error-banner' : 'status-note'}
          style={{ marginTop: 0, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>
            <strong>{notification.type === 'success' ? '✓ Thành công: ' : '⚠️ Thông báo: '}</strong>
            {notification.text}
          </span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Page Heading matching Mockup */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {lang === 'en' ? 'Farm Expenses' : 'Chi phí sản xuất'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            {lang === 'en'
              ? `${expenses.length} expense records · Total: ${formatCurrency(summary?.totalExpenseAmount)}`
              : `${expenses.length} khoản chi phí · Tổng: ${formatCurrency(summary?.totalExpenseAmount)} tại ${selectedFarm?.farmName || 'trang trại'}`}
          </p>
        </div>

        <div>
          <button
            type="button"
            className="primary-button"
            onClick={handleOpenRecord}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '10px',
              background: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            }}
          >
            <Icon name="plus" size={17} /> {lang === 'en' ? 'Record Expense' : 'Ghi nhận chi phí'}
          </button>
        </div>
      </div>

      {/* Main Unified Clean Card Container matching Mockup */}
      <div className="zone-clean-card">
        {/* Filter Bar */}
        <form onSubmit={handleSearch} className="zone-clean-filter-bar">
          <div className="zone-clean-search" style={{ flex: '1 1 220px' }}>
            <span className="search-icon">
              <Icon name="search" size={17} />
            </span>
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={lang === 'en' ? 'Search description, category...' : 'Tìm theo diễn giải, danh mục chi phí...'}
            />
          </div>

          <div className="zone-clean-select-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Lọc theo danh mục chi phí"
            >
              <option value="">{lang === 'en' ? 'All Categories' : 'Tất cả danh mục'}</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <span className="select-arrow"><Icon name="chevron" size={16} /></span>
          </div>

          <div className="zone-clean-select-wrap">
            <select
              value={selectedSeasonId ?? ''}
              onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : undefined)}
              aria-label="Lọc theo mùa vụ"
            >
              <option value="">{lang === 'en' ? 'All Crop Seasons' : 'Tất cả mùa vụ'}</option>
              {seasons.map((s) => (
                <option key={s.cropSeasonId} value={s.cropSeasonId}>{s.seasonName}</option>
              ))}
            </select>
            <span className="select-arrow"><Icon name="chevron" size={16} /></span>
          </div>

          <button
            type="submit"
            className="action-button solid"
            style={{ height: '42px', padding: '0 16px', borderRadius: '10px' }}
          >
            {lang === 'en' ? 'Filter' : 'Lọc'}
          </button>

          {(keyword || selectedCategory || selectedSeasonId !== undefined || startDate || endDate) && (
            <button
              type="button"
              className="zone-clean-reload-btn"
              title="Đặt lại bộ lọc"
              onClick={handleClearFilters}
            >
              <Icon name="refresh" size={16} />
            </button>
          )}
        </form>

        {/* Table Wrap */}
        <div className="zone-table-wrap" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: '40px', padding: '14px 16px', textAlign: 'center' }}>
                  <input type="checkbox" aria-label="Chọn tất cả" style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'EXPENSE DESCRIPTION' : 'DIỄN GIẢI KHOẢN CHI'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'CATEGORY' : 'DANH MỤC'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'SEASON / TASK' : 'MÙA VỤ / CÔNG VIỆC'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  {lang === 'en' ? 'DATE' : 'NGÀY CHI'}
                </th>
                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                  {lang === 'en' ? 'AMOUNT' : 'SỐ TIỀN'}
                </th>
                <th style={{ width: '140px', padding: '14px 16px', textAlign: 'right' }}>
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    {lang === 'en' ? 'Loading expenses data...' : 'Đang tải dữ liệu chi phí sản xuất...'}
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    {lang === 'en' ? 'No expense records found.' : 'Không tìm thấy khoản chi phí nào phù hợp.'}
                  </td>
                </tr>
              ) : (
                expenses.map((item) => {
                  const styleColors = CATEGORY_COLORS[item.expenseCategory] || CATEGORY_COLORS['Other'];
                  return (
                    <tr key={item.expenseId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <input type="checkbox" aria-label={`Chọn chi phí #${item.expenseId}`} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          onClick={() => handleOpenDetails(item.expenseId)}
                          style={{
                            fontWeight: 750,
                            fontSize: '15px',
                            color: '#0f172a',
                            cursor: 'pointer',
                            display: 'block',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#059669')}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#0f172a')}
                        >
                          {item.description || (lang === 'en' ? 'No description' : 'Không có ghi chú')}
                        </span>
                        {item.recordedByName && (
                          <span style={{ fontSize: '12.5px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                            {lang === 'en' ? 'Recorded by:' : 'Ghi nhận bởi:'} {item.recordedByName}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: styleColors.bg,
                            color: styleColors.text,
                            border: `1px solid ${styleColors.border}`,
                          }}
                        >
                          {item.expenseCategory}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13.5px' }}>
                        <div>{item.seasonName || (lang === 'en' ? 'General farm expense' : 'Chi phí chung toàn trang trại')}</div>
                        {item.taskTitle && (
                          <div style={{ fontSize: '11.5px', color: '#2563eb', marginTop: '2px' }}>
                            ✓ {item.taskTitle}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {item.expenseDate}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '14.5px' }}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div className="table-action-btns zone-card-actions">
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title={lang === 'en' ? 'View Details' : 'Xem chi tiết'}
                            aria-label={`Xem chi tiết chi phí #${item.expenseId}`}
                            onClick={() => handleOpenDetails(item.expenseId)}
                          >
                            <Icon name="eye" size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            title={lang === 'en' ? 'Update Expense' : 'Sửa chi phí'}
                            aria-label={`Sửa chi phí #${item.expenseId}`}
                            onClick={() => handleOpenUpdate(item)}
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn danger"
                            title={lang === 'en' ? 'Delete Expense' : 'Xóa chi phí'}
                            aria-label={`Xóa chi phí #${item.expenseId}`}
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
        <div className="zone-table-footer">
          <span>
            {lang === 'en'
              ? `Showing 1–${expenses.length} of ${expenses.length} expense items`
              : `Hiển thị 1–${expenses.length} trong ${expenses.length} khoản chi phí`}
          </span>
          <div className="zone-pagination-wrap">
            <button type="button" className="zone-page-btn" disabled>&lt;</button>
            <button type="button" className="zone-page-btn active">1</button>
            <button type="button" className="zone-page-btn" disabled>&gt;</button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: VIEW EXPENSE DETAILS                    */}
      {/* ========================================================= */}
      <Modal
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        title={lang === 'en' ? 'Expense Details' : 'Chi tiết khoản chi phí sản xuất'}
      >
        {selectedExpense && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Amount Banner */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '16px 20px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  {lang === 'en' ? 'Expense Amount' : 'Số tiền chi'}
                </span>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {formatCurrency(selectedExpense.amount)}
                </div>
              </div>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: CATEGORY_COLORS[selectedExpense.expenseCategory]?.bg || '#f1f5f9',
                  color: CATEGORY_COLORS[selectedExpense.expenseCategory]?.text || '#334155',
                  border: `1px solid ${CATEGORY_COLORS[selectedExpense.expenseCategory]?.border || '#e2e8f0'}`,
                }}
              >
                {selectedExpense.expenseCategory}
              </span>
            </div>

            {/* Field Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Expense Date' : 'Ngày chi tiêu'}:</span>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{selectedExpense.expenseDate}</div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Crop Season' : 'Mùa vụ canh tác'}:</span>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {selectedExpense.seasonName || (lang === 'en' ? 'General farm expense' : 'Chi phí chung toàn trang trại')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Associated Task' : 'Công việc liên quan'}:</span>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {selectedExpense.taskTitle || (lang === 'en' ? 'None' : 'Không có')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Recorded By' : 'Người ghi nhận'}:</span>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {selectedExpense.recordedByName || (lang === 'en' ? 'System Member' : 'Thành viên trang trại')}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Description & Notes' : 'Diễn giải / Ghi chú'}:</span>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9',
                  color: '#334155',
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
              <div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{lang === 'en' ? 'Receipt / Invoice Photo' : 'Ảnh hóa đơn / Chứng từ thanh toán'}:</span>
                <div style={{ marginTop: '6px', textAlign: 'center' }}>
                  <img
                    src={selectedExpense.receiptImageUrl}
                    alt="Receipt"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {lang === 'en' ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: RECORD EXPENSE                          */}
      {/* ========================================================= */}
      <Modal
        open={isRecordOpen}
        onClose={() => !submittingRecord && setIsRecordOpen(false)}
        title={lang === 'en' ? 'Record Production Expense' : 'Ghi nhận chi phí sản xuất mới'}
      >
        <form onSubmit={handleSubmitRecord} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {lang === 'en' ? 'Expense Category *' : 'Danh mục chi phí *'}
            </label>
            <select
              value={recordForm.expenseCategory}
              onChange={(e) => setRecordForm({ ...recordForm, expenseCategory: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
              required
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {lang === 'en' ? 'Amount (VND) *' : 'Số tiền (VND) *'}
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={recordForm.amount || ''}
                onChange={(e) => setRecordForm({ ...recordForm, amount: Number(e.target.value) })}
                placeholder="vd: 15000000"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {lang === 'en' ? 'Expense Date' : 'Ngày chi'}
              </label>
              <input
                type="date"
                value={recordForm.expenseDate}
                onChange={(e) => setRecordForm({ ...recordForm, expenseDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {lang === 'en' ? 'Associated Crop Season (optional)' : 'Mùa vụ áp dụng (tùy chọn)'}
            </label>
            <select
              value={recordForm.cropSeasonId ?? ''}
              onChange={(e) => setRecordForm({ ...recordForm, cropSeasonId: e.target.value ? Number(e.target.value) : undefined })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="">{lang === 'en' ? 'General farm expense (no season)' : 'Chi phí chung (không gán mùa vụ)'}</option>
              {seasons.map((s) => (
                <option key={s.cropSeasonId} value={s.cropSeasonId}>{s.seasonName}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {lang === 'en' ? 'Description' : 'Diễn giải nội dung chi'}
            </label>
            <textarea
              rows={3}
              value={recordForm.description}
              onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
              placeholder={lang === 'en' ? 'Describe expense details, supplier, invoice no...' : 'Mô tả chi tiết khoản chi, nhà cung cấp, số hóa đơn...'}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {lang === 'en' ? 'Receipt Photo URL' : 'Đường dẫn ảnh hóa đơn / chứng từ'}
            </label>
            <input
              type="url"
              value={recordForm.receiptImageUrl}
              onChange={(e) => setRecordForm({ ...recordForm, receiptImageUrl: e.target.value })}
              placeholder="https://images.unsplash.com/... hoặc link ảnh chứng từ"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              disabled={submittingRecord}
              onClick={() => setIsRecordOpen(false)}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="submit"
              disabled={submittingRecord}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {submittingRecord ? (lang === 'en' ? 'Recording...' : 'Đang lưu...') : (lang === 'en' ? 'Save Expense' : 'Lưu khoản chi')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: UPDATE EXPENSE                          */}
      {/* ========================================================= */}
      <Modal
        open={Boolean(editingExpense)}
        onClose={() => !submittingUpdate && setEditingExpense(null)}
        title={lang === 'en' ? 'Update Production Expense' : 'Cập nhật khoản chi phí sản xuất'}
      >
        {editingExpense && (
          <form onSubmit={handleSubmitUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {lang === 'en' ? 'Expense Category' : 'Danh mục chi phí'}
              </label>
              <select
                value={updateForm.expenseCategory}
                onChange={(e) => setUpdateForm({ ...updateForm, expenseCategory: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {lang === 'en' ? 'Amount (VND)' : 'Số tiền (VND)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={updateForm.amount ?? ''}
                  onChange={(e) => setUpdateForm({ ...updateForm, amount: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  {lang === 'en' ? 'Expense Date' : 'Ngày chi'}
                </label>
                <input
                  type="date"
                  value={updateForm.expenseDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, expenseDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {lang === 'en' ? 'Associated Crop Season' : 'Mùa vụ áp dụng'}
              </label>
              <select
                value={updateForm.cropSeasonId ?? ''}
                onChange={(e) => setUpdateForm({ ...updateForm, cropSeasonId: e.target.value ? Number(e.target.value) : undefined })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="">{lang === 'en' ? 'General farm expense' : 'Chi phí chung toàn trang trại'}</option>
                {seasons.map((s) => (
                  <option key={s.cropSeasonId} value={s.cropSeasonId}>{s.seasonName}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {lang === 'en' ? 'Description' : 'Diễn giải nội dung'}
              </label>
              <textarea
                rows={3}
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {lang === 'en' ? 'Receipt Photo URL' : 'Đường dẫn ảnh chứng từ / hóa đơn'}
              </label>
              <input
                type="url"
                value={updateForm.receiptImageUrl}
                onChange={(e) => setUpdateForm({ ...updateForm, receiptImageUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                disabled={submittingUpdate}
                onClick={() => setEditingExpense(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </button>
              <button
                type="submit"
                disabled={submittingUpdate}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {submittingUpdate ? (lang === 'en' ? 'Updating...' : 'Đang cập nhật...') : (lang === 'en' ? 'Save Changes' : 'Cập nhật')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: DELETE ELIGIBLE EXPENSE                 */}
      {/* ========================================================= */}
      <Modal
        open={Boolean(deletingExpense)}
        onClose={() => !submittingDelete && setDeletingExpense(null)}
        title={lang === 'en' ? 'Delete Eligible Expense' : 'Xóa chi phí đủ điều kiện'}
      >
        {deletingExpense && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                backgroundColor: '#fff1f2',
                color: '#9f1239',
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid #fecdd3',
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
                backgroundColor: '#f8fafc',
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>{lang === 'en' ? 'Category:' : 'Danh mục:'}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{deletingExpense.expenseCategory}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>{lang === 'en' ? 'Amount:' : 'Số tiền:'}</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>{formatCurrency(deletingExpense.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>{lang === 'en' ? 'Date:' : 'Ngày chi:'}</span>
                <span style={{ color: '#0f172a' }}>{deletingExpense.expenseDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{lang === 'en' ? 'Description:' : 'Nội dung:'}</span>
                <span style={{ color: '#0f172a', fontWeight: 500 }}>{deletingExpense.description || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                disabled={submittingDelete}
                onClick={() => setDeletingExpense(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {lang === 'en' ? 'Cancel' : 'Hủy'}
              </button>
              <button
                type="button"
                disabled={submittingDelete}
                onClick={handleConfirmDelete}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {submittingDelete ? (lang === 'en' ? 'Deleting...' : 'Đang xóa...') : (lang === 'en' ? 'Confirm Delete' : 'Xác nhận xóa')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
