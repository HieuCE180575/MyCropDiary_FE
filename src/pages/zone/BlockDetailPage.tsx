import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';
import { farmRole } from '../../features/auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { BlockModal } from '../../features/production/components/BlockModal';
import { RecordConditionModal } from '../../features/production/components/RecordConditionModal';
import { FarmGoongMap } from '../../features/farm-management/components/FarmGoongMap';
import {
  fetchBlockById,
  fetchZoneById,
  fetchBlockConditions,
  deleteBlock,
  fetchBlockRiskRecords,
  saveRiskRecord,
  fetchBlockSoilAssessments,
  saveSoilAssessment,
  fetchBlockWaterAssessments,
  saveWaterAssessment,
} from '../../features/production/zoneBlockService';
import {
  fetchCropCategories,
  fetchCropSeasonsForBlock,
  createCropSeason,
  updateCropSeason,
  assignBlockToSeason,
  updateSeasonBlock,
  type CropCategoryResp,
  type CropSeasonResp,
  type CropSeasonBlockResp,
} from '../../features/operations/cropSeasonService';
import type {
  Block,
  Zone,
  BlockConditionObservation,
  RiskAssessmentRecord,
  SoilAssessmentRecord,
  WaterAssessmentRecord,
} from '../../features/production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

type BlockDetailTab = 'overview' | 'seasons' | 'conditions' | 'risks' | 'soil' | 'water';

export function BlockDetailPage() {
  const navigate = useNavigate();
  const { zoneId: paramZoneId, blockId: paramBlockId } = useParams<{ zoneId?: string; blockId?: string }>();
  const blockId = parseInt((paramBlockId || '1').replace(/^blk-/, ''), 10) || 1;

  const { selectedFarm } = useFarmWorkspace();
  const farmId = selectedFarm?.id || 1;
  const farmName = selectedFarm?.farmName || `Farm #${farmId}`;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  const [activeTab, setActiveTab] = useState<BlockDetailTab>('overview');

  // Core Data
  const [block, setBlock] = useState<Block | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [categories, setCategories] = useState<CropCategoryResp[]>([]);
  const [blockSeasons, setBlockSeasons] = useState<Array<CropSeasonResp & { blockMapping?: CropSeasonBlockResp }>>([]);
  const [conditions, setConditions] = useState<BlockConditionObservation[]>([]);
  const [riskRecords, setRiskRecords] = useState<RiskAssessmentRecord[]>([]);
  const [soilRecords, setSoilRecords] = useState<SoilAssessmentRecord[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterAssessmentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters per tab
  const [seasonSearch, setSeasonSearch] = useState('');
  const [seasonCategoryFilter, setSeasonCategoryFilter] = useState<string>('all');
  const [seasonStatusFilter, setSeasonStatusFilter] = useState<string>('all');

  const [condFromDate, setCondFromDate] = useState('');
  const [condToDate, setCondToDate] = useState('');

  const [riskFromDate, setRiskFromDate] = useState('');
  const [riskToDate, setRiskToDate] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');

  const [soilFromDate, setSoilFromDate] = useState('');
  const [soilToDate, setSoilToDate] = useState('');

  const [waterFromDate, setWaterFromDate] = useState('');
  const [waterToDate, setWaterToDate] = useState('');

  // Modals
  const [isEditBlockOpen, setIsEditBlockOpen] = useState(false);
  const [isRecordConditionOpen, setIsRecordConditionOpen] = useState(false);
  const [isDeleteBlockOpen, setIsDeleteBlockOpen] = useState(false);

  // Condition Record Details Modal
  const [selectedCondition, setSelectedCondition] = useState<BlockConditionObservation | null>(null);

  // Create / Edit Crop Season on this Block Modal
  const [seasonModalMode, setSeasonModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingSeason, setEditingSeason] = useState<(CropSeasonResp & { blockMapping?: CropSeasonBlockResp }) | null>(null);
  const [seasonForm, setSeasonForm] = useState({
    seasonName: '',
    cropCategoryId: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    seasonStatus: 'active',
    plantedArea: '',
    plantedAt: new Date().toISOString().split('T')[0],
    expectedHarvestAt: '',
    notes: '',
  });
  const [savingSeason, setSavingSeason] = useState(false);

  // Risk Record Modal
  const [riskModalMode, setRiskModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskAssessmentRecord | null>(null);
  const [riskForm, setRiskForm] = useState({
    assessedAt: new Date().toISOString().split('T')[0],
    riskType: 'Mầm bệnh tồn lưu trong đất',
    riskLevel: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    priorFindings: '',
    description: '',
    controlMeasures: '',
    assessedByName: 'Kỹ sư Nông học',
    status: 'CONTROLLED' as 'MONITORING' | 'CONTROLLED' | 'ACTION_REQUIRED',
  });

  // Soil Assessment Modal
  const [soilModalMode, setSoilModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedSoil, setSelectedSoil] = useState<SoilAssessmentRecord | null>(null);
  const [soilForm, setSoilForm] = useState({
    assessedAt: new Date().toISOString().split('T')[0],
    sampleCode: '',
    phLevel: '6.5',
    organicMatterPct: '3.5',
    heavyMetalResult: 'SAFE' as 'SAFE' | 'WARNING' | 'EXCEEDED',
    microbialStatus: 'Đạt chuẩn QCVN 03-MT:2015/BTNMT',
    laboratoryName: 'Trung tâm Phân tích Chất lượng Nông Lâm Thủy sản',
    conclusion: 'DAT_CHUAN' as 'DAT_CHUAN' | 'CAN_CAI_TAO' | 'KHONG_DAT',
    notes: '',
    recordedByName: 'Kỹ sư Nông học',
  });

  // Water Assessment Modal
  const [waterModalMode, setWaterModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedWater, setSelectedWater] = useState<WaterAssessmentRecord | null>(null);
  const [waterForm, setWaterForm] = useState({
    assessedAt: new Date().toISOString().split('T')[0],
    waterSource: 'Giếng khoan tầng sâu & Hồ chứa lắng lọc',
    sampleCode: '',
    phLevel: '6.8',
    ecValue: '0.45',
    coliformResult: 'SAFE' as 'SAFE' | 'EXCEEDED',
    heavyMetalResult: 'SAFE' as 'SAFE' | 'WARNING' | 'EXCEEDED',
    laboratoryName: 'Trung tâm Phân tích Chất lượng Nông Lâm Thủy sản',
    conclusion: 'DAT_CHUAN' as 'DAT_CHUAN' | 'CAN_XU_LY' | 'KHONG_DAT',
    treatmentMeasure: '',
    notes: '',
    recordedByName: 'Kỹ sư Nông học',
  });

  useEffect(() => {
    void loadBlockDetails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, farmId]);

  // Silent background realtime sync for Owner & Staff
  useRealtimeSync(() => {
    void loadBlockDetails(true);
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadBlockDetails(silent = false) {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const bData = await fetchBlockById(blockId);
      setBlock(bData);

      const resolvedZoneId = bData.zoneId || (paramZoneId ? parseInt(paramZoneId, 10) : 1);
      const [zRes, condRes, catRes, seasonsRes] = await Promise.allSettled([
        fetchZoneById(resolvedZoneId),
        fetchBlockConditions(blockId),
        fetchCropCategories(),
        fetchCropSeasonsForBlock(farmId, blockId),
      ]);

      if (zRes.status === 'fulfilled') setZone(zRes.value);
      if (condRes.status === 'fulfilled') setConditions(condRes.value);
      if (catRes.status === 'fulfilled') setCategories(catRes.value);
      if (seasonsRes.status === 'fulfilled') setBlockSeasons(seasonsRes.value);

      setRiskRecords(fetchBlockRiskRecords(resolvedZoneId, blockId));
      setSoilRecords(fetchBlockSoilAssessments(resolvedZoneId, blockId, bData.blockName));
      setWaterRecords(fetchBlockWaterAssessments(resolvedZoneId, blockId, bData.blockName));
      if (silent) setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết lô sản xuất.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const filteredSeasons = useMemo(() => {
    return blockSeasons.filter((s) => {
      const kw = seasonSearch.trim().toLowerCase();
      const matchKw =
        !kw ||
        s.seasonName.toLowerCase().includes(kw) ||
        Boolean(s.cropCategoryName && s.cropCategoryName.toLowerCase().includes(kw));
      const matchCat =
        seasonCategoryFilter === 'all' || String(s.cropCategoryId) === seasonCategoryFilter;
      const matchStatus =
        seasonStatusFilter === 'all' ||
        (s.seasonStatus || '').toLowerCase() === seasonStatusFilter.toLowerCase();
      return matchKw && matchCat && matchStatus;
    });
  }, [blockSeasons, seasonSearch, seasonCategoryFilter, seasonStatusFilter]);

  const filteredConditions = useMemo(() => {
    return conditions.filter((c) => {
      const dateStr = (c.observedAt || '').slice(0, 10);
      if (condFromDate && dateStr < condFromDate) return false;
      if (condToDate && dateStr > condToDate) return false;
      return true;
    });
  }, [conditions, condFromDate, condToDate]);

  const filteredRisks = useMemo(() => {
    return riskRecords.filter((r) => {
      const dateStr = (r.assessedAt || '').slice(0, 10);
      if (riskFromDate && dateStr < riskFromDate) return false;
      if (riskToDate && dateStr > riskToDate) return false;
      if (riskLevelFilter !== 'all' && r.riskLevel !== riskLevelFilter) return false;
      return true;
    });
  }, [riskRecords, riskFromDate, riskToDate, riskLevelFilter]);

  const filteredSoil = useMemo(() => {
    return soilRecords.filter((s) => {
      const dateStr = (s.assessedAt || '').slice(0, 10);
      if (soilFromDate && dateStr < soilFromDate) return false;
      if (soilToDate && dateStr > soilToDate) return false;
      return true;
    });
  }, [soilRecords, soilFromDate, soilToDate]);

  const filteredWater = useMemo(() => {
    return waterRecords.filter((w) => {
      const dateStr = (w.assessedAt || '').slice(0, 10);
      if (waterFromDate && dateStr < waterFromDate) return false;
      if (waterToDate && dateStr > waterToDate) return false;
      return true;
    });
  }, [waterRecords, waterFromDate, waterToDate]);

  const openCreateSeasonModal = () => {
    if (!block) return;
    setEditingSeason(null);
    setSeasonForm({
      seasonName: `Vụ canh tác tại ${block.blockName} (${new Date().toLocaleDateString('vi-VN')})`,
      cropCategoryId: categories[0]?.id || 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      seasonStatus: 'active',
      plantedArea: String(block.areaValue || 500),
      plantedAt: new Date().toISOString().split('T')[0],
      expectedHarvestAt: '',
      notes: '',
    });
    setSeasonModalMode('create');
  };

  const openEditSeasonModal = (s: CropSeasonResp & { blockMapping?: CropSeasonBlockResp }) => {
    setEditingSeason(s);
    setSeasonForm({
      seasonName: s.seasonName,
      cropCategoryId: s.cropCategoryId || categories[0]?.id || 1,
      startDate: s.startDate || new Date().toISOString().split('T')[0],
      endDate: s.endDate || '',
      seasonStatus: s.seasonStatus || 'active',
      plantedArea: String(s.blockMapping?.plantedArea ?? block?.areaValue ?? ''),
      plantedAt: s.blockMapping?.plantedAt || s.startDate || '',
      expectedHarvestAt: s.blockMapping?.expectedHarvestAt || s.endDate || '',
      notes: s.notes || '',
    });
    setSeasonModalMode('edit');
  };

  const handleSaveCropSeasonOnBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;
    setSavingSeason(true);
    try {
      if (seasonModalMode === 'create') {
        const createdSeason = await createCropSeason(farmId, {
          seasonName: seasonForm.seasonName.trim(),
          cropCategoryId: Number(seasonForm.cropCategoryId),
          startDate: seasonForm.startDate,
          endDate: seasonForm.endDate || null,
          seasonStatus: seasonForm.seasonStatus,
          notes: seasonForm.notes || null,
        });
        const mapping = await assignBlockToSeason(createdSeason.cropSeasonId, {
          blockId: block.blockId,
          plantedArea: parseFloat(seasonForm.plantedArea) || block.areaValue,
          areaUnit: block.areaUnit || 'm2',
          plantedAt: seasonForm.plantedAt || seasonForm.startDate,
          expectedHarvestAt: seasonForm.expectedHarvestAt || seasonForm.endDate || null,
        });
        setBlockSeasons((prev) => [{ ...createdSeason, blockMapping: mapping }, ...prev]);
        showToast(`Đã tạo mùa vụ "${createdSeason.seasonName}" trên ${block.blockName}!`);
      } else if (seasonModalMode === 'edit' && editingSeason) {
        const updatedSeason = await updateCropSeason(editingSeason.cropSeasonId, {
          seasonName: seasonForm.seasonName.trim(),
          cropCategoryId: Number(seasonForm.cropCategoryId),
          startDate: seasonForm.startDate,
          endDate: seasonForm.endDate || null,
          notes: seasonForm.notes || null,
        });
        const updatedMapping = await updateSeasonBlock(editingSeason.cropSeasonId, block.blockId, {
          plantedArea: parseFloat(seasonForm.plantedArea) || block.areaValue,
          areaUnit: block.areaUnit || 'm2',
          plantedAt: seasonForm.plantedAt || seasonForm.startDate,
          expectedHarvestAt: seasonForm.expectedHarvestAt || seasonForm.endDate || null,
        });
        setBlockSeasons((prev) =>
          prev.map((item) =>
            item.cropSeasonId === updatedSeason.cropSeasonId
              ? { ...updatedSeason, blockMapping: updatedMapping }
              : item
          )
        );
        showToast(`Đã cập nhật mùa vụ "${updatedSeason.seasonName}"!`);
      }
      setSeasonModalMode(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể lưu mùa vụ trên Block này.', 'error');
    } finally {
      setSavingSeason(false);
    }
  };

  const handleSaveBlockRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;
    const saved = saveRiskRecord({
      riskId: selectedRisk?.riskId,
      targetType: 'BLOCK',
      zoneId: block.zoneId,
      zoneName: zone?.zoneName || block.zoneName,
      blockId: block.blockId,
      blockName: block.blockName,
      assessedAt: riskForm.assessedAt,
      riskType: riskForm.riskType,
      riskLevel: riskForm.riskLevel,
      priorFindings: riskForm.priorFindings,
      description: riskForm.description,
      controlMeasures: riskForm.controlMeasures,
      assessedByName: riskForm.assessedByName,
      status: riskForm.status,
    });
    setRiskRecords(fetchBlockRiskRecords(block.zoneId, block.blockId));
    setRiskModalMode(null);
    showToast(`Đã lưu hồ sơ rủi ro Block "${saved.riskType}"!`);
  };

  const handleSaveSoil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;
    const saved = saveSoilAssessment({
      assessmentId: selectedSoil?.assessmentId,
      blockId: block.blockId,
      blockName: block.blockName,
      zoneId: block.zoneId,
      zoneName: zone?.zoneName || block.zoneName,
      assessedAt: soilForm.assessedAt,
      sampleCode: soilForm.sampleCode || `SOIL-${block.blockId}-${Date.now().toString().slice(-4)}`,
      phLevel: parseFloat(soilForm.phLevel) || 6.5,
      organicMatterPct: parseFloat(soilForm.organicMatterPct) || 3.5,
      heavyMetalResult: soilForm.heavyMetalResult,
      microbialStatus: soilForm.microbialStatus,
      laboratoryName: soilForm.laboratoryName,
      conclusion: soilForm.conclusion,
      notes: soilForm.notes,
      recordedByName: soilForm.recordedByName,
    });
    setSoilRecords(fetchBlockSoilAssessments(block.zoneId, block.blockId, block.blockName));
    setSoilModalMode(null);
    showToast(`Đã lưu hồ sơ đánh giá đất "${saved.sampleCode}"!`);
  };

  const handleSaveWater = (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;
    const saved = saveWaterAssessment({
      assessmentId: selectedWater?.assessmentId,
      blockId: block.blockId,
      blockName: block.blockName,
      zoneId: block.zoneId,
      zoneName: zone?.zoneName || block.zoneName,
      assessedAt: waterForm.assessedAt,
      waterSource: waterForm.waterSource,
      sampleCode: waterForm.sampleCode || `WATER-${block.blockId}-${Date.now().toString().slice(-4)}`,
      phLevel: parseFloat(waterForm.phLevel) || 6.8,
      ecValue: parseFloat(waterForm.ecValue) || 0.45,
      coliformResult: waterForm.coliformResult,
      heavyMetalResult: waterForm.heavyMetalResult,
      laboratoryName: waterForm.laboratoryName,
      conclusion: waterForm.conclusion,
      treatmentMeasure: waterForm.treatmentMeasure,
      notes: waterForm.notes,
      recordedByName: waterForm.recordedByName,
    });
    setWaterRecords(fetchBlockWaterAssessments(block.zoneId, block.blockId, block.blockName));
    setWaterModalMode(null);
    showToast(`Đã lưu hồ sơ đánh giá nước "${saved.sampleCode}"!`);
  };

  const handleConfirmDeleteBlock = async () => {
    if (!block) return;
    try {
      await deleteBlock(block.blockId);
      navigate(`/zones/${block.zoneId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa Block khi đang có dữ liệu liên kết.', 'error');
      setIsDeleteBlockOpen(false);
    }
  };

  if (loading) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin chi tiết Block #{blockId}...</h2>
        </div>
      </section>
    );
  }

  if (error || !block) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <div className="panel empty-state" role="alert">
          <div className="empty-icon">⚠️</div>
          <h2>Không tìm thấy thông tin Block</h2>
          <p>{error || `Block #${blockId} không tồn tại hoặc bạn không có quyền truy cập.`}</p>
          <Link to="/zones" className="primary-button">
            Back to Zones
          </Link>
        </div>
      </section>
    );
  }

  const resolvedZoneName = zone?.zoneName || block.zoneName || `Zone #${block.zoneId}`;
  const canDeleteBlock = isOwner && blockSeasons.length === 0 && conditions.length === 0;

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
      {/* Breadcrumb Flow: Zone List → Zone Details → Block Details */}
      <div className="production-breadcrumb">
        <Link to="/zones">Khu vực sản xuất</Link>
        <span>→</span>
        <Link to={`/zones/${block.zoneId}`}>{resolvedZoneName}</Link>
        <span>→</span>
        <strong>{block.blockName}</strong>
      </div>

      {/* Screen 4 Header matching FarmRegistrationPage */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            BLK-{String(block.blockId).padStart(3, '0')} · {resolvedZoneName} · {farmName}
          </span>
          <h1>
            {block.blockName} · {resolvedZoneName} · {farmName}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14.5px' }}>
            {block.description || 'Lô sản xuất nông nghiệp trực thuộc khu vực quản lý theo tiêu chuẩn VietGAP.'}
          </p>
        </div>

        {/* Top Buttons per spec: Back, Edit Block, Record Conditions; Owner has Delete Block when eligible */}
        <div className="dashboard-actions">
          <Link to={`/zones/${block.zoneId}`} className="action-button">
            ← Quay lại
          </Link>
          <button type="button" className="action-button" onClick={() => setIsEditBlockOpen(true)}>
            Chỉnh sửa lô đất
          </button>
          <button type="button" className="primary-button" onClick={() => setIsRecordConditionOpen(true)}>
            Ghi nhận điều kiện
          </button>
          {isOwner && (
            <button
              type="button"
              className={canDeleteBlock ? 'action-button danger' : 'action-button'}
              style={{ opacity: canDeleteBlock ? 1 : 0.55 }}
              onClick={() => {
                if (!canDeleteBlock) {
                  showToast(
                    'Không thể xóa lô đất khi đang có mùa vụ hoặc lịch sử điều kiện liên kết.',
                    'error'
                  );
                  return;
                }
                setIsDeleteBlockOpen(true);
              }}
            >
              Xóa lô đất
            </button>
          )}
        </div>
      </div>

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

      {/* Summary Panel matching FarmRegistrationStatus */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-title" style={{ marginBottom: '18px' }}>
          <div>
            <span className="eyebrow">Hồ sơ chi tiết lô sản xuất</span>
            <h2 style={{ margin: '4px 0 0' }}>
              {block.blockName} · {resolvedZoneName}
            </h2>
          </div>
          <span className="profile-role-pill">
            {block.areaValue.toLocaleString('vi-VN')} {block.areaUnit === 'm2' ? 'm²' : block.areaUnit}
          </span>
        </div>

        <dl className="detail-list" style={{ marginBottom: 0 }}>
          <div>
            <dt>Tên &amp; Mã lô đất</dt>
            <dd>
              {block.blockName} (BLK-{String(block.blockId).padStart(3, '0')})
            </dd>
          </div>
          <div>
            <dt>Khu vực trực thuộc</dt>
            <dd>
              <Link to={`/zones/${block.zoneId}`} style={{ color: '#059669', textDecoration: 'underline' }}>
                {resolvedZoneName}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Trang trại trực thuộc</dt>
            <dd>{farmName}</dd>
          </div>
          <div>
            <dt>Diện tích</dt>
            <dd>
              {block.areaValue.toLocaleString('vi-VN')} {block.areaUnit === 'm2' ? 'm²' : block.areaUnit}
            </dd>
          </div>
          <div>
            <dt>Loại đất</dt>
            <dd>{block.soilType || 'Đất canh tác tiêu chuẩn'}</dd>
          </div>
          <div>
            <dt>Tọa độ GPS</dt>
            <dd>
              {block.latitude != null && block.longitude != null
                ? `${block.latitude}, ${block.longitude}`
                : 'Chưa cập nhật tọa độ'}
            </dd>
          </div>
        </dl>
      </div>

      {/* 6 Tabs Navigation per specification */}
      <div className="zone-tabs-nav">
        <button
          type="button"
          className={activeTab === 'overview' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('overview')}
        >
          Tổng quan
        </button>
        <button
          type="button"
          className={activeTab === 'seasons' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('seasons')}
        >
          Mùa vụ canh tác ({blockSeasons.length})
        </button>
        <button
          type="button"
          className={activeTab === 'conditions' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('conditions')}
        >
          Điều kiện môi trường ({conditions.length})
        </button>
        <button
          type="button"
          className={activeTab === 'risks' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('risks')}
        >
          Hồ sơ rủi ro ({riskRecords.length})
        </button>
        <button
          type="button"
          className={activeTab === 'soil' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('soil')}
        >
          Đánh giá đất ({soilRecords.length})
        </button>
        <button
          type="button"
          className={activeTab === 'water' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('water')}
        >
          Đánh giá nước ({waterRecords.length})
        </button>
      </div>

      {/* =========================================================
          TAB 1: OVERVIEW (Thông tin Block, Zone trực thuộc & Bản đồ Goong Map)
         ========================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="profile-layout">
            {/* Block Info Panel */}
            <div className="panel" style={{ padding: '28px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">Thông tin lô sản xuất</span>
                  <h2 style={{ margin: '4px 0 0' }}>{block.blockName}</h2>
                </div>
                <button type="button" className="action-button" onClick={() => setIsEditBlockOpen(true)}>
                  Chỉnh sửa lô đất
                </button>
              </div>

              <dl className="detail-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>Mã định danh</dt>
                  <dd>#{block.blockId}</dd>
                </div>
                <div>
                  <dt>Mã lô đất</dt>
                  <dd>BLK-{String(block.blockId).padStart(3, '0')}</dd>
                </div>
                <div>
                  <dt>Diện tích</dt>
                  <dd>
                    {block.areaValue.toLocaleString('vi-VN')} {block.areaUnit === 'm2' ? 'm²' : block.areaUnit}
                  </dd>
                </div>
                <div>
                  <dt>Loại đất</dt>
                  <dd>{block.soilType || 'Chưa cập nhật'}</dd>
                </div>
                <div>
                  <dt>Vĩ độ</dt>
                  <dd>{block.latitude ?? 'Chưa cập nhật'}</dd>
                </div>
                <div>
                  <dt>Kinh độ</dt>
                  <dd>{block.longitude ?? 'Chưa cập nhật'}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>Mô tả chi tiết</dt>
                  <dd>{block.description || 'Chưa có mô tả chi tiết cho lô đất này.'}</dd>
                </div>
              </dl>
            </div>

            {/* Parent Zone & Linked Records Summary Panel */}
            <div className="panel" style={{ padding: '28px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">Khu vực quản lý trực thuộc</span>
                  <h2 style={{ margin: '4px 0 0' }}>{resolvedZoneName}</h2>
                </div>
                <Link to={`/zones/${block.zoneId}`} className="primary-button">
                  Chi tiết khu vực →
                </Link>
              </div>

              <dl className="detail-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>Khu vực trực thuộc</dt>
                  <dd>{resolvedZoneName}</dd>
                </div>
                <div>
                  <dt>Trang trại trực thuộc</dt>
                  <dd>{farmName}</dd>
                </div>
                <div>
                  <dt>Mùa vụ trên lô</dt>
                  <dd>{blockSeasons.length} mùa vụ</dd>
                </div>
                <div>
                  <dt>Ghi nhận điều kiện</dt>
                  <dd>{conditions.length} bản ghi</dd>
                </div>
                <div>
                  <dt>Hồ sơ đánh giá đất</dt>
                  <dd>{soilRecords.length} hồ sơ đất</dd>
                </div>
                <div>
                  <dt>Hồ sơ đánh giá nước</dt>
                  <dd>{waterRecords.length} hồ sơ nước</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Goong Map View matching FarmRegistrationStatus & FarmInfoPage */}
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Bản đồ vị trí lô sản xuất</span>
                <h2 style={{ margin: '4px 0 0' }}>Vị trí thực địa: {block.blockName}</h2>
              </div>
              <button type="button" className="action-button" onClick={() => setIsEditBlockOpen(true)}>
                Cập nhật tọa độ
              </button>
            </div>
            <FarmGoongMap
              farmName={`${block.blockName} (${resolvedZoneName})`}
              address={farmName}
              latitude={block.latitude ?? null}
              longitude={block.longitude ?? null}
              editable={false}
              height={340}
            />
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: CROP SEASONS
         ========================================================= */}
      {activeTab === 'seasons' && (
        <div>
          <div className="production-filter-panel">
            <label className="form-field" style={{ flex: '1.5 1 240px' }}>
              <span>
                Tìm kiếm mùa vụ
                <small style={{ color: '#059669', fontWeight: 700 }}>Từ khóa</small>
              </span>
              <input
                id="block-season-search"
                type="search"
                placeholder="Tìm theo tên mùa vụ hoặc cây trồng..."
                value={seasonSearch}
                onChange={(e) => setSeasonSearch(e.target.value)}
              />
            </label>

            <label className="form-field" style={{ flex: '1 1 210px' }}>
              <span>
                Danh mục cây trồng
                <small style={{ color: '#059669', fontWeight: 700 }}>Loại cây</small>
              </span>
              <select
                id="block-season-cat"
                value={seasonCategoryFilter}
                onChange={(e) => setSeasonCategoryFilter(e.target.value)}
              >
                <option value="all">-- Tất cả danh mục --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field" style={{ flex: '0.8 1 180px' }}>
              <span>
                Trạng thái
                <small style={{ color: '#059669', fontWeight: 700 }}>Trạng thái mùa vụ</small>
              </span>
              <select
                id="block-season-status"
                value={seasonStatusFilter}
                onChange={(e) => setSeasonStatusFilter(e.target.value)}
              >
                <option value="all">-- Tất cả trạng thái --</option>
                <option value="planned">Dự kiến</option>
                <option value="active">Đang canh tác</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </label>

            <button
              type="button"
              className="action-button"
              style={{ height: '46px' }}
              onClick={() => {
                setSeasonSearch('');
                setSeasonCategoryFilter('all');
                setSeasonStatusFilter('all');
              }}
            >
              Đặt lại bộ lọc
            </button>

            <button type="button" className="primary-button" style={{ height: '46px' }} onClick={openCreateSeasonModal}>
              <Icon name="plus" /> Thêm mùa vụ
            </button>
          </div>

          {filteredSeasons.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">🌾</div>
              <h2>Chưa có mùa vụ nào trên {block.blockName}</h2>
              <p>
                Nhấn &quot;Thêm mùa vụ&quot; để khởi tạo mùa vụ canh tác mới gắn trực tiếp với {block.blockName}.
              </p>
              <button type="button" className="primary-button" onClick={openCreateSeasonModal}>
                <Icon name="plus" /> Thêm mùa vụ
              </button>
            </div>
          ) : (
            <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">Danh sách mùa vụ canh tác trên {block.blockName}</span>
                  <h2 style={{ margin: '4px 0 0' }}>Mùa vụ canh tác ({filteredSeasons.length})</h2>
                </div>
                <button type="button" className="primary-button" onClick={openCreateSeasonModal}>
                  <Icon name="plus" /> Thêm mùa vụ
                </button>
              </div>

              <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tên mùa vụ</th>
                      <th>Danh mục cây trồng</th>
                      <th style={{ textAlign: 'center' }}>Diện tích gieo trồng</th>
                      <th>Thời gian (Bắt đầu → Kết thúc)</th>
                      <th style={{ textAlign: 'center' }}>Trạng thái</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeasons.map((s) => (
                      <tr key={s.cropSeasonId}>
                        <td>
                          <Link
                            to={`/crop-seasons/${s.cropSeasonId}`}
                            style={{ fontWeight: 750, fontSize: '15px', color: '#0f172a' }}
                          >
                            {s.seasonName}
                          </Link>
                        </td>
                        <td>{s.cropCategoryName || `Nhóm #${s.cropCategoryId}`}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                          {s.blockMapping?.plantedArea ?? block.areaValue}{' '}
                          {s.blockMapping?.areaUnit || block.areaUnit || 'm²'}
                        </td>
                        <td>
                          {s.startDate} → {s.endDate || 'Đang diễn ra'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="knowledge-tag">{s.seasonStatus}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                            <Link
                              to={`/crop-seasons/${s.cropSeasonId}`}
                              className="table-icon-btn primary"
                              title="Xem chi tiết mùa vụ"
                              aria-label={`Chi tiết ${s.seasonName}`}
                            >
                              <Icon name="eye" size={16} />
                              <span className="sr-only">Xem chi tiết</span>
                            </Link>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title="Chỉnh sửa mùa vụ"
                              aria-label={`Chỉnh sửa ${s.seasonName}`}
                              onClick={() => openEditSeasonModal(s)}
                            >
                              <Icon name="edit" size={16} />
                              <span className="sr-only">Chỉnh sửa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      {/* =========================================================
          TAB 3: BLOCK CONDITIONS
         ========================================================= */}
      {activeTab === 'conditions' && (
        <div>
          <div className="production-filter-panel">
            <label className="form-field">
              <span>Từ ngày</span>
              <input
                id="cond-from-date"
                type="date"
                value={condFromDate}
                onChange={(e) => setCondFromDate(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Đến ngày</span>
              <input
                id="cond-to-date"
                type="date"
                value={condToDate}
                onChange={(e) => setCondToDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="action-button"
              style={{ height: '46px' }}
              onClick={() => {
                setCondFromDate('');
                setCondToDate('');
              }}
            >
              Đặt lại bộ lọc
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ height: '46px' }}
              onClick={() => setIsRecordConditionOpen(true)}
            >
              <Icon name="plus" /> Ghi nhận điều kiện
            </button>
          </div>

          {filteredConditions.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">📋</div>
              <h2>Chưa có lịch sử ghi nhận điều kiện trên {block.blockName}</h2>
              <p>Nhấn &quot;Ghi nhận điều kiện&quot; để ghi nhận tình trạng đất, độ ẩm hoặc sâu bệnh thực tế tại lô đất này.</p>
              <button type="button" className="primary-button" onClick={() => setIsRecordConditionOpen(true)}>
                <Icon name="plus" /> Ghi nhận điều kiện
              </button>
            </div>
          ) : (
            <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">Lịch sử điều kiện sản xuất</span>
                  <h2 style={{ margin: '4px 0 0' }}>Điều kiện môi trường ({filteredConditions.length})</h2>
                </div>
                <button type="button" className="primary-button" onClick={() => setIsRecordConditionOpen(true)}>
                  <Icon name="plus" /> Ghi nhận điều kiện
                </button>
              </div>

              <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Thời gian ghi nhận</th>
                      <th>Phân loại điều kiện</th>
                      <th>Mô tả &amp; Ghi chú</th>
                      <th>Người ghi nhận</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConditions.map((obs) => (
                      <tr key={obs.observationId}>
                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {obs.observedAt ? new Date(obs.observedAt).toLocaleString('vi-VN') : 'N/A'}
                        </td>
                        <td>
                          <span className="knowledge-tag">{obs.conditionType}</span>
                        </td>
                        <td style={{ maxWidth: '360px', color: '#334155', lineHeight: 1.5 }}>{obs.description}</td>
                        <td>{obs.recorderFullName || 'Nhân sự trang trại'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="table-icon-btn primary"
                              title="Xem chi tiết ghi nhận điều kiện"
                              aria-label="Xem chi tiết ghi nhận điều kiện"
                              onClick={() => setSelectedCondition(obs)}
                            >
                              <Icon name="eye" size={16} />
                              <span className="sr-only">Xem chi tiết</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 4: RISK RECORDS
         ========================================================= */}
      {activeTab === 'risks' && (
        <div>
          <div className="production-filter-panel">
            <label className="form-field">
              <span>Từ ngày</span>
              <input
                type="date"
                value={riskFromDate}
                onChange={(e) => setRiskFromDate(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Đến ngày</span>
              <input
                type="date"
                value={riskToDate}
                onChange={(e) => setRiskToDate(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Mức độ rủi ro</span>
              <select value={riskLevelFilter} onChange={(e) => setRiskLevelFilter(e.target.value)}>
                <option value="all">-- Tất cả mức độ --</option>
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
              </select>
            </label>
            <button
              type="button"
              className="action-button"
              style={{ height: '46px' }}
              onClick={() => {
                setRiskFromDate('');
                setRiskToDate('');
                setRiskLevelFilter('all');
              }}
            >
              Đặt lại bộ lọc
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ height: '46px' }}
              onClick={() => {
                setSelectedRisk(null);
                setRiskForm({
                  assessedAt: new Date().toISOString().split('T')[0],
                  riskType: 'Mầm bệnh tồn lưu trong đất',
                  riskLevel: 'MEDIUM',
                  priorFindings: '',
                  description: '',
                  controlMeasures: '',
                  assessedByName: 'Kỹ sư Nông học',
                  status: 'CONTROLLED',
                });
                setRiskModalMode('create');
              }}
            >
              <Icon name="plus" /> Thêm đánh giá rủi ro
            </button>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">Hồ sơ rủi ro tại {block.blockName}</span>
                <h2 style={{ margin: '4px 0 0' }}>Hồ sơ rủi ro ({filteredRisks.length})</h2>
              </div>
            </div>

            <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ngày đánh giá</th>
                    <th>Rủi ro &amp; Phát hiện trước</th>
                    <th style={{ textAlign: 'center' }}>Mức độ</th>
                    <th>Biện pháp kiểm soát</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRisks.map((r) => (
                    <tr key={r.riskId}>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{r.assessedAt}</td>
                      <td style={{ maxWidth: '280px' }}>
                        <strong style={{ color: '#0f172a', display: 'block', marginBottom: '3px' }}>{r.riskType}</strong>
                        {r.priorFindings && (
                          <small style={{ color: '#64748b', display: 'block' }}>
                            Phát hiện trước đây: {r.priorFindings}
                          </small>
                        )}
                        <span style={{ fontSize: '13.5px', color: '#334155' }}>{r.description}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="knowledge-tag">{r.riskLevel}</span>
                      </td>
                      <td style={{ maxWidth: '300px', fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5 }}>
                        {r.controlMeasures}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title="Xem chi tiết"
                            aria-label={`Chi tiết ${r.riskType}`}
                            onClick={() => {
                              setSelectedRisk(r);
                              setRiskForm({
                                assessedAt: r.assessedAt,
                                riskType: r.riskType,
                                riskLevel: r.riskLevel,
                                priorFindings: r.priorFindings || '',
                                description: r.description,
                                controlMeasures: r.controlMeasures,
                                assessedByName: r.assessedByName,
                                status: r.status,
                              });
                              setRiskModalMode('view');
                            }}
                          >
                            <Icon name="eye" size={16} />
                            <span className="sr-only">Xem chi tiết</span>
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            title="Cập nhật biện pháp"
                            aria-label={`Cập nhật biện pháp ${r.riskType}`}
                            onClick={() => {
                              setSelectedRisk(r);
                              setRiskForm({
                                assessedAt: r.assessedAt,
                                riskType: r.riskType,
                                riskLevel: r.riskLevel,
                                priorFindings: r.priorFindings || '',
                                description: r.description,
                                controlMeasures: r.controlMeasures,
                                assessedByName: r.assessedByName,
                                status: r.status,
                              });
                              setRiskModalMode('edit');
                            }}
                          >
                            <Icon name="edit" size={16} />
                            <span className="sr-only">Cập nhật biện pháp</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: SOIL ASSESSMENTS
         ========================================================= */}
      {activeTab === 'soil' && (
        <div>
          <div className="production-filter-panel">
            <label className="form-field">
              <span>Khoảng thời gian: Từ ngày</span>
              <input type="date" value={soilFromDate} onChange={(e) => setSoilFromDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Khoảng thời gian: Đến ngày</span>
              <input type="date" value={soilToDate} onChange={(e) => setSoilToDate(e.target.value)} />
            </label>
            <button
              type="button"
              className="action-button"
              style={{ height: '46px' }}
              onClick={() => {
                setSoilFromDate('');
                setSoilToDate('');
              }}
            >
              Đặt lại bộ lọc
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ height: '46px' }}
              onClick={() => {
                setSelectedSoil(null);
                setSoilForm({
                  assessedAt: new Date().toISOString().split('T')[0],
                  sampleCode: `SOIL-${block.blockId}-${new Date().getFullYear()}`,
                  phLevel: '6.5',
                  organicMatterPct: '3.6',
                  heavyMetalResult: 'SAFE',
                  microbialStatus: 'Đạt chuẩn QCVN 03-MT:2015/BTNMT',
                  laboratoryName: 'Trung tâm Phân tích Chất lượng Nông Lâm Thủy sản',
                  conclusion: 'DAT_CHUAN',
                  notes: '',
                  recordedByName: 'Kỹ sư Nông học',
                });
                setSoilModalMode('create');
              }}
            >
              <Icon name="plus" /> Thêm đánh giá đất
            </button>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">Hồ sơ đánh giá mẫu đất</span>
                <h2 style={{ margin: '4px 0 0' }}>Đánh giá mẫu đất ({filteredSoil.length})</h2>
              </div>
            </div>

            <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ngày đánh giá</th>
                    <th>Mã mẫu &amp; Phòng kiểm nghiệm</th>
                    <th style={{ textAlign: 'center' }}>Độ pH / Chất hữu cơ (%)</th>
                    <th>Kim loại nặng &amp; Vi sinh</th>
                    <th style={{ textAlign: 'center' }}>Kết luận</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSoil.map((s) => (
                    <tr key={s.assessmentId}>
                      <td style={{ fontWeight: 700 }}>{s.assessedAt}</td>
                      <td>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{s.sampleCode}</strong>
                        <small style={{ color: '#64748b' }}>{s.laboratoryName}</small>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                        pH {s.phLevel} · OM {s.organicMatterPct}%
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '13.5px' }}>
                        <strong>Kim loại nặng: {s.heavyMetalResult === 'SAFE' ? 'An toàn' : s.heavyMetalResult}</strong>
                        <div style={{ color: '#475569' }}>{s.microbialStatus}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="knowledge-tag">
                          {s.conclusion === 'DAT_CHUAN' ? 'Đạt chuẩn VietGAP' : 'Cần cải tạo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title="Xem chi tiết"
                            aria-label={`Chi tiết mẫu đất ${s.sampleCode}`}
                            onClick={() => {
                              setSelectedSoil(s);
                              setSoilForm({
                                assessedAt: s.assessedAt,
                                sampleCode: s.sampleCode,
                                phLevel: String(s.phLevel),
                                organicMatterPct: String(s.organicMatterPct),
                                heavyMetalResult: s.heavyMetalResult,
                                microbialStatus: s.microbialStatus,
                                laboratoryName: s.laboratoryName,
                                conclusion: s.conclusion,
                                notes: s.notes || '',
                                recordedByName: s.recordedByName,
                              });
                              setSoilModalMode('view');
                            }}
                          >
                            <Icon name="eye" size={16} />
                            <span className="sr-only">Xem chi tiết</span>
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            title="Chỉnh sửa đánh giá đất"
                            aria-label={`Chỉnh sửa mẫu đất ${s.sampleCode}`}
                            onClick={() => {
                              setSelectedSoil(s);
                              setSoilForm({
                                assessedAt: s.assessedAt,
                                sampleCode: s.sampleCode,
                                phLevel: String(s.phLevel),
                                organicMatterPct: String(s.organicMatterPct),
                                heavyMetalResult: s.heavyMetalResult,
                                microbialStatus: s.microbialStatus,
                                laboratoryName: s.laboratoryName,
                                conclusion: s.conclusion,
                                notes: s.notes || '',
                                recordedByName: s.recordedByName,
                              });
                              setSoilModalMode('edit');
                            }}
                          >
                            <Icon name="edit" size={16} />
                            <span className="sr-only">Chỉnh sửa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 6: WATER ASSESSMENTS
         ========================================================= */}
      {activeTab === 'water' && (
        <div>
          <div className="production-filter-panel">
            <label className="form-field">
              <span>Khoảng thời gian: Từ ngày</span>
              <input type="date" value={waterFromDate} onChange={(e) => setWaterFromDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Khoảng thời gian: Đến ngày</span>
              <input type="date" value={waterToDate} onChange={(e) => setWaterToDate(e.target.value)} />
            </label>
            <button
              type="button"
              className="action-button"
              style={{ height: '46px' }}
              onClick={() => {
                setWaterFromDate('');
                setWaterToDate('');
              }}
            >
              Đặt lại bộ lọc
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ height: '46px' }}
              onClick={() => {
                setSelectedWater(null);
                setWaterForm({
                  assessedAt: new Date().toISOString().split('T')[0],
                  waterSource: 'Giếng khoan tầng sâu & Hồ chứa lắng lọc',
                  sampleCode: `WATER-${block.blockId}-${new Date().getFullYear()}`,
                  phLevel: '6.8',
                  ecValue: '0.45',
                  coliformResult: 'SAFE',
                  heavyMetalResult: 'SAFE',
                  laboratoryName: 'Trung tâm Phân tích Chất lượng Nông Lâm Thủy sản',
                  conclusion: 'DAT_CHUAN',
                  treatmentMeasure: 'Lọc qua hệ thống lọc cát thạch anh + lọc đĩa 120 mesh.',
                  notes: '',
                  recordedByName: 'Kỹ sư Nông học',
                });
                setWaterModalMode('create');
              }}
            >
              <Icon name="plus" /> Thêm đánh giá nước
            </button>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">Hồ sơ đánh giá nguồn nước tưới</span>
                <h2 style={{ margin: '4px 0 0' }}>Đánh giá nguồn nước ({filteredWater.length})</h2>
              </div>
            </div>

            <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ngày đánh giá</th>
                    <th>Nguồn nước &amp; Mã mẫu</th>
                    <th style={{ textAlign: 'center' }}>pH / Độ dẫn điện EC</th>
                    <th style={{ textAlign: 'center' }}>Coliform &amp; Kim loại nặng</th>
                    <th style={{ textAlign: 'center' }}>Kết luận</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWater.map((w) => (
                    <tr key={w.assessmentId}>
                      <td style={{ fontWeight: 700 }}>{w.assessedAt}</td>
                      <td>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{w.waterSource}</strong>
                        <small style={{ color: '#64748b' }}>
                          {w.sampleCode} · {w.laboratoryName}
                        </small>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                        pH {w.phLevel} · EC {w.ecValue}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '13.5px' }}>
                        Coliform: <strong>{w.coliformResult === 'SAFE' ? 'An toàn' : w.coliformResult}</strong> · KL nặng: <strong>{w.heavyMetalResult === 'SAFE' ? 'An toàn' : w.heavyMetalResult}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="knowledge-tag">
                          {w.conclusion === 'DAT_CHUAN' ? 'Đạt chuẩn QCVN' : 'Cần xử lý lọc'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title="Xem chi tiết"
                            aria-label={`Chi tiết mẫu nước ${w.sampleCode}`}
                            onClick={() => {
                              setSelectedWater(w);
                              setWaterForm({
                                assessedAt: w.assessedAt,
                                waterSource: w.waterSource,
                                sampleCode: w.sampleCode,
                                phLevel: String(w.phLevel),
                                ecValue: String(w.ecValue),
                                coliformResult: w.coliformResult,
                                heavyMetalResult: w.heavyMetalResult,
                                laboratoryName: w.laboratoryName,
                                conclusion: w.conclusion,
                                treatmentMeasure: w.treatmentMeasure || '',
                                notes: w.notes || '',
                                recordedByName: w.recordedByName,
                              });
                              setWaterModalMode('view');
                            }}
                          >
                            <Icon name="eye" size={16} />
                            <span className="sr-only">Xem chi tiết</span>
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            title="Chỉnh sửa đánh giá nguồn nước"
                            aria-label={`Chỉnh sửa mẫu nước ${w.sampleCode}`}
                            onClick={() => {
                              setSelectedWater(w);
                              setWaterForm({
                                assessedAt: w.assessedAt,
                                waterSource: w.waterSource,
                                sampleCode: w.sampleCode,
                                phLevel: String(w.phLevel),
                                ecValue: String(w.ecValue),
                                coliformResult: w.coliformResult,
                                heavyMetalResult: w.heavyMetalResult,
                                laboratoryName: w.laboratoryName,
                                conclusion: w.conclusion,
                                treatmentMeasure: w.treatmentMeasure || '',
                                notes: w.notes || '',
                                recordedByName: w.recordedByName,
                              });
                              setWaterModalMode('edit');
                            }}
                          >
                            <Icon name="edit" size={16} />
                            <span className="sr-only">Chỉnh sửa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALS FOR BLOCK DETAILS
         ========================================================= */}
      <BlockModal
        isOpen={isEditBlockOpen}
        mode="edit"
        zoneId={block.zoneId}
        zoneName={resolvedZoneName}
        lockZone={true}
        initialBlock={block}
        onClose={() => setIsEditBlockOpen(false)}
        onSuccess={(saved) => {
          setBlock(saved);
          showToast(`Đã cập nhật lô đất "${saved.blockName}" thành công!`);
        }}
      />

      <RecordConditionModal
        isOpen={isRecordConditionOpen}
        block={{ ...block, zoneName: resolvedZoneName }}
        onClose={() => setIsRecordConditionOpen(false)}
        onSuccess={(obs) => {
          setConditions((prev) => [obs, ...prev]);
          showToast(`Đã lưu hồ sơ điều kiện (${obs.conditionType}) cho ${block.blockName}!`);
        }}
      />

      {/* Condition Record Details Modal */}
      {selectedCondition && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ width: 'min(620px, 100%)' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Chi tiết ghi nhận điều kiện · #{selectedCondition.observationId}</span>
                <h2>{selectedCondition.conditionType}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedCondition(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <dl className="detail-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>Lô đất</dt>
                  <dd>{block.blockName}</dd>
                </div>
                <div>
                  <dt>Khu vực</dt>
                  <dd>{resolvedZoneName}</dd>
                </div>
                <div>
                  <dt>Thời gian ghi nhận</dt>
                  <dd>{new Date(selectedCondition.observedAt).toLocaleString('vi-VN')}</dd>
                </div>
                <div>
                  <dt>Người ghi nhận</dt>
                  <dd>{selectedCondition.recorderFullName || 'Nhân sự trang trại'}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>Mô tả &amp; Ghi chú</dt>
                  <dd>{selectedCondition.description}</dd>
                </div>
              </dl>
              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="primary-button" onClick={() => setSelectedCondition(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Crop Season Modal (Auto-filled Block) */}
      {seasonModalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ width: 'min(660px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Mùa vụ trên lô đất</span>
                <h2>
                  {seasonModalMode === 'create'
                    ? `Thêm mùa vụ trên ${block.blockName}`
                    : `Cập nhật mùa vụ: ${editingSeason?.seasonName}`}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSeasonModalMode(null)}>
                ✕
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveCropSeasonOnBlock}>
              <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                  <span className="structured-field-label" style={{ color: '#065f46' }}>
                    Lô đất áp dụng
                  </span>
                  <span className="structured-field-badge">Tự động điền</span>
                </div>
                <strong style={{ color: '#047857' }}>
                  🌿 {block.blockName} · {resolvedZoneName} ({block.areaValue} {block.areaUnit})
                </strong>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="cs-name-input" className="structured-field-label">
                    Tên mùa vụ <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span className="structured-field-badge">{seasonForm.seasonName.length}/120 ký tự</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    id="cs-name-input"
                    type="text"
                    maxLength={120}
                    value={seasonForm.seasonName}
                    onChange={(e) => setSeasonForm({ ...seasonForm, seasonName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-cat-select" className="structured-field-label">
                      Danh mục cây trồng <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <select
                      id="cs-cat-select"
                      value={seasonForm.cropCategoryId}
                      onChange={(e) => setSeasonForm({ ...seasonForm, cropCategoryId: Number(e.target.value) })}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-area-input" className="structured-field-label">
                      Diện tích gieo trồng ({block.areaUnit}) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="cs-area-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={seasonForm.plantedArea}
                      onChange={(e) => setSeasonForm({ ...seasonForm, plantedArea: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-start-input" className="structured-field-label">
                      Ngày bắt đầu <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="cs-start-input"
                      type="date"
                      value={seasonForm.startDate}
                      onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-end-input" className="structured-field-label">
                      Ngày kết thúc dự kiến
                    </label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="cs-end-input"
                      type="date"
                      value={seasonForm.endDate}
                      onChange={(e) =>
                        setSeasonForm({
                          ...seasonForm,
                          endDate: e.target.value,
                          expectedHarvestAt: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="cs-notes-input" className="structured-field-label">
                    Ghi chú mùa vụ
                  </label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    id="cs-notes-input"
                    rows={3}
                    value={seasonForm.notes}
                    onChange={(e) => setSeasonForm({ ...seasonForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="ghost-button" onClick={() => setSeasonModalMode(null)}>
                  Hủy
                </button>
                <button type="submit" className="primary-button" disabled={savingSeason}>
                  {savingSeason ? 'Đang lưu...' : seasonModalMode === 'create' ? 'Tạo mùa vụ' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Risk Record Modal */}
      {riskModalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Đánh giá rủi ro · {block.blockName}</span>
                <h2>
                  {riskModalMode === 'create'
                    ? 'Thêm ghi nhận rủi ro'
                    : riskModalMode === 'edit'
                    ? 'Cập nhật biện pháp kiểm soát'
                    : 'Chi tiết hồ sơ rủi ro'}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setRiskModalMode(null)}>
                ✕
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSaveBlockRisk}>
              <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                  <span className="structured-field-label" style={{ color: '#065f46' }}>
                    Lô đất áp dụng
                  </span>
                </div>
                <strong style={{ color: '#047857' }}>🌿 {block.blockName} · {resolvedZoneName}</strong>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Ngày đánh giá</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="date"
                      value={riskForm.assessedAt}
                      disabled={riskModalMode === 'view'}
                      onChange={(e) => setRiskForm({ ...riskForm, assessedAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Mức độ rủi ro</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <select
                      value={riskForm.riskLevel}
                      disabled={riskModalMode === 'view'}
                      onChange={(e) =>
                        setRiskForm({ ...riskForm, riskLevel: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' })
                      }
                    >
                      <option value="LOW">Thấp</option>
                      <option value="MEDIUM">Trung bình</option>
                      <option value="HIGH">Cao</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Loại rủi ro</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    value={riskForm.riskType}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, riskType: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Phát hiện trước đây</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    rows={2}
                    value={riskForm.priorFindings}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, priorFindings: e.target.value })}
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Mô tả nguy cơ rủi ro</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    rows={2}
                    value={riskForm.description}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Biện pháp kiểm soát</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    rows={3}
                    value={riskForm.controlMeasures}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, controlMeasures: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="ghost-button" onClick={() => setRiskModalMode(null)}>
                  {riskModalMode === 'view' ? 'Đóng' : 'Hủy'}
                </button>
                {riskModalMode !== 'view' && (
                  <button type="submit" className="primary-button">
                    Lưu ghi nhận
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soil Assessment Modal */}
      {soilModalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Đánh giá mẫu đất · {block.blockName}</span>
                <h2>
                  {soilModalMode === 'create'
                    ? 'Thêm đánh giá đất'
                    : soilModalMode === 'edit'
                    ? 'Cập nhật đánh giá đất'
                    : 'Chi tiết đánh giá đất'}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSoilModalMode(null)}>
                ✕
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSaveSoil}>
              <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                  <span className="structured-field-label" style={{ color: '#065f46' }}>
                    Lô đất áp dụng
                  </span>
                </div>
                <strong style={{ color: '#047857' }}>🌿 {block.blockName} · {resolvedZoneName}</strong>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Ngày đánh giá</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="date"
                      value={soilForm.assessedAt}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => setSoilForm({ ...soilForm, assessedAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Mã mẫu đất</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      value={soilForm.sampleCode}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => setSoilForm({ ...soilForm, sampleCode: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Độ pH đất</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      step="0.1"
                      value={soilForm.phLevel}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => setSoilForm({ ...soilForm, phLevel: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Chất hữu cơ (%)</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      step="0.1"
                      value={soilForm.organicMatterPct}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => setSoilForm({ ...soilForm, organicMatterPct: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Phòng kiểm nghiệm</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    value={soilForm.laboratoryName}
                    disabled={soilModalMode === 'view'}
                    onChange={(e) => setSoilForm({ ...soilForm, laboratoryName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Kim loại nặng &amp; Vi sinh</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    value={soilForm.microbialStatus}
                    disabled={soilModalMode === 'view'}
                    onChange={(e) => setSoilForm({ ...soilForm, microbialStatus: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Ghi chú &amp; Khuyến nghị</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    rows={2}
                    value={soilForm.notes}
                    disabled={soilModalMode === 'view'}
                    onChange={(e) => setSoilForm({ ...soilForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="ghost-button" onClick={() => setSoilModalMode(null)}>
                  {soilModalMode === 'view' ? 'Đóng' : 'Hủy'}
                </button>
                {soilModalMode !== 'view' && (
                  <button type="submit" className="primary-button">
                    Lưu đánh giá
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Water Assessment Modal */}
      {waterModalMode && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Đánh giá nguồn nước · {block.blockName}</span>
                <h2>
                  {waterModalMode === 'create'
                    ? 'Thêm đánh giá nước'
                    : waterModalMode === 'edit'
                    ? 'Cập nhật đánh giá nước'
                    : 'Chi tiết đánh giá nước'}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setWaterModalMode(null)}>
                ✕
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSaveWater}>
              <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                  <span className="structured-field-label" style={{ color: '#065f46' }}>
                    Lô đất áp dụng
                  </span>
                </div>
                <strong style={{ color: '#047857' }}>🌿 {block.blockName} · {resolvedZoneName}</strong>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Ngày đánh giá</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="date"
                      value={waterForm.assessedAt}
                      disabled={waterModalMode === 'view'}
                      onChange={(e) => setWaterForm({ ...waterForm, assessedAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Mã mẫu nước</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      value={waterForm.sampleCode}
                      disabled={waterModalMode === 'view'}
                      onChange={(e) => setWaterForm({ ...waterForm, sampleCode: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Nguồn nước tưới</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    value={waterForm.waterSource}
                    disabled={waterModalMode === 'view'}
                    onChange={(e) => setWaterForm({ ...waterForm, waterSource: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Độ pH nước</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      step="0.1"
                      value={waterForm.phLevel}
                      disabled={waterModalMode === 'view'}
                      onChange={(e) => setWaterForm({ ...waterForm, phLevel: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">Độ dẫn điện EC (dS/m)</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      step="0.01"
                      value={waterForm.ecValue}
                      disabled={waterModalMode === 'view'}
                      onChange={(e) => setWaterForm({ ...waterForm, ecValue: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">Biện pháp xử lý &amp; Lọc nước</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    rows={2}
                    value={waterForm.treatmentMeasure}
                    disabled={waterModalMode === 'view'}
                    onChange={(e) => setWaterForm({ ...waterForm, treatmentMeasure: e.target.value })}
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="ghost-button" onClick={() => setWaterModalMode(null)}>
                  {waterModalMode === 'view' ? 'Đóng' : 'Hủy'}
                </button>
                {waterModalMode !== 'view' && (
                  <button type="submit" className="primary-button">
                    Lưu đánh giá
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={isDeleteBlockOpen}
        title="Xác nhận xóa lô đất"
        description={`Bạn có chắc chắn muốn xóa lô đất "${block.blockName}"?`}
        confirmLabel="Xóa lô đất"
        tone="danger"
        onClose={() => setIsDeleteBlockOpen(false)}
        onConfirm={handleConfirmDeleteBlock}
      />
    </section>
  );
}
