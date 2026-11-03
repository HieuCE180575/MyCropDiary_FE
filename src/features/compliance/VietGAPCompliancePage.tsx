import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
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
  ChecklistResultItemResp,
  InternalAssessmentResp,
  VietGapCriterionResp,
  fetchChecklistHistoryApi,
  fetchChecklistResultApi,
  fetchChecklistItemDetailsApi,
  runChecklistApi,
  fetchInternalAssessmentHistoryApi,
  fetchInternalAssessmentDetailsApi,
  conductInternalAssessmentApi,
  fetchVietGapCriteriaApi,
} from './vietgapComplianceService';
import { useLanguage } from '../../shared/i18n/LanguageContext';

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  requirement: string;
  status: 'COMPLIANT' | 'MINOR_NC' | 'MAJOR_NC';
  evidence: string;
}

interface VietGAPComplianceProps {
  initialTab?: 'checklists' | 'assessments' | 'environment' | 'training';
}

export function VietGAPCompliancePage({ initialTab = 'checklists' }: VietGAPComplianceProps) {
  const { selectedFarm } = useFarmWorkspace();
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'checklists' | 'assessments' | 'environment' | 'training'>(initialTab);
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

  // Checklist runs state
  const [checklistRuns, setChecklistRuns] = useState<ChecklistRunResp[]>([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const [selectedRunDetail, setSelectedRunDetail] = useState<ChecklistRunResp | null>(null);
  const [runItemsDetail, setRunItemsDetail] = useState<ChecklistResultItemResp[]>([]);
  const [loadingRunDetail, setLoadingRunDetail] = useState(false);
  const [checklistSubTab, setChecklistSubTab] = useState<'runs' | 'criteria'>('runs');
  const [isRunningChecklist, setIsRunningChecklist] = useState(false);

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

  const handleViewRunDetail = async (runId: number) => {
    setLoadingRunDetail(true);
    try {
      const [res, items] = await Promise.all([
        fetchChecklistResultApi(runId),
        fetchChecklistItemDetailsApi(runId),
      ]);
      setSelectedRunDetail(res);
      setRunItemsDetail(items);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không tải được chi tiết đợt kiểm tra.');
    } finally {
      setLoadingRunDetail(false);
    }
  };

  const handleTriggerRunChecklist = async () => {
    if (!selectedFarm?.id) return;
    setIsRunningChecklist(true);
    try {
      await runChecklistApi(selectedFarm.id, {
        checklistRuleId: 1, // Default standard VietGAP rule
        notes: 'Kiểm tra hiện trường định kỳ theo quy chuẩn VietGAP TCVN 11892-1:2017',
        items: [
          { resultStatus: 'pass', notes: 'Hệ thống nước tưới đạt chuẩn pH 6.5, EC 1.8' },
          { resultStatus: 'pass', notes: 'Ghi nhật ký sử dụng vật tư phân bón đầy đủ' },
          { resultStatus: 'pass', notes: 'Công nhân trang bị đầy đủ bảo hộ lao động' },
        ],
      });
      alert('Đã kích hoạt đợt kiểm tra danh mục bằng chứng VietGAP thành công!');
      void loadChecklistRuns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể kích hoạt đợt kiểm tra.');
    } finally {
      setIsRunningChecklist(false);
    }
  };

  const handleOpenConductModal = async () => {
    if (!selectedFarm?.id) return;
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
      alert('Đã ghi nhận kết quả đợt đánh giá nội bộ VietGAP thành công!');
      void loadInternalAssessments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể lưu đợt đánh giá nội bộ.');
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
      setTrainingError(err instanceof Error ? err.message : 'Không tải được danh sách hồ sơ đào tạo.');
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
      alert(err instanceof Error ? err.message : 'Không tải được chi tiết đào tạo.');
    }
  };

  const handleDeleteTraining = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hồ sơ đào tạo này?')) return;
    try {
      await deleteTrainingRecordApi(id);
      void loadTrainings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xóa hồ sơ đào tạo.');
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
      alert(err instanceof Error ? err.message : 'Không thể tạo hồ sơ đào tạo.');
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

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'VG-01',
      category: '1. Đất & Giá thể canh tác',
      title: 'Đánh giá nguy cơ ô nhiễm đất',
      requirement: 'Có phiếu kết quả phân tích mẫu đất không chứa dư lượng kim loại nặng vượt ngưỡng quy định.',
      status: 'COMPLIANT',
      evidence: 'Phiếu kiểm nghiệm số 2026/KN-ĐAT ngày 15/01/2026 (Viện Khoa học Nông nghiệp)',
    },
    {
      id: 'VG-02',
      category: '2. Nước tưới tiêu',
      title: 'Nguồn nước tưới đạt chuẩn QCVN 39:2011/BTNMT',
      requirement: 'Nước mặt hoặc nước ngầm không bị ô nhiễm bởi nước thải sinh hoạt hoặc công nghiệp.',
      status: 'COMPLIANT',
      evidence: 'Hệ thống giếng khoan tầng sâu + bể lắng lọc cát thạch anh đã kiểm định',
    },
    {
      id: 'VG-03',
      category: '3. Phân bón & Dinh dưỡng',
      title: 'Sử dụng phân bón trong danh mục cho phép',
      requirement: 'Chỉ dùng phân bón có nguồn gốc rõ ràng, ghi chép sổ nhật ký đầy đủ số lượng và thời gian.',
      status: 'COMPLIANT',
      evidence: 'Nhật ký vật tư số #2026-VTTU, hóa đơn nhà cung cấp VermiFarm',
    },
    {
      id: 'VG-04',
      category: '4. Thuốc BVTV & Thời gian cách ly (PHI)',
      title: 'Tuân thủ thời gian cách ly thu hoạch',
      requirement: 'Thu hoạch phải sau thời gian cách ly tối thiểu ghi trên nhãn thuốc bảo vệ thực vật.',
      status: 'COMPLIANT',
      evidence: 'Đợt phun Neem Oil cách ngày hái 7 ngày (quy định 5 ngày)',
    },
    {
      id: 'VG-05',
      category: '5. Thu hoạch & Bảo quản sau thu hoạch',
      title: 'Vệ sinh dụng cụ chứa đựng và bao bì',
      requirement: 'Thùng sọt, bao bì đựng rau quả phải sạch sẽ, không dùng lại bao bì từng đựng hóa chất/phân bón.',
      status: 'COMPLIANT',
      evidence: 'Khay nhựa HDPE nguyên sinh chuyên dụng có khử khuẩn cồn y tế',
    },
    {
      id: 'VG-06',
      category: '6. An toàn lao động & Phúc lợi',
      title: 'Trang bị bảo hộ lao động đầy đủ',
      requirement: 'Công nhân được cấp khẩu trang, găng tay, ủng và khám sức khỏe định kỳ hàng năm.',
      status: 'MINOR_NC',
      evidence: 'Đã cấp bảo hộ, đang lên lịch khám sức khỏe đợt 2 cho 4 công nhân mới',
    },
  ]);

  const compliantCount = checklist.filter((c) => c.status === 'COMPLIANT').length;
  const complianceScore = Math.round((compliantCount / checklist.length) * 100);

  const handleToggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'COMPLIANT' ? 'MINOR_NC' : 'COMPLIANT';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  return (
    <section className="vietgap-compliance-page">
      <div className="page-heading">
        <div>
          <h1>{lang === 'en' ? 'VietGAP Compliance & Assessment' : 'Đánh giá & Tuân thủ Tiêu chuẩn VietGAP'}</h1>
          <p className="page-subtitle">
            Hồ sơ kiểm soát chất lượng, đánh giá nội bộ và kiểm định an toàn nông trại {selectedFarm?.farmName || ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="action-button" onClick={() => window.print()}>
            {lang === 'en' ? '📄 Export VietGAP Dossier' : '📄 Xuất hồ sơ VietGAP'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('checklists')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'checklists' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'checklists' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          ✓ Bảng kiểm tiêu chí ({checklist.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assessments')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'assessments' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'assessments' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          📋 Đánh giá nội bộ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('environment')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'environment' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'environment' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          🌍 Đất, Nước & Môi trường
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('training')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'training' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'training' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          🎓 Đào tạo an toàn lao động
        </button>
      </div>

      {/* Tab: Checklists */}
      {activeTab === 'checklists' && (
        <div>
          {/* Sub Navigation between Checklist Runs and Standard Criteria */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={checklistSubTab === 'runs' ? 'action-button solid' : 'action-button'}
                onClick={() => setChecklistSubTab('runs')}
              >
                📋 Lịch sử đợt kiểm tra ({checklistRuns.length})
              </button>
              <button
                type="button"
                className={checklistSubTab === 'criteria' ? 'action-button solid' : 'action-button'}
                onClick={() => setChecklistSubTab('criteria')}
              >
                ✓ Bảng kiểm quy chuẩn VietGAP
              </button>
            </div>
            <button
              type="button"
              className="action-button solid"
              disabled={isRunningChecklist}
              onClick={handleTriggerRunChecklist}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>▶</span> {isRunningChecklist ? 'Đang thực thi...' : 'Chạy đợt kiểm tra mới'}
            </button>
          </div>

          {checklistSubTab === 'runs' ? (
            <div className="panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Lịch sử đợt kiểm tra hiện trường VietGAP</h2>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                    Theo dõi các đợt thực thi kiểm tra danh mục bằng chứng, tỷ lệ đạt và bằng chứng còn thiếu
                  </p>
                </div>
                <button type="button" className="action-button" onClick={() => void loadChecklistRuns()}>
                  Làm mới
                </button>
              </div>

              {loadingChecklists ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  <p>⏳ Đang tải lịch sử các đợt kiểm tra...</p>
                </div>
              ) : checklistRuns.length === 0 ? (
                <div className="empty-state" style={{ padding: '36px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
                  <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>Chưa có đợt kiểm tra nào</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                    Nhấn "Chạy đợt kiểm tra mới" ở góc trên để kích hoạt đợt kiểm tra hiện trường đầu tiên.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                        <th style={{ padding: '12px 14px' }}>Mã đợt</th>
                        <th style={{ padding: '12px 14px' }}>Tên quy tắc kiểm tra</th>
                        <th style={{ padding: '12px 14px' }}>Mùa vụ / Lô đất</th>
                        <th style={{ padding: '12px 14px' }}>Người thực hiện</th>
                        <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 14px' }}>Kết quả kiểm tra</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklistRuns.map((run) => (
                        <tr key={run.runId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>#{run.runId}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <strong style={{ color: '#0f172a', display: 'block' }}>{run.ruleName || 'Kiểm tra hiện trường VietGAP'}</strong>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{run.ruleCategory || 'Đảm bảo chất lượng'}</span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>
                            {run.seasonName || 'Mùa vụ chung'} {run.blockName ? `· ${run.blockName}` : ''}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>{run.assignedToName || 'Ban kiểm soát'}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 650,
                              background: run.runStatus === 'completed' ? '#dcfce7' : '#fef3c7',
                              color: run.runStatus === 'completed' ? '#15803d' : '#b45309',
                            }}>
                              {run.runStatus === 'completed' ? 'Hoàn thành' : 'Đang mở'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ color: '#16a34a', fontWeight: 650 }}>{run.passedItems} đạt</span>
                            {run.failedItems > 0 && <span style={{ color: '#dc2626', fontWeight: 650, marginLeft: '6px' }}>· {run.failedItems} lỗi</span>}
                            {run.missingEvidenceCount > 0 && (
                              <span style={{ color: '#f59e0b', fontSize: '11.5px', display: 'block', marginTop: '2px' }}>
                                Thiếu {run.missingEvidenceCount} ảnh minh chứng
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="action-button"
                              onClick={() => void handleViewRunDetail(run.runId)}
                              style={{ fontSize: '12.5px', padding: '5px 12px' }}
                            >
                              👁️ Xem kết quả
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Score summary panel */}
              <div className="panel" style={{ padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', borderColor: '#a7f3d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <span className="profile-tag-pill" style={{ background: '#10b981', color: '#ffffff', fontWeight: 700 }}>
                      CHỨNG NHẬN TIÊU CHUẨN QUỐC GIA TCVN 11892-1:2017
                    </span>
                    <h2 style={{ margin: '10px 0 4px', fontSize: '24px', color: '#064e3b' }}>
                      Chỉ số tuân thủ VietGAP: <span style={{ color: '#059669', fontWeight: 800 }}>{complianceScore}%</span>
                    </h2>
                    <p style={{ margin: 0, color: '#047857', fontSize: '14px' }}>
                      Đạt {compliantCount} / {checklist.length} tiêu chí khắt khe · Đủ điều kiện duy trì chứng chỉ VietGAP
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="status-badge status-badge--success" style={{ fontSize: '14px', padding: '6px 14px' }}>
                      ✓ ĐẠT TIÊU CHUẨN
                    </span>
                    <small style={{ display: 'block', color: '#059669', marginTop: '6px' }}>Hạn kiểm tra tiếp theo: 15/10/2026</small>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="panel"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                      borderLeft: `4px solid ${item.status === 'COMPLIANT' ? '#10b981' : '#f59e0b'}`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px', color: '#059669' }}>{item.category}</strong>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>Mã tiêu chí: {item.id}</span>
                      </div>
                      <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>{item.title}</h3>
                      <p style={{ margin: '0 0 10px', color: '#475569', fontSize: '13.5px', lineHeight: 1.5 }}>
                        {item.requirement}
                      </p>
                      <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#334155' }}>
                        📎 <strong>Minh chứng kiểm tra:</strong> {item.evidence}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid',
                          fontSize: '12.5px',
                          fontWeight: 650,
                          cursor: 'pointer',
                          background: item.status === 'COMPLIANT' ? '#ecfdf5' : '#fef3c7',
                          borderColor: item.status === 'COMPLIANT' ? '#10b981' : '#f59e0b',
                          color: item.status === 'COMPLIANT' ? '#059669' : '#b45309',
                        }}
                      >
                        {item.status === 'COMPLIANT' ? '✓ Đạt chuẩn' : '⚠️ Điểm cần khắc phục'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Checklist Result Details Modal */}
          {selectedRunDetail && (
            <div className="modal-backdrop" style={{ zIndex: 1100 }}>
              <div className="modal-card" style={{ maxWidth: '680px', width: '92%' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow" style={{ color: '#059669' }}>Kết quả đợt kiểm tra danh mục</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>
                      #{selectedRunDetail.runId} · {selectedRunDetail.ruleName}
                    </h3>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedRunDetail(null)}>
                    ✕
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Trạng thái</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#059669' }}>{selectedRunDetail.runStatus.toUpperCase()}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Số mục đạt</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#16a34a' }}>{selectedRunDetail.passedItems} / {selectedRunDetail.totalItems}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Ảnh minh chứng</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: selectedRunDetail.missingEvidenceCount > 0 ? '#dc2626' : '#16a34a' }}>
                        {selectedRunDetail.missingEvidenceCount > 0 ? `Thiếu ${selectedRunDetail.missingEvidenceCount} ảnh` : 'Đầy đủ'}
                      </p>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', color: '#0f172a' }}>Chi tiết các tiêu chí kiểm tra & Minh chứng</h4>
                  {runItemsDetail.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '13px' }}>Chưa có ghi chép chi tiết từng mục kiểm tra.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {runItemsDetail.map((it) => (
                        <div key={it.resultId} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: it.resultStatus === 'pass' ? '#dcfce7' : '#fee2e2',
                              color: it.resultStatus === 'pass' ? '#15803d' : '#b91c1c',
                            }}>
                              {it.resultStatus === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                            </span>
                            <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#1e293b' }}>{it.notes || 'Không có ghi chú thêm.'}</p>
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Người kiểm tra: {it.checkedByName || 'Ban kiểm soát'}</span>
                          </div>
                          {it.evidenceImageUrl && (
                            <img src={it.evidenceImageUrl} alt="Evidence" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" className="ghost-button" onClick={() => setSelectedRunDetail(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Internal Assessments */}
      {activeTab === 'assessments' && (
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Hồ sơ đánh giá nội bộ VietGAP</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                Thẩm định độc lập định kỳ trước kỳ kiểm định cấp chứng nhận ({internalAssessments.length} đợt đánh giá)
              </p>
            </div>
            <button type="button" className="action-button solid" onClick={() => void handleOpenConductModal()}>
              + Tiến hành đánh giá mới
            </button>
          </div>

          {loadingAssessments ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
              <p>⏳ Đang tải lịch sử các đợt đánh giá nội bộ...</p>
            </div>
          ) : internalAssessments.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>Chưa có đợt đánh giá nội bộ nào</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                Nhấn "+ Tiến hành đánh giá mới" để lập hồ sơ chấm điểm tiêu chí VietGAP.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
                    <th style={{ padding: '12px 16px' }}>Đợt đánh giá</th>
                    <th style={{ padding: '12px 16px' }}>Thời điểm</th>
                    <th style={{ padding: '12px 16px' }}>Khu vực / Mùa vụ</th>
                    <th style={{ padding: '12px 16px' }}>Chuyên gia đánh giá</th>
                    <th style={{ padding: '12px 16px' }}>Điểm & Tỷ lệ</th>
                    <th style={{ padding: '12px 16px' }}>Kết luận</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {internalAssessments.map((a) => (
                    <tr key={a.internalAssessmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                        {a.assessmentTitle}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>
                        {new Date(a.assessedAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {a.zoneName || a.seasonName || 'Toàn trang trại'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{a.assessedByName || 'Trưởng ban kiểm soát'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: a.scorePercentage >= 80 ? '#16a34a' : '#d97706' }}>
                          {a.scorePercentage}%
                        </strong>
                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>
                          ({a.totalScore} / {a.maxPossibleScore} điểm)
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 650,
                          background: a.complianceStatus === 'COMPLIANT' ? '#dcfce7' : a.complianceStatus === 'CONDITIONALLY_COMPLIANT' ? '#fef3c7' : '#fee2e2',
                          color: a.complianceStatus === 'COMPLIANT' ? '#15803d' : a.complianceStatus === 'CONDITIONALLY_COMPLIANT' ? '#b45309' : '#b91c1c',
                        }}>
                          {a.complianceStatus === 'COMPLIANT' ? 'Đạt tiêu chuẩn' : a.complianceStatus === 'CONDITIONALLY_COMPLIANT' ? 'Cần khắc phục' : 'Không đạt'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="action-button"
                          onClick={async () => {
                            try {
                              const detail = await fetchInternalAssessmentDetailsApi(a.internalAssessmentId);
                              setSelectedAssessmentDetail(detail);
                            } catch {
                              setSelectedAssessmentDetail(a);
                            }
                          }}
                          style={{ fontSize: '12.5px', padding: '5px 12px' }}
                        >
                          👁️ Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Assessment Detail Modal */}
          {selectedAssessmentDetail && (
            <div className="modal-backdrop" style={{ zIndex: 1100 }}>
              <div className="modal-card" style={{ maxWidth: '680px', width: '92%' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow" style={{ color: '#059669' }}>Hồ sơ thẩm định nội bộ</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>
                      {selectedAssessmentDetail.assessmentTitle}
                    </h3>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedAssessmentDetail(null)}>
                    ✕
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Kết luận</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: selectedAssessmentDetail.complianceStatus === 'COMPLIANT' ? '#16a34a' : '#d97706' }}>
                        {selectedAssessmentDetail.complianceStatus === 'COMPLIANT' ? 'ĐẠT CHUẨN' : 'CẦN KHẮC PHỤC'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Tỷ lệ tuân thủ</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#0f172a' }}>{selectedAssessmentDetail.scorePercentage}%</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Chuyên gia chấm</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#334155' }}>{selectedAssessmentDetail.assessedByName || 'Trưởng ban kiểm soát'}</p>
                    </div>
                  </div>

                  {selectedAssessmentDetail.notes && (
                    <div style={{ marginBottom: '18px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Nhận xét chung:</span>
                      <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5 }}>
                        {selectedAssessmentDetail.notes}
                      </p>
                    </div>
                  )}

                  <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', color: '#0f172a' }}>Bảng điểm chi tiết từng tiêu chí VietGAP</h4>
                  {selectedAssessmentDetail.items && selectedAssessmentDetail.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedAssessmentDetail.items.map((it) => (
                        <div key={it.internalAssessmentItemId} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{it.criterionName || 'Tiêu chí đánh giá'}</strong>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>{it.resultNotes || 'Đạt yêu cầu tiêu chuẩn kỹ thuật'}</p>
                          </div>
                          <span style={{ fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                            {it.score} / {it.maxScore || 100} điểm
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>Không có chi tiết điểm số từng tiêu chí.</p>
                  )}
                </div>
                <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" className="ghost-button" onClick={() => setSelectedAssessmentDetail(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conduct Assessment Modal */}
          {isConductModalOpen && (
            <div className="modal-backdrop" style={{ zIndex: 1100 }}>
              <div className="modal-card" style={{ maxWidth: '620px', width: '92%' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow" style={{ color: '#059669' }}>Thẩm định nội bộ</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>Tiến hành đánh giá VietGAP</h3>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setIsConductModalOpen(false)}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmitConduct}>
                  <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '65vh', overflowY: 'auto' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Tiêu đề đợt đánh giá *
                      </label>
                      <input
                        type="text"
                        required
                        value={conductForm.title}
                        onChange={(e) => setConductForm((p) => ({ ...p, title: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Nhận xét & Kết luận tổng quát
                      </label>
                      <textarea
                        rows={3}
                        value={conductForm.notes}
                        onChange={(e) => setConductForm((p) => ({ ...p, notes: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                      />
                    </div>

                    <h4 style={{ margin: '10px 0 4px', fontSize: '14px', color: '#0f172a' }}>Chấm điểm các tiêu chí VietGAP</h4>
                    {loadingCriteria ? (
                      <p style={{ color: '#64748b', fontSize: '13px' }}>⏳ Đang nạp danh mục tiêu chí VietGAP...</p>
                    ) : farmCriteria.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '13px' }}>Sử dụng các tiêu chí chuẩn định sẵn cho đợt thẩm định.</p>
                    ) : (
                      farmCriteria.map((c) => (
                        <div key={c.criterionId} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{c.criterionName}</strong>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Tối đa: {c.maxScore}đ</span>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
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
                              style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                            <input
                              type="text"
                              placeholder="Ghi chú đánh giá / minh chứng..."
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
                              style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" className="ghost-button" onClick={() => setIsConductModalOpen(false)}>
                      Hủy
                    </button>
                    <button type="submit" className="action-button solid" disabled={submittingAssessment}>
                      {submittingAssessment ? 'Đang lưu...' : 'Lưu đợt đánh giá'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Environment (Zone Risks & Soil Assessments) */}
      {activeTab === 'environment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                RỦI RO VÙNG SẢN XUẤT
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {farmRisks.length}
              </div>
              <small style={{ color: '#64748b' }}>Tổng số rủi ro đã ghi nhận trên toàn nông trại</small>
            </div>
            <div className="panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                RỦI RO MỨC ĐỘ CAO
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', margin: '4px 0' }}>
                {farmRisks.filter((r) => (r.riskLevel || '').toUpperCase() === 'HIGH' || (r.riskLevel || '').toUpperCase() === 'CRITICAL').length}
              </div>
              <small style={{ color: '#64748b' }}>Cần ưu tiên áp dụng biện pháp phòng ngừa</small>
            </div>
            <div className="panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                ĐÁNH GIÁ THỔ NHƯỠNG LÔ ĐẤT
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', margin: '4px 0' }}>
                {farmSoils.length}
              </div>
              <small style={{ color: '#64748b' }}>Phiếu kiểm nghiệm mẫu đất lưu trữ</small>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEnvSubTab('risks')}
                  className={envSubTab === 'risks' ? 'primary-button' : 'ghost-button'}
                  style={{ height: '38px', fontSize: '13.5px' }}
                >
                  🛡️ Rủi ro vùng sản xuất ({farmRisks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEnvSubTab('soils')}
                  className={envSubTab === 'soils' ? 'primary-button' : 'ghost-button'}
                  style={{ height: '38px', fontSize: '13.5px' }}
                >
                  🧪 Đánh giá thổ nhưỡng lô đất ({farmSoils.length})
                </button>
              </div>

              {loadingEnv && <small style={{ color: '#059669' }}>Đang tải dữ liệu từ máy chủ...</small>}
            </div>

            {/* SubTab 1: Zone Risks */}
            {envSubTab === 'risks' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Hồ sơ rủi ro phân khu sản xuất</h3>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
                      Theo dõi nguồn lây nhiễm, trôi dạt hóa chất và biện pháp kiểm soát theo chuẩn VietGAP
                    </p>
                  </div>
                </div>

                <div className="zone-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ngày đánh giá</th>
                        <th>Phân khu (Zone)</th>
                        <th>Loại rủi ro & Mô tả</th>
                        <th style={{ textAlign: 'center' }}>Mức độ</th>
                        <th>Biện pháp kiểm soát</th>
                        <th>Người đánh giá</th>
                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmRisks.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            Chưa có hồ sơ rủi ro vùng sản xuất nào được ghi nhận cho nông trại này.
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
                                {r.riskLevel}
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
                                title="Xem chi tiết rủi ro"
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
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Hồ sơ giám sát nguồn nước tưới tiêu</h3>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
                      Theo dõi độ pH, nhiệt độ, chỉ tiêu lý hóa và vi sinh theo QCVN 39:2011/BTNMT và VietGAP
                    </p>
                  </div>
                </div>

                {farmWaters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>Chưa có phiếu đánh giá chất lượng nguồn nước nào được ghi nhận.</p>
                  </div>
                ) : (
                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px' }}>ID / Nguồn nước</th>
                          <th style={{ padding: '10px 12px' }}>Lô áp dụng</th>
                          <th style={{ padding: '10px 12px' }}>Ngày lấy mẫu</th>
                          <th style={{ padding: '10px 12px' }}>Độ pH</th>
                          <th style={{ padding: '10px 12px' }}>Nhiệt độ (°C)</th>
                          <th style={{ padding: '10px 12px' }}>Kết luận chất lượng</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmWaters.map((w) => (
                          <tr key={w.assessmentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <strong style={{ color: '#0f172a', display: 'block' }}>{w.waterSourceName || 'Nguồn nước chính'}</strong>
                              <small style={{ color: '#64748b' }}>{w.waterSourceType || 'Nước mặt / Giếng'}</small>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {w.blockName ? w.blockName + ' (' + (w.zoneName || '') + ')' : 'Toàn trang trại'}
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
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: (w.qualityStatus || '').toUpperCase() === 'DAT_CHUAN' ? '#dcfce7' : '#fee2e2',
                                color: (w.qualityStatus || '').toUpperCase() === 'DAT_CHUAN' ? '#166534' : '#991b1b',
                              }}>
                                {(w.qualityStatus || '').toUpperCase() === 'DAT_CHUAN' ? '✓ Đạt chuẩn' : (w.qualityStatus || 'Chưa kiểm định')}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <button
                                type="button"
                                className="action-button"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => setSelectedEnvWater(w)}
                              >
                                Xem chi tiết
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
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Hồ sơ đánh giá thổ nhưỡng lô đất</h3>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
                      Giám sát định kỳ chỉ số pH, độ ẩm, kim loại nặng và dư lượng vi sinh vật
                    </p>
                  </div>
                </div>

                <div className="zone-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ngày đánh giá</th>
                        <th>Lô đất (Block)</th>
                        <th>Phân khu (Zone)</th>
                        <th style={{ textAlign: 'center' }}>Độ pH</th>
                        <th style={{ textAlign: 'center' }}>Độ ẩm</th>
                        <th>Phân tích & Ghi chú</th>
                        <th>Người thực hiện</th>
                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmSoils.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            Chưa có phiếu đánh giá thổ nhưỡng nào được ghi nhận cho các lô đất.
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
                            <td style={{ fontSize: '13px', color: '#64748b' }}>
                              {s.conductedByName || '—'}
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                className="table-icon-btn primary"
                                title="Xem chi tiết phiếu thổ nhưỡng"
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
                    <span className="eyebrow">Chi tiết rủi ro vùng sản xuất</span>
                    <h2>{selectedEnvRisk.riskType}</h2>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedEnvRisk(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="structured-field-card" style={{ background: '#f8fafc', marginBottom: '12px' }}>
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 12px', fontSize: '13.5px' }}>
                      <dt style={{ color: '#64748b' }}>Phân khu:</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvRisk.zoneName || `Zone #${selectedEnvRisk.zoneId}`}</dd>
                      <dt style={{ color: '#64748b' }}>Ngày đánh giá:</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvRisk.assessedAt ? selectedEnvRisk.assessedAt.split('T')[0] : '—'}</dd>
                      <dt style={{ color: '#64748b' }}>Mức độ rủi ro:</dt>
                      <dd style={{ margin: 0 }}><span className="knowledge-tag" style={{ textTransform: 'uppercase' }}>{selectedEnvRisk.riskLevel}</span></dd>
                      <dt style={{ color: '#64748b' }}>Người đánh giá:</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvRisk.assessedByName || '—'}</dd>
                    </dl>
                  </div>
                  <div className="structured-field-card" style={{ marginBottom: '12px' }}>
                    <span className="structured-field-label">Mô tả rủi ro</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>{selectedEnvRisk.description || 'Không có mô tả chi tiết'}</p>
                  </div>
                  <div className="structured-field-card" style={{ marginBottom: '16px', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                    <span className="structured-field-label" style={{ color: '#065f46' }}>Biện pháp kiểm soát & Giảm thiểu rủi ro</span>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#047857', fontWeight: 600 }}>{selectedEnvRisk.mitigationPlan || 'Chưa thiết lập biện pháp kiểm soát'}</p>
                  </div>
                  <div className="confirm-dialog-actions">
                    <Link to={`/zones/${selectedEnvRisk.zoneId}`} className="action-button">
                      Chuyển tới Zone để cập nhật
                    </Link>
                    <button type="button" className="ghost-button" onClick={() => setSelectedEnvRisk(null)}>Đóng</button>
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
                    <span className="eyebrow">Chi tiết đánh giá thổ nhưỡng lô đất</span>
                    <h2>{selectedEnvSoil.blockName || `Block #${selectedEnvSoil.blockId}`}</h2>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedEnvSoil(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="structured-field-card" style={{ background: '#f8fafc', marginBottom: '12px' }}>
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 12px', fontSize: '13.5px' }}>
                      <dt style={{ color: '#64748b' }}>Lô đất:</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvSoil.blockName} ({selectedEnvSoil.zoneName})</dd>
                      <dt style={{ color: '#64748b' }}>Ngày lấy mẫu:</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvSoil.assessedAt ? selectedEnvSoil.assessedAt.split('T')[0] : '—'}</dd>
                      <dt style={{ color: '#64748b' }}>Độ pH đất:</dt>
                      <dd style={{ margin: 0, fontWeight: 700, color: '#059669' }}>{selectedEnvSoil.soilPh ?? '—'}</dd>
                      <dt style={{ color: '#64748b' }}>Độ ẩm đất:</dt>
                      <dd style={{ margin: 0, fontWeight: 700 }}>{selectedEnvSoil.moisturePercent != null ? `${selectedEnvSoil.moisturePercent}%` : '—'}</dd>
                      <dt style={{ color: '#64748b' }}>Người lấy mẫu / kiểm nghiệm:</dt>
                      <dd style={{ margin: 0 }}>{selectedEnvSoil.conductedByName || '—'}</dd>
                    </dl>
                  </div>
                  {selectedEnvSoil.nutrientData && (
                    <div className="structured-field-card" style={{ marginBottom: '12px' }}>
                      <span className="structured-field-label">Dữ liệu phân tích dinh dưỡng & Chỉ tiêu</span>
                      <pre style={{ margin: '6px 0 0', background: '#f1f5f9', padding: '10px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        {selectedEnvSoil.nutrientData}
                      </pre>
                    </div>
                  )}
                  {selectedEnvSoil.notes && (
                    <div className="structured-field-card" style={{ marginBottom: '16px' }}>
                      <span className="structured-field-label">Ghi chú & Kết luận chuyên môn</span>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>{selectedEnvSoil.notes}</p>
                    </div>
                  )}
                  <div className="confirm-dialog-actions">
                    <Link to={`/zones/${selectedEnvSoil.zoneId}/blocks/${selectedEnvSoil.blockId}`} className="action-button">
                      Chuyển tới Block để quản lý
                    </Link>
                    <button type="button" className="ghost-button" onClick={() => setSelectedEnvSoil(null)}>Đóng</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Training */}
      {activeTab === 'training' && (
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#0f172a' }}>Hồ sơ tập huấn & Đào tạo VietGAP</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                Lịch sử các khóa đào tạo nội bộ, tập huấn an toàn lao động và chứng chỉ kỹ thuật canh tác ({trainingTotal} khóa học)
              </p>
            </div>
            <button
              type="button"
              className="action-button solid"
              onClick={() => setIsCreateTrainingOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>+</span> Thêm khóa đào tạo
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="production-filter-panel" style={{ marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '10px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: '1.5 1 240px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Tìm kiếm khóa học
              </label>
              <input
                type="text"
                placeholder="Tìm theo tiêu đề, người tổ chức, nội dung..."
                value={trainingKeyword}
                onChange={(e) => setTrainingKeyword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Từ ngày
              </label>
              <input
                type="date"
                value={trainingFromDate}
                onChange={(e) => setTrainingFromDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Đến ngày
              </label>
              <input
                type="date"
                value={trainingToDate}
                onChange={(e) => setTrainingToDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="action-button solid"
                onClick={() => void loadTrainings()}
                style={{ height: '38px', padding: '0 16px' }}
              >
                Lọc
              </button>
              {(trainingKeyword || trainingFromDate || trainingToDate) && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setTrainingKeyword('');
                    setTrainingFromDate('');
                    setTrainingToDate('');
                    setTimeout(() => void loadTrainings(), 0);
                  }}
                  style={{ height: '38px', padding: '0 12px' }}
                >
                  ✕ Đặt lại
                </button>
              )}
            </div>
          </div>

          {trainingLoading ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
              <p>⏳ Đang tải dữ liệu hồ sơ đào tạo...</p>
            </div>
          ) : trainingError ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#dc2626' }}>
              <p>⚠️ {trainingError}</p>
              <button type="button" className="action-button" onClick={() => void loadTrainings()}>
                Thử lại
              </button>
            </div>
          ) : trainingRecords.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>Chưa có hồ sơ đào tạo nào</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                Bấm "+ Thêm khóa đào tạo" để ghi nhận các buổi tập huấn VietGAP cho công nhân trang trại.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trainingRecords.map((item) => (
                <div
                  key={item.trainingRecordId}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15.5px', color: '#0f172a' }}>{item.trainingTitle}</strong>
                      <span className="status-badge status-badge--success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Hoàn thành
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                      📅 Ngày đào tạo: <strong>{item.trainingDate}</strong> · Người tổ chức: {item.organizerName || 'Trang trại'} · Tham gia: <strong style={{ color: '#059669' }}>{item.attendeeCount} nhân sự</strong>
                    </p>
                    {item.description && (
                      <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => void handleViewTrainingDetail(item.trainingRecordId)}
                      style={{ fontSize: '13px' }}
                    >
                      👁️ Chi tiết & Điểm danh
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleDeleteTraining(item.trainingRecordId)}
                      style={{ fontSize: '13px', color: '#dc2626' }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Details Modal */}
          {selectedTrainingDetail && (
            <div className="modal-backdrop" style={{ zIndex: 1100 }}>
              <div className="modal-card" style={{ maxWidth: '640px', width: '92%' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow" style={{ color: '#059669' }}>Chi tiết khóa đào tạo VietGAP</span>
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
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Ngày đào tạo</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{selectedTrainingDetail.trainingDate}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Người tổ chức</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#0f172a' }}>{selectedTrainingDetail.organizerName || 'Trang trại'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Số lượng tham gia</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#059669' }}>{selectedTrainingDetail.attendeeCount} công nhân</p>
                    </div>
                  </div>

                  {selectedTrainingDetail.description && (
                    <div style={{ marginBottom: '18px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Nội dung chi tiết:</span>
                      <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#1e293b', lineHeight: 1.6 }}>
                        {selectedTrainingDetail.description}
                      </p>
                    </div>
                  )}

                  {selectedTrainingDetail.imageUrl && (
                    <div style={{ marginBottom: '18px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Hình ảnh minh chứng / Chứng chỉ:</span>
                      <div style={{ marginTop: '6px' }}>
                        <img
                          src={selectedTrainingDetail.imageUrl}
                          alt="Minh chứng đào tạo"
                          style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                      Danh sách công nhân tham gia & Điểm danh
                    </span>
                    {selectedTrainingDetail.attendees && selectedTrainingDetail.attendees.length > 0 ? (
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px' }}>Mã CN</th>
                              <th style={{ padding: '8px 12px' }}>Họ và tên</th>
                              <th style={{ padding: '8px 12px' }}>Chức vụ</th>
                              <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                              <th style={{ padding: '8px 12px' }}>Ghi chú</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTrainingDetail.attendees.map((att, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{att.workerCode || '—'}</td>
                                <td style={{ padding: '8px 12px' }}>{att.fullName || 'Công nhân #' + (att.farmWorkerId || idx + 1)}</td>
                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{att.jobTitle || '—'}</td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    background: att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? '#dcfce7' : '#fef3c7',
                                    color: att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? '#15803d' : '#b45309',
                                  }}>
                                    {att.attendanceStatus === 'attended' || att.attendanceStatus === 'completed' ? 'Có mặt' : att.attendanceStatus === 'absent' ? 'Vắng' : 'Có phép'}
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
                        Chưa ghi nhận danh sách điểm danh công nhân cụ thể cho buổi đào tạo này.
                      </p>
                    )}
                  </div>
                </div>
                <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" className="ghost-button" onClick={() => setSelectedTrainingDetail(null)}>
                    Đóng
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
                    <span className="eyebrow" style={{ color: '#059669' }}>Thêm hồ sơ đào tạo</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#0f172a' }}>Ghi nhận khóa tập huấn VietGAP</h3>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setIsCreateTrainingOpen(false)}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateTraining}>
                  <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Tiêu đề khóa đào tạo / tập huấn *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Tập huấn quy trình VietGAP về an toàn hóa chất và PHI 2026"
                        value={createTrainingForm.trainingTitle}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, trainingTitle: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Ngày tổ chức đào tạo *
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
                        Nội dung & Mục tiêu tập huấn
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Mô tả tóm tắt nội dung khóa học, đơn vị giảng dạy, số lượng công nhân tham gia..."
                        value={createTrainingForm.description}
                        onChange={(e) => setCreateTrainingForm((prev) => ({ ...prev, description: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Link ảnh minh chứng / Chứng chỉ (Tùy chọn)
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
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="action-button solid"
                      disabled={submittingTraining}
                    >
                      {submittingTraining ? 'Đang lưu...' : 'Lưu hồ sơ đào tạo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
