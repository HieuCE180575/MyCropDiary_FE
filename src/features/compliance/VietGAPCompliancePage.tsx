import { formatDate } from '../../shared/format/formatters';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { DeleteErrorToast } from '../../shared/components/DeleteErrorToast';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { PageHeading } from '../../shared/components/PageHeading';
import { Modal } from '../../shared/components/Modal';
import { useDetailRequest } from '../../shared/hooks/useDetailRequest';
import { WaterAssessmentDetails } from '../production/components/WaterAssessmentDetails';
import { Button } from '../../shared/components/Button';
import { TabList, tabPanelProps } from '../../shared/components/TabList';
import {
  fetchFarmRiskHistoryApi,
  fetchFarmSoilAssessmentHistoryApi,
  fetchSoilAssessmentDetailsApi,
  fetchFarmWaterAssessmentHistoryApi,
  fetchWaterAssessmentDetailsApi,
  createSoilAssessmentApi,
  createWaterAssessmentApi,
  fetchBlocks,
  ZoneRiskBackendResp,
  SoilAssessmentBackendResp,
  WaterAssessmentBackendResp,
} from '../production/zoneBlockService';
import type { Block } from '../production/types';
import { FileUpload } from '../../shared/components/FileUpload';
import {
  TrainingRecordResp,
  fetchTrainingHistoryApi,
  fetchTrainingDetailsApi,
  createTrainingRecordApi,
  deleteTrainingRecordApi,
} from './trainingService';
import {
  ChecklistRunResp,
  fetchChecklistHistoryApi,
} from './vietgapComplianceService';
import { VietGapInitRunModal } from './VietGapInitRunModal';
import { VietGapAuditWorkspaceModal } from './VietGapAuditWorkspaceModal';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { HazardousWasteManager } from './HazardousWasteManager';
import { EquipmentMaintenanceManager } from './EquipmentMaintenanceManager';
import { CustomerComplaintManager } from './CustomerComplaintManager';

interface VietGAPComplianceProps {
  initialTab?: 'checklists' | 'assessments' | 'environment' | 'training' | 'waste' | 'equipment' | 'complaints';
}

export function VietGAPCompliancePage({ initialTab = 'checklists' }: VietGAPComplianceProps) {
  const { selectedFarm } = useFarmWorkspace();
  const { lang, t: translate } = useLanguage();
  const navigate = useNavigate();
  const waterDetailLoader = useDetailRequest(selectedFarm?.id);
  const soilDetailLoader = useDetailRequest(selectedFarm?.id);
  useEffect(() => { setSelectedEnvWater(null); setSelectedEnvSoil(null); }, [selectedFarm?.id]);
  const [activeTab, setActiveTab] = useState<'checklists' | 'assessments' | 'environment' | 'training' | 'waste' | 'equipment' | 'complaints'>(initialTab);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [farmRisks, setFarmRisks] = useState<ZoneRiskBackendResp[]>([]);
  const [farmSoils, setFarmSoils] = useState<SoilAssessmentBackendResp[]>([]);
  const [farmWaters, setFarmWaters] = useState<WaterAssessmentBackendResp[]>([]);
  const [envSubTab, setEnvSubTab] = useState<'risks' | 'soils' | 'waters'>('risks');
  const [selectedEnvWater, setSelectedEnvWater] = useState<WaterAssessmentBackendResp | null>(null);
  const [selectedEnvRisk, setSelectedEnvRisk] = useState<ZoneRiskBackendResp | null>(null);
  const [selectedEnvSoil, setSelectedEnvSoil] = useState<SoilAssessmentBackendResp | null>(null);
  const [environmentReload, setEnvironmentReload] = useState(0);
  const [soilEnvError, setSoilEnvError] = useState<string | null>(null);
  const [loadingEnv, setLoadingEnv] = useState(false);

  // Soil & Water Assessment Creation states
  const [farmBlocks, setFarmBlocks] = useState<Block[]>([]);
  const [isCreateSoilModalOpen, setIsCreateSoilModalOpen] = useState(false);
  const [isCreateWaterModalOpen, setIsCreateWaterModalOpen] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  // Form state: Soil Assessment
  const [soilBlockId, setSoilBlockId] = useState<number | ''>('');
  const [soilPh, setSoilPh] = useState<number | ''>(6.5);
  const [soilMoisture, setSoilMoisture] = useState<number | ''>(70);
  const [soilNutrient, setSoilNutrient] = useState<string>('Chỉ tiêu N-P-K cân đối, Vi sinh vật Salmonella & E. coli âm tính (Không phát hiện)');
  const [soilLabReportUrl, setSoilLabReportUrl] = useState<string>('');
  const [soilNotes, setSoilNotes] = useState<string>('');
  const [soilAssessedAt, setSoilAssessedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Form state: Water Assessment
  const [waterBlockId, setWaterBlockId] = useState<number | ''>('');
  const [waterSourceName, setWaterSourceName] = useState<string>('Nguồn nước ngầm trạm bơm A');
  const [waterSourceType, setWaterSourceType] = useState<string>('Nước ngầm');
  const [waterPh, setWaterPh] = useState<number | ''>(6.8);
  const [waterTemp, setWaterTemp] = useState<number | ''>(26);
  const [waterQualityStatus, setWaterQualityStatus] = useState<string>('DAT_CHUAN');
  const [waterLabReportUrl, setWaterLabReportUrl] = useState<string>('');
  const [waterImageUrl, setWaterImageUrl] = useState('');
  const [waterNotes, setWaterNotes] = useState<string>('');
  const [waterAssessedAt, setWaterAssessedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Training state
  const [trainingToDelete, setTrainingToDelete] = useState<TrainingRecordResp | null>(null);
  const [deletingTraining, setDeletingTraining] = useState(false);
  const [trainingDeleteError, setTrainingDeleteError] = useState<string | null>(null);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecordResp[]>([]);
  const [trainingTotal, setTrainingTotal] = useState(0);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingKeyword, setTrainingKeyword] = useState('');
  const [debouncedTrainingKeyword, setDebouncedTrainingKeyword] = useState('');
  const [trainingRefresh, setTrainingRefresh] = useState(0);
  const trainingRequest = useRef(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTrainingKeyword(trainingKeyword), 300);
    return () => window.clearTimeout(timer);
  }, [trainingKeyword]);
  const [trainingFromDate, setTrainingFromDate] = useState('');
  const [trainingToDate, setTrainingToDate] = useState('');
  const [selectedTrainingDetail, setSelectedTrainingDetail] = useState<TrainingRecordResp | null>(null);
  const [isCreateTrainingOpen, setIsCreateTrainingOpen] = useState(false);
  const [createTrainingForm, setCreateTrainingForm] = useState({
    trainingTitle: '',
    description: '',
    trainingDate: new Date().toISOString().split('T')[0],
    imageUrl: '',
  });
  const [submittingTraining, setSubmittingTraining] = useState(false);

  const trainingStats = useMemo(() => {
    const totalCourses = trainingTotal || trainingRecords.length;
    const totalAttendees = trainingRecords.reduce((sum, r) => sum + (r.attendeeCount || 0), 0);
    const currentYear = new Date().getFullYear().toString();
    const coursesThisYear = trainingRecords.filter((r) => r.trainingDate && r.trainingDate.startsWith(currentYear)).length;
    return {
      totalCourses,
      totalAttendees,
      coursesThisYear,
    };
  }, [trainingTotal, trainingRecords]);

  // Checklist runs state (Full 33-criteria audits)
  const [checklistRuns, setChecklistRuns] = useState<ChecklistRunResp[]>([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const [checklistSearch, setChecklistSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  // VietGAP 33-criteria audit workspace state
  const [isInitRunOpen, setIsInitRunOpen] = useState(false);
  const [auditWorkspaceRun, setAuditWorkspaceRun] = useState<ChecklistRunResp | null>(null);

  const isFullAuditRun = (run: ChecklistRunResp) => {
    return (
      run.ruleCategory === 'VIETGAP_FULL_AUDIT' ||
      run.totalItems === 33 ||
      Boolean(run.ruleName && run.ruleName.toLowerCase().includes('toàn diện')) ||
      Boolean(run.ruleName && run.ruleName.toLowerCase().includes('33'))
    );
  };

  const fullAuditRuns = useMemo(() => {
    return checklistRuns.filter(isFullAuditRun);
  }, [checklistRuns]);

  const activeAuditRuns: ChecklistRunResp[] = useMemo(() => {
    return fullAuditRuns.filter((run: ChecklistRunResp) => {
      const q = checklistSearch.toLowerCase().trim();
      const season = (run.seasonName || '').toLowerCase();
      const rule = (run.ruleName || '').toLowerCase();
      const id = `#${run.runId}`;
      const auditor = (run.assignedToName || '').toLowerCase();
      const block = (run.blockName || '').toLowerCase();
      const matchKw = !q || season.includes(q) || rule.includes(q) || id.includes(q) || auditor.includes(q) || block.includes(q);

      const isCompleted = run.runStatus === 'completed';
      const matchStatus =
        auditStatusFilter === 'all' ||
        (auditStatusFilter === 'completed' && isCompleted) ||
        (auditStatusFilter === 'in_progress' && !isCompleted);

      return matchKw && matchStatus;
    });
  }, [fullAuditRuns, checklistSearch, auditStatusFilter]);

  const loadChecklistRuns = async () => {
    if (!selectedFarm?.id) return;
    setLoadingChecklists(true);
    try {
      const runs = await fetchChecklistHistoryApi(selectedFarm.id);
      setChecklistRuns(runs);
    } catch {
      setChecklistRuns([]);
    } finally {
      setLoadingChecklists(false);
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if ((activeTab === 'checklists' || activeTab === 'assessments') && selectedFarm?.id) {
      void loadChecklistRuns();
    }
  }, [activeTab, selectedFarm?.id]);

  const loadTrainings = async () => {
    if (!selectedFarm?.id) return;
    const request = ++trainingRequest.current;
    setTrainingLoading(true);
    setTrainingError(null);
    try {
      const resp = await fetchTrainingHistoryApi(selectedFarm.id, {
        keyword: debouncedTrainingKeyword.trim() || undefined,
        fromDate: trainingFromDate || undefined,
        toDate: trainingToDate || undefined,
        size: 50,
      });
      if (request !== trainingRequest.current) return;
      setTrainingRecords(resp.items || []);
      setTrainingTotal(resp.totalElements || 0);
    } catch (err) {
      if (request !== trainingRequest.current) return;
      setTrainingError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load training records." : err instanceof Error ? err.message : 'Không tải được danh sách hồ sơ đào tạo.'));
    } finally {
      if (request === trainingRequest.current) setTrainingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'training' && selectedFarm?.id) {
      void loadTrainings();
    }
    return () => { trainingRequest.current += 1; };
  }, [activeTab, selectedFarm?.id, debouncedTrainingKeyword, trainingFromDate, trainingToDate, trainingRefresh]);

  const handleViewTrainingDetail = async (id: number) => {
    try {
      const detail = await fetchTrainingDetailsApi(id);
      setSelectedTrainingDetail(detail);
    } catch (err) {
      alert((lang === 'en' ? err instanceof Error ? err.message : "Unable to load training details." : err instanceof Error ? err.message : 'Không tải được chi tiết đào tạo.'));
    }
  };

  const handleDeleteTraining = async (id: number) => {
    setDeletingTraining(true);
    setTrainingDeleteError(null);
    try {
      await deleteTrainingRecordApi(id);
      void loadTrainings();
    } catch (err) {
      setTrainingDeleteError((lang === 'en' ? err instanceof Error ? err.message : "Unable to delete training record." : err instanceof Error ? err.message : 'Không thể xóa hồ sơ đào tạo.'));
    } finally {
      setDeletingTraining(false);
      setTrainingToDelete(null);
    }
  };

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !createTrainingForm.trainingTitle.trim() || !createTrainingForm.trainingDate) return;
    setSubmittingTraining(true);
    try {
      await createTrainingRecordApi(selectedFarm.id, {
        trainingTitle: createTrainingForm.trainingTitle.trim(),
        description: createTrainingForm.description.trim() || undefined,
        trainingDate: createTrainingForm.trainingDate,
        imageUrl: createTrainingForm.imageUrl.trim() || undefined,
      });
      setIsCreateTrainingOpen(false);
      setCreateTrainingForm({
        trainingTitle: '',
        description: '',
        trainingDate: new Date().toISOString().split('T')[0],
        imageUrl: '',
      });
      void loadTrainings();
    } catch (err) {
      alert((lang === 'en' ? err instanceof Error ? err.message : "Unable to create training record." : err instanceof Error ? err.message : 'Không thể tạo hồ sơ đào tạo.'));
    } finally {
      setSubmittingTraining(false);
    }
  };

  const handleSaveSoilAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soilBlockId || savingAssessment) return;
    setSavingAssessment(true);
    setAssessmentError(null);
    try {
      const created = await createSoilAssessmentApi(Number(soilBlockId), {
        soilPh: soilPh !== '' ? Number(soilPh) : undefined,
        moisturePercent: soilMoisture !== '' ? Number(soilMoisture) : undefined,
        nutrientData: soilNutrient.trim() || undefined,
        notes: soilNotes.trim() || undefined,
        labTestReportUrl: soilLabReportUrl.trim() || undefined,
        assessedAt: soilAssessedAt ? new Date(soilAssessedAt).toISOString() : new Date().toISOString(),
      });
      setFarmSoils((prev) => [created, ...prev]);
      setIsCreateSoilModalOpen(false);
      setSoilNotes('');
      setSoilLabReportUrl('');
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : 'Không lưu được phiếu đánh giá đất');
    } finally {
      setSavingAssessment(false);
    }
  };

  const handleSaveWaterAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBlockId = waterBlockId;
    if (!targetBlockId || savingAssessment) return;
    setSavingAssessment(true);
    setAssessmentError(null);
    try {
      const created = await createWaterAssessmentApi(Number(targetBlockId), {
        waterSourceName: waterSourceName.trim(),
        waterSourceType: waterSourceType.trim(),
        waterPh: waterPh !== '' ? Number(waterPh) : undefined,
        temperatureC: waterTemp !== '' ? Number(waterTemp) : undefined,
        qualityStatus: waterQualityStatus,
        notes: waterNotes.trim() || undefined,
        imageUrl: waterImageUrl.trim() || undefined,
        labTestReportUrl: waterLabReportUrl.trim() || undefined,
        assessedAt: waterAssessedAt ? new Date(waterAssessedAt).toISOString() : new Date().toISOString(),
      });
      setFarmWaters((prev) => [created, ...prev]);
      setIsCreateWaterModalOpen(false);
      setWaterNotes('');
      setWaterLabReportUrl('');
      setWaterImageUrl('');
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : 'Không lưu được phiếu đánh giá nước');
    } finally {
      setSavingAssessment(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (activeTab === 'environment' && selectedFarm?.id) {
      setLoadingEnv(true);
      setSoilEnvError(null);
      setFarmSoils([]);
      Promise.all([
        fetchFarmRiskHistoryApi(selectedFarm.id).catch(() => []),
        fetchFarmSoilAssessmentHistoryApi(selectedFarm.id).catch(err => { if (!cancelled) setSoilEnvError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load soil assessments.' : 'Không tải được đánh giá đất.')); return []; }),
        fetchFarmWaterAssessmentHistoryApi(selectedFarm.id).catch(() => []),
        fetchBlocks(selectedFarm.id).catch(() => []),
      ]).then(([risks, soils, waters, blocks]) => {
        if (cancelled) return;
        setFarmRisks(risks || []);
        setFarmSoils(soils || []);
        setFarmWaters(waters || []);
        setFarmBlocks(blocks || []);
        if (blocks && blocks.length > 0) {
          setSoilBlockId((prev) => prev || blocks[0].blockId);
          setWaterBlockId((prev) => prev || blocks[0].blockId);
        }
      }).finally(() => {
        if (!cancelled) setLoadingEnv(false);
      });
    }
    return () => { cancelled = true; };
  }, [activeTab, selectedFarm?.id, environmentReload]);

  return (
    <section className="vietgap-compliance-page">
      {trainingDeleteError && <DeleteErrorToast text={trainingDeleteError} onClose={() => setTrainingDeleteError(null)} />}
      <ConfirmDialog open={Boolean(trainingToDelete)}
        title={lang === 'en' ? 'Delete training record' : 'Xóa hồ sơ đào tạo'}
        tone="danger" loading={deletingTraining}
        confirmLabel={lang === 'en' ? 'Delete record' : 'Xóa hồ sơ'}
        onClose={() => { if (!deletingTraining) setTrainingToDelete(null); }}
        onConfirm={() => { if (trainingToDelete) void handleDeleteTraining(trainingToDelete.trainingRecordId); }}>
        <p>{lang === 'en' ? 'Are you sure you want to delete training record ' : 'Bạn có chắc chắn muốn xóa hồ sơ đào tạo '}
          <strong>{trainingToDelete?.trainingTitle}</strong>?</p>
      </ConfirmDialog>

      {/* VietGAP Main Compliance Navigation Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <TabList
          idPrefix="vietgap-main-tabs"
          label={lang === 'en' ? 'VietGAP Compliance Sections' : 'Các phân hệ Tuân thủ VietGAP'}
          value={activeTab === 'checklists' ? 'assessments' : activeTab}
          onChange={(val) => setActiveTab(val as typeof activeTab)}
          items={[
            {
              value: 'assessments',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="check" size={16} />
                  {lang === 'en' ? '33 VietGAP Audits' : 'Đánh giá nội bộ 33 Tiêu chí'}
                </span>
              ),
            },
            {
              value: 'environment',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="plots" size={16} />
                  {lang === 'en' ? 'Soil, Water & Risks (4.1)' : 'Đất, Nước & Rủi ro (4.1)'}
                </span>
              ),
            },
            {
              value: 'training',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="users" size={16} />
                  {lang === 'en' ? 'Worker Training (4.2)' : 'Tập huấn & Đào tạo (4.2)'}
                </span>
              ),
            },
            {
              value: 'waste',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="trash" size={16} />
                  {lang === 'en' ? 'Waste & Packaging (4.8)' : 'Vỏ thuốc & Rác thải (4.8)'}
                </span>
              ),
            },
            {
              value: 'equipment',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="wrench" size={16} />
                  {lang === 'en' ? 'Equipment Maintenance (4.9)' : 'Bảo dưỡng & Rửa bình (4.9)'}
                </span>
              ),
            },
            {
              value: 'complaints',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="message" size={16} />
                  {lang === 'en' ? 'Complaints & Recall (4.10)' : 'Khiếu nại & Thu hồi (4.10)'}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* 1. Màn hình: Đánh giá nội bộ VietGAP (Tích hợp Checklist & Đánh giá nội bộ 33 tiêu chí TCVN 11892-1:2017) */}
      {(activeTab === 'checklists' || activeTab === 'assessments') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeading
            title={<>{lang === 'en' ? 'VietGAP Internal Assessments' : 'Đánh giá nội bộ VietGAP'}</>}
            description={<>
              {(lang === 'en'
                ? "Quality control records, 33-criteria internal assessments, and VietGAP compliance checks for "
                : "Hồ sơ kiểm soát chất lượng, tự đánh giá nội bộ 33 tiêu chuẩn VietGAP TCVN 11892-1:2017 cho ")} {selectedFarm?.farmName || ''}
            </>}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                className="ui-navigation-action"
                onClick={() => navigate('/standards')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
              >
                <Icon name="book" size={16} />
                <span>{lang === 'en' ? 'VietGAP Standards TCVN' : 'Bộ tiêu chuẩn VietGAP TCVN'}</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsInitRunOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
              >
                <Icon name="plus" size={16} />
                <span>{lang === 'en' ? 'New VietGAP Audit' : 'Khởi tạo đợt tự đánh giá'}</span>
              </Button>
            </div>
          </PageHeading>

          {/* Unified Clean Card Container - Hiển thị trực tiếp danh sách các đợt tự đánh giá */}
          <div className="zone-clean-card">
            {/* Clean Filter Bar in ONE line matching TasksPage & MaterialUsagePage */}
            <div className="zone-clean-filter-bar" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Search Box */}
              <div className="zone-clean-search" style={{ flex: 1, minWidth: '220px' }}>
                <span className="search-icon" aria-hidden="true">
                  <Icon name="search" size={17} />
                </span>
                <input
                  className="ui-input"
                  type="search"
                  placeholder={lang === 'en' ? 'Search season or auditor...' : 'Tìm mùa vụ, người đánh giá, mã đợt...'}
                  value={checklistSearch}
                  onChange={(e) => setChecklistSearch(e.target.value)}
                  aria-label={lang === 'en' ? 'Search season, auditor, #ID...' : 'Tìm mùa vụ, người đánh giá, mã đợt...'}
                />
              </div>

              {/* Filter by Status */}
              <div className="zone-clean-select-wrap" style={{ minWidth: '170px' }}>
                <select
                  className="ui-select"
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value as 'all' | 'in_progress' | 'completed')}
                  aria-label={lang === 'en' ? 'Filter by status' : 'Lọc theo trạng thái'}
                >
                  <option value="all">{lang === 'en' ? 'All Statuses' : 'Tất cả trạng thái'}</option>
                  <option value="in_progress">{lang === 'en' ? 'Active / In Progress' : 'Đang thực hiện'}</option>
                  <option value="completed">{lang === 'en' ? 'Completed' : 'Đã hoàn thành'}</option>
                </select>
                <span className="select-arrow" aria-hidden="true">
                  <Icon name="chevron" size={16} />
                </span>
              </div>

              {/* Reset Filter Button */}
              {(checklistSearch || auditStatusFilter !== 'all') && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setChecklistSearch('');
                    setAuditStatusFilter('all');
                  }}
                  style={{ height: '38px', padding: '0 12px', fontSize: '13px' }}
                >
                  {lang === 'en' ? '✕ Reset' : '✕ Đặt lại'}
                </Button>
              )}

              {/* Refresh Button */}
              <button
                type="button"
                className="zone-clean-reload-btn"
                title={lang === 'en' ? 'Reload checklist history' : 'Tải lại danh sách'}
                aria-label={lang === 'en' ? 'Reload checklist history' : 'Tải lại danh sách'}
                onClick={() => {
                  void loadChecklistRuns();
                }}
              >
                <Icon name={loadingChecklists ? 'loader' : 'refresh'} size={16} className={loadingChecklists ? 'icon-spin' : undefined} />
              </button>
            </div>

            {/* Card Content & Table Header */}
            <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {lang === 'en' ? 'VietGAP Audit List' : 'Danh sách đợt tự đánh giá'}
                </h2>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
                  ({activeAuditRuns.length} {lang === 'en' ? 'records' : 'đợt'})
                </span>
              </div>

              {fullAuditRuns.length > 0 && (
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  {lang === 'en'
                    ? `Showing ${activeAuditRuns.length} of ${fullAuditRuns.length} season audits`
                    : `Hiển thị ${activeAuditRuns.length} trong ${fullAuditRuns.length} đợt tự đánh giá`}
                </span>
              )}
            </div>

            {/* Table or Empty State or Loading */}
            {loadingChecklists ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="loader" size={24} className="icon-spin" style={{ color: '#059669', marginBottom: '10px' }} />
                <p className="muted" style={{ margin: 0, fontSize: '14px' }}>
                  {lang === 'en' ? 'Loading inspection records...' : 'Đang tải danh sách các đợt tự đánh giá VietGAP...'}
                </p>
              </div>
            ) : activeAuditRuns.length === 0 ? (
              <div className="panel empty-state" style={{ border: 'none', boxShadow: 'none', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
                <div className="empty-icon" style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                  {lang === 'en' ? 'No 33-criteria VietGAP audits found' : 'Chưa có đợt đánh giá toàn diện 33 tiêu chí nào'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '13.5px', maxWidth: '480px', margin: '0 0 20px', lineHeight: 1.5 }}>
                  {lang === 'en'
                    ? 'Click "New VietGAP Audit" above to launch a 33-criteria evaluation for your crop season.'
                    : 'Nhấn nút "Khởi tạo đợt tự đánh giá" ở trên để bắt đầu tiến hành kiểm tra 33 tiêu chí VietGAP cho mùa vụ.'}
                </p>
                <Button
                  variant="primary"
                  onClick={() => setIsInitRunOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Icon name="plus" size={16} />
                  <span>{lang === 'en' ? 'New VietGAP Audit' : 'Khởi tạo đợt tự đánh giá'}</span>
                </Button>
              </div>
            ) : (
              <div className="zone-table-wrap" style={{ marginBottom: 0, overflowX: 'auto' }}>
                <table className="ui-data-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <colgroup>
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: 'none', borderBottom: '1px solid #e2e8f0' }}>
                        {lang === 'en' ? 'CODE & AUDIT RUN ↕' : 'MÃ & ĐỢT TỰ ĐÁNH GIÁ ↕'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: 'none', borderBottom: '1px solid #e2e8f0' }}>
                        {lang === 'en' ? 'SEASON & BLOCK' : 'MÙA VỤ & LÔ ĐẤT'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: 'none', borderBottom: '1px solid #e2e8f0' }}>
                        {lang === 'en' ? 'AUDITOR & DATE ↕' : 'NGƯỜI THỰC HIỆN & NGÀY ↕'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: 'none', borderBottom: '1px solid #e2e8f0' }}>
                        {lang === 'en' ? 'EVALUATION PROGRESS' : 'TIẾN ĐỘ (33 TIÊU CHÍ)'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', borderTop: 'none', borderBottom: '1px solid #e2e8f0' }}>
                        {lang === 'en' ? 'ACTIONS' : 'THAO TÁC'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAuditRuns.map((run) => {
                      const isDone = run.runStatus === 'completed';
                      const evaluatedCount = run.passedItems + run.failedItems;
                      const totalCount = run.totalItems || 33;
                      const progressPercent = Math.min(100, Math.round((evaluatedCount / totalCount) * 100));
                      const pendingCount = Math.max(0, totalCount - evaluatedCount);

                      return (
                        <tr key={run.runId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Mã & Tên đợt đánh giá */}
                          <td style={{ padding: '12px 14px', whiteSpace: 'normal' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                className="crop-avatar-circle"
                                style={{
                                  background: isDone ? '#ecfdf5' : '#eff6ff',
                                  color: isDone ? '#059669' : '#2563eb',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                }}
                              >
                                <Icon name="shield" size={17} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setAuditWorkspaceRun(run)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'block',
                                    lineHeight: 1.3,
                                    transition: 'color 0.15s ease',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                  }}
                                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#059669')}
                                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#0f172a')}
                                  title={run.seasonName || ''}
                                >
                                  {run.seasonName || (lang === 'en' ? 'General Season Audit' : 'Đợt tự đánh giá mùa vụ')}
                                </button>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600, display: 'block', marginTop: '2px', fontFamily: 'ui-monospace, monospace' }}>
                                  {run.ruleName || 'TCVN 11892-1:2017'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Mùa vụ & Lô đất */}
                          <td style={{ padding: '12px 14px', color: '#334155', fontSize: '13px', fontWeight: 600, whiteSpace: 'normal' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={run.seasonName || ''}>
                              {run.seasonName || (lang === 'en' ? 'Entire Farm' : 'Toàn trang trại')}
                            </div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 400, display: 'block', marginTop: '2px' }}>
                              {run.blockName ? `Lô: ${run.blockName}` : (lang === 'en' ? 'All active blocks' : 'Tất cả lô đất')}
                            </span>
                          </td>

                          {/* Người thực hiện & Ngày */}
                          <td style={{ padding: '12px 14px', color: '#334155', fontSize: '13px', whiteSpace: 'normal' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {run.assignedToName || (lang === 'en' ? 'Audit Team' : 'Ban kiểm soát')}
                            </div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                              {run.completedAt || run.scheduledAt || run.createdAt
                                ? new Date(run.completedAt || run.scheduledAt || run.createdAt!).toLocaleDateString('vi-VN')
                                : (lang === 'en' ? 'Today' : 'Hôm nay')}
                            </span>
                          </td>

                          {/* Tiến độ thẩm định (33 tiêu chí) */}
                          <td style={{ padding: '12px 14px', whiteSpace: 'normal' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                                {evaluatedCount}/{totalCount} ({progressPercent}%)
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: isDone ? '#059669' : '#64748b' }}>
                                {isDone ? (lang === 'en' ? 'Done' : 'Hoàn thành') : (lang === 'en' ? 'In progress' : 'Đang mở')}
                              </span>
                            </div>
                            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '5px' }}>
                              <div
                                style={{
                                  width: `${progressPercent}%`,
                                  height: '100%',
                                  background: isDone ? '#10b981' : '#3b82f6',
                                  borderRadius: '2px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                              <span style={{ color: '#059669', fontWeight: 600 }}>
                                {run.passedItems} {lang === 'en' ? 'pass' : 'đạt'}
                              </span>
                              {run.failedItems > 0 && (
                                <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                  · {run.failedItems} {lang === 'en' ? 'fail' : 'chưa đạt'}
                                </span>
                              )}
                              {pendingCount > 0 && (
                                <span style={{ color: '#64748b' }}>
                                  · {pendingCount} {lang === 'en' ? 'pending' : 'chờ'}
                                </span>
                              )}
                              {run.missingEvidenceCount > 0 && (
                                <span style={{ color: '#ea580c', fontWeight: 600 }}>
                                  · {lang === 'en' ? `Missing ${run.missingEvidenceCount} photos` : `Thiếu ${run.missingEvidenceCount} ảnh`}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Thao tác */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'normal' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                              <span className={`status-dot-badge ${isDone ? 'completed' : 'in_progress'}`} style={{ margin: 0, padding: '2px 8px', fontSize: '11px' }}>
                                <span className="dot" />
                                {isDone
                                  ? (lang === 'en' ? 'Completed' : 'Hoàn thành')
                                  : (lang === 'en' ? 'Active' : 'Đang mở')}
                              </span>

                              <Button
                                variant={isDone ? 'secondary' : 'primary'}
                                size="compact"
                                onClick={() => setAuditWorkspaceRun(run)}
                                style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Icon name={isDone ? 'file-text' : 'edit'} size={14} />
                                <span>
                                  {isDone
                                    ? (lang === 'en' ? 'View / Export PDF' : 'Xem hồ sơ & PDF')
                                    : (lang === 'en' ? 'Continue Audit' : 'Tiếp tục đánh giá')}
                                </span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}



      {/* 2. Màn hình: Điều kiện Đất, Nước & Môi trường */}
      {activeTab === 'environment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeading
            title={<>{lang === 'en' ? 'Soil, Water & Environmental Conditions' : 'Điều kiện Đất, Nước & Môi trường'}</>}
            description={<>
              {(lang === 'en'
                ? "Soil testing records, irrigation water monitoring, and environmental contamination risks for "
                : "Hồ sơ xét nghiệm mẫu đất, nguồn nước tưới và đánh giá nguy cơ ô nhiễm cho ")} {selectedFarm?.farmName || ''}
            </>}
          />

          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="panel" style={{ padding: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {(lang === 'en' ? "PRODUCTION RISKS" : "RỦI RO VÙNG SẢN XUẤT")}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {farmRisks.length}
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>{(lang === 'en' ? "Total recorded hazards" : "Tổng số rủi ro đã ghi nhận")}</small>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {(lang === 'en' ? "HIGH RISKS" : "RỦI RO MỨC ĐỘ CAO")}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', margin: '4px 0' }}>
                {farmRisks.filter((r) => (r.riskLevel || '').toUpperCase() === 'HIGH' || (r.riskLevel || '').toUpperCase() === 'CRITICAL').length}
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>{(lang === 'en' ? "Prioritize prevention" : "Cần ưu tiên phòng ngừa")}</small>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {(lang === 'en' ? "SOIL ASSESSMENTS" : "ĐÁNH GIÁ THỔ NHƯỠNG")}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', margin: '4px 0' }}>
                {farmSoils.length}
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>{(lang === 'en' ? "Saved soil test records" : "Phiếu kiểm nghiệm mẫu đất lưu trữ")}</small>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {(lang === 'en' ? "WATER ASSESSMENTS" : "ĐÁNH GIÁ NGUỒN NƯỚC")}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', margin: '4px 0' }}>
                {farmWaters.length}
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>{(lang === 'en' ? "Water monitoring records" : "Phiếu kiểm nghiệm nước tưới")}</small>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="panel" style={{ padding: '20px' }}>
            <div className="ui-tab-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <TabList
                idPrefix="vietgap-environment"
                label={lang === 'en' ? 'Environmental records' : 'Hồ sơ môi trường'}
                value={envSubTab}
                onChange={setEnvSubTab}
                items={[
                  { value: 'risks', label: <>{(lang === 'en' ? "Production area risks" : "Rủi ro vùng sản xuất")}</> },
                  { value: 'soils', label: <>{(lang === 'en' ? "Block soil assessments" : "Đánh giá thổ nhưỡng lô đất")}</> },
                  { value: 'waters', label: <>{(lang === 'en' ? "Water assessments" : "Đánh giá nguồn nước")}</> },
                ]}
              />

              {loadingEnv && <small style={{ color: '#059669' }}>{(lang === 'en' ? "Loading data from the server..." : "Đang tải dữ liệu từ máy chủ...")}</small>}
            </div>

            {/* SubTab 1: Zone Risks */}
            {envSubTab === 'risks' && (
              <div {...tabPanelProps('vietgap-environment', 'risks')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{(lang === 'en' ? "Production zone risk records" : "Hồ sơ rủi ro phân khu sản xuất")}</h3>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
                      {(lang === 'en' ? "Monitor contamination sources, chemical drift, and control measures under VietGAP standards" : "Theo dõi nguồn lây nhiễm, trôi dạt hóa chất và biện pháp kiểm soát theo chuẩn VietGAP")}
                    </p>
                  </div>
                </div>

                <div className="ui-table-scroll zone-table-wrap" tabIndex={0}>
                  <table className="ui-data-table">
                    <thead>
                      <tr>
                        <th scope="col">{(lang === 'en' ? "Assessment date" : "Ngày đánh giá")}</th>
                        <th scope="col">{(lang === 'en' ? "Zone" : "Phân khu (Zone)")}</th>
                        <th scope="col">{(lang === 'en' ? "Risk type" : "Loại rủi ro")}</th>
                        <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "Level" : "Mức độ")}</th>
                        <th scope="col" style={{ textAlign: 'right' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmRisks.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            {(lang === 'en' ? "No production area risk records have been recorded for this farm." : "Chưa có hồ sơ rủi ro vùng sản xuất nào được ghi nhận cho nông trại này.")}
                          </td>
                        </tr>
                      ) : (
                        farmRisks.map((r) => (
                          <tr key={r.riskId}>
                            <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {r.assessedAt ? r.assessedAt.split('T')[0] : '—'}
                            </td>
                            <td>
                              <Link to={`/zones/${r.zoneId}`} style={{ fontWeight: 600, color: '#059669' }}>
                                {r.zoneName || `Zone`}
                              </Link>
                            </td>
                            <td style={{ maxWidth: '240px' }}>
                              <strong style={{ color: '#0f172a', display: 'block' }}>
                                {r.riskType}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="knowledge-tag" style={{ textTransform: 'uppercase' }}>
                                {translate(r.riskLevel)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title={(lang === 'en' ? "View risk details" : "Xem chi tiết rủi ro")}
                                onClick={() => setSelectedEnvRisk(r)}
                              >
                                <Icon name="eye" size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

{/* SubTab 3: Water Assessments */}
            {envSubTab === 'waters' && (
              <div {...tabPanelProps('vietgap-environment', 'waters')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{(lang === 'en' ? "Irrigation water monitoring records" : "Hồ sơ giám sát nguồn nước tưới tiêu")}</h3>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
                      {(lang === 'en' ? "Monitor pH, temperature, physicochemical and microbial indicators under QCVN 39:2011/BTNMT and VietGAP" : "Theo dõi độ pH, nhiệt độ, chỉ tiêu lý hóa và vi sinh theo QCVN 39:2011/BTNMT và VietGAP")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setAssessmentError(null);
                      setIsCreateWaterModalOpen(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px' }}
                  >
                    <Icon name="plus" size={15} />
                    <span>{lang === 'en' ? 'Record Water Sample' : 'Ghi nhận mẫu nước'}</span>
                  </Button>
                </div>

                {farmWaters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>{(lang === 'en' ? "No water quality assessment records yet." : "Chưa có phiếu đánh giá chất lượng nguồn nước nào được ghi nhận.")}</p>
                  </div>
                ) : (
                  <div className="ui-table-scroll table-responsive" tabIndex={0} style={{ overflowX: 'auto' }}>
                    <table className="ui-data-table" style={{ width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th scope="col" style={{ padding: '10px 12px' }}>{lang === 'en' ? 'Assessment date' : 'Ngày đánh giá'}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "Water source" : "Nguồn nước")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "Applicable block" : "Lô áp dụng")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "pH" : "Độ pH")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "Temperature (°C)" : "Nhiệt độ (°C)")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "Quality conclusion" : "Kết luận chất lượng")}</th>
                          <th scope="col" style={{ padding: '10px 12px', textAlign: 'right' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmWaters.map((w) => (
                          <tr key={w.assessmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              {formatDate(w.assessedAt?.slice(0, 10), lang)}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <strong style={{ color: '#0f172a', display: 'block' }}>{(w.waterSourceName?.replace(/\s*#\d+\s*$/, '').trim() || (lang === 'en' ? 'Main water source' : 'Nguồn nước chính'))}</strong>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {w.blockName || (lang === 'en' ? 'Entire farm' : 'Toàn trang trại')}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0284c7' }}>
                              {w.waterPh ?? '-'}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                              {w.temperatureC != null ? w.temperatureC + '°C' : '-'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {(() => {
                                const st = (w.qualityStatus || '').toUpperCase();
                                const isPassed = ['DAT_CHUAN', 'COMPLIANT', 'PASS'].includes(st);
                                const isPending = st === 'CHO_KIEM_DINH' || st.includes('PENDING');
                                const label = isPassed
                                  ? (lang === 'en' ? 'Compliant' : 'Đạt chuẩn')
                                  : isPending
                                    ? (lang === 'en' ? 'Pending test' : 'Chờ kiểm nghiệm')
                                    : st === 'KHONG_DAT' || st === 'NON_COMPLIANT'
                                      ? (lang === 'en' ? 'Non-compliant' : 'Không đạt')
                                      : st === 'CAN_XU_LY'
                                        ? (lang === 'en' ? 'Treatment required' : 'Cần xử lý')
                                        : w.qualityStatus || (lang === 'en' ? 'Not updated' : 'Chưa cập nhật');
                                return (
                                  <span style={{ color: 'var(--color-body)', fontSize: '13px', lineHeight: 1.5 }}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>

                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title={lang === 'en' ? 'View water assessment details' : 'Xem chi tiết đánh giá nước'}
                                aria-label={lang === 'en' ? 'View water assessment details' : 'Xem chi tiết đánh giá nước'}
                                onClick={() => { void waterDetailLoader.load(() => fetchWaterAssessmentDetailsApi(w.assessmentId), setSelectedEnvWater); }}
                              >
                                <Icon name="eye" size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SubTab 2: Soil Assessments */}
            {envSubTab === 'soils' && (
              <div {...tabPanelProps('vietgap-environment', 'soils')}>
                {soilEnvError && <div className="form-error-banner"><p role="alert">{soilEnvError}</p><Button onClick={() => setEnvironmentReload(value => value + 1)}>{lang === 'en' ? 'Retry' : 'Thử lại'}</Button></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{(lang === 'en' ? "Block soil assessment records" : "Hồ sơ đánh giá thổ nhưỡng lô đất")}</h3>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
                      {(lang === 'en' ? "Periodically monitor pH, moisture, heavy metals, and microbial residues" : "Giám sát định kỳ chỉ số pH, độ ẩm, kim loại nặng và dư lượng vi sinh vật")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setAssessmentError(null);
                      setIsCreateSoilModalOpen(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px' }}
                  >
                    <Icon name="plus" size={15} />
                    <span>{lang === 'en' ? 'Record Soil Sample' : 'Ghi nhận mẫu đất'}</span>
                  </Button>
                </div>

                <div className="ui-table-scroll zone-table-wrap" tabIndex={0}>
                  <table className="ui-data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: '17%' }} /><col style={{ width: '24%' }} /><col style={{ width: '9%' }} />
                      <col style={{ width: '13%' }} /><col style={{ width: '25%' }} /><col style={{ width: '12%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">{lang === 'en' ? 'Assessment date' : 'Ngày đánh giá'}</th>
                        <th scope="col">{lang === 'en' ? 'Block' : 'Lô trồng'}</th>
                        <th scope="col">{lang === 'en' ? 'Soil pH' : 'Độ pH'}</th>
                        <th scope="col">{lang === 'en' ? 'Moisture (%)' : 'Độ ẩm (%)'}</th>
                        <th scope="col">{lang === 'en' ? 'Notes' : 'Ghi chú'}</th>
                        <th scope="col" style={{ textAlign: 'right' }}>{lang === 'en' ? 'Actions' : 'Thao tác'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmSoils.length === 0 ? (
                        <tr><td colSpan={6}>{lang === 'en' ? 'No matching soil assessments.' : 'Chưa có đánh giá đất phù hợp.'}</td></tr>
                      ) : farmSoils.map(s => (
                        <tr key={s.assessmentId}>
                          <td>{formatDate(s.assessedAt?.slice(0, 10), lang)}</td>
                          <td><Link className="ui-text-preview" to={`/zones/${s.zoneId}/blocks/${s.blockId}`}>{s.blockName || '—'}</Link></td>
                          <td>{s.soilPh ?? '—'}</td>
                          <td>{s.moisturePercent ?? '—'}</td>
                          <td><span className="ui-text-preview">{s.notes?.trim() || '—'}</span></td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                              <button type="button" className="table-icon-btn primary"
                                title={lang === 'en' ? 'View soil assessment details' : 'Xem chi tiết đánh giá đất'}
                                aria-label={lang === 'en' ? 'View soil assessment details' : 'Xem chi tiết đánh giá đất'}
                                onClick={() => { void soilDetailLoader.load(() => fetchSoilAssessmentDetailsApi(s.assessmentId), setSelectedEnvSoil); }}>
                                <Icon name="eye" size={16} />
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

          {/* Details Modal: Selected Zone Risk */}
          {selectedEnvRisk && (
            <Modal structured open customLayout className="modal-form-layout" title={lang === 'en' ? 'Production area risk details' : 'Chi tiết rủi ro vùng sản xuất'}
              onClose={() => setSelectedEnvRisk(null)} style={{ width: 'min(600px, 100%)' }}>
                <div className="modal-header">
                  <h2>{lang === 'en' ? 'Production area risk details' : 'Chi tiết rủi ro vùng sản xuất'}</h2>
                  <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close' : 'Đóng'} onClick={() => setSelectedEnvRisk(null)}><Icon name="close" size={18} /></button>
                </div>
                <div className="modal-body">
                  <div className="structured-field-card supplier-detail-field ui-detail-primary" style={{ marginBottom: '16px' }}>
                    <div className="structured-field-header"><span className="structured-field-label">{lang === 'en' ? 'Risk type' : 'Tên loại rủi ro'}</span></div>
                    <div>{selectedEnvRisk.riskType || '—'}</div>
                  </div>
                  <div className="structured-field-card supplier-detail-field" style={{ marginBottom: '16px' }}>
                    <div className="structured-field-header"><span className="structured-field-label">{lang === 'en' ? 'Applicable zone' : 'Khu vực áp dụng'}</span></div>
                    <div>{selectedEnvRisk.zoneName || '—'}</div>
                  </div>
                  <dl className="detail-list" style={{ marginBottom: '16px' }}>
                    <div>
                      <dt>{lang === 'en' ? 'Assessment date' : 'Ngày đánh giá'}</dt>
                      <dd>{selectedEnvRisk.assessedAt ? selectedEnvRisk.assessedAt.split('T')[0] : '—'}</dd>
                    </div>
                    <div>
                      <dt>{lang === 'en' ? 'Risk level' : 'Mức độ rủi ro'}</dt>
                      <dd><span className="knowledge-tag" style={{ textTransform: 'uppercase' }}>{translate(selectedEnvRisk.riskLevel)}</span></dd>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <dt>{lang === 'en' ? 'Assessed by' : 'Người đánh giá'}</dt>
                      <dd>{selectedEnvRisk.assessedByName || '—'}</dd>
                    </div>
                  </dl>
                  <div className="structured-field-card" style={{ marginBottom: '12px' }}>
                    <span className="structured-field-label">{(lang === 'en' ? "Risk description" : "Mô tả rủi ro")}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>{(lang === 'en' ? selectedEnvRisk.description || "No detailed description" : selectedEnvRisk.description || 'Không có mô tả chi tiết')}</p>
                  </div>
                  <div className="structured-field-card" style={{ marginBottom: '16px' }}>
                    <span className="structured-field-label">{(lang === 'en' ? "Control & Risk mitigation measures" : "Biện pháp kiểm soát & Giảm thiểu rủi ro")}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-body)' }}>{(lang === 'en' ? selectedEnvRisk.mitigationPlan || "No control measures defined" : selectedEnvRisk.mitigationPlan || 'Chưa thiết lập biện pháp kiểm soát')}</p>
                  </div>
                </div>
                <div className="modal-footer">
                  <div className="confirm-dialog-actions" style={{ margin: 0, padding: 0, border: 0 }}>
                    <Link to={`/zones/${selectedEnvRisk.zoneId}`} className="ui-button ui-button--secondary ui-button--default ui-navigation-action">
                      <Icon name="map-pin" size={16} />
                      {(lang === 'en' ? "Go to Zone to update" : "Chuyển tới Zone để cập nhật")}
                    </Link>
                    <Button type="button" variant="secondary" className="ui-close-action" onClick={() => setSelectedEnvRisk(null)}>{(lang === 'en' ? "Close" : "Đóng")}</Button>
                  </div>
                </div>
            </Modal>
          )}

          {/* Details Modal: Selected Soil Assessment */}
          {selectedEnvSoil && (
            <Modal structured open customLayout className="modal-form-layout" title={lang === 'en' ? 'Block soil assessment details' : 'Chi tiết đánh giá thổ nhưỡng lô đất'}
              onClose={() => setSelectedEnvSoil(null)} style={{ width: 'min(600px, 100%)' }}>
                <div className="modal-header">
                  <h2>{lang === 'en' ? 'Block soil assessment details' : 'Chi tiết đánh giá thổ nhưỡng lô đất'}</h2>
                  <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close' : 'Đóng'} onClick={() => setSelectedEnvSoil(null)}><Icon name="close" size={18} /></button>
                </div>
                <div className="modal-body">
                  <div className="structured-field-card supplier-detail-field ui-detail-primary" style={{ marginBottom: '16px' }}>
                    <div className="structured-field-header"><span className="structured-field-label">{lang === 'en' ? 'Applicable block' : 'Lô trồng áp dụng'}</span></div>
                    <div>{selectedEnvSoil.blockName || '—'}</div>
                  </div>
                  <div className="structured-field-card" style={{ background: '#f8fafc', marginBottom: '12px' }}>
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 12px', fontSize: '13.5px' }}>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Sample date:" : "Ngày lấy mẫu:")}</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvSoil.assessedAt ? selectedEnvSoil.assessedAt.split('T')[0] : '—'}</dd>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Soil pH:" : "Độ pH đất:")}</dt>
                      <dd style={{ margin: 0, fontWeight: 700, color: '#059669' }}>{selectedEnvSoil.soilPh ?? '—'}</dd>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Soil moisture:" : "Độ ẩm đất:")}</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvSoil.moisturePercent != null ? `${selectedEnvSoil.moisturePercent}%` : '—'}</dd>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Sampled / Tested by:" : "Người lấy mẫu / kiểm nghiệm:")}</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvSoil.conductedByName || '—'}</dd>
                    </dl>
                  </div>
                  {selectedEnvSoil.nutrientData && (
                    <div className="structured-field-card" style={{ marginBottom: '12px' }}>
                      <span className="structured-field-label">{(lang === 'en' ? "Nutrient analysis & Indicators" : "Dữ liệu phân tích dinh dưỡng & Chỉ tiêu")}</span>
                      <pre style={{ margin: '6px 0 0', background: '#f1f5f9', padding: '10px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        {selectedEnvSoil.nutrientData}
                      </pre>
                    </div>
                  )}
                  {selectedEnvSoil.labTestReportUrl && (
                    <div className="structured-field-card ui-detail-primary" style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46' }}>
                            {lang === 'en' ? 'Lab Test Report (VietGAP VG-NL-01):' : 'Phiếu kết quả kiểm nghiệm Lab (VietGAP VG-NL-01):'}
                          </span>
                          <div style={{ fontSize: '12px', color: '#047857', wordBreak: 'break-all', marginTop: '2px' }}>
                            {selectedEnvSoil.labTestReportUrl}
                          </div>
                        </div>
                        <a
                          href={selectedEnvSoil.labTestReportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="primary-button"
                          style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap', textDecoration: 'none' }}
                        >
                          {lang === 'en' ? 'View Document ↗' : 'Xem phiếu Lab ↗'}
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedEnvSoil.notes && (
                    <div className="structured-field-card" style={{ marginBottom: '16px' }}>
                      <span className="structured-field-label">{(lang === 'en' ? "Notes & Expert conclusion" : "Ghi chú & Kết luận chuyên môn")}</span>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>{selectedEnvSoil.notes}</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <div className="confirm-dialog-actions" style={{ margin: 0, padding: 0, border: 0 }}>
                    <Link to={`/zones/${selectedEnvSoil.zoneId}/blocks/${selectedEnvSoil.blockId}`} className="ui-button ui-button--secondary ui-button--default ui-navigation-action">
                      {(lang === 'en' ? "Go to Block to manage" : "Chuyển tới Block để quản lý")}
                    </Link>
                    <Button type="button" variant="secondary" className="ui-close-action" onClick={() => setSelectedEnvSoil(null)}>{(lang === 'en' ? "Close" : "Đóng")}</Button>
                  </div>
                </div>
            </Modal>
          )}
        </div>
      )}

      {/* 3. Màn hình: Đào tạo an toàn lao động */}
      {activeTab === 'training' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeading
            title={<>{lang === 'en' ? 'Occupational Safety & Training' : 'Đào tạo & Chứng chỉ An toàn Lao động'}</>}
            description={<>
              {(lang === 'en'
                ? "Manage technical training sessions, food safety certificates, and worker credentials for "
                : "Quản lý các khóa tập huấn kỹ thuật, an toàn thực phẩm và chứng nhận công nhân cho ")} {selectedFarm?.farmName || ''}
            </>}
          />

          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="panel" style={{ padding: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {lang === 'en' ? 'TRAINING SESSIONS' : 'TỔNG KHÓA ĐÀO TẠO'}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {trainingStats.totalCourses}
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>
                {lang === 'en' ? 'Completed training courses' : 'Khóa tập huấn đã hoàn thành'}
              </small>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {lang === 'en' ? 'TRAINED PARTICIPANTS' : 'LƯỢT HỌC VIÊN THAM GIA'}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', margin: '4px 0' }}>
                {trainingStats.totalAttendees}
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>
                {lang === 'en' ? 'Staff & worker attendances' : 'Lượt cán bộ & nhân sự tham gia'}
              </small>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {lang === 'en' ? 'COURSES THIS YEAR' : 'KHÓA ĐÀO TẠO NĂM NAY'}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', margin: '4px 0' }}>
                {trainingStats.coursesThisYear}
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>
                {lang === 'en' ? `Conducted in ${new Date().getFullYear()}` : `Tổ chức trong năm ${new Date().getFullYear()}`}
              </small>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {lang === 'en' ? 'VIETGAP COMPLIANCE' : 'TUÂN THỦ VIETGAP'}
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                100%
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>
                {lang === 'en' ? 'Meets VG-HS-01 & VG-HS-02' : 'Đạt chuẩn tiêu chí VG-HS-01, 02'}
              </small>
            </div>
          </div>

          <div {...tabPanelProps('vietgap', 'training')} className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                  {lang === 'en' ? 'VietGAP Training Records' : 'Hồ sơ tập huấn & Đào tạo VietGAP'}
                </h3>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
                  {lang === 'en'
                    ? `Internal training, occupational safety, and farming certifications (${trainingTotal} courses)`
                    : `Lịch sử các khóa đào tạo nội bộ, tập huấn an toàn lao động và chứng chỉ kỹ thuật canh tác (${trainingTotal} khóa học)`}
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => { setTrainingError(null); setIsCreateTrainingOpen(true); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px' }}
              >
                <Icon name="plus" size={15} />
                <span>{lang === 'en' ? 'Add Training Course' : 'Thêm khóa đào tạo'}</span>
              </Button>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                  <Icon name="search" size={16} />
                </span>
                <input
                  type="search"
                  className="ui-input"
                  placeholder={lang === 'en' ? 'Search by title, organizer, or content...' : 'Tìm theo tiêu đề, người tổ chức, nội dung...'}
                  value={trainingKeyword}
                  onChange={(e) => setTrainingKeyword(e.target.value)}
                  style={{ paddingLeft: '34px', width: '100%', height: '36px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {lang === 'en' ? 'From:' : 'Từ:'}
                </span>
                <input
                  type="date"
                  className="ui-input"
                  value={trainingFromDate}
                  onChange={(e) => setTrainingFromDate(e.target.value)}
                  style={{ height: '36px', width: '140px', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {lang === 'en' ? 'To:' : 'Đến:'}
                </span>
                <input
                  type="date"
                  className="ui-input"
                  value={trainingToDate}
                  onChange={(e) => setTrainingToDate(e.target.value)}
                  style={{ height: '36px', width: '140px', fontSize: '12.5px' }}
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
                aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
                onClick={() => {
                  setTrainingKeyword('');
                  setDebouncedTrainingKeyword('');
                  setTrainingFromDate('');
                  setTrainingToDate('');
                  setTrainingRefresh(value => value + 1);
                }}
                style={{ width: '44px', height: '44px', padding: 0, flexShrink: 0 }}
              >
                <Icon name="refresh" size={18} />
              </Button>
            </div>

            {trainingLoading ? (
              <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                <p>{lang === 'en' ? 'Loading training records...' : 'Đang tải dữ liệu hồ sơ đào tạo...'}</p>
              </div>
            ) : trainingError ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#dc2626' }}>
                <p>{translate(trainingError)}</p>
                <button type="button" className="action-button" onClick={() => void loadTrainings()}>
                  {lang === 'en' ? 'Retry' : 'Thử lại'}
                </button>
              </div>
            ) : (
              <div className="ui-table-scroll zone-table-wrap" tabIndex={0}>
                <table className="ui-data-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '16%' }}>{lang === 'en' ? 'TRAINING DATE' : 'NGÀY ĐÀO TẠO'}</th>
                      <th scope="col" style={{ width: '40%' }}>{lang === 'en' ? 'COURSE TITLE' : 'TÊN KHÓA HỌC'}</th>
                      <th scope="col" style={{ width: '16%', textAlign: 'center' }}>{lang === 'en' ? 'ATTENDEES' : 'THAM GIA'}</th>
                      <th scope="col" style={{ width: '14%', textAlign: 'center' }}>{lang === 'en' ? 'STATUS' : 'TRẠNG THÁI'}</th>
                      <th scope="col" style={{ width: '14%', textAlign: 'right' }}>{lang === 'en' ? 'ACTIONS' : 'THAO TÁC'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                          {lang === 'en' ? 'No training records have been recorded for this farm.' : 'Chưa có hồ sơ đào tạo nào được ghi nhận cho nông trại này.'}
                        </td>
                      </tr>
                    ) : (
                      trainingRecords.map((item) => (
                        <tr key={item.trainingRecordId}>
                          <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {item.trainingDate || '—'}
                          </td>
                          <td style={{ maxWidth: '300px' }}>
                            <strong style={{ color: '#0f172a', display: 'block', fontSize: '13.5px', marginBottom: '2px' }}>
                              {item.trainingTitle}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="knowledge-tag" style={{ whiteSpace: 'nowrap' }}>
                              {item.attendeeCount || 0} {lang === 'en' ? 'staff' : 'nhân sự'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="status-badge status-badge--success">
                              {lang === 'en' ? 'Completed' : 'Hoàn thành'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title={lang === 'en' ? 'View details & attendance' : 'Xem chi tiết & Điểm danh'}
                                aria-label={lang === 'en' ? 'View details & attendance' : 'Xem chi tiết & Điểm danh'}
                                onClick={() => void handleViewTrainingDetail(item.trainingRecordId)}
                              >
                                <Icon name="eye" size={16} />
                              </button>
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title={lang === 'en' ? 'Delete training record' : 'Xóa hồ sơ đào tạo'}
                                aria-label={lang === 'en' ? 'Delete training record' : 'Xóa hồ sơ đào tạo'}
                                onClick={() => { setTrainingDeleteError(null); setTrainingToDelete(item); }}
                              >
                                <Icon name="trash" size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          {/* Details Modal */}
          {selectedTrainingDetail && (
            <Modal structured open customLayout className="modal-form-layout" title={lang === 'en' ? 'VietGAP training details' : 'Chi tiết khóa đào tạo VietGAP'} onClose={() => setSelectedTrainingDetail(null)} style={{ width: 'min(640px, 100%)' }}>
                <div className="modal-header">
                  <h2>{lang === 'en' ? 'VietGAP training details' : 'Chi tiết khóa đào tạo VietGAP'}</h2>
                  <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close' : 'Đóng'} onClick={() => setSelectedTrainingDetail(null)}><Icon name="close" size={18} /></button>
                </div>
                <div className="modal-body" style={{ padding: '20px 24px' }}>
                  <div className="structured-field-card supplier-detail-field ui-detail-primary" style={{ marginBottom: '16px' }}>
                    <div className="structured-field-header"><span className="structured-field-label">{lang === 'en' ? 'Training title' : 'Tên khóa đào tạo'}</span></div>
                    <div>{selectedTrainingDetail.trainingTitle || '—'}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{(lang === 'en' ? "Training date" : "Ngày đào tạo")}</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{selectedTrainingDetail.trainingDate}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{(lang === 'en' ? "Organizer" : "Người tổ chức")}</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{(lang === 'en' ? selectedTrainingDetail.organizerName || "Farm" : selectedTrainingDetail.organizerName || 'Trang trại')}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{(lang === 'en' ? "Participant count" : "Số lượng tham gia")}</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#059669' }}>{selectedTrainingDetail.attendeeCount} {(lang === 'en' ? " workers" : " công nhân")}</p>
                    </div>
                  </div>

                  {selectedTrainingDetail.description && (
                    <div style={{ marginBottom: '18px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>{(lang === 'en' ? "Details:" : "Nội dung chi tiết:")}</span>
                      <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#1e293b', lineHeight: 1.6 }}>
                        {selectedTrainingDetail.description}
                      </p>
                    </div>
                  )}

                  {selectedTrainingDetail.imageUrl && (
                    <div style={{ marginBottom: '18px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>{(lang === 'en' ? "Evidence images / Certificates:" : "Hình ảnh minh chứng / Chứng chỉ:")}</span>
                      <div style={{ marginTop: '6px' }}>
                        <img
                          src={selectedTrainingDetail.imageUrl}
                          alt={(lang === 'en' ? "Training evidence" : "Minh chứng đào tạo")}
                          style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                      {(lang === 'en' ? "Participants & Attendance" : "Danh sách công nhân tham gia & Điểm danh")}
                    </span>
                    {selectedTrainingDetail.attendees && selectedTrainingDetail.attendees.length > 0 ? (
                      <div className="ui-table-scroll" tabIndex={0} style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table className="ui-data-table ui-data-table--compact" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                              <th scope="col" style={{ padding: '8px 12px' }}>{(lang === 'en' ? "Worker ID" : "Mã CN")}</th>
                              <th scope="col" style={{ padding: '8px 12px' }}>{(lang === 'en' ? "Full name" : "Họ và tên")}</th>
                              <th scope="col" style={{ padding: '8px 12px' }}>{(lang === 'en' ? "Position" : "Chức vụ")}</th>
                              <th scope="col" style={{ padding: '8px 12px' }}>{(lang === 'en' ? "Status" : "Trạng thái")}</th>
                              <th scope="col" style={{ padding: '8px 12px' }}>{(lang === 'en' ? "Notes" : "Ghi chú")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTrainingDetail.attendees.map((att, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{att.workerCode || '—'}</td>
                                <td style={{ padding: '8px 12px' }}>{(lang === 'en' ? att.fullName || ("Worker #" + (att.farmWorkerId || (idx + 1))) : att.fullName || 'Công nhân #' + (att.farmWorkerId || idx + 1))}</td>
                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{translate(att.jobTitle || '—')}</td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    background: att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? '#dcfce7' : '#fef3c7',
                                    color: att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? '#15803d' : '#b45309',
                                  }}>
                                    {(lang === 'en' ? att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? "Present" : att.attendanceStatus === 'absent' ? "Absent" : "Excused" : att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? 'Có mặt' : att.attendanceStatus === 'absent' ? 'Vắng' : 'Có phép')}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{att.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                        {(lang === 'en' ? "No worker attendance list has been recorded for this training session." : "Chưa ghi nhận danh sách điểm danh công nhân cụ thể cho buổi đào tạo này.")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
                  <Button type="button" variant="secondary" className="ui-close-action" onClick={() => setSelectedTrainingDetail(null)}>
                    {(lang === 'en' ? "Close" : "Đóng")}
                  </Button>
                </div>
            </Modal>
          )}

          {/* Create Modal */}
          {isCreateTrainingOpen && (
            <Modal structured open customLayout className="modal-form-layout" onClose={() => { if (!submittingTraining) setIsCreateTrainingOpen(false); }} title={lang === 'en' ? 'Record VietGAP training' : 'Ghi nhận khóa tập huấn VietGAP'}>
            <div className="modal-header"><h2 style={{ margin: 0 }}>{lang === 'en' ? 'Record VietGAP training' : 'Ghi nhận khóa tập huấn VietGAP'}</h2><button type="button" className="modal-close" disabled={submittingTraining} onClick={() => setIsCreateTrainingOpen(false)} aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'}><Icon name="close" /></button></div>
            <form onSubmit={handleCreateTraining}>
                  <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {trainingError && <p role="alert" className="form-error-banner">{trainingError}</p>}
                    <div className="structured-field-card">
                      <label htmlFor="training-trainingTitle" className="structured-field-label">
                        {lang === 'en' ? 'Training course title' : 'Tiêu đề khóa đào tạo / tập huấn'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input id="training-trainingTitle" className="ui-input"
                        type="text"
                        required
                        placeholder={(lang === 'en' ? "Example: VietGAP chemical safety and PHI training 2026" : "VD: Tập huấn quy trình VietGAP về an toàn hóa chất và PHI 2026")}
                        value={createTrainingForm.trainingTitle}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, trainingTitle: e.target.value }))}
                      />
                    </div>
                    <div className="structured-field-card">
                      <label htmlFor="training-trainingDate" className="structured-field-label">
                        {lang === 'en' ? 'Training date' : 'Ngày tổ chức đào tạo'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input id="training-trainingDate" className="ui-input"
                        type="date"
                        required
                        value={createTrainingForm.trainingDate}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, trainingDate: e.target.value }))}
                      />
                    </div>
                    <div className="structured-field-card">
                      <label htmlFor="training-description" className="structured-field-label">
                        {(lang === 'en' ? "Training content & Objectives" : "Nội dung & Mục tiêu tập huấn")}
                      </label>
                      <textarea id="training-description" className="ui-textarea"
                        rows={3}
                        placeholder={(lang === 'en' ? "Summarize course content, training provider, and participant count..." : "Mô tả tóm tắt nội dung khóa học, đơn vị giảng dạy, số lượng công nhân tham gia...")}
                        value={createTrainingForm.description}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="structured-field-card">
                      <label htmlFor="training-imageUrl" className="structured-field-label">
                        {(lang === 'en' ? "Evidence image / Certificate URL (optional)" : "Link ảnh minh chứng / Chứng chỉ (Tùy chọn)")}
                      </label>
                      <input id="training-imageUrl" className="ui-input"
                        type="url"
                        placeholder="https://example.com/certificate.jpg"
                        value={createTrainingForm.imageUrl}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="modal-footer confirm-dialog-actions" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)' }}>
                    <Button
                      type="button"
                      className="ui-cancel-button" variant="secondary"
                      onClick={() => setIsCreateTrainingOpen(false)}
                      disabled={submittingTraining}
                    >
                      {(lang === 'en' ? "Cancel" : "Hủy")}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary" loading={submittingTraining}
                      disabled={submittingTraining}
                    >
                      {(lang === 'en' ? submittingTraining ? "Saving..." : "Save training record" : submittingTraining ? 'Đang lưu...' : 'Lưu hồ sơ đào tạo')}
                    </Button>
                  </div>
                </form>
          </Modal>
          )}
        </div>
      </div>
      )}

      {soilDetailLoader.feedback}
      {waterDetailLoader.feedback}
      <Modal structured open={selectedEnvWater !== null} onClose={() => setSelectedEnvWater(null)} title={lang === 'en' ? 'Water assessment details' : 'Chi tiết đánh giá nước'} style={{ width: 'min(640px, 100%)' }}>
        {selectedEnvWater && <WaterAssessmentDetails record={selectedEnvWater} />}
        <div className="confirm-dialog-actions" style={{ marginTop: '16px' }}><Button className="ui-close-action" onClick={() => setSelectedEnvWater(null)}>{lang === 'en' ? 'Close' : 'Đóng'}</Button></div>
      </Modal>

      {/* Create Soil Assessment Modal */}
      {isCreateSoilModalOpen && (
        <Modal structured open customLayout className="modal-form-layout" onClose={() => { if (!savingAssessment) setIsCreateSoilModalOpen(false); }} title={lang === 'en' ? 'Add soil assessment' : 'Thêm đánh giá đất'}>
            <div className="modal-header"><h2 style={{ margin: 0 }}>{lang === 'en' ? 'Add soil assessment' : 'Thêm đánh giá đất'}</h2><button type="button" className="modal-close" disabled={savingAssessment} onClick={() => setIsCreateSoilModalOpen(false)} aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'}><Icon name="close" /></button></div>
            <form onSubmit={handleSaveSoilAssessment}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {assessmentError && <p role="alert" className="form-error-banner">{assessmentError}</p>}

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <label htmlFor="soil-modal-block" className="structured-field-label">
                    {lang === 'en' ? 'Production Block' : 'Lô đất / Nhà màng'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <select
                    id="soil-modal-block"
                    className="ui-select"
                    required
                    value={soilBlockId}
                    onChange={(e) => setSoilBlockId(Number(e.target.value))}
                  >
                    {farmBlocks.length === 0 && (
                      <option value="">{lang === 'en' ? 'No blocks available' : 'Chưa có dữ liệu lô đất'}</option>
                    )}
                    {farmBlocks.map((b) => (
                      <option key={b.blockId} value={b.blockId}>
                        {b.blockName} {b.zoneName ? `(${b.zoneName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <label htmlFor="soil-modal-ph" className="structured-field-label">
                        {lang === 'en' ? 'Soil pH' : 'Độ pH đất'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <span className="structured-field-badge">5.5 - 7.5</span>
                    </div>
                    <input
                      id="soil-modal-ph"
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      required
                      className="ui-input"
                      placeholder="6.5"
                      value={soilPh}
                      onChange={(e) => setSoilPh(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <label htmlFor="soil-modal-moisture" className="structured-field-label">
                        {lang === 'en' ? 'Moisture (%)' : 'Độ ẩm (%)'}
                      </label>
                      <span className="structured-field-badge">60 - 80%</span>
                    </div>
                    <input
                      id="soil-modal-moisture"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      className="ui-input"
                      placeholder="70"
                      value={soilMoisture}
                      onChange={(e) => setSoilMoisture(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <label htmlFor="soil-modal-date" className="structured-field-label">
                    {lang === 'en' ? 'Assessment / Sampling Date' : 'Ngày lấy mẫu / đánh giá'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    id="soil-modal-date"
                    type="date"
                    required
                    className="ui-input"
                    value={soilAssessedAt}
                    onChange={(e) => setSoilAssessedAt(e.target.value)}
                  />
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <div className="structured-field-header">
                    <label htmlFor="soil-modal-nutrient" className="structured-field-label">
                      {lang === 'en' ? 'Nutrient & Microbial Analysis' : 'Chỉ tiêu phân tích dinh dưỡng & vi sinh'}
                    </label>
                    <span className="structured-field-badge" style={{ color: '#059669', background: '#ecfdf5' }}>
                      VietGAP
                    </span>
                  </div>
                  <textarea
                    id="soil-modal-nutrient"
                    className="ui-textarea"
                    rows={2}
                    value={soilNutrient}
                    onChange={(e) => setSoilNutrient(e.target.value)}
                    placeholder={lang === 'en' ? 'Heavy metals (Cd, Pb, As), microbial E. coli, Salmonella results...' : 'Hàm lượng kim loại nặng (Cd, Pb, As), vi sinh E. coli, Salmonella...'}
                  />
                </div>

                <div>
                  <FileUpload
                    value={soilLabReportUrl}
                    onChange={setSoilLabReportUrl}
                    label={lang === 'en' ? 'Lab Test Report Document (PDF/Photo - VG-NL-01)' : 'Phiếu kết quả phân tích phòng Lab (PDF/Ảnh - VG-NL-01)'}
                    hint={lang === 'en' ? 'Upload official accredited laboratory certificate to automatically pass criterion VG-NL-01.' : 'Tải lên phiếu kết quả thử nghiệm từ phòng Lab hợp chuẩn để hệ thống tự động đối soát ĐẠT tiêu chí VG-NL-01.'}
                    folder="mycropdiary/assessments/soil"
                    accept="application/pdf,image/*"
                    disabled={savingAssessment}
                  />
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <label htmlFor="soil-modal-notes" className="structured-field-label">
                    {lang === 'en' ? 'Specialist Notes / Conclusion' : 'Ghi chú & Kết luận chuyên môn'}
                  </label>
                  <textarea
                    id="soil-modal-notes"
                    className="ui-textarea"
                    rows={2}
                    value={soilNotes}
                    onChange={(e) => setSoilNotes(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Soil suitable for melon cultivation, low residue.' : 'Ví dụ: Đất tơi xốp, phù hợp trồng dưa lưới trong nhà màng.'}
                  />
                </div>
              </div>

              <div className="modal-footer confirm-dialog-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button
                  type="button"
                  className="ui-cancel-button" variant="secondary"
                  disabled={savingAssessment}
                  onClick={() => setIsCreateSoilModalOpen(false)}
                >
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </Button>
                <Button
                  type="submit"
                  variant="primary" loading={savingAssessment}
                  disabled={savingAssessment || !soilBlockId}
                >
                  {savingAssessment
                    ? (lang === 'en' ? 'Saving...' : 'Đang lưu...')
                    : (lang === 'en' ? 'Save Soil Record' : 'Lưu phiếu đánh giá đất')}
                </Button>
              </div>
            </form>
          </Modal>
      )}

      {/* Create Water Assessment Modal */}
      {isCreateWaterModalOpen && (
        <Modal structured open customLayout className="modal-form-layout" onClose={() => { if (!savingAssessment) setIsCreateWaterModalOpen(false); }} title={lang === 'en' ? 'Add water assessment' : 'Thêm đánh giá nước'}>
            <div className="modal-header"><h2 style={{ margin: 0 }}>{lang === 'en' ? 'Add water assessment' : 'Thêm đánh giá nước'}</h2><button type="button" className="modal-close" disabled={savingAssessment} onClick={() => setIsCreateWaterModalOpen(false)} aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'}><Icon name="close" /></button></div>
            <form onSubmit={handleSaveWaterAssessment}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {assessmentError && <p role="alert" className="form-error-banner">{assessmentError}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <label htmlFor="water-modal-name" className="structured-field-label">
                      {lang === 'en' ? 'Water Source Name' : 'Tên nguồn nước'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      id="water-modal-name"
                      type="text"
                      required
                      className="ui-input"
                      value={waterSourceName}
                      onChange={(e) => setWaterSourceName(e.target.value)}
                      placeholder={lang === 'en' ? 'e.g. Groundwater Station A' : 'VD: Nước giếng khoan trạm bơm A'}
                    />
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <label htmlFor="water-modal-type" className="structured-field-label">
                      {lang === 'en' ? 'Source Type' : 'Phân loại nguồn'}
                    </label>
                    <select
                      id="water-modal-type"
                      className="ui-select"
                      value={waterSourceType}
                      onChange={(e) => setWaterSourceType(e.target.value)}
                    >
                      <option value="Nước ngầm">{lang === 'en' ? 'Groundwater' : 'Nước ngầm'}</option>
                      <option value="Nước mặt">{lang === 'en' ? 'Surface water' : 'Nước mặt'}</option>
                      <option value="Nước thủy cục">{lang === 'en' ? 'Tap water' : 'Nước thủy cục'}</option>
                      <option value="Bể lắng / Nước mưa">{lang === 'en' ? 'Rainwater basin' : 'Bể lắng / Nước mưa'}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '10px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <label htmlFor="water-modal-ph" className="structured-field-label">
                        {lang === 'en' ? 'pH' : 'Độ pH'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <span className="structured-field-badge">6.0 - 8.5</span>
                    </div>
                    <input
                      id="water-modal-ph"
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      required
                      className="ui-input"
                      placeholder="6.8"
                      value={waterPh}
                      onChange={(e) => setWaterPh(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <div className="structured-field-header">
                      <label htmlFor="water-modal-temp" className="structured-field-label">
                        {lang === 'en' ? 'Temp (°C)' : 'Nhiệt độ'}
                      </label>
                      <span className="structured-field-badge">°C</span>
                    </div>
                    <input
                      id="water-modal-temp"
                      type="number"
                      step="0.5"
                      min="0"
                      max="60"
                      className="ui-input"
                      placeholder="26"
                      value={waterTemp}
                      onChange={(e) => setWaterTemp(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <label htmlFor="water-modal-status" className="structured-field-label">
                      {lang === 'en' ? 'Conclusion' : 'Kết luận'}
                    </label>
                    <select
                      id="water-modal-status"
                      className="ui-select"
                      value={waterQualityStatus}
                      onChange={(e) => setWaterQualityStatus(e.target.value)}
                    >
                      <option value="DAT_CHUAN">{lang === 'en' ? '✓ Compliant' : '✓ Đạt chuẩn'}</option>
                      <option value="CHO_KIEM_DINH">{lang === 'en' ? 'Pending test' : 'Chờ kiểm định'}</option>
                      <option value="KHONG_DAT">{lang === 'en' ? 'Non-compliant' : 'Không đạt'}</option>
                      <option value="CAN_XU_LY">{lang === 'en' ? 'Filtration needed' : 'Cần xử lý lắng'}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <label htmlFor="water-modal-block" className="structured-field-label">
                      {lang === 'en' ? 'Applicable Block' : 'Lô đất tưới tiêu'}
                    </label>
                    <select
                      id="water-modal-block"
                      required
                      className="ui-select"
                      value={waterBlockId}
                      onChange={(e) => setWaterBlockId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">{lang === 'en' ? 'Select a block' : 'Chọn lô trồng'}</option>
                      {farmBlocks.map((b) => (
                        <option key={b.blockId} value={b.blockId}>
                          {b.blockName} {b.zoneName ? `(${b.zoneName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <label htmlFor="water-modal-date" className="structured-field-label">
                      {lang === 'en' ? 'Sampling Date' : 'Ngày lấy mẫu đo'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      id="water-modal-date"
                      type="date"
                      required
                      className="ui-input"
                      value={waterAssessedAt}
                      onChange={(e) => setWaterAssessedAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="structured-field-card">
                  <label htmlFor="water-modal-image" className="structured-field-label">{lang === 'en' ? 'Evidence Image URL' : 'Đường dẫn ảnh minh chứng'}</label>
                  <input id="water-modal-image" className="ui-input" type="url" placeholder="https://..." value={waterImageUrl} disabled={savingAssessment} onChange={e => setWaterImageUrl(e.target.value)} />
                </div>
                <div>
                  <FileUpload
                    value={waterLabReportUrl}
                    onChange={setWaterLabReportUrl}
                    label={lang === 'en' ? 'Water Lab Test Certificate (PDF/Photo - VG-NL-01)' : 'Phiếu kết quả xét nghiệm nước phòng Lab (PDF/Ảnh - VG-NL-01)'}
                    hint={lang === 'en' ? 'Upload accredited lab test report for heavy metals and microbial (E. coli, Salmonella) safety.' : 'Tải lên phiếu kiểm nghiệm vi sinh và kim loại nặng để tự động đạt tiêu chí kiểm nghiệm nguồn nước VietGAP.'}
                    folder="mycropdiary/assessments/water"
                    accept="application/pdf,image/*"
                    disabled={savingAssessment}
                  />
                </div>

                <div className="structured-field-card" style={{ marginBottom: 0 }}>
                  <label htmlFor="water-modal-notes" className="structured-field-label">
                    {lang === 'en' ? 'Notes' : 'Ghi chú & Khuyến cáo'}
                  </label>
                  <textarea
                    id="water-modal-notes"
                    className="ui-textarea"
                    rows={2}
                    value={waterNotes}
                    onChange={(e) => setWaterNotes(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Water is filtered through quartz sand and charcoal system.' : 'Ví dụ: Nước được lọc qua giàn lọc cát thạch anh và than hoạt tính trước khi châm vào hệ thống tưới nhỏ giọt.'}
                  />
                </div>
              </div>

              <div className="modal-footer confirm-dialog-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button
                  type="button"
                  className="ui-cancel-button" variant="secondary"
                  disabled={savingAssessment}
                  onClick={() => setIsCreateWaterModalOpen(false)}
                >
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </Button>
                <Button
                  type="submit"
                  variant="primary" loading={savingAssessment}
                  disabled={savingAssessment || !waterSourceName.trim()}
                >
                  {savingAssessment
                    ? (lang === 'en' ? 'Saving...' : 'Đang lưu...')
                    : (lang === 'en' ? 'Save Water Record' : 'Lưu phiếu đánh giá nước')}
                </Button>
              </div>
            </form>
          </Modal>
      )}

      {/* Tab 5: Quản lý Rác thải nguy hại & Vỏ bao bì thuốc BVTV (Mục 4.8 VietGAP) */}
      {activeTab === 'waste' && selectedFarm?.id && (
        <div style={{ marginTop: '10px' }}>
          <HazardousWasteManager farmId={selectedFarm.id} farmName={selectedFarm.farmName} />
        </div>
      )}

      {/* Tab 6: Súc rửa bình phun & Bảo dưỡng thiết bị (Mục 4.9 VietGAP) */}
      {activeTab === 'equipment' && selectedFarm?.id && (
        <div style={{ marginTop: '10px' }}>
          <EquipmentMaintenanceManager farmId={selectedFarm.id} farmName={selectedFarm.farmName} />
        </div>
      )}

      {/* Tab 7: Tiếp nhận khiếu nại khách hàng & Thu hồi sản phẩm (Mục 4.10 VietGAP) */}
      {activeTab === 'complaints' && selectedFarm?.id && (
        <div style={{ marginTop: '10px' }}>
          <CustomerComplaintManager farmId={selectedFarm.id} farmName={selectedFarm.farmName} />
        </div>
      )}

      {/* VietGAP 33-criteria Init Run Modal */}
      {isInitRunOpen && selectedFarm?.id && (
        <VietGapInitRunModal
          farmId={selectedFarm.id}
          onClose={() => setIsInitRunOpen(false)}
          onSuccess={(newRun) => {
            setIsInitRunOpen(false);
            setChecklistRuns((prev) => [newRun, ...prev]);
            setAuditWorkspaceRun(newRun);
          }}
        />
      )}

      {/* VietGAP Audit Workspace Modal */}
      {auditWorkspaceRun && selectedFarm?.id && (
        <VietGapAuditWorkspaceModal
          run={auditWorkspaceRun}
          farmId={selectedFarm.id}
          onClose={() => setAuditWorkspaceRun(null)}
          onRunUpdated={(updated) => {
            setAuditWorkspaceRun(updated);
            setChecklistRuns((prev) => prev.map((r) => r.runId === updated.runId ? updated : r));
          }}
        />
      )}
    </section>
  );
}
