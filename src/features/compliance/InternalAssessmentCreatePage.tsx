import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Button } from '../../shared/components/Button';
import { fetchVietGapCriteriaApi, conductInternalAssessmentApi, type VietGapCriterionResp } from './vietgapComplianceService';

export function InternalAssessmentCreatePage() {
 const { lang } = useLanguage();
 const { selectedFarm } = useFarmWorkspace();
 const navigate = useNavigate();
 const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [farmCriteria, setFarmCriteria] = useState<VietGapCriterionResp[]>([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [conductForm, setConductForm] = useState({
    title: '',
    notes: '',
    imageUrl: '',
    itemScores: {} as Record<number, { score: number; notes: string }>,
  });
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const handleOpenConductModal = async () => {
    if (!selectedFarm?.id) return;
    setAssessmentError(null);
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
    } catch (err) {
      setFarmCriteria([]);
      setAssessmentError(err instanceof Error ? err.message : 'Unable to load criteria.');
    } finally {
      setLoadingCriteria(false);
    }
  };

  const handleSubmitConduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm?.id || !conductForm.title.trim() || !farmCriteria.length || submittingAssessment) return;
    setAssessmentError(null);
    setSubmittingAssessment(true);
    try {
      const itemsPayload = farmCriteria.map((c) => ({
        assessmentCriterionId: c.criterionId,
        score: conductForm.itemScores[c.criterionId]?.score ?? c.maxScore,
        resultNotes: conductForm.itemScores[c.criterionId]?.notes || undefined,
      }));
      const created = await conductInternalAssessmentApi(selectedFarm.id, {
        assessmentTitle: conductForm.title.trim(),
        notes: conductForm.notes.trim() || undefined,
        evidenceImageUrl: conductForm.imageUrl.trim() || undefined,
        items: itemsPayload,
      });
      navigate(`/assessments/${created.internalAssessmentId}`);
    } catch (err) {
      setAssessmentError((lang === 'en' ? err instanceof Error ? err.message : "Unable to save internal assessment." : err instanceof Error ? err.message : 'Không thể lưu đợt đánh giá nội bộ.'));
    } finally {
      setSubmittingAssessment(false);
    }
  };


 useEffect(() => { void handleOpenConductModal(); }, [selectedFarm?.id]);
 return <div>
 <Link to="/assessments" className="ui-button ui-button--secondary ui-back-action" style={{ marginBottom: 20 }}>{lang === 'en' ? 'Back to assessments' : 'Quay lại danh sách đánh giá'}</Link>
 <section className="panel" style={{ padding: 24 }}>
 <h1 style={{ fontSize: 24, margin: '0 0 20px' }}>{lang === 'en' ? 'Conduct VietGAP assessment' : 'Tiến hành đánh giá VietGAP'}</h1>
                <form onSubmit={handleSubmitConduct}>
{assessmentError && <p role="alert" style={{ color: 'var(--color-danger)' }}>{assessmentError}</p>}
                  <div className="assessment-form-fields" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="structured-field-card">
                      <div className="structured-field-header">
                      <label htmlFor="assessment-title" className="structured-field-label">
                        {lang === 'en' ? 'Assessment title' : 'Tiêu đề đợt đánh giá'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      </div>
                      <input
                        id="assessment-title"
                        className="ui-input"
                        type="text"
                        required
                        value={conductForm.title}
                        onChange={(e) => setConductForm((p) => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div className="structured-field-card">
                      <div className="structured-field-header">
                      <label htmlFor="assessment-notes" className="structured-field-label">
                        {(lang === 'en' ? "Comments & Overall conclusion" : "Nhận xét & Kết luận tổng quát")}
                      </label>
                      <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
                      </div>
                      <textarea
                        id="assessment-notes"
                        className="ui-textarea"
                        rows={3}
                        value={conductForm.notes}
                        onChange={(e) => setConductForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </div>

                    <h4 style={{ margin: '10px 0 4px', fontSize: '14px', color: '#0f172a' }}>{(lang === 'en' ? "Score VietGAP criteria" : "Chấm điểm các tiêu chí VietGAP")}</h4>
                    {loadingCriteria ? (
                      <p style={{ color: '#64748b', fontSize: '13px' }}>{(lang === 'en' ? "⏳ Loading VietGAP criteria..." : "⏳ Đang nạp danh mục tiêu chí VietGAP...")}</p>
                    ) : farmCriteria.length === 0 ? (
                      <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>{lang === 'en' ? 'No criteria available for assessment.' : 'Chưa có tiêu chí để chấm điểm đánh giá.'}</p>
                    ) : (
                      farmCriteria.map((c) => (
                        <div key={c.criterionId} className="structured-field-card">
                          <div className="structured-field-header">
                            <strong className="structured-field-label">{c.criterionName}</strong>
                            <span className="structured-field-badge" style={{ whiteSpace: 'nowrap' }}>{lang === 'en' ? 'Maximum: ' : 'Tối đa: '}{c.maxScore}{lang === 'en' ? ' points' : ' điểm'}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                            <input
                              className="ui-input"
                              aria-label={`${lang === 'en' ? 'Score' : 'Điểm'}: ${c.criterionName}`}
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
                              style={{ width: 100 }}
                            />
                            <input
                              className="ui-input"
                              aria-label={`${lang === 'en' ? 'Assessment notes' : 'Ghi chú đánh giá'}: ${c.criterionName}`}
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
                              style={{ flex: '1 1 220px', minWidth: 0 }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
                    <Button className={'ui-cancel-button'} variant="secondary" onClick={() => navigate('/assessments')}>
                      {(lang === 'en' ? "Cancel" : "Hủy")}
                    </Button>
                    <Button type="submit" variant="primary" disabled={loadingCriteria || !farmCriteria.length || submittingAssessment}>
                      {(lang === 'en' ? submittingAssessment ? "Saving..." : "Save assessment" : submittingAssessment ? 'Đang lưu...' : 'Lưu đợt đánh giá')}
                    </Button>
                  </div>
                </form>
 </section></div>;
}
