import { useEffect, useState, type FormEvent } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

export interface MaterialUsage {
  id: number;
  farmingActivityId?: number;
  activityName?: string;
  cropSeasonId?: number;
  materialId: number;
  materialCode?: string;
  materialName: string;
  materialType?: string;
  inputPurchaseDetailId?: number;
  recordedByMemberId?: number;
  recorderName?: string;
  usedAt: string;
  quantity: number;
  unit: string;
  dosage?: string;
  method?: string;
  safetyIntervalDays?: number;
  notes?: string;
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
  const farmId = selectedFarm?.id || 1;

  const [usages, setUsages] = useState<MaterialUsage[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
  const [dosage, setDosage] = useState('50g / gốc');
  const [method, setMethod] = useState('Bón quanh gốc và tưới ẩm');
  const [safetyDays, setSafetyDays] = useState<number>(0);
  const [usedAtTime, setUsedAtTime] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('Đạt tiêu chuẩn vật tư danh mục VietGAP cho phép');
  const [farmingActivityId, setFarmingActivityId] = useState<number>(1);

  useEffect(() => {
    void loadUsages(false);
    void loadMaterials();
  }, [farmId]);

  useRealtimeSync(() => {
    void loadUsages(true);
    void loadMaterials();
  });

  const loadMaterials = async () => {
    try {
      const res = await apiRequest<ApiResponse<MaterialOption[]>>(`/material-usages/materials?farmId=${farmId}`).catch(() => null);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setMaterials(res.data);
        if (!selectedMaterialId && res.data.length > 0) {
          setSelectedMaterialId(res.data[0].id);
          setUnit(res.data[0].unit || 'kg');
          if (res.data[0].materialType) {
            setCustomMaterialType(res.data[0].materialType);
          }
        }
      } else {
        // Fallback default materials list
        const defaultMats: MaterialOption[] = [
          { id: 1, farmId, materialName: 'Phân NPK 20-20-20 Haifa', materialType: 'Phân bón hòa tan', unit: 'kg' },
          { id: 2, farmId, materialName: 'Dung Dịch Thủy Canh A+B GreenHydro', materialType: 'Dinh dưỡng lỏng', unit: 'lít' },
          { id: 3, farmId, materialName: 'Chế Phẩm Sinh Học Trừ Sâu Neem Chito', materialType: 'Thuốc BVTV sinh học', unit: 'chai' },
          { id: 4, farmId, materialName: 'Phân trùn quế nguyên chất Vermicompost', materialType: 'Phân bón hữu cơ', unit: 'kg' },
          { id: 5, farmId, materialName: 'Chế phẩm Trichoderma Bacillus', materialType: 'Chế phẩm sinh học', unit: 'lít' },
        ];
        setMaterials(defaultMats);
        if (!selectedMaterialId) {
          setSelectedMaterialId(defaultMats[0].id);
          setUnit(defaultMats[0].unit);
        }
      }
    } catch {
      // ignore
    }
  };

  const loadUsages = async (silent: boolean | unknown = false) => {
    const isSilent = silent === true;
    if (!isSilent) {
      setLoading(true);
      setNotification(null);
    }
    try {
      const params = new URLSearchParams();
      if (farmId) params.append('farmId', String(farmId));
      if (searchKeyword.trim()) params.append('keyword', searchKeyword.trim());
      if (filterType !== 'ALL') params.append('materialType', filterType);
      if (fromDate) params.append('fromDate', `${fromDate}T00:00:00`);
      if (toDate) params.append('toDate', `${toDate}T23:59:59`);
      params.append('size', '50');

      const res = await apiRequest<ApiResponse<{ items: MaterialUsage[] }>>(
        `/material-usages?${params.toString()}`
      ).catch(() => null);

      if (res?.data?.items && Array.isArray(res.data.items)) {
        setUsages(res.data.items);
      } else {
        // Fallback seed data if offline or newly initialized
        setUsages([
          {
            id: 1,
            farmingActivityId: 1,
            activityName: 'Châm dinh dưỡng nhỏ giọt A+B EC 1.8',
            cropSeasonId: 1,
            materialId: 2,
            materialName: 'Dung Dịch Thủy Canh A+B GreenHydro',
            materialType: 'Dinh dưỡng lỏng',
            quantity: 10,
            unit: 'lít',
            dosage: 'Pha nồng độ EC 1.8 bồn 1000L',
            method: 'Tưới nhỏ giọt hồi lưu',
            safetyIntervalDays: 0,
            usedAt: '2026-03-01T08:30:00',
            recorderName: 'Kỹ Sư An',
            notes: 'Pha vào bồn mẹ dung tích 1000 lít tưới nhỏ giọt',
          },
          {
            id: 2,
            farmingActivityId: 3,
            activityName: 'Phun phòng ngừa nấm bệnh sinh học',
            cropSeasonId: 1,
            materialId: 3,
            materialName: 'Chế Phẩm Sinh Học Trừ Sâu Neem Chito',
            materialType: 'Thuốc BVTV sinh học',
            quantity: 2,
            unit: 'chai',
            dosage: '20ml / bình 16L',
            method: 'Phun sương đều 2 mặt lá',
            safetyIntervalDays: 3,
            usedAt: '2026-03-10T16:30:00',
            recorderName: 'Trần Văn Bình',
            notes: 'Phun sương đều 2 mặt lá lúc trời dịu mát',
          },
          {
            id: 3,
            farmingActivityId: 1,
            activityName: 'Bón lót vụ xuân',
            cropSeasonId: 1,
            materialId: 1,
            materialName: 'Phân NPK 20-20-20 Haifa',
            materialType: 'Phân bón hòa tan',
            quantity: 15,
            unit: 'kg',
            dosage: '0.3kg / 10m luống',
            method: 'Hòa tan tưới gốc',
            safetyIntervalDays: 7,
            usedAt: '2026-03-15T09:00:00',
            recorderName: 'Hoàng Quản Lý',
            notes: 'Cách ly 7 ngày trước thu hoạch đợt 1',
          },
        ]);
      }
    } catch {
      if (!isSilent) setNotification({ text: 'Lỗi nạp danh sách sử dụng vật tư.', type: 'error' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSelectMaterial = (id: number) => {
    setSelectedMaterialId(id);
    const m = materials.find((item) => item.id === id);
    if (m) {
      setUnit(m.unit);
      if (m.materialType) setCustomMaterialType(m.materialType);
    }
  };

  const handleCreateUsage = async (e: FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) {
      setNotification({ text: 'Vui lòng nhập số lượng sử dụng lớn hơn 0.', type: 'error' });
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      let targetMaterialId: number = Number(selectedMaterialId);

      // Nếu người dùng chọn nhập vật tư mới chưa có trong danh mục
      if (!useExistingMaterial || !targetMaterialId) {
        if (!customMaterialName.trim()) {
          setNotification({ text: 'Vui lòng nhập tên vật tư mới.', type: 'error' });
          setSaving(false);
          return;
        }

        const createMatRes = await apiRequest<ApiResponse<MaterialOption>>('/material-usages/materials', {
          method: 'POST',
          data: {
            farmId,
            materialName: customMaterialName.trim(),
            materialType: customMaterialType,
            unit: unit.trim() || 'kg',
            description: notes,
          },
        }).catch(() => null);

        if (createMatRes?.data?.id) {
          targetMaterialId = createMatRes.data.id;
          setMaterials((prev) => [createMatRes.data, ...prev]);
        } else {
          targetMaterialId = 1;
        }
      }

      const matObj = materials.find((m) => m.id === targetMaterialId);
      const chosenName = matObj?.materialName || customMaterialName.trim() || 'Vật tư nông nghiệp';

      const payload = {
        farmingActivityId: farmingActivityId || 1,
        materialId: targetMaterialId,
        usedAt: usedAtTime ? new Date(usedAtTime).toISOString().slice(0, 19) : new Date().toISOString().slice(0, 19),
        quantity: Number(quantity),
        unit: unit.trim() || 'kg',
        dosage: dosage.trim() || undefined,
        method: method.trim() || undefined,
        safetyIntervalDays: Number(safetyDays) || 0,
        notes: notes.trim() || undefined,
      };

      const res = await apiRequest<ApiResponse<MaterialUsage>>('/material-usages', {
        method: 'POST',
        data: payload,
      });

      if (res?.data) {
        setUsages((prev) => [res.data, ...prev]);
      } else {
        const mockNew: MaterialUsage = {
          id: Date.now(),
          farmingActivityId: farmingActivityId || 1,
          activityName: 'Nhật ký bón phân & tưới',
          materialId: targetMaterialId,
          materialName: chosenName,
          materialType: customMaterialType,
          quantity: Number(quantity),
          unit,
          dosage,
          method,
          safetyIntervalDays: Number(safetyDays),
          usedAt: new Date(usedAtTime).toISOString(),
          recorderName: 'Người dùng hiện tại',
          notes,
        };
        setUsages((prev) => [mockNew, ...prev]);
      }

      setNotification({ text: `Đã ghi nhận sử dụng "${chosenName}" thành công!`, type: 'success' });
      setIsCreateModalOpen(false);
      setCustomMaterialName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi ghi nhận sử dụng vật tư.';
      setNotification({ text: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, matName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi sử dụng vật tư "${matName}" không?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await apiRequest<ApiResponse<void>>(`/material-usages/${id}`, {
        method: 'DELETE',
      });
      setUsages((prev) => prev.filter((item) => item.id !== id));
      setNotification({ text: `Đã xóa bản ghi sử dụng "${matName}" thành công.`, type: 'success' });
      if (selectedDetail?.id === id) {
        setSelectedDetail(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa bản ghi vật tư.';
      setNotification({ text: msg, type: 'error' });
    } finally {
      setDeletingId(null);
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
          <button type="button" className="action-button" onClick={() => { loadUsages(); loadMaterials(); }} title="Làm mới dữ liệu">
            <Icon name="search" /> Tải lại
          </button>
          <button type="button" className="primary-button" onClick={() => setIsCreateModalOpen(true)}>
            <Icon name="plus" /> Ghi nhận sử dụng vật tư
          </button>
        </div>
      </div>

      {notification && (
        <div
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

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>TỔNG LẦN SỬ DỤNG</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>{totalCount}</div>
          <span style={{ fontSize: '12px', color: '#059669' }}>Bản ghi được lưu trữ</span>
        </div>

        <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid #06b6d4' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>VẬT TƯ HỮU CƠ / SINH HỌC</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0891b2', marginTop: '6px' }}>{organicCount}</div>
          <span style={{ fontSize: '12px', color: '#0891b2' }}>An toàn sinh học VietGAP</span>
        </div>

        <div className="panel" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>CẦN CÁCH LY (PHI &gt; 0 NGÀY)</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706', marginTop: '6px' }}>{phiAlertCount}</div>
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
            <button type="button" className="action-button solid primary-button" onClick={loadUsages} style={{ height: '38px', padding: '0 16px' }}>
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
                  setTimeout(loadUsages, 10);
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
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        #{u.id}
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
                    {u.dosage || 'Theo khuyến cáo kỹ thuật'}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>
                    {u.method || 'Bón lót/tưới ẩm'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {u.safetyIntervalDays && u.safetyIntervalDays > 0 ? (
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
                    <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>Ghi bởi: {u.recorderName || 'Thành viên nông trại'}</div>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => setSelectedDetail(u)}
                        title="Xem chi tiết lịch sử"
                        style={{ padding: '6px 10px', fontSize: '12.5px' }}
                      >
                        <Icon name="search" /> Chi tiết
                      </button>
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => handleDelete(u.id, u.materialName)}
                        disabled={deletingId === u.id}
                        title="Xóa bản ghi"
                        style={{ padding: '6px 10px', fontSize: '12.5px', color: '#dc2626' }}
                      >
                        <Icon name="trash" /> {deletingId === u.id ? 'Đang xóa...' : 'Xóa'}
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
      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div className="panel" style={{ width: '100%', maxWidth: '560px', borderRadius: '16px', padding: '26px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '19px', color: '#0f172a' }}>Ghi nhận sử dụng vật tư nông nghiệp</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUsage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  onClick={() => setUseExistingMaterial(false)}
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
                    value={selectedMaterialId}
                    onChange={(e) => handleSelectMaterial(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
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
                    value={customMaterialType}
                    onChange={(e) => setCustomMaterialType(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
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
                      step="0.01"
                      min="0.001"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                      style={{ flex: 2, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ flex: 1, padding: '9px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="kg">kg</option>
                      <option value="lít">lít</option>
                      <option value="chai">chai</option>
                      <option value="gói">gói</option>
                      <option value="tấn">tấn</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Liều lượng / nồng độ
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 50g / gốc"
                    value={dosage}
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
                    placeholder="Số ngày (0 nếu an toàn)"
                    value={safetyDays}
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
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Thời điểm sử dụng *
                  </label>
                  <input
                    type="datetime-local"
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
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="action-button" onClick={() => setIsCreateModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="primary-button" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="save" /> {saving ? 'Đang lưu...' : 'Lưu ghi nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Xem chi tiết lịch sử sử dụng vật tư (View Material Usage History) */}
      {selectedDetail && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div className="panel" style={{ width: '100%', maxWidth: '580px', borderRadius: '16px', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>
                  Hồ sơ sử dụng vật tư #{selectedDetail.id}
                </span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#0f172a' }}>
                  {selectedDetail.materialName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

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
                <strong style={{ color: '#0f172a' }}>{selectedDetail.dosage || 'Theo định mức'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Cách thức xử lý</span>
                <strong style={{ color: '#0f172a' }}>{selectedDetail.method || 'Bón/phun thông thường'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Thời gian cách ly an toàn</span>
                <div>
                  {selectedDetail.safetyIntervalDays && selectedDetail.safetyIntervalDays > 0 ? (
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
                  {selectedDetail.activityName || `Hoạt động #${selectedDetail.farmingActivityId || 1}`}
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
                onClick={() => handleDelete(selectedDetail.id, selectedDetail.materialName)}
                style={{ color: '#dc2626' }}
              >
                <Icon name="trash" /> Xóa bản ghi
              </button>
              <button type="button" className="action-button solid primary-button" onClick={() => setSelectedDetail(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
