import { TabList, tabPanelProps } from '../../shared/components/TabList';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { formatDateTime, formatNumber } from '../../shared/format/formatters';
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon';

import { formatDate as displayDate } from '../../shared/format/formatters';

import { useState, useEffect, useMemo } from 'react';

import { useFarmWorkspace } from '../farm-management/FarmWorkspace';

import {
  fetchFarmRiskHistoryApi,
  fetchFarmSoilAssessmentHistoryApi,
  fetchFarmWaterAssessmentHistoryApi,
  ZoneRiskBackendResp,
  SoilAssessmentBackendResp,
  WaterAssessmentBackendResp,
} from '../production/zoneBlockService';
import {
  TrainingRecordResp,
  fetchTrainingHistoryApi,
  fetchTrainingDetailsApi,
  createTrainingRecordApi,
  deleteTrainingRecordApi,
} from './trainingService';
import {
  ChecklistRunResp,
  InternalAssessmentResp,
  VietGapCriterionResp,
  fetchChecklistHistoryApi,
  fetchInternalAssessmentHistoryApi,
  fetchInternalAssessmentDetailsApi,
  conductInternalAssessmentApi,
  fetchVietGapCriteriaApi,
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
  const activeTab = initialTab;
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [conductError, setConductError] = useState<string | null>(null);
  const [trainingFormError, setTrainingFormError] = useState<string | null>(null);
  const [deleteTrainingTarget, setDeleteTrainingTarget] = useState<{ id: number; farmId: number | undefined } | null>(null);
  const [deletingTraining, setDeletingTraining] = useState(false);
  useEffect(() => setNotice(null), [activeTab, selectedFarm?.id]);
  const setActiveTab = (tab: NonNullable<VietGAPComplianceProps['initialTab']>) => {
    if (tab !== activeTab) navigate(`/${tab}`);
  };
  const [farmRisks, setFarmRisks] = useState<ZoneRiskBackendResp[]>([]);
  const [farmSoils, setFarmSoils] = useState<SoilAssessmentBackendResp[]>([]);
  const [farmWaters, setFarmWaters] = useState<WaterAssessmentBackendResp[]>([]);
  const [envSubTab, setEnvSubTab] = useState<'risks' | 'soils' | 'waters'>('risks');
  const [selectedEnvWater, setSelectedEnvWater] = useState<WaterAssessmentBackendResp | null>(null);
  const [selectedEnvRisk, setSelectedEnvRisk] = useState<ZoneRiskBackendResp | null>(null);
  const [selectedEnvSoil, setSelectedEnvSoil] = useState<SoilAssessmentBackendResp | null>(null);
  const [loadingEnv, setLoadingEnv] = useState(false);

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
      Boolean(run.ruleName && run.ruleName.toLowerCase().includes('33')) ||
      Boolean(run.totalItems && run.totalItems > 0)
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

  // Internal assessment state
  const [internalAssessments, setInternalAssessments] = useState<InternalAssessmentResp[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [selectedAssessmentDetail, setSelectedAssessmentDetail] = useState<InternalAssessmentResp | null>(null);
  const [isConductModalOpen, setIsConductModalOpen] = useState(false);
  const [farmCriteria, setFarmCriteria] = useState<VietGapCriterionResp[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [conductForm, setConductForm] = useState({
    title: '',
    notes: '',
    imageUrl: '',
    itemScores: {} as Record<number, { score: number; notes: string }>,
  });
  const [submittingAssessment, setSubmittingAssessment] = useState(false);

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

  const loadInternalAssessments = async () => {
    if (!selectedFarm?.id) return;
    setLoadingAssessments(true);
    try {
      const list = await fetchInternalAssessmentHistoryApi(selectedFarm.id);
      setInternalAssessments(list);
    } catch {
      setInternalAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'checklists' && selectedFarm?.id) {
      void loadChecklistRuns();
    } else if (activeTab === 'assessments' && selectedFarm?.id) {
      void loadInternalAssessments();
    }
  }, [activeTab, selectedFarm?.id]);

  const handleOpenConductModal = async () => {
    if (!selectedFarm?.id) return;
    setConductError(null);
    setIsConductModalOpen(true);
    setLoadingCriteria(true);
    try {
      const crit = await fetchVietGapCriteriaApi(selectedFarm.id, { isActiveOnly: true });
      setFarmCriteria(crit);
      const initialScores: Record<number, { score: number; notes: string }> = {};
      crit.forEach((c) => {
        initialScores[c.criterionId] = { score: c.maxScore || 100, notes: '' };
      });
      setConductForm({
        title: `Đánh giá nội bộ VietGAP - Quý ${Math.floor((new Date().getMonth() + 3) / 3)}/${new Date().getFullYear()}`,
        notes: 'Toàn bộ khu vực canh tác và nhà đóng gói tuân thủ các chỉ tiêu an toàn thực phẩm.',
        imageUrl: '',
        itemScores: initialScores,
      });
    } catch {
      setFarmCriteria([]);
    } finally {
      setLoadingCriteria(false);
    }
  };

  const handleSubmitConduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !conductForm.title.trim()) return;
    setConductError(null);
    setNotice(null);
    setSubmittingAssessment(true);
    try {
      const itemsPayload = farmCriteria.map((c) => ({
        assessmentCriterionId: c.criterionId,
        score: conductForm.itemScores[c.criterionId]?.score ?? c.maxScore,
        resultNotes: conductForm.itemScores[c.criterionId]?.notes || undefined,
      }));
      await conductInternalAssessmentApi(selectedFarm.id, {
        assessmentTitle: conductForm.title.trim(),
        notes: conductForm.notes.trim() || undefined,
        evidenceImageUrl: conductForm.imageUrl.trim() || undefined,
        items: itemsPayload.length > 0 ? itemsPayload : [
          { assessmentCriterionId: 1, score: 95, resultNotes: 'Ghi chép số hóa truy xuất nguồn gốc minh bạch' },
          { assessmentCriterionId: 2, score: 90, resultNotes: 'Hệ thống nhà lưới sạch sẽ, lưới chắn côn trùng nguyên vẹn' },
        ],
      });
      setIsConductModalOpen(false);
      setNotice({ text: (lang === 'en' ? "VietGAP internal assessment results recorded successfully!" : 'Đã ghi nhận kết quả đợt đánh giá nội bộ VietGAP thành công!'), type: 'success' });
      void loadInternalAssessments();
    } catch (err) {
      setConductError((lang === 'en' ? err instanceof Error ? err.message : "Unable to save internal assessment." : err instanceof Error ? err.message : 'Không thể lưu đợt đánh giá nội bộ.'));
    } finally {
      setSubmittingAssessment(false);
    }
  };

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
    setNotice(null);
    try {
      const detail = await fetchTrainingDetailsApi(id);
      setSelectedTrainingDetail(detail);
    } catch (err) {
      setNotice({ text: (lang === 'en' ? err instanceof Error ? err.message : "Unable to load training details." : err instanceof Error ? err.message : 'Không tải được chi tiết đào tạo.'), type: 'error' });
    }
  };

  const handleDeleteTraining = async (id: number) => {
    if (deletingTraining) return;
    if (deleteTrainingTarget?.farmId !== selectedFarm?.id) { setDeleteTrainingTarget(null); return; }
    setDeletingTraining(true);
    setNotice(null);
    try {
      await deleteTrainingRecordApi(id);
      void loadTrainings();
    } catch (err) {
      setNotice({ text: (lang === 'en' ? err instanceof Error ? err.message : "Unable to delete training record." : err instanceof Error ? err.message : 'Không thể xóa hồ sơ đào tạo.'), type: 'error' });
    } finally {
      setDeletingTraining(false);
      setDeleteTrainingTarget(null);
    }
  };

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !createTrainingForm.trainingTitle.trim() || !createTrainingForm.trainingDate) return;
    setTrainingFormError(null);
    setNotice(null);
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
      setTrainingFormError((lang === 'en' ? err instanceof Error ? err.message : "Unable to create training record." : err instanceof Error ? err.message : 'Không thể tạo hồ sơ đào tạo.'));
    } finally {
      setSubmittingTraining(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'environment' && selectedFarm?.id) {
      setLoadingEnv(true);
      Promise.all([
        fetchFarmRiskHistoryApi(selectedFarm.id).catch(() => []),
        fetchFarmSoilAssessmentHistoryApi(selectedFarm.id).catch(() => []),
        fetchFarmWaterAssessmentHistoryApi(selectedFarm.id).catch(() => []),
      ]).then(([risks, soils, waters]) => {
        setFarmRisks(risks || []);
        setFarmSoils(soils || []);
        setFarmWaters(waters || []);
        setFarmRisks(risks || []);
        setFarmSoils(soils || []);
      }).finally(() => {
        setLoadingEnv(false);
      });
    }
  }, [activeTab, selectedFarm?.id]);

  return (
    <section className="vietgap-compliance-page">
      {notice && (activeTab !== 'assessments' || !isConductModalOpen) && (activeTab !== 'training' || !isCreateTrainingOpen) && (
        <p role={notice.type === 'error' ? 'alert' : 'status'} className={notice.type === 'error' ? 'form-error-banner' : 'status-note'}>{translate(notice.text)}</p>
      )}
      <PageHeading   title={<>{lang === 'en' ? 'VietGAP Compliance & Assessment' : 'Đánh giá & Tuân thủ Tiêu chuẩn VietGAP'}</>} description={<>
            {(lang === 'en' ? "Quality control records, internal assessments, and farm safety inspections " : "Hồ sơ kiểm soát chất lượng, đánh giá nội bộ và kiểm định an toàn nông trại ")} {selectedFarm?.farmName || ''}
          </>}><div style={{ display: 'flex', gap: '10px' }}>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            {lang === 'en' ? '📄 Export VietGAP Dossier' : '📄 Xuất hồ sơ VietGAP'}
          </Button>
        </div></PageHeading>

      <TabList idPrefix="vietgap" label={lang === 'en' ? 'VietGAP sections' : 'Các mục tuân thủ VietGAP'}
        value={activeTab} onChange={setActiveTab} items={[
          { value: 'checklists', label: <>{(lang === 'en' ? "✓ VietGAP Audit (" : "✓ Tự đánh giá VietGAP (")}{fullAuditRuns.length})</> },
          { value: 'assessments', label: <>{(lang === 'en' ? "📋 Internal assessments" : "📋 Đánh giá nội bộ")}</> },
          { value: 'environment', label: <>{(lang === 'en' ? "🌍 Soil, Water & Environment" : "🌍 Đất, Nước & Môi trường")}</> },
          { value: 'training', label: <>{(lang === 'en' ? "🎓 Occupational safety training" : "🎓 Đào tạo an toàn lao động")}</> },
        ]} />

      {/* Tab: Checklists */}
      {activeTab === 'checklists' && (
        <div {...tabPanelProps('vietgap', 'checklists')}>
          {/* Main Page Heading */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {lang === 'en' ? 'VietGAP 33-Criteria Audit History' : 'Lịch sử tự đánh giá VietGAP'}
              </h1>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-muted)', fontWeight: 500 }}>
                {lang === 'en'
                  ? 'Periodic 33-criteria VietGAP compliance audits by crop season, evidence records, and acceptance dossier.'
                  : 'Theo dõi tiến độ thẩm định 33 tiêu chí VietGAP theo mùa vụ canh tác, hồ sơ minh chứng và biên bản nghiệm thu.'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsInitRunOpen(true)}
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: 'var(--color-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#ffffff',
                }}
              >
                <Icon name="plus" size={17} />
                <span>{lang === 'en' ? 'New VietGAP Audit' : 'Khởi tạo đợt tự đánh giá'}</span>
              </button>
            </div>
          </div>

          {/* Clean Horizontal Filter Bar (Input Search + Status Dropdown + Refresh) */}
          <div className="crops-clean-filter-bar">
            <div className="crops-clean-search-wrap">
              <span className="search-icon">
                <Icon name="search" size={17} />
              </span>
              <input
                type="search"
                placeholder={lang === 'en' ? 'Search season, auditor, #ID...' : 'Tìm mùa vụ, người đánh giá, mã đợt...'}
                value={checklistSearch}
                onChange={(e) => setChecklistSearch(e.target.value)}
              />
            </div>

            <div className="crops-clean-select-wrap">
              <span className="select-lead-icon" style={{ color: 'var(--color-muted)' }}>
                <Icon name="check" size={16} />
              </span>
              <select
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value as 'all' | 'in_progress' | 'completed')}
                aria-label={lang === 'en' ? 'Filter by status' : 'Lọc theo trạng thái'}
              >
                <option value="all">{lang === 'en' ? 'All Statuses' : 'Tất cả trạng thái'}</option>
                <option value="in_progress">{lang === 'en' ? 'Active / In Progress' : 'Đang thực hiện'}</option>
                <option value="completed">{lang === 'en' ? 'Completed' : 'Đã hoàn thành'}</option>
              </select>
              <span className="select-chevron">
                <Icon name="chevron" size={16} />
              </span>
            </div>

            {(checklistSearch || auditStatusFilter !== 'all') && (
              <button
                type="button"
                className="filter-reset-btn"
                onClick={() => {
                  setChecklistSearch('');
                  setAuditStatusFilter('all');
                }}
                style={{ height: '44px' }}
              >
                {lang === 'en' ? '✕ Reset' : '✕ Đặt lại'}
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadChecklistRuns()}
              title={lang === 'en' ? 'Refresh list' : 'Tải lại danh sách'}
              style={{
                height: '44px',
                padding: '0 14px',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-card)',
                color: 'var(--color-text)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon name="refresh" size={15} />
              <span>{lang === 'en' ? 'Refresh' : 'Làm mới'}</span>
            </button>
          </div>

          {/* Card Content & Table */}
          <div className="zone-clean-card" style={{ padding: '20px 24px', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 750, color: 'var(--color-text)', margin: 0 }}>
                  {lang === 'en' ? 'VietGAP Audit List' : 'Danh sách đợt tự đánh giá'}
                </h2>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)' }}>
                  {activeAuditRuns.length} {lang === 'en' ? 'records' : 'đợt đánh giá'}
                </span>
              </div>

              {fullAuditRuns.length > 0 && (
                <span style={{ fontSize: '12.5px', color: 'var(--color-muted)' }}>
                  {lang === 'en'
                    ? `Showing ${activeAuditRuns.length} of ${fullAuditRuns.length} season audits`
                    : `Hiển thị ${activeAuditRuns.length} trong ${fullAuditRuns.length} đợt tự đánh giá`}
                </span>
              )}
            </div>

            {loadingChecklists ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="loader" size={24} className="spin" style={{ color: 'var(--color-primary)', marginBottom: '10px' }} />
                <p className="muted" style={{ margin: 0, fontSize: '14px' }}>
                  {lang === 'en' ? 'Loading inspection records...' : 'Đang tải danh sách các đợt tự đánh giá VietGAP...'}
                </p>
              </div>
            ) : activeAuditRuns.length === 0 ? (
              <div className="panel empty-state" style={{ border: 'none', boxShadow: 'none', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
                <div className="empty-icon" style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
                  {lang === 'en' ? 'No 33-criteria VietGAP audits found' : 'Chưa có đợt đánh giá toàn diện 33 tiêu chí nào'}
                </h2>
                <p style={{ color: 'var(--color-muted)', fontSize: '13.5px', maxWidth: '480px', margin: '0 0 20px', lineHeight: 1.5 }}>
                  {lang === 'en'
                    ? 'Click "New VietGAP Audit" above to launch a 33-criteria evaluation for your crop season.'
                    : 'Nhấn nút "Khởi tạo đợt tự đánh giá" ở trên để bắt đầu tiến hành kiểm tra 33 tiêu chí VietGAP cho mùa vụ.'}
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setIsInitRunOpen(true)}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: 650,
                    borderRadius: '8px',
                    background: 'var(--color-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Icon name="plus" size={16} />
                  <span>{lang === 'en' ? 'New VietGAP Audit' : 'Khởi tạo đợt tự đánh giá'}</span>
                </button>
              </div>
            ) : (
              <div className="zone-table-wrap" style={{ marginBottom: 0, flex: 1, overflowX: 'hidden' }}>
                <table className="data-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <colgroup>
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: 'var(--color-subtle)' }}>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                        {lang === 'en' ? 'CODE & AUDIT RUN ↕' : 'MÃ & ĐỢT TỰ ĐÁNH GIÁ ↕'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                        {lang === 'en' ? 'SEASON & BLOCK' : 'MÙA VỤ & LÔ ĐẤT'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                        {lang === 'en' ? 'AUDITOR & DATE ↕' : 'NGƯỜI THỰC HIỆN & NGÀY ↕'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                        {lang === 'en' ? 'EVALUATION PROGRESS' : 'TIẾN ĐỘ (33 TIÊU CHÍ)'}
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
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
                        <tr key={run.runId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          {/* Mã & Tên đợt đánh giá */}
                          <td style={{ padding: '12px 14px', whiteSpace: 'normal' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                className="crop-avatar-circle"
                                style={{
                                  background: isDone ? 'var(--color-success-bg)' : 'var(--color-info-bg)',
                                  color: isDone ? 'var(--color-success)' : 'var(--color-info)',
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
                                    fontWeight: 750,
                                    color: 'var(--color-text)',
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
                                  title={run.seasonName || ''}
                                >
                                  {run.seasonName || (lang === 'en' ? 'General Season Audit' : 'Đợt tự đánh giá mùa vụ')}
                                </button>
                                <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginTop: '2px', fontFamily: 'ui-monospace, monospace' }}>
                                  #{run.runId} · {run.ruleName || 'TCVN 11892-1:2017'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Mùa vụ & Lô đất */}
                          <td style={{ padding: '12px 14px', color: 'var(--color-body)', fontSize: '13px', fontWeight: 600, whiteSpace: 'normal' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={run.seasonName || ''}>
                              {run.seasonName || (lang === 'en' ? 'Entire Farm' : 'Toàn trang trại')}
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', fontWeight: 400, display: 'block', marginTop: '2px' }}>
                              {run.blockName ? `Lô: ${run.blockName}` : (lang === 'en' ? 'All active blocks' : 'Tất cả lô đất')}
                            </span>
                          </td>

                          {/* Người thực hiện & Ngày */}
                          <td style={{ padding: '12px 14px', color: 'var(--color-body)', fontSize: '13px', whiteSpace: 'normal' }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {run.assignedToName || (lang === 'en' ? 'Audit Team' : 'Ban kiểm soát')}
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', display: 'block', marginTop: '2px' }}>
                              {run.completedAt || run.scheduledAt || run.createdAt
                                ? new Date(run.completedAt || run.scheduledAt || run.createdAt!).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')
                                : (lang === 'en' ? 'Today' : 'Hôm nay')}
                            </span>
                          </td>

                          {/* Tiến độ thẩm định (33 tiêu chí) */}
                          <td style={{ padding: '12px 14px', whiteSpace: 'normal' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-body)' }}>
                                {evaluatedCount}/{totalCount} ({progressPercent}%)
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: isDone ? 'var(--color-success)' : 'var(--color-muted)' }}>
                                {isDone ? (lang === 'en' ? 'Done' : 'Hoàn thành') : (lang === 'en' ? 'In progress' : 'Đang mở')}
                              </span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--color-subtle)', borderRadius: '2px', overflow: 'hidden', marginBottom: '5px' }}>
                              <div
                                style={{
                                  width: `${progressPercent}%`,
                                  height: '100%',
                                  background: isDone ? 'var(--color-success)' : 'var(--color-primary)',
                                  borderRadius: '2px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                {run.passedItems} {lang === 'en' ? 'pass' : 'đạt'}
                              </span>
                              {run.failedItems > 0 && (
                                <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                                  · {run.failedItems} {lang === 'en' ? 'fail' : 'chưa đạt'}
                                </span>
                              )}
                              {pendingCount > 0 && (
                                <span style={{ color: 'var(--color-muted)' }}>
                                  · {pendingCount} {lang === 'en' ? 'pending' : 'chờ'}
                                </span>
                              )}
                              {run.missingEvidenceCount > 0 && (
                                <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
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

                              <button
                                type="button"
                                onClick={() => setAuditWorkspaceRun(run)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '7px 13px',
                                  borderRadius: '8px',
                                  fontSize: '12.5px',
                                  fontWeight: 650,
                                  border: isDone ? '1px solid var(--color-border)' : 'none',
                                  background: isDone ? 'var(--color-card)' : 'var(--color-primary)',
                                  color: isDone ? 'var(--color-body)' : '#ffffff',
                                  cursor: 'pointer',
                                  boxShadow: isDone ? 'none' : '0 1px 3px rgba(5, 150, 105, 0.25)',
                                  transition: 'all 0.15s ease',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Icon name={isDone ? 'eye' : 'edit'} size={13} />
                                <span>
                                  {isDone
                                    ? (lang === 'en' ? 'View / Export PDF' : 'Xem hồ sơ & PDF')
                                    : (lang === 'en' ? 'Continue Audit' : 'Tiếp tục đánh giá')}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            <div className="zone-table-footer" style={{ margin: '16px -24px -24px' }}>
              <span>
                {lang === 'en'
                  ? `Showing 1–${activeAuditRuns.length} of ${fullAuditRuns.length} VietGAP audit runs`
                  : `Hiển thị 1–${activeAuditRuns.length} trong ${fullAuditRuns.length} đợt tự đánh giá`}
              </span>
              <div className="zone-pagination-wrap">
                <button type="button" className="zone-page-btn" disabled>&lt;</button>
                <button type="button" className="zone-page-btn active">1</button>
                <button type="button" className="zone-page-btn" disabled>&gt;</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Internal Assessments */}
      {activeTab === 'assessments' && (
        <div {...tabPanelProps('vietgap', 'assessments')} className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>{(lang === 'en' ? "VietGAP internal assessment records" : "Hồ sơ đánh giá nội bộ VietGAP")}</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: '13.5px' }}>
                {(lang === 'en' ? "Periodic independent reviews before certification (" : "Thẩm định độc lập định kỳ trước kỳ kiểm định cấp chứng nhận (")}{internalAssessments.length} {(lang === 'en' ? " assessments)" : " đợt đánh giá)")}
              </p>
            </div>
            <Button type="button" variant="primary" onClick={() => void handleOpenConductModal()}>
              {(lang === 'en' ? "+ Start new assessment" : "+ Tiến hành đánh giá mới")}
            </Button>
          </div>

          {loadingAssessments ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-muted)' }}>
              <p>{(lang === 'en' ? "⏳ Loading internal assessment history..." : "⏳ Đang tải lịch sử các đợt đánh giá nội bộ...")}</p>
            </div>
          ) : internalAssessments.length === 0 ? (
            <EmptyState   title={<>{(lang === 'en' ? "No internal assessments yet" : "Chưa có đợt đánh giá nội bộ nào")}</>} description={<>
                {(lang === 'en' ? "Click \"+ Start new assessment\" to score the VietGAP criteria." : "Nhấn \"+ Tiến hành đánh giá mới\" để lập hồ sơ chấm điểm tiêu chí VietGAP.")}
              </>} action={<><div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div></>} />
          ) : (
            <div className="ui-table-scroll" tabIndex={0}>
              <table className="ui-data-table">
                <thead>
                  <tr>
                    <th scope="col">{(lang === 'en' ? "Assessment" : "Đợt đánh giá")}</th>
                    <th scope="col">{(lang === 'en' ? "Date and time" : "Thời điểm")}</th>
                    <th scope="col">{(lang === 'en' ? "Zone / Season" : "Khu vực / Mùa vụ")}</th>
                    <th scope="col">{(lang === 'en' ? "Assessor" : "Chuyên gia đánh giá")}</th>
                    <th scope="col">{(lang === 'en' ? "Score & Rate" : "Điểm & Tỷ lệ")}</th>
                    <th scope="col">{(lang === 'en' ? "Conclusion" : "Kết luận")}</th>
                    <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                  </tr>
                </thead>
                <tbody>
                  {internalAssessments.map((a) => (
                    <tr key={a.internalAssessmentId}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {a.assessmentTitle}
                      </td>
                      <td style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
                        {displayDate(a.assessedAt, lang)}
                      </td>
                      <td style={{ color: 'var(--color-body)' }}>
                        {(lang === 'en' ? (a.zoneName || a.seasonName) || "Entire farm" : a.zoneName || a.seasonName || 'Toàn trang trại')}
                      </td>
                      <td style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? a.assessedByName || "Lead inspector" : a.assessedByName || 'Trưởng ban kiểm soát')}</td>
                      <td>
                        <strong style={{ color: a.scorePercentage >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                          {a.scorePercentage}%
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--color-muted)', display: 'block' }}>
                          ({a.totalScore} / {a.maxPossibleScore} {(lang === 'en' ? " points)" : " điểm)")}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 650,
                          background: a.complianceStatus === 'COMPLIANT' ? 'var(--color-success-bg)' : a.complianceStatus === 'CONDITIONALLY_COMPLIANT' ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
                          color: a.complianceStatus === 'COMPLIANT' ? 'var(--color-success)' : a.complianceStatus === 'CONDITIONALLY_COMPLIANT' ? 'var(--color-warning)' : 'var(--color-danger)',
                        }}>
                          {(lang === 'en' ? a.complianceStatus === 'COMPLIANT' ? "Compliant" : a.complianceStatus === 'CONDITIONALLY_COMPLIANT' ? "Improvement required" : "Fail" : a.complianceStatus === 'COMPLIANT' ? 'Đạt tiêu chuẩn' : a.complianceStatus === 'CONDITIONALLY_COMPLIANT' ? 'Cần khắc phục' : 'Không đạt')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const detail = await fetchInternalAssessmentDetailsApi(a.internalAssessmentId);
                              setSelectedAssessmentDetail(detail);
                            } catch {
                              setSelectedAssessmentDetail(a);
                            }
                          }}

                        >
                          {(lang === 'en' ? "👁️ Details" : "👁️ Chi tiết")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Assessment Detail Modal */}
          {selectedAssessmentDetail && (
            <Modal open customLayout className="modal-form-layout" onClose={() => setSelectedAssessmentDetail(null)} style={{ width: 'min(680px, 100%)' }}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{(lang === 'en' ? "Internal assessment record" : "Hồ sơ thẩm định nội bộ")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>
                    {selectedAssessmentDetail.assessmentTitle}
                  </h2>
                </div>
                <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setSelectedAssessmentDetail(null)}><Icon name="close" /></button>
              </div>
              <div className="modal-body" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px', background: 'var(--color-page)', padding: '14px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{(lang === 'en' ? "Conclusion" : "Kết luận")}</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 700, color: selectedAssessmentDetail.complianceStatus === 'COMPLIANT' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {(lang === 'en' ? selectedAssessmentDetail.complianceStatus === 'COMPLIANT' ? "COMPLIANT" : "IMPROVEMENT REQUIRED" : selectedAssessmentDetail.complianceStatus === 'COMPLIANT' ? 'ĐẠT CHUẨN' : 'CẦN KHẮC PHỤC')}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{(lang === 'en' ? "Compliance rate" : "Tỷ lệ tuân thủ")}</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--color-text)' }}>{selectedAssessmentDetail.scorePercentage}%</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{(lang === 'en' ? "Assessor" : "Chuyên gia chấm")}</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--color-body)' }}>{(lang === 'en' ? selectedAssessmentDetail.assessedByName || "Lead inspector" : selectedAssessmentDetail.assessedByName || 'Trưởng ban kiểm soát')}</p>
                  </div>
                </div>

                {selectedAssessmentDetail.notes && (
                  <div style={{ marginBottom: '18px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-body)' }}>{(lang === 'en' ? "General comments:" : "Nhận xét chung:")}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--color-text)', lineHeight: 1.5 }}>
                      {selectedAssessmentDetail.notes}
                    </p>
                  </div>
                )}

                <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', color: 'var(--color-text)' }}>{(lang === 'en' ? "Detailed VietGAP criteria scores" : "Bảng điểm chi tiết từng tiêu chí VietGAP")}</h4>
                {selectedAssessmentDetail.items && selectedAssessmentDetail.items.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedAssessmentDetail.items.map((it) => (
                      <div key={it.internalAssessmentItemId} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>{(lang === 'en' ? it.criterionName || "Assessment criteria" : it.criterionName || 'Tiêu chí đánh giá')}</strong>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>{(lang === 'en' ? it.resultNotes || "Meets technical requirements" : it.resultNotes || 'Đạt yêu cầu tiêu chuẩn kỹ thuật')}</p>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary-text)', fontSize: '14px' }}>
                          {it.score} / {it.maxScore || 100} {(lang === 'en' ? " points" : " điểm")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>{(lang === 'en' ? "No detailed criterion scores available." : "Không có chi tiết điểm số từng tiêu chí.")}</p>
                )}
              </div>
              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)' }}>
                <Button type="button" variant="secondary" onClick={() => setSelectedAssessmentDetail(null)}>
                  {(lang === 'en' ? "Close" : "Đóng")}
                </Button>
              </div>
            </Modal>
          )}

          {/* Conduct Assessment Modal */}
          {isConductModalOpen && (
            <Modal open customLayout className="modal-form-layout" onClose={() => setIsConductModalOpen(false)} style={{ width: 'min(620px, 100%)' }}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{(lang === 'en' ? "Internal assessment" : "Thẩm định nội bộ")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Conduct VietGAP assessment" : "Tiến hành đánh giá VietGAP")}</h2>
                </div>
                <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setIsConductModalOpen(false)}><Icon name="close" /></button>
              </div>
              <form onSubmit={handleSubmitConduct}>
                <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '65vh', overflowY: 'auto' }}>
                  {conductError && <p role="alert" className="form-error-banner">{translate(conductError)}</p>}
                  <div className="structured-field-card">
                    <label htmlFor="vietgap-field-1">
                      {(lang === 'en' ? "Assessment title *" : "Tiêu đề đợt đánh giá *")}
                    </label>
                    <input id="vietgap-field-1" className="ui-input"
                      type="text"
                      required
                      value={conductForm.title}
                      onChange={(e) => setConductForm((p) => ({ ...p, title: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px' }}
                    />
                  </div>
                  <div className="structured-field-card">
                    <label htmlFor="vietgap-field-2">
                      {(lang === 'en' ? "Comments & Overall conclusion" : "Nhận xét & Kết luận tổng quát")}
                    </label>
                    <textarea id="vietgap-field-2" className="ui-textarea"
                      rows={3}
                      value={conductForm.notes}
                      onChange={(e) => setConductForm((p) => ({ ...p, notes: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', resize: 'vertical' }}
                    />
                  </div>

                  <h4 style={{ margin: '10px 0 4px', fontSize: '14px', color: 'var(--color-text)' }}>{(lang === 'en' ? "Score VietGAP criteria" : "Chấm điểm các tiêu chí VietGAP")}</h4>
                  {loadingCriteria ? (
                    <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>{(lang === 'en' ? "⏳ Loading VietGAP criteria..." : "⏳ Đang nạp danh mục tiêu chí VietGAP...")}</p>
                  ) : farmCriteria.length === 0 ? (
                    <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>{(lang === 'en' ? "Use the predefined standard criteria for this assessment." : "Sử dụng các tiêu chí chuẩn định sẵn cho đợt thẩm định.")}</p>
                  ) : (
                    farmCriteria.map((c) => (
                      <div key={c.criterionId} className="structured-field-card">
                        <div className="structured-field-header">
                          <strong id={`criterion-title-${c.criterionId}`} style={{ fontSize: '13.5px', color: 'var(--color-text)' }}>{c.criterionName}</strong>
                          <span id={`criterion-max-${c.criterionId}`} style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{(lang === 'en' ? "Maximum: " : "Tối đa: ")} {c.maxScore}{(lang === 'en' ? "VND" : "đ")}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input id={`criterion-score-${c.criterionId}`} aria-labelledby={`criterion-title-${c.criterionId}`} aria-describedby={`criterion-max-${c.criterionId}`} className="ui-input"
                            type="number"
                            min="0"
                            max={c.maxScore}
                            value={conductForm.itemScores[c.criterionId]?.score ?? c.maxScore}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setConductForm((p) => ({
                                ...p,
                                itemScores: {
                                  ...p.itemScores,
                                  [c.criterionId]: {
                                    score: val,
                                    notes: p.itemScores[c.criterionId]?.notes || '',
                                  },
                                },
                              }));
                            }}
                            style={{ width: '80px', padding: '6px 10px' }}
                          />
                          <input aria-label={(lang === 'en' ? "Assessment notes / evidence..." : "Ghi chú đánh giá / minh chứng...")} className="ui-input"
                            type="text"
                            placeholder={(lang === 'en' ? "Assessment notes / evidence..." : "Ghi chú đánh giá / minh chứng...")}
                            value={conductForm.itemScores[c.criterionId]?.notes || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setConductForm((p) => ({
                                ...p,
                                itemScores: {
                                  ...p.itemScores,
                                  [c.criterionId]: {
                                    score: p.itemScores[c.criterionId]?.score ?? c.maxScore,
                                    notes: val,
                                  },
                                },
                              }));
                            }}
                            style={{ flex: 1, padding: '6px 10px' }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)' }}>
                  <Button type="button" variant="secondary" onClick={() => setIsConductModalOpen(false)}>
                    {(lang === 'en' ? "Cancel" : "Hủy")}
                  </Button>
                  <Button type="submit" variant="primary" loading={submittingAssessment}>
                    {(lang === 'en' ? submittingAssessment ? "Saving..." : "Save assessment" : submittingAssessment ? 'Đang lưu...' : 'Lưu đợt đánh giá')}
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* Tab: Environment (Zone Risks & Soil Assessments) */}
      {activeTab === 'environment' && (
        <div {...tabPanelProps('vietgap', 'environment')} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                {(lang === 'en' ? "PRODUCTION AREA RISKS" : "RỦI RO VÙNG SẢN XUẤT")}
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text)', margin: '4px 0' }}>
                {farmRisks.length}
              </div>
              <small style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Total risks recorded across the farm" : "Tổng số rủi ro đã ghi nhận trên toàn nông trại")}</small>
            </div>
            <div className="panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                {(lang === 'en' ? "HIGH RISKS" : "RỦI RO MỨC ĐỘ CAO")}
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-danger)', margin: '4px 0' }}>
                {farmRisks.filter((r) => (r.riskLevel || '').toUpperCase() === 'HIGH' || (r.riskLevel || '').toUpperCase() === 'CRITICAL').length}
              </div>
              <small style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Prioritize preventive measures" : "Cần ưu tiên áp dụng biện pháp phòng ngừa")}</small>
            </div>
            <div className="panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                {(lang === 'en' ? "BLOCK SOIL ASSESSMENTS" : "ĐÁNH GIÁ THỔ NHƯỠNG LÔ ĐẤT")}
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary-text)', margin: '4px 0' }}>
                {farmSoils.length}
              </div>
              <small style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Saved soil test records" : "Phiếu kiểm nghiệm mẫu đất lưu trữ")}</small>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="panel" style={{ padding: '20px', minWidth: 0 }}>
            <div className="ui-tab-toolbar">
              <TabList idPrefix="vietgap-environment" label={lang === 'en' ? 'Environmental records' : 'Hồ sơ môi trường'} value={envSubTab} onChange={setEnvSubTab}
              items={[
                { value: 'risks', label: <>{(lang === 'en' ? "🛡️ Production area risks (" : "🛡️ Rủi ro vùng sản xuất (")}{farmRisks.length})</> },
                { value: 'soils', label: <>{(lang === 'en' ? "🧪 Block soil assessments (" : "🧪 Đánh giá thổ nhưỡng lô đất (")}{farmSoils.length})</> },
                { value: 'waters', label: <>{lang === 'en' ? 'Water assessments' : 'Đánh giá nguồn nước'} ({farmWaters.length})</> },
              ]} />

              {loadingEnv && <small style={{ color: 'var(--color-primary-text)' }}>{(lang === 'en' ? "Loading data from the server..." : "Đang tải dữ liệu từ máy chủ...")}</small>}
            </div>

            {/* SubTab 1: Zone Risks */}
            {envSubTab === 'risks' && (
              <div {...tabPanelProps('vietgap-environment', 'risks')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text)' }}>{(lang === 'en' ? "Production zone risk records" : "Hồ sơ rủi ro phân khu sản xuất")}</h3>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-muted)', fontSize: '13px' }}>
                      {(lang === 'en' ? "Monitor contamination sources, chemical drift, and control measures under VietGAP standards" : "Theo dõi nguồn lây nhiễm, trôi dạt hóa chất và biện pháp kiểm soát theo chuẩn VietGAP")}
                    </p>
                  </div>
                </div>

                <div className="zone-table-wrap ui-table-scroll" tabIndex={0}>
                  <table className="ui-data-table">
                    <thead>
                      <tr>
                        <th scope="col">{(lang === 'en' ? "Assessment date" : "Ngày đánh giá")}</th>
                        <th scope="col">{(lang === 'en' ? "Zone" : "Khu vực")}</th>
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
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
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
                              <Link to={`/zones/${r.zoneId}`} style={{ fontWeight: 600, color: 'var(--color-primary-text)' }}>
                                {r.zoneName || `Zone #${r.zoneId}`}
                              </Link>
                            </td>
                            <td style={{ maxWidth: '240px' }}>
                              <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: '3px' }}>
                                {r.riskType}
                              </strong>
                              <span style={{ fontSize: '13px', color: 'var(--color-body)' }}>{r.description || '—'}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="knowledge-tag" style={{ textTransform: 'uppercase' }}>
                                {translate(r.riskLevel)}
                              </span>
                            </td>
                            <td style={{ maxWidth: '280px', fontSize: '13px', color: 'var(--color-text)' }}>
                              {r.mitigationPlan || '—'}
                            </td>
                            <td style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text)' }}>{(lang === 'en' ? "Irrigation water monitoring records" : "Hồ sơ giám sát nguồn nước tưới tiêu")}</h3>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-muted)', fontSize: '13px' }}>
                      {(lang === 'en' ? "Monitor pH, temperature, physicochemical and microbial indicators under QCVN 39:2011/BTNMT and VietGAP" : "Theo dõi độ pH, nhiệt độ, chỉ tiêu lý hóa và vi sinh theo QCVN 39:2011/BTNMT và VietGAP")}
                    </p>
                  </div>
                </div>

                {farmWaters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted)', background: 'var(--color-page)', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>{(lang === 'en' ? "No water quality assessment records yet." : "Chưa có phiếu đánh giá chất lượng nguồn nước nào được ghi nhận.")}</p>
                  </div>
                ) : (
                  <div className="table-responsive ui-table-scroll" tabIndex={0}>
                    <table className="ui-data-table">
                      <thead>
                        <tr>
                          <th scope="col">{(lang === 'en' ? "ID / Water source" : "ID / Nguồn nước")}</th>
                          <th scope="col">{(lang === 'en' ? "Applicable block" : "Lô áp dụng")}</th>
                          <th scope="col">{(lang === 'en' ? "Sample date" : "Ngày lấy mẫu")}</th>
                          <th scope="col">{(lang === 'en' ? "pH" : "Độ pH")}</th>
                          <th scope="col">{(lang === 'en' ? "Temperature (°C)" : "Nhiệt độ (°C)")}</th>
                          <th scope="col">{(lang === 'en' ? "Quality conclusion" : "Kết luận chất lượng")}</th>
                          <th scope="col" style={{ textAlign: 'right' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmWaters.map((w) => (
                          <tr key={w.assessmentId}>
                            <td>
                              <strong style={{ color: 'var(--color-text)', display: 'block' }}>{(lang === 'en' ? w.waterSourceName || "Main water source" : w.waterSourceName || 'Nguồn nước chính')}</strong>
                              <small style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? w.waterSourceType || "Surface water / Well" : w.waterSourceType || 'Nước mặt / Giếng')}</small>
                            </td>
                            <td>
                              {(lang === 'en' ? w.blockName ? (w.blockName + ' (' + (w.zoneName || '') + ')') : "Entire farm" : w.blockName ? w.blockName + ' (' + (w.zoneName || '') + ')' : 'Toàn trang trại')}
                            </td>
                            <td>
                              {w.assessedAt ? w.assessedAt.split('T')[0] : '-'}
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--color-info)' }}>
                              {w.waterPh ?? '-'}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {w.temperatureC != null ? w.temperatureC + '°C' : '-'}
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: (w.qualityStatus || '').toUpperCase() === 'DAT_CHUAN' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                color: (w.qualityStatus || '').toUpperCase() === 'DAT_CHUAN' ? 'var(--color-success)' : 'var(--color-danger)',
                              }}>
                                {(lang === 'en' ? (w.qualityStatus || '').toUpperCase() === 'DAT_CHUAN' ? "✓ Compliant" : (w.qualityStatus || "Not tested") : (w.qualityStatus || '').toUpperCase() === 'DAT_CHUAN' ? '✓ Đạt chuẩn' : (w.qualityStatus || 'Chưa kiểm định'))}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Button
                                type="button"
                                variant="secondary"

                                onClick={() => setSelectedEnvWater(w)}
                              >
                                {(lang === 'en' ? "View details" : "Xem chi tiết")}
                              </Button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text)' }}>{(lang === 'en' ? "Block soil assessment records" : "Hồ sơ đánh giá thổ nhưỡng lô đất")}</h3>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-muted)', fontSize: '13px' }}>
                      {(lang === 'en' ? "Periodically monitor pH, moisture, heavy metals, and microbial residues" : "Giám sát định kỳ chỉ số pH, độ ẩm, kim loại nặng và dư lượng vi sinh vật")}
                    </p>
                  </div>
                </div>

                <div className="zone-table-wrap ui-table-scroll" tabIndex={0}>
                  <table className="ui-data-table">
                    <thead>
                      <tr>
                        <th scope="col">{(lang === 'en' ? "Assessment date" : "Ngày đánh giá")}</th>
                        <th scope="col">{(lang === 'en' ? "Block" : "Lô sản xuất")}</th>
                        <th scope="col">{(lang === 'en' ? "Zone" : "Khu vực")}</th>
                        <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "pH" : "Độ pH")}</th>
                        <th scope="col" style={{ textAlign: 'center' }}>{(lang === 'en' ? "Moisture" : "Độ ẩm")}</th>
                        <th scope="col">{(lang === 'en' ? "Analysis & Notes" : "Phân tích & Ghi chú")}</th>
                        <th scope="col">{(lang === 'en' ? "Performed by" : "Người thực hiện")}</th>
                        <th scope="col" style={{ textAlign: 'right' }}>{(lang === 'en' ? "Actions" : "Thao tác")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmSoils.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
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
                              <Link to={`/zones/${s.zoneId}/blocks/${s.blockId}`} style={{ fontWeight: 600, color: 'var(--color-primary-text)' }}>
                                {s.blockName || `Block #${s.blockId}`}
                              </Link>
                            </td>
                            <td style={{ color: 'var(--color-body)' }}>{s.zoneName || `Zone #${s.zoneId}`}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: Number(s.soilPh) >= 5.5 && Number(s.soilPh) <= 7.5 ? 'var(--color-primary-text)' : 'var(--color-warning)' }}>
                              {s.soilPh != null ? `pH ${s.soilPh}` : '—'}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                              {s.moisturePercent != null ? `${s.moisturePercent}%` : '—'}
                            </td>
                            <td style={{ maxWidth: '280px', fontSize: '13px', color: 'var(--color-body)' }}>
                              {s.notes || s.nutrientData || '—'}
                            </td>
                            <td style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
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
            <Modal open customLayout onClose={() => setSelectedEnvRisk(null)} style={{ width: 'min(600px, 100%)', maxHeight: '90vh' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow">{(lang === 'en' ? "Production area risk details" : "Chi tiết rủi ro vùng sản xuất")}</span>
                    <h2>{selectedEnvRisk.riskType}</h2>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedEnvRisk(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="structured-field-card" style={{ background: 'var(--color-page)', marginBottom: '12px' }}>
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 12px', fontSize: '13.5px' }}>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Zone:" : "Phân khu:")}</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvRisk.zoneName || `Zone #${selectedEnvRisk.zoneId}`}</dd>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Assessment date:" : "Ngày đánh giá:")}</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvRisk.assessedAt ? selectedEnvRisk.assessedAt.split('T')[0] : '—'}</dd>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Risk level:" : "Mức độ rủi ro:")}</dt>
                      <dd style={{ margin: 0 }}><span className="knowledge-tag" style={{ textTransform: 'uppercase' }}>{translate(selectedEnvRisk.riskLevel)}</span></dd>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Assessed by:" : "Người đánh giá:")}</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvRisk.assessedByName || '—'}</dd>
                    </dl>
                  </div>
                  <div className="structured-field-card" style={{ background: 'var(--color-page)', marginBottom: '12px' }}>
                    <span className="structured-field-label">{(lang === 'en' ? "Risk description" : "Mô tả rủi ro")}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text)' }}>{(lang === 'en' ? selectedEnvRisk.description || "No detailed description" : selectedEnvRisk.description || 'Không có mô tả chi tiết')}</p>
                  </div>
                  <div className="structured-field-card" style={{ marginBottom: '16px', background: 'var(--color-success-bg)', borderColor: 'var(--color-border)' }}>
                    <span className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>{(lang === 'en' ? "Control & Risk mitigation measures" : "Biện pháp kiểm soát & Giảm thiểu rủi ro")}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-primary-text)', fontWeight: 600 }}>{(lang === 'en' ? selectedEnvRisk.mitigationPlan || "No control measures defined" : selectedEnvRisk.mitigationPlan || 'Chưa thiết lập biện pháp kiểm soát')}</p>
                  </div>
                  <div className="confirm-dialog-actions">
                    <Link to={`/zones/${selectedEnvRisk.zoneId}`} className="ui-button ui-button--secondary">
                      {(lang === 'en' ? "Go to Zone to update" : "Chuyển tới khu vực để cập nhật")}
                    </Link>
                    <Button type="button" variant="secondary" onClick={() => setSelectedEnvRisk(null)}>{(lang === 'en' ? "Close" : "Đóng")}</Button>
                  </div>
                </div>
              </Modal>
          )}

          {/* Details Modal: Selected Soil Assessment */}
          {selectedEnvSoil && (
            <Modal open customLayout onClose={() => setSelectedEnvSoil(null)} style={{ width: 'min(600px, 100%)', maxHeight: '90vh' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow">{(lang === 'en' ? "Block soil assessment details" : "Chi tiết đánh giá thổ nhưỡng lô đất")}</span>
                    <h2>{selectedEnvSoil.blockName || `Block #${selectedEnvSoil.blockId}`}</h2>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedEnvSoil(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="structured-field-card" style={{ background: 'var(--color-page)', marginBottom: '12px' }}>
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 12px', fontSize: '13.5px' }}>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Block:" : "Lô đất:")}</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvSoil.blockName} ({selectedEnvSoil.zoneName})</dd>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Sample date:" : "Ngày lấy mẫu:")}</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvSoil.assessedAt ? selectedEnvSoil.assessedAt.split('T')[0] : '—'}</dd>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Soil pH:" : "Độ pH đất:")}</dt>
                      <dd style={{ margin: 0, fontWeight: 700, color: 'var(--color-primary-text)' }}>{selectedEnvSoil.soilPh ?? '—'}</dd>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Soil moisture:" : "Độ ẩm đất:")}</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvSoil.moisturePercent != null ? `${selectedEnvSoil.moisturePercent}%` : '—'}</dd>
                      <dt style={{ color: 'var(--color-muted)' }}>{(lang === 'en' ? "Sampled / Tested by:" : "Người lấy mẫu / kiểm nghiệm:")}</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvSoil.conductedByName || '—'}</dd>
                    </dl>
                  </div>
                  {selectedEnvSoil.nutrientData && (
                    <div className="structured-field-card" style={{ background: 'var(--color-page)', marginBottom: '12px' }}>
                      <span className="structured-field-label">{(lang === 'en' ? "Nutrient analysis & Indicators" : "Dữ liệu phân tích dinh dưỡng & Chỉ tiêu")}</span>
                      <pre style={{ margin: '6px 0 0', background: 'var(--color-subtle)', padding: '10px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        {selectedEnvSoil.nutrientData}
                      </pre>
                    </div>
                  )}
                  {selectedEnvSoil.notes && (
                    <div className="structured-field-card" style={{ marginBottom: '16px' }}>
                      <span className="structured-field-label">{(lang === 'en' ? "Notes & Expert conclusion" : "Ghi chú & Kết luận chuyên môn")}</span>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text)' }}>{selectedEnvSoil.notes}</p>
                    </div>
                  )}
                  <div className="confirm-dialog-actions">
                    <Link to={`/zones/${selectedEnvSoil.zoneId}/blocks/${selectedEnvSoil.blockId}`} className="ui-button ui-button--secondary">
                      {(lang === 'en' ? "Go to Block to manage" : "Chuyển tới lô sản xuất để quản lý")}
                    </Link>
                    <Button type="button" variant="secondary" onClick={() => setSelectedEnvSoil(null)}>{(lang === 'en' ? "Close" : "Đóng")}</Button>
                  </div>
                </div>
              </Modal>
          )}
        </div>
      )}

      {/* Tab: Training */}
      {activeTab === 'training' && (
        <div {...tabPanelProps('vietgap', 'training')} className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--color-text)' }}>{(lang === 'en' ? "VietGAP training records" : "Hồ sơ tập huấn & Đào tạo VietGAP")}</h2>
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '13.5px' }}>
                {(lang === 'en' ? "Internal training, occupational safety training, and farming certifications (" : "Lịch sử các khóa đào tạo nội bộ, tập huấn an toàn lao động và chứng chỉ kỹ thuật canh tác (")}{trainingTotal} {(lang === 'en' ? " courses)" : " khóa học)")}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => { setTrainingFormError(null); setIsCreateTrainingOpen(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>+</span> {(lang === 'en' ? " Add training course" : " Thêm khóa đào tạo")}
            </Button>
          </div>

          {/* Filter & Search Bar */}
          <div className="production-filter-panel" style={{ marginBottom: '20px', background: 'var(--color-page)', padding: '16px', borderRadius: '10px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: '1.5 1 240px' }}>
              <label htmlFor="vietgap-field-3" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-body)', marginBottom: '4px' }}>
                {(lang === 'en' ? "Search courses" : "Tìm kiếm khóa học")}
              </label>
              <input id="vietgap-field-3" className="ui-input"
                type="text"
                placeholder={(lang === 'en' ? "Search by title, organizer, or content..." : "Tìm theo tiêu đề, người tổ chức, nội dung...")}
                value={trainingKeyword}
                onChange={(e) => setTrainingKeyword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px' }}
              />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label htmlFor="vietgap-field-4" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-body)', marginBottom: '4px' }}>
                {(lang === 'en' ? "From date" : "Từ ngày")}
              </label>
              <input id="vietgap-field-4" className="ui-input"
                type="date"
                value={trainingFromDate}
                onChange={(e) => setTrainingFromDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px' }}
              />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label htmlFor="vietgap-field-5" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-body)', marginBottom: '4px' }}>
                {(lang === 'en' ? "To date" : "Đến ngày")}
              </label>
              <input id="vietgap-field-5" className="ui-input"
                type="date"
                value={trainingToDate}
                onChange={(e) => setTrainingToDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => void loadTrainings()}

              >
                {(lang === 'en' ? "Filter" : "Lọc")}
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

                >
                  {(lang === 'en' ? "✕ Reset" : "✕ Đặt lại")}
                </Button>
              )}
            </div>
          </div>

          {trainingLoading ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-muted)' }}>
              <p>{(lang === 'en' ? "⏳ Loading training records..." : "⏳ Đang tải dữ liệu hồ sơ đào tạo...")}</p>
            </div>
          ) : trainingError ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-danger)' }}>
              <p>⚠️ {translate(trainingError)}</p>
              <Button type="button" variant="secondary" onClick={() => void loadTrainings()}>
                {(lang === 'en' ? "Retry" : "Thử lại")}
              </Button>
            </div>
          ) : trainingRecords.length === 0 ? (
            <EmptyState   title={<>{(lang === 'en' ? "No training records yet" : "Chưa có hồ sơ đào tạo nào")}</>} description={<>
                {(lang === 'en' ? "Click \"+ Add training course\" to record VietGAP training for farm workers." : "Bấm \"+ Thêm khóa đào tạo\" để ghi nhận các buổi tập huấn VietGAP cho công nhân trang trại.")}
              </>} action={<><div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div></>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trainingRecords.map((item) => (
                <div
                  key={item.trainingRecordId}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '10px',
                    background: 'var(--color-page)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15.5px', color: 'var(--color-text)' }}>{item.trainingTitle}</strong>
                      <StatusBadge   tone="success" label={<>
                        {(lang === 'en' ? "Completed" : "Hoàn thành")}
                      </>} />
                    </div>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: '13px' }}>
                      {(lang === 'en' ? "📅 Training date: " : "📅 Ngày đào tạo: ")} <strong>{item.trainingDate}</strong> {(lang === 'en' ? " · Organizer: " : " · Người tổ chức: ")} {(lang === 'en' ? item.organizerName || "Farm" : item.organizerName || 'Trang trại')} {(lang === 'en' ? " · Participants: " : " · Tham gia: ")} <strong style={{ color: 'var(--color-primary-text)' }}>{item.attendeeCount} {(lang === 'en' ? " staff" : " nhân sự")}</strong>
                    </p>
                    {item.description && (
                      <p style={{ margin: '6px 0 0', color: 'var(--color-body)', fontSize: '13px', lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleViewTrainingDetail(item.trainingRecordId)}

                    >
                      {(lang === 'en' ? "👁️ Details & Attendance" : "👁️ Chi tiết & Điểm danh")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setDeleteTrainingTarget({ id: item.trainingRecordId, farmId: selectedFarm?.id })}

                    >
                      {(lang === 'en' ? "Delete" : "Xóa")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Details Modal */}
          {selectedTrainingDetail && (
            <Modal open customLayout className="modal-form-layout" onClose={() => setSelectedTrainingDetail(null)} style={{ width: 'min(640px, 100%)' }}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{(lang === 'en' ? "VietGAP training details" : "Chi tiết khóa đào tạo VietGAP")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>
                    {selectedTrainingDetail.trainingTitle}
                  </h2>
                </div>
                <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setSelectedTrainingDetail(null)}><Icon name="close" /></button>
              </div>
              <div className="modal-body" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px', background: 'var(--color-page)', padding: '14px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{(lang === 'en' ? "Training date" : "Ngày đào tạo")}</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--color-text)' }}>{selectedTrainingDetail.trainingDate}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{(lang === 'en' ? "Organizer" : "Người tổ chức")}</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--color-text)' }}>{(lang === 'en' ? selectedTrainingDetail.organizerName || "Farm" : selectedTrainingDetail.organizerName || 'Trang trại')}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{(lang === 'en' ? "Participant count" : "Số lượng tham gia")}</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--color-primary-text)' }}>{selectedTrainingDetail.attendeeCount} {(lang === 'en' ? " workers" : " công nhân")}</p>
                  </div>
                </div>

                {selectedTrainingDetail.description && (
                  <div style={{ marginBottom: '18px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-body)' }}>{(lang === 'en' ? "Details:" : "Nội dung chi tiết:")}</span>
                    <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--color-text)', lineHeight: 1.6 }}>
                      {selectedTrainingDetail.description}
                    </p>
                  </div>
                )}

                {selectedTrainingDetail.imageUrl && (
                  <div style={{ marginBottom: '18px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-body)' }}>{(lang === 'en' ? "Evidence images / Certificates:" : "Hình ảnh minh chứng / Chứng chỉ:")}</span>
                    <div style={{ marginTop: '6px' }}>
                      <img
                        src={selectedTrainingDetail.imageUrl}
                        alt={(lang === 'en' ? "Training evidence" : "Minh chứng đào tạo")}
                        style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: '8px' }}>
                    {(lang === 'en' ? "Participants & Attendance" : "Danh sách công nhân tham gia & Điểm danh")}
                  </span>
                  {selectedTrainingDetail.attendees && selectedTrainingDetail.attendees.length > 0 ? (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }} className="ui-table-scroll" tabIndex={0}>
                      <table className="ui-data-table ui-data-table--compact">
                        <thead>
                          <tr>
                            <th scope="col">{(lang === 'en' ? "Worker ID" : "Mã CN")}</th>
                            <th scope="col">{(lang === 'en' ? "Full name" : "Họ và tên")}</th>
                            <th scope="col">{(lang === 'en' ? "Position" : "Chức vụ")}</th>
                            <th scope="col">{(lang === 'en' ? "Status" : "Trạng thái")}</th>
                            <th scope="col">{(lang === 'en' ? "Notes" : "Ghi chú")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTrainingDetail.attendees.map((att, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{att.workerCode || '—'}</td>
                              <td>{(lang === 'en' ? att.fullName || ("Worker #" + (att.farmWorkerId || (idx + 1))) : att.fullName || 'Công nhân #' + (att.farmWorkerId || idx + 1))}</td>
                              <td style={{ color: 'var(--color-muted)' }}>{translate(att.jobTitle || '—')}</td>
                              <td>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  background: att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                                  color: att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? 'var(--color-success)' : 'var(--color-warning)',
                                }}>
                                  {(lang === 'en' ? att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? "Present" : att.attendanceStatus === 'absent' ? "Absent" : "Excused" : att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? 'Có mặt' : att.attendanceStatus === 'absent' ? 'Vắng' : 'Có phép')}
                                </span>
                              </td>
                              <td style={{ color: 'var(--color-muted)' }}>{att.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      {(lang === 'en' ? "No worker attendance list has been recorded for this training session." : "Chưa ghi nhận danh sách điểm danh công nhân cụ thể cho buổi đào tạo này.")}
                    </p>
                  )}
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)' }}>
                <Button type="button" variant="secondary" onClick={() => setSelectedTrainingDetail(null)}>
                  {(lang === 'en' ? "Close" : "Đóng")}
                </Button>
              </div>
            </Modal>
          )}

          {/* Create Modal */}
          {isCreateTrainingOpen && (
            <Modal open customLayout className="modal-form-layout" onClose={() => setIsCreateTrainingOpen(false)} style={{ width: 'min(520px, 100%)' }}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{(lang === 'en' ? "Add training record" : "Thêm hồ sơ đào tạo")}</span>
                  <h2 style={{ margin: '4px 0 0' }}>{(lang === 'en' ? "Record VietGAP training" : "Ghi nhận khóa tập huấn VietGAP")}</h2>
                </div>
                <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setIsCreateTrainingOpen(false)}><Icon name="close" /></button>
              </div>
              <form onSubmit={handleCreateTraining}>
                <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {trainingFormError && <p role="alert" className="form-error-banner">{translate(trainingFormError)}</p>}
                  <div className="structured-field-card">
                    <label htmlFor="vietgap-field-6">
                      {(lang === 'en' ? "Training course title *" : "Tiêu đề khóa đào tạo / tập huấn *")}
                    </label>
                    <input id="vietgap-field-6" className="ui-input"
                      type="text"
                      required
                      placeholder={(lang === 'en' ? "Example: VietGAP chemical safety and PHI training 2026" : "VD: Tập huấn quy trình VietGAP về an toàn hóa chất và PHI 2026")}
                      value={createTrainingForm.trainingTitle}
                      onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, trainingTitle: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px' }}
                    />
                  </div>
                  <div className="structured-field-card">
                    <label htmlFor="vietgap-field-7">
                      {(lang === 'en' ? "Training date *" : "Ngày tổ chức đào tạo *")}
                    </label>
                    <input id="vietgap-field-7" className="ui-input"
                      type="date"
                      required
                      value={createTrainingForm.trainingDate}
                      onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, trainingDate: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px' }}
                    />
                  </div>
                  <div className="structured-field-card">
                    <label htmlFor="vietgap-field-8">
                      {(lang === 'en' ? "Training content & Objectives" : "Nội dung & Mục tiêu tập huấn")}
                    </label>
                    <textarea id="vietgap-field-8" className="ui-textarea"
                      rows={3}
                      placeholder={(lang === 'en' ? "Summarize course content, training provider, and participant count..." : "Mô tả tóm tắt nội dung khóa học, đơn vị giảng dạy, số lượng công nhân tham gia...")}
                      value={createTrainingForm.description}
                      onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', resize: 'vertical' }}
                    />
                  </div>
                  <div className="structured-field-card">
                    <label htmlFor="vietgap-field-9">
                      {(lang === 'en' ? "Evidence image / Certificate URL (optional)" : "Link ảnh minh chứng / Chứng chỉ (Tùy chọn)")}
                    </label>
                    <input id="vietgap-field-9" className="ui-input"
                      type="url"
                      placeholder="https://example.com/certificate.jpg"
                      value={createTrainingForm.imageUrl}
                      onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px' }}
                    />
                  </div>
                </div>
                <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsCreateTrainingOpen(false)}
                    disabled={submittingTraining}
                  >
                    {(lang === 'en' ? "Cancel" : "Hủy")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submittingTraining}
                  >
                    {(lang === 'en' ? submittingTraining ? "Saving..." : "Save training record" : submittingTraining ? 'Đang lưu...' : 'Lưu hồ sơ đào tạo')}
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}
      <Modal open={Boolean(selectedEnvWater)} onClose={() => setSelectedEnvWater(null)} title={lang === 'en' ? 'Water assessment details' : 'Chi tiết đánh giá nguồn nước'}>
        {selectedEnvWater && <dl className="detail-list">
          <div><dt>{lang === 'en' ? 'Water source' : 'Nguồn nước'}</dt><dd>{selectedEnvWater.waterSourceName || '—'}</dd></div>
          <div><dt>{lang === 'en' ? 'Block' : 'Lô trồng'}</dt><dd>{selectedEnvWater.blockName || '—'}</dd></div>
          <div><dt>{lang === 'en' ? 'Assessed at' : 'Ngày đánh giá'}</dt><dd>{formatDateTime(selectedEnvWater.assessedAt, lang)}</dd></div>
          <div><dt>pH</dt><dd>{formatNumber(selectedEnvWater.waterPh, lang)}</dd></div>
          <div><dt>{lang === 'en' ? 'Temperature' : 'Nhiệt độ'}</dt><dd>{formatNumber(selectedEnvWater.temperatureC, lang)} °C</dd></div>
          <div><dt>{lang === 'en' ? 'Quality' : 'Chất lượng'}</dt><dd><StatusBadge tone={selectedEnvWater.qualityStatus?.toUpperCase() === 'DAT_CHUAN' ? 'success' : 'neutral'} label={selectedEnvWater.qualityStatus?.toUpperCase() === 'DAT_CHUAN' ? (lang === 'en' ? 'Compliant' : 'Đạt chuẩn') : selectedEnvWater.qualityStatus || (lang === 'en' ? 'Not tested' : 'Chưa kiểm định')} /></dd></div>
          <div><dt>{lang === 'en' ? 'Notes' : 'Ghi chú'}</dt><dd>{selectedEnvWater.notes || '—'}</dd></div>
        </dl>}
      </Modal>
      <ConfirmDialog open={Boolean(deleteTrainingTarget)} title={lang === 'en' ? 'Delete training record' : 'Xóa hồ sơ đào tạo'}
        description={lang === 'en' ? 'Are you sure you want to delete this training record?' : 'Bạn có chắc chắn muốn xóa hồ sơ đào tạo này?'}
        tone="danger" loading={deletingTraining} onClose={() => setDeleteTrainingTarget(null)}
        onConfirm={() => { if (deleteTrainingTarget) void handleDeleteTraining(deleteTrainingTarget.id); }} />

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
