import { useState, useEffect } from 'react';
import type { Block, BlockConditionObservation, RecordConditionFormValues } from '../types';
import { recordBlockCondition } from '../zoneBlockService';
import { useLanguage } from '../../../shared/i18n/LanguageContext';

interface RecordConditionModalProps {
  isOpen: boolean;
  block: Block | null;
  onClose: () => void;
  onSuccess: (observation: BlockConditionObservation) => void;
}

const CONDITION_TYPES = [
  'Bình thường / Ổn định',
  'Sâu bệnh hại xuất hiện',
  'Khô hạn / Thiếu nước tưới',
  'Ngập úng / Dư nước sau mưa',
  'Cỏ dại phát triển mạnh',
  'Đất suy thoái / Chua hóa',
  'Hạ tầng tưới tiêu hư hỏng',
  'Khác',
];

export function RecordConditionModal({
  isOpen,
  block,
  onClose,
  onSuccess,
}: RecordConditionModalProps) {
  const { lang } = useLanguage();
  const [values, setValues] = useState<RecordConditionFormValues>({
    conditionType: CONDITION_TYPES[0],
    description: '',
    imageUrl: '',
    observedAt: new Date().toISOString().slice(0, 16),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValues({
        conditionType: CONDITION_TYPES[0],
        description: '',
        imageUrl: '',
        observedAt: new Date().toISOString().slice(0, 16),
      });
      setError(null);
    }
  }, [isOpen, block]);

  if (!isOpen || !block) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.conditionType.trim()) {
      setError('Vui lòng chọn phân loại điều kiện.');
      return;
    }
    if (!values.description.trim()) {
      setError('Vui lòng nhập nội dung ghi nhận điều kiện chi tiết.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedObservedAt = values.observedAt
        ? new Date(values.observedAt).toISOString()
        : new Date().toISOString();

      const obs = await recordBlockCondition(block.blockId, {
        ...values,
        observedAt: formattedObservedAt,
      });
      onSuccess(obs);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ điều kiện lô đất.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{lang === 'en' ? 'Production Records' : 'Hồ sơ sản xuất'}</span>
            <h2>{lang === 'en' ? 'Record Condition: ' : 'Ghi nhận điều kiện: '}{block.blockName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {error ? <p className="form-error-banner" role="alert">{error}</p> : null}

          <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
            <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
              <span className="structured-field-label" style={{ color: '#065f46' }}>
                {lang === 'en' ? 'Target Block' : 'Lô sản xuất mục tiêu'}
              </span>
              <span className="structured-field-badge">{lang === 'en' ? 'Auto-selected' : 'Tự động chọn'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: '#047857' }}>
              <span>
                🌿 {block.blockName} {block.zoneName ? `· ${block.zoneName}` : ''}
              </span>
              <span>
                {block.areaValue} {block.areaUnit}
              </span>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="cond-date-input" className="structured-field-label">
                {lang === 'en' ? 'Observation Date & Time' : 'Thời gian ghi nhận'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">Bắt buộc</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="cond-date-input"
                type="datetime-local"
                value={values.observedAt}
                onChange={(e) => setValues({ ...values, observedAt: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="cond-type-select" className="structured-field-label">
                {lang === 'en' ? 'Condition Type' : 'Phân loại tình trạng điều kiện'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{lang === 'en' ? 'VietGAP Standard' : 'Tiêu chuẩn VietGAP'}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select
                id="cond-type-select"
                value={values.conditionType}
                onChange={(e) => setValues({ ...values, conditionType: e.target.value })}
              >
                {CONDITION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="cond-desc-input" className="structured-field-label">
                {lang === 'en' ? 'Condition Details & Notes' : 'Thông tin điều kiện và ghi chú'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{values.description.length}/1000 ký tự</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea
                id="cond-desc-input"
                rows={4}
                maxLength={1000}
                placeholder={lang === 'en' ? 'Describe in detail bed conditions, soil moisture, pest signs, or actual environmental factors...' : 'Mô tả chi tiết tình trạng mặt luống, độ ẩm đất, dấu hiệu sâu bệnh hoặc điều kiện môi trường thực tế tại lô đất...'}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="cond-img-input" className="structured-field-label">
                {lang === 'en' ? 'Evidence Image URL' : 'Đường dẫn hình ảnh minh chứng'}
              </label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="cond-img-input"
                type="url"
                placeholder="https://..."
                value={values.imageUrl}
                onChange={(e) => setValues({ ...values, imageUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Record' : 'Lưu ghi nhận')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
