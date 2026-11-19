import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { fetchTrainingDetailsApi, type TrainingRecordResp } from './trainingService';
import { Button } from '../../shared/components/Button';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { TablePagination } from '../../shared/components/TablePagination';
import { usePagination } from '../../shared/hooks/usePagination';
import { formatDate } from '../../shared/format/formatters';

export function TrainingDetailPage() {
  const { trainingId } = useParams();
  const { selectedFarm } = useFarmWorkspace();
  const { lang, t } = useLanguage();
  const [record, setRecord] = useState<TrainingRecordResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setRecord(null); setError(null); setKeyword('');
    const id = Number(trainingId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setError(lang === 'en' ? 'Invalid training ID.' : 'Mã khóa đào tạo không hợp lệ.');
      setLoading(false);
      return;
    }
    fetchTrainingDetailsApi(id).then(detail => { if (active) setRecord(detail); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load training details.' : 'Không thể tải chi tiết khóa đào tạo.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [trainingId, selectedFarm?.id, retry, lang]);
  const query = keyword.trim().toLocaleLowerCase();
  const attendees = (record?.attendees ?? []).filter(worker =>
    [worker.workerCode, worker.fullName, worker.jobTitle].some(value => value?.toLocaleLowerCase().includes(query)));
  const pagination = usePagination(attendees, `${trainingId}:${query}`, 20);
  return <section>
    <Link to="/training" className="ui-button ui-button--secondary ui-back-action" style={{ marginBottom: 20 }}>
      {lang === 'en' ? 'Back to training' : 'Quay lại danh sách đào tạo'}
    </Link>
    {loading && <p role="status">{lang === 'en' ? 'Loading training details...' : 'Đang tải chi tiết khóa đào tạo...'}</p>}
    {error && <div className="panel" role="alert"><p>{error}</p><Button onClick={() => setRetry(value => value + 1)}>{lang === 'en' ? 'Retry' : 'Thử lại'}</Button></div>}
    {record && <>
      <div className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <span className="eyebrow">{lang === 'en' ? 'VietGAP training details' : 'Chi tiết khóa đào tạo VietGAP'}</span>
        <h1 style={{ fontSize: 24, margin: '8px 0 20px' }}>{record.trainingTitle}</h1>
        <dl className="training-detail-summary">
          <div className="structured-field-card"><dt className="structured-field-header structured-field-label">{lang === 'en' ? 'Training date' : 'Ngày đào tạo'}</dt><dd>{formatDate(record.trainingDate, lang)}</dd></div>
          <div className="structured-field-card"><dt className="structured-field-header structured-field-label">{lang === 'en' ? 'Organizer' : 'Người tổ chức'}</dt><dd>{record.organizerName || '—'}</dd></div>
          <div className="structured-field-card"><dt className="structured-field-header structured-field-label">{lang === 'en' ? 'Participants' : 'Số lượng tham gia'}</dt><dd>{record.attendeeCount} {lang === 'en' ? 'workers' : 'công nhân'}</dd></div>
        </dl>
        <div className="structured-field-card" style={{ marginTop: 16 }}><h2 className="structured-field-header structured-field-label">{lang === 'en' ? 'Training content' : 'Nội dung đào tạo'}</h2><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{record.description || (lang === 'en' ? 'No description provided.' : 'Chưa có nội dung mô tả.')}</p></div>
        {record.imageUrl && /^https?:\/\//i.test(record.imageUrl) && <a className="ui-button ui-button--secondary" style={{ marginTop: 16 }} href={record.imageUrl} target="_blank" rel="noopener noreferrer">{lang === 'en' ? 'View evidence / certificate' : 'Xem minh chứng / chứng chỉ'}</a>}
      </div>
      <div className="panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 20, margin: '0 0 20px' }}>{lang === 'en' ? 'Workers & Attendance' : 'Danh sách công nhân & Điểm danh'}</h2>
        <label className="sr-only" htmlFor="training-worker-search">{lang === 'en' ? 'Search workers' : 'Tìm công nhân'}</label>
        <input id="training-worker-search" className="ui-input" type="search" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder={lang === 'en' ? 'Search by worker code, name or job title...' : 'Tìm theo mã công nhân, họ tên hoặc chức vụ...'} style={{ marginBottom: 16 }} />
        <div className="zone-table-wrap">
          <table className="ui-data-table training-attendees-table">
            <thead><tr><th>{lang === 'en' ? 'Worker code' : 'Mã công nhân'}</th><th>{lang === 'en' ? 'Full name' : 'Họ và tên'}</th><th>{lang === 'en' ? 'Job title' : 'Chức vụ'}</th><th>{lang === 'en' ? 'Attendance' : 'Điểm danh'}</th><th>{lang === 'en' ? 'Notes' : 'Ghi chú'}</th></tr></thead>
            <tbody>{pagination.items.map((worker, index) => {
              const status = worker.attendanceStatus?.toLowerCase();
              const present = status === 'attended' || status === 'completed';
              const label = present ? (lang === 'en' ? 'Present' : 'Có mặt') : status === 'absent' ? (lang === 'en' ? 'Absent' : 'Vắng') : status === 'excused' ? (lang === 'en' ? 'Excused' : 'Có phép') : (lang === 'en' ? 'Not recorded' : 'Chưa ghi nhận');
              return <tr key={`${worker.farmWorkerId ?? 'worker'}:${index}`}><td>{worker.workerCode || '—'}</td><td>{worker.fullName || '—'}</td><td>{t(worker.jobTitle || '—')}</td><td><StatusBadge tone={present ? 'success' : status === 'absent' ? 'danger' : 'neutral'} label={label} /></td><td style={{ whiteSpace: 'pre-wrap' }}>{worker.notes || '—'}</td></tr>;
            })}{attendees.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center' }}>{query ? (lang === 'en' ? 'No matching workers.' : 'Không tìm thấy công nhân phù hợp.') : (lang === 'en' ? 'No attendance records yet.' : 'Chưa có danh sách điểm danh công nhân.')}</td></tr>}</tbody>
          </table>
        </div>
        <TablePagination {...pagination} />
      </div>
    </>}
  </section>;
}
