import { soilAssessmentRecord, soilNutrients, type ApiSoilAssessmentRecord } from '../../features/production/soilAssessmentData';
import { BlockWaterAssessments } from '../../features/production/components/BlockWaterAssessments';
import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { useDetailRequest } from '../../shared/hooks/useDetailRequest';
import { message, type TranslationMessage } from "../../shared/i18n/translate";
import { TabList, tabPanelProps } from '../../shared/components/TabList';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';
import { CropCategoryCombobox } from '../../features/operations/CropCategoryCombobox';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { BlockModal } from '../../features/production/components/BlockModal';
import { RecordConditionModal } from '../../features/production/components/RecordConditionModal';
import { FarmGoongMap } from '../../features/farm-management/components/FarmGoongMap';


import { formatDate as uiFormatDate } from '../../shared/format/formatters';


import { formatDateTime as displayDateTime, formatNumber as displayNumber } from '../../shared/format/formatters';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';
import { farmRole } from '../../features/auth/accessPolicy';

import { fetchBlockById, fetchZoneById, fetchBlockConditions, deleteBlock, fetchZoneRiskHistoryApi, recordZoneRiskApi, updateRiskControlMeasuresApi, createSoilAssessmentApi, fetchSoilAssessmentHistoryApi, fetchSoilAssessmentDetailsApi, updateSoilAssessmentApi, deleteSoilAssessmentApi, fetchWaterAssessmentHistoryApi } from '../../features/production/zoneBlockService';
import type { SoilAssessmentBackendResp, WaterAssessmentBackendResp } from '../../features/production/zoneBlockService';
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
} from '../../features/production/types';
import { useRealtimeSync } from '../../shared/realtime/realtimeSync';

type BlockDetailTab = 'overview' | 'seasons' | 'conditions' | 'risks' | 'soil' | 'water';

export function BlockDetailPage() {
  const { lang, t: translate } = useLanguage();
  const navigate = useNavigate();
  const { zoneId: paramZoneId, blockId: paramBlockId } = useParams<{ zoneId?: string; blockId?: string }>();
  const blockId = parseInt((paramBlockId || '1').replace(/^blk-/, ''), 10) || 1;

  const { selectedFarm } = useFarmWorkspace();
  const detailLoader = useDetailRequest(blockId);
  const farmId = selectedFarm?.id || 1;
  const farmName = selectedFarm?.farmName || `Farm`;
  const isOwner = selectedFarm ? farmRole(selectedFarm) === 'OWNER' : true;

  const [activeTab, setActiveTab] = useState<BlockDetailTab>('overview');

  // Core Data
  const [block, setBlock] = useState<Block | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [categories, setCategories] = useState<CropCategoryResp[]>([]);
  const [blockSeasons, setBlockSeasons] = useState<Array<CropSeasonResp & { blockMapping?: CropSeasonBlockResp }>>([]);
  const [conditions, setConditions] = useState<BlockConditionObservation[]>([]);
  const [riskRecords, setRiskRecords] = useState<RiskAssessmentRecord[]>([]);
  const [soilRecords, setSoilRecords] = useState<ApiSoilAssessmentRecord[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterAssessmentBackendResp[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: TranslationMessage; type: 'success' | 'error' } | null>(null);

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
    cropCategoryName: '',
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
  const [selectedSoil, setSelectedSoil] = useState<ApiSoilAssessmentRecord | null>(null);
  const [soilDetail, setSoilDetail] = useState<SoilAssessmentBackendResp | null>(null);
  const soilDetailNutrients = useMemo<Record<string, unknown>>(() => {
    try {
      const value: unknown = JSON.parse(soilDetail?.nutrientData || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }, [soilDetail]);
  const [soilToDelete, setSoilToDelete] = useState<ApiSoilAssessmentRecord | null>(null);
  const [soilForm, setSoilForm] = useState({
    moisturePercent: '',
    imageUrl: '',
    labTestReportUrl: '',
    assessedAt: new Date().toISOString().split('T')[0],
    sampleCode: '',
    phLevel: '6.5',
    organicMatterPct: '3.5',
    heavyMetalResult: 'SAFE',
    microbialStatus: 'Đạt chuẩn QCVN 03-MT:2015/BTNMT',
    laboratoryName: 'Trung tâm Phân tích Chất lượng Nông Lâm Thủy sản',
    conclusion: 'DAT_CHUAN',
    notes: '',
    recordedByName: 'Kỹ sư Nông học',
  });

  const [soilLoadError, setSoilLoadError] = useState<string | null>(null);
  const [soilLoading, setSoilLoading] = useState(false);
  const [soilSaveError, setSoilSaveError] = useState<string | null>(null);
  const [savingSoil, setSavingSoil] = useState(false);
  const [deletingSoil, setDeletingSoil] = useState(false);
  const soilRequest = useRef(0);
  useEffect(() => () => { soilRequest.current += 1; }, [blockId, farmId]);
  const [waterLoadError, setWaterLoadError] = useState<string | null>(null);
  const [waterLoading, setWaterLoading] = useState(false);
  const waterRequest = useRef(0);
  const currentWaterBlock = useRef(blockId);
  currentWaterBlock.current = blockId;
  useEffect(() => () => { waterRequest.current += 1; }, [blockId, farmId]);

  useEffect(() => {
    void loadBlockDetails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, farmId]);

  // Silent background realtime sync for Owner & Staff
  useRealtimeSync(() => {
    void loadBlockDetails(true);
  });

  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (notificationTimer.current !== null) clearTimeout(notificationTimer.current);
  }, []);

  const showToast = (text: TranslationMessage, type: 'success' | 'error' = 'success') => {
    if (notificationTimer.current !== null) clearTimeout(notificationTimer.current);
    setNotification({ text, type });
    notificationTimer.current = setTimeout(() => setNotification(null), 4000);
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

      try {
        const beRisks = await fetchZoneRiskHistoryApi(resolvedZoneId);
        setRiskRecords((beRisks || []).map((r) => ({
          riskId: r.riskId,
          targetType: 'BLOCK',
          zoneId: r.zoneId,
          zoneName: r.zoneName || bData.zoneName,
          blockId: bData.blockId,
          blockName: bData.blockName,
          assessedAt: r.assessedAt ? r.assessedAt.split('T')[0] : new Date().toISOString().split('T')[0],
          riskType: r.riskType,
          riskLevel: (r.riskLevel ? r.riskLevel.toUpperCase() : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
          priorFindings: '',
          description: r.description || '',
          controlMeasures: r.mitigationPlan || '',
          assessedByName: r.assessedByName || 'Cán bộ kỹ thuật',
          status: 'CONTROLLED',
        })));
      } catch {
        setRiskRecords([]);
      }
      void reloadSoilHistory(blockId, resolvedZoneId, bData.blockName);
      void reloadWaterHistory(blockId);
      if (silent) setError(null);
    } catch (err) {
      if (!silent) {
        setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load production block details." : err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết lô trồng.'));
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


  const openCreateSeasonModal = () => {
    if (!block) return;
    setEditingSeason(null);
    setSeasonForm({
      seasonName: `Vụ canh tác tại ${block.blockName} (${uiFormatDate(new Date(), lang)})`,
      cropCategoryId: categories[0]?.id || 1,
      cropCategoryName: categories[0]?.categoryName || '',
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
      cropCategoryName: s.cropCategoryName || '',
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
          cropCategoryId: Number(seasonForm.cropCategoryId) || undefined,
          cropCategoryName: seasonForm.cropCategoryName?.trim() || undefined,
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
        showToast((message("Created season \"{value1}\" on {value2}!", { value1: createdSeason.seasonName, value2: block.blockName })));
      } else if (seasonModalMode === 'edit' && editingSeason) {
        const updatedSeason = await updateCropSeason(editingSeason.cropSeasonId, {
          seasonName: seasonForm.seasonName.trim(),
          cropCategoryId: Number(seasonForm.cropCategoryId) || undefined,
          cropCategoryName: seasonForm.cropCategoryName?.trim() || undefined,
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
        showToast((message("Updated season \"{value1}\"!", { value1: updatedSeason.seasonName })));
      }
      setSeasonModalMode(null);
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to save season on this Block." : err instanceof Error ? err.message : 'Không thể lưu mùa vụ trên lô trồng này.'), 'error');
    } finally {
      setSavingSeason(false);
    }
  };

  const handleSaveBlockRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;
    try {
      if (selectedRisk && riskModalMode === 'edit') {
        await updateRiskControlMeasuresApi(selectedRisk.riskId, {
          mitigationPlan: riskForm.controlMeasures,
          riskLevel: riskForm.riskLevel.toLowerCase(),
          description: riskForm.description,
          riskType: riskForm.riskType,
        });
      } else {
        await recordZoneRiskApi(block.zoneId, {
          riskType: riskForm.riskType,
          riskLevel: riskForm.riskLevel.toLowerCase(),
          description: riskForm.description,
          mitigationPlan: riskForm.controlMeasures,
          assessedAt: riskForm.assessedAt ? new Date(riskForm.assessedAt).toISOString() : new Date().toISOString(),
        });
      }
      const beRisks = await fetchZoneRiskHistoryApi(block.zoneId);
      setRiskRecords((beRisks || []).map((r) => ({
        riskId: r.riskId,
        targetType: 'BLOCK',
        zoneId: r.zoneId,
        zoneName: r.zoneName || zone?.zoneName || block.zoneName,
        blockId: block.blockId,
        blockName: block.blockName,
        assessedAt: r.assessedAt ? r.assessedAt.split('T')[0] : new Date().toISOString().split('T')[0],
        riskType: r.riskType,
        riskLevel: (r.riskLevel ? r.riskLevel.toUpperCase() : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
        priorFindings: '',
        description: r.description || '',
        controlMeasures: r.mitigationPlan || '',
        assessedByName: r.assessedByName || 'Cán bộ kỹ thuật',
        status: 'CONTROLLED',
      })));
      setRiskModalMode(null);
      showToast((message("Saved risk record for Block \"{value1}\"!", { value1: riskForm.riskType })));
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : (lang === 'en' ? 'Failed to save risk assessment.' : 'Không thể lưu hồ sơ đánh giá rủi ro.'),
        'error'
      );
    }
  };

  const reloadSoilHistory = async (bId: number, _zId: number, bName: string) => {
    if (bId !== currentWaterBlock.current) return;
    const request = ++soilRequest.current;
    setSoilLoading(true);
    setSoilLoadError(null);
    try {
      const records = await fetchSoilAssessmentHistoryApi(bId);
      if (request === soilRequest.current) setSoilRecords(records.map(record => soilAssessmentRecord(record, bName)));
    } catch (err) {
      if (request === soilRequest.current) {
        setSoilRecords([]);
        setSoilLoadError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load soil assessments.' : 'Không tải được danh sách đánh giá đất.'));
      }
    } finally {
      if (request === soilRequest.current) setSoilLoading(false);
    }
  };

  const handleViewSoilDetails = async (s: ApiSoilAssessmentRecord, mode: 'view' | 'edit' = 'view') => {
    setSoilDetail(null);
    await detailLoader.load(() => fetchSoilAssessmentDetailsApi(s.assessmentId), (detail) => {
      setSoilDetail(detail);
      const loaded = soilAssessmentRecord(detail);
      setSelectedSoil(loaded);
      setSoilSaveError(null);
      setSoilForm({
        moisturePercent: detail.moisturePercent == null ? '' : String(detail.moisturePercent),
        imageUrl: detail.imageUrl || '',
        labTestReportUrl: detail.labTestReportUrl || '',
        assessedAt: loaded.assessedAt,
        sampleCode: loaded.sampleCode,
        phLevel: String(loaded.phLevel),
        organicMatterPct: String(loaded.organicMatterPct),
        heavyMetalResult: loaded.heavyMetalResult,
        microbialStatus: loaded.microbialStatus,
        laboratoryName: loaded.laboratoryName,
        conclusion: loaded.conclusion,
        notes: detail.notes || '',
        recordedByName: loaded.recordedByName,
      });
      setSoilModalMode(mode);
    });
  };

  const handleSaveSoil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!block || savingSoil || soilModalMode === 'view') return;
    setSavingSoil(true);
    setSoilSaveError(null);
    const nutrientObj = {
      ...soilNutrients(soilDetail?.nutrientData),
      sampleCode: soilForm.sampleCode,
      organicMatterPct: soilForm.organicMatterPct === '' ? undefined : Number(soilForm.organicMatterPct),
      heavyMetalResult: soilForm.heavyMetalResult,
      microbialStatus: soilForm.microbialStatus,
      laboratoryName: soilForm.laboratoryName,
      conclusion: soilForm.conclusion,
    };
    // Keep free-text nutrient results when the API did not use the structured format.
    const originalNutrients = soilDetail?.nutrientData;
    const nutrientData = originalNutrients && Object.keys(soilNutrients(originalNutrients)).length === 0
      && !soilForm.organicMatterPct && !soilForm.heavyMetalResult && !soilForm.microbialStatus && !soilForm.laboratoryName && !soilForm.conclusion && !soilForm.sampleCode
      ? originalNutrients : JSON.stringify(nutrientObj);
    const payload = {
      soilPh: soilForm.phLevel === '' ? undefined : Number(soilForm.phLevel),
      moisturePercent: soilForm.moisturePercent === '' ? undefined : Number(soilForm.moisturePercent),
      imageUrl: soilForm.imageUrl.trim(),
      labTestReportUrl: soilForm.labTestReportUrl.trim(),
      nutrientData,
      notes: soilForm.notes,
      assessedAt: soilForm.assessedAt ? new Date(soilForm.assessedAt).toISOString() : undefined,
    };
    try {
      const saved = selectedSoil && soilModalMode === 'edit'
        ? await updateSoilAssessmentApi(selectedSoil.assessmentId, payload)
        : await createSoilAssessmentApi(block.blockId, payload);
      const record = soilAssessmentRecord(saved, block.blockName);
      setSoilRecords(previous => [record, ...previous.filter(item => item.assessmentId !== record.assessmentId)]);
      setSoilModalMode(null);
      showToast(lang === 'en' ? 'Soil assessment saved to the server.' : 'Đã lưu đánh giá đất lên hệ thống.');
      await reloadSoilHistory(block.blockId, block.zoneId, block.blockName);
    } catch (err) {
      setSoilSaveError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to save soil assessment. Please retry.' : 'Không lưu được đánh giá đất. Vui lòng thử lại.'));
    } finally {
      setSavingSoil(false);
    }
  };

  const handleConfirmDeleteSoil = async () => {
    if (!soilToDelete || !block || deletingSoil) return;
    setDeletingSoil(true);
    try {
      await deleteSoilAssessmentApi(soilToDelete.assessmentId);
      setSoilRecords(previous => previous.filter(record => record.assessmentId !== soilToDelete.assessmentId));
      setSoilToDelete(null);
      showToast(lang === 'en' ? 'Soil assessment deleted.' : 'Đã xóa đánh giá đất.');
      await reloadSoilHistory(block.blockId, block.zoneId, block.blockName);
    } catch (err) {
      setSoilToDelete(null);
      showToast((lang === 'en' ? 'Unable to delete soil assessment: ' : 'Không thể xóa đánh giá đất: ') + (err instanceof Error ? err.message : ''), 'error');
    } finally {
      setDeletingSoil(false);
    }
  };

  const reloadWaterHistory = async (targetBlockId: number) => {
    if (targetBlockId !== currentWaterBlock.current) return;
    const request = ++waterRequest.current;
    setWaterLoading(true);
    setWaterLoadError(null);
    try {
      const records = await fetchWaterAssessmentHistoryApi(targetBlockId);
      if (request === waterRequest.current) setWaterRecords(records);
    } catch (err) {
      if (request === waterRequest.current) setWaterLoadError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load water assessments.' : 'Không tải được danh sách đánh giá nước.'));
    } finally {
      if (request === waterRequest.current) setWaterLoading(false);
    }
  };

  const handleConfirmDeleteBlock = async () => {
    if (!block) return;

    if (blockSeasons.length > 0 || conditions.length > 0) {
      showToast(lang === 'en'
        ? 'Cannot delete this block because it has linked seasons or condition records.'
        : 'Không thể xóa lô trồng vì còn mùa vụ hoặc lịch sử điều kiện liên kết.', 'error');
      setIsDeleteBlockOpen(false);
      return;
    }
    try {
      await deleteBlock(block.blockId);
      navigate(`/zones/${block.zoneId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      showToast(/mùa vụ|season/i.test(errorMessage)
        ? (lang === 'en' ? 'Cannot delete this block while it is assigned to a season. Remove it from the season or complete the season first.' : 'Không thể xóa lô trồng vì đang thuộc mùa vụ. Vui lòng gỡ lô khỏi mùa vụ hoặc hoàn thành mùa vụ trước.')
        : (errorMessage || (lang === 'en' ? 'Unable to delete this block.' : 'Không thể xóa lô trồng.')), 'error');
      setIsDeleteBlockOpen(false);
    }
  };

  if (loading) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <EmptyState  className="panel" title={<>{(lang === 'en' ? "Loading details for Block #" : "Đang tải thông tin chi tiết lô trồng #")}{blockId}...</>} icon={<>⏳</>} />
      </section>
    );
  }

  if (error || !block) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <EmptyState role="alert" className="panel" title={<>{(lang === 'en' ? "Block not found" : "Không tìm thấy thông tin lô trồng")}</>} description={<>{(lang === 'en' ? error || `Block does not exist or you do not have access.` : error || `Block không tồn tại hoặc bạn không có quyền truy cập.`)}</>} icon={<>⚠️</>} action={<><Link to="/zones" className="ui-button ui-button--primary ui-back-action">{translate("Back to Zones")}</Link></>} />
      </section>
    );
  }

  const resolvedZoneName = zone?.zoneName || block.zoneName || `Zone`;

  return (
    <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
      {detailLoader.feedback}
      {/* Breadcrumb Flow: Zone List → Zone Details → Block Details */}
      <div className="production-breadcrumb">
        <Link to="/zones">{lang === 'en' ? 'Production Zones' : 'Khu vực sản xuất'}</Link>
        <span>→</span>
        <Link to={`/zones/${block.zoneId}`}>{resolvedZoneName}</Link>
        <span>→</span>
        <strong>{block.blockName}</strong>
      </div>

      {/* Screen 4 Header matching FarmRegistrationPage */}
      <PageHeading title={<>{block.blockName} · {resolvedZoneName}</>} />

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

      {/* Summary Panel matching FarmRegistrationStatus */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-title" style={{ marginBottom: '18px' }}>
          <div>
            <span className="eyebrow">{(lang === 'en' ? "Production block details" : "Hồ sơ chi tiết lô trồng")}</span>
          </div>
          <span className="profile-role-pill">
            {displayNumber(block.areaValue, lang)} {block.areaUnit === 'm2' ? 'm²' : block.areaUnit}
          </span>
        </div>

        <dl className="detail-list" style={{ marginBottom: 0 }}>
          <div>
            <dt>{(lang === 'en' ? "Block Name" : "Tên lô trồng")}</dt>
            <dd>
              {block.blockName}
            </dd>
          </div>
          <div>
            <dt>{(lang === 'en' ? "Parent zone" : "Khu vực trực thuộc")}</dt>
            <dd>
              <Link to={`/zones/${block.zoneId}`} style={{ color: 'var(--color-primary-text)', textDecoration: 'underline' }}>
                {resolvedZoneName}
              </Link>
            </dd>
          </div>
          <div>
            <dt>{(lang === 'en' ? "Farm" : "Trang trại trực thuộc")}</dt>
            <dd>{farmName}</dd>
          </div>
          <div>
            <dt>{(lang === 'en' ? "Area" : "Diện tích")}</dt>
            <dd>
              {displayNumber(block.areaValue, lang)} {block.areaUnit === 'm2' ? 'm²' : block.areaUnit}
            </dd>
          </div>
          <div>
            <dt>{(lang === 'en' ? "Soil type" : "Loại đất")}</dt>
            <dd>{(lang === 'en' ? block.soilType || "Standard agricultural soil" : block.soilType || 'Đất canh tác tiêu chuẩn')}</dd>
          </div>
          <div>
            <dt>{(lang === 'en' ? "GPS coordinates" : "Tọa độ GPS")}</dt>
            <dd>
              {(lang === 'en' ? block.latitude != null && block.longitude != null ? `${block.latitude}, ${block.longitude}` : "No coordinates provided" : block.latitude != null && block.longitude != null
                ? `${block.latitude}, ${block.longitude}`
                : 'Chưa cập nhật tọa độ')}
            </dd>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <dt>{lang === 'en' ? 'Detailed description' : 'Mô tả chi tiết'}</dt>
            <dd style={{ whiteSpace: 'pre-wrap' }}>
              {block.description || (lang === 'en' ? 'No detailed description for this block.' : 'Chưa có mô tả chi tiết cho lô trồng này.')}
            </dd>
          </div>
        </dl>
      </div>

      <div className="dashboard-actions" style={{ justifyContent: 'flex-end', marginBottom: '16px' }}>
          <Link to={`/zones/${block.zoneId}`} className="ui-button ui-button--secondary ui-back-action">
            {lang === 'en' ? 'Back' : 'Quay lại'}
          </Link>
          <Button className={'ui-edit-action'} type="button" variant="secondary" onClick={() => setIsEditBlockOpen(true)}>
            {(lang === 'en' ? "Edit Block" : "Chỉnh sửa lô trồng")}
          </Button>
          <Button type="button" variant="primary" onClick={() => setIsRecordConditionOpen(true)}>
            {(lang === 'en' ? "Record conditions" : "Ghi nhận điều kiện")}
          </Button>
          {isOwner && (
            <Button
              type="button"
              variant="danger"
              onClick={() => setIsDeleteBlockOpen(true)}
            >
              {(lang === 'en' ? "Delete Block" : "Xóa lô trồng")}
            </Button>
          )}
        </div>

      {/* 6 Tabs Navigation per specification */}
      <TabList idPrefix="block-detail" label={lang === 'en' ? 'Block details' : 'Chi tiết lô trồng'}
            value={activeTab} onChange={setActiveTab} items={[
              { value: 'overview', label: <>{(lang === 'en' ? "Overview" : "Tổng quan")}</> },
              { value: 'seasons', label: <>{(lang === 'en' ? "Crop seasons" : "Mùa vụ canh tác")}</> },
              { value: 'conditions', label: <>{(lang === 'en' ? "Environmental conditions" : "Điều kiện môi trường")}</> },
              { value: 'risks', label: <>{(lang === 'en' ? "Risk records" : "Hồ sơ rủi ro")}</> },
              { value: 'soil', label: <>{(lang === 'en' ? "Soil assessments" : "Đánh giá đất")}</> },
              { value: 'water', label: <>{(lang === 'en' ? "Water assessments" : "Đánh giá nước")}</> },
            ]} />

      {/* =========================================================
          TAB 1: OVERVIEW (Thông tin lô trồng, Zone trực thuộc & Bản đồ Goong Map)
         ========================================================= */}
      {activeTab === 'overview' && (
        <div {...tabPanelProps('block-detail', 'overview')} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="block-overview-panels">
            {/* Parent Zone & Linked Records Summary Panel */}
            <div className="panel" style={{ padding: '28px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">{(lang === 'en' ? "Parent management zone" : "Khu vực quản lý trực thuộc")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{resolvedZoneName}</h2>
                </div>
                <Link to={`/zones/${block.zoneId}`} className="ui-button ui-button--primary">
                  {(lang === 'en' ? "Zone details →" : "Chi tiết khu vực →")}
                </Link>
              </div>

              <dl className="detail-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>{(lang === 'en' ? "Parent zone" : "Khu vực trực thuộc")}</dt>
                  <dd>{resolvedZoneName}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Farm" : "Trang trại trực thuộc")}</dt>
                  <dd>{farmName}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Block seasons" : "Mùa vụ trên lô")}</dt>
                  <dd>{blockSeasons.length} {(lang === 'en' ? " seasons" : " mùa vụ")}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Record conditions" : "Ghi nhận điều kiện")}</dt>
                  <dd>{conditions.length} {(lang === 'en' ? " records" : " bản ghi")}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Soil assessment records" : "Hồ sơ đánh giá đất")}</dt>
                  <dd>{soilRecords.length} {(lang === 'en' ? " soil records" : " hồ sơ đất")}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Water assessment records" : "Hồ sơ đánh giá nước")}</dt>
                  <dd>{waterRecords.length} {(lang === 'en' ? " water records" : " hồ sơ nước")}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Goong Map View matching FarmRegistrationStatus & FarmInfoPage */}
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Production block location map" : "Bản đồ vị trí lô trồng")}</span>
                <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Field location: " : "Vị trí thực địa: ")} {block.blockName}</h2>
              </div>
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
        <div {...tabPanelProps('block-detail', 'seasons')}>
          <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">{(lang === 'en' ? "Crop seasons on " : "Danh sách mùa vụ canh tác trên ")} {block.blockName}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Crop seasons" : "Mùa vụ canh tác")}</h2>
                </div>
                          <Button type="button" variant="primary"  onClick={openCreateSeasonModal}>
              <Icon name="plus" /> {lang === 'en' ? 'Add Season' : 'Thêm mùa vụ'}
            </Button>
              </div>

          <div className="zone-clean-filter-bar" style={{ padding: '0 0 16px', borderBottom: 'none', alignItems: 'center' }}>
            <label className="form-field" style={{ flex: '1.5 1 240px', marginBottom: 0 }}>
              <span className="sr-only">
                {(lang === 'en' ? "Search seasons" : "Tìm kiếm mùa vụ")}
              </span>
              <input className="ui-input"
                id="block-season-search"
                type="search"
                placeholder={lang === 'en' ? 'Search by season name or crop...' : 'Tìm theo tên mùa vụ hoặc cây trồng...'}
                value={seasonSearch}
                onChange={(e) => setSeasonSearch(e.target.value)}
              />
            </label>

            <label className="form-field" style={{ flex: '1 1 210px', marginBottom: 0 }}>
              <span className="sr-only">
                {(lang === 'en' ? "Crop categories" : "Danh mục cây trồng")}
              </span>
              <select className="ui-select"
                id="block-season-cat"
                value={seasonCategoryFilter}
                onChange={(e) => setSeasonCategoryFilter(e.target.value)}
              >
                <option value="all">{(lang === 'en' ? "-- All categories --" : "-- Tất cả danh mục --")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field" style={{ flex: '0.8 1 180px', marginBottom: 0 }}>
              <span className="sr-only">
                {lang === 'en' ? 'Status' : 'Trạng thái'}
              </span>
              <select className="ui-select"
                id="block-season-status"
                value={seasonStatusFilter}
                onChange={(e) => setSeasonStatusFilter(e.target.value)}
              >
                <option value="all">{(lang === 'en' ? "-- All statuses --" : "-- Tất cả trạng thái --")}</option>
                <option value="planned">{(lang === 'en' ? 'Planned' : 'Dự kiến')}</option>
                <option value="active">{lang === 'en' ? 'Active' : 'Đang canh tác'}</option>
                <option value="completed">{lang === 'en' ? 'Completed' : 'Đã hoàn thành'}</option>
                <option value="cancelled">{(lang === 'en' ? "Cancelled" : "Đã hủy")}</option>
              </select>
            </label>

            <button
              type="button"
              className="zone-clean-reload-btn"
              title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}

              onClick={() => {
                setSeasonSearch('');
                setSeasonCategoryFilter('all');
                setSeasonStatusFilter('all');
              }}
            >
              <Icon name="refresh" size={16} />
            </button>


          </div>

            {filteredSeasons.length === 0 ? (
            <EmptyState  className="panel" title={<>{(lang === 'en' ? "No seasons on " : "Chưa có mùa vụ nào trên ")} {block.blockName}</>} description={<>
                {lang === 'en' ? `Click "Add Season" to initialize a new crop season for ${block.blockName}.` : `Nhấn "Thêm mùa vụ" để khởi tạo mùa vụ canh tác mới gắn trực tiếp với ${block.blockName}.`}
              </>} icon={<>🌾</>} action={<><Button type="button" variant="primary" onClick={openCreateSeasonModal}>
                <Icon name="plus" /> {lang === 'en' ? 'Add Season' : 'Thêm mùa vụ'}
              </Button></>} />
                      ) : (
              <div className="zone-table-wrap ui-table-scroll" style={{ marginBottom: 0 }} tabIndex={0}>
                <table className="ui-data-table block-seasons-table">
                  <colgroup>
                    <col style={{ width: 270 }} />
                    <col style={{ width: 190 }} />
                    <col style={{ width: 180 }} />
                    <col style={{ width: 240 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 110 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">{lang === 'en' ? 'Season Name' : 'Tên mùa vụ'}</th>
                      <th scope="col">{lang === 'en' ? 'Crop Category' : 'Danh mục cây trồng'}</th>
                      <th scope="col" style={{ textAlign: 'center' }}>{lang === 'en' ? 'Planted Area' : 'Diện tích gieo trồng'}</th>
                      <th scope="col">{lang === 'en' ? 'Timeline (Start → End)' : 'Thời gian (Bắt đầu → Kết thúc)'}</th>
                      <th scope="col" style={{ textAlign: 'center', minWidth: '150px', whiteSpace: 'nowrap' }}>{lang === 'en' ? 'Status' : 'Trạng thái'}</th>
                      <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeasons.map((s) => (
                      <tr key={s.cropSeasonId}>
                        <td>
                          <Link
                            to={`/crop-seasons/${s.cropSeasonId}`}
                            style={{ fontWeight: 750, fontSize: '15px', color: 'var(--color-text)' }}
                          >
                            {s.seasonName}
                          </Link>
                        </td>
                        <td>{(lang === 'en' ? s.cropCategoryName || `Group` : s.cropCategoryName || `Nhóm`)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-primary-text)' }}>
                          {s.blockMapping?.plantedArea ?? block.areaValue}{' '}
                          {translate(s.blockMapping?.areaUnit || block.areaUnit || 'm²')}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {s.startDate} → {(lang === 'en' ? s.endDate || "In progress" : s.endDate || 'Đang diễn ra')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="knowledge-tag" style={{ whiteSpace: 'nowrap' }}>{s.seasonStatus?.toLowerCase() === 'active' ? (lang === 'en' ? 'Active' : 'Đang canh tác') : s.seasonStatus?.toLowerCase() === 'completed' ? (lang === 'en' ? 'Completed' : 'Đã hoàn thành') : s.seasonStatus?.toLowerCase() === 'planned' ? (lang === 'en' ? 'Planned' : 'Dự kiến') : s.seasonStatus}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                            <Link
                              to={`/crop-seasons/${s.cropSeasonId}`}
                              className="table-icon-btn primary"
                              title={(lang === 'en' ? "View season details" : "Xem chi tiết mùa vụ")}
                              aria-label={(lang === 'en' ? `Details ${s.seasonName}` : `Chi tiết ${s.seasonName}`)}
                            >
                              <Icon name="eye" size={16} />
                              <span className="sr-only">{(lang === 'en' ? "View details" : "Xem chi tiết")}</span>
                            </Link>
                            <button
                              type="button"
                              className="table-icon-btn edit"
                              title={(lang === 'en' ? "Edit season" : "Chỉnh sửa mùa vụ")}
                              aria-label={(lang === 'en' ? `Edit ${s.seasonName}` : `Chỉnh sửa ${s.seasonName}`)}
                              onClick={() => openEditSeasonModal(s)}
                            >
                              <Icon name="edit" size={16} />
                              <span className="sr-only">{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}


      {/* =========================================================
          TAB 3: BLOCK CONDITIONS
         ========================================================= */}
      {activeTab === 'conditions' && (
        <div {...tabPanelProps('block-detail', 'conditions')}>
          <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">{(lang === 'en' ? "Production condition history" : "Lịch sử điều kiện sản xuất")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Environmental conditions" : "Điều kiện môi trường")}</h2>
                </div>
                <Button type="button" variant="primary" onClick={() => setIsRecordConditionOpen(true)}>
                  <Icon name="plus" /> {(lang === 'en' ? " Record conditions" : " Ghi nhận điều kiện")}
                </Button>
              </div>

          <div className="zone-clean-filter-bar" style={{ padding: '0 0 16px', borderBottom: 'none', alignItems: 'flex-end' }}>
            <label className="form-field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
              <span>{(lang === 'en' ? "From date" : "Từ ngày")}</span>
              <input className="ui-input"
                id="cond-from-date"
                type="date"
                value={condFromDate}
                onChange={(e) => setCondFromDate(e.target.value)}
              />
            </label>
            <label className="form-field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
              <span>{(lang === 'en' ? "To date" : "Đến ngày")}</span>
              <input className="ui-input"
                id="cond-to-date"
                type="date"
                value={condToDate}
                onChange={(e) => setCondToDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="zone-clean-reload-btn"
              title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}

              onClick={() => {
                setCondFromDate('');
                setCondToDate('');
              }}
            >
              <Icon name="refresh" size={16} />
            </button>
          </div>

            {filteredConditions.length === 0 ? (
            <EmptyState  className="panel" title={<>{(lang === 'en' ? "No condition history for " : "Chưa có lịch sử ghi nhận điều kiện trên ")} {block.blockName}</>} description={<>{(lang === 'en' ? "Click \"Record conditions\" to log soil conditions, moisture, or pests in this block." : "Nhấn \"Ghi nhận điều kiện\" để ghi nhận tình trạng đất, độ ẩm hoặc sâu bệnh thực tế tại lô đất này.")}</>} icon={<>📋</>} action={<><Button type="button" variant="primary" onClick={() => setIsRecordConditionOpen(true)}>
                <Icon name="plus" /> {(lang === 'en' ? " Record conditions" : " Ghi nhận điều kiện")}
              </Button></>} />
                      ) : (
              <div className="zone-table-wrap ui-table-scroll" style={{ marginBottom: 0 }} tabIndex={0}>
                <table className="ui-data-table" style={{ }}>
                  <thead>
                    <tr>
                      <th scope="col">{lang === 'en' ? 'Recorded At' : 'Thời gian ghi nhận'}</th>
                      <th scope="col">{lang === 'en' ? 'Condition Type' : 'Phân loại điều kiện'}</th>
                      <th scope="col">{lang === 'en' ? 'Description & Notes' : 'Mô tả & Ghi chú'}</th>
                      <th scope="col">{lang === 'en' ? 'Recorded By' : 'Người ghi nhận'}</th>
                      <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConditions.map((obs) => (
                      <tr key={obs.observationId}>
                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {obs.observedAt ? displayDateTime(obs.observedAt, lang) : 'N/A'}
                        </td>
                        <td>
                          <span className="knowledge-tag">{translate(obs.conditionType)}</span>
                        </td>
                        <td style={{ maxWidth: '360px', color: 'var(--color-body)', lineHeight: 1.5 }}>
                          <span style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', overflowWrap: 'anywhere' }}>
                            {obs.description}
                          </span>
                        </td>
                        <td>{(lang === 'en' ? obs.recorderFullName || "Farm staff" : obs.recorderFullName || 'Nhân sự trang trại')}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="table-icon-btn primary"
                              title={(lang === 'en' ? "View condition record details" : "Xem chi tiết ghi nhận điều kiện")}
                              aria-label={(lang === 'en' ? "View condition record details" : "Xem chi tiết ghi nhận điều kiện")}
                              onClick={() => setSelectedCondition(obs)}
                            >
                              <Icon name="eye" size={16} />
                              <span className="sr-only">{(lang === 'en' ? "View details" : "Xem chi tiết")}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* =========================================================
          TAB 4: RISK RECORDS
         ========================================================= */}
      {activeTab === 'risks' && (
        <div {...tabPanelProps('block-detail', 'risks')}>
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Risk records for " : "Hồ sơ rủi ro tại ")} {block.blockName}</span>
                <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Risk records" : "Hồ sơ rủi ro")}</h2>
              </div>
                        <Button
              type="button"
              variant="primary"

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
              <Icon name="plus" /> {lang === 'en' ? 'Add Risk Assessment' : 'Thêm đánh giá rủi ro'}
            </Button>
            </div>

          <div className="zone-clean-filter-bar" style={{ padding: '0 0 16px', borderBottom: 'none', alignItems: 'flex-end' }}>
            <label className="form-field" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <span>{(lang === 'en' ? "From date" : "Từ ngày")}</span>
              <input className="ui-input"
                type="date"
                value={riskFromDate}
                onChange={(e) => setRiskFromDate(e.target.value)}
              />
            </label>
            <label className="form-field" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <span>{(lang === 'en' ? "To date" : "Đến ngày")}</span>
              <input className="ui-input"
                type="date"
                value={riskToDate}
                onChange={(e) => setRiskToDate(e.target.value)}
              />
            </label>
            <label className="form-field" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <span>{(lang === 'en' ? "Risk level" : "Mức độ rủi ro")}</span>
              <select className="ui-select" value={riskLevelFilter} onChange={(e) => setRiskLevelFilter(e.target.value)}>
                <option value="all">{(lang === 'en' ? "-- All levels --" : "-- Tất cả mức độ --")}</option>
                <option value="LOW">{(lang === 'en' ? "Low" : "Thấp")}</option>
                <option value="MEDIUM">{(lang === 'en' ? "Medium" : "Trung bình")}</option>
                <option value="HIGH">{(lang === 'en' ? "High" : "Cao")}</option>
              </select>
            </label>
            <button
              type="button"
              className="zone-clean-reload-btn"
              title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              onClick={() => {
                setRiskFromDate('');
                setRiskToDate('');
                setRiskLevelFilter('all');
              }}
            >
              <Icon name="refresh" size={16} />
            </button>

          </div>

            <div className="zone-table-wrap ui-table-scroll" style={{ marginBottom: 0 }} tabIndex={0}>
              <table className="ui-data-table" style={{ }}>
                <thead>
                  <tr>
                    <th scope="col">{lang === 'en' ? 'Assessment Date' : 'Ngày đánh giá'}</th>
                    <th scope="col">{lang === 'en' ? 'Risk Type' : 'Loại rủi ro'}</th>
                    <th scope="col" style={{ textAlign: 'center' }}>{lang === 'en' ? 'Risk Level' : 'Mức độ'}</th>
                    <th scope="col">{lang === 'en' ? 'Mitigation Measures' : 'Biện pháp kiểm soát'}</th>
                    <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRisks.map((r) => (
                    <tr key={r.riskId}>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{r.assessedAt}</td>
                      <td style={{ maxWidth: '280px' }}>
                        <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: '3px' }}>{r.riskType}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="knowledge-tag">{translate(r.riskLevel)}</span>
                      </td>
                      <td style={{ maxWidth: '300px', fontSize: '13.5px', color: 'var(--color-text)', lineHeight: 1.5 }}>
                        <span className="ui-text-preview">{r.controlMeasures}</span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title={(lang === 'en' ? "View details" : "Xem chi tiết")}
                            aria-label={(lang === 'en' ? `Details ${r.riskType}` : `Chi tiết ${r.riskType}`)}
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
                            <span className="sr-only">{(lang === 'en' ? "View details" : "Xem chi tiết")}</span>
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            title={(lang === 'en' ? "Update measures" : "Cập nhật biện pháp")}
                            aria-label={(lang === 'en' ? `Update measures ${r.riskType}` : `Cập nhật biện pháp ${r.riskType}`)}
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
                            <span className="sr-only">{(lang === 'en' ? "Update measures" : "Cập nhật biện pháp")}</span>
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
        <div {...tabPanelProps('block-detail', 'soil')}>
          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Soil sample assessment records" : "Hồ sơ đánh giá mẫu đất")}</span>
                <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Soil sample assessments" : "Đánh giá mẫu đất")}</h2>
              </div>
            <Button
              type="button"
              variant="primary"

              onClick={() => {
                setSelectedSoil(null);
                setSoilDetail(null);
                setSoilSaveError(null);
                setSoilForm({
                  moisturePercent: '',
                  imageUrl: '',
                  labTestReportUrl: '',
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
              <Icon name="plus" /> {lang === 'en' ? 'Add Soil Assessment' : 'Thêm đánh giá đất'}
            </Button>
            </div>

          <div className="zone-clean-filter-bar" style={{ padding: '0 0 16px', borderBottom: 'none', alignItems: 'flex-end' }}>
            <label className="form-field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
              <span>{(lang === 'en' ? "From date" : "Từ ngày")}</span>
              <input className="ui-input" type="date" value={soilFromDate} onChange={(e) => setSoilFromDate(e.target.value)} />
            </label>
            <label className="form-field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
              <span>{(lang === 'en' ? "To date" : "Đến ngày")}</span>
              <input className="ui-input" type="date" value={soilToDate} onChange={(e) => setSoilToDate(e.target.value)} />
            </label>
            <button
              type="button"
              className="zone-clean-reload-btn"
              title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}

              onClick={() => {
                setSoilFromDate('');
                setSoilToDate('');
                void reloadSoilHistory(block.blockId, block.zoneId, block.blockName);
              }}
            >
              <Icon name="refresh" size={16} />
            </button>

          </div>

            <div className="zone-table-wrap ui-table-scroll" style={{ marginBottom: 0 }} tabIndex={0}>
              <table className="ui-data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup><col style={{ width: '18%' }} /><col style={{ width: '12%' }} /><col style={{ width: '15%' }} /><col style={{ width: '37%' }} /><col style={{ width: '18%' }} /></colgroup>
                <thead>
                  <tr>
                    <th scope="col">{lang === 'en' ? 'Assessment date' : 'Ngày đánh giá'}</th>
                    <th scope="col">{lang === 'en' ? 'Soil pH' : 'Độ pH'}</th>
                    <th scope="col">{lang === 'en' ? 'Moisture (%)' : 'Độ ẩm (%)'}</th>
                    <th scope="col">{lang === 'en' ? 'Notes' : 'Ghi chú'}</th>
                    <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                  </tr>
                </thead>
                <tbody>
                  {soilLoading ? <tr><td colSpan={5} role="status">{lang === 'en' ? 'Loading soil assessments...' : 'Đang tải đánh giá đất...'}</td></tr> : soilLoadError ? <tr><td colSpan={5}><p role="alert">{soilLoadError}</p><Button onClick={() => void reloadSoilHistory(block.blockId, block.zoneId, block.blockName)}>{lang === 'en' ? 'Retry' : 'Thử lại'}</Button></td></tr> : filteredSoil.length === 0 ? <tr><td colSpan={5}>{lang === 'en' ? 'No matching soil assessments.' : 'Chưa có đánh giá đất phù hợp.'}</td></tr> : filteredSoil.map((s) => (
                    <tr key={s.assessmentId}>
                      <td>{uiFormatDate(s.assessedAt, lang)}</td>
                      <td>{s.soilPh ?? '—'}</td>
                      <td>{s.moisturePercent ?? '—'}</td>
                      <td><span className="ui-text-preview">{s.notes?.trim() || '—'}</span></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title={(lang === 'en' ? "View details" : "Xem chi tiết")}
                            aria-label={(lang === 'en' ? `Soil sample details ${s.sampleCode}` : `Chi tiết mẫu đất ${s.sampleCode}`)}
                            onClick={() => handleViewSoilDetails(s)}
                          >
                            <Icon name="eye" size={16} />
                            <span className="sr-only">{(lang === 'en' ? "View details" : "Xem chi tiết")}</span>
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            title={(lang === 'en' ? "Edit soil assessment" : "Chỉnh sửa đánh giá đất")}
                            aria-label={(lang === 'en' ? `Edit soil sample ${s.sampleCode}` : `Chỉnh sửa mẫu đất ${s.sampleCode}`)}
                            onClick={() => void handleViewSoilDetails(s, 'edit')}
                          >
                            <Icon name="edit" size={16} />
                            <span className="sr-only">{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</span>
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn danger"
                            title={(lang === 'en' ? "Delete soil assessment" : "Xóa đánh giá đất")}
                            aria-label={(lang === 'en' ? `Delete soil sample ${s.sampleCode}` : `Xóa mẫu đất ${s.sampleCode}`)}
                            onClick={() => setSoilToDelete(s)}
                          >
                            <Icon name="trash" size={16} />
                            <span className="sr-only">{(lang === 'en' ? "Delete" : "Xóa")}</span>
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
        <div {...tabPanelProps('block-detail', 'water')}>
          <BlockWaterAssessments key={block.blockId} blockId={block.blockId} blockName={block.blockName} zoneName={resolvedZoneName}
            records={waterRecords} error={waterLoadError} loading={waterLoading} onReload={() => { void reloadWaterHistory(block.blockId); }}
            onSaved={record => setWaterRecords(previous => [record, ...previous.filter(item => item.assessmentId !== record.assessmentId)])} />
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
          showToast((message("Updated Block \"{value1}\" successfully!", { value1: saved.blockName })));
        }}
      />

      <RecordConditionModal
        isOpen={isRecordConditionOpen}
        block={{ ...block, zoneName: resolvedZoneName }}
        onClose={() => setIsRecordConditionOpen(false)}
        onSuccess={(obs) => {
          setConditions((prev) => [obs, ...prev]);
          showToast((message("Saved condition record ({value1}) for {value2}!", { value1: obs.conditionType, value2: block.blockName })));
        }}
      />

      {/* Condition Record Details Modal */}
      {selectedCondition && (
        <Modal structured open customLayout onClose={() => setSelectedCondition(null)} style={{ width: 'min(620px, 100%)' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">{lang === 'en' ? 'Condition record details' : 'Chi tiết ghi nhận điều kiện'}</span>
                <h2>{translate(selectedCondition.conditionType)}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedCondition(null)} aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'}>
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-body">
              <dl className="detail-list" style={{ margin: 0 }}>
                <div>
                  <dt>{translate("Block")}</dt>
                  <dd>{block.blockName}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Zone" : "Khu vực")}</dt>
                  <dd>{resolvedZoneName}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Recorded at" : "Thời gian ghi nhận")}</dt>
                  <dd>{displayDateTime(selectedCondition.observedAt, lang)}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Recorded by" : "Người ghi nhận")}</dt>
                  <dd>{(lang === 'en' ? selectedCondition.recorderFullName || "Farm staff" : selectedCondition.recorderFullName || 'Nhân sự trang trại')}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>{lang === 'en' ? 'Description & Notes' : 'Mô tả & Ghi chú'}</dt>
                  <dd>{selectedCondition.description}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>{lang === 'en' ? 'Evidence Image URL' : 'Đường dẫn hình ảnh minh chứng'}</dt>
                  <dd>
                    {selectedCondition.imageUrl ? (
                      /^https?:\/\//i.test(selectedCondition.imageUrl) ? (
                        <a href={selectedCondition.imageUrl} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>
                          {selectedCondition.imageUrl}
                        </a>
                      ) : selectedCondition.imageUrl
                    ) : (lang === 'en' ? 'No evidence image provided.' : 'Chưa có đường dẫn ảnh minh chứng.')}
                  </dd>
                </div>
              </dl>
              <div className="confirm-dialog-actions" style={{ marginTop: '24px' }}>
                <Button className={'ui-close-action'} type="button" variant="secondary" onClick={() => setSelectedCondition(null)}>
                  {(lang === 'en' ? "Close" : "Đóng")}
                </Button>
              </div>
            </div>
          </Modal>
      )}

      {/* Create / Edit Crop Season Modal (Auto-filled Block) */}
      {seasonModalMode && (
        <Modal structured open customLayout onClose={() => setSeasonModalMode(null)} style={{ width: 'min(660px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Block season" : "Mùa vụ trên lô trồng")}</span>
                <h2>
                  {seasonModalMode === 'create'
                    ? (lang === 'en' ? `Add Season to ${block.blockName}` : `Thêm mùa vụ trên ${block.blockName}`)
                    : (lang === 'en' ? `Update season: ${editingSeason?.seasonName}` : `Cập nhật mùa vụ: ${editingSeason?.seasonName}`)}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSeasonModalMode(null)}>
                ✕
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveCropSeasonOnBlock}>
              <div className="structured-field-card ui-form-context" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-border)', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: 'var(--color-border)' }}>
                  <span className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>
                    {(lang === 'en' ? "Applicable Block" : "Lô trồng áp dụng")}
                  </span>
                  <span className="structured-field-badge">{(lang === 'en' ? "Automatically filled" : "Tự động điền")}</span>
                </div>
                <strong style={{ color: 'var(--color-primary-text)' }}>
                  {block.blockName} · {resolvedZoneName} ({block.areaValue} {translate(block.areaUnit)})
                </strong>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="cs-name-input" className="structured-field-label">
                    {(lang === 'en' ? "Season name " : "Tên mùa vụ ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <label htmlFor="cs-name-input" className="structured-field-badge">{seasonForm.seasonName.length}{(lang === 'en' ? "/120 characters" : "/120 ký tự")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input className="ui-input"
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
                      {(lang === 'en' ? "Crop categories " : "Danh mục cây trồng ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <CropCategoryCombobox
                      id="cs-cat-select"
                      value={seasonForm.cropCategoryId}
                      categoryName={seasonForm.cropCategoryName}
                      categories={categories}
                      onChange={(catId, catName) =>
                        setSeasonForm((prev) => ({
                          ...prev,
                          cropCategoryId: catId,
                          cropCategoryName: catName,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-area-input" className="structured-field-label">
                      {(lang === 'en' ? "Planted area (" : "Diện tích gieo trồng (")}{translate(block.areaUnit)}) <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input className="ui-input"
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
                      {(lang === 'en' ? "Start date " : "Ngày bắt đầu ")} <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input className="ui-input"
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
                      {(lang === 'en' ? "Expected end date" : "Ngày kết thúc dự kiến")}
                    </label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input className="ui-input"
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
                    {(lang === 'en' ? "Season notes" : "Ghi chú mùa vụ")}
                  </label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea className="ui-textarea"
                    id="cs-notes-input"
                    rows={3}
                    value={seasonForm.notes}
                    onChange={(e) => setSeasonForm({ ...seasonForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <Button className="ui-cancel-button" type="button" variant="secondary" onClick={() => setSeasonModalMode(null)}>
                  {(lang === 'en' ? "Cancel" : "Hủy")}
                </Button>
                <Button type="submit" variant="primary" loading={savingSeason}>
                  {(lang === 'en' ? savingSeason ? "Saving..." : seasonModalMode === 'create' ? "Create season" : "Save changes" : savingSeason ? 'Đang lưu...' : seasonModalMode === 'create' ? 'Tạo mùa vụ' : 'Lưu thay đổi')}
                </Button>
              </div>
            </form>
          </Modal>
      )}

      {/* Block Risk Record Modal */}
      {riskModalMode && (
        <Modal structured open customLayout className="risk-assessment-modal" onClose={() => setRiskModalMode(null)} style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <h2>
                  {riskModalMode === 'create'
                    ? (lang === 'en' ? 'Add Risk Record' : 'Thêm ghi nhận rủi ro')
                    : riskModalMode === 'edit'
                    ? (lang === 'en' ? 'Update risk assessment' : 'Cập nhật đánh giá rủi ro')
                    : (lang === 'en' ? 'Risk assessment details' : 'Chi tiết đánh giá rủi ro')}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setRiskModalMode(null)}>
                ✕
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSaveBlockRisk}>
              <div className="structured-field-card ui-form-context" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-border)', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: 'var(--color-border)' }}>
                  <span className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>
                    {(lang === 'en' ? "Applicable Block" : "Lô trồng áp dụng")}
                  </span>
                  <span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span>
                </div>
                <strong style={{ color: 'var(--color-primary-text)' }}>{block.blockName} · {resolvedZoneName}</strong>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="block-detail-page-control-14" className="structured-field-label">{(lang === 'en' ? "Assessment date" : "Ngày đánh giá")}</label>
                    <span className="structured-field-badge">{lang === 'en' ? 'Date' : 'Ngày'}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input id="block-detail-page-control-14" className="ui-input"
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
                    <label htmlFor="block-detail-page-control-15" className="structured-field-label">{(lang === 'en' ? "Risk level" : "Mức độ rủi ro")}</label>
                    <span className="structured-field-badge">{lang === 'en' ? 'Level' : 'Mức độ'}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <select id="block-detail-page-control-15" className="ui-select"
                      value={riskForm.riskLevel}
                      disabled={riskModalMode === 'view'}
                      onChange={(e) =>
                        setRiskForm({ ...riskForm, riskLevel: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' })
                      }
                    >
                      <option value="LOW">{(lang === 'en' ? "Low" : "Thấp")}</option>
                      <option value="MEDIUM">{(lang === 'en' ? "Medium" : "Trung bình")}</option>
                      <option value="HIGH">{(lang === 'en' ? "High" : "Cao")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="block-detail-page-control-16" className="structured-field-label">{(lang === 'en' ? "Risk type" : "Loại rủi ro")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input id="block-detail-page-control-16" className="ui-input"
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
                  <label htmlFor="block-detail-page-control-17" className="structured-field-label">{(lang === 'en' ? "Previous findings" : "Phát hiện trước đây")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea id="block-detail-page-control-17" className="ui-textarea"
                    rows={2}
                    value={riskForm.priorFindings}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, priorFindings: e.target.value })}
                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="block-detail-page-control-18" className="structured-field-label">{(lang === 'en' ? "Risk description" : "Mô tả nguy cơ rủi ro")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea id="block-detail-page-control-18" className="ui-textarea"
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
                  <label htmlFor="block-detail-page-control-19" className="structured-field-label">{(lang === 'en' ? "Control measures" : "Biện pháp kiểm soát")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea id="block-detail-page-control-19" className="ui-textarea"
                    rows={3}
                    value={riskForm.controlMeasures}
                    disabled={riskModalMode === 'view'}
                    onChange={(e) => setRiskForm({ ...riskForm, controlMeasures: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <Button className={((riskModalMode === 'view' ? '' : 'ui-cancel-button')) + ' ' + (riskModalMode === 'view' ? 'ui-close-action' : '')} type="button" variant="secondary" onClick={() => setRiskModalMode(null)}>
                  {(lang === 'en' ? riskModalMode === 'view' ? "Close" : "Cancel" : riskModalMode === 'view' ? 'Đóng' : 'Hủy')}
                </Button>
                {riskModalMode !== 'view' && (
                  <Button type="submit" variant="primary">
                    {(lang === 'en' ? "Save record" : "Lưu ghi nhận")}
                  </Button>
                )}
              </div>
            </form>
          </Modal>
      )}

      {/* Soil Assessment Modal */}
      {soilModalMode && (
        <Modal structured open customLayout onClose={() => { if (!savingSoil) setSoilModalMode(null); }} style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Soil sample assessment · " : "Đánh giá mẫu đất · ")} {block.blockName}</span>
                <h2>
                  {soilModalMode === 'create'
                    ? (lang === 'en' ? 'Add Soil Assessment' : 'Thêm đánh giá đất')
                    : soilModalMode === 'edit'
                    ? (lang === 'en' ? "Update soil assessment" : 'Cập nhật đánh giá đất')
                    : (lang === 'en' ? "Soil assessment details" : 'Chi tiết đánh giá đất')}
                </h2>
              </div>
              <button type="button" className="modal-close" disabled={savingSoil} onClick={() => setSoilModalMode(null)}>
                ✕
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSaveSoil}>
              {soilSaveError && <p role="alert" className="form-error-banner">{soilSaveError}</p>}
              <fieldset disabled={savingSoil} style={{ display: 'contents', border: 0, padding: 0, margin: 0 }}>
              <div className="structured-field-card ui-form-context" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-border)', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: 'var(--color-border)' }}>
                  <span className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>
                    {(lang === 'en' ? "Applicable Block" : "Lô trồng áp dụng")}
                  </span>
                  <span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span>
                </div>
                <strong style={{ color: 'var(--color-primary-text)' }}>{block.blockName} · {resolvedZoneName}</strong>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="block-detail-page-control-20" className="structured-field-label">{(lang === 'en' ? "Assessment date" : "Ngày đánh giá")}</label>
                    <span className="structured-field-badge">{lang === 'en' ? 'Date' : 'Ngày'}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input id="block-detail-page-control-20" className="ui-input"
                      type="date" required
                      value={soilForm.assessedAt}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => setSoilForm({ ...soilForm, assessedAt: e.target.value })}
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="block-detail-page-control-21" className="structured-field-label">{(lang === 'en' ? "Soil sample code" : "Mã mẫu đất")}</label>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input id="block-detail-page-control-21" className="ui-input"
                      type="text"
                      value={soilForm.sampleCode}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => setSoilForm({ ...soilForm, sampleCode: e.target.value })}

                    />
                  </div>
                </div>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="block-detail-page-control-22" className="structured-field-label">{(lang === 'en' ? "Soil pH" : "Độ pH đất")}</label>
                    <span className="structured-field-badge">0–14</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input id="block-detail-page-control-22" className="ui-input"
                      type="number"
                      step="0.1"
                      value={soilForm.phLevel}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => setSoilForm({ ...soilForm, phLevel: e.target.value })}

                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="block-detail-page-control-23" className="structured-field-label">{(lang === 'en' ? "Organic matter" : "Chất hữu cơ")}</label>
                    <span className="structured-field-badge">%</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input id="block-detail-page-control-23" className="ui-input"
                      type="number"
                      step="0.1"
                      value={soilForm.organicMatterPct}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => setSoilForm({ ...soilForm, organicMatterPct: e.target.value })}

                    />
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="block-detail-page-control-24" className="structured-field-label">{(lang === 'en' ? "Testing laboratory" : "Phòng kiểm nghiệm")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input id="block-detail-page-control-24" className="ui-input"
                    type="text"
                    value={soilForm.laboratoryName}
                    disabled={soilModalMode === 'view'}
                    onChange={(e) => setSoilForm({ ...soilForm, laboratoryName: e.target.value })}

                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="block-detail-page-control-25" className="structured-field-label">{lang === 'en' ? 'Microorganisms' : 'Vi sinh'}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input id="block-detail-page-control-25" className="ui-input"
                    type="text"
                    value={soilForm.microbialStatus}
                    disabled={soilModalMode === 'view'}
                    onChange={(e) => setSoilForm({ ...soilForm, microbialStatus: e.target.value })}

                  />
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="block-detail-page-control-26" className="structured-field-label">{(lang === 'en' ? "Notes & Recommendations" : "Ghi chú & Khuyến nghị")}</label>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea id="block-detail-page-control-26" className="ui-textarea"
                    rows={2}
                    value={soilForm.notes}
                    disabled={soilModalMode === 'view'}
                    onChange={(e) => setSoilForm({ ...soilForm, notes: e.target.value })}
                  />
                </div>
              </div>

              {soilModalMode !== 'view' && (
                <>
                  <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                    <div className="structured-field-card">
                      <div className="structured-field-header">
                        <label htmlFor="soil-moisture" className="structured-field-label">{lang === 'en' ? 'Soil moisture (%)' : 'Độ ẩm đất (%)'}</label>
                      </div>
                      <input id="soil-moisture" className="ui-input" type="number" min="0" max="100" step="0.1"
                        value={soilForm.moisturePercent} onChange={e => setSoilForm({ ...soilForm, moisturePercent: e.target.value })} />
                    </div>
                    <div className="structured-field-card">
                      <div className="structured-field-header">
                        <label htmlFor="soil-heavy-metals" className="structured-field-label">{lang === 'en' ? 'Heavy metal result' : 'Kết quả kim loại nặng'}</label>
                      </div>
                      <select id="soil-heavy-metals" className="ui-select" value={soilForm.heavyMetalResult}
                        onChange={e => setSoilForm({ ...soilForm, heavyMetalResult: e.target.value as typeof soilForm.heavyMetalResult })}>
                        <option value="">{lang === 'en' ? 'Not updated' : 'Chưa cập nhật'}</option>
                        <option value="SAFE">{lang === 'en' ? 'Safe' : 'An toàn'}</option>
                        <option value="WARNING">{lang === 'en' ? 'Warning' : 'Cảnh báo'}</option>
                        <option value="EXCEEDED">{lang === 'en' ? 'Exceeds limits' : 'Vượt ngưỡng'}</option>
                      </select>
                    </div>
                  </div>
                  <div className="structured-field-card">
                    <div className="structured-field-header">
                      <label htmlFor="soil-conclusion" className="structured-field-label">{lang === 'en' ? 'Conclusion' : 'Kết luận đánh giá'}</label>
                    </div>
                    <select id="soil-conclusion" className="ui-select" value={soilForm.conclusion}
                      onChange={e => setSoilForm({ ...soilForm, conclusion: e.target.value as typeof soilForm.conclusion })}>
                      <option value="">{lang === 'en' ? 'Not updated' : 'Chưa cập nhật'}</option>
                      <option value="DAT_CHUAN">{lang === 'en' ? 'Compliant' : 'Đạt chuẩn'}</option>
                      <option value="CAN_CAI_TAO">{lang === 'en' ? 'Improvement required' : 'Cần cải tạo'}</option>
                      <option value="KHONG_DAT">{lang === 'en' ? 'Non-compliant' : 'Không đạt'}</option>
                    </select>
                  </div>
                  {([
                    ['imageUrl', lang === 'en' ? 'Evidence Image URL' : 'Đường dẫn ảnh minh chứng'],
                    ['labTestReportUrl', lang === 'en' ? 'Laboratory Report URL' : 'Đường dẫn báo cáo kiểm nghiệm'],
                  ] as const).map(([field, label]) => (
                    <div className="structured-field-card" key={field}>
                      <div className="structured-field-header">
                        <label htmlFor={`soil-${field}`} className="structured-field-label">{label}</label>
                      </div>
                      <input id={`soil-${field}`} className="ui-input" type="url" placeholder="https://..."
                        value={soilForm[field]} onChange={e => setSoilForm({ ...soilForm, [field]: e.target.value })} />
                    </div>
                  ))}
                </>
              )}
              {soilModalMode === 'view' && (
                <dl className="detail-list" style={{ margin: 0 }}>
                  <div>
                    <dt>{lang === 'en' ? 'Recorded by' : 'Người ghi nhận'}</dt>
                    <dd>{soilDetail?.conductedByName || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</dd>
                  </div>
                  <div>
                    <dt>{lang === 'en' ? 'Soil moisture (%)' : 'Độ ẩm đất (%)'}</dt>
                    <dd>{soilDetail?.moisturePercent ?? (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</dd>
                  </div>
                  <div>
                    <dt>{lang === 'en' ? 'Heavy metal result' : 'Kết quả kim loại nặng'}</dt>
                    <dd>{soilDetailNutrients.heavyMetalResult === 'SAFE' ? (lang === 'en' ? 'Safe' : 'An toàn')
                      : soilDetailNutrients.heavyMetalResult === 'WARNING' ? (lang === 'en' ? 'Warning' : 'Cảnh báo')
                      : soilDetailNutrients.heavyMetalResult === 'EXCEEDED' ? (lang === 'en' ? 'Exceeds limits' : 'Vượt ngưỡng')
                      : (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</dd>
                  </div>
                  <div>
                    <dt>{lang === 'en' ? 'Conclusion' : 'Kết luận đánh giá'}</dt>
                    <dd>{soilDetailNutrients.conclusion === 'DAT_CHUAN' ? (lang === 'en' ? 'Compliant' : 'Đạt chuẩn')
                      : soilDetailNutrients.conclusion === 'CAN_CAI_TAO' ? (lang === 'en' ? 'Improvement required' : 'Cần cải tạo')
                      : soilDetailNutrients.conclusion === 'KHONG_DAT' ? (lang === 'en' ? 'Non-compliant' : 'Không đạt')
                      : (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</dd>
                  </div>
                  {[
                    { label: lang === 'en' ? 'Evidence Image URL' : 'Đường dẫn ảnh minh chứng', url: soilDetail?.imageUrl },
                    { label: lang === 'en' ? 'Laboratory Report URL' : 'Đường dẫn báo cáo kiểm nghiệm', url: soilDetail?.labTestReportUrl },
                  ].map(({ label, url }) => (
                    <div key={label} style={{ gridColumn: '1 / -1' }}>
                      <dt>{label}</dt>
                      <dd>{url ? (/^https?:\/\//i.test(url)
                        ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>{url}</a>
                        : url) : (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <Button className={((soilModalMode === 'view' ? '' : 'ui-cancel-button')) + ' ' + (soilModalMode === 'view' ? 'ui-close-action' : '')} type="button" variant="secondary" disabled={savingSoil} onClick={() => setSoilModalMode(null)}>
                  {(lang === 'en' ? soilModalMode === 'view' ? "Close" : "Cancel" : soilModalMode === 'view' ? 'Đóng' : 'Hủy')}
                </Button>
                {soilModalMode !== 'view' && (
                  <Button type="submit" variant="primary" loading={savingSoil}>
                    {(lang === 'en' ? "Save assessment" : "Lưu đánh giá")}
                  </Button>
                )}
              </div>
            </fieldset>
            </form>
          </Modal>
      )}

      <ConfirmDialog
        open={Boolean(soilToDelete)}
        loading={deletingSoil}
        title={(lang === 'en' ? "Confirm soil assessment deletion" : "Xác nhận xóa phiếu đánh giá thổ nhưỡng")}
        description={(lang === 'en' ? <>{"Are you sure you want to delete soil sample assessment \""}<strong>{soilToDelete?.sampleCode}</strong>{"\"? This will delete the data from the system."}</> : <>{"Bạn có chắc chắn muốn xóa phiếu đánh giá mẫu đất \""}<strong>{soilToDelete?.sampleCode}</strong>{"\"? Hành động này sẽ xóa dữ liệu trên hệ thống."}</>)}
        confirmLabel="Xóa đánh giá"
        tone="danger"
        onClose={() => setSoilToDelete(null)}
        onConfirm={handleConfirmDeleteSoil}
      />

      <ConfirmDialog
        open={isDeleteBlockOpen}
        title={(lang === 'en' ? "Confirm Block deletion" : "Xác nhận xóa lô trồng")}
        confirmLabel="Xóa lô trồng"
        tone="danger"
        onClose={() => setIsDeleteBlockOpen(false)}
        onConfirm={handleConfirmDeleteBlock}
      >
        <p>
          {lang === 'en' ? 'Are you sure you want to delete Block ' : 'Bạn có chắc chắn muốn xóa lô trồng '}
          &quot;<strong>{block.blockName}</strong>&quot;?
        </p>
      </ConfirmDialog>
    </section>
  );
}
