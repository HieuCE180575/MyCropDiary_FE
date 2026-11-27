import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { Modal } from '../../shared/components/Modal';
import { QRCodeSVG } from 'qrcode.react';

import { formatDate as displayDate, formatNumber as displayNumber } from '../../shared/format/formatters';
import { useEffect, useRef, useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';


import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import {
  fetchCropSeasonsByFarm,
  fetchBlocksInSeason,
  type CropSeasonResp,
  type CropSeasonBlockResp,
} from './cropSeasonService';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';
import { useLanguage } from '../../shared/i18n/LanguageContext';

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
  discardedQuantity?: number | null;
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
  const { lang, t: translate } = useLanguage();
  const localizeBlockName = (name: string | null | undefined) =>
    lang === 'vi' ? name?.replace(/^Block\b\s*/i, 'Lô ') : name;
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
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

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
  const [discardedQuantity, setDiscardedQuantity] = useState<number | ''>('');
  const [harvestedAt, setHarvestedAt] = useState('');
  const [unit, setUnit] = useState('kg');
  const [qualityGrade, setQualityGrade] = useState('Loại 1 (Xuất khẩu)');
  const [storageLocation, setStorageLocation] = useState('');
  const [traceabilityCode, setTraceabilityCode] = useState(`GAP-VN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-Harvest Interval (PHI) Material Usages cache
  interface PhiMaterialUsage {
    materialUsageId: number;
    farmingActivityId?: number;
    activityName?: string;
    cropSeasonId?: number;
    blockId?: number | null;
    materialName: string;
    materialType?: string;
    usedAt: string;
    safetyIntervalDays?: number | null;
  }
  const [seasonMaterials, setSeasonMaterials] = useState<PhiMaterialUsage[]>([]);
  const [phiLoadError, setPhiLoadError] = useState(false);

  useEffect(() => {
    return () => {
      detailRequest.current?.abort();
      listRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (selectedFarm?.id) {
      setLoadingSeasons(true);
      fetchCropSeasonsByFarm(selectedFarm.id)
        .then((items) => {
          setAvailableSeasons(items);
          if (items && items.length > 0 && cropSeasonId === null) {
            const activeSeason = items.find((s) => s.seasonStatus === 'in_progress' || s.seasonStatus === 'active') || items[0];
            setSeasonInput(String(activeSeason.cropSeasonId));
            void loadHarvests(activeSeason.cropSeasonId);
          }
        })
        .catch(() => {
          setAvailableSeasons([]);
        })
        .finally(() => {
          setLoadingSeasons(false);
        });
    }
  }, [selectedFarm?.id]);

  const handleLoadSeasonList = async () => {
    if (!selectedFarm || loadingSeasons) return;
    setLoadingSeasons(true);
    try {
      const items = await fetchCropSeasonsByFarm(selectedFarm.id);
      setAvailableSeasons(items);
    } catch {
      setNotification({ text: (lang === 'en' ? "Unable to load the farm's seasons." : 'Không tải được danh sách mùa vụ của trang trại.'), type: 'error' });
    } finally {
      setLoadingSeasons(false);
    }
  };

  const loadHarvests = async (id: number | null) => {
    if (!selectedFarm || id === null) return;
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
      setNotification({ text: (lang === 'en' ? "The season ID must be a valid positive integer." : 'ID mùa vụ phải là số nguyên dương hợp lệ.'), type: 'error' });
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

      // Load activities and material usages to verify Pre-Harvest Interval (PHI)
      setPhiLoadError(false);
      Promise.all([
        apiRequest<ApiResponse<{ items?: Array<{ id: number; farmingActivityId?: number; blockId?: number | null }> }>>(
          `/farming-activities?cropSeasonId=${id}&size=200`,
          { signal: controller.signal }
        ).catch(() => null),
        apiRequest<ApiResponse<{ items?: PhiMaterialUsage[] }>>(
          `/material-usages?cropSeasonId=${id}&size=200`,
          { signal: controller.signal }
        ).catch(() => null),
      ]).then(([actRes, matRes]) => {
        if (controller.signal.aborted) return;
        if (!matRes || !matRes.success) {
          setPhiLoadError(true);
          setSeasonMaterials([]);
          return;
        }
        const actMap = new Map<number, number | null>();
        (actRes?.data?.items || []).forEach((a) => {
          const aId = a.id || a.farmingActivityId;
          if (aId) actMap.set(aId, a.blockId ?? null);
        });

        const rawMats = matRes?.data?.items || [];
        const enrichedMats: PhiMaterialUsage[] = rawMats.map((m) => ({
          ...m,
          blockId: m.farmingActivityId ? (actMap.get(m.farmingActivityId) ?? null) : null,
        }));
        setSeasonMaterials(enrichedMats);
      }).catch(() => {
        if (!controller.signal.aborted) {
          setPhiLoadError(true);
          setSeasonMaterials([]);
        }
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadError((lang === 'en' ? error instanceof Error ? translate(error.message) : "Unable to load harvest history." : error instanceof Error ? error.message : 'Lỗi tải lịch sử thu hoạch.'));
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
        setDiscardedQuantity(res.data.discardedQuantity != null ? res.data.discardedQuantity : '');
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
          text: (lang === 'en' ? error instanceof Error ? translate(error.message) : "Unable to load harvest details." : error instanceof Error ? error.message : 'Không tải được chi tiết thu hoạch.'),
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
      setNotification({ text: (lang === 'en' ? "Enter a harvest date, unit, and yield greater than 0." : 'Nhập ngày thu hoạch, đơn vị và sản lượng lớn hơn 0.'), type: 'error' });
      return;
    }

    if (currentSeason?.startDate && harvestedAt < currentSeason.startDate) {
      setNotification({
        text: (message("Harvest date ({value1}) cannot be before the season start date ({value2}).", { value1: harvestedAt, value2: currentSeason.startDate })),
        type: 'error',
      });
      return;
    }

    if (selectedBlockId) {
      const matchedBlk = seasonBlocks.find((sb) => sb.blockId === Number(selectedBlockId));
      if (matchedBlk?.plantedAt && harvestedAt < matchedBlk.plantedAt) {
        setNotification({
          text: (message("Harvest date ({value1}) cannot be before the block planting date {value2} ({value3}).", { value1: harvestedAt, value2: matchedBlk.blockName || '#' + matchedBlk.blockId, value3: matchedBlk.plantedAt })),
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
      discardedQuantity: discardedQuantity !== '' ? Number(discardedQuantity) : 0,
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
        text: editingRecord ? 'Harvest updated successfully!' : message('Recorded harvest batch "{value1}" successfully!', { value1: lotCode }),
        type: 'success',
      });
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      setNotification({
        text: (lang === 'en' ? error instanceof Error ? translate(error.message) : "Unable to save harvest." : error instanceof Error ? error.message : 'Không lưu được thu hoạch.'),
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
    setDiscardedQuantity('');
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

  // Real-time Pre-Harvest Interval (PHI) check for selected block and harvest date
  const checkPhiViolation = (targetBlockId: number | '' | null | undefined, targetHarvestDate: string) => {
    if (!targetBlockId || !targetHarvestDate) return null;
    const hDate = new Date(targetHarvestDate);
    if (isNaN(hDate.getTime())) return null;

    // Filter relevant materials applied to this block or farm-wide (null blockId)
    const relevantMaterials = seasonMaterials.filter((m) => {
      const hasSafety = typeof m.safetyIntervalDays === 'number' && m.safetyIntervalDays > 0;
      const isBlockMatch = !m.blockId || m.blockId === targetBlockId;
      return hasSafety && isBlockMatch;
    });

    let worstViolation: {
      materialName: string;
      usedAt: string;
      safetyIntervalDays: number;
      safeDate: Date;
      daysRemaining: number;
    } | null = null;

    for (const mat of relevantMaterials) {
      const uDate = new Date(mat.usedAt);
      if (isNaN(uDate.getTime())) continue;
      // Calculate earliest safe harvest date = usedAt + safetyIntervalDays
      const safeDate = new Date(uDate.getTime() + (mat.safetyIntervalDays || 0) * 86400000);
      
      if (hDate < safeDate) {
        const diffMs = safeDate.getTime() - hDate.getTime();
        const daysRemaining = Math.ceil(diffMs / 86400000);
        if (!worstViolation || daysRemaining > worstViolation.daysRemaining) {
          worstViolation = {
            materialName: mat.materialName,
            usedAt: mat.usedAt,
            safetyIntervalDays: mat.safetyIntervalDays || 0,
            safeDate,
            daysRemaining,
          };
        }
      }
    }

    return worstViolation;
  };

  const currentFormPhiViolation = checkPhiViolation(selectedBlockId, harvestedAt);

  return (
    <div className="farm-registration-page harvest-page">
      <PageHeading className="harvest-page-heading" title={<>{lang === 'en' ? 'Harvest & Produce Traceability' : 'Thu hoạch & Truy xuất nguồn gốc nông sản'}</>}><div className="dashboard-actions">
          <a href="/crop-seasons" className="ui-button ui-button--secondary ui-navigation-action" style={{ textDecoration: 'none' }}>
            <Icon name="calendar" size={16} /> {lang === 'en' ? 'Crop Seasons' : 'Danh sách mùa vụ'}
          </a>

          <Button
            type="button"
            variant="primary"
            disabled={cropSeasonId === null || loading || detailLoading || saving}
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <Icon name="plus" size={16} /> {lang === 'en' ? 'Record Harvest Batch' : 'Ghi nhận đợt thu hoạch'}
          </Button>
        </div></PageHeading>

      {/* Stat Cards Grid (Hidden to streamline page per user request) */}
      <div className="zone-stats-grid" style={{ display: 'none' }}>
        <div className="zone-stat-card">
          <div className="zone-stat-icon">
            <Icon name="box" size={18} />
          </div>
          <div className="zone-stat-content">
            <h4>{lang === 'en' ? 'Total Harvest Yield' : 'Tổng sản lượng'}</h4>
            <strong className="stat-number">
              {cropSeasonId === null || loading || loadError || !sameUnit ? (
                '—'
              ) : (
                <>
                  {displayNumber(totalYield, lang)} <span className="stat-unit">{translate(yieldUnit)}</span>
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
            <h4>{lang === 'en' ? 'Total Harvest Batches' : 'Tổng lô hàng'}</h4>
            <strong className="stat-number">
              {cropSeasonId === null || loading || loadError ? (
                '—'
              ) : (
                <>
                  {records.length} <span className="stat-unit">{(lang === 'en' ? "blocks" : "lô")}</span>
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
            <h4>{lang === 'en' ? 'Target Season' : 'Mùa vụ tra cứu'}</h4>
            <strong className="stat-number" style={{ fontSize: '1rem' }}>
              {(lang === 'en' ? cropSeasonId !== null ? (currentSeason?.seasonName || `Season`) : "Not selected" : cropSeasonId !== null ? currentSeason?.seasonName || `Mùa vụ` : 'Chưa chọn')}
            </strong>
          </div>
        </div>

        <div className="zone-stat-card">
          <div className="zone-stat-icon zone-stat-icon--purple">
            <Icon name="check" size={18} />
          </div>
          <div className="zone-stat-content">
            <h4>{lang === 'en' ? 'Grade 1 Quality Rate' : 'Tỷ lệ loại 1'}</h4>
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
      <div className="production-filter-panel harvest-season-filters" style={{ alignItems: 'center' }}>
        {availableSeasons !== null && (
          <div className="filter-group" style={{ flex: '1 1 auto', minWidth: '240px' }}>
            <div className="harvest-season-label-row" style={{ marginBottom: '4px' }}>
              <label htmlFor="harvest-season-select-quick" className="filter-label" style={{ margin: 0 }}>
                {lang === 'en' ? 'Select crop season' : 'Chọn mùa vụ'}
              </label>
              {cropSeasonId !== null && (
                <StatusBadge role="status" tone="success" label={<>
                  {currentSeason?.seasonName || (lang === 'en' ? 'Season selected' : 'Đã chọn mùa vụ')}
                </>} />
              )}
            </div>
            <select className="ui-select"
              id="harvest-season-select-quick"
              value={seasonInput}
              disabled={!selectedFarm || loading || saving || detailLoading}
              onChange={(e) => {
                const val = e.target.value;
                setSeasonInput(val);
                if (val) void loadHarvests(Number(val));
                else {
                  listRequest.current?.abort();
                  setLoading(false); setCropSeasonId(null); setRecords([]); setSeasonBlocks([]); setLoadError(null); setBlockFilter('ALL');
                }
              }}
            >
              <option value="">{(lang === 'en' ? "-- Select a farm season --" : "-- Chọn mùa vụ của trang trại --")}</option>
              {availableSeasons.map((s) => (
                <option key={s.cropSeasonId} value={String(s.cropSeasonId)}>
                  {s.seasonName} {s.cropCategoryName ? `(${s.cropCategoryName})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {availableSeasons === null && (
          <Button
            type="button"
            variant="secondary"
            disabled={!selectedFarm || loadingSeasons || loading}
            onClick={handleLoadSeasonList}
          >
            {(lang === 'en' ? loadingSeasons ? "Loading..." : "📋 Select from season list" : loadingSeasons ? 'Đang tải...' : '📋 Chọn từ danh sách mùa vụ')}
          </Button>
        )}

        <button
          type="button"
          className="zone-clean-reload-btn"
          style={{ alignSelf: 'flex-end', marginBottom: '1px' }}
          title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
          aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
          onClick={() => {
            listRequest.current?.abort();
            setLoading(false);
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
          <Icon name="refresh" size={16} />
        </button>
      </div>

      {/* Assigned Season Blocks Filter Pills */}
      {cropSeasonId !== null && seasonBlocks.length > 0 && (
        <div
          className="panel"
          style={{
            padding: '10px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Icon name="plots" size={15} />
            {lang === 'en' ? 'Blocks in season:' : 'Lô trồng thuộc vụ:'}
          </span>
          <button
            type="button"
            onClick={() => setBlockFilter('ALL')}
            style={{
              padding: '4px 14px',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              background: blockFilter === 'ALL' ? '#10b981' : '#f8fafc',
              borderColor: blockFilter === 'ALL' ? '#10b981' : '#e2e8f0',
              color: blockFilter === 'ALL' ? '#ffffff' : '#334155',
              transition: 'all 0.15s ease',
            }}
          >
            {(lang === 'en' ? "All blocks (" : "Tất cả lô (")}{seasonBlocks.length})
          </button>
          {seasonBlocks.map((sb) => {
            const isSelected = blockFilter === sb.blockId;
            return (
              <button
                key={sb.blockId}
                type="button"
                onClick={() => setBlockFilter(sb.blockId)}
                style={{
                  padding: '4px 14px',
                  borderRadius: '999px',
                  border: '1px solid',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: isSelected ? '#10b981' : '#ecfdf5',
                  borderColor: isSelected ? '#10b981' : '#a7f3d0',
                  color: isSelected ? '#ffffff' : '#047857',
                  transition: 'all 0.15s ease',
                }}
              >
                {localizeBlockName(sb.blockName)}
              </button>
            );
          })}
        </div>
      )}

      {notification && (isDeleteError(translate(notification.text), notification.type)
        ? <DeleteErrorToast text={translate(notification.text)} onClose={() => setNotification(null)} />
        : (<div
          role={notification.type === 'error' && !isModalOpen ? 'alert' : 'status'}
          className={notification.type === 'error' ? 'alert-error' : 'alert-success'}
          style={{ marginBottom: '16px' }}
        >
          <span>
            <strong>{(lang === 'en' ? notification.type === 'success' ? "✓ Success:" : "⚠️ Notice:" : notification.type === 'success' ? '✓ Thành công:' : '⚠️ Thông báo:')}</strong> {translate(notification.text)}
          </span>
          <Button type="button" variant="secondary" onClick={() => setNotification(null)}>
            ✕
          </Button>
        </div>))}

      {detailLoading && (
        <div className="panel" style={{ padding: '16px 20px', marginBottom: '16px', textAlign: 'center' }}>
          <p role="status" className="muted" style={{ margin: 0 }}>
            {(lang === 'en' ? "⏳ Loading harvest details..." : "⏳ Đang tải chi tiết thu hoạch...")}
          </p>
        </div>
      )}

      {loading ? (
        <EmptyState  className="panel" title={<>{(lang === 'en' ? "Loading harvests..." : "Đang tải danh sách thu hoạch...")}</>} description={<>{(lang === 'en' ? "Retrieving harvest batch history for this season." : "Hệ thống đang truy xuất lịch sử các lô thu hoạch của mùa vụ.")}</>} icon={<>⏳</>} />
      ) : loadError ? (
        <EmptyState role="alert" className="panel" title={<>{(lang === 'en' ? "Unable to load harvest data" : "Không thể tải dữ liệu thu hoạch")}</>} description={<>{translate(loadError)}</>} icon={<>⚠️</>} action={<><div className="button-row" style={{ justifyContent: 'center' }}>
            <Button type="button" variant="primary" onClick={() => loadHarvests(Number(seasonInput))}>
              {(lang === 'en' ? "Retry" : "Thử lại")}
            </Button>
          </div></>} />
      ) : cropSeasonId === null ? (
        <EmptyState  className="panel" title={<>{(lang === 'en' ? selectedFarm ? "Enter a season ID to view harvests" : "Select a farm first" : selectedFarm ? 'Nhập ID mùa vụ để xem thu hoạch' : 'Hãy chọn trang trại trước')}</>} description={<>
            {(lang === 'en' ? "Enter the ID of a season belonging to " : "Nhập mã số định danh (ID) mùa vụ thuộc ")} <strong>{(lang === 'en' ? selectedFarm?.farmName || "the selected farm" : selectedFarm?.farmName || 'trang trại đang chọn')}</strong> {(lang === 'en' ? " in the search toolbar to view and record harvests." : " trên thanh công cụ tìm kiếm để xem và ghi nhận các đợt thu hoạch nông sản.")}
          </>} icon={<>🌾</>} />
      ) : records.length === 0 ? (
        <EmptyState  className="panel" title={<>{(lang === 'en' ? "No harvests recorded yet" : "Chưa có đợt thu hoạch nào được ghi nhận")}</>} description={<>{lang === 'en' ? 'When harvest time arrives, click "Record Harvest Batch" to log crop yield per block and issue VietGAP traceability codes.' : 'Khi đến vụ thu hoạch, hãy nhấn "Ghi nhận đợt thu hoạch" để lưu sản lượng theo từng lô đất và cấp mã truy xuất nguồn gốc VietGAP.'}</>} icon={<>📦</>} action={<><div className="button-row" style={{ justifyContent: 'center' }}>
            <Button
              type="button"
              variant="primary"
              disabled={loading || detailLoading || saving}
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            >
              <Icon name="plus" size={16} /> {lang === 'en' ? 'Record Harvest Batch' : 'Ghi nhận đợt thu hoạch'}
            </Button>
          </div></>} />
      ) : (
        <div className="panel" style={{ padding: '24px' }}>
          <div className="panel-title" style={{ marginBottom: '18px' }}>
            <div>
              <h2 style={{ margin: 0 }}>{(lang === 'en' ? "Harvest batches" : "Danh sách lô thu hoạch")}</h2>
            </div>
          </div>

          {records.length > 0 && (
            <div className="zone-clean-filter-bar" style={{ marginBottom: '20px' }}>
              <div className="zone-clean-search" style={{ flex: '1 1 280px' }}>
                <span className="search-icon" aria-hidden="true">
                  <Icon name="search" size={17} />
                </span>
                <input
                  className="ui-input"
                  id="harvest-sub-search"
                  type="search"
                  placeholder={lang === 'en' ? 'Search by lot code, traceability code, block name, warehouse...' : 'Tìm theo mã lô, mã truy xuất, tên lô đất, nơi lưu kho...'}
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                  aria-label={lang === 'en' ? 'Search harvest batches' : 'Tìm kiếm lô thu hoạch'}
                />
              </div>

              <div className="zone-clean-select-wrap">
                <select
                  className="ui-select"
                  id="harvest-sub-grade"
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  aria-label={lang === 'en' ? 'Filter by quality' : 'Lọc theo phẩm chất'}
                >
                  <option value="">{(lang === 'en' ? "All qualities" : "Tất cả phẩm chất")}</option>
                  {uniqueGrades.map((g) => (
                    <option key={g} value={g}>
                      {translate(g)}
                    </option>
                  ))}
                </select>
                <span className="select-arrow"><Icon name="chevron" size={16} /></span>
              </div>

              <button
                type="button"
                className="zone-clean-reload-btn"
                title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
                aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
                onClick={() => {
                  setKeywordFilter('');
                  setGradeFilter('');
                  setBlockFilter('ALL');
                }}
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>
          )}

          {filteredRecords.length === 0 && (
            <EmptyState
              role="status"
              title={lang === 'en' ? 'No matching harvest batches' : 'Không có lô thu hoạch phù hợp'}
              description={lang === 'en'
                ? 'No harvest batches match the selected block and filters. Try selecting another block or changing the filters.'
                : 'Chưa có lô thu hoạch phù hợp với lô trồng và bộ lọc đang chọn. Hãy chọn lô khác hoặc thay đổi bộ lọc.'}
            />
          )}

          {filteredRecords.length > 0 && <div className="zone-table-wrap">
            <table className="ui-data-table harvest-list-table">
              <caption className="sr-only">{lang === 'en' ? 'Harvest batches' : 'Danh sách lô thu hoạch'}</caption>
              <thead><tr>
                <th style={{ width: '16%' }}>{lang === 'en' ? 'Harvest batch' : 'Mã lô thu hoạch'}</th>
                <th style={{ width: '13%' }}>{lang === 'en' ? 'Growing block' : 'Lô trồng'}</th>
                <th style={{ width: '13%' }}>{lang === 'en' ? 'Harvest date' : 'Ngày thu hoạch'}</th>
                <th style={{ width: '14%' }}>{lang === 'en' ? 'Yield' : 'Sản lượng'}</th>
                <th style={{ width: '13%' }}>{lang === 'en' ? 'Quality grade' : 'Phẩm chất'}</th>
                <th style={{ width: '18%', whiteSpace: 'nowrap' }}>{lang === 'en' ? 'PHI Compliance' : 'Chuẩn cách ly (PHI)'}</th>
                <th style={{ width: '13%', textAlign: 'center', whiteSpace: 'nowrap' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
              </tr></thead>
              <tbody>{filteredRecords.map(r => {
                const matchedBlk = seasonBlocks.find(sb => sb.blockId === r.blockId) ?? (seasonBlocks.length === 1 ? seasonBlocks[0] : null);
                const blockName = localizeBlockName(r.blockName || matchedBlk?.blockName);
                const compactGrade = r.qualityGrade?.replace(/\s*\([^()]*\)\s*$/, '').trim()
                  .replace(/^(?:Grade|Loại)\s*(\d+)$/i, `${lang === 'en' ? 'Grade' : 'Loại'} $1`);
                const recordPhiViolation = checkPhiViolation(r.blockId, r.harvestedAt);
                return <tr key={r.harvestRecordId} data-harvest-id={r.harvestRecordId}>
                  <td><strong>{r.harvestLotCode || '#' + r.harvestRecordId}</strong></td>
                  <td><strong>{blockName || '—'}</strong></td>
                  <td>{displayDate(r.harvestedAt, lang)}</td>
                  <td><strong style={{ color: 'var(--color-primary-text)' }}>{displayNumber(r.quantity, lang)} {translate(r.unit)}</strong></td>
                  <td><StatusBadge tone="neutral" label={compactGrade || (lang === 'en' ? 'Standard' : 'Tiêu chuẩn')} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {recordPhiViolation ? (
                      <span
                        title={lang === 'en' ? `PHI Violation: ${recordPhiViolation.materialName} (${recordPhiViolation.daysRemaining} days remaining)` : `Vi phạm PHI: ${recordPhiViolation.materialName} (còn thiếu ${recordPhiViolation.daysRemaining} ngày)`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⚠️ {lang === 'en' ? 'PHI Warning' : 'Cảnh báo PHI'}
                      </span>
                    ) : (
                      <span
                        title={lang === 'en' ? 'Safe from Pre-Harvest Interval violation' : 'Đảm bảo thời gian cách ly an toàn VietGAP'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ✓ {lang === 'en' ? 'PHI Safe' : 'Đạt chuẩn PHI'}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="table-action-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button
                        type="button"
                        className="table-icon-btn primary"
                        title={(lang === 'en' ? "View details" : "Xem chi tiết")}
                        aria-label={(lang === 'en' ? `Batch details ${r.harvestLotCode || r.harvestRecordId}` : `Chi tiết lô ${r.harvestLotCode || r.harvestRecordId}`)}
                        disabled={detailLoading}
                        onClick={() => openHarvest(r.harvestRecordId)}
                      >
                        <Icon name="eye" size={16} />
                        <span className="sr-only">{(lang === 'en' ? "Details" : "Chi tiết")}</span>
                      </button>
                      <button
                        type="button"
                        className="table-icon-btn edit"
                        title={(lang === 'en' ? "Edit" : "Chỉnh sửa")}
                        aria-label={(lang === 'en' ? `Edit batch ${r.harvestLotCode || r.harvestRecordId}` : `Chỉnh sửa lô ${r.harvestLotCode || r.harvestRecordId}`)}
                        disabled={detailLoading}
                        onClick={() => openHarvest(r.harvestRecordId, true)}
                      >
                        <Icon name="edit" size={16} />
                        <span className="sr-only">{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</span>
                      </button>
                    </div>
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>}
        </div>
      )}

      {/* Modal: Ghi nhận / Chỉnh sửa thu hoạch */}
      <Modal structured customLayout className="modal-form-layout"
        open={isModalOpen}
        onClose={() => {
          if (!saving) setIsModalOpen(false);
        }}
        title={editingRecord ? (lang === 'en' ? 'Edit Harvest Record' : 'Chỉnh sửa thu hoạch') : (lang === 'en' ? 'Record New Harvest Batch' : 'Ghi nhận đợt thu hoạch mới')}
      >
        <div className="modal-header">
          <h2>{editingRecord ? (lang === 'en' ? 'Edit Harvest Record' : 'Chỉnh sửa thu hoạch') : (lang === 'en' ? 'Record New Harvest Batch' : 'Ghi nhận đợt thu hoạch mới')}</h2>
          <button type="button" className="modal-close" disabled={saving} aria-label={lang === 'en' ? 'Close' : 'Đóng'} onClick={() => setIsModalOpen(false)}><Icon name="close" size={18} /></button>
        </div>
        <form onSubmit={handleSaveHarvest}>
          <div className="modal-body">
          <div className="structured-field-card ui-form-context">
            <div className="structured-field-header">
              <span className="structured-field-label">{lang === 'en' ? 'Crop season' : 'Mùa vụ canh tác'}</span>
              <span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span>
            </div>
            <strong>{currentSeason?.seasonName || '—'}</strong>
            <small style={{ display: 'block', marginTop: '6px', overflowWrap: 'anywhere' }}>{selectedFarm?.farmName}</small>
          </div>



          {/* Chọn lô đất thu hoạch (thuộc mùa vụ đang chọn) */}
          {seasonBlocks.length > 0 && (
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="harvest-block-select" className="structured-field-label">
                  {(lang === 'en' ? "Harvest block (within season)" : "Lô đất thu hoạch (Thuộc mùa vụ)")}
                </label>
                <label htmlFor="harvest-block-select" className="structured-field-badge">{seasonBlocks.length} {(lang === 'en' ? " assigned blocks" : " lô được phân bổ")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="harvest-block-select"
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">{(lang === 'en' ? "-- Select harvest block --" : "-- Chọn lô đất thu hoạch --")}</option>
                  {seasonBlocks.map((sb) => (
                    <option key={sb.blockId} value={sb.blockId}>
                      {localizeBlockName(sb.blockName)} ({displayNumber(sb.plantedArea ?? sb.blockArea ?? 0, lang)} {translate(sb.areaUnit || 'm²')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className={`structured-field-card${editingRecord ? ' ui-form-context' : ''}`} style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label id="harvest-lot-code-label" htmlFor={editingRecord ? undefined : 'harvest-lot-code'} className="structured-field-label">
                  {(lang === 'en' ? "Harvest batch code " : "Mã lô thu hoạch ")} {!editingRecord && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                </label>
                <label htmlFor="harvest-lot-code" className="structured-field-badge">{(lang === 'en' ? editingRecord ? "Fixed" : "Required" : editingRecord ? 'Cố định' : 'Bắt buộc')}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                {editingRecord ? <div id="harvest-lot-code" aria-labelledby="harvest-lot-code-label" style={{ overflowWrap: 'anywhere' }}>{lotCode || '—'}</div> : (
                <input className="ui-input"
                  id="harvest-lot-code"
                  type="text"
                  required={!editingRecord}
                  maxLength={60}
                  value={lotCode}
                  onChange={(e) => setLotCode(e.target.value)}
                />
                )}
              </div>
            </div>

            <div className={`structured-field-card${editingRecord ? ' ui-form-context' : ''}`} style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label id="harvest-trace-code-label" htmlFor={editingRecord ? undefined : 'harvest-trace-code'} className="structured-field-label">
                  {(lang === 'en' ? "Traceability code " : "Mã truy xuất nguồn gốc ")} {!editingRecord && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                </label>
                <label htmlFor="harvest-trace-code" className="structured-field-badge">{(lang === 'en' ? editingRecord ? "Fixed" : "VietGAP" : editingRecord ? 'Cố định' : 'VietGAP')}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                {editingRecord ? <div id="harvest-trace-code" aria-labelledby="harvest-trace-code-label" style={{ overflowWrap: 'anywhere' }}>{traceabilityCode || '—'}</div> : (
                <input className="ui-input"
                  id="harvest-trace-code"
                  type="text"
                  required={!editingRecord}
                  value={traceabilityCode}
                  onChange={(e) => setTraceabilityCode(e.target.value)}
                />
                )}
              </div>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="harvest-date" className="structured-field-label">
                {(lang === 'en' ? "Harvest date and time " : "Ngày giờ thu hoạch ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <label htmlFor="harvest-date" className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                id="harvest-date"
                type="datetime-local"
                step="any"
                required
                value={harvestedAt}
                onChange={(e) => setHarvestedAt(e.target.value)}
              />
            </div>
          </div>

          {/* Pre-Harvest Interval (PHI) Real-time Warning or Compliance Badge */}
          {selectedBlockId && harvestedAt && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: currentFormPhiViolation ? '1.5px solid #ef4444' : phiLoadError ? '1.5px solid #d97706' : '1px solid #10b981',
                backgroundColor: currentFormPhiViolation ? '#fef2f2' : phiLoadError ? '#fffbeb' : '#f0fdf4',
                color: currentFormPhiViolation ? '#991b1b' : phiLoadError ? '#92400e' : '#166534',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              {phiLoadError ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  <span>
                    {lang === 'en'
                      ? 'Unable to verify Pre-Harvest Interval (PHI): failed to load material usage records for this season. Please check Material Usage manually before harvesting.'
                      : 'Không thể kiểm tra thời gian cách ly (PHI) do lỗi tải dữ liệu vật tư của mùa vụ. Vui lòng kiểm tra thủ công mục Sử dụng vật tư trước khi thu hoạch.'}
                  </span>
                </div>
              ) : currentFormPhiViolation ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    {(lang === 'en' ? "WARNING: PRE-HARVEST INTERVAL (PHI) VIOLATION!" : "CẢNH BÁO VI PHẠM THỜI GIAN CÁCH LY VIETGAP (PHI)!")}
                  </div>
                  <div>
                    {lang === 'en' ? (
                      <>
                        This block applied <strong>{currentFormPhiViolation.materialName}</strong> on{' '}
                        {displayDate(currentFormPhiViolation.usedAt, lang)} with a mandatory isolation period of{' '}
                        <strong>{currentFormPhiViolation.safetyIntervalDays} days</strong>. Earliest safe harvest date is{' '}
                        <strong>{displayDate(currentFormPhiViolation.safeDate.toISOString(), lang)}</strong> (
                        <span style={{ fontWeight: 700 }}>{currentFormPhiViolation.daysRemaining} days remaining</span>).
                      </>
                    ) : (
                      <>
                        Lô này vừa xử lý thuốc/phân bón <strong>{currentFormPhiViolation.materialName}</strong> vào ngày{' '}
                        {displayDate(currentFormPhiViolation.usedAt, lang)}, yêu cầu thời gian cách ly tối thiểu{' '}
                        <strong>{currentFormPhiViolation.safetyIntervalDays} ngày</strong>. Ngày an toàn sớm nhất để thu hoạch là{' '}
                        <strong>{displayDate(currentFormPhiViolation.safeDate.toISOString(), lang)}</strong> (
                        <span style={{ fontWeight: 700 }}>còn thiếu {currentFormPhiViolation.daysRemaining} ngày</span> mới hết tồn dư hóa chất).
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px' }}>✓</span>
                  <span>
                    {(lang === 'en'
                      ? "Complies with VietGAP isolation period: No active chemical Pre-Harvest Interval (PHI) on this block."
                      : "Đạt chuẩn cách ly VietGAP: Lô này không có hóa chất nào trong thời gian cách ly (PHI) tại ngày thu hoạch đã chọn.")}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <span className="structured-field-label">
                  {(lang === 'en' ? "Yield & Unit " : "Sản lượng & Đơn vị ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </span>
                <span className="structured-field-badge">{(lang === 'en' ? "Positive number" : "Số dương")}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="form-field" style={{ flex: 2, marginBottom: 0 }}>
                  <input className="ui-input"
                    aria-label={lang === 'en' ? 'Harvest Quantity' : 'Sản lượng thu hoạch'}
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                  <select className="ui-select" aria-label={lang === 'en' ? 'Unit' : 'Đơn vị'} value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {!['kg', 'tấn', 'thùng'].includes(unit) && <option value={unit}>{translate(unit)}</option>}
                    <option value="kg">kg</option>
                    <option value="tấn">{(lang === 'en' ? "tonnes" : "tấn")}</option>
                    <option value="thùng">{(lang === 'en' ? "boxes" : "thùng")}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <span className="structured-field-label">
                  {(lang === 'en' ? "Discarded / Culled Yield" : "Sản lượng loại bỏ / phế phẩm")}
                </span>
                <span className="structured-field-badge" style={{ color: '#059669', background: '#ecfdf5' }}>
                  {(lang === 'en' ? "VietGAP VG-TX-03" : "VietGAP VG-TX-03")}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="form-field" style={{ flex: 2, marginBottom: 0 }}>
                  <input className="ui-input"
                    aria-label={lang === 'en' ? 'Discarded Yield' : 'Sản lượng loại bỏ'}
                    type="number"
                    step="any"
                    min="0"
                    placeholder={lang === 'en' ? 'e.g. 15 (damaged, culled)' : 'Ví dụ: 15 (dập nát, sâu hại...)'}
                    value={discardedQuantity}
                    onChange={(e) => setDiscardedQuantity(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div style={{ flex: 1, alignSelf: 'center', fontSize: '13px', color: '#64748b', paddingLeft: '4px' }}>
                  {unit}
                </div>
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <span className="structured-field-label">{(lang === 'en' ? "Quality classification" : "Phân loại phẩm chất")}</span>
                <label htmlFor="harvest-page-control-7" className="structured-field-badge">{(lang === 'en' ? "Grade" : "Phẩm cấp")}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select id="harvest-page-control-7" className="ui-select"
                  aria-label={lang === 'en' ? 'Quality Grade' : 'Phân loại phẩm chất'}
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value)}
                >
                  {!['Loại 1 (Xuất khẩu)', 'Loại 1 (Siêu thị)', 'Loại 2 (Nội địa)', 'Chế biến'].includes(
                    qualityGrade
                  ) && <option value={qualityGrade}>{(lang === 'en' ? qualityGrade || "Unclassified" : qualityGrade || 'Chưa phân loại')}</option>}
                  <option value="Loại 1 (Xuất khẩu)">{(lang === 'en' ? "Grade 1 (Export)" : "Loại 1 (Xuất khẩu)")}</option>
                  <option value="Loại 1 (Siêu thị)">{(lang === 'en' ? "Grade 1 (Supermarket)" : "Loại 1 (Siêu thị)")}</option>
                  <option value="Loại 2 (Nội địa)">{(lang === 'en' ? "Grade 2 (Domestic)" : "Loại 2 (Nội địa)")}</option>
                  <option value="Chế biến">{(lang === 'en' ? "For processing" : "Hàng phục vụ chế biến")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <span className="structured-field-label">{(lang === 'en' ? "Storage location / Warehouse" : "Địa điểm / Kho lưu trữ bảo quản")}</span>
              <label htmlFor="harvest-page-control-8" className="structured-field-badge">{(lang === 'en' ? "Optional" : "Tùy chọn")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input id="harvest-page-control-8" className="ui-input"
                aria-label={(lang === 'en' ? "Warehouse" : "Kho lưu trữ")}
                type="text"
                maxLength={200}
                placeholder={(lang === 'en' ? "Example: Cold storage 1, Central packing area..." : "VD: Kho lạnh số 1, Khu đóng gói trung tâm...")}
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <span className="structured-field-label">{(lang === 'en' ? "Quality inspection notes" : "Ghi chú chất lượng kiểm định")}</span>
              <label htmlFor="harvest-page-control-9" className="structured-field-badge">{notes.length}{(lang === 'en' ? "/1000 characters" : "/1000 ký tự")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea id="harvest-page-control-9" className="ui-textarea"
                aria-label={(lang === 'en' ? "Notes" : "Ghi chú")}
                rows={2}
                maxLength={1000}
                placeholder={(lang === 'en' ? "Note uniformity, Brix sweetness, packaging condition..." : "Ghi chú độ đồng đều, độ ngọt Brix, tình trạng bao bì...")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          </div>
          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          {notification?.type === 'error' && !isDeleteError(translate(notification.text), notification.type) && (
            <p role="alert" className="form-error-banner" style={{ margin: '0 0 12px' }}>
              {translate(notification.text)}
            </p>
          )}
          <div className="confirm-dialog-actions" style={{ margin: 0 }}>
            <Button className="ui-cancel-button" type="button" variant="secondary" disabled={saving} onClick={() => setIsModalOpen(false)}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {(lang === 'en' ? saving ? "Saving..." : editingRecord ? "Save changes" : "Confirm harvest" : saving ? 'Đang lưu...' : editingRecord ? 'Lưu thay đổi' : 'Xác nhận thu hoạch')}
            </Button>
          </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Tem QR & Thẻ truy xuất nguồn gốc */}
      {selectedTraceRecord && (
        <Modal structured open onClose={() => setSelectedTraceRecord(null)} title={lang === 'en' ? 'Harvest Batch & Traceability Details' : 'Chi tiết thu hoạch & Tem truy xuất'}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '6px' }}>🏷️</span>
            <h3 style={{ margin: '0 0 4px', fontSize: '19px', color: 'var(--color-text)' }}>{(lang === 'en' ? "Harvest Lot Traceability Label" : "Thông tin truy xuất nguồn gốc lô thu hoạch")}</h3>
            <p className="muted" style={{ margin: '0 0 18px', fontSize: '13.5px' }}>
              {(lang === 'en' ? "Harvest batch information is transparently sourced from season diaries and production blocks" : "Thông tin lô thu hoạch được trích xuất minh bạch từ nhật ký mùa vụ và lô đất sản xuất")}
            </p>

            {/* Real QR Code Box */}
            <div
              style={{
                width: '180px',
                height: '180px',
                margin: '0 auto 14px',
                padding: '16px',
                background: '#ffffff',
                border: '2px solid #10b981',
                borderRadius: '16px',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.18)',
              }}
            >
              <QRCodeSVG
                value={(() => {
                  const code = selectedTraceRecord.traceabilityCode;
                  if (!code) return `${window.location.origin}/knowledge`;
                  const params = new URLSearchParams();
                  params.set('code', code);
                  if (selectedTraceRecord.harvestLotCode) params.set('lot', selectedTraceRecord.harvestLotCode);
                  if (selectedFarm?.farmName) params.set('farm', selectedFarm.farmName);
                  const seasonLabel = selectedTraceRecord.seasonName || currentSeason?.seasonName;
                  if (seasonLabel) params.set('season', seasonLabel);
                  if (selectedTraceRecord.blockName) params.set('block', selectedTraceRecord.blockName);
                  if (selectedTraceRecord.harvestedAt) params.set('date', selectedTraceRecord.harvestedAt);
                  params.set('qty', `${selectedTraceRecord.quantity} ${selectedTraceRecord.unit || 'kg'}`);
                  if (selectedTraceRecord.qualityGrade) params.set('grade', selectedTraceRecord.qualityGrade);
                  return `${window.location.origin}/knowledge?${params.toString()}`;
                })()}
                size={148}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
              {(lang === 'en' ? "ID: " : "Mã định danh: ")}{' '}
              <strong style={{ color: '#059669', fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.5px' }}>
                {selectedTraceRecord.traceabilityCode}
              </strong>
            </p>

            {/* VietGAP Origin Highlight Banner */}
            <div
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                marginBottom: '16px',
                borderRadius: '12px',
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
                color: 'var(--color-primary-text)',
                lineHeight: 1.55,
              }}
            >
              <strong>{(lang === 'en' ? "Traceability record (farm diary):" : "Thông tin truy xuất nguồn gốc (theo nhật ký):")}</strong> {(lang === 'en' ? " This produce batch belongs to" : " Lô nông sản thuộc")}{' '}
              <strong>
                {(lang === 'en' ? (selectedTraceRecord.seasonName ||
                    currentSeason?.seasonName) || `Season` : selectedTraceRecord.seasonName || currentSeason?.seasonName || `Mùa vụ`)}
              </strong>
              {(lang === 'en' ? ", grown in" : ", được canh tác tại")}{' '}
              <strong>
                {(lang === 'en' ? (selectedTraceRecord.blockName || matchedTraceBlock?.blockName) || "Central production area" : selectedTraceRecord.blockName || matchedTraceBlock?.blockName || 'Khu sản xuất tập trung')}
              </strong>{' '}
              {(lang === 'en' ? "of " : "của ")} <strong>{selectedTraceRecord.farmName || selectedFarm?.farmName}</strong>
              {(matchedTraceBlock?.plantedAt || currentSeason?.startDate) && (
                <>{(lang === 'en' ? ", planted on" : ", xuống giống ngày")}{' '}
                  <strong>
                    {displayDate(matchedTraceBlock?.plantedAt || currentSeason!.startDate, lang)}
                  </strong>
                </>
              )}{' '}
              {(lang === 'en' ? "and harvested on" : "và thu hoạch ngày")}{' '}
              <strong>{displayDate(selectedTraceRecord.harvestedAt, lang)}</strong>.
            </div>

            <dl className="detail-list" style={{ textAlign: 'left', marginBottom: '18px' }}>
              <div>
                <dt>{(lang === 'en' ? "Batch code" : "Mã lô hàng")}</dt>
                <dd>{selectedTraceRecord.harvestLotCode}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Yield" : "Sản lượng")}</dt>
                <dd>
                  {displayNumber(selectedTraceRecord.quantity, lang)} {translate(selectedTraceRecord.unit)}
                </dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Discarded / Culled" : "Sản lượng loại bỏ (VG-TX-03)")}</dt>
                <dd>
                  {selectedTraceRecord.discardedQuantity != null
                    ? `${displayNumber(selectedTraceRecord.discardedQuantity, lang)} ${translate(selectedTraceRecord.unit)}`
                    : `0 ${translate(selectedTraceRecord.unit)}`}
                </dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Quality" : "Phẩm chất")}</dt>
                <dd>{(lang === 'en' ? selectedTraceRecord.qualityGrade || "Not updated" : selectedTraceRecord.qualityGrade || 'Chưa cập nhật')}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? 'Farm' : 'Trang trại')}</dt>
                <dd>{selectedTraceRecord.farmName || selectedFarm?.farmName}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Crop seasons" : "Mùa vụ canh tác")}</dt>
                <dd>
                  {selectedTraceRecord.seasonName ||
                    currentSeason?.seasonName ||
                    '—'}
                </dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Growing block" : "Lô trồng")}</dt>
                <dd>{(lang === 'en' ? (selectedTraceRecord.blockName || matchedTraceBlock?.blockName) || "Not updated" : selectedTraceRecord.blockName || matchedTraceBlock?.blockName || 'Chưa cập nhật')}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Planting date" : "Ngày xuống giống")}</dt>
                <dd>
                  {(lang === 'en' ? matchedTraceBlock?.plantedAt ? displayDate(matchedTraceBlock.plantedAt, lang) : currentSeason?.startDate ? displayDate(currentSeason.startDate, lang) : "Based on season records" : matchedTraceBlock?.plantedAt
                    ? displayDate(matchedTraceBlock.plantedAt, lang)
                    : currentSeason?.startDate
                    ? displayDate(currentSeason.startDate, lang)
                    : 'Theo hồ sơ mùa vụ')}
                </dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Harvest date" : "Ngày thu hoạch")}</dt>
                <dd>{displayDate(selectedTraceRecord.harvestedAt, lang)}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Warehouse" : "Kho lưu trữ")}</dt>
                <dd>{(lang === 'en' ? selectedTraceRecord.storageLocation || "Not updated" : selectedTraceRecord.storageLocation || 'Chưa cập nhật')}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Recorded by" : "Người ghi nhận")}</dt>
                <dd>{(lang === 'en' ? selectedTraceRecord.recorderFullName || "Not updated" : selectedTraceRecord.recorderFullName || 'Chưa cập nhật')}</dd>
              </div>
              <div>
                <dt>{(lang === 'en' ? "Standard" : "Tiêu chuẩn")}</dt>
                <dd>{(lang === 'en' ? "VietGAP Good Agricultural Practices" : "Thực hành nông nghiệp tốt VietGAP")}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt>{(lang === 'en' ? "Inspection notes" : "Ghi chú kiểm định")}</dt>
                <dd>{(lang === 'en' ? selectedTraceRecord.notes || "Not updated" : selectedTraceRecord.notes || 'Chưa cập nhật')}</dd>
              </div>
            </dl>

            <div className="confirm-dialog-actions" style={{ justifyContent: 'center' }}>
              <Button type="button" variant="secondary" onClick={() => window.print()}>
                {(lang === 'en' ? " 🖨️ Print QR label " : " 🖨️ In tem QR ")}
              </Button>
              <Button className={'ui-close-action'} type="button" variant="primary" onClick={() => setSelectedTraceRecord(null)}>
                {(lang === 'en' ? "Close" : "Đóng")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
