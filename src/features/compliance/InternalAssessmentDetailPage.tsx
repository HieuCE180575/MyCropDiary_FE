import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { fetchInternalAssessmentDetailsApi, type InternalAssessmentResp } from './vietgapComplianceService';

export function InternalAssessmentDetailPage() {
  const { assessmentId } = useParams();
  const { lang } = useLanguage();
  const [detail, setDetail] = useState<InternalAssessmentResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setDetail(null); setError(null);
    const id = Number(assessmentId);
    if (!Number.isInteger(id) || id <= 0) {
      setError(lang === 'en' ? 'Invalid assessment ID.' : 'Mã đánh giá không hợp lệ.'); setLoading(false);
      return;
    }
    fetchInternalAssessmentDetailsApi(id).then(data => { if (active) setDetail(data); })
      .catch(() => { if (active) setError(lang === 'en' ? 'Unable to load assessment details.' : 'Không thể tải chi tiết đánh giá.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assessmentId, lang]);
  return <div>
    <Link to="/assessments" className="ui-button ui-button--secondary ui-back-action" style={{ marginBottom: 20 }}>
      {lang === 'en' ? 'Back to assessments' : 'Quay lại danh sách đánh giá'}
    </Link>
    {loading && <p role="status">{lang === 'en' ? 'Loading...' : 'Đang tải...'}</p>}
    {error && <p role="alert">{error}</p>}
    {detail && <section className="panel" style={{ padding: 24 }}>
      <span className="eyebrow">{lang === 'en' ? 'Internal assessment record' : 'Hồ sơ thẩm định nội bộ'}</span>
      <h1 style={{ fontSize: 24, margin: '8px 0 24px' }}>{detail.assessmentTitle}</h1>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{(lang === 'en' ? "Conclusion" : "Kết luận")}</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: detail.complianceStatus === 'COMPLIANT' ? '#16a34a' : '#d97706' }}>
                        {(lang === 'en' ? detail.complianceStatus === 'COMPLIANT' ? "COMPLIANT" : "IMPROVEMENT REQUIRED" : detail.complianceStatus === 'COMPLIANT' ? 'ĐẠT CHUẨN' : 'CẦN KHẮC PHỤC')}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{(lang === 'en' ? "Compliance rate" : "Tỷ lệ tuân thủ")}</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#0f172a' }}>{detail.scorePercentage}%</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{(lang === 'en' ? "Assessor" : "Chuyên gia chấm")}</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#334155' }}>{(lang === 'en' ? detail.assessedByName || "Lead inspector" : detail.assessedByName || 'Trưởng ban kiểm soát')}</p>
                    </div>
                  </div>

                  {detail.notes && (
                    <div style={{ marginBottom: '18px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>{(lang === 'en' ? "General comments:" : "Nhận xét chung:")}</span>
                      <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5 }}>
                        {detail.notes}
                      </p>
                    </div>
                  )}

                  <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', color: '#0f172a' }}>{(lang === 'en' ? "Detailed VietGAP criteria scores" : "Bảng điểm chi tiết từng tiêu chí VietGAP")}</h4>
                  {detail.items && detail.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {detail.items.map((it) => (
                        <div key={it.internalAssessmentItemId} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{(lang === 'en' ? it.criterionName || "Assessment criteria" : it.criterionName || 'Tiêu chí đánh giá')}</strong>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>{(lang === 'en' ? it.resultNotes || "Meets technical requirements" : it.resultNotes || 'Đạt yêu cầu tiêu chuẩn kỹ thuật')}</p>
                          </div>
                          <span style={{ fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                            {it.score} / {it.maxScore || 100} {(lang === 'en' ? " points" : " điểm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>{(lang === 'en' ? "No detailed criterion scores available." : "Không có chi tiết điểm số từng tiêu chí.")}</p>
                  )}
    </section>}
  </div>;
}
