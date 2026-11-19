import { WaterAssessmentDetails } from './WaterAssessmentDetails';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import { Modal } from '../../../shared/components/Modal';
import { LoadError } from '../../../shared/components/LoadError';
import { useDetailRequest } from '../../../shared/hooks/useDetailRequest';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { formatDate } from '../../../shared/format/formatters';
import { createWaterAssessmentApi, fetchWaterAssessmentDetailsApi, updateWaterAssessmentApi, type WaterAssessmentBackendResp } from '../zoneBlockService';
import { waterAssessmentForm, waterAssessmentPayload } from '../waterAssessmentForm';

interface Props {
  blockId: number;
  blockName: string;
  zoneName: string;
  records: WaterAssessmentBackendResp[];
  error: string | null;
  loading: boolean;
  onReload: () => void;
  onSaved: (record: WaterAssessmentBackendResp) => void;
}

export function BlockWaterAssessments({ blockId, blockName, zoneName, records, error, loading, onReload, onSaved }: Props) {
  const { lang } = useLanguage();
  const loader = useDetailRequest(blockId);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selected, setSelected] = useState<WaterAssessmentBackendResp | null>(null);
  const [form, setForm] = useState(waterAssessmentForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const vi = lang === 'vi';
  const missing = vi ? 'Chưa cập nhật' : 'Not updated';
  const statuses: Record<string, string> = {
    DAT_CHUAN: vi ? 'Đạt chuẩn' : 'Compliant',
    CHO_KIEM_DINH: vi ? 'Chờ kiểm định' : 'Pending test',
    CAN_XU_LY: vi ? 'Cần xử lý' : 'Treatment required',
    KHONG_DAT: vi ? 'Không đạt' : 'Non-compliant',
  };
  const sourceTypes: Record<string, string> = {
    'Nước ngầm': vi ? 'Nước ngầm' : 'Groundwater',
    'Nước mặt': vi ? 'Nước mặt' : 'Surface water',
    'Nước thủy cục': vi ? 'Nước thủy cục' : 'Tap water',
    'Bể lắng / Nước mưa': vi ? 'Bể lắng / Nước mưa' : 'Rainwater basin',
  };
  const placeholders: Partial<Record<keyof typeof form, string>> = {
    waterSourceName: vi ? 'Ví dụ: Giếng khoan khu B' : 'e.g. Zone B borehole well',
    waterPh: vi ? 'Nhập độ pH từ 0 đến 14' : 'Enter pH from 0 to 14',
    temperatureC: vi ? 'Ví dụ: 26' : 'e.g. 26',
    imageUrl: 'https://...',
    labTestReportUrl: 'https://...',
  };
  const filtered = records.filter(record => {
    const date = record.assessedAt?.slice(0, 10) || '';
    return (!from || date >= from) && (!to || date <= to);
  });
  const close = () => { if (!saving) setMode(null); };
  const open = (record: WaterAssessmentBackendResp, nextMode: 'view' | 'edit') => {
    setSaved(false);
    void loader.load(() => fetchWaterAssessmentDetailsApi(record.assessmentId), detail => {
      setSelected(detail);
      setForm(waterAssessmentForm(detail));
      setSaveError(null);
      setMode(nextMode);
    });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || mode === 'view') return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = waterAssessmentPayload(form, selected);
      const record = mode === 'edit' && selected
        ? await updateWaterAssessmentApi(selected.assessmentId, payload)
        : await createWaterAssessmentApi(blockId, payload);
      onSaved(record);
      setMode(null);
      setSaved(true);
      onReload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : (vi ? 'Không thể lưu đánh giá nước. Vui lòng thử lại.' : 'Unable to save water assessment. Please retry.'));
    } finally {
      setSaving(false);
    }
  };
  const field = (name: keyof typeof form, label: string, type = 'text', required = false, min?: number, max?: number) => (
    <div className="structured-field-card">
      <div className="structured-field-header">
        <label className="structured-field-label" htmlFor={`water-${name}`}>{label}{required && mode !== 'view' && <span style={{ color: 'var(--color-danger)' }}> *</span>}</label>
        <span className="structured-field-badge">{name === 'waterPh' ? '0–14' : name === 'temperatureC' ? '°C' : required ? (vi ? 'Bắt buộc' : 'Required') : (vi ? 'Tùy chọn' : 'Optional')}</span>
      </div>
      {mode === 'view' ? <p id={`water-${name}`} style={{ margin: 0, fontSize: '14px', fontWeight: 400, color: 'var(--color-body)', overflowWrap: 'anywhere' }}>
        {type === 'url' && /^https?:\/\//i.test(form[name])
          ? <a href={form[name]} target="_blank" rel="noopener noreferrer">{form[name]}</a>
          : form[name] || missing}
      </p> : <input className="ui-input" id={`water-${name}`} type={type} value={form[name]} required={required} min={min} max={max} placeholder={placeholders[name]}
        step={type === 'number' ? 'any' : undefined} disabled={saving}
        onChange={event => setForm(previous => ({ ...previous, [name]: event.target.value }))} />}
    </div>
  );
  return <div className="panel" style={{ padding: '24px' }}>
    {loader.feedback}
    <div className="panel-title" style={{ marginBottom: '18px' }}>
      <div><span className="eyebrow">{vi ? 'Hồ sơ đánh giá nguồn nước tưới' : 'Irrigation water assessment records'}</span>
        <h2>{vi ? 'Đánh giá nguồn nước' : 'Water source assessments'}</h2></div>
      <Button variant="primary" onClick={() => { setSelected(null); setForm(waterAssessmentForm()); setSaveError(null); setSaved(false); setMode('create'); }}>
        <Icon name="plus" />{vi ? 'Thêm đánh giá nước' : 'Add Water Assessment'}
      </Button>
    </div>
    {saved && <p role="status" className="status-note">{vi ? 'Đã lưu đánh giá nước lên hệ thống.' : 'Water assessment saved to the server.'}</p>}
    <div className="zone-clean-filter-bar" style={{ padding: '0 0 16px', borderBottom: 'none', alignItems: 'flex-end' }}>
      <label className="form-field" style={{ flex: 1 }}><span>{vi ? 'Từ ngày' : 'From date'}</span><input className="ui-input" type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className="form-field" style={{ flex: 1 }}><span>{vi ? 'Đến ngày' : 'To date'}</span><input className="ui-input" type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
      <button type="button" className="zone-clean-reload-btn" aria-label={vi ? 'Làm mới bộ lọc' : 'Reset filters'} onClick={() => { setFrom(''); setTo(''); onReload(); }}><Icon name="refresh" size={16} /></button>
    </div>
    {loading ? <p role="status">{vi ? 'Đang tải đánh giá nước…' : 'Loading water assessments…'}</p> : error ? <LoadError message={error} onRetry={onReload} /> : <div className="zone-table-wrap ui-table-scroll" tabIndex={0}>
      <table className="ui-data-table">
        <thead><tr>
          <th>{vi ? 'Ngày đánh giá' : 'Assessment date'}</th><th>{vi ? 'Nguồn nước' : 'Water source'}</th>
          <th>pH</th><th>{vi ? 'Nhiệt độ (°C)' : 'Temperature (°C)'}</th><th>{vi ? 'Kết luận' : 'Conclusion'}</th><th>{vi ? 'Thao tác' : 'Actions'}</th>
        </tr></thead>
        <tbody>{filtered.length === 0 ? <tr><td colSpan={6}>{vi ? 'Chưa có đánh giá nước phù hợp.' : 'No matching water assessments.'}</td></tr> : filtered.map(record => <tr key={record.assessmentId}>
          <td>{record.assessedAt ? formatDate(record.assessedAt.slice(0, 10), lang) : missing}</td>
          <td><strong>{record.waterSourceName?.replace(/\s*#\d+\s*$/, '').trim() || missing}</strong></td><td>{record.waterPh ?? '—'}</td><td>{record.temperatureC ?? '—'}</td>
          <td><span className="knowledge-tag">{record.qualityStatus ? statuses[record.qualityStatus] || record.qualityStatus : missing}</span></td>
          <td><div className="table-action-btns">
            <button type="button" className="table-icon-btn primary" aria-label={vi ? 'Xem chi tiết đánh giá nước' : 'View water assessment'} onClick={() => open(record, 'view')}><Icon name="eye" size={16} /></button>
            <button type="button" className="table-icon-btn edit" aria-label={vi ? 'Chỉnh sửa đánh giá nước' : 'Edit water assessment'} onClick={() => open(record, 'edit')}><Icon name="edit" size={16} /></button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <Modal structured open={mode !== null} onClose={close} title={mode === 'view' ? (vi ? 'Chi tiết đánh giá nước' : 'Water assessment details') : mode === 'edit' ? (vi ? 'Cập nhật đánh giá nước' : 'Update water assessment') : (vi ? 'Thêm đánh giá nước' : 'Add water assessment')} style={{ width: 'min(640px, 100%)' }}>
      {mode === 'view' && selected ? <>
        <WaterAssessmentDetails record={selected} blockName={blockName} zoneName={zoneName} />
        <div className="confirm-dialog-actions" style={{ marginTop: '16px' }}><Button className="ui-close-action" onClick={close}>{vi ? 'Đóng' : 'Close'}</Button></div>
      </> : <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {saveError && <p role="alert" className="form-error-banner">{saveError}</p>}
        <div className="structured-field-card ui-form-context" style={{ background: 'var(--color-success-bg)' }}>
          <div className="structured-field-header"><span className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>{vi ? 'Lô trồng áp dụng' : 'Applicable block'}</span><span className="structured-field-badge">{vi ? 'Cố định' : 'Fixed'}</span></div>
          <strong style={{ color: 'var(--color-primary-text)' }}>{blockName} · {zoneName}</strong>
        </div>
        <div className="ui-form-grid" style={{ gap: '16px' }}>
          {field('assessedAt', vi ? 'Ngày đánh giá' : 'Assessment date', 'date', true)}
          <div className="structured-field-card">
            <div className="structured-field-header"><label className="structured-field-label" htmlFor="water-waterSourceType">{vi ? 'Loại nguồn nước' : 'Water source type'}</label><span className="structured-field-badge">{vi ? 'Tùy chọn' : 'Optional'}</span></div>
            {mode === 'view' ? <p style={{ margin: 0 }}>{sourceTypes[form.waterSourceType] || form.waterSourceType || missing}</p>
              : <select id="water-waterSourceType" className="ui-select" value={form.waterSourceType} disabled={saving} onChange={event => setForm({ ...form, waterSourceType: event.target.value })}>
                <option value="">{vi ? 'Chọn loại nguồn nước' : 'Select water source type'}</option>
                {form.waterSourceType && !sourceTypes[form.waterSourceType] && <option value={form.waterSourceType}>{form.waterSourceType}</option>}
                {Object.entries(sourceTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>}
          </div>
        </div>
        {field('waterSourceName', vi ? 'Nguồn nước tưới' : 'Irrigation water source', 'text', true)}
        <div className="ui-form-grid" style={{ gap: '16px' }}>{field('waterPh', vi ? 'Độ pH nước' : 'Water pH', 'number', false, 0, 14)}{field('temperatureC', vi ? 'Nhiệt độ' : 'Temperature', 'number')}</div>
        <div className="structured-field-card"><div className="structured-field-header"><label className="structured-field-label" htmlFor="water-qualityStatus">{vi ? 'Kết luận' : 'Conclusion'}</label></div>
          <select id="water-qualityStatus" className="ui-select" value={form.qualityStatus} disabled={mode === 'view' || saving} onChange={event => setForm({ ...form, qualityStatus: event.target.value })}>
            {!statuses[form.qualityStatus] && <option value={form.qualityStatus}>{form.qualityStatus}</option>}
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="structured-field-card"><div className="structured-field-header"><label className="structured-field-label" htmlFor="water-notes">{vi ? 'Ghi chú' : 'Notes'}</label><span className="structured-field-badge">{vi ? 'Tùy chọn' : 'Optional'}</span></div>
          <textarea id="water-notes" className="ui-textarea" rows={3} placeholder={vi ? 'Ghi kết quả quan sát hoặc lưu ý về nguồn nước...' : 'Describe observations or notes about the water source...'} value={form.notes} disabled={mode === 'view' || saving} onChange={event => setForm({ ...form, notes: event.target.value })} />
        </div>
        {field('imageUrl', vi ? 'Đường dẫn ảnh minh chứng' : 'Evidence Image URL', 'url')}
        {field('labTestReportUrl', vi ? 'Đường dẫn báo cáo kiểm nghiệm' : 'Laboratory Report URL', 'url')}
        {mode === 'view' && <div className="structured-field-card"><div className="structured-field-header"><span className="structured-field-label">{vi ? 'Người ghi nhận' : 'Recorded by'}</span></div>{selected?.conductedByName || missing}</div>}
        <div className="confirm-dialog-actions">
          <Button className={mode === 'view' ? 'ui-close-action' : 'ui-cancel-button'} disabled={saving} onClick={close}>{mode === 'view' ? (vi ? 'Đóng' : 'Close') : (vi ? 'Hủy' : 'Cancel')}</Button>
          {mode !== 'view' && <Button type="submit" variant="primary" loading={saving}>{vi ? 'Lưu đánh giá' : 'Save assessment'}</Button>}
        </div>
      </form>}
    </Modal>
  </div>;
}
