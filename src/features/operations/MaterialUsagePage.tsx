import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Modal } from '../../shared/components/Modal';
import { Icon } from '../../shared/components/Icon';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { FarmingActivityPicker } from './FarmingActivityPicker';
import { MaterialUsageFormSection } from './MaterialUsageFormSection';
import { DosageInput, MethodInput, MATERIAL_TYPES, MATERIAL_GROUPS, materialGroupName, getMaterialUnitOptions } from './MaterialUsageInputGroups';
import { Pagination } from '../../shared/components/Pagination';
import { MaterialUsageHistory, isOrganicMaterial } from './MaterialUsageHistory';
import '../../styles/material-usage.css';

interface UsageFilters { keyword: string; materialType: string; fromDate: string; toDate: string }
const EMPTY_FILTERS: UsageFilters = { keyword: '', materialType: 'ALL', fromDate: '', toDate: '' };
const PAGE_SIZE = 50;
interface UsagePage {
  items: MaterialUsage[];
  page: number;
  totalElements: number;
  totalPages: number;
}

export interface MaterialUsage {
  materialUsageId: number;
  farmingActivityId?: number;
  activityName?: string;
  cropSeasonId?: number;
  materialId: number;
  materialCode?: string;
  materialName: string;
  materialType?: string;
  inputPurchaseDetailId?: number;
  recordedByMemberId?: number;
  recorderFullName?: string | null;
  usedAt: string;
  quantity: number;
  unit: string;
  dosage?: string | null;
  method?: string | null;
  safetyIntervalDays?: number | null;
  notes?: string | null;
}

export interface MaterialOption {
  id: number;
  farmId: number;
  materialName: string;
  materialType?: string;
  unit: string;
  description?: string;
  isActive?: boolean;
}

export function MaterialUsagePage() {
  const { selectedFarm } = useFarmWorkspace();
  return <MaterialUsageContent key={selectedFarm?.id ?? 'no-farm'} />;
}

function MaterialUsageContent() {
  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id;

  const [usages, setUsages] = useState<MaterialUsage[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [materialKeyword, setMaterialKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [editingUsage, setEditingUsage] = useState<MaterialUsage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const requests = useRef<{ list?: AbortController; materials?: AbortController; detail?: AbortController; save?: AbortController; delete?: AbortController }>({});

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<UsageFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<MaterialUsage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form states
  const [useExistingMaterial, setUseExistingMaterial] = useState(true);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | ''>('');
  const [customMaterialName, setCustomMaterialName] = useState('');
  const [customMaterialType, setCustomMaterialType] = useState('Phân bón hữu cơ');
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [unit, setUnit] = useState('kg');
  const [dosage, setDosage] = useState('');
  const [method, setMethod] = useState('');
  const [safetyDays, setSafetyDays] = useState<number | ''>('');
  const [usedAtTime, setUsedAtTime] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [farmingActivityId, setFarmingActivityId] = useState<number | ''>('');

  useEffect(() => {
    if (farmId) { loadUsages(); loadMaterials(); }
    return () => Object.values(requests.current).forEach(request => request?.abort());
  }, [farmId]);

  useRealtimeSync(() => {
    if (loading || saving || isCreateModalOpen || selectedDetail || detailLoading || deletingId !== null) return;
    void loadUsages(page, appliedFilters, true);
    void loadMaterials();
  });

  const loadMaterials = async () => {
    if (!farmId) return;
    requests.current.materials?.abort();
    const controller = new AbortController();
    requests.current.materials = controller;
    setMaterialsError(null);
    try {
      const res = await apiRequest<ApiResponse<MaterialOption[]>>('/material-usages/materials?farmId=' + farmId, { signal: controller.signal });
      if (!res.success || !Array.isArray(res.data)) throw new Error(res.message || 'Không tải được danh mục vật tư.');
      if (!controller.signal.aborted) setMaterials(res.data);
    } catch (error) {
      if (!controller.signal.aborted) {
        setMaterials([]);
        setMaterialsError(error instanceof Error ? error.message : 'Không tải được danh mục vật tư.');
      }
    }
  };

  const loadUsages = async (requestedPage = page, filters = appliedFilters, silent = false) => {
    if (!farmId) return;
    requests.current.list?.abort();
    const controller = new AbortController();
    requests.current.list = controller;
    if (!silent) {
      setLoading(true);
      setPage(requestedPage);
      setLoadError(null);
    }
    try {
      const params = new URLSearchParams({ farmId: String(farmId), size: String(PAGE_SIZE), page: String(requestedPage) });
      if (filters.keyword) params.set('keyword', filters.keyword);
      if (filters.materialType !== 'ALL') params.set('materialType', filters.materialType);
      if (filters.fromDate) params.set('fromDate', filters.fromDate + 'T00:00:00');
      if (filters.toDate) params.set('toDate', filters.toDate + 'T23:59:59');
      const fetchPage = async () => {
        const result = await apiRequest<ApiResponse<UsagePage>>('/material-usages?' + params, { signal: controller.signal });
        if (!result.success || !Array.isArray(result.data?.items)
          || !Number.isInteger(result.data.page) || !Number.isInteger(result.data.totalPages)
          || !Number.isInteger(result.data.totalElements) || result.data.totalElements < 0
          || result.data.page < 0 || result.data.totalPages < 0) {
          throw new Error(result.message || 'Không tải được lịch sử sử dụng vật tư.');
        }
        return result.data;
      };
      let result = await fetchPage();
      // Deleting the last row on the last page can reduce the number of pages.
      if (!controller.signal.aborted && requestedPage > Math.max(0, result.totalPages - 1)) {
        params.set('page', String(Math.max(0, result.totalPages - 1)));
        result = await fetchPage();
      }
      if (!controller.signal.aborted) {
        setLoadError(null);
        setUsages(result.items);
        setPage(result.page);
        setTotalElements(result.totalElements);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      if (!controller.signal.aborted && !silent) {
        setUsages([]);
        setLoadError(error instanceof Error ? error.message : 'Không tải được lịch sử sử dụng vật tư.');
      }
    } finally {
      if (!controller.signal.aborted && !silent) setLoading(false);
    }
  };

  const applyFilters = (filters: UsageFilters) => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setFilterError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    setFilterError(null);
    setAppliedFilters(filters);
    void loadUsages(0, filters);
  };
  const filterUsages = () => applyFilters({ keyword: searchKeyword.trim(), materialType: filterType, fromDate, toDate });

  const handleSelectMaterial = (id: number) => {
    setSelectedMaterialId(id);
    const material = materials.find(item => item.id === id);
    if (material) { setUnit(material.unit); setCustomMaterialType(material.materialType ?? ''); }
  };

  const openUsage = async (id: number, edit = false) => {
    requests.current.detail?.abort();
    const controller = new AbortController();
    requests.current.detail = controller;
    setDetailLoading(true);
    setNotification(null);
    setSelectedDetail(null);
    try {
      const res = await apiRequest<ApiResponse<MaterialUsage>>('/material-usages/' + id, { signal: controller.signal });
      if (!res.success || !res.data) throw new Error(res.message || 'Không tải được chi tiết sử dụng vật tư.');
      if (controller.signal.aborted) return;
      if (edit) {
        if (!res.data.farmingActivityId) throw new Error('Bản ghi chưa liên kết hoạt động canh tác, chưa thể chỉnh sửa.');
        setEditingUsage(res.data);
        setMaterialKeyword('');
        setUseExistingMaterial(true);
        setSelectedMaterialId(res.data.materialId);
        setCustomMaterialType(res.data.materialType ?? '');
        setQuantity(res.data.quantity);
        setUnit(res.data.unit);
        setUsedAtTime(res.data.usedAt);
        setNotes(res.data.notes ?? '');
        setFarmingActivityId(res.data.farmingActivityId);
        setDosage(res.data.dosage ?? '');
        setMethod(res.data.method ?? '');
        setSafetyDays(res.data.safetyIntervalDays ?? '');
        setIsCreateModalOpen(true);
      } else setSelectedDetail(res.data);
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: error instanceof Error ? error.message : 'Không tải được chi tiết sử dụng vật tư.', type: 'error' });
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  };

  const handleSaveUsage = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !farmId) return;
    if (!quantity || !Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(farmingActivityId) || Number(farmingActivityId) <= 0 || !usedAtTime || !unit.trim()) {
      setNotification({ text: 'Chọn hoạt động canh tác, nhập thời gian, đơn vị và số lượng lớn hơn 0.', type: 'error' });
      return;
    }
    if (useExistingMaterial && !selectedMaterialId) {
      setNotification({ text: 'Vui lòng chọn vật tư.', type: 'error' });
      return;
    }
    if (dosage.trim().length > 100 || method.trim().length > 200) {
      setNotification({ text: 'Liều lượng tối đa 100 ký tự, phương pháp tối đa 200 ký tự.', type: 'error' });
      return;
    }
    if (safetyDays !== '' && (!Number.isInteger(safetyDays) || safetyDays < 0 || safetyDays > 2147483647)) {
      setNotification({ text: 'Số ngày cách ly phải là số nguyên không âm hợp lệ.', type: 'error' });
      return;
    }
    setSaving(true);
    setNotification(null);
    const controller = new AbortController();
    requests.current.save = controller;
    try {
      let materialId = Number(selectedMaterialId);
      if (!useExistingMaterial && !editingUsage) {
        if (!customMaterialName.trim()) throw new Error('Vui lòng nhập tên vật tư mới.');
        const created = await apiRequest<ApiResponse<MaterialOption>>('/material-usages/materials', {
          method: 'POST', signal: controller.signal,
          data: { farmId, materialName: customMaterialName.trim(), materialType: customMaterialType, unit: unit.trim() },
        });
        if (!created.success || !created.data?.id) throw new Error(created.message || 'Không tạo được vật tư.');
        if (controller.signal.aborted) return;
        materialId = created.data.id;
        setMaterials(prev => [created.data, ...prev]);
        setSelectedMaterialId(materialId);
        setUseExistingMaterial(true);
      }
      const res = await apiRequest<ApiResponse<MaterialUsage>>(editingUsage ? '/material-usages/' + editingUsage.materialUsageId : '/material-usages', {
        method: editingUsage ? 'PUT' : 'POST', signal: controller.signal,
        data: {
          ...(!editingUsage && { farmingActivityId }), materialId, usedAt: usedAtTime,
          quantity: Number(quantity), unit: unit.trim(), notes: notes.trim(),
          dosage: dosage.trim(), method: method.trim(),
          safetyIntervalDays: safetyDays === '' ? null : safetyDays,
        },
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Không lưu được sử dụng vật tư.');
      if (controller.signal.aborted) return;
      setNotification({ text: editingUsage ? 'Đã cập nhật sử dụng vật tư.' : 'Đã ghi nhận sử dụng vật tư.', type: 'success' });
      setIsCreateModalOpen(false);
      loadUsages(0);
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: error instanceof Error ? error.message : 'Không lưu được sử dụng vật tư.', type: 'error' });
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (deletingId !== null || !window.confirm('Xóa bản ghi sử dụng vật tư "' + name + '"?')) return;
    const controller = new AbortController();
    requests.current.delete = controller;
    setDeletingId(id);
    setNotification(null);
    try {
      const res = await apiRequest<ApiResponse<void>>('/material-usages/' + id, { method: 'DELETE', signal: controller.signal });
      if (!res.success) throw new Error(res.message || 'Không xóa được bản ghi.');
      if (controller.signal.aborted) return;
      setUsages(prev => prev.filter(item => item.materialUsageId !== id));
      setSelectedDetail(null);
      setNotification({ text: 'Đã xóa bản ghi sử dụng vật tư.', type: 'success' });
      await loadUsages();
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: error instanceof Error ? error.message : 'Không xóa được bản ghi.', type: 'error' });
    } finally {
      if (!controller.signal.aborted) setDeletingId(null);
    }
  };

  const organicCount = usages.filter(usage => isOrganicMaterial(usage.materialType)).length;
  const phiAlertCount = usages.filter(usage => (usage.safetyIntervalDays ?? 0) > 0).length;
  const hasAppliedFilters = Boolean(appliedFilters.keyword || appliedFilters.materialType !== 'ALL' || appliedFilters.fromDate || appliedFilters.toDate);
  const hasDraftFilters = Boolean(searchKeyword || filterType !== 'ALL' || fromDate || toDate);
  const busy = saving || detailLoading || deletingId !== null;
  const resetFilters = () => {
    setSearchKeyword(''); setFilterType('ALL'); setFromDate(''); setToDate('');
    applyFilters(EMPTY_FILTERS);
  };
  const openCreate = () => {
    setEditingUsage(null); setNotification(null); setUseExistingMaterial(true); setMaterialKeyword('');
    setSelectedMaterialId(''); setCustomMaterialName(''); setCustomMaterialType('Phân bón hữu cơ');
    setFarmingActivityId(''); setQuantity(10); setUnit('kg'); setDosage(''); setMethod(''); setSafetyDays(''); setNotes('');
    setUsedAtTime(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setIsCreateModalOpen(true);
  };
  const metrics = [
    { label: 'TỔNG LẦN SỬ DỤNG', value: totalElements, icon: 'history', tone: 'green', hint: 'Bản ghi theo bộ lọc đang áp dụng' },
    { label: 'VẬT TƯ HỮU CƠ / SINH HỌC', value: organicCount, icon: 'leaf', tone: 'blue', hint: 'Số bản ghi trong trang hiện tại' },
    { label: 'CẦN CÁCH LY (PHI > 0 NGÀY)', value: usages.some(usage => usage.safetyIntervalDays == null) ? null : phiAlertCount, icon: 'shield', tone: 'amber', hint: usages.some(usage => usage.safetyIntervalDays == null) ? 'Trang hiện tại có bản ghi chưa rõ PHI' : 'Số bản ghi trong trang hiện tại' },
  ];

  return (
    <section className="material-usage-page">
      <header className="mu-heading">
        <div><h1>Quản lý &amp; Lịch sử sử dụng vật tư nông nghiệp</h1>
          <p>Giám sát lượng phân bón, thuốc BVTV sinh học và thời gian cách ly an toàn (PHI) theo tiêu chuẩn VietGAP</p></div>
        <div className="mu-heading-actions">
          <button type="button" className="action-button" onClick={() => { void loadUsages(); void loadMaterials(); }} disabled={!farmId || loading || busy} aria-busy={loading}>
            <Icon name={loading ? 'loader' : 'refresh'} className={loading ? 'mu-spin' : undefined} />{loading ? 'Đang tải...' : 'Tải lại'}</button>
          <button type="button" className="primary-button" disabled={!farmId || busy} onClick={openCreate}>
            <Icon name={saving ? 'loader' : 'plus'} className={saving ? 'mu-spin' : undefined} />{saving ? 'Đang lưu...' : 'Ghi nhận sử dụng vật tư'}</button>
        </div>
      </header>
      {notification && <div role={notification.type === 'error' && !isCreateModalOpen ? 'alert' : 'status'} className={'mu-notice mu-notice-' + notification.type}>
        <Icon name={notification.type === 'error' ? 'warning' : 'check-circle'} /><span>{notification.text}</span></div>}
      {detailLoading && <p className="mu-loading-detail" role="status"><Icon name="loader" className="mu-spin" />Đang tải chi tiết sử dụng vật tư...</p>}
      <div className="mu-metrics" aria-label="Thống kê sử dụng vật tư" aria-busy={loading}>
        {metrics.map(metric => <article className={'panel mu-metric mu-metric-' + metric.tone} key={metric.label}>
          <div className="mu-metric-top"><span>{metric.label}</span><span className="mu-metric-icon"><Icon name={metric.icon} size={20} /></span></div>
          {loading ? <><span className="mu-skeleton mu-number-skeleton" aria-hidden="true" /><span className="mu-sr-only">Đang tải số liệu</span></> :
            <strong className="mu-metric-value">{loadError || !farmId || metric.value == null ? '—' : metric.value.toLocaleString('vi-VN')}</strong>}
          <p>{metric.hint}</p>
        </article>)}
      </div>
      <form className="panel mu-filters" onSubmit={event => { event.preventDefault(); filterUsages(); }} aria-label="Tìm kiếm và lọc vật tư">
        <div className="mu-filter-grid">
          <div className="mu-field mu-search-field"><label htmlFor="mu-search">Tìm kiếm từ khóa</label>
            <div className="mu-search-input"><Icon name="search" /><input id="mu-search" type="search" placeholder="Tên vật tư, ghi chú..." value={searchKeyword} onChange={event => setSearchKeyword(event.target.value)} /></div></div>
          <div className="mu-field"><label htmlFor="mu-type">Chủng loại vật tư</label><select id="mu-type" value={filterType} onChange={event => setFilterType(event.target.value)}>
            <option value="ALL">Tất cả loại vật tư</option>{['Phân bón hữu cơ', 'Phân bón hòa tan', 'Dinh dưỡng lỏng', 'Chế phẩm sinh học', 'Thuốc BVTV sinh học', 'Hạt giống'].map(type => <option key={type} value={type}>{type}</option>)}
          </select></div>
          <div className="mu-field"><label htmlFor="mu-from">Từ ngày</label><input id="mu-from" type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); setFilterError(null); }} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'mu-date-error' : undefined} /></div>
          <div className="mu-field"><label htmlFor="mu-to">Đến ngày</label><input id="mu-to" type="date" value={toDate} onChange={event => { setToDate(event.target.value); setFilterError(null); }} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'mu-date-error' : undefined} /></div>
          <div className="mu-filter-actions"><button type="submit" className="primary-button" disabled={!farmId || busy}><Icon name="search" />Lọc</button>
            {(hasDraftFilters || hasAppliedFilters) && <button type="button" className="action-button" disabled={busy} onClick={resetFilters}>Đặt lại</button>}</div>
        </div>
        {filterError && <p id="mu-date-error" className="mu-field-error" role="alert">{filterError}</p>}
        {hasAppliedFilters && <div className="mu-applied-filters" aria-label="Bộ lọc đang áp dụng"><span>Đang lọc:</span>
          {appliedFilters.keyword && <span className="mu-filter-chip">Từ khóa: {appliedFilters.keyword}</span>}
          {appliedFilters.materialType !== 'ALL' && <span className="mu-filter-chip">{appliedFilters.materialType}</span>}
          {appliedFilters.fromDate && <span className="mu-filter-chip">Từ: {appliedFilters.fromDate.split('-').reverse().join('/')}</span>}
          {appliedFilters.toDate && <span className="mu-filter-chip">Đến: {appliedFilters.toDate.split('-').reverse().join('/')}</span>}
        </div>}
      </form>
      <section className="panel mu-history" aria-labelledby="mu-history-title" aria-busy={loading}>
        <div className="mu-history-heading"><div><h2 id="mu-history-title">Lịch sử sử dụng</h2><p>Theo dõi các lần ghi nhận vật tư của trang trại</p></div>
          {!loading && !loadError && farmId && <span className="mu-result-count">{totalElements.toLocaleString('vi-VN')} kết quả</span>}</div>
        {loading ? <div className="mu-table-loading" role="status"><span className="mu-sr-only">Đang tải nhật ký sử dụng vật tư...</span>{[0, 1, 2, 3].map(row => <div key={row} className="mu-skeleton mu-row-skeleton" aria-hidden="true" />)}</div> :
          loadError ? <div className="mu-empty" role="alert"><span className="mu-empty-icon"><Icon name="warning" size={28} /></span><h3>Chưa tải được lịch sử sử dụng</h3><p>{loadError}</p><button type="button" className="action-button" onClick={() => void loadUsages()}><Icon name="refresh" />Thử lại</button></div> :
          !farmId ? <div className="mu-empty"><Icon name="plots" size={28} /><h3>Hãy chọn trang trại trước</h3><p>Chọn không gian trang trại để xem lịch sử và ghi nhận vật tư.</p></div> :
          usages.length === 0 ? <div className="mu-empty"><span className="mu-empty-icon"><Icon name={hasAppliedFilters ? 'search' : 'box'} size={28} /></span>
            <h3>{hasAppliedFilters ? 'Không tìm thấy bản ghi phù hợp' : 'Chưa có bản ghi sử dụng vật tư'}</h3>
            <p>{hasAppliedFilters ? 'Thử thay đổi từ khóa hoặc xóa bộ lọc để xem lại danh sách.' : 'Ghi nhận lần sử dụng đầu tiên để theo dõi vật tư và thời gian cách ly.'}</p>
            {hasAppliedFilters ? <button type="button" className="action-button" onClick={resetFilters}>Xóa bộ lọc</button> : <button type="button" className="primary-button" disabled={busy} onClick={openCreate}><Icon name="plus" />Ghi nhận sử dụng vật tư</button>}
          </div> : <MaterialUsageHistory usages={usages} busy={busy} deletingId={deletingId} onOpen={openUsage} onDelete={handleDelete} />}
        {farmId && !loadError && <div className="mu-pagination"><span>{loading ? 'Đang tải...' : totalElements === 0 ? '0 bản ghi' : (page * PAGE_SIZE + 1) + '–' + (page * PAGE_SIZE + usages.length) + ' trên ' + totalElements + ' bản ghi'}</span>
          <Pagination page={page + 1} totalPages={totalPages} disabled={loading || busy} onChange={number => { void loadUsages(number - 1); }} /></div>}
      </section>

      <Modal open={isCreateModalOpen} onClose={() => { if (!saving) setIsCreateModalOpen(false); }}
        className="mu-entry-dialog" headerIcon={<span className="mu-entry-title-icon"><Icon name="sprout" size={23} /></span>}
        title={editingUsage ? 'Chỉnh sửa sử dụng vật tư' : 'Ghi nhận sử dụng vật tư'}>
        <form onSubmit={handleSaveUsage} className="mu-entry-form">
          {notification?.type === 'error' && <p role="alert" className="form-error-banner mu-entry-error">{notification.text}</p>}
          <fieldset disabled={saving} className="mu-form-fieldset">
            <MaterialUsageFormSection number={1} title="Thông tin chung" description="Mùa vụ, hoạt động và vật tư sử dụng">
              <div className="mu-entry-grid">
                {editingUsage ? <>
                  <div className="mu-field"><label htmlFor="usage-season-readonly">Mùa vụ liên kết</label><input id="usage-season-readonly" readOnly value={editingUsage.cropSeasonId ? 'Mùa vụ #' + editingUsage.cropSeasonId : 'Theo hoạt động liên kết'} /></div>
                  <div className="mu-field"><label htmlFor="usage-activity">Hoạt động canh tác</label><input id="usage-activity" readOnly value={editingUsage.activityName || 'Hoạt động #' + editingUsage.farmingActivityId} /><p className="mu-entry-help">Giữ nguyên hoạt động liên kết khi chỉnh sửa.</p></div>
                </> : farmId ? <FarmingActivityPicker farmId={farmId} value={farmingActivityId} onChange={setFarmingActivityId} disabled={saving} /> : null}
              </div>
              <div className="mu-material-toggle" aria-label="Nguồn vật tư">
                <button type="button" aria-pressed={useExistingMaterial} onClick={() => setUseExistingMaterial(true)}><Icon name="box" size={16} />Chọn từ kho vật tư trang trại</button>
                <button type="button" disabled={Boolean(editingUsage)} aria-pressed={!useExistingMaterial} onClick={() => setUseExistingMaterial(false)}><Icon name="plus" size={16} />Nhập vật tư mới</button>
              </div>
              {useExistingMaterial ? <>
                {materialsError && <div role="alert" className="mu-entry-help"><p>{materialsError}</p><button type="button" className="action-button" onClick={loadMaterials}>Tải lại danh mục vật tư</button></div>}
                <div className="mu-entry-grid">
                  <div className="mu-field"><label htmlFor="usage-material-search">Tìm vật tư</label><div className="mu-search-input"><Icon name="search" /><input id="usage-material-search" type="search" placeholder="Tìm theo tên hoặc phân loại..." value={materialKeyword} onChange={event => setMaterialKeyword(event.target.value)} /></div></div>
                  <div className="mu-field"><label htmlFor="usage-material">Tên vật tư / phân bón / thuốc BVTV <span className="mu-required">*</span></label>
                    <select id="usage-material" aria-label="Vật tư" required value={selectedMaterialId} onChange={event => handleSelectMaterial(Number(event.target.value))}>
                      <option value="">Chọn vật tư</option>
                      {selectedMaterialId && !materials.some(material => material.id === selectedMaterialId && (material.materialName + ' ' + (material.materialType ?? '')).toLocaleLowerCase('vi-VN').includes(materialKeyword.trim().toLocaleLowerCase('vi-VN'))) && <option value={selectedMaterialId}>{materials.find(material => material.id === selectedMaterialId)?.materialName || editingUsage?.materialName || 'Vật tư đang chọn'}</option>}
                      {materials.filter(material => (material.materialName + ' ' + (material.materialType ?? '')).toLocaleLowerCase('vi-VN').includes(materialKeyword.trim().toLocaleLowerCase('vi-VN'))).map(material => <option key={material.id} value={material.id}>{material.materialName} ({material.unit})</option>)}
                    </select>
                    {materialKeyword.trim() && !materials.some(material => (material.materialName + ' ' + (material.materialType ?? '')).toLocaleLowerCase('vi-VN').includes(materialKeyword.trim().toLocaleLowerCase('vi-VN'))) && <p role="status" className="mu-entry-help">Không tìm thấy vật tư phù hợp. Thử từ khóa khác.</p>}
                  </div>
                </div>
              </> : <div className="mu-field"><label htmlFor="usage-material-name">Tên vật tư / phân bón / thuốc BVTV <span className="mu-required">*</span></label><input id="usage-material-name" required maxLength={160} placeholder="Ví dụ: Phân trùn quế Vermicompost" value={customMaterialName} onChange={event => setCustomMaterialName(event.target.value)} /></div>}
            </MaterialUsageFormSection>

            <MaterialUsageFormSection number={2} title="Thông tin vật tư" description="Phân loại và đơn vị quản lý">
              <div className="mu-material-info-grid">
                <div className="mu-field"><label htmlFor="usage-material-group">Nhóm vật tư <span className="mu-required">*</span></label>
                  <div className="mu-icon-field"><Icon name="leaf" /><select id="usage-material-group" value={materialGroupName(customMaterialType)} disabled={useExistingMaterial} onChange={event => setCustomMaterialType(MATERIAL_GROUPS.find(group => group.name === event.target.value)?.types[0] ?? '')}>
                    {materialGroupName(customMaterialType) === 'Khác' && <option value="Khác">Khác</option>}{MATERIAL_GROUPS.map(group => <option key={group.name} value={group.name}>{group.name}</option>)}
                  </select></div><p className="mu-entry-help">Nhóm theo phân loại vật tư</p>
                </div>
                <div className="mu-field"><label htmlFor="usage-material-type">Phân loại vật tư <span className="mu-required">*</span></label>
                  <div className="mu-icon-field"><Icon name="sprout" /><select id="usage-material-type" disabled={useExistingMaterial} value={customMaterialType} onChange={event => setCustomMaterialType(event.target.value)}>
                    {!MATERIAL_TYPES.includes(customMaterialType) && <option value={customMaterialType}>{customMaterialType || 'Chưa phân loại'}</option>}
                    {MATERIAL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select></div><p className="mu-entry-help">Chọn loại vật tư</p>
                </div>
                <div className="mu-field"><label htmlFor="usage-material-form">Dạng vật tư</label>
                  <div className="mu-icon-field"><Icon name="granules" /><select id="usage-material-form" disabled aria-describedby="usage-material-form-help"><option>Chưa có dữ liệu</option></select></div>
                  <p id="usage-material-form-help" className="mu-entry-help">Chưa hỗ trợ lưu dạng vật tư</p>
                </div>
                <div className="mu-field"><label htmlFor="usage-unit">Đơn vị quản lý <span className="mu-required">*</span></label>
                  <div className="mu-icon-field"><Icon name="weight" /><select id="usage-unit" aria-label="Đơn vị" disabled={useExistingMaterial} value={unit} onChange={event => setUnit(event.target.value)}>
                    {getMaterialUnitOptions(unit).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select></div><p className="mu-entry-help">Đơn vị quản lý kho và tính số lượng</p>
                </div>
              </div>
              {useExistingMaterial && <p className="mu-entry-help">Phân loại và đơn vị được lấy theo vật tư đã chọn trong kho.</p>}
            </MaterialUsageFormSection>

            <MaterialUsageFormSection number={3} title="Thông tin sử dụng" description="Số lượng, liều lượng và phương pháp áp dụng">
              <div className="mu-entry-grid">
                <div className="mu-field"><label htmlFor="usage-quantity">Số lượng sử dụng <span className="mu-required">*</span></label>
                  <div className="mu-compound-input"><span className="mu-input-icon"><Icon name="weight" /></span><input id="usage-quantity" type="number" aria-label="Số lượng" step="any" min="0.0001" required value={quantity} onChange={event => setQuantity(event.target.value ? Number(event.target.value) : '')} />
                    <select aria-label="Đơn vị sử dụng" value={unit} disabled={useExistingMaterial} onChange={event => setUnit(event.target.value)}>{getMaterialUnitOptions(unit).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  </div><p className="mu-entry-help">Số lượng vật tư thực tế đã sử dụng</p>
                </div>
                <div className="mu-field"><label htmlFor="usage-dosage">Liều lượng / nồng độ <Icon name="help" size={15} aria-label="Nhập theo khuyến cáo trên nhãn sản phẩm" /></label>
                  <DosageInput value={dosage} onChange={setDosage} /><p className="mu-entry-help">Nhập theo khuyến cáo trên nhãn sản phẩm (nếu có)</p>
                </div>
              </div>
              <div className="mu-usage-bottom-grid">
                <div className="mu-field"><label htmlFor="usage-method">Phương pháp sử dụng</label><MethodInput value={method} onChange={setMethod} /><p className="mu-entry-help">Chọn phương pháp sử dụng vật tư</p></div>
                <div className="mu-field"><label htmlFor="usage-applied-area">Diện tích áp dụng</label>
                  <div className="mu-compound-input"><span className="mu-input-icon"><Icon name="plots" /></span><input id="usage-applied-area" type="number" disabled placeholder="Chưa hỗ trợ" aria-describedby="usage-area-help" /><select disabled aria-label="Đơn vị diện tích"><option>m²</option></select></div>
                  <p id="usage-area-help" className="mu-entry-help">Chưa hỗ trợ lưu diện tích áp dụng</p>
                </div>
                <div className="mu-field"><label htmlFor="usage-plant-count">Số cây áp dụng</label>
                  <div className="mu-compound-input"><span className="mu-input-icon"><Icon name="sprout" /></span><input id="usage-plant-count" type="number" disabled placeholder="Chưa hỗ trợ" aria-describedby="usage-plant-help" /><select disabled aria-label="Đơn vị số cây"><option>cây</option></select></div>
                  <p id="usage-plant-help" className="mu-entry-help">Chưa hỗ trợ lưu số cây áp dụng</p>
                </div>
              </div>
            </MaterialUsageFormSection>

            <MaterialUsageFormSection number={4} title="Thông tin khác" description="Thời điểm ghi nhận và thời gian cách ly an toàn">
              <div className="mu-entry-grid">
                <div className="mu-field"><label htmlFor="usage-time">Thời điểm sử dụng <span className="mu-required">*</span></label><input id="usage-time" aria-label="Thời điểm sử dụng" type="datetime-local" step="any" required value={usedAtTime} onChange={event => setUsedAtTime(event.target.value)} /></div>
                <div className="mu-field"><label htmlFor="usage-phi">Thời gian cách ly (PHI)</label><div className="mu-input-with-unit"><input id="usage-phi" type="number" aria-label="Số ngày cách ly" min="0" max="2147483647" step="1" placeholder="Ví dụ: 7" value={safetyDays} onChange={event => setSafetyDays(event.target.value === '' ? '' : Number(event.target.value))} /><span>ngày</span></div>
                  <p className="mu-entry-help">{editingUsage ? 'Để trống để giữ số ngày đã lưu; nhập 0 nếu không cần cách ly.' : 'Nhập số ngày nguyên; nhập 0 nếu không cần cách ly.'}</p>
                </div>
              </div>
            </MaterialUsageFormSection>

            <MaterialUsageFormSection number={5} title="Ghi chú" description="Thông tin bổ sung về lần sử dụng vật tư">
              <div className="mu-field"><label htmlFor="usage-notes">Ghi chú chứng nhận / Nguồn gốc vật tư</label><textarea id="usage-notes" aria-label="Ghi chú" maxLength={1000} rows={3} placeholder="Nhập ghi chú về lần sử dụng, nguồn gốc hoặc chứng nhận vật tư..." value={notes} onChange={event => setNotes(event.target.value)} /><span className="mu-entry-character-count">{notes.length}/1000 ký tự</span></div>
            </MaterialUsageFormSection>
          </fieldset>
          <div className="mu-entry-footer"><span><span className="mu-required">*</span> Thông tin bắt buộc</span><div>
            <button type="button" className="action-button" disabled={saving} onClick={() => setIsCreateModalOpen(false)}>Hủy</button>
            <button type="submit" className="primary-button" disabled={saving}><Icon name={saving ? 'loader' : 'save'} className={saving ? 'mu-spin' : undefined} />{saving ? 'Đang lưu...' : editingUsage ? 'Lưu thay đổi' : 'Lưu ghi nhận'}</button>
          </div></div>
        </form>
      </Modal>

      {/* Modal 2: Xem chi tiết lịch sử sử dụng vật tư (View Material Usage History) */}
      {selectedDetail && (
        <Modal open onClose={() => { if (deletingId === null) setSelectedDetail(null); }} title={'Chi tiết sử dụng vật tư #' + selectedDetail.materialUsageId}>
          <h3>{selectedDetail.materialName}</h3>
            <div className="mu-form-grid">
              <div>
                <span className="mu-detail-label">Chủng loại</span>
                <strong>{selectedDetail.materialType || 'Vật tư đầu vào'}</strong>
              </div>
              <div>
                <span className="mu-detail-label">Khối lượng / Thể tích</span>
                <strong>{selectedDetail.quantity} {selectedDetail.unit}</strong>
              </div>
              <div>
                <span className="mu-detail-label">Liều lượng áp dụng</span>
                <strong>{selectedDetail.dosage || 'Chưa có dữ liệu'}</strong>
              </div>
              <div>
                <span className="mu-detail-label">Cách thức xử lý</span>
                <strong>{selectedDetail.method || 'Chưa có dữ liệu'}</strong>
              </div>
              <div>
                <span className="mu-detail-label">Thời gian cách ly an toàn</span>
                <div>
                  {selectedDetail.safetyIntervalDays == null ? 'Chưa có dữ liệu' : selectedDetail.safetyIntervalDays > 0 ? (
                    <span className="mu-badge mu-badge-amber">
                      ⏳ Cách ly {selectedDetail.safetyIntervalDays} ngày
                    </span>
                  ) : (
                    <span className="mu-badge mu-badge-green">
                      ✓ An toàn sinh học (0 ngày)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="mu-detail-label">Thời điểm ghi chép</span>
                <strong>
                  {new Date(selectedDetail.usedAt).toLocaleString('vi-VN')}
                </strong>
              </div>
              <div className="mu-form-wide">
                <span className="mu-detail-label">Hoạt động canh tác liên kết</span>
                <strong>
                  {selectedDetail.activityName || `Hoạt động #${selectedDetail.farmingActivityId ?? 'Chưa liên kết'}`}
                </strong>
              </div>
              <div className="mu-form-wide mu-detail-note">
                <span className="mu-detail-label">
                  Ghi chú truy xuất & Tuân thủ VietGAP
                </span>
                <p>
                  {selectedDetail.notes || 'Không có ghi chú thêm.'}
                </p>
              </div>
            </div>

            <div className="mu-modal-actions">
              <button
                type="button"
                className="action-button"
                disabled={deletingId !== null} onClick={() => handleDelete(selectedDetail.materialUsageId, selectedDetail.materialName)}
              >
                <Icon name="trash" /> Xóa bản ghi
              </button>
              <button type="button" className="action-button solid primary-button" onClick={() => setSelectedDetail(null)}>
                Đóng
              </button>
            </div>
        </Modal>
      )}
    </section>
  );
}
