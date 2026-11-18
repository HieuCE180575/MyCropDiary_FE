import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { TabList, tabPanelProps } from '../../shared/components/TabList';
import {
  fetchFarmRiskHistoryApi,
  fetchFarmSoilAssessmentHistoryApi,
  fetchFarmWaterAssessmentHistoryApi,
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

interface VietGAPComplianceProps {
  initialTab?: 'checklists' | 'assessments' | 'environment' | 'training';
}

export function VietGAPCompliancePage({ initialTab = 'checklists' }: VietGAPComplianceProps) {
  const { selectedFarm } = useFarmWorkspace();
  const { lang, t: translate } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'checklists' | 'assessments' | 'environment' | 'training'>(initialTab);
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
  const [waterNotes, setWaterNotes] = useState<string>('');
  const [waterAssessedAt, setWaterAssessedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Training state
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecordResp[]>([]);
  const [trainingTotal, setTrainingTotal] = useState(0);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [trainingKeyword, setTrainingKeyword] = useState('');
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
    setTrainingLoading(true);
    setTrainingError(null);
    try {
      const resp = await fetchTrainingHistoryApi(selectedFarm.id, {
        keyword: trainingKeyword.trim() || undefined,
        fromDate: trainingFromDate || undefined,
        toDate: trainingToDate || undefined,
        size: 50,
      });
      setTrainingRecords(resp.items || []);
      setTrainingTotal(resp.totalElements || 0);
    } catch (err) {
      setTrainingError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to load training records." : err instanceof Error ? err.message : 'Không tải được danh sách hồ sơ đào tạo.'));
    } finally {
      setTrainingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'training' && selectedFarm?.id) {
      void loadTrainings();
    }
  }, [activeTab, selectedFarm?.id]);

  const handleViewTrainingDetail = async (id: number) => {
    try {
      const detail = await fetchTrainingDetailsApi(id);
      setSelectedTrainingDetail(detail);
    } catch (err) {
      alert((lang === 'en' ? err instanceof Error ? err.message : "Unable to load training details." : err instanceof Error ? err.message : 'Không tải được chi tiết đào tạo.'));
    }
  };

  const handleDeleteTraining = async (id: number) => {
    if (!window.confirm((lang === 'en' ? "Are you sure you want to delete this training record?" : 'Bạn có chắc chắn muốn xóa hồ sơ đào tạo này?'))) return;
    try {
      await deleteTrainingRecordApi(id);
      void loadTrainings();
    } catch (err) {
      alert((lang === 'en' ? err instanceof Error ? err.message : "Unable to delete training record." : err instanceof Error ? err.message : 'Không thể xóa hồ sơ đào tạo.'));
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
    const targetBlockId = waterBlockId || farmBlocks[0]?.blockId;
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
        labTestReportUrl: waterLabReportUrl.trim() || undefined,
        assessedAt: waterAssessedAt ? new Date(waterAssessedAt).toISOString() : new Date().toISOString(),
      });
      setFarmWaters((prev) => [created, ...prev]);
      setIsCreateWaterModalOpen(false);
      setWaterNotes('');
      setWaterLabReportUrl('');
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : 'Không lưu được phiếu đánh giá nước');
    } finally {
      setSavingAssessment(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'environment' && selectedFarm?.id) {
      setLoadingEnv(true);
      Promise.all([
        fetchFarmRiskHistoryApi(selectedFarm.id).catch(() => []),
        fetchFarmSoilAssessmentHistoryApi(selectedFarm.id).catch(() => []),
        fetchFarmWaterAssessmentHistoryApi(selectedFarm.id).catch(() => []),
        fetchBlocks(selectedFarm.id).catch(() => []),
      ]).then(([risks, soils, waters, blocks]) => {
        setFarmRisks(risks || []);
        setFarmSoils(soils || []);
        setFarmWaters(waters || []);
        setFarmBlocks(blocks || []);
        if (blocks && blocks.length > 0) {
          setSoilBlockId((prev) => prev || blocks[0].blockId);
          setWaterBlockId((prev) => prev || blocks[0].blockId);
        }
      }).finally(() => {
        setLoadingEnv(false);
      });
    }
  }, [activeTab, selectedFarm?.id]);

  return (
    <section className="vietgap-compliance-page">
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
                  placeholder={lang === 'en' ? 'Search season, auditor, #ID...' : 'Tìm mùa vụ, người đánh giá, mã đợt...'}
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
                                  #{run.runId} · {run.ruleName || 'TCVN 11892-1:2017'}
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
                  { value: 'risks', label: <>{(lang === 'en' ? "Production area risks (" : "Rủi ro vùng sản xuất (")}{farmRisks.length})</> },
                  { value: 'soils', label: <>{(lang === 'en' ? "Block soil assessments (" : "Đánh giá thổ nhưỡng lô đất (")}{farmSoils.length})</> },
                  { value: 'waters', label: <>{(lang === 'en' ? "Water assessments (" : "Đánh giá nguồn nước (")}{farmWaters.length})</> },
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
                        <th scope="col">{(lang === 'en' ? "Risk type & Description" : "Loại rủi ro & Mô tả")}</th>
                        <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "Level" : "Mức độ")}</th>
                        <th scope="col">{(lang === 'en' ? "Control measures" : "Biện pháp kiểm soát")}</th>
                        <th scope="col">{(lang === 'en' ? "Assessed by" : "Người đánh giá")}</th>
                        <th scope="col" style={{ textAlign: 'right' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmRisks.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
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
                                {r.zoneName || `Zone #${r.zoneId}`}
                              </Link>
                            </td>
                            <td style={{ maxWidth: '240px' }}>
                              <strong style={{ color: '#0f172a', display: 'block', marginBottom: '3px' }}>
                                {r.riskType}
                              </strong>
                              <span style={{ fontSize: '13px', color: '#475569' }}>{r.description || '—'}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="knowledge-tag" style={{ textTransform: 'uppercase' }}>
                                {translate(r.riskLevel)}
                              </span>
                            </td>
                            <td style={{ maxWidth: '280px', fontSize: '13px', color: '#1e293b' }}>
                              {r.mitigationPlan || '—'}
                            </td>
                            <td style={{ fontSize: '13px', color: '#64748b' }}>
                              {r.assessedByName || '—'}
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
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "ID / Water source" : "ID / Nguồn nước")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "Applicable block" : "Lô áp dụng")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "Sample date" : "Ngày lấy mẫu")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "pH" : "Độ pH")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "Temperature (°C)" : "Nhiệt độ (°C)")}</th>
                          <th scope="col" style={{ padding: '10px 12px' }}>{(lang === 'en' ? "Quality conclusion" : "Kết luận chất lượng")}</th>
                          <th scope="col" style={{ padding: '10px 12px', textAlign: 'center' }}>{(lang === 'en' ? "Lab Report" : "Phiếu Lab")}</th>
                          <th scope="col" style={{ padding: '10px 12px', textAlign: 'right' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmWaters.map((w) => (
                          <tr key={w.assessmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <strong style={{ color: '#0f172a', display: 'block' }}>{(lang === 'en' ? w.waterSourceName || "Main water source" : w.waterSourceName || 'Nguồn nước chính')}</strong>
                              <small style={{ color: '#64748b' }}>{(lang === 'en' ? w.waterSourceType || "Surface water / Well" : w.waterSourceType || 'Nước mặt / Giếng')}</small>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {(lang === 'en' ? w.blockName ? (w.blockName + ' (' + (w.zoneName || '') + ')') : "Entire farm" : w.blockName ? w.blockName + ' (' + (w.zoneName || '') + ')' : 'Toàn trang trại')}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {w.assessedAt ? w.assessedAt.split('T')[0] : '-'}
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
                                const isPassed = st === 'DAT_CHUAN' || st.includes('COMPLIANT') || st.includes('QUALITY') || st === 'PASS';
                                const isPending = st === 'CHO_KIEM_DINH' || st.includes('PENDING');
                                const bg = isPassed ? '#ecfdf5' : isPending ? '#fffbeb' : '#fee2e2';
                                const border = isPassed ? '#a7f3d0' : isPending ? '#fde68a' : '#fecaca';
                                const color = isPassed ? '#047857' : isPending ? '#b45309' : '#b91c1c';
                                const label = isPassed
                                  ? (lang === 'en' ? '✓ Compliant' : '✓ Đạt chuẩn')
                                  : isPending
                                    ? (lang === 'en' ? 'Pending test' : 'Chờ kiểm nghiệm')
                                    : (lang === 'en' ? 'Filtration needed' : 'Cần xử lý');
                                return (
                                  <span
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11.5px',
                                      fontWeight: 650,
                                      background: bg,
                                      border: `1px solid ${border}`,
                                      color,
                                      display: 'inline-block',
                                    }}
                                  >
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {w.labTestReportUrl ? (
                                <a
                                  href={w.labTestReportUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#065f46',
                                    background: '#ecfdf5',
                                    border: '1px solid #10b981',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                  }}
                                  title={lang === 'en' ? 'Open lab test report document' : 'Xem phiếu kết quả kiểm nghiệm Lab'}
                                >
                                  <span>{lang === 'en' ? 'Lab Report ↗' : 'Phiếu Lab ↗'}</span>
                                </a>
                              ) : (
                                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <button
                                type="button"
                                className="action-button"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => setSelectedEnvWater(w)}
                              >
                                {(lang === 'en' ? "View details" : "Xem chi tiết")}
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
                  <table className="ui-data-table">
                    <thead>
                      <tr>
                        <th scope="col">{(lang === 'en' ? "Assessment date" : "Ngày đánh giá")}</th>
                        <th scope="col">{(lang === 'en' ? "Block" : "Lô đất (Block)")}</th>
                        <th scope="col">{(lang === 'en' ? "Zone" : "Phân khu (Zone)")}</th>
                        <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "pH" : "Độ pH")}</th>
                        <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "Moisture" : "Độ ẩm")}</th>
                        <th scope="col">{(lang === 'en' ? "Analysis & Notes" : "Phân tích & Ghi chú")}</th>
                        <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "Lab Report" : "Phiếu Lab")}</th>
                        <th scope="col">{(lang === 'en' ? "Performed by" : "Người thực hiện")}</th>
                        <th scope="col" style={{ textAlign: 'right' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmSoils.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            {(lang === 'en' ? "No block soil assessments have been recorded." : "Chưa có phiếu đánh giá thổ nhưỡng nào được ghi nhận cho các lô đất.")}
                          </td>
                        </tr>
                      ) : (
                        farmSoils.map((s) => (
                          <tr key={s.assessmentId}>
                            <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {s.assessedAt ? s.assessedAt.split('T')[0] : '—'}
                            </td>
                            <td>
                              <Link to={`/zones/${s.zoneId}/blocks/${s.blockId}`} style={{ fontWeight: 600, color: '#059669' }}>
                                {s.blockName || `Block #${s.blockId}`}
                              </Link>
                            </td>
                            <td style={{ color: '#475569' }}>{s.zoneName || `Zone #${s.zoneId}`}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: Number(s.soilPh) >= 5.5 && Number(s.soilPh) <= 7.5 ? '#059669' : '#d97706' }}>
                              {s.soilPh != null ? `pH ${s.soilPh}` : '—'}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                              {s.moisturePercent != null ? `${s.moisturePercent}%` : '—'}
                            </td>
                            <td style={{ maxWidth: '280px', fontSize: '13px', color: '#334155' }}>
                              {s.notes || s.nutrientData || '—'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {s.labTestReportUrl ? (
                                <a
                                  href={s.labTestReportUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#065f46',
                                    background: '#ecfdf5',
                                    border: '1px solid #10b981',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                  }}
                                  title={lang === 'en' ? 'Open lab test report document' : 'Xem phiếu kết quả kiểm nghiệm Lab'}
                                >
                                  <span>{lang === 'en' ? 'Lab Report ↗' : 'Phiếu Lab ↗'}</span>
                                </a>
                              ) : (
                                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td style={{ fontSize: '13px', color: '#64748b' }}>
                              {s.conductedByName || '—'}
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title={(lang === 'en' ? "View soil assessment details" : "Xem chi tiết phiếu thổ nhưỡng")}
                                onClick={() => setSelectedEnvSoil(s)}
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
          </div>

          {/* Details Modal: Selected Zone Risk */}
          {selectedEnvRisk && (
            <div className="modal-overlay" role="dialog" aria-modal="true">
              <div className="modal-card" style={{ width: 'min(600px, 100%)', maxHeight: '90vh' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow">{(lang === 'en' ? "Production area risk details" : "Chi tiết rủi ro vùng sản xuất")}</span>
                    <h2>{selectedEnvRisk.riskType}</h2>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedEnvRisk(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="structured-field-card" style={{ background: '#f8fafc', marginBottom: '12px' }}>
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 12px', fontSize: '13.5px' }}>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Zone:" : "Phân khu:")}</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvRisk.zoneName || `Zone #${selectedEnvRisk.zoneId}`}</dd>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Assessment date:" : "Ngày đánh giá:")}</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvRisk.assessedAt ? selectedEnvRisk.assessedAt.split('T')[0] : '—'}</dd>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Risk level:" : "Mức độ rủi ro:")}</dt>
                      <dd style={{ margin: 0 }}><span className="knowledge-tag" style={{ textTransform: 'uppercase' }}>{translate(selectedEnvRisk.riskLevel)}</span></dd>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Assessed by:" : "Người đánh giá:")}</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvRisk.assessedByName || '—'}</dd>
                    </dl>
                  </div>
                  <div className="structured-field-card" style={{ marginBottom: '12px' }}>
                    <span className="structured-field-label">{(lang === 'en' ? "Risk description" : "Mô tả rủi ro")}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>{(lang === 'en' ? selectedEnvRisk.description || "No detailed description" : selectedEnvRisk.description || 'Không có mô tả chi tiết')}</p>
                  </div>
                  <div className="structured-field-card" style={{ marginBottom: '16px', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                    <span className="structured-field-label" style={{ color: '#065f46' }}>{(lang === 'en' ? "Control & Risk mitigation measures" : "Biện pháp kiểm soát & Giảm thiểu rủi ro")}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#047857', fontWeight: 600 }}>{(lang === 'en' ? selectedEnvRisk.mitigationPlan || "No control measures defined" : selectedEnvRisk.mitigationPlan || 'Chưa thiết lập biện pháp kiểm soát')}</p>
                  </div>
                  <div className="confirm-dialog-actions">
                    <Link to={`/zones/${selectedEnvRisk.zoneId}`} className="action-button">
                      {(lang === 'en' ? "Go to Zone to update" : "Chuyển tới Zone để cập nhật")}
                    </Link>
                    <button type="button" className="ghost-button" onClick={() => setSelectedEnvRisk(null)}>{(lang === 'en' ? "Close" : "Đóng")}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Modal: Selected Soil Assessment */}
          {selectedEnvSoil && (
            <div className="modal-overlay" role="dialog" aria-modal="true">
              <div className="modal-card" style={{ width: 'min(600px, 100%)', maxHeight: '90vh' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow">{(lang === 'en' ? "Block soil assessment details" : "Chi tiết đánh giá thổ nhưỡng lô đất")}</span>
                    <h2>{selectedEnvSoil.blockName || `Block #${selectedEnvSoil.blockId}`}</h2>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedEnvSoil(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="structured-field-card" style={{ background: '#f8fafc', marginBottom: '12px' }}>
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 12px', fontSize: '13.5px' }}>
                      <dt style={{ color: '#64748b' }}>{(lang === 'en' ? "Block:" : "Lô đất:")}</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvSoil.blockName} ({selectedEnvSoil.zoneName})</dd>
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
                    <div className="structured-field-card" style={{ marginBottom: '12px', background: '#ecfdf5', border: '1px solid #10b981' }}>
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
                  <div className="confirm-dialog-actions">
                    <Link to={`/zones/${selectedEnvSoil.zoneId}/blocks/${selectedEnvSoil.blockId}`} className="action-button">
                      {(lang === 'en' ? "Go to Block to manage" : "Chuyển tới Block để quản lý")}
                    </Link>
                    <button type="button" className="ghost-button" onClick={() => setSelectedEnvSoil(null)}>{(lang === 'en' ? "Close" : "Đóng")}</button>
                  </div>
                </div>
              </div>
            </div>
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
                onClick={() => setIsCreateTrainingOpen(true)}
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
                onClick={() => void loadTrainings()}
                style={{ height: '36px', padding: '0 14px' }}
              >
                <Icon name="search" size={14} />
                <span>{lang === 'en' ? 'Filter' : 'Lọc'}</span>
              </Button>

              {(trainingKeyword || trainingFromDate || trainingToDate) && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setTrainingKeyword('');
                    setTrainingFromDate('');
                    setTrainingToDate('');
                    setTimeout(() => void loadTrainings(), 0);
                  }}
                  style={{ height: '36px', padding: '0 10px', color: '#64748b' }}
                >
                  {lang === 'en' ? '✕ Reset' : '✕ Đặt lại'}
                </Button>
              )}
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
                      <th scope="col" style={{ width: '12%' }}>{lang === 'en' ? 'TRAINING DATE' : 'NGÀY ĐÀO TẠO'}</th>
                      <th scope="col" style={{ width: '36%' }}>{lang === 'en' ? 'COURSE TITLE & DESCRIPTION' : 'TÊN KHÓA HỌC & MÔ TẢ'}</th>
                      <th scope="col" style={{ width: '18%' }}>{lang === 'en' ? 'ORGANIZER' : 'NGƯỜI TỔ CHỨC'}</th>
                      <th scope="col" style={{ width: '12%', textAlign: 'center' }}>{lang === 'en' ? 'ATTENDEES' : 'THAM GIA'}</th>
                      <th scope="col" style={{ width: '11%', textAlign: 'center' }}>{lang === 'en' ? 'STATUS' : 'TRẠNG THÁI'}</th>
                      <th scope="col" style={{ width: '11%', textAlign: 'right' }}>{lang === 'en' ? 'ACTIONS' : 'THAO TÁC'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
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
                            {item.description ? (
                              <span style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.45, display: 'block' }}>
                                {item.description}
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                {lang === 'en' ? 'No description' : 'Không có mô tả'}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '13px', color: '#334155' }}>
                            {item.organizerName || (lang === 'en' ? 'Internal Farm' : 'Nội bộ trang trại')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#f1f5f9',
                                color: '#0f172a',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              <Icon name="user" size={13} style={{ color: '#059669' }} />
                              <span>{item.attendeeCount || 0} {lang === 'en' ? 'staff' : 'nhân sự'}</span>
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 650,
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#047857',
                                display: 'inline-block',
                              }}
                            >
                              {lang === 'en' ? 'Completed' : 'Hoàn thành'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title={lang === 'en' ? 'View details & attendance' : 'Xem chi tiết & Điểm danh'}
                                onClick={() => void handleViewTrainingDetail(item.trainingRecordId)}
                              >
                                <Icon name="eye" size={16} />
                              </button>
                              <button
                                type="button"
                                className="table-icon-btn danger"
                                title={lang === 'en' ? 'Delete training record' : 'Xóa hồ sơ đào tạo'}
                                onClick={() => void handleDeleteTraining(item.trainingRecordId)}
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
            <div className="modal-backdrop" style={{ zIndex: 1100 }}>
              <div className="modal-card" style={{ maxWidth: '640px', width: '92%' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow" style={{ color: '#059669' }}>{(lang === 'en' ? "VietGAP training details" : "Chi tiết khóa đào tạo VietGAP")}</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>
                      {selectedTrainingDetail.trainingTitle}
                    </h3>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedTrainingDetail(null)}>
                    ✕
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '20px 24px' }}>
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
                  <button type="button" className="ghost-button" onClick={() => setSelectedTrainingDetail(null)}>
                    {(lang === 'en' ? "Close" : "Đóng")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Modal */}
          {isCreateTrainingOpen && (
            <div className="modal-backdrop" style={{ zIndex: 1100 }}>
              <div className="modal-card" style={{ maxWidth: '520px', width: '92%' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow" style={{ color: '#059669' }}>{(lang === 'en' ? "Add training record" : "Thêm hồ sơ đào tạo")}</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>{(lang === 'en' ? "Record VietGAP training" : "Ghi nhận khóa tập huấn VietGAP")}</h3>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setIsCreateTrainingOpen(false)}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateTraining}>
                  <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        {(lang === 'en' ? "Training course title *" : "Tiêu đề khóa đào tạo / tập huấn *")}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={(lang === 'en' ? "Example: VietGAP chemical safety and PHI training 2026" : "VD: Tập huấn quy trình VietGAP về an toàn hóa chất và PHI 2026")}
                        value={createTrainingForm.trainingTitle}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, trainingTitle: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        {(lang === 'en' ? "Training date *" : "Ngày tổ chức đào tạo *")}
                      </label>
                      <input
                        type="date"
                        required
                        value={createTrainingForm.trainingDate}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, trainingDate: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        {(lang === 'en' ? "Training content & Objectives" : "Nội dung & Mục tiêu tập huấn")}
                      </label>
                      <textarea
                        rows={3}
                        placeholder={(lang === 'en' ? "Summarize course content, training provider, and participant count..." : "Mô tả tóm tắt nội dung khóa học, đơn vị giảng dạy, số lượng công nhân tham gia...")}
                        value={createTrainingForm.description}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, description: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        {(lang === 'en' ? "Evidence image / Certificate URL (optional)" : "Link ảnh minh chứng / Chứng chỉ (Tùy chọn)")}
                      </label>
                      <input
                        type="url"
                        placeholder="https://example.com/certificate.jpg"
                        value={createTrainingForm.imageUrl}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setIsCreateTrainingOpen(false)}
                      disabled={submittingTraining}
                    >
                      {(lang === 'en' ? "Cancel" : "Hủy")}
                    </button>
                    <button
                      type="submit"
                      className="action-button solid"
                      disabled={submittingTraining}
                    >
                      {(lang === 'en' ? submittingTraining ? "Saving..." : "Save training record" : submittingTraining ? 'Đang lưu...' : 'Lưu hồ sơ đào tạo')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Water Assessment Detail Modal */}
      {selectedEnvWater && (
        <div className="modal-backdrop" onClick={() => setSelectedEnvWater(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                {lang === 'en' ? 'Water Assessment Details' : 'Chi tiết đánh giá nguồn nước'}
              </h3>
              <button type="button" className="modal-close" onClick={() => setSelectedEnvWater(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div><strong>{lang === 'en' ? 'Water source:' : 'Nguồn nước:'}</strong> {selectedEnvWater.waterSourceName || '—'}</div>
                <div><strong>{lang === 'en' ? 'Block:' : 'Lô trồng:'}</strong> {selectedEnvWater.blockName || '—'}</div>
                <div><strong>pH:</strong> {selectedEnvWater.waterPh ?? '—'}</div>
                <div><strong>{lang === 'en' ? 'Temp:' : 'Nhiệt độ:'}</strong> {selectedEnvWater.temperatureC ? `${selectedEnvWater.temperatureC}°C` : '—'}</div>
                <div><strong>{lang === 'en' ? 'Quality:' : 'Chất lượng:'}</strong> {selectedEnvWater.qualityStatus || '—'}</div>
                <div><strong>{lang === 'en' ? 'Date:' : 'Ngày đo:'}</strong> {selectedEnvWater.assessedAt ? new Date(selectedEnvWater.assessedAt).toLocaleDateString('vi-VN') : '—'}</div>
              </div>
              {selectedEnvWater.labTestReportUrl && (
                <div style={{ marginTop: '12px', padding: '10px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#065f46' }}>
                    <strong>{lang === 'en' ? 'Lab Test Report (VG-NL-01):' : 'Phiếu kiểm nghiệm nước (VG-NL-01):'}</strong>
                    <div style={{ wordBreak: 'break-all', marginTop: '2px' }}>{selectedEnvWater.labTestReportUrl}</div>
                  </div>
                  <a
                    href={selectedEnvWater.labTestReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-button"
                    style={{ padding: '4px 10px', fontSize: '11px', whiteSpace: 'nowrap', textDecoration: 'none' }}
                  >
                    {lang === 'en' ? 'View ↗' : 'Xem phiếu ↗'}
                  </a>
                </div>
              )}
              {selectedEnvWater.notes && (
                <div style={{ marginTop: '12px', fontSize: '12.5px', color: '#475569' }}>
                  <strong>{lang === 'en' ? 'Notes:' : 'Ghi chú:'}</strong> {selectedEnvWater.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Soil Assessment Modal */}
      {isCreateSoilModalOpen && (
        <div className="modal-backdrop" onClick={() => !savingAssessment && setIsCreateSoilModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#059669' }}>
                  {lang === 'en' ? 'VietGAP VG-NL-01 Compliance' : 'Tuân thủ VietGAP VG-NL-01'}
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {lang === 'en' ? 'Record Block Soil Assessment' : 'Ghi nhận phiếu đánh giá thổ nhưỡng'}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close"
                disabled={savingAssessment}
                onClick={() => setIsCreateSoilModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSoilAssessment}>
              <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
                {assessmentError && (
                  <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '6px', color: '#b91c1c', fontSize: '13px' }}>
                    {assessmentError}
                  </div>
                )}

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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={savingAssessment}
                  onClick={() => setIsCreateSoilModalOpen(false)}
                >
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingAssessment || !soilBlockId}
                >
                  {savingAssessment
                    ? (lang === 'en' ? 'Saving...' : 'Đang lưu...')
                    : (lang === 'en' ? 'Save Soil Record' : 'Lưu phiếu đánh giá đất')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Water Assessment Modal */}
      {isCreateWaterModalOpen && (
        <div className="modal-backdrop" onClick={() => !savingAssessment && setIsCreateWaterModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#0284c7' }}>
                  {lang === 'en' ? 'QCVN 39:2011/BTNMT & VietGAP VG-NL-01' : 'QCVN 39:2011/BTNMT & VietGAP VG-NL-01'}
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {lang === 'en' ? 'Record Water Quality Assessment' : 'Ghi nhận phiếu đánh giá chất lượng nước'}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close"
                disabled={savingAssessment}
                onClick={() => setIsCreateWaterModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWaterAssessment}>
              <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
                {assessmentError && (
                  <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '6px', color: '#b91c1c', fontSize: '13px' }}>
                    {assessmentError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
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
                      <option value="CAN_XU_LY">{lang === 'en' ? 'Filtration needed' : 'Cần xử lý lắng'}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="structured-field-card" style={{ marginBottom: 0 }}>
                    <label htmlFor="water-modal-block" className="structured-field-label">
                      {lang === 'en' ? 'Applicable Block' : 'Lô đất tưới tiêu'}
                    </label>
                    <select
                      id="water-modal-block"
                      className="ui-select"
                      value={waterBlockId}
                      onChange={(e) => setWaterBlockId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">{lang === 'en' ? 'Entire farm / All blocks' : 'Toàn trang trại'}</option>
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

              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={savingAssessment}
                  onClick={() => setIsCreateWaterModalOpen(false)}
                >
                  {lang === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingAssessment || !waterSourceName.trim()}
                >
                  {savingAssessment
                    ? (lang === 'en' ? 'Saving...' : 'Đang lưu...')
                    : (lang === 'en' ? 'Save Water Record' : 'Lưu phiếu đánh giá nước')}
                </button>
              </div>
            </form>
          </div>
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
