import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Modal } from '../../shared/components/Modal';
import { Icon } from '../../shared/components/Icon';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

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
    void loadUsages();
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

  const loadUsages = async (reset = false) => {
    if (!farmId) return;
    requests.current.list?.abort();
    const controller = new AbortController();
    requests.current.list = controller;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ farmId: String(farmId), size: '50' });
      if (!reset) {
        if (searchKeyword.trim()) params.set('keyword', searchKeyword.trim());
        if (filterType !== 'ALL') params.set('materialType', filterType);
        if (fromDate) params.set('fromDate', fromDate + 'T00:00:00');
        if (toDate) params.set('toDate', toDate + 'T23:59:59');
      }
      const res = await apiRequest<ApiResponse<{ items: MaterialUsage[] }>>('/material-usages?' + params, { signal: controller.signal });
      if (!res.success || !Array.isArray(res.data?.items)) throw new Error(res.message || 'Không tải được lịch sử sử dụng vật tư.');
      if (!controller.signal.aborted) setUsages(res.data.items);
    } catch (error) {
      if (!controller.signal.aborted) {
        setUsages([]);
        setLoadError(error instanceof Error ? error.message : 'Không tải được lịch sử sử dụng vật tư.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

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
      setNotification({ text: 'Nhập ID hoạt động hợp lệ, thời gian, đơn vị và số lượng lớn hơn 0.', type: 'error' });
      return;
    }
    if (useExistingMaterial && !selectedMaterialId) {
      setNotification({ text: 'Vui lòng chọn vật tư.', type: 'error' });
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
        data: { ...(!editingUsage && { farmingActivityId }), materialId, usedAt: usedAtTime, quantity: Number(quantity), unit: unit.trim(), notes: notes.trim() },
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Không lưu được sử dụng vật tư.');
      if (controller.signal.aborted) return;
      setNotification({ text: editingUsage ? 'Đã cập nhật sử dụng vật tư.' : 'Đã ghi nhận sử dụng vật tư.', type: 'success' });
      setIsCreateModalOpen(false);
      loadUsages();
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
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: error instanceof Error ? error.message : 'Không xóa được bản ghi.', type: 'error' });
    } finally {
      if (!controller.signal.aborted) setDeletingId(null);
    }
  };

  // Metrics
  const totalCount = usages.length;
  const organicCount = usages.filter((u) => u.materialType?.toLowerCase().includes('hữu cơ') || u.materialType?.toLowerCase().includes('sinh học')).length;
  const phiAlertCount = usages.filter((u) => u.safetyIntervalDays && u.safetyIntervalDays > 0).length;

  return (
    <section className="material-usage-page">
      {/* Page Header */}
      <div className="page-heading">
        <div>
          <h1>Quản lý & Lịch sử sử dụng vật tư nông nghiệp</h1>
          <p className="page-subtitle">
            Giám sát liều lượng phân bón, thuốc BVTV sinh học và tuân thủ thời gian cách ly an toàn (PHI) theo tiêu chuẩn VietGAP
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="action-button" onClick={() => { loadUsages(); loadMaterials(); }} disabled={!farmId || loading || saving || detailLoading} title="Làm mới dữ liệu">
            <Icon name="search" /> Tải lại
          </button>
          <button type="button" className="primary-button" disabled={!farmId || saving || detailLoading || deletingId !== null} onClick={() => {
            setEditingUsage(null); setNotification(null); setUseExistingMaterial(true);
            setSelectedMaterialId(''); setCustomMaterialName(''); setCustomMaterialType('Phân bón hữu cơ');
            setFarmingActivityId(''); setQuantity(10); setUnit('kg'); setDosage(''); setMethod(''); setSafetyDays(''); setNotes('');
            setUsedAtTime(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
            setIsCreateModalOpen(true);
          }}>
            <Icon name="plus" /> Ghi nhận sử dụng vật tư
          </button>
        </div>
      </div>

      {notification && (
        <div
          role={notification.type === 'error' && !isCreateModalOpen ? 'alert' : 'status'}
          className={`notification-popover ${notification.type === 'error' ? 'form-error-banner' : ''}`}
          style={{
            position: 'static',
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
          }}
        >
          <strong>{notification.type === 'success' ? '✓ Thành công:' : '⚠️ Thông báo:'}</strong> {notification.text}
        </div>
      )}

      {detailLoading && <p role="status">Đang tải chi tiết sử dụng vật tư...</p>}

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG LẦN SỬ DỤNG</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>{loading || loadError || !farmId ? '—' : totalCount}</div>
          <span style={{ fontSize: '12px', color: '#059669' }}>Bản ghi được lưu trữ</span>
        </div>

        <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid #06b6d4' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>VẬT TƯ HỮU CƠ / SINH HỌC</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0891b2', marginTop: '6px' }}>{loading || loadError || !farmId ? '—' : organicCount}</div>
          <span style={{ fontSize: '12px', color: '#0891b2' }}>An toàn sinh học VietGAP</span>
        </div>

        <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>CẦN CÁCH LY (PHI &gt; 0 NGÀY)</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706', marginTop: '6px' }}>{loading || loadError || !farmId || usages.some(usage => usage.safetyIntervalDays == null) ? '—' : phiAlertCount}</div>
          <span style={{ fontSize: '12px', color: '#b45309' }}>Theo dõi trước thu hoạch</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Tìm kiếm từ khóa
            </label>
            <input
              type="text"
              placeholder="Tên vật tư, ghi chú..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsages()}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            />
          </div>

          <div style={{ flex: '0 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Chủng loại vật tư
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            >
              <option value="ALL">Tất cả loại vật tư</option>
              <option value="Phân bón hữu cơ">Phân bón hữu cơ</option>
              <option value="Phân bón hòa tan">Phân bón hòa tan</option>
              <option value="Dinh dưỡng lỏng">Dinh dưỡng lỏng</option>
              <option value="Chế phẩm sinh học">Chế phẩm sinh học</option>
              <option value="Thuốc BVTV sinh học">Thuốc BVTV sinh học</option>
              <option value="Hạt giống">Hạt giống</option>
            </select>
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }}>
            <button type="button" className="action-button solid primary-button" onClick={() => loadUsages()} style={{ height: '38px', padding: '0 16px' }}>
              <Icon name="search" /> Lọc
            </button>
            {(searchKeyword || filterType !== 'ALL' || fromDate || toDate) && (
              <button
                type="button"
                className="action-button"
                onClick={() => {
                  setSearchKeyword('');
                  setFilterType('ALL');
                  setFromDate('');
                  setToDate('');
                  loadUsages(true);
                }}
                style={{ height: '38px' }}
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải nhật ký sử dụng vật tư...</h2>
        </div>
      ) : loadError ? (
        <div className="panel" role="alert"><p>{loadError}</p><button type="button" className="action-button" onClick={() => loadUsages()}>Thử lại</button></div>
      ) : !farmId ? (
        <div className="panel empty-state">Hãy chọn trang trại trước.</div>
      ) : usages.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-icon">📦</div>
          <h2>Không tìm thấy bản ghi sử dụng vật tư nào</h2>
          <p>Nhấn vào "Ghi nhận sử dụng vật tư" để thêm bản ghi phân bón hoặc chế phẩm sinh học mới.</p>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflowX: 'auto', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 18px' }}>Mã & Tên vật tư</th>
                <th style={{ padding: '14px 18px' }}>Số lượng</th>
                <th style={{ padding: '14px 18px' }}>Nồng độ / Liều lượng</th>
                <th style={{ padding: '14px 18px' }}>Cách thức bón/phun</th>
                <th style={{ padding: '14px 18px' }}>Thời gian cách ly (PHI)</th>
                <th style={{ padding: '14px 18px' }}>Thời điểm & Người ghi</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {usages.map((u) => (
                <tr key={u.materialUsageId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        #{u.materialUsageId}
                      </span>
                      <strong style={{ color: '#0f172a' }}>{u.materialName}</strong>
                    </div>
                    <span className="profile-tag-pill" style={{ fontSize: '11.5px', marginTop: '4px', display: 'inline-block' }}>
                      {u.materialType || 'Vật tư đầu vào'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: '#059669', fontSize: '14.5px' }}>
                    {u.quantity} {u.unit}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334155' }}>
                    {u.dosage || 'Chưa có dữ liệu'}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>
                    {u.method || 'Chưa có dữ liệu'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {u.safetyIntervalDays == null ? 'Chưa có dữ liệu' : u.safetyIntervalDays > 0 ? (
                      <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ⏳ {u.safetyIntervalDays} ngày PHI
                      </span>
                    ) : (
                      <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                        ✓ An toàn (0 ngày)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '12.5px' }}>
                    <div>{new Date(u.usedAt).toLocaleDateString('vi-VN')} {new Date(u.usedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>Ghi bởi: {u.recorderFullName || 'Thành viên nông trại'}</div>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="action-button"
                        disabled={detailLoading || saving || deletingId !== null} onClick={() => openUsage(u.materialUsageId)}
                        title="Xem chi tiết lịch sử"
                        style={{ padding: '6px 10px', fontSize: '12.5px' }}
                      >
                        <Icon name="search" /> Chi tiết
                      </button>
                      <button type="button" className="action-button" disabled={detailLoading || saving || deletingId !== null} onClick={() => openUsage(u.materialUsageId, true)}>Chỉnh sửa</button>
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => handleDelete(u.materialUsageId, u.materialName)}
                        disabled={detailLoading || saving || deletingId !== null}
                        title="Xóa bản ghi"
                        style={{ padding: '6px 10px', fontSize: '12.5px', color: '#dc2626' }}
                      >
                        <Icon name="trash" /> {deletingId === u.materialUsageId ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal 1: Ghi nhận sử dụng vật tư (Manage Material Usage) */}
      <Modal open={isCreateModalOpen} onClose={() => { if (!saving) setIsCreateModalOpen(false); }} title={editingUsage ? 'Chỉnh sửa sử dụng vật tư' : 'Ghi nhận sử dụng vật tư'}>
            <form onSubmit={handleSaveUsage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {notification?.type === 'error' && <p role="alert" className="form-error-banner">{notification.text}</p>}
              {materialsError && <div role="alert"><p>{materialsError}</p><button type="button" onClick={loadMaterials}>Tải lại danh mục vật tư</button></div>}
              <label htmlFor="usage-activity">ID hoạt động canh tác *</label>
              <input id="usage-activity" type="number" min="1" max="2147483647" step="1" required disabled={saving} readOnly={Boolean(editingUsage)} value={farmingActivityId} onChange={event => setFarmingActivityId(event.target.value ? Number(event.target.value) : '')} />
              {!editingUsage && <p className="page-subtitle">Nhập ID hoạt động thật thuộc trang trại đang chọn.</p>}
              <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
              {/* Toggle Chọn vật tư hay tạo mới */}
              <div style={{ display: 'flex', gap: '8px', padding: '4px', background: '#f1f5f9', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setUseExistingMaterial(true)}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    background: useExistingMaterial ? '#fff' : 'transparent',
                    color: useExistingMaterial ? '#0f172a' : '#64748b',
                    boxShadow: useExistingMaterial ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  Chọn từ kho vật tư trang trại
                </button>
                <button
                  type="button"
                  disabled={Boolean(editingUsage)} onClick={() => setUseExistingMaterial(false)}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    background: !useExistingMaterial ? '#fff' : 'transparent',
                    color: !useExistingMaterial ? '#0f172a' : '#64748b',
                    boxShadow: !useExistingMaterial ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Nhập vật tư mới
                </button>
              </div>

              {useExistingMaterial ? (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Chọn vật tư *
                  </label>
                  <select
                    aria-label="Vật tư" value={selectedMaterialId}
                    onChange={(e) => handleSelectMaterial(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">Chọn vật tư</option>
                    {editingUsage && !materials.some(material => material.id === editingUsage.materialId) && <option value={editingUsage.materialId}>{editingUsage.materialName}</option>}
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.materialName} ({m.materialType || 'Vật tư'} - {m.unit})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Tên vật tư / phân bón / thuốc BVTV mới *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Phân trùn quế Vermicompost"
                    value={customMaterialName}
                    onChange={(e) => setCustomMaterialName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Phân loại vật tư
                  </label>
                  <select
                    disabled={useExistingMaterial} value={customMaterialType}
                    onChange={(e) => setCustomMaterialType(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    {!['Phân bón hữu cơ', 'Phân bón hòa tan', 'Dinh dưỡng lỏng', 'Chế phẩm sinh học', 'Thuốc BVTV sinh học', 'Chất cải tạo đất', 'Hạt giống'].includes(customMaterialType) && <option value={customMaterialType}>{customMaterialType || 'Chưa phân loại'}</option>}
                    <option value="Phân bón hữu cơ">Phân bón hữu cơ</option>
                    <option value="Phân bón hòa tan">Phân bón hòa tan</option>
                    <option value="Dinh dưỡng lỏng">Dinh dưỡng lỏng</option>
                    <option value="Chế phẩm sinh học">Chế phẩm sinh học</option>
                    <option value="Thuốc BVTV sinh học">Thuốc BVTV sinh học</option>
                    <option value="Chất cải tạo đất">Chất cải tạo đất</option>
                    <option value="Hạt giống">Hạt giống</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Số lượng & Đơn vị *
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      aria-label="Số lượng" step="any"
                      min="0.0001"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                      style={{ flex: 2, minWidth: 0, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                    <select aria-label="Đơn vị" disabled={useExistingMaterial} value={unit} onChange={(e) => setUnit(e.target.value)} style={{ flex: 1, padding: '9px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      {!['kg', 'lít', 'chai', 'gói', 'tấn'].includes(unit) && <option value={unit}>{unit}</option>}
                      <option value="kg">kg</option>
                      <option value="lít">lít</option>
                      <option value="chai">chai</option>
                      <option value="gói">gói</option>
                      <option value="tấn">tấn</option>
                    </select>
                  </div>
                </div>
              </div>

              <p className="page-subtitle">Liều lượng, phương thức và thời gian cách ly chưa hỗ trợ lưu.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Liều lượng / nồng độ
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 50g / gốc"
                    disabled aria-label="Liều lượng" value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Thời gian cách ly (PHI)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Chưa hỗ trợ lưu"
                    disabled aria-label="Số ngày cách ly" value={safetyDays}
                    onChange={(e) => setSafetyDays(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Phương pháp sử dụng
                  </label>
                  <input
                    type="text"
                    placeholder="Bón lót / Bón thúc / Phun sương..."
                    disabled aria-label="Phương thức" value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Thời điểm sử dụng *
                  </label>
                  <input
                    aria-label="Thời điểm sử dụng" type="datetime-local" step="any"
                    required
                    value={usedAtTime}
                    onChange={(e) => setUsedAtTime(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Ghi chú chứng nhận / Nguồn gốc vật tư
                </label>
                <textarea
                  aria-label="Ghi chú" maxLength={1000} rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              </fieldset>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="action-button" disabled={saving} onClick={() => setIsCreateModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary-button" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="save" /> {saving ? 'Đang lưu...' : editingUsage ? 'Lưu thay đổi' : 'Lưu ghi nhận'}
                </button>
              </div>
            </form>
      </Modal>

      {/* Modal 2: Xem chi tiết lịch sử sử dụng vật tư (View Material Usage History) */}
      {selectedDetail && (
        <Modal open onClose={() => { if (deletingId === null) setSelectedDetail(null); }} title={'Chi tiết sử dụng vật tư #' + selectedDetail.materialUsageId}>
          <h3>{selectedDetail.materialName}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '20px 0' }}>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Chủng loại</span>
                <strong style={{ color: '#0f172a' }}>{selectedDetail.materialType || 'Vật tư đầu vào'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Khối lượng / Thể tích</span>
                <strong style={{ color: '#059669', fontSize: '16px' }}>{selectedDetail.quantity} {selectedDetail.unit}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Liều lượng áp dụng</span>
                <strong style={{ color: '#0f172a' }}>{selectedDetail.dosage || 'Chưa có dữ liệu'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Cách thức xử lý</span>
                <strong style={{ color: '#0f172a' }}>{selectedDetail.method || 'Chưa có dữ liệu'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Thời gian cách ly an toàn</span>
                <div>
                  {selectedDetail.safetyIntervalDays == null ? 'Chưa có dữ liệu' : selectedDetail.safetyIntervalDays > 0 ? (
                    <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '12px' }}>
                      ⏳ Cách ly {selectedDetail.safetyIntervalDays} ngày
                    </span>
                  ) : (
                    <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                      ✓ An toàn sinh học (0 ngày)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Thời điểm ghi chép</span>
                <strong style={{ color: '#0f172a' }}>
                  {new Date(selectedDetail.usedAt).toLocaleString('vi-VN')}
                </strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Hoạt động canh tác liên kết</span>
                <strong style={{ color: '#2563eb' }}>
                  {selectedDetail.activityName || `Hoạt động #${selectedDetail.farmingActivityId ?? 'Chưa liên kết'}`}
                </strong>
              </div>
              <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  Ghi chú truy xuất & Tuân thủ VietGAP
                </span>
                <p style={{ margin: 0, color: '#334155', fontSize: '13.5px', lineHeight: 1.5 }}>
                  {selectedDetail.notes || 'Không có ghi chú thêm.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="action-button"
                disabled={deletingId !== null} onClick={() => handleDelete(selectedDetail.materialUsageId, selectedDetail.materialName)}
                style={{ color: '#dc2626' }}
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
