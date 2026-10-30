import { useEffect, useRef, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import {
  fetchCropSeasonsByFarm,
  fetchBlocksInSeason,
  type CropSeasonResp,
  type CropSeasonBlockResp,
} from './cropSeasonService';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

interface HarvestRecord {
  harvestRecordId: number;
  cropSeasonId: number;
  farmId: number;
  seasonName?: string | null;
  farmName?: string | null;
  blockId?: number | null;
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
  const [seasonBlocks, setSeasonBlocks] = useState<CropSeasonBlockResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraceRecord, setSelectedTraceRecord] = useState<HarvestRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<HarvestRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef<AbortController | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // On-demand season picker state
  const [availableSeasons, setAvailableSeasons] = useState<CropSeasonResp[] | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  // Local filter state for loaded harvest records
  const [keywordFilter, setKeywordFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [blockFilter, setBlockFilter] = useState<number | 'ALL'>('ALL');

  // Form states
  const [selectedBlockId, setSelectedBlockId] = useState<number | ''>('');
  const [lotCode, setLotCode] = useState(`LOT-${new Date().getFullYear()}-01`);
  const [quantity, setQuantity] = useState<number | ''>(500);
  const [harvestedAt, setHarvestedAt] = useState('');
  const [unit, setUnit] = useState('kg');
  const [qualityGrade, setQualityGrade] = useState('Loại 1 (Xuất khẩu)');
  const [storageLocation, setStorageLocation] = useState('');
  const [traceabilityCode, setTraceabilityCode] = useState(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      detailRequest.current?.abort();
      listRequest.current?.abort();
    };
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
    setSeasonBlocks([]);
    setBlockFilter('ALL');
    setSelectedTraceRecord(null);
    setIsModalOpen(false);
    setLoading(true);
    setLoadError(null);
    setNotification(null);
    try {
      const res = await apiRequest<ApiResponse<{ items: HarvestRecord[] }>>(
        `/harvest-records?cropSeasonId=${id}&size=50`,
        { signal: controller.signal }
      );
      if (!res.success || !Array.isArray(res.data?.items)) {
        throw new Error(res.message || 'Không tải được lịch sử thu hoạch.');
      }
      if (controller.signal.aborted) return;
      if (res.data.items.some((record) => record.farmId !== selectedFarm.id || record.cropSeasonId !== id)) {
        throw new Error('Dữ liệu thu hoạch không thuộc mùa vụ và trang trại đang chọn. Hãy kiểm tra lại ID mùa vụ.');
      }
      setCropSeasonId(id);
      setRecords(res.data.items);
      // Also load the blocks assigned to this season (CropSeasonBlock N-N)
      fetchBlocksInSeason(id)
        .then((blocks) => {
          if (!controller.signal.aborted && Array.isArray(blocks)) {
            setSeasonBlocks(blocks);
          }
        })
        .catch(() => {});
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadError(error instanceof Error ? error.message : 'Lỗi tải lịch sử thu hoạch.');
      }
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
      const res = await apiRequest<ApiResponse<HarvestRecord>>(`/harvest-records/${id}`, {
        signal: controller.signal,
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Không tải được chi tiết thu hoạch.');
      if (controller.signal.aborted) return;
      if (edit) {
        setEditingRecord(res.data);
        setSelectedBlockId(res.data.blockId ?? '');
        setLotCode(res.data.harvestLotCode ?? '');
        setTraceabilityCode(res.data.traceabilityCode ?? '');
        setHarvestedAt(res.data.harvestedAt);
        setQuantity(res.data.quantity);
        setUnit(res.data.unit);
        setQualityGrade(res.data.qualityGrade ?? '');
        setStorageLocation(res.data.storageLocation ?? '');
        setNotes(res.data.notes ?? '');
        setIsModalOpen(true);
      } else {
        setSelectedTraceRecord(res.data);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setNotification({
          text: error instanceof Error ? error.message : 'Không tải được chi tiết thu hoạch.',
          type: 'error',
        });
      }
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

    if (currentSeason?.startDate && harvestedAt < currentSeason.startDate) {
      setNotification({
        text: `Ngày thu hoạch (${harvestedAt}) không thể trước ngày bắt đầu mùa vụ (${currentSeason.startDate}).`,
        type: 'error',
      });
      return;
    }

    if (selectedBlockId) {
      const matchedBlk = seasonBlocks.find((sb) => sb.blockId === Number(selectedBlockId));
      if (matchedBlk?.plantedAt && harvestedAt < matchedBlk.plantedAt) {
        setNotification({
          text: `Ngày thu hoạch (${harvestedAt}) không thể trước ngày xuống giống tại lô đất ${matchedBlk.blockName || '#' + matchedBlk.blockId} (${matchedBlk.plantedAt}).`,
          type: 'error',
        });
        return;
      }
    }

    setSaving(true);
    setNotification(null);
    const payload = {
      ...(!editingRecord && {
        cropSeasonId,
        harvestLotCode: lotCode.trim(),
        traceabilityCode: traceabilityCode.trim(),
      }),
      ...(selectedBlockId ? { blockId: Number(selectedBlockId) } : {}),
      harvestedAt,
      quantity: Number(quantity),
      unit: unit.trim(),
      qualityGrade,
      storageLocation,
      notes,
    };

    try {
      const res = await apiRequest<ApiResponse<HarvestRecord>>(
        editingRecord ? `/harvest-records/${editingRecord.harvestRecordId}` : '/harvest-records',
        {
          method: editingRecord ? 'PUT' : 'POST',
          data: payload,
        }
      );
      if (!res.success || !res.data) throw new Error(res.message || 'Không lưu được bản ghi thu hoạch.');
      setRecords((prev) =>
        editingRecord
          ? prev.map((record) => (record.harvestRecordId === editingRecord.harvestRecordId ? res.data : record))
          : [res.data, ...prev]
      );
      setNotification({
        text: editingRecord
          ? 'Đã cập nhật thu hoạch thành công!'
          : `Đã ghi nhận lô thu hoạch "${lotCode}" thành công!`,
        type: 'success',
      });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      setNotification({
        text: error instanceof Error ? error.message : 'Không lưu được thu hoạch.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setSelectedBlockId(seasonBlocks[0]?.blockId ?? '');
    setLotCode(`LOT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`);
    setTraceabilityCode(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
    setHarvestedAt(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setQuantity(500);
    setUnit('kg');
    setQualityGrade('Loại 1 (Xuất khẩu)');
    setStorageLocation('');
    setNotes('');
  };

  const currentSeason = availableSeasons?.find((s) => s.cropSeasonId === cropSeasonId) ?? null;

  const yieldUnit = records[0]?.unit ?? 'kg';
  const sameUnit = records.every((record) => record.unit === yieldUnit);
  const totalYield = records.reduce((sum, r) => sum + r.quantity, 0);

  const filteredRecords = records.filter((r) => {
    const q = keywordFilter.trim().toLowerCase();
    const matchKeyword =
      !q ||
      (r.harvestLotCode || '').toLowerCase().includes(q) ||
      (r.traceabilityCode || '').toLowerCase().includes(q) ||
      (r.storageLocation || '').toLowerCase().includes(q) ||
      (r.blockName || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q);
    const matchGrade = !gradeFilter || (r.qualityGrade || '') === gradeFilter;
    const matchBlock = blockFilter === 'ALL' || r.blockId === blockFilter;
    return matchKeyword && matchGrade && matchBlock;
  });

  const uniqueGrades = Array.from(new Set(records.map((r) => r.qualityGrade).filter(Boolean))) as string[];
  const gradeOneCount = records.filter(
    (r) => (r.qualityGrade || '').includes('Loại 1') || r.qualityGrade === 'A'
  ).length;
  const gradeOnePercent = records.length > 0 ? Math.round((gradeOneCount / records.length) * 100) : 0;

  const matchedTraceBlock = selectedTraceRecord
    ? seasonBlocks.find((sb) => sb.blockId === selectedTraceRecord.blockId) ??
      (seasonBlocks.length === 1 ? seasonBlocks[0] : null)
    : null;

  return (
    <div className="farm-registration-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Thu hoạch &amp; truy xuất nguồn gốc · {selectedFarm?.farmName || 'Trang trại'}</p>
          <h2>Thu hoạch &amp; Truy xuất nguồn gốc nông sản</h2>
          <p className="muted">
            Quản lý lô sản lượng thu hoạch trên từng lô đất canh tác, phẩm cấp chất lượng và cấp mã QR truy xuất nguồn gốc số chuẩn VietGAP.
          </p>
        </div>
        <div className="dashboard-actions">
          <a href="/crop-seasons" className="action-button" style={{ textDecoration: 'none' }}>
            <Icon name="calendar" size={16} /> Danh sách mùa vụ
          </a>
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
            <Icon name="box" size={18} />
          </div>
          <div className="zone-stat-content">
            <h4>Tổng sản lượng</h4>
            <strong className="stat-number">
              {cropSeasonId === null || loading || loadError || !sameUnit ? (
                '—'
              ) : (
                <>
                  {totalYield.toLocaleString('vi-VN')} <span className="stat-unit">{yieldUnit}</span>
                </>
              )}
            </strong>
          </div>
        </div>

        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--blue">
            <Icon name="layers" size={18} />
          </div>
          <div className="zone-stat-content">
            <h4>Tổng lô hàng</h4>
            <strong className="stat-number">
              {cropSeasonId === null || loading || loadError ? (
                '—'
              ) : (
                <>
                  {records.length} <span className="stat-unit">lô</span>
                </>
              )}
            </strong>
          </div>
        </div>

        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--amber">
            <Icon name="calendar" size={18} />
          </div>
          <div className="zone-stat-content">
            <h4>Mùa vụ tra cứu</h4>
            <strong className="stat-number" style={{ fontSize: '1rem' }}>
              {cropSeasonId !== null ? currentSeason?.seasonName || `Mùa vụ #${cropSeasonId}` : 'Chưa chọn'}
            </strong>
          </div>
        </div>

        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--purple">
            <Icon name="check" size={18} />
          </div>
          <div className="zone-stat-content">
            <h4>Tỷ lệ loại 1</h4>
            <strong className="stat-number">
              {cropSeasonId === null || loading || loadError || records.length === 0 ? (
                '—'
              ) : (
                <>
                  {gradeOnePercent} <span className="stat-unit">%</span>
                </>
              )}
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
        <div className="filter-group" style={{ flex: '1.5 1 280px' }}>
          <label htmlFor="harvest-season-id" className="filter-label">
            Mã mùa vụ canh tác ({selectedFarm?.farmName || 'Trang trại'})
          </label>
          <div className="filter-input-wrap">
            <span className="filter-icon">🌾</span>
            <input
              id="harvest-season-id"
              type="number"
              min="1"
              max="2147483647"
              step="1"
              required
              placeholder="Nhập ID mùa vụ (VD: 1, 17...)"
              value={seasonInput}
              onChange={(event) => setSeasonInput(event.target.value)}
              disabled={!selectedFarm || loading || saving || detailLoading}
            />
          </div>
        </div>

        {availableSeasons !== null && (
          <div className="filter-group" style={{ flex: '1.4 1 240px' }}>
            <label htmlFor="harvest-season-select-quick" className="filter-label">
              Chọn nhanh mùa vụ ({availableSeasons.length} mùa vụ)
            </label>
            <select
              id="harvest-season-select-quick"
              value={seasonInput}
              disabled={!selectedFarm || loading || saving || detailLoading}
              onChange={(e) => {
                const val = e.target.value;
                setSeasonInput(val);
                if (val) void loadHarvests(Number(val));
              }}
            >
              <option value="">-- Chọn mùa vụ của trang trại --</option>
              {availableSeasons.map((s) => (
                <option key={s.cropSeasonId} value={String(s.cropSeasonId)}>
                  #{s.cropSeasonId} · {s.seasonName} {s.cropCategoryName ? `(${s.cropCategoryName})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          className="primary-button"
          style={{ height: '42px', minHeight: '42px', padding: '0 18px' }}
          disabled={!selectedFarm || loading || saving || detailLoading}
        >
          Xem thu hoạch
        </button>

        {availableSeasons === null && (
          <button
            type="button"
            className="action-button"
            style={{ height: '42px', minHeight: '42px', padding: '0 16px' }}
            disabled={!selectedFarm || loadingSeasons || loading}
            onClick={handleLoadSeasonList}
          >
            {loadingSeasons ? 'Đang tải...' : '📋 Chọn từ danh sách mùa vụ'}
          </button>
        )}

        {cropSeasonId !== null && (
          <button
            type="button"
            className="filter-reset-btn"
            onClick={() => {
              setSeasonInput('');
              setCropSeasonId(null);
              setRecords([]);
              setSeasonBlocks([]);
              setLoadError(null);
              setKeywordFilter('');
              setGradeFilter('');
              setBlockFilter('ALL');
            }}
          >
            ✕ Đặt lại bộ lọc
          </button>
        )}

        {cropSeasonId !== null && (
          <span
            role="status"
            className="status-badge active"
            style={{
              height: '42px',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 14px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            Đang xem mùa vụ #{cropSeasonId}
          </span>
        )}
      </form>

      {/* Assigned Season Blocks Filter Pills */}
      {cropSeasonId !== null && seasonBlocks.length > 0 && (
        <div
          className="panel"
          style={{
            padding: '12px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>
            🌱 Lô đất thuộc mùa vụ #{cropSeasonId}:
          </span>
          <button
            type="button"
            onClick={() => setBlockFilter('ALL')}
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              background: blockFilter === 'ALL' ? '#047857' : '#f8fafc',
              borderColor: blockFilter === 'ALL' ? '#047857' : '#cbd5e1',
              color: blockFilter === 'ALL' ? '#ffffff' : '#334155',
            }}
          >
            Tất cả lô ({seasonBlocks.length})
          </button>
          {seasonBlocks.map((sb) => (
            <button
              key={sb.blockId}
              type="button"
              onClick={() => setBlockFilter(sb.blockId)}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                border: '1px solid',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: blockFilter === sb.blockId ? '#059669' : '#ecfdf5',
                borderColor: blockFilter === sb.blockId ? '#059669' : '#a7f3d0',
                color: blockFilter === sb.blockId ? '#ffffff' : '#065f46',
              }}
            >
              🌱 {sb.blockName} ({sb.plantedArea ?? sb.blockArea} {sb.areaUnit || 'm²'})
            </button>
          ))}
        </div>
      )}

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
          <p>Khi đến vụ thu hoạch, hãy nhấn &quot;Ghi nhận đợt thu hoạch&quot; để lưu sản lượng theo từng lô đất và cấp mã truy xuất nguồn gốc VietGAP.</p>
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

          {records.length > 1 && (
            <div className="production-filter-panel" style={{ marginBottom: '20px', background: '#f8fafc' }}>
              <div className="filter-group" style={{ flex: '1.5 1 260px' }}>
                <label htmlFor="harvest-sub-search" className="filter-label">
                  Tìm kiếm lô thu hoạch
                </label>
                <div className="filter-input-wrap">
                  <span className="filter-icon">🔍</span>
                  <input
                    id="harvest-sub-search"
                    type="search"
                    placeholder="Tìm theo mã lô, mã truy xuất, tên lô đất, nơi lưu kho..."
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-group" style={{ flex: '1 1 200px' }}>
                <label htmlFor="harvest-sub-grade" className="filter-label">
                  Lọc theo phẩm chất
                </label>
                <select
                  id="harvest-sub-grade"
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                >
                  <option value="">Tất cả phẩm chất</option>
                  {uniqueGrades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {(keywordFilter || gradeFilter) && (
                <button
                  type="button"
                  className="filter-reset-btn"
                  onClick={() => {
                    setKeywordFilter('');
                    setGradeFilter('');
                  }}
                >
                  ✕ Đặt lại
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filteredRecords.map((r) => {
              const matchedBlk =
                seasonBlocks.find((sb) => sb.blockId === r.blockId) ??
                (seasonBlocks.length === 1 ? seasonBlocks[0] : null);
              const displayBlockName = r.blockName || matchedBlk?.blockName || null;

              return (
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
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <span className="knowledge-tag" style={{ fontWeight: 700 }}>
                        🏷️ {r.harvestLotCode || `#${r.harvestRecordId}`}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {displayBlockName && (
                          <span
                            style={{
                              padding: '3px 9px',
                              borderRadius: '999px',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#065f46',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          >
                            🌱 {displayBlockName}
                          </span>
                        )}
                        <span className="status-badge active">{r.qualityGrade || 'Tiêu chuẩn'}</span>
                      </div>
                    </div>

                    <div style={{ margin: '10px 0 16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                        }}
                      >
                        Sản lượng thu được
                      </span>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
                        {r.quantity.toLocaleString('vi-VN')} {r.unit}
                      </div>
                    </div>

                    <dl
                      style={{
                        margin: 0,
                        fontSize: '13.5px',
                        display: 'grid',
                        gridTemplateColumns: '115px 1fr',
                        gap: '8px 10px',
                      }}
                    >
                      {displayBlockName && (
                        <>
                          <dt style={{ color: '#64748b', fontWeight: 600 }}>Lô đất trồng:</dt>
                          <dd style={{ margin: 0, fontWeight: 700, color: '#065f46' }}>{displayBlockName}</dd>
                        </>
                      )}

                      {matchedBlk?.plantedAt && (
                        <>
                          <dt style={{ color: '#64748b', fontWeight: 600 }}>Xuống giống:</dt>
                          <dd style={{ margin: 0, color: '#334155' }}>
                            {new Date(matchedBlk.plantedAt).toLocaleDateString('vi-VN')}
                          </dd>
                        </>
                      )}

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
              );
            })}
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#065f46',
                fontWeight: 700,
                fontSize: '13.5px',
              }}
            >
              <span>
                🌾 Mùa vụ canh tác:{' '}
                {currentSeason?.seasonName || `#${editingRecord?.cropSeasonId ?? cropSeasonId}`}
              </span>
              <span className="structured-field-badge">Trang trại {selectedFarm?.farmName}</span>
            </div>
          </div>

          {notification?.type === 'error' && (
            <p role="alert" className="form-error-banner" style={{ margin: 0 }}>
              {notification.text}
            </p>
          )}

          {/* Chọn lô đất thu hoạch (thuộc mùa vụ đang chọn) */}
          {seasonBlocks.length > 0 && (
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="harvest-block-select" className="structured-field-label">
                  🌱 Lô đất thu hoạch (Thuộc mùa vụ)
                </label>
                <span className="structured-field-badge">{seasonBlocks.length} lô được phân bổ</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="harvest-block-select"
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Chọn lô đất thu hoạch --</option>
                  {seasonBlocks.map((sb) => (
                    <option key={sb.blockId} value={sb.blockId}>
                      {sb.blockName} ({sb.zoneName || `Khu #${sb.zoneId}`} · Diện tích trồng:{' '}
                      {sb.plantedArea ?? sb.blockArea} {sb.areaUnit || 'm²'}
                      {sb.plantedAt ? ` · Gieo: ${sb.plantedAt}` : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
                  {!['Loại 1 (Xuất khẩu)', 'Loại 1 (Siêu thị)', 'Loại 2 (Nội địa)', 'Chế biến'].includes(
                    qualityGrade
                  ) && <option value={qualityGrade}>{qualityGrade || 'Chưa phân loại'}</option>}
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
              Thông tin lô thu hoạch được trích xuất minh bạch từ nhật ký mùa vụ và lô đất sản xuất
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
            <p className="muted" style={{ fontSize: '12.5px', marginBottom: '14px' }}>
              Mã định danh: <strong style={{ color: '#059669' }}>{selectedTraceRecord.traceabilityCode}</strong>
            </p>

            {/* VietGAP Origin Highlight Banner */}
            <div
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                marginBottom: '16px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                fontSize: '13px',
                color: '#065f46',
                lineHeight: 1.55,
              }}
            >
              <strong>✓ Chứng nhận truy xuất VietGAP:</strong> Lô nông sản thuộc{' '}
              <strong>
                {selectedTraceRecord.seasonName || currentSeason?.seasonName || `Mùa vụ #${selectedTraceRecord.cropSeasonId}`}
              </strong>
              , được canh tác tại{' '}
              <strong>
                {selectedTraceRecord.blockName || matchedTraceBlock?.blockName || 'Khu sản xuất tập trung'}
              </strong>{' '}
              của <strong>{selectedTraceRecord.farmName || selectedFarm?.farmName}</strong>
              {(matchedTraceBlock?.plantedAt || currentSeason?.startDate) && (
                <>
                  , xuống giống ngày{' '}
                  <strong>
                    {new Date(matchedTraceBlock?.plantedAt || currentSeason!.startDate).toLocaleDateString('vi-VN')}
                  </strong>
                </>
              )}{' '}
              và thu hoạch ngày{' '}
              <strong>{new Date(selectedTraceRecord.harvestedAt).toLocaleDateString('vi-VN')}</strong>.
            </div>

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
                <dt>Mùa vụ canh tác</dt>
                <dd>
                  {selectedTraceRecord.seasonName ||
                    currentSeason?.seasonName ||
                    `#${selectedTraceRecord.cropSeasonId}`}
                </dd>
              </div>
              <div>
                <dt>Lô đất trồng (Block)</dt>
                <dd>{selectedTraceRecord.blockName || matchedTraceBlock?.blockName || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Ngày xuống giống</dt>
                <dd>
                  {matchedTraceBlock?.plantedAt
                    ? new Date(matchedTraceBlock.plantedAt).toLocaleDateString('vi-VN')
                    : currentSeason?.startDate
                    ? new Date(currentSeason.startDate).toLocaleDateString('vi-VN')
                    : 'Theo hồ sơ mùa vụ'}
                </dd>
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
