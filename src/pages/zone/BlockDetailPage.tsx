import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../../features/farm-management/FarmWorkspace';
import { farmRole } from '../../features/auth/accessPolicy';
import { Icon } from '../../shared/components/Icon';
import { CropCategoryCombobox } from '../../features/operations/CropCategoryCombobox';
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
  createSoilAssessmentApi,
  fetchSoilAssessmentHistoryApi,
  fetchSoilAssessmentDetailsApi,
  updateSoilAssessmentApi,
  deleteSoilAssessmentApi,
  createWaterAssessmentApi,
  fetchWaterAssessmentHistoryApi,
  fetchWaterAssessmentDetailsApi,
  updateWaterAssessmentApi,
  deleteWaterAssessmentApi,
  type WaterAssessmentBackendResp,
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
import { AlertCircle } from 'lucide-react';

type BlockDetailTab = 'overview' | 'seasons' | 'conditions' | 'risks' | 'soil' | 'water';

export function BlockDetailPage() {
  const { lang, t: translate } = useLanguage();
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
  const [selectedSoil, setSelectedSoil] = useState<SoilAssessmentRecord | null>(null);
  const [soilToDelete, setSoilToDelete] = useState<SoilAssessmentRecord | null>(null);
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

  // Crop Season validation
  const [seasonErrors, setSeasonErrors] = useState<{
    seasonName?: string;
    cropCategoryId?: string;
    plantedArea?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const seasonNameRef = useRef<HTMLInputElement>(null);
  const seasonCategoryRef = useRef<HTMLDivElement>(null);
  const seasonAreaRef = useRef<HTMLInputElement>(null);
  const seasonStartDateRef = useRef<HTMLInputElement>(null);
  const seasonEndDateRef = useRef<HTMLInputElement>(null);

  // Block Risk validation
  const [riskErrors, setRiskErrors] = useState<{
    assessedAt?: string;
    riskType?: string;
    description?: string;
    controlMeasures?: string;
  }>({});

  const riskDateRef = useRef<HTMLInputElement>(null);
  const riskTypeRef = useRef<HTMLInputElement>(null);
  const riskDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const riskControlMeasuresRef = useRef<HTMLTextAreaElement>(null);

  const [soilErrors, setSoilErrors] = useState<{
    assessedAt?: string;
    sampleCode?: string;
    phLevel?: string;
    organicMatterPct?: string;
    laboratoryName?: string;
    microbialStatus?: string;
  }>({});

  const assessedAtRef = useRef<HTMLInputElement>(null);
  const sampleCodeRef = useRef<HTMLInputElement>(null);
  const phLevelRef = useRef<HTMLInputElement>(null);
  const organicMatterRef = useRef<HTMLInputElement>(null);
  const laboratoryNameRef = useRef<HTMLInputElement>(null);
  const microbialStatusRef = useRef<HTMLTextAreaElement>(null);


  const [waterErrors, setWaterErrors] = useState<{
    assessedAt?: string;
    sampleCode?: string;
    waterSource?: string;
    phLevel?: string;
    ecValue?: string;
  }>({});

  const waterDateRef = useRef<HTMLInputElement>(null);
  const waterCodeRef = useRef<HTMLInputElement>(null);
  const waterSourceRef = useRef<HTMLInputElement>(null);
  const waterPhLevelRef = useRef<HTMLInputElement>(null);
  const ecValueRef = useRef<HTMLInputElement>(null);

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
      void reloadSoilHistory(blockId, resolvedZoneId, bData.blockName);
      setWaterRecords(fetchBlockWaterAssessments(resolvedZoneId, blockId, bData.blockName));
      if (silent) setError(null);
    } catch (err) {
      if (!silent) {
        setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load production block details." : err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết lô sản xuất.'));
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

  const validateCropSeasonForm = () => {
    const newErrors: typeof seasonErrors = {};

    if (!seasonForm.seasonName.trim()) {
      newErrors.seasonName =
        lang === 'en'
          ? 'Season name is required.'
          : 'Vui lòng nhập tên mùa vụ.';
    }

    if (!seasonForm.cropCategoryId || Number(seasonForm.cropCategoryId) <= 0) {
      newErrors.cropCategoryId =
        lang === 'en'
          ? 'Please select a crop category.'
          : 'Vui lòng chọn danh mục cây trồng.';
    }

    const area = Number(seasonForm.plantedArea);
    const blockArea = Number(block?.areaValue);

    if (!seasonForm.plantedArea.trim()) {
      newErrors.plantedArea =
        lang === 'en'
          ? 'Planted area is required.'
          : 'Vui lòng nhập diện tích gieo trồng.';
    } else if (!Number.isFinite(area) || area <= 0) {
      newErrors.plantedArea =
        lang === 'en'
          ? 'Planted area must be greater than 0.'
          : 'Diện tích gieo trồng phải lớn hơn 0.';
    } else if (area > blockArea) {
      newErrors.plantedArea =
        lang === 'en'
          ? `Planted area cannot exceed the block area (${block?.areaValue} ${block?.areaUnit}).`
          : `Diện tích gieo trồng không được vượt quá diện tích Block (${block?.areaValue} ${block?.areaUnit}).`;
    }

    if (!seasonForm.startDate) {
      newErrors.startDate =
        lang === 'en'
          ? 'Start date is required.'
          : 'Vui lòng chọn ngày bắt đầu.';
    }

    if (
      seasonForm.startDate &&
      seasonForm.endDate &&
      seasonForm.endDate < seasonForm.startDate
    ) {
      newErrors.endDate =
        lang === 'en'
          ? 'Expected end date cannot be earlier than the start date.'
          : 'Ngày kết thúc dự kiến không được trước ngày bắt đầu.';
    }

    setSeasonErrors(newErrors);
    return newErrors;
  };

  const openCreateSeasonModal = () => {
    if (!block) return;
    setEditingSeason(null);
    setSeasonForm({
      seasonName: `Vụ canh tác tại ${block.blockName} (${new Date().toLocaleDateString('vi-VN')})`,
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
    const validationErrors = validateCropSeasonForm();

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.seasonName) {
        seasonNameRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        seasonNameRef.current?.focus();
      } else if (validationErrors.cropCategoryId) {
        seasonCategoryRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else if (validationErrors.plantedArea) {
        seasonAreaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        seasonAreaRef.current?.focus();
      } else if (validationErrors.startDate) {
        seasonStartDateRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        seasonStartDateRef.current?.focus();
      } else if (validationErrors.endDate) {
        seasonEndDateRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        seasonEndDateRef.current?.focus();
      }

      return;
    }

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
        showToast((lang === 'en' ? `Created season "${createdSeason.seasonName}" on ${block.blockName}!` : `Đã tạo mùa vụ "${createdSeason.seasonName}" trên ${block.blockName}!`));
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
        showToast((lang === 'en' ? `Updated season "${updatedSeason.seasonName}"!` : `Đã cập nhật mùa vụ "${updatedSeason.seasonName}"!`));
      }
      setSeasonModalMode(null);
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to save season on this Block." : err instanceof Error ? err.message : 'Không thể lưu mùa vụ trên Block này.'), 'error');
    } finally {
      setSavingSeason(false);
    }
  };

  const validateBlockRiskForm = () => {
    const newErrors: typeof riskErrors = {};

    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    if (riskForm.assessedAt > todayString) {
      newErrors.assessedAt =
        lang === 'en'
          ? 'Assessment date cannot be in the future.'
          : 'Ngày đánh giá không được nằm trong tương lai.';
    }

    if (!riskForm.riskType.trim()) {
      newErrors.riskType =
        lang === 'en'
          ? 'Risk type is required.'
          : 'Vui lòng nhập loại rủi ro.';
    }

    if (!riskForm.description.trim()) {
      newErrors.description =
        lang === 'en'
          ? 'Risk description is required.'
          : 'Vui lòng nhập mô tả nguy cơ rủi ro.';
    }

    if (!riskForm.controlMeasures.trim()) {
      newErrors.controlMeasures =
        lang === 'en'
          ? 'Control measures are required.'
          : 'Vui lòng nhập biện pháp kiểm soát.';
    }

    setRiskErrors(newErrors);
    return newErrors;
  };

  const handleSaveBlockRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;

    // Validation is only needed when creating or editing.
    if (riskModalMode === 'view') return;

    const validationErrors = validateBlockRiskForm();

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.assessedAt) {
        riskDateRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        riskDateRef.current?.focus();
      } else if (validationErrors.riskType) {
        riskTypeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        riskTypeRef.current?.focus();
      } else if (validationErrors.description) {
        riskDescriptionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        riskDescriptionRef.current?.focus();
      } else if (validationErrors.controlMeasures) {
        riskControlMeasuresRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        riskControlMeasuresRef.current?.focus();
      }

      return;
    }

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
    showToast((lang === 'en' ? `Saved risk record for Block "${saved.riskType}"!` : `Đã lưu hồ sơ rủi ro Block "${saved.riskType}"!`));
  };

  const reloadWaterHistory = async (bId: number, zId: number, bName: string) => {
    try {
      const beWaters = await fetchWaterAssessmentHistoryApi(bId);
      if (beWaters && beWaters.length > 0) {
        const records: WaterAssessmentRecord[] = beWaters.map((w: WaterAssessmentBackendResp) => {
          return {
            assessmentId: w.assessmentId,
            blockId: w.blockId || bId,
            blockName: w.blockName || bName,
            zoneId: w.zoneId || zId,
            zoneName: w.zoneName || undefined,
            assessedAt: w.assessedAt ? w.assessedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            waterSource: w.waterSourceName || 'Giếng khoan & Hồ lắng',
            sampleCode: `WATER-${w.assessmentId}`,
            phLevel: w.waterPh != null ? Number(w.waterPh) : 6.8,
            ecValue: w.temperatureC != null ? Number(w.temperatureC) : 0.45,
            coliformResult: 'SAFE',
            heavyMetalResult: 'SAFE',
            laboratoryName: 'Trung tâm Phân tích Nông nghiệp',
            conclusion: (w.qualityStatus as any) || 'DAT_CHUAN',
            treatmentMeasure: w.notes || 'Hệ thống lắng lọc cát + đĩa lọc',
            notes: w.notes,
            recordedByName: w.conductedByName || 'Kỹ sư Nông học',
          };
        });
        setWaterRecords(records);
        return;
      }
    } catch {
      // fallback
    }
    setWaterRecords(fetchBlockWaterAssessments(zId, bId, bName));
  };

  const reloadSoilHistory = async (bId: number, zId: number, bName: string) => {
    try {
      const beSoils = await fetchSoilAssessmentHistoryApi(bId);
      if (beSoils && beSoils.length > 0) {
        const records: SoilAssessmentRecord[] = beSoils.map((s) => {
          let parsed: any = {};
          try {
            if (s.nutrientData) parsed = JSON.parse(s.nutrientData);
          } catch {
            // not json
          }
          return {
            assessmentId: s.assessmentId,
            blockId: s.blockId,
            blockName: s.blockName || bName,
            zoneId: s.zoneId,
            zoneName: s.zoneName,
            assessedAt: s.assessedAt ? s.assessedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            sampleCode: parsed.sampleCode || `SOIL-TN-${String(s.assessmentId).padStart(4, '0')}`,
            phLevel: Number(s.soilPh ?? 6.5),
            organicMatterPct: Number(parsed.organicMatterPct ?? 3.5),
            heavyMetalResult: (parsed.heavyMetalResult ?? 'SAFE') as 'SAFE' | 'WARNING' | 'EXCEEDED',
            microbialStatus: parsed.microbialStatus || 'Đạt chuẩn QCVN 03-MT:2015/BTNMT',
            laboratoryName: parsed.laboratoryName || 'Trung tâm Phân tích Nông nghiệp',
            conclusion: (parsed.conclusion ?? (Number(s.soilPh) >= 5.5 && Number(s.soilPh) <= 7.5 ? 'DAT_CHUAN' : 'CAN_CAI_TAO')) as 'DAT_CHUAN' | 'CAN_CAI_TAO',
            notes: s.notes || '',
            recordedByName: s.conductedByName || 'Kỹ sư Nông học',
          };
        });
        setSoilRecords(records);
        return;
      }
    } catch {
      // fallback
    }
    setSoilRecords(fetchBlockSoilAssessments(zId, bId, bName));
  };

  const handleViewSoilDetails = async (s: SoilAssessmentRecord) => {
    try {
      const detail = await fetchSoilAssessmentDetailsApi(s.assessmentId);
      let parsed: any = {};
      try {
        if (detail.nutrientData) parsed = JSON.parse(detail.nutrientData);
      } catch {
        // not json
      }
      setSelectedSoil(s);
      setSoilForm({
        assessedAt: detail.assessedAt ? detail.assessedAt.split('T')[0] : s.assessedAt,
        sampleCode: parsed.sampleCode || s.sampleCode,
        phLevel: String(detail.soilPh ?? s.phLevel),
        organicMatterPct: String(parsed.organicMatterPct ?? s.organicMatterPct),
        heavyMetalResult: parsed.heavyMetalResult ?? s.heavyMetalResult,
        microbialStatus: parsed.microbialStatus ?? s.microbialStatus,
        laboratoryName: parsed.laboratoryName ?? s.laboratoryName,
        conclusion: parsed.conclusion ?? s.conclusion,
        notes: detail.notes ?? s.notes ?? '',
        recordedByName: detail.conductedByName ?? s.recordedByName,
      });
    } catch {
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
    }
    setSoilModalMode('view');
  };

  const validateSoilForm = () => {
    const errors: typeof soilErrors = {};

    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const ph = Number(soilForm.phLevel);
    const organicMatter = Number(soilForm.organicMatterPct);

    // Assessment date
    if (!soilForm.assessedAt) {
      errors.assessedAt = lang === 'en'
        ? 'Please select an assessment date.'
        : 'Vui lòng chọn ngày đánh giá.';
    } else if (soilForm.assessedAt > todayString) {
      errors.assessedAt = lang === 'en'
        ? 'Assessment date cannot be in the future.'
        : 'Ngày đánh giá không được nằm trong tương lai.';
    }

    // Sample code
    if (!soilForm.sampleCode.trim()) {
      errors.sampleCode = lang === 'en'
        ? 'Please enter a soil sample code.'
        : 'Vui lòng nhập mã mẫu đất.';
    } else if (soilForm.sampleCode.trim().length > 50) {
      errors.sampleCode = lang === 'en'
        ? 'Sample code must not exceed 50 characters.'
        : 'Mã mẫu đất không được vượt quá 50 ký tự.';
    }

    // Soil pH
    if (!soilForm.phLevel.trim() || !Number.isFinite(ph)) {
      errors.phLevel = lang === 'en'
        ? 'Please enter a valid soil pH.'
        : 'Vui lòng nhập độ pH đất hợp lệ.';
    } else if (ph < 0 || ph > 14) {
      errors.phLevel = lang === 'en'
        ? 'Soil pH must be between 0 and 14.'
        : 'Độ pH đất phải nằm trong khoảng từ 0 đến 14.';
    }

    // Organic matter
    if (!soilForm.organicMatterPct.trim() || !Number.isFinite(organicMatter)) {
      errors.organicMatterPct = lang === 'en'
        ? 'Please enter a valid organic matter percentage.'
        : 'Vui lòng nhập tỷ lệ chất hữu cơ hợp lệ.';
    } else if (organicMatter < 0 || organicMatter > 100) {
      errors.organicMatterPct = lang === 'en'
        ? 'Organic matter must be between 0% and 100%.'
        : 'Chất hữu cơ phải nằm trong khoảng từ 0% đến 100%.';
    }

    // Testing laboratory
    if (!soilForm.laboratoryName.trim()) {
      errors.laboratoryName = lang === 'en'
        ? 'Please enter the testing laboratory.'
        : 'Vui lòng nhập tên phòng kiểm nghiệm.';
    } else if (soilForm.laboratoryName.trim().length > 150) {
      errors.laboratoryName = lang === 'en'
        ? 'Laboratory name must not exceed 150 characters.'
        : 'Tên phòng kiểm nghiệm không được vượt quá 150 ký tự.';
    }

    // Heavy metals and microorganisms
    if (!soilForm.microbialStatus.trim()) {
      errors.microbialStatus = lang === 'en'
        ? 'Please enter the heavy metals and microorganisms assessment.'
        : 'Vui lòng nhập kết quả đánh giá kim loại nặng và vi sinh.';
    } else if (soilForm.microbialStatus.trim().length > 500) {
      errors.microbialStatus = lang === 'en'
        ? 'This field must not exceed 500 characters.'
        : 'Trường này không được vượt quá 500 ký tự.';
    }

    setSoilErrors(errors);

    return errors;
  };

  const handleSaveSoil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;

    const validationErrors = validateSoilForm();

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.assessedAt) {
        assessedAtRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        assessedAtRef.current?.focus();
      } else if (validationErrors.sampleCode) {
        sampleCodeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        sampleCodeRef.current?.focus();
      } else if (validationErrors.phLevel) {
        phLevelRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        phLevelRef.current?.focus();
      } else if (validationErrors.organicMatterPct) {
        organicMatterRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        organicMatterRef.current?.focus();
      } else if (validationErrors.laboratoryName) {
        laboratoryNameRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        laboratoryNameRef.current?.focus();
      } else if (validationErrors.microbialStatus) {
        microbialStatusRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        microbialStatusRef.current?.focus();
      }

      return;
    }

    const nutrientObj = {
      sampleCode: soilForm.sampleCode,
      organicMatterPct: parseFloat(soilForm.organicMatterPct) || 3.5,
      heavyMetalResult: soilForm.heavyMetalResult,
      microbialStatus: soilForm.microbialStatus,
      laboratoryName: soilForm.laboratoryName,
      conclusion: soilForm.conclusion,
    };
    const nutrientData = JSON.stringify(nutrientObj);

    try {
      if (selectedSoil && soilModalMode === 'edit') {
        await updateSoilAssessmentApi(selectedSoil.assessmentId, {
          soilPh: parseFloat(soilForm.phLevel) || 6.5,
          moisturePercent: 60.0,
          nutrientData,
          notes: soilForm.notes,
          assessedAt: soilForm.assessedAt ? new Date(soilForm.assessedAt).toISOString() : new Date().toISOString(),
        });
        showToast((lang === 'en' ? `Updated soil assessment "${soilForm.sampleCode}"!` : `Đã cập nhật đánh giá thổ nhưỡng "${soilForm.sampleCode}"!`));
      } else {
        await createSoilAssessmentApi(block.blockId, {
          soilPh: parseFloat(soilForm.phLevel) || 6.5,
          moisturePercent: 60.0,
          nutrientData,
          notes: soilForm.notes,
          assessedAt: soilForm.assessedAt ? new Date(soilForm.assessedAt).toISOString() : new Date().toISOString(),
        });
        showToast((lang === 'en' ? `Added soil assessment "${soilForm.sampleCode}"!` : `Đã thêm mới đánh giá thổ nhưỡng "${soilForm.sampleCode}"!`));
      }
      await reloadSoilHistory(block.blockId, block.zoneId, block.blockName);
    } catch {
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
      showToast((lang === 'en' ? `Saved soil assessment "${saved.sampleCode}"!` : `Đã lưu hồ sơ đánh giá đất "${saved.sampleCode}"!`));
    }
    setSoilModalMode(null);
  };

  const handleConfirmDeleteSoil = async () => {
    if (!soilToDelete || !block) return;
    try {
      await deleteSoilAssessmentApi(soilToDelete.assessmentId);
      showToast((lang === 'en' ? `Deleted soil assessment "${soilToDelete.sampleCode}"!` : `Đã xóa phiếu đánh giá thổ nhưỡng "${soilToDelete.sampleCode}"!`));
      await reloadSoilHistory(block.blockId, block.zoneId, block.blockName);
    } catch {
      setSoilRecords((prev) => prev.filter((s) => s.assessmentId !== soilToDelete.assessmentId));
      showToast((lang === 'en' ? `Soil assessment deleted!` : `Đã xóa phiếu đánh giá thổ nhưỡng!`));
    } finally {
      setSoilToDelete(null);
    }
  };

  const validateWaterForm = () => {
    const errors: typeof waterErrors = {};

    // Assessment date
    const today = new Date();
    const localToday = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    if (!waterForm.assessedAt) {
      errors.assessedAt =
        lang === 'en'
          ? 'Assessment date is required.'
          : 'Vui lòng chọn ngày đánh giá.';
    } else if (waterForm.assessedAt > localToday) {
      errors.assessedAt =
        lang === 'en'
          ? 'Assessment date cannot be in the future.'
          : 'Ngày đánh giá không được ở tương lai.';
    }

    // Sample code
    if (!waterForm.sampleCode.trim()) {
      errors.sampleCode =
        lang === 'en'
          ? 'Water sample code is required.'
          : 'Vui lòng nhập mã mẫu nước.';
    } else if (waterForm.sampleCode.trim().length > 50) {
      errors.sampleCode =
        lang === 'en'
          ? 'Sample code cannot exceed 50 characters.'
          : 'Mã mẫu nước không được vượt quá 50 ký tự.';
    }

    // Water source
    if (!waterForm.waterSource.trim()) {
      errors.waterSource =
        lang === 'en'
          ? 'Irrigation water source is required.'
          : 'Vui lòng nhập nguồn nước tưới.';
    } else if (waterForm.waterSource.trim().length > 150) {
      errors.waterSource =
        lang === 'en'
          ? 'Water source cannot exceed 150 characters.'
          : 'Nguồn nước không được vượt quá 150 ký tự.';
    }

    // Water pH
    const ph = Number(waterForm.phLevel);

    if (
      !String(waterForm.phLevel).trim() ||
      !Number.isFinite(ph)
    ) {
      errors.phLevel =
        lang === 'en'
          ? 'Water pH is required.'
          : 'Vui lòng nhập độ pH nước.';
    } else if (ph < 0 || ph > 14) {
      errors.phLevel =
        lang === 'en'
          ? 'Water pH must be between 0 and 14.'
          : 'Độ pH nước phải nằm trong khoảng từ 0 đến 14.';
    }

    // Electrical conductivity
    const ec = Number(waterForm.ecValue);

    if (
      !String(waterForm.ecValue).trim() ||
      !Number.isFinite(ec)
    ) {
      errors.ecValue =
        lang === 'en'
          ? 'Electrical conductivity is required.'
          : 'Vui lòng nhập độ dẫn điện EC.';
    } else if (ec < 0) {
      errors.ecValue =
        lang === 'en'
          ? 'Electrical conductivity cannot be negative.'
          : 'Độ dẫn điện EC không được là số âm.';
    }

    setWaterErrors(errors);
    return errors;
  };

  const handleSaveWater = (e: React.FormEvent) => {
    e.preventDefault();
    if (!block) return;

    const validationErrors = validateWaterForm();

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.assessedAt) {
        waterDateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        waterDateRef.current?.focus({ preventScroll: true });
      } else if (validationErrors.sampleCode) {
        waterCodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        waterCodeRef.current?.focus({ preventScroll: true });
      } else if (validationErrors.waterSource) {
        waterSourceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        waterSourceRef.current?.focus({ preventScroll: true });
      } else if (validationErrors.phLevel) {
        waterPhLevelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        waterPhLevelRef.current?.focus({ preventScroll: true });
      } else if (validationErrors.ecValue) {
        ecValueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ecValueRef.current?.focus({ preventScroll: true });
      }

      return;
    }

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
    showToast((lang === 'en' ? `Saved water assessment "${saved.sampleCode}"!` : `Đã lưu hồ sơ đánh giá nước "${saved.sampleCode}"!`));
  };

  const handleConfirmDeleteBlock = async () => {
    if (!block) return;
    try {
      await deleteBlock(block.blockId);
      navigate(`/zones/${block.zoneId}`);
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Cannot delete Block with linked data." : err instanceof Error ? err.message : 'Không thể xóa Block khi đang có dữ liệu liên kết.'), 'error');
      setIsDeleteBlockOpen(false);
    }
  };

  if (loading) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>{(lang === 'en' ? "Loading details for Block #" : "Đang tải thông tin chi tiết Block #")}{blockId}...</h2>
        </div>
      </section>
    );
  }

  if (error || !block) {
    return (
      <section className="farm-registration-page" style={{ maxWidth: '1240px' }}>
        <div className="panel empty-state" role="alert">
          <div className="empty-icon">⚠️</div>
          <h2>{(lang === 'en' ? "Block not found" : "Không tìm thấy thông tin Block")}</h2>
          <p>{(lang === 'en' ? error || `Block #${blockId} does not exist or you do not have access.` : error || `Block #${blockId} không tồn tại hoặc bạn không có quyền truy cập.`)}</p>
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
        <Link to="/zones">{lang === 'en' ? 'Production Zones' : 'Khu vực sản xuất'}</Link>
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
            {block.description || (lang === 'en' ? 'Production block under VietGAP standard management.' : 'Block sản xuất trực thuộc Zone quản lý theo tiêu chuẩn VietGAP.')}
          </p>
        </div>

        {/* Top Buttons per spec: Back, Edit Block, Record Conditions; Owner has Delete Block when eligible */}
        <div className="dashboard-actions">
          <Link to={`/zones/${block.zoneId}`} className="action-button">
            {lang === 'en' ? '← Back' : '← Quay lại'}
          </Link>
          <button type="button" className="action-button" onClick={() => setIsEditBlockOpen(true)}>
            {(lang === 'en' ? "Edit Block" : "Chỉnh sửa Block")}
          </button>
          <button type="button" className="primary-button" onClick={() => setIsRecordConditionOpen(true)}>
            {(lang === 'en' ? "Record conditions" : "Ghi nhận điều kiện")}
          </button>
          {isOwner && (
            <button
              type="button"
              className={canDeleteBlock ? 'action-button danger' : 'action-button'}
              style={{ opacity: canDeleteBlock ? 1 : 0.55 }}
              onClick={() => {
                if (!canDeleteBlock) {
                  showToast(
                    (lang === 'en' ? "Cannot delete a Block with linked seasons or condition history." : 'Không thể xóa Block khi đang có mùa vụ hoặc lịch sử điều kiện liên kết.'),
                    'error'
                  );
                  return;
                }
                setIsDeleteBlockOpen(true);
              }}
            >
              {(lang === 'en' ? "Delete Block" : "Xóa Block")}
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
        </div>
      )}

      {/* Summary Panel matching FarmRegistrationStatus */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-title" style={{ marginBottom: '18px' }}>
          <div>
            <span className="eyebrow">{(lang === 'en' ? "Production block details" : "Hồ sơ chi tiết lô sản xuất")}</span>
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
            <dt>{(lang === 'en' ? "Block Name & Code" : "Tên & Mã Block")}</dt>
            <dd>
              {block.blockName} (BLK-{String(block.blockId).padStart(3, '0')})
            </dd>
          </div>
          <div>
            <dt>{(lang === 'en' ? "Parent zone" : "Khu vực trực thuộc")}</dt>
            <dd>
              <Link to={`/zones/${block.zoneId}`} style={{ color: '#059669', textDecoration: 'underline' }}>
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
              {block.areaValue.toLocaleString('vi-VN')} {block.areaUnit === 'm2' ? 'm²' : block.areaUnit}
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
        </dl>
      </div>

      {/* 6 Tabs Navigation per specification */}
      <div className="zone-tabs-nav">
        <button
          type="button"
          className={activeTab === 'overview' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('overview')}
        >
          {(lang === 'en' ? "Overview" : "Tổng quan")}
        </button>
        <button
          type="button"
          className={activeTab === 'seasons' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('seasons')}
        >
          {(lang === 'en' ? "Crop seasons (" : "Mùa vụ canh tác (")}{blockSeasons.length})
        </button>
        <button
          type="button"
          className={activeTab === 'conditions' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('conditions')}
        >
          {(lang === 'en' ? "Environmental conditions (" : "Điều kiện môi trường (")}{conditions.length})
        </button>
        <button
          type="button"
          className={activeTab === 'risks' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('risks')}
        >
          {(lang === 'en' ? "Risk records (" : "Hồ sơ rủi ro (")}{riskRecords.length})
        </button>
        <button
          type="button"
          className={activeTab === 'soil' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('soil')}
        >
          {(lang === 'en' ? "Soil assessments (" : "Đánh giá đất (")}{soilRecords.length})
        </button>
        <button
          type="button"
          className={activeTab === 'water' ? 'zone-tab-btn active' : 'zone-tab-btn'}
          onClick={() => setActiveTab('water')}
        >
          {(lang === 'en' ? "Water assessments (" : "Đánh giá nước (")}{waterRecords.length})
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
                  <span className="eyebrow">{(lang === 'en' ? "Block information" : "Thông tin Block")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{block.blockName}</h2>
                </div>
                <button type="button" className="action-button" onClick={() => setIsEditBlockOpen(true)}>
                  {(lang === 'en' ? "Edit Block" : "Chỉnh sửa Block")}
                </button>
              </div>

              <dl className="detail-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>{(lang === 'en' ? "ID" : "Mã định danh")}</dt>
                  <dd>#{block.blockId}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Block code" : "Mã Block")}</dt>
                  <dd>BLK-{String(block.blockId).padStart(3, '0')}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Area" : "Diện tích")}</dt>
                  <dd>
                    {block.areaValue.toLocaleString('vi-VN')} {block.areaUnit === 'm2' ? 'm²' : block.areaUnit}
                  </dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Soil type" : "Loại đất")}</dt>
                  <dd>{(lang === 'en' ? block.soilType || "Not updated" : block.soilType || 'Chưa cập nhật')}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Latitude" : "Vĩ độ")}</dt>
                  <dd>{(lang === 'en' ? block.latitude ?? "Not updated" : block.latitude ?? 'Chưa cập nhật')}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Longitude" : "Kinh độ")}</dt>
                  <dd>{(lang === 'en' ? block.longitude ?? "Not updated" : block.longitude ?? 'Chưa cập nhật')}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>{(lang === 'en' ? "Detailed description" : "Mô tả chi tiết")}</dt>
                  <dd>{(lang === 'en' ? block.description || "No detailed description for this block." : block.description || 'Chưa có mô tả chi tiết cho lô đất này.')}</dd>
                </div>
              </dl>
            </div>

            {/* Parent Zone & Linked Records Summary Panel */}
            <div className="panel" style={{ padding: '28px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">{(lang === 'en' ? "Parent management zone" : "Khu vực quản lý trực thuộc")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{resolvedZoneName}</h2>
                </div>
                <Link to={`/zones/${block.zoneId}`} className="primary-button">
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
                <span className="eyebrow">{(lang === 'en' ? "Production block location map" : "Bản đồ vị trí lô sản xuất")}</span>
                <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Field location: " : "Vị trí thực địa: ")} {block.blockName}</h2>
              </div>
              <button type="button" className="action-button" onClick={() => setIsEditBlockOpen(true)}>
                {(lang === 'en' ? "Update coordinates" : "Cập nhật tọa độ")}
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
                {(lang === 'en' ? "Search seasons" : "Tìm kiếm mùa vụ")}
              </span>
              <input
                id="block-season-search"
                type="search"
                placeholder={lang === 'en' ? 'Search by season name or crop...' : 'Tìm theo tên mùa vụ hoặc cây trồng...'}
                value={seasonSearch}
                onChange={(e) => setSeasonSearch(e.target.value)}
              />
            </label>

            <label className="form-field" style={{ flex: '1 1 210px' }}>
              <span>
                {(lang === 'en' ? "Crop categories" : "Danh mục cây trồng")}
              </span>
              <select
                id="block-season-cat"
                value={seasonCategoryFilter}
                onChange={(e) => setSeasonCategoryFilter(e.target.value)}
              >
                <option value="all">{(lang === 'en' ? "-- All categories --" : "-- Tất cả danh mục --")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {translate(cat.categoryName)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field" style={{ flex: '0.8 1 180px' }}>
              <span>
                {lang === 'en' ? 'Status' : 'Trạng thái'}
              </span>
              <select
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
              className="action-button"
              style={{ height: '46px' }}
              onClick={() => {
                setSeasonSearch('');
                setSeasonCategoryFilter('all');
                setSeasonStatusFilter('all');
              }}
            >
              {lang === 'en' ? 'Reset Filters' : 'Đặt lại bộ lọc'}
            </button>

            <button type="button" className="primary-button" style={{ height: '46px' }} onClick={openCreateSeasonModal}>
              <Icon name="plus" /> {lang === 'en' ? 'Add Season' : 'Thêm mùa vụ'}
            </button>
          </div>

          {filteredSeasons.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">🌾</div>
              <h2>{(lang === 'en' ? "No seasons on " : "Chưa có mùa vụ nào trên ")} {block.blockName}</h2>
              <p>
                {lang === 'en' ? `Click "Add Season" to initialize a new crop season for ${block.blockName}.` : `Nhấn "Thêm mùa vụ" để khởi tạo mùa vụ canh tác mới gắn trực tiếp với ${block.blockName}.`}
              </p>
              <button type="button" className="primary-button" onClick={openCreateSeasonModal}>
                <Icon name="plus" /> {lang === 'en' ? 'Add Season' : 'Thêm mùa vụ'}
              </button>
            </div>
          ) : (
            <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">{(lang === 'en' ? "Crop seasons on " : "Danh sách mùa vụ canh tác trên ")} {block.blockName}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Crop seasons (" : "Mùa vụ canh tác (")}{filteredSeasons.length})</h2>
                </div>
                <button type="button" className="primary-button" onClick={openCreateSeasonModal}>
                  <Icon name="plus" /> {lang === 'en' ? 'Add Season' : 'Thêm mùa vụ'}
                </button>
              </div>

              <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
                <table className="data-table" style={{ minWidth: '880px' }}>
                  <thead>
                    <tr>
                      <th>{lang === 'en' ? 'Season Name' : 'Tên mùa vụ'}</th>
                      <th>{lang === 'en' ? 'Crop Category' : 'Danh mục cây trồng'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Planted Area' : 'Diện tích gieo trồng'}</th>
                      <th>{lang === 'en' ? 'Timeline (Start → End)' : 'Thời gian (Bắt đầu → Kết thúc)'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Status' : 'Trạng thái'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
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
                        <td>{(lang === 'en' ? s.cropCategoryName || `Group #${s.cropCategoryId}` : s.cropCategoryName || `Nhóm #${s.cropCategoryId}`)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                          {s.blockMapping?.plantedArea ?? block.areaValue}{' '}
                          {translate(s.blockMapping?.areaUnit || block.areaUnit || 'm²')}
                        </td>
                        <td>
                          {s.startDate} → {(lang === 'en' ? s.endDate || "In progress" : s.endDate || 'Đang diễn ra')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="knowledge-tag">{s.seasonStatus?.toLowerCase() === 'active' ? (lang === 'en' ? 'Active' : 'Đang canh tác') : s.seasonStatus?.toLowerCase() === 'completed' ? (lang === 'en' ? 'Completed' : 'Đã hoàn thành') : s.seasonStatus?.toLowerCase() === 'planned' ? (lang === 'en' ? 'Planned' : 'Dự kiến') : s.seasonStatus}</span>
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
              <span>{(lang === 'en' ? "From date" : "Từ ngày")}</span>
              <input
                id="cond-from-date"
                type="date"
                value={condFromDate}
                onChange={(e) => setCondFromDate(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>{(lang === 'en' ? "To date" : "Đến ngày")}</span>
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
              {lang === 'en' ? 'Reset Filters' : 'Đặt lại bộ lọc'}
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ height: '46px' }}
              onClick={() => setIsRecordConditionOpen(true)}
            >
              <Icon name="plus" /> {(lang === 'en' ? " Record conditions" : " Ghi nhận điều kiện")}
            </button>
          </div>

          {filteredConditions.length === 0 ? (
            <div className="panel empty-state">
              <div className="empty-icon">📋</div>
              <h2>{(lang === 'en' ? "No condition history for " : "Chưa có lịch sử ghi nhận điều kiện trên ")} {block.blockName}</h2>
              <p>{(lang === 'en' ? "Click \"Record conditions\" to log soil conditions, moisture, or pests in this block." : "Nhấn \"Ghi nhận điều kiện\" để ghi nhận tình trạng đất, độ ẩm hoặc sâu bệnh thực tế tại lô đất này.")}</p>
              <button type="button" className="primary-button" onClick={() => setIsRecordConditionOpen(true)}>
                <Icon name="plus" /> {(lang === 'en' ? " Record conditions" : " Ghi nhận điều kiện")}
              </button>
            </div>
          ) : (
            <div className="panel" style={{ padding: '24px' }}>
              <div className="panel-title" style={{ marginBottom: '18px' }}>
                <div>
                  <span className="eyebrow">{(lang === 'en' ? "Production condition history" : "Lịch sử điều kiện sản xuất")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Environmental conditions (" : "Điều kiện môi trường (")}{filteredConditions.length})</h2>
                </div>
                <button type="button" className="primary-button" onClick={() => setIsRecordConditionOpen(true)}>
                  <Icon name="plus" /> {(lang === 'en' ? " Record conditions" : " Ghi nhận điều kiện")}
                </button>
              </div>

              <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
                <table className="data-table" style={{ minWidth: '880px' }}>
                  <thead>
                    <tr>
                      <th>{lang === 'en' ? 'Recorded At' : 'Thời gian ghi nhận'}</th>
                      <th>{lang === 'en' ? 'Condition Type' : 'Phân loại điều kiện'}</th>
                      <th>{lang === 'en' ? 'Description & Notes' : 'Mô tả & Ghi chú'}</th>
                      <th>{lang === 'en' ? 'Recorded By' : 'Người ghi nhận'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConditions.map((obs) => (
                      <tr key={obs.observationId}>
                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {obs.observedAt ? new Date(obs.observedAt).toLocaleString('vi-VN') : 'N/A'}
                        </td>

                        <td>
                          <span className="knowledge-tag">{translate(obs.conditionType)}</span>
                        </td>

                        <td style={{
                          maxWidth: '360px', color: '#334155', lineHeight: 1.5, overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>{obs.description}</td>

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
              <span>{(lang === 'en' ? "From date" : "Từ ngày")}</span>
              <input
                type="date"
                value={riskFromDate}
                onChange={(e) => setRiskFromDate(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>{(lang === 'en' ? "To date" : "Đến ngày")}</span>
              <input
                type="date"
                value={riskToDate}
                onChange={(e) => setRiskToDate(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>{(lang === 'en' ? "Risk level" : "Mức độ rủi ro")}</span>
              <select value={riskLevelFilter} onChange={(e) => setRiskLevelFilter(e.target.value)}>
                <option value="all">{(lang === 'en' ? "-- All levels --" : "-- Tất cả mức độ --")}</option>
                <option value="LOW">{(lang === 'en' ? "Low" : "Thấp")}</option>
                <option value="MEDIUM">{(lang === 'en' ? "Medium" : "Trung bình")}</option>
                <option value="HIGH">{(lang === 'en' ? "High" : "Cao")}</option>
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
              {lang === 'en' ? 'Reset Filters' : 'Đặt lại bộ lọc'}
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
              <Icon name="plus" /> {lang === 'en' ? 'Add Risk Assessment' : 'Thêm đánh giá rủi ro'}
            </button>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Risk records for " : "Hồ sơ rủi ro tại ")} {block.blockName}</span>
                <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Risk records (" : "Hồ sơ rủi ro (")}{filteredRisks.length})</h2>
              </div>
            </div>

            <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
              <table className="data-table" style={{ minWidth: '880px' }}>
                <thead>
                  <tr>
                    <th>{lang === 'en' ? 'Assessment Date' : 'Ngày đánh giá'}</th>
                    <th>{lang === 'en' ? 'Risk & Prior Findings' : 'Rủi ro & Phát hiện trước'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Risk Level' : 'Mức độ'}</th>
                    <th>{lang === 'en' ? 'Mitigation Measures' : 'Biện pháp kiểm soát'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
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
                            {(lang === 'en' ? "Previous findings: " : "Phát hiện trước đây: ")} {r.priorFindings}
                          </small>
                        )}
                        <span style={{ fontSize: '13.5px', color: '#334155' }}>{r.description}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="knowledge-tag">{translate(r.riskLevel)}</span>
                      </td>
                      <td style={{ maxWidth: '300px', fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5 }}>
                        {r.controlMeasures}
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
        <div>
          <div className="production-filter-panel">
            <label className="form-field">
              <span>{(lang === 'en' ? "Date range: From" : "Khoảng thời gian: Từ ngày")}</span>
              <input type="date" value={soilFromDate} onChange={(e) => setSoilFromDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>{(lang === 'en' ? "Date range: To" : "Khoảng thời gian: Đến ngày")}</span>
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
              {lang === 'en' ? 'Reset Filters' : 'Đặt lại bộ lọc'}
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
              <Icon name="plus" /> {lang === 'en' ? 'Add Soil Assessment' : 'Thêm đánh giá đất'}
            </button>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Soil sample assessment records" : "Hồ sơ đánh giá mẫu đất")}</span>
                <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Soil sample assessments (" : "Đánh giá mẫu đất (")}{filteredSoil.length})</h2>
              </div>
            </div>

            <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
              <table className="data-table" style={{ minWidth: '880px' }}>
                <thead>
                  <tr>
                    <th>{lang === 'en' ? 'Assessment Date' : 'Ngày đánh giá'}</th>
                    <th>{lang === 'en' ? 'Sample Code & Lab' : 'Mã mẫu & Phòng kiểm nghiệm'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'pH / Organic Matter (%)' : 'Độ pH / Chất hữu cơ (%)'}</th>
                    <th>{lang === 'en' ? 'Heavy Metals & Microbes' : 'Kim loại nặng & Vi sinh'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Conclusion' : 'Kết luận'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
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
                        <strong>{(lang === 'en' ? "Heavy metals: " : "Kim loại nặng: ")} {(lang === 'en' ? s.heavyMetalResult === 'SAFE' ? "Safe" : s.heavyMetalResult : s.heavyMetalResult === 'SAFE' ? 'An toàn' : s.heavyMetalResult)}</strong>
                        <div style={{ color: '#475569' }}>{s.microbialStatus}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="knowledge-tag">
                          {(lang === 'en' ? s.conclusion === 'DAT_CHUAN' ? "VietGAP compliant" : "Improvement required" : s.conclusion === 'DAT_CHUAN' ? 'Đạt chuẩn VietGAP' : 'Cần cải tạo')}
                        </span>
                      </td>
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
        <div>
          <div className="production-filter-panel">
            <label className="form-field">
              <span>{(lang === 'en' ? "Date range: From" : "Khoảng thời gian: Từ ngày")}</span>
              <input type="date" value={waterFromDate} onChange={(e) => setWaterFromDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>{(lang === 'en' ? "Date range: To" : "Khoảng thời gian: Đến ngày")}</span>
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
              {lang === 'en' ? 'Reset Filters' : 'Đặt lại bộ lọc'}
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
              <Icon name="plus" /> {lang === 'en' ? 'Add Water Assessment' : 'Thêm đánh giá nước'}
            </button>
          </div>

          <div className="panel" style={{ padding: '24px' }}>
            <div className="panel-title" style={{ marginBottom: '18px' }}>
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Irrigation water assessment records" : "Hồ sơ đánh giá nguồn nước tưới")}</span>
                <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Water source assessments (" : "Đánh giá nguồn nước (")}{filteredWater.length})</h2>
              </div>
            </div>

            <div className="zone-table-wrap" style={{ marginBottom: 0 }}>
              <table className="data-table" style={{ minWidth: '880px' }}>
                <thead>
                  <tr>
                    <th>{lang === 'en' ? 'Assessment Date' : 'Ngày đánh giá'}</th>
                    <th>{lang === 'en' ? 'Water Source & Sample Code' : 'Nguồn nước & Mã mẫu'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'pH / Conductivity (EC)' : 'pH / Độ dẫn điện EC'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Coliform & Heavy Metals' : 'Coliform & Kim loại nặng'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'en' ? 'Conclusion' : 'Kết luận'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
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
                        Coliform: <strong>{(lang === 'en' ? w.coliformResult === 'SAFE' ? "Safe" : w.coliformResult : w.coliformResult === 'SAFE' ? 'An toàn' : w.coliformResult)}</strong> {(lang === 'en' ? " · Heavy metals: " : " · KL nặng: ")} <strong>{(lang === 'en' ? w.heavyMetalResult === 'SAFE' ? "Safe" : w.heavyMetalResult : w.heavyMetalResult === 'SAFE' ? 'An toàn' : w.heavyMetalResult)}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="knowledge-tag">
                          {(lang === 'en' ? w.conclusion === 'DAT_CHUAN' ? "QCVN compliant" : "Filtration required" : w.conclusion === 'DAT_CHUAN' ? 'Đạt chuẩn QCVN' : 'Cần xử lý lọc')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div className="table-action-btns zone-card-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="table-icon-btn primary"
                            title={(lang === 'en' ? "View details" : "Xem chi tiết")}
                            aria-label={(lang === 'en' ? `Water sample details ${w.sampleCode}` : `Chi tiết mẫu nước ${w.sampleCode}`)}
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
                            <span className="sr-only">{(lang === 'en' ? "View details" : "Xem chi tiết")}</span>
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn edit"
                            title={(lang === 'en' ? "Edit water source assessment" : "Chỉnh sửa đánh giá nguồn nước")}
                            aria-label={(lang === 'en' ? `Edit water sample ${w.sampleCode}` : `Chỉnh sửa mẫu nước ${w.sampleCode}`)}
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
                            <span className="sr-only">{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</span>
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
          showToast((lang === 'en' ? `Updated Block "${saved.blockName}" successfully!` : `Đã cập nhật Block "${saved.blockName}" thành công!`));
        }}
      />

      <RecordConditionModal
        isOpen={isRecordConditionOpen}
        block={{ ...block, zoneName: resolvedZoneName }}
        onClose={() => setIsRecordConditionOpen(false)}
        onSuccess={(obs) => {
          setConditions((prev) => [obs, ...prev]);
          showToast((lang === 'en' ? `Saved condition record (${obs.conditionType}) cho ${block.blockName}!` : `Đã lưu hồ sơ điều kiện (${obs.conditionType}) cho ${block.blockName}!`));
        }}
      />

      {/* Condition Record Details Modal */}
      {selectedCondition && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ width: 'min(620px, 100%)' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">{(lang === 'en' ? "Condition record details · #" : "Chi tiết ghi nhận điều kiện · #")}{selectedCondition.observationId}</span>
                <h2>{translate(selectedCondition.conditionType)}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedCondition(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <dl className="detail-list" style={{ marginBottom: 0 }}>
                <div>
                  <dt>Block</dt>
                  <dd>{block.blockName}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Zone" : "Khu vực")}</dt>
                  <dd>{resolvedZoneName}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Recorded at" : "Thời gian ghi nhận")}</dt>
                  <dd>{new Date(selectedCondition.observedAt).toLocaleString('vi-VN')}</dd>
                </div>
                <div>
                  <dt>{(lang === 'en' ? "Recorded by" : "Người ghi nhận")}</dt>
                  <dd>{(lang === 'en' ? selectedCondition.recorderFullName || "Farm staff" : selectedCondition.recorderFullName || 'Nhân sự trang trại')}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>{lang === 'en' ? 'Description & Notes' : 'Mô tả & Ghi chú'}</dt>
                  <dd>{selectedCondition.description}</dd>
                </div>
              </dl>
              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="primary-button" onClick={() => setSelectedCondition(null)}>
                  {(lang === 'en' ? "Close" : "Đóng")}
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
                <span className="eyebrow">{(lang === 'en' ? "Block season" : "Mùa vụ trên Block")}</span>
                <h2>
                  {seasonModalMode === 'create'
                    ? (lang === 'en' ? `Add Season to ${block.blockName}` : `Thêm mùa vụ trên ${block.blockName}`)
                    : (lang === 'en' ? `Update season: ${editingSeason?.seasonName}` : `Cập nhật mùa vụ: ${editingSeason?.seasonName}`)}
                </h2>
              </div>
              <button type="button" className="modal-close"
                onClick={() => {
                  setSeasonModalMode(null);
                  setSeasonErrors({});
                }}>
                ✕
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveCropSeasonOnBlock} noValidate>
              {Object.keys(seasonErrors).length > 0 && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} />

                  {lang === 'en'
                    ? 'Please correct the highlighted fields before adding.'
                    : 'Vui lòng sửa các trường được đánh dấu trước khi thêm.'}
                </div>
              )}
              <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                  <span className="structured-field-label" style={{ color: '#065f46' }}>
                    {(lang === 'en' ? "Applicable Block" : "Block áp dụng")}
                  </span>
                  <span className="structured-field-badge">{(lang === 'en' ? "Automatically filled" : "Tự động điền")}</span>
                </div>
                <strong style={{ color: '#047857' }}>
                  🌿 {block.blockName} · {resolvedZoneName} ({block.areaValue} {translate(block.areaUnit)})
                </strong>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="cs-name-input" className="structured-field-label">
                    {(lang === 'en' ? "Season name " : "Tên mùa vụ ")} <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span className="structured-field-badge">{seasonForm.seasonName.length}{(lang === 'en' ? "/120 characters" : "/120 ký tự")}</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    id="cs-name-input"
                    ref={seasonNameRef}
                    type="text"
                    maxLength={120}
                    value={seasonForm.seasonName}
                    className={seasonErrors.seasonName ? 'input-error' : ''}
                    onChange={(e) => {
                      const value = e.target.value;

                      setSeasonForm((prev) => ({
                        ...prev,
                        seasonName: value,
                      }));

                      if (!value.trim()) {
                        setSeasonErrors((prev) => ({
                          ...prev,
                          seasonName: lang === 'en'
                            ? 'Season name is required.'
                            : 'Vui lòng nhập tên mùa vụ.'
                        }));
                      } else {
                        setSeasonErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.seasonName;
                          return updated;
                        });
                      }
                    }}
                    required
                  />

                  {seasonErrors.seasonName && (
                    <p className="field-error"
                      style={{
                        color: '#dc2626',
                        fontSize: '12px',
                        marginTop: '5px',
                        marginBottom: 0
                      }}>
                      {seasonErrors.seasonName}
                    </p>
                  )}
                </div>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-cat-select" className="structured-field-label">
                      {(lang === 'en' ? "Crop categories " : "Danh mục cây trồng ")} <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span className="structured-field-badge">{(lang === 'en' ? "VietGAP Standard" : "Tiêu chuẩn VietGAP")}</span>
                  </div>
                  <div ref={seasonCategoryRef}>
                    <CropCategoryCombobox
                      id="cs-cat-select"
                      value={seasonForm.cropCategoryId}
                      categoryName={seasonForm.cropCategoryName}
                      categories={categories}
                      onChange={(catId, catName) => {
                        setSeasonForm((prev) => ({
                          ...prev,
                          cropCategoryId: catId,
                          cropCategoryName: catName,
                        }));

                        if (Number(catId) <= 0) {
                          setSeasonErrors((prev) => ({
                            ...prev,
                            cropCategoryId: lang === 'en'
                              ? 'Please select a crop category.'
                              : 'Vui lòng chọn danh mục cây trồng.'
                          }));
                        } else {
                          setSeasonErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.cropCategoryId;
                            return updated;
                          });
                        }
                      }}
                    />
                  </div>

                  {seasonErrors.cropCategoryId && (
                    <p className="field-error"
                      style={{
                        color: '#dc2626',
                        fontSize: '12px',
                        marginTop: '5px',
                        marginBottom: 0
                      }}>
                      {seasonErrors.cropCategoryId}
                    </p>
                  )}
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-area-input" className="structured-field-label">
                      {(lang === 'en' ? "Planted area (" : "Diện tích gieo trồng (")}{translate(block.areaUnit)}) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="cs-area-input"
                      ref={seasonAreaRef}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={seasonForm.plantedArea}
                      className={seasonErrors.plantedArea ? 'input-error' : ''}
                      onChange={(e) => {
                        const value = e.target.value;

                        setSeasonForm((prev) => ({
                          ...prev,
                          plantedArea: value,
                        }));

                        const area = Number(value);

                        if (
                          !value.trim() ||
                          !Number.isFinite(area) ||
                          area <= 0
                        ) {
                          setSeasonErrors((prev) => ({
                            ...prev,
                            plantedArea: lang === 'en'
                              ? 'Please enter a valid planted area greater than 0.'
                              : 'Vui lòng nhập diện tích gieo trồng hợp lệ lớn hơn 0.',
                          }));
                        } else {
                          setSeasonErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.plantedArea;
                            return updated;
                          });
                        }
                      }}
                      required
                    />

                    {seasonErrors.plantedArea && (
                      <p className="field-error"
                        style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                        {seasonErrors.plantedArea}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-start-input" className="structured-field-label">
                      {(lang === 'en' ? "Start date " : "Ngày bắt đầu ")} <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="cs-start-input"
                      ref={seasonStartDateRef}
                      type="date"
                      value={seasonForm.startDate}
                      className={seasonErrors.startDate ? 'input-error' : ''}
                      onChange={(e) => {
                        const value = e.target.value;

                        setSeasonForm((prev) => ({
                          ...prev,
                          startDate: value,
                        }));

                        setSeasonErrors((prev) => {
                          const updated = { ...prev };

                          // Validate start date
                          if (!value) {
                            updated.startDate = lang === 'en'
                              ? 'Please select a start date.'
                              : 'Vui lòng chọn ngày bắt đầu.';
                          } else {
                            delete updated.startDate;
                          }

                          return updated;
                        });
                      }}
                      required
                    />

                    {seasonErrors.startDate && (
                      <p className="field-error"
                        style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                        {seasonErrors.startDate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="cs-end-input" className="structured-field-label">
                      {(lang === 'en' ? "Expected end date" : "Ngày kết thúc dự kiến")}
                    </label>
                    <span className="structured-field-badge">{(lang === 'en' ? "Optional" : "Tùy chọn")}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      id="cs-end-input"
                      ref={seasonEndDateRef}
                      type="date"
                      value={seasonForm.endDate}
                      className={seasonErrors.endDate ? 'input-error' : ''}
                      onChange={(e) => {
                        const value = e.target.value;

                        setSeasonForm((prev) => ({
                          ...prev,
                          endDate: value,
                          expectedHarvestAt: value,
                        }));

                        setSeasonErrors((prev) => {
                          const updated = { ...prev };

                          if (seasonForm.startDate && value <= seasonForm.startDate) {
                            updated.endDate = lang === 'en'
                              ? 'End date must be after the start date.'
                              : 'Ngày kết thúc phải sau ngày bắt đầu.';
                          } else if (seasonForm.startDate) {
                            const start = new Date(`${seasonForm.startDate}T00:00:00`);
                            const end = new Date(`${value}T00:00:00`);

                            const durationDays = Math.round(
                              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                            );

                            if (durationDays < 7) {
                              updated.endDate = lang === 'en'
                                ? 'A crop season must last at least 7 days.'
                                : 'Mùa vụ phải kéo dài ít nhất 7 ngày.';
                            } else {
                              delete updated.endDate;
                            }
                          } else {
                            delete updated.endDate;
                          }

                          return updated;
                        });
                      }}
                    />

                    {seasonErrors.endDate && (
                      <p className="field-error"
                        style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                        {seasonErrors.endDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <label htmlFor="cs-notes-input" className="structured-field-label">
                    {(lang === 'en' ? "Season notes" : "Ghi chú mùa vụ")}
                  </label>
                  <span className="structured-field-badge">{(lang === 'en' ? "Optional" : "Tùy chọn")}</span>
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
                <button type="button" className="ghost-button" onClick={() => {
                  setSeasonModalMode(null);
                  setSeasonErrors({});
                }}>
                  {(lang === 'en' ? "Cancel" : "Hủy")}
                </button>
                <button type="submit" className="primary-button" disabled={savingSeason}>
                  {(lang === 'en' ? savingSeason ? "Saving..." : seasonModalMode === 'create' ? "Create season" : "Save changes" : savingSeason ? 'Đang lưu...' : seasonModalMode === 'create' ? 'Tạo mùa vụ' : 'Lưu thay đổi')}
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
                <span className="eyebrow">{(lang === 'en' ? "Risk assessment · " : "Đánh giá rủi ro · ")} {block.blockName}</span>
                <h2>
                  {riskModalMode === 'create'
                    ? (lang === 'en' ? 'Add Risk Record' : 'Thêm ghi nhận rủi ro')
                    : riskModalMode === 'edit'
                      ? (lang === 'en' ? "Update control measures" : 'Cập nhật biện pháp kiểm soát')
                      : (lang === 'en' ? "Risk record details" : 'Chi tiết hồ sơ rủi ro')}
                </h2>
              </div>
              <button type="button" className="modal-close" onClick={() => {
                setRiskErrors({});
                setRiskModalMode(null);
              }}>
                ✕
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSaveBlockRisk} noValidate>
              {Object.keys(riskErrors).length > 0 && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} />

                  {lang === 'en'
                    ? 'Please correct the highlighted fields before adding.'
                    : 'Vui lòng sửa các trường được đánh dấu trước khi thêm.'}
                </div>
              )}
              <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                  <span className="structured-field-label" style={{ color: '#065f46' }}>
                    {(lang === 'en' ? "Applicable Block" : "Block áp dụng")}
                  </span>
                </div>
                <strong style={{ color: '#047857' }}>🌿 {block.blockName} · {resolvedZoneName}</strong>
              </div>

              <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">
                      {(lang === 'en' ? "Assessment date" : "Ngày đánh giá")} <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      ref={riskDateRef}
                      type="date"
                      value={riskForm.assessedAt}
                      disabled={riskModalMode === 'view'}
                      className={riskErrors.assessedAt ? 'input-error' : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const today = new Date();
                        const todayString = [
                          today.getFullYear(),
                          String(today.getMonth() + 1).padStart(2, '0'),
                          String(today.getDate()).padStart(2, '0'),
                        ].join('-');

                        setRiskForm((prev) => ({
                          ...prev,
                          assessedAt: value,
                        }));

                        setRiskErrors((prev) => {
                          const updated = { ...prev };

                          // Validate assessed date
                          if (value > todayString) {
                            updated.assessedAt = lang === 'en'
                              ? 'Assessment date cannot be in the future.'
                              : 'Ngày đánh giá không được nằm trong tương lai.';
                          } else {
                            delete updated.assessedAt;
                          }

                          return updated;
                        });
                      }}
                      required
                    />

                    {riskErrors.assessedAt && (
                      <p className="field-error" style={{
                        color: '#dc2626',
                        fontSize: '12px',
                        marginTop: '5px',
                        marginBottom: 0
                      }}>{riskErrors.assessedAt}</p>
                    )}
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">
                      {(lang === 'en' ? "Risk level" : "Mức độ rủi ro")} <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <select
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
                  <span className="structured-field-label">
                    {(lang === 'en' ? "Risk type" : "Loại rủi ro")} <span style={{ color: '#dc2626' }}>*</span>
                  </span>
                  <span className="structured-field-badge">{riskForm.riskType.length}{(lang === 'en' ? "/150 characters" : "/150 ký tự")}</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <input
                    ref={riskTypeRef}
                    type="text"
                    maxLength={150}
                    value={riskForm.riskType}
                    disabled={riskModalMode === 'view'}
                    className={riskErrors.riskType ? 'input-error' : ''}
                    onChange={(e) => {
                      const value = e.target.value;

                      setRiskForm((prev) => ({
                        ...prev,
                        riskType: value,
                      }));

                      if (!value.trim()) {
                        setRiskErrors((prev) => ({
                          ...prev,
                          riskType: lang === 'en'
                            ? 'Risk type is required.'
                            : 'Vui lòng nhập loại rủi ro.'
                        }));
                      } else {
                        setRiskErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.riskType;
                          return updated;
                        });
                      }
                    }}
                    required
                  />

                  {riskErrors.riskType && (
                    <p className="field-error" style={{
                      color: '#dc2626',
                      fontSize: '12px',
                      marginTop: '5px',
                      marginBottom: 0
                    }}>
                      {riskErrors.riskType}
                    </p>
                  )}
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">{(lang === 'en' ? "Previous findings" : "Phát hiện trước đây")}</span>
                  <span className="structured-field-badge">{(lang === 'en' ? "Optional" : "Tùy chọn")}</span>
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
                  <span className="structured-field-label">
                    {(lang === 'en' ? "Risk description" : "Mô tả nguy cơ rủi ro")} <span style={{ color: '#dc2626' }}>*</span>
                  </span>
                  <span className="structured-field-badge">{riskForm.description.length}{(lang === 'en' ? "/1500 characters" : "/1500 ký tự")}</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    ref={riskDescriptionRef}
                    rows={2}
                    maxLength={1500}
                    value={riskForm.description}
                    disabled={riskModalMode === 'view'}
                    className={riskErrors.description ? 'input-error' : ''}
                    onChange={(e) => {
                      const value = e.target.value;

                      setRiskForm((prev) => ({
                        ...prev,
                        description: value,
                      }));

                      if (!value.trim()) {
                        setRiskErrors((prev) => ({
                          ...prev,
                          description: lang === 'en'
                            ? 'Risk description is required.'
                            : 'Vui lòng nhập mô tả nguy cơ rủi ro.'
                        }));
                      } else {
                        setRiskErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.description;
                          return updated;
                        });
                      }
                    }}
                    required
                  />

                  {riskErrors.description && (
                    <p className="field-error" style={{
                      color: '#dc2626',
                      fontSize: '12px',
                      marginTop: '5px',
                      marginBottom: 0
                    }}>
                      {riskErrors.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="structured-field-card" style={{ marginBottom: 0 }}>
                <div className="structured-field-header">
                  <span className="structured-field-label">
                    {(lang === 'en' ? "Control measures" : "Biện pháp kiểm soát")} <span style={{ color: '#dc2626' }}>*</span>
                  </span>
                  <span className="structured-field-badge">{riskForm.controlMeasures.length}{(lang === 'en' ? "/1500 characters" : "/1500 ký tự")}</span>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <textarea
                    ref={riskControlMeasuresRef}
                    rows={3}
                    value={riskForm.controlMeasures}
                    disabled={riskModalMode === 'view'}
                    className={riskErrors.controlMeasures ? 'input-error' : ''}
                    onChange={(e) => {
                      const value = e.target.value;

                      setRiskForm((prev) => ({
                        ...prev,
                        controlMeasures: value,
                      }));

                      if (!value.trim()) {
                        setRiskErrors((prev) => ({
                          ...prev,
                          controlMeasures: lang === 'en'
                            ? 'Control measures is required.'
                            : 'Vui lòng nhập biện pháp kiểm soát.'
                        }));
                      } else {
                        setRiskErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.controlMeasures;
                          return updated;
                        });
                      }
                    }}
                    required
                  />

                  {riskErrors.controlMeasures && (
                    <p className="field-error" style={{
                      color: '#dc2626',
                      fontSize: '12px',
                      marginTop: '5px',
                      marginBottom: 0
                    }}>
                      {riskErrors.controlMeasures}
                    </p>
                  )}
                </div>
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
                <button type="button" className="ghost-button" onClick={() => {
                  setRiskErrors({});
                  setRiskModalMode(null);
                }}>
                  {(lang === 'en' ? riskModalMode === 'view' ? "Close" : "Cancel" : riskModalMode === 'view' ? 'Đóng' : 'Hủy')}
                </button>
                {riskModalMode !== 'view' && (
                  <button type="submit" className="primary-button">
                    {(lang === 'en' ? "Save record" : "Lưu ghi nhận")}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div >
      )
      }

      {/* Soil Assessment Modal */}
      {
        soilModalMode && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card" style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
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
                <button type="button" className="modal-close" onClick={() => {
                  setSoilModalMode(null);
                  setSoilErrors({});
                }}>
                  ✕
                </button>
              </div>
              <form className="modal-body" onSubmit={handleSaveSoil} noValidate>
                {Object.keys(soilErrors).length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={18} />

                    {lang === 'en'
                      ? 'Please correct the highlighted fields before saving.'
                      : 'Vui lòng sửa các trường được đánh dấu trước khi lưu.'}
                  </div>
                )}
                <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                  <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                    <span className="structured-field-label" style={{ color: '#065f46' }}>
                      {(lang === 'en' ? "Applicable Block" : "Block áp dụng")}
                    </span>
                  </div>
                  <strong style={{ color: '#047857' }}>🌿 {block.blockName} · {resolvedZoneName}</strong>
                </div>

                <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <span className="structured-field-label">{(lang === 'en' ? "Assessment date" : "Ngày đánh giá")} <span style={{ color: '#dc2626' }}>*</span> </span>
                      <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        ref={assessedAtRef}
                        type="date"
                        value={soilForm.assessedAt}
                        disabled={soilModalMode === 'view'}
                        onChange={(e) => {
                          const value = e.target.value;
                          const today = new Date();
                          const todayString = [
                            today.getFullYear(),
                            String(today.getMonth() + 1).padStart(2, '0'),
                            String(today.getDate()).padStart(2, '0'),
                          ].join('-');

                          setSoilForm((prev) => ({
                            ...prev,
                            assessedAt: value,
                          }));

                          setSoilErrors((prev) => {
                            const updated = { ...prev };

                            // Validate assessed date
                            if (value > todayString) {
                              updated.assessedAt = lang === 'en'
                                ? 'Assessment date cannot be in the future.'
                                : 'Ngày đánh giá không được nằm trong tương lai.';
                            } else {
                              delete updated.assessedAt;
                            }

                            return updated;
                          });
                        }}
                        required
                      />
                      {soilErrors.assessedAt && (
                        <p className="field-error" style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                          {soilErrors.assessedAt}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <span className="structured-field-label">
                        {(lang === 'en' ? "Soil sample code" : "Mã mẫu đất")} <span style={{ color: '#dc2626' }}>*</span>
                      </span>
                      <span className="structured-field-badge">{soilForm.sampleCode.length}{(lang === 'en' ? "/50 chars" : "/50 ký tự")}</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        ref={sampleCodeRef}
                        type="text"
                        maxLength={50}
                        value={soilForm.sampleCode}
                        disabled={soilModalMode === 'view'}
                        onChange={(e) => {
                          const value = e.target.value;

                          setSoilForm((prev) => ({
                            ...prev,
                            sampleCode: value,
                          }));

                          setSoilErrors((prev) => {
                            const updated = { ...prev };

                            // Validate assessed date
                            if (!value.trim()) {
                              updated.sampleCode = lang === 'en'
                                ? 'Soil sample code is required.'
                                : 'Vui lòng nhập mã mẫu đất.'
                            } else {
                              delete updated.sampleCode;
                            }

                            return updated;
                          });
                        }}
                        required
                      />
                      {soilErrors.sampleCode && (
                        <p className="field-error" style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                          {soilErrors.sampleCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <span className="structured-field-label">
                        {(lang === 'en' ? "Soil pH" : "Độ pH đất")} <span style={{ color: '#dc2626' }}>*</span>
                      </span>
                      <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        ref={phLevelRef}
                        type="number"
                        step="0.1"
                        max="14"
                        min="0"
                        value={soilForm.phLevel}
                        disabled={soilModalMode === 'view'}
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value;

                          setSoilForm((prev) => ({
                            ...prev,
                            phLevel: value,
                          }));

                          setSoilErrors((prev) => {
                            const updated = { ...prev };

                            if (!value.trim()) {
                              updated.phLevel =
                                lang === 'en'
                                  ? 'Soil pH is required.'
                                  : 'Vui lòng nhập độ pH đất.';
                            } else if (Number(value) < 0 || Number(value) > 14) {
                              updated.phLevel =
                                lang === 'en'
                                  ? 'Soil pH must be between 0 and 14.'
                                  : 'Độ pH đất phải nằm trong khoảng từ 0 đến 14.';
                            } else {
                              delete updated.phLevel;
                            }

                            return updated;
                          });
                        }}
                        required
                      />
                      {soilErrors.phLevel && (
                        <p className="field-error" style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                          {soilErrors.phLevel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <span className="structured-field-label">
                        {(lang === 'en' ? "Organic matter (%)" : "Chất hữu cơ (%)")} <span style={{ color: '#dc2626' }}>*</span>
                      </span>
                      <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        ref={organicMatterRef}
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={soilForm.organicMatterPct}
                        disabled={soilModalMode === 'view'}
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value;

                          setSoilForm((prev) => ({
                            ...prev,
                            organicMatterPct: value,
                          }));

                          setSoilErrors((prev) => {
                            const updated = { ...prev };

                            if (!value.trim()) {
                              updated.organicMatterPct =
                                lang === 'en'
                                  ? 'Organic matter percentage is required.'
                                  : 'Vui lòng nhập tỷ lệ chất hữu cơ.';
                            } else if (
                              !Number.isFinite(Number(value)) ||
                              Number(value) < 0 ||
                              Number(value) > 100
                            ) {
                              updated.organicMatterPct =
                                lang === 'en'
                                  ? 'Organic matter must be between 0 and 100%.'
                                  : 'Tỷ lệ chất hữu cơ phải nằm trong khoảng từ 0 đến 100%.';
                            } else {
                              delete updated.organicMatterPct;
                            }

                            return updated;
                          });
                        }}
                        required
                      />
                      {soilErrors.organicMatterPct && (
                        <p className="field-error" style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                          {soilErrors.organicMatterPct}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">
                      {(lang === 'en' ? "Testing laboratory" : "Phòng kiểm nghiệm")} <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <span className="structured-field-badge">{soilForm.laboratoryName.length}{(lang === 'en' ? "/150 characters" : "/150 ký tự")}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      ref={laboratoryNameRef}
                      type="text"
                      maxLength={150}
                      value={soilForm.laboratoryName}
                      disabled={soilModalMode === 'view'}
                      onChange={(e) => {
                        const value = e.target.value;

                        setSoilForm((prev) => ({
                          ...prev,
                          laboratoryName: value,
                        }));

                        setSoilErrors((prev) => {
                          const updated = { ...prev };

                          if (!value.trim()) {
                            updated.laboratoryName =
                              lang === 'en'
                                ? 'Laboratory name is required.'
                                : 'Vui lòng nhập tên phòng thí nghiệm.';
                          } else if (value.trim().length > 150) {
                            updated.laboratoryName =
                              lang === 'en'
                                ? 'Laboratory name cannot exceed 150 characters.'
                                : 'Tên phòng thí nghiệm không được vượt quá 150 ký tự.';
                          } else {
                            delete updated.laboratoryName;
                          }

                          return updated;
                        });
                      }}
                      required
                    />
                    {soilErrors.laboratoryName && (
                      <p className="field-error" style={{
                        color: '#dc2626',
                        fontSize: '12px',
                        marginTop: '5px',
                        marginBottom: 0
                      }}>
                        {soilErrors.laboratoryName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">
                      {(lang === 'en' ? "Heavy Metals & Microorganisms" : "Kim loại nặng & Vi sinh")} <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <span className="structured-field-badge">{soilForm.microbialStatus.length}{(lang === 'en' ? "/500 characters" : "/500 ký tự")}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <textarea
                      ref={microbialStatusRef}
                      rows={3}
                      maxLength={500}
                      value={soilForm.microbialStatus}
                      disabled={soilModalMode === 'view'}
                      placeholder={
                        lang === 'en'
                          ? 'Enter heavy metals and microorganisms test results...'
                          : 'Nhập kết quả kiểm tra kim loại nặng và vi sinh vật...'
                      }
                      onChange={(e) => {
                        const value = e.target.value;

                        setSoilForm((prev) => ({
                          ...prev,
                          microbialStatus: value,
                        }));

                        setSoilErrors((prev) => {
                          const updated = { ...prev };

                          if (!value.trim()) {
                            updated.microbialStatus =
                              lang === 'en'
                                ? 'Heavy metals and microorganisms status is required.'
                                : 'Vui lòng nhập tình trạng kim loại nặng và vi sinh vật.';
                          } else {
                            delete updated.microbialStatus;
                          }

                          return updated;
                        });
                      }}
                      required
                    />
                    {soilErrors.microbialStatus && (
                      <p className="field-error" style={{
                        color: '#dc2626',
                        fontSize: '12px',
                        marginTop: '5px',
                        marginBottom: 0
                      }}>
                        {soilErrors.microbialStatus}
                      </p>
                    )}
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">{(lang === 'en' ? "Notes & Recommendations" : "Ghi chú & Khuyến nghị")}</span>
                    <span className="structured-field-badge">{(lang === 'en' ? "Optional" : "Tùy chọn")}</span>
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
                  <button type="button" className="ghost-button" onClick={() => { setSoilModalMode(null); setSoilErrors({}); }}>
                    {(lang === 'en' ? soilModalMode === 'view' ? "Close" : "Cancel" : soilModalMode === 'view' ? 'Đóng' : 'Hủy')}
                  </button>
                  {soilModalMode !== 'view' && (
                    <button type="submit" className="primary-button">
                      {(lang === 'en' ? "Save assessment" : "Lưu đánh giá")}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Water Assessment Modal */}
      {
        waterModalMode && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card" style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow">{(lang === 'en' ? "Water source assessment · " : "Đánh giá nguồn nước · ")} {block.blockName}</span>
                  <h2>
                    {waterModalMode === 'create'
                      ? (lang === 'en' ? 'Add Water Assessment' : 'Thêm đánh giá nước')
                      : waterModalMode === 'edit'
                        ? (lang === 'en' ? "Update water assessment" : 'Cập nhật đánh giá nước')
                        : (lang === 'en' ? "Water assessment details" : 'Chi tiết đánh giá nước')}
                  </h2>
                </div>
                <button type="button" className="modal-close" onClick={() => {
                  setWaterModalMode(null)
                  setWaterErrors({})
                }}>
                  ✕
                </button>
              </div>
              <form className="modal-body" onSubmit={handleSaveWater}>
                {Object.keys(waterErrors).length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={18} />

                    {lang === 'en'
                      ? 'Please correct the highlighted fields before saving.'
                      : 'Vui lòng sửa các trường được đánh dấu trước khi lưu.'}
                  </div>
                )}
                <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
                  <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
                    <span className="structured-field-label" style={{ color: '#065f46' }}>
                      {(lang === 'en' ? "Applicable Block" : "Block áp dụng")}
                    </span>
                  </div>
                  <strong style={{ color: '#047857' }}>🌿 {block.blockName} · {resolvedZoneName}</strong>
                </div>

                <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <span className="structured-field-label">
                        {(lang === 'en' ? "Assessment date" : "Ngày đánh giá")} <span style={{ color: '#dc2626' }}>*</span>
                      </span>
                      <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        ref={waterDateRef}
                        type="date"
                        value={waterForm.assessedAt}
                        disabled={waterModalMode === 'view'}
                        onChange={(e) => {
                          const value = e.target.value;
                          const today = new Date();
                          const todayString = [
                            today.getFullYear(),
                            String(today.getMonth() + 1).padStart(2, '0'),
                            String(today.getDate()).padStart(2, '0'),
                          ].join('-');

                          setWaterForm((prev) => ({
                            ...prev,
                            assessedAt: value,
                          }));

                          setWaterErrors((prev) => {
                            const updated = { ...prev };

                            // Validate assessed date
                            if (value > todayString) {
                              updated.assessedAt = lang === 'en'
                                ? 'Assessment date cannot be in the future.'
                                : 'Ngày đánh giá không được nằm trong tương lai.';
                            } else {
                              delete updated.assessedAt;
                            }

                            return updated;
                          });
                        }}
                        required
                      />
                      {waterErrors.assessedAt && (
                        <p className="field-error" style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                          {waterErrors.assessedAt}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <span className="structured-field-label">
                        {(lang === 'en' ? "Water sample code" : "Mã mẫu nước")} <span style={{ color: '#dc2626' }}>*</span>
                      </span>
                      <span className="structured-field-badge">{waterForm.sampleCode.length}{(lang === 'en' ? "/50 chars" : "/50 ký tự")}</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        ref={waterCodeRef}
                        type="text"
                        maxLength={50}
                        value={waterForm.sampleCode}
                        disabled={waterModalMode === 'view'}
                        onChange={(e) => {
                          const value = e.target.value;

                          setWaterForm((prev) => ({
                            ...prev,
                            sampleCode: value,
                          }));

                          setWaterErrors((prev) => {
                            const updated = { ...prev };

                            // Validate assessed date
                            if (!value.trim()) {
                              updated.sampleCode = lang === 'en'
                                ? 'Water sample code is required.'
                                : 'Vui lòng nhập mã mẫu đất.'
                            } else if (value.trim().length > 50) {
                              updated.sampleCode =
                                lang === 'en'
                                  ? 'Sample code cannot exceed 50 characters.'
                                  : 'Mã mẫu nước không được vượt quá 50 ký tự.';
                            } else {
                              delete updated.sampleCode;
                            }

                            return updated;
                          });
                        }}
                        required
                      />
                      {waterErrors.sampleCode && (
                        <p className="field-error" style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                          {waterErrors.sampleCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">
                      {(lang === 'en' ? "Irrigation water source" : "Nguồn nước tưới")} <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <span className="structured-field-badge">{waterForm.waterSource.length}{(lang === 'en' ? "/150 characters" : "/150 ký tự")}</span>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <input
                      ref={waterSourceRef}
                      type="text"
                      maxLength={150}
                      value={waterForm.waterSource}
                      disabled={waterModalMode === 'view'}
                      onChange={(e) => {
                        const value = e.target.value;

                        setWaterForm((prev) => ({
                          ...prev,
                          laboratoryName: value,
                        }));

                        setWaterErrors((prev) => {
                          const updated = { ...prev };

                          if (!value.trim()) {
                            updated.waterSource =
                              lang === 'en'
                                ? 'Irrigation water source is required.'
                                : 'Vui lòng nhập nguồn nước tưới.';
                          } else if (value.trim().length > 150) {
                            updated.waterSource =
                              lang === 'en'
                                ? 'Water source cannot exceed 150 characters.'
                                : 'Nguồn nước không được vượt quá 150 ký tự.';
                          } else {
                            delete updated.waterSource;
                          }

                          return updated;
                        });
                      }}
                      required
                    />
                    {waterErrors.waterSource && (
                      <p className="field-error" style={{
                        color: '#dc2626',
                        fontSize: '12px',
                        marginTop: '5px',
                        marginBottom: 0
                      }}>
                        {waterErrors.waterSource}
                      </p>
                    )}
                  </div>
                </div>

                <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <span className="structured-field-label">
                        {(lang === 'en' ? "Water pH" : "Độ pH nước")} <span style={{ color: '#dc2626' }}>*</span>
                      </span>
                      <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        ref={waterPhLevelRef}
                        type="number"
                        step="0.1"
                        min={0}
                        max={14}
                        value={waterForm.phLevel}
                        disabled={waterModalMode === 'view'}
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value;

                          setWaterForm((prev) => ({
                            ...prev,
                            phLevel: value,
                          }));

                          setWaterErrors((prev) => {
                            const updated = { ...prev };

                            if (!value.trim()) {
                              updated.phLevel =
                                lang === 'en'
                                  ? 'Water pH is required.'
                                  : 'Vui lòng nhập độ pH đất.';
                            } else if (Number(value) < 0 || Number(value) > 14) {
                              updated.phLevel =
                                lang === 'en'
                                  ? 'Water pH must be between 0 and 14.'
                                  : 'Độ pH nước phải nằm trong khoảng từ 0 đến 14.';
                            } else {
                              delete updated.phLevel;
                            }

                            return updated;
                          });
                        }}
                        required
                      />
                      {waterErrors.phLevel && (
                        <p className="field-error" style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                          {waterErrors.phLevel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <span className="structured-field-label">
                        {(lang === 'en' ? "EC (dS/m)" : "Độ dẫn điện EC (dS/m)")} <span style={{ color: '#dc2626' }}>*</span>
                      </span>
                      <span className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</span>
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <input
                        ref={ecValueRef}
                        type="number"
                        step="0.01"
                        min={0}
                        value={waterForm.ecValue}
                        disabled={waterModalMode === 'view'}
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.value;

                          setWaterForm((prev) => ({
                            ...prev,
                            ecValue: value,
                          }));

                          setWaterErrors((prev) => {
                            const updated = { ...prev };

                            const ec = Number(value);

                            if (!value.trim()) {
                              updated.ecValue =
                                lang === 'en'
                                  ? 'Electrical conductivity is required.'
                                  : 'Vui lòng nhập độ dẫn điện EC.';
                            } else if (!Number.isFinite(ec)) {
                              updated.ecValue =
                                lang === 'en'
                                  ? 'Please enter a valid number.'
                                  : 'Vui lòng nhập một số hợp lệ.';
                            } else if (ec < 0) {
                              updated.ecValue =
                                lang === 'en'
                                  ? 'Electrical conductivity cannot be negative.'
                                  : 'Độ dẫn điện EC không được là số âm.';
                            } else {
                              delete updated.ecValue;
                            }

                            return updated;
                          });
                        }}
                        required
                      />
                      {waterErrors.ecValue && (
                        <p className="field-error" style={{
                          color: '#dc2626',
                          fontSize: '12px',
                          marginTop: '5px',
                          marginBottom: 0
                        }}>
                          {waterErrors.ecValue}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <span className="structured-field-label">{(lang === 'en' ? "Treatment & Water Filtration" : "Biện pháp xử lý & Lọc nước")}</span>
                    <span className="structured-field-badge">{(lang === 'en' ? "Optional" : "Tùy chọn")}</span>
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
                  <button type="button" className="ghost-button" onClick={() => {
                    setWaterModalMode(null)
                    setWaterErrors({})
                  }}>
                    {(lang === 'en' ? waterModalMode === 'view' ? "Close" : "Cancel" : waterModalMode === 'view' ? 'Đóng' : 'Hủy')}
                  </button>
                  {waterModalMode !== 'view' && (
                    <button type="submit" className="primary-button">
                      {(lang === 'en' ? "Save assessment" : "Lưu đánh giá")}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )
      }

      <ConfirmDialog
        open={Boolean(soilToDelete)}
        title={(lang === 'en' ? "Confirm soil assessment deletion" : "Xác nhận xóa phiếu đánh giá thổ nhưỡng")}
        description={(lang === 'en' ? `Are you sure you want to delete soil sample assessment "${soilToDelete?.sampleCode}"? This will delete the data from the system.` : `Bạn có chắc chắn muốn xóa phiếu đánh giá mẫu đất "${soilToDelete?.sampleCode}"? Hành động này sẽ xóa dữ liệu trên hệ thống.`)}
        confirmLabel="Xóa đánh giá"
        tone="danger"
        onClose={() => setSoilToDelete(null)}
        onConfirm={handleConfirmDeleteSoil}
      />

      <ConfirmDialog
        open={isDeleteBlockOpen}
        title={(lang === 'en' ? "Confirm Block deletion" : "Xác nhận xóa Block")}
        description={(lang === 'en' ? `Are you sure you want to delete Block "${block.blockName}"?` : `Bạn có chắc chắn muốn xóa Block "${block.blockName}"?`)}
        confirmLabel="Xóa Block"
        tone="danger"
        onClose={() => setIsDeleteBlockOpen(false)}
        onConfirm={handleConfirmDeleteBlock}
      />
    </section >
  );
}
