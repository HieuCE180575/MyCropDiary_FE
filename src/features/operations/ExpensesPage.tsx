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
    <div className="expenses-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name={notification.type === 'success' ? 'check' : 'alert-circle'} size={18} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
              }}
            >
              <Icon name="dollar-sign" size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                {lang === 'en' ? 'Farm Expenses & Production Cost' : 'Chi phí sản xuất & Hạch toán nông nghiệp'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                {lang === 'en'
                  ? `Expense tracking and financial ledger for farm: ${selectedFarm?.farmName || ''}`
                  : `Quản lý, theo dõi và báo cáo hạch toán chi phí canh tác trang trại: ${selectedFarm?.farmName || ''}`}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowSummaryDetails(!showSummaryDetails)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: showSummaryDetails ? '#f1f5f9' : '#ffffff',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon name="pie-chart" size={18} />
            {showSummaryDetails
              ? (lang === 'en' ? 'Hide Cost Breakdown' : 'Thu gọn phân tích')
              : (lang === 'en' ? 'View Cost Breakdown' : 'Xem cơ cấu chi phí')}
          </button>

          <button
            type="button"
            onClick={handleOpenRecord}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Icon name="plus" size={18} />
            {lang === 'en' ? 'Record New Expense' : 'Ghi nhận chi phí mới'}
          </button>
        </div>
      </div>

      {/* Top Summary Cards  */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Total Cost */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {lang === 'en' ? 'Total Expenses' : 'Tổng chi phí sản xuất'}
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669' }}>
              <Icon name="dollar-sign" size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            {formatCurrency(summary?.totalExpenseAmount)}
          </div>
          <div style={{ fontSize: '13px', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
            {summary?.cropSeasonName ? `Mùa vụ: ${summary.cropSeasonName}` : (lang === 'en' ? 'All recorded seasons' : 'Toàn bộ mùa vụ canh tác')}
          </div>
        </div>

        {/* Card 2: Total Records */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {lang === 'en' ? 'Transactions' : 'Số khoản chi ghi nhận'}
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Icon name="file-text" size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            {summary?.totalExpenseCount ?? expenses.length}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            {lang === 'en' ? 'Verified invoice & ledger entries' : 'Khoản chi có chứng từ & hóa đơn'}
          </div>
        </div>

        {/* Card 3: Top Category */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {lang === 'en' ? 'Top Cost Category' : 'Khoản chi lớn nhất'}
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#fffbeb', color: '#d97706' }}>
              <Icon name="trending-up" size={18} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {summary?.byCategory?.[0]?.category || (lang === 'en' ? 'None' : 'Chưa có')}
          </div>
          <div style={{ fontSize: '13px', color: '#d97706', marginTop: '4px', fontWeight: 600 }}>
            {summary?.byCategory?.[0] ? `${formatCurrency(summary.byCategory[0].totalAmount)} (${summary.byCategory[0].percentage}%)` : '0%'}
          </div>
        </div>

        {/* Card 4: Categories Count */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {lang === 'en' ? 'Active Categories' : 'Nhóm danh mục phân loại'}
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
              <Icon name="tag" size={18} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            {summary?.byCategory?.length || 0}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            {lang === 'en' ? 'Categorized under VietGAP standards' : 'Theo chuẩn phân loại hạch toán VietGAP'}
          </div>
        </div>
      </div>

      {/* Expandable Breakdown Panel  */}
      {showSummaryDetails && summary && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            📊 {lang === 'en' ? 'Detailed Production Cost Breakdown' : 'Phân bổ chi tiết cơ cấu chi phí sản xuất'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* By Category */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                {lang === 'en' ? 'By Cost Category' : 'Theo nhóm danh mục chi phí'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {summary.byCategory.map((cat) => (
                  <div key={cat.category} style={{ fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{cat.category}</span>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                        {formatCurrency(cat.totalAmount)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Number(cat.percentage))}%`,
                          height: '100%',
                          backgroundColor: CATEGORY_COLORS[cat.category]?.text || '#10b981',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Season */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                {lang === 'en' ? 'By Cultivation Crop Season' : 'Theo từng mùa vụ canh tác'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.bySeason.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>{lang === 'en' ? 'No seasonal costs recorded.' : 'Chưa có dữ liệu theo mùa vụ.'}</div>
                ) : (
                  summary.bySeason.map((s) => (
                    <div
                      key={s.seasonId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{s.seasonName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{s.count} {lang === 'en' ? 'items' : 'khoản chi'}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: '14px' }}>
                        {formatCurrency(s.totalAmount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar  */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Keyword Search  */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={lang === 'en' ? 'Search description, category...' : 'Tìm theo diễn giải, danh mục chi phí...'}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter: Category  */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">{lang === 'en' ? 'All Categories' : 'Tất cả danh mục'}</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Filter: Season  */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedSeasonId ?? ''}
              onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : undefined)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">{lang === 'en' ? 'All Crop Seasons' : 'Tất cả mùa vụ'}</option>
              {seasons.map((s) => (
                <option key={s.cropSeasonId} value={s.cropSeasonId}>{s.seasonName}</option>
              ))}
            </select>
          </div>

          {/* Date Range: From */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              {lang === 'en' ? 'From:' : 'Từ:'}
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Date Range: To */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              {lang === 'en' ? 'To:' : 'Đến:'}
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {lang === 'en' ? 'Search' : 'Tìm kiếm'}
            </button>

            {(keyword || selectedCategory || selectedSeasonId !== undefined || startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {lang === 'en' ? 'Clear' : 'Xóa bộ lọc'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Main Expense Table  */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{lang === 'en' ? 'Expense Category' : 'Danh mục chi phí'}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{lang === 'en' ? 'Description' : 'Diễn giải nội dung'}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{lang === 'en' ? 'Season / Task' : 'Mùa vụ / Công việc'}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{lang === 'en' ? 'Date' : 'Ngày chi'}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>{lang === 'en' ? 'Amount (VND)' : 'Số tiền (VND)'}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>{lang === 'en' ? 'Receipt' : 'Hóa đơn'}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    {lang === 'en' ? 'Loading expenses data...' : 'Đang tải dữ liệu chi phí sản xuất...'}
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Icon name="inbox" size={32} />
                    </div>
                    {lang === 'en' ? 'No expense records found.' : 'Không tìm thấy khoản chi phí nào phù hợp.'}
                  </td>
                </tr>
              ) : (
                expenses.map((item) => {
                  const styleColors = CATEGORY_COLORS[item.expenseCategory] || CATEGORY_COLORS['Other'];
                  return (
                    <tr
                      key={item.expenseId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Category Badge */}
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

                      {/* Description */}
                      <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description || (lang === 'en' ? 'No description' : 'Không có ghi chú')}
                        </div>
                        {item.recordedByName && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            {lang === 'en' ? 'By:' : 'Ghi nhận bởi:'} {item.recordedByName}
                          </div>
                        )}
                      </td>

                      {/* Season / Task */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#334155', fontWeight: 500 }}>
                          {item.seasonName || (lang === 'en' ? 'General farm expense' : 'Chi phí chung toàn trang trại')}
                        </div>
                        {item.taskTitle && (
                          <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>
                            <Icon name="check-square" size={12} /> {item.taskTitle}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {item.expenseDate}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                        {formatCurrency(item.amount)}
                      </td>

                      {/* Receipt Photo */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {item.receiptImageUrl ? (
                          <a
                            href={item.receiptImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              color: '#2563eb',
                            }}
                            title={lang === 'en' ? 'View receipt image' : 'Xem ảnh hóa đơn'}
                          >
                            <Icon name="image" size={16} />
                          </a>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {/* View Details Button  */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(item.expenseId)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                            title={lang === 'en' ? 'View Details' : 'Xem chi tiết'}
                          >
                            <Icon name="eye" size={15} />
                          </button>

                          {/* Update Button  */}
                          <button
                            type="button"
                            onClick={() => handleOpenUpdate(item)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              color: '#2563eb',
                              cursor: 'pointer',
                            }}
                            title={lang === 'en' ? 'Update Expense' : 'Sửa chi phí'}
                          >
                            <Icon name="edit" size={15} />
                          </button>

                          {/* Delete Button  */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              cursor: 'pointer',
                            }}
                            title={lang === 'en' ? 'Delete Eligible Expense' : 'Xóa chi phí đủ điều kiện'}
                          >
                            <Icon name="trash-2" size={15} />
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
    </div>
  );
}
