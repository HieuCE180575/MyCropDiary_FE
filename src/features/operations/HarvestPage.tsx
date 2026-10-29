import { useEffect, useRef, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import { fetchCropSeasonsByFarm, type CropSeasonResp } from './cropSeasonService';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

interface HarvestRecord {
  harvestRecordId: number;
  cropSeasonId: number;
  farmId: number;
  seasonName?: string | null;
  farmName?: string | null;
  blockId?: number;
  blockName?: string | null;
  recorderFullName?: string | null;
  harvestLotCode: string | null;
  harvestedAt: string;
  quantity: number;
  unit: string;
  qualityGrade: string | null;
  storageLocation: string | null;
  traceabilityCode: string | null;
  notes?: string | null;
}

export function HarvestPage() {
  const { selectedFarm } = useFarmWorkspace();
  return <HarvestContent key={selectedFarm?.id ?? 'no-farm'} />;
}

function HarvestContent() {
  const { selectedFarm } = useFarmWorkspace();
  const [seasonInput, setSeasonInput] = useState('');
  const [cropSeasonId, setCropSeasonId] = useState<number | null>(null);
  const [records, setRecords] = useState<HarvestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraceRecord, setSelectedTraceRecord] = useState<HarvestRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<HarvestRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef<AbortController | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // On-demand season picker state (only fetched when user clicks button)
  const [availableSeasons, setAvailableSeasons] = useState<CropSeasonResp[] | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  // Local filter state for loaded harvest records
  const [keywordFilter, setKeywordFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  // Form states
  const [lotCode, setLotCode] = useState(`LOT-${new Date().getFullYear()}-01`);
  const [quantity, setQuantity] = useState<number | ''>(500);
  const [harvestedAt, setHarvestedAt] = useState('');
  const [unit, setUnit] = useState('kg');
  const [qualityGrade, setQualityGrade] = useState('Loại 1 (Xuất khẩu)');
  const [storageLocation, setStorageLocation] = useState('');
  const [traceabilityCode, setTraceabilityCode] = useState(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    detailRequest.current?.abort();
    listRequest.current?.abort();
  }, []);

  const handleLoadSeasonList = async () => {
    if (!selectedFarm || loadingSeasons) return;
    setLoadingSeasons(true);
    try {
      const items = await fetchCropSeasonsByFarm(selectedFarm.id);
      setAvailableSeasons(items);
    } catch {
      setNotification({ text: 'Không tải được danh sách mùa vụ của trang trại.', type: 'error' });
    } finally {
      setLoadingSeasons(false);
    }
  };

  const loadHarvests = async (id: number | null) => {
    if (!selectedFarm || id === null) return;
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
      setNotification({ text: 'ID mùa vụ phải là số nguyên dương hợp lệ.', type: 'error' });
      return;
    }
    listRequest.current?.abort();
    detailRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setCropSeasonId(null);
    setRecords([]);
    setSelectedTraceRecord(null);
    setIsModalOpen(false);
    setLoading(true);
    setLoadError(null);
    setNotification(null);
    try {
      const res = await apiRequest<ApiResponse<{ items: HarvestRecord[] }>>(
        `/harvest-records?cropSeasonId=${id}&size=50`, { signal: controller.signal }
      );
      if (!res.success || !Array.isArray(res.data?.items)) throw new Error(res.message || 'Không tải được lịch sử thu hoạch.');
      if (controller.signal.aborted) return;
      if (res.data.items.some(record => record.farmId !== selectedFarm.id || record.cropSeasonId !== id)) {
        throw new Error('Dữ liệu thu hoạch không thuộc mùa vụ và trang trại đang chọn. Hãy kiểm tra lại ID mùa vụ.');
      }
      setCropSeasonId(id);
      setRecords(res.data.items);
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Lỗi tải lịch sử thu hoạch.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  // Silent background realtime sync for active season's harvest records
  useRealtimeSync(() => {
    if (!selectedFarm || cropSeasonId === null || loading || saving) return;
    apiRequest<ApiResponse<{ items: HarvestRecord[] }>>(`/harvest-records?cropSeasonId=${cropSeasonId}&size=50`)
      .then((res) => {
        if (
          res.success &&
          Array.isArray(res.data?.items) &&
          res.data.items.every((r) => r.farmId === selectedFarm.id && r.cropSeasonId === cropSeasonId)
        ) {
          setRecords(res.data.items);
          setLoadError(null);
        }
      })
      .catch(() => {});
  });

  const openHarvest = async (id: number, edit = false) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setDetailLoading(true);
    setNotification(null);
    setSelectedTraceRecord(null);
    try {
      const res = await apiRequest<ApiResponse<HarvestRecord>>(`/harvest-records/${id}`, { signal: controller.signal });
      if (!res.success || !res.data) throw new Error(res.message || 'Không tải được chi tiết thu hoạch.');
      if (controller.signal.aborted) return;
      if (edit) {
        setEditingRecord(res.data);
        setLotCode(res.data.harvestLotCode ?? '');
        setTraceabilityCode(res.data.traceabilityCode ?? '');
        setHarvestedAt(res.data.harvestedAt);
        setQuantity(res.data.quantity);
        setUnit(res.data.unit);
        setQualityGrade(res.data.qualityGrade ?? '');
        setStorageLocation(res.data.storageLocation ?? '');
        setNotes(res.data.notes ?? '');
        setIsModalOpen(true);
      } else setSelectedTraceRecord(res.data);
    } catch (error) {
      if (!controller.signal.aborted) setNotification({ text: error instanceof Error ? error.message : 'Không tải được chi tiết thu hoạch.', type: 'error' });
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  };

  const handleSaveHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || cropSeasonId === null || !selectedFarm) return;
    if (!quantity || !Number.isFinite(quantity) || quantity <= 0 || !unit.trim() || !harvestedAt) {
      setNotification({ text: 'Nhập ngày thu hoạch, đơn vị và sản lượng lớn hơn 0.', type: 'error' });
      return;
    }
    setSaving(true);
    setNotification(null);
    const payload = {
      ...(!editingRecord && { cropSeasonId, harvestLotCode: lotCode.trim(), traceabilityCode: traceabilityCode.trim() }),
      harvestedAt,
      quantity: Number(quantity),
      unit: unit.trim(),
      qualityGrade,
      storageLocation,
      notes,
    };

    try {
      const res = await apiRequest<ApiResponse<HarvestRecord>>(editingRecord ? `/harvest-records/${editingRecord.harvestRecordId}` : '/harvest-records', {
        method: editingRecord ? 'PUT' : 'POST',
        data: payload,
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Không lưu được bản ghi thu hoạch.');
      setRecords(prev => editingRecord
        ? prev.map(record => record.harvestRecordId === editingRecord.harvestRecordId ? res.data : record)
        : [res.data, ...prev]);
      setNotification({ text: editingRecord ? 'Đã cập nhật thu hoạch thành công!' : `Đã ghi nhận lô thu hoạch "${lotCode}" thành công!`, type: 'success' });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      setNotification({ text: error instanceof Error ? error.message : 'Không lưu được thu hoạch.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setLotCode(`LOT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`);
    setTraceabilityCode(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
    setHarvestedAt(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setQuantity(500);
    setUnit('kg');
    setQualityGrade('Loại 1 (Xuất khẩu)');
    setStorageLocation('');
    setNotes('');
  };

  const yieldUnit = records[0]?.unit ?? 'kg';
  const sameUnit = records.every(record => record.unit === yieldUnit);
  const totalYield = records.reduce((sum, r) => sum + r.quantity, 0);

  const filteredRecords = records.filter((r) => {
    const q = keywordFilter.trim().toLowerCase();
    const matchKeyword =
      !q ||
      (r.harvestLotCode || '').toLowerCase().includes(q) ||
      (r.traceabilityCode || '').toLowerCase().includes(q) ||
      (r.storageLocation || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q);
    const matchGrade = !gradeFilter || (r.qualityGrade || '') === gradeFilter;
    return matchKeyword && matchGrade;
  });

  const uniqueGrades = Array.from(new Set(records.map((r) => r.qualityGrade).filter(Boolean))) as string[];

  return (
    <div className="farm-registration-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Thu hoạch &amp; truy xuất nguồn gốc · {selectedFarm?.farmName || 'Trang trại'}</p>
          <h2>Thu hoạch &amp; Truy xuất nguồn gốc nông sản</h2>
          <p className="muted">
            Quản lý lô sản lượng thu hoạch, phẩm cấp chất lượng và cấp mã truy xuất nguồn gốc số chuẩn VietGAP.
          </p>
        </div>
        <div className="dashboard-actions">
          <button
            type="button"
            className="action-button"
            onClick={() => loadHarvests(cropSeasonId)}
            disabled={cropSeasonId === null || loading || saving || detailLoading}
          >
            <Icon name="refresh" size={16} /> Làm mới
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={cropSeasonId === null || loading || detailLoading || saving}
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <Icon name="plus" size={16} /> Ghi nhận đợt thu hoạch
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="zone-stats-grid">
        <div className="zone-stat-card">
          <div className="zone-stat-icon">
            <Icon name="package" size={20} />
          </div>
          <div className="zone-stat-content">
            <h4>Tổng sản lượng thu hoạch</h4>
            <strong className="stat-number">
              {cropSeasonId === null || loading || loadError || !sameUnit
                ? '—'
                : `${totalYield.toLocaleString('vi-VN')} ${yieldUnit}`}
            </strong>
          </div>
        </div>

        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--blue">
            <Icon name="layers" size={20} />
          </div>
          <div className="zone-stat-content">
            <h4>Tổng số lô sản phẩm</h4>
            <strong className="stat-number">
              {cropSeasonId === null || loading || loadError ? '—' : `${records.length} lô hàng`}
            </strong>
          </div>
        </div>

        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--amber">
            <Icon name="calendar" size={20} />
          </div>
          <div className="zone-stat-content">
            <h4>Mùa vụ đang tra cứu</h4>
            <strong className="stat-number">
              {cropSeasonId !== null ? `Mùa vụ #${cropSeasonId}` : 'Chưa chọn'}
            </strong>
          </div>
        </div>

        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--purple">
            <Icon name="check" size={20} />
          </div>
          <div className="zone-stat-content">
            <h4>Tỷ lệ phẩm cấp loại 1</h4>
            <strong className="stat-number">
              {cropSeasonId === null || loading || loadError || records.length === 0
                ? '—'
                : `${Math.round(
                    (records.filter((r) => (r.qualityGrade || '').includes('Loại 1') || r.qualityGrade === 'A').length /
                      records.length) *
                      100
                  )}%`}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter / Season Lookup Bar */}
      <form
        className="production-filter-panel"
        onSubmit={(event) => {
          event.preventDefault();
          loadHarvests(Number(seasonInput));
        }}
      >
        <label htmlFor="harvest-season-id" className="form-field" style={{ flex: '1.5 1 280px' }}>
          <span>
            Mã mùa vụ canh tác ({selectedFarm?.farmName || 'Trang trại'})
            <small style={{ color: '#059669', fontWeight: 700 }}>ID mùa vụ</small>
          </span>
          <input
            id="harvest-season-id"
            type="number"
            min="1"
            max="2147483647"
            step="1"
            required
            placeholder="Nhập ID mùa vụ đã lưu của trang trại (VD: 1, 17...)"
            value={seasonInput}
            onChange={(event) => setSeasonInput(event.target.value)}
            disabled={!selectedFarm || loading || saving || detailLoading}
          />
        </label>

        {availableSeasons !== null && (
          <label className="form-field" style={{ flex: '1.2 1 240px' }}>
            <span>
              Chọn nhanh mùa vụ
              <small style={{ color: '#059669', fontWeight: 700 }}>{availableSeasons.length} mùa vụ</small>
            </span>
            <select
              value={seasonInput}
              disabled={!selectedFarm || loading || saving || detailLoading}
              onChange={(e) => {
                const val = e.target.value;
                setSeasonInput(val);
                if (val) loadHarvests(Number(val));
              }}
            >
              <option value="">-- Chọn mùa vụ của trang trại --</option>
              {availableSeasons.map((s) => (
                <option key={s.cropSeasonId} value={String(s.cropSeasonId)}>
                  #{s.cropSeasonId} · {s.seasonName} {s.cropCategoryName ? `(${s.cropCategoryName})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="submit"
          className="primary-button"
          style={{ height: '46px' }}
          disabled={!selectedFarm || loading || saving || detailLoading}
        >
          Xem thu hoạch
        </button>

        {availableSeasons === null && (
          <button
            type="button"
            className="action-button"
            style={{ height: '46px' }}
            disabled={!selectedFarm || loadingSeasons || loading}
            onClick={handleLoadSeasonList}
          >
            {loadingSeasons ? 'Đang tải...' : 'Chọn từ danh sách mùa vụ'}
          </button>
        )}

        {cropSeasonId !== null && (
          <button
            type="button"
            className="action-button"
            style={{ height: '46px' }}
            onClick={() => {
              setSeasonInput('');
              setCropSeasonId(null);
              setRecords([]);
              setLoadError(null);
              setKeywordFilter('');
              setGradeFilter('');
            }}
          >
            Đặt lại bộ lọc
          </button>
        )}

        {cropSeasonId !== null && (
          <span
            role="status"
            className="status-badge active"
            style={{ height: '46px', display: 'inline-flex', alignItems: 'center', padding: '0 16px', fontSize: '13.5px' }}
          >
            Đang xem mùa vụ #{cropSeasonId}
          </span>
        )}
      </form>

      {notification && (
        <div
          role={notification.type === 'error' && !isModalOpen ? 'alert' : 'status'}
          className={notification.type === 'error' ? 'alert-error' : 'alert-success'}
          style={{ marginBottom: '16px' }}
        >
          <span>
            <strong>{notification.type === 'success' ? '✓ Thành công:' : '⚠️ Thông báo:'}</strong> {notification.text}
          </span>
          <button type="button" className="ghost-button" onClick={() => setNotification(null)}>
            ✕
          </button>
        </div>
      )}

      {detailLoading && (
        <div className="panel" style={{ padding: '16px 20px', marginBottom: '16px', textAlign: 'center' }}>
          <p role="status" className="muted" style={{ margin: 0 }}>
            ⏳ Đang tải chi tiết thu hoạch...
          </p>
        </div>
      )}

      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải danh sách thu hoạch...</h2>
          <p>Hệ thống đang truy xuất lịch sử các lô thu hoạch của mùa vụ.</p>
        </div>
      ) : loadError ? (
        <div className="panel empty-state" role="alert">
          <div className="empty-icon">⚠️</div>
          <h2>Không thể tải dữ liệu thu hoạch</h2>
          <p>{loadError}</p>
          <div className="button-row" style={{ justifyContent: 'center' }}>
            <button type="button" className="primary-button" onClick={() => loadHarvests(Number(seasonInput))}>
              Thử lại
            </button>
          </div>
        </div>
      ) : cropSeasonId === null ? (
        <div className="panel empty-state">
          <div className="empty-icon">🌾</div>
          <h2>{selectedFarm ? 'Nhập ID mùa vụ để xem thu hoạch' : 'Hãy chọn trang trại trước'}</h2>
          <p>
            Nhập mã số định danh (ID) mùa vụ thuộc <strong>{selectedFarm?.farmName || 'trang trại đang chọn'}</strong> trên thanh công cụ tìm kiếm để xem và ghi nhận các đợt thu hoạch nông sản.
          </p>
        </div>
      ) : records.length === 0 ? (
        <div className="panel empty-state">
          <div className="empty-icon">📦</div>
          <h2>Chưa có đợt thu hoạch nào được ghi nhận</h2>
          <p>Khi đến vụ thu hoạch, hãy nhấn &quot;Ghi nhận đợt thu hoạch&quot; để lưu sản lượng và cấp mã truy xuất nguồn gốc VietGAP.</p>
          <div className="button-row" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="primary-button"
              disabled={loading || detailLoading || saving}
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            >
              <Icon name="plus" size={16} /> Ghi nhận đợt thu hoạch
            </button>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ padding: '24px' }}>
          <div className="panel-title" style={{ marginBottom: '18px' }}>
            <div>
              <span className="eyebrow">Hồ sơ sản lượng &amp; Truy xuất nguồn gốc</span>
              <h2 style={{ margin: '4px 0 0' }}>Danh sách lô thu hoạch ({filteredRecords.length})</h2>
            </div>
          </div>

          {records.length > 1 && (
            <div className="production-filter-panel" style={{ marginBottom: '20px', background: '#f8fafc' }}>
              <label className="form-field" style={{ flex: '1.5 1 260px' }}>
                <span>
                  Tìm kiếm lô thu hoạch
                  <small style={{ color: '#059669', fontWeight: 700 }}>Mã lô / Mã VietGAP / Kho</small>
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo mã lô, mã truy xuất, nơi lưu kho..."
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                />
              </label>

              <label className="form-field" style={{ flex: '1 1 200px' }}>
                <span>
                  Lọc theo phẩm chất
                  <small style={{ color: '#059669', fontWeight: 700 }}>Phẩm cấp</small>
                </span>
                <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                  <option value="">Tất cả phẩm chất</option>
                  {uniqueGrades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filteredRecords.map((r) => (
              <div
                key={r.harvestRecordId}
                data-harvest-id={r.harvestRecordId}
                className="structured-field-card"
                style={{
                  marginBottom: 0,
                  background: '#ffffff',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className="knowledge-tag" style={{ fontWeight: 700 }}>
                      🏷️ {r.harvestLotCode || `#${r.harvestRecordId}`}
                    </span>
                    <span className="status-badge active">
                      {r.qualityGrade || 'Tiêu chuẩn'}
                    </span>
                  </div>

                  <div style={{ margin: '10px 0 16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                      Sản lượng thu được
                    </span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
                      {r.quantity.toLocaleString('vi-VN')} {r.unit}
                    </div>
                  </div>

                  <dl style={{ margin: 0, fontSize: '13.5px', display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px 10px' }}>
                    <dt style={{ color: '#64748b', fontWeight: 600 }}>Ngày thu hoạch:</dt>
                    <dd style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                      {new Date(r.harvestedAt).toLocaleDateString('vi-VN')}
                    </dd>

                    <dt style={{ color: '#64748b', fontWeight: 600 }}>Nơi lưu kho:</dt>
                    <dd style={{ margin: 0, color: '#334155' }}>{r.storageLocation || 'Kho bảo quản trang trại'}</dd>

                    <dt style={{ color: '#64748b', fontWeight: 600 }}>Mã VietGAP:</dt>
                    <dd style={{ margin: 0, color: '#059669', fontWeight: 700 }}>{r.traceabilityCode || '—'}</dd>
                  </dl>

                  {r.notes && (
                    <p
                      style={{
                        margin: '14px 0 0',
                        padding: '10px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: '#475569',
                      }}
                    >
                      💡 {r.notes}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    marginTop: '18px',
                    paddingTop: '14px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      className="action-button"
                      style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                      disabled={detailLoading}
                      onClick={() => openHarvest(r.harvestRecordId)}
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      className="action-button"
                      style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                      disabled={detailLoading}
                      onClick={() => openHarvest(r.harvestRecordId, true)}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ minHeight: '36px', padding: '6px 12px', fontSize: '13px' }}
                      disabled={detailLoading}
                      onClick={() => openHarvest(r.harvestRecordId)}
                    >
                      Tem QR
                    </button>
                  </div>
                  <small style={{ color: '#94a3b8', fontWeight: 600 }}>#{r.harvestRecordId}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Ghi nhận / Chỉnh sửa thu hoạch */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          if (!saving) setIsModalOpen(false);
        }}
        title={editingRecord ? 'Chỉnh sửa thu hoạch' : 'Ghi nhận đợt thu hoạch mới'}
      >
        <form onSubmit={handleSaveHarvest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            className="structured-field-card"
            style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0, padding: '12px 16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#065f46', fontWeight: 700, fontSize: '13.5px' }}>
              <span>🌾 Mùa vụ canh tác #{editingRecord?.cropSeasonId ?? cropSeasonId}</span>
              <span className="structured-field-badge">Trang trại {selectedFarm?.farmName}</span>
            </div>
          </div>

          {notification?.type === 'error' && (
            <p role="alert" className="form-error-banner" style={{ margin: 0 }}>
              {notification.text}
            </p>
          )}

          <div className="farm-registration-location-fields" style={{ gap: '14px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="harvest-lot-code" className="structured-field-label">
                  Mã lô thu hoạch <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">{editingRecord ? 'Cố định' : 'Bắt buộc'}</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="harvest-lot-code"
                  type="text"
                  required={!editingRecord}
                  readOnly={Boolean(editingRecord)}
                  maxLength={60}
                  value={lotCode}
                  onChange={(e) => setLotCode(e.target.value)}
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="harvest-trace-code" className="structured-field-label">
                  Mã truy xuất nguồn gốc <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">{editingRecord ? 'Cố định' : 'VietGAP'}</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="harvest-trace-code"
                  type="text"
                  required={!editingRecord}
                  readOnly={Boolean(editingRecord)}
                  value={traceabilityCode}
                  onChange={(e) => setTraceabilityCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="harvest-date" className="structured-field-label">
                Ngày giờ thu hoạch <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">Bắt buộc</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="harvest-date"
                type="datetime-local"
                step="any"
                required
                value={harvestedAt}
                onChange={(e) => setHarvestedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="farm-registration-location-fields" style={{ gap: '14px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <span className="structured-field-label">
                  Sản lượng &amp; Đơn vị <span style={{ color: '#dc2626' }}>*</span>
                </span>
                <span className="structured-field-badge">Số dương</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="form-field" style={{ flex: 2, marginBottom: 0 }}>
                  <input
                    aria-label="Sản lượng thu hoạch"
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                  <select aria-label="Đơn vị" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {!['kg', 'tấn', 'thùng'].includes(unit) && <option value={unit}>{unit}</option>}
                    <option value="kg">kg</option>
                    <option value="tấn">tấn</option>
                    <option value="thùng">thùng</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <span className="structured-field-label">Phân loại phẩm chất</span>
                <span className="structured-field-badge">Phẩm cấp</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  aria-label="Phân loại phẩm chất"
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value)}
                >
                  {!['Loại 1 (Xuất khẩu)', 'Loại 1 (Siêu thị)', 'Loại 2 (Nội địa)', 'Chế biến'].includes(qualityGrade) && (
                    <option value={qualityGrade}>{qualityGrade || 'Chưa phân loại'}</option>
                  )}
                  <option value="Loại 1 (Xuất khẩu)">Loại 1 (Xuất khẩu)</option>
                  <option value="Loại 1 (Siêu thị)">Loại 1 (Siêu thị)</option>
                  <option value="Loại 2 (Nội địa)">Loại 2 (Nội địa)</option>
                  <option value="Chế biến">Hàng phục vụ chế biến</option>
                </select>
              </div>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <span className="structured-field-label">Địa điểm / Kho lưu trữ bảo quản</span>
              <span className="structured-field-badge">Tùy chọn</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                aria-label="Kho lưu trữ"
                type="text"
                maxLength={200}
                placeholder="VD: Kho lạnh số 1, Khu đóng gói trung tâm..."
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <span className="structured-field-label">Ghi chú chất lượng kiểm định</span>
              <span className="structured-field-badge">{notes.length}/1000 ký tự</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea
                aria-label="Ghi chú"
                rows={2}
                maxLength={1000}
                placeholder="Ghi chú độ đồng đều, độ ngọt Brix, tình trạng bao bì..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '6px' }}>
            <button type="button" className="ghost-button" disabled={saving} onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Đang lưu...' : editingRecord ? 'Lưu thay đổi' : 'Xác nhận thu hoạch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tem QR & Thẻ truy xuất nguồn gốc */}
      {selectedTraceRecord && (
        <Modal open onClose={() => setSelectedTraceRecord(null)} title="Chi tiết thu hoạch">
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '6px' }}>🏷️</span>
            <h3 style={{ margin: '0 0 4px', fontSize: '19px', color: '#0f172a' }}>Tem truy xuất nguồn gốc VietGAP</h3>
            <p className="muted" style={{ margin: '0 0 18px', fontSize: '13.5px' }}>
              Thông tin lô thu hoạch được trích xuất từ hồ sơ sản xuất
            </p>

            {/* Simulated QR Box */}
            <div
              style={{
                width: '164px',
                height: '164px',
                margin: '0 auto 14px',
                padding: '14px',
                background: '#ffffff',
                border: '2px solid #10b981',
                borderRadius: '14px',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'repeating-conic-gradient(#0f172a 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
                  borderRadius: '6px',
                }}
              />
            </div>
            <p className="muted" style={{ fontSize: '12.5px', marginBottom: '16px' }}>
              Mã định danh: <strong style={{ color: '#059669' }}>{selectedTraceRecord.traceabilityCode}</strong>
            </p>

            <dl className="detail-list" style={{ textAlign: 'left', marginBottom: '18px' }}>
              <div>
                <dt>Mã lô hàng</dt>
                <dd>{selectedTraceRecord.harvestLotCode}</dd>
              </div>
              <div>
                <dt>Sản lượng</dt>
                <dd>
                  {selectedTraceRecord.quantity.toLocaleString('vi-VN')} {selectedTraceRecord.unit}
                </dd>
              </div>
              <div>
                <dt>Phẩm chất</dt>
                <dd>{selectedTraceRecord.qualityGrade || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Trang trại</dt>
                <dd>{selectedTraceRecord.farmName || selectedFarm?.farmName}</dd>
              </div>
              <div>
                <dt>Mùa vụ</dt>
                <dd>{selectedTraceRecord.seasonName || `#${selectedTraceRecord.cropSeasonId}`}</dd>
              </div>
              <div>
                <dt>Lô đất</dt>
                <dd>{selectedTraceRecord.blockName || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Ngày thu hoạch</dt>
                <dd>{new Date(selectedTraceRecord.harvestedAt).toLocaleDateString('vi-VN')}</dd>
              </div>
              <div>
                <dt>Kho lưu trữ</dt>
                <dd>{selectedTraceRecord.storageLocation || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Người ghi nhận</dt>
                <dd>{selectedTraceRecord.recorderFullName || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Tiêu chuẩn</dt>
                <dd>Thực hành nông nghiệp tốt VietGAP</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>Ghi chú kiểm định</dt>
                <dd>{selectedTraceRecord.notes || 'Chưa cập nhật'}</dd>
              </div>
            </dl>

            <div className="confirm-dialog-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="action-button" onClick={() => window.print()}>
                🖨️ In tem QR
              </button>
              <button type="button" className="primary-button" onClick={() => setSelectedTraceRecord(null)}>
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
