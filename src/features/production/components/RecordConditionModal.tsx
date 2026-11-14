import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import { Modal } from '../../../shared/components/Modal';

import { useState, useEffect, useRef } from 'react';
import type { Block, BlockConditionObservation, RecordConditionFormValues } from '../types';
import { recordBlockCondition } from '../zoneBlockService';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { AlertCircle } from 'lucide-react';

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
  const { lang, t: translate } = useLanguage();
  const [values, setValues] = useState<RecordConditionFormValues>({
    conditionType: CONDITION_TYPES[0],
    description: '',
    imageUrl: '',
    observedAt: new Date().toISOString().slice(0, 16),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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
      setError((lang === 'en' ? "Select a condition type." : 'Vui lòng chọn phân loại điều kiện.'));
      return;
    }
    if (!values.description.trim()) {
      setError((lang === 'en' ? "Enter detailed condition notes." : 'Vui lòng nhập nội dung ghi nhận điều kiện chi tiết.'));
      descriptionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      descriptionRef.current?.focus();
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
      setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to save block condition record." : err instanceof Error ? err.message : 'Không thể lưu hồ sơ điều kiện lô đất.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open customLayout onClose={onClose} style={{ width: 'min(640px, 100%)', maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{lang === 'en' ? 'Production Records' : 'Hồ sơ sản xuất'}</span>
            <h2>{lang === 'en' ? 'Record Condition: ' : 'Ghi nhận điều kiện: '}{block.blockName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={(lang === 'en' ? "Close" : "Đóng")}><Icon name="close" /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <AlertCircle size={18} />
              <span>{typeof error === 'string' ? error : translate(error)}</span>
            </div>
          )}

          <div className="structured-field-card" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-border)', marginBottom: 0 }}>
            <div className="structured-field-header" style={{ borderBottomColor: 'var(--color-border)' }}>
              <span className="structured-field-label" style={{ color: 'var(--color-primary-text)' }}>
                {lang === 'en' ? 'Target Block' : 'Lô sản xuất mục tiêu'}
              </span>
              <span className="structured-field-badge">{lang === 'en' ? 'Auto-selected' : 'Tự động chọn'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--color-primary-text)' }}>
              <span>
                🌿 {block.blockName} {block.zoneName ? `· ${block.zoneName}` : ''}
              </span>
              <span>
                {block.areaValue} {translate(block.areaUnit)}
              </span>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="cond-date-input" className="structured-field-label">
                {lang === 'en' ? 'Observation Date & Time' : 'Thời gian ghi nhận'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <label htmlFor="cond-date-input" className="structured-field-badge">{(lang === 'en' ? "Required" : "Bắt buộc")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
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
                {lang === 'en' ? 'Condition Type' : 'Phân loại tình trạng điều kiện'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <label htmlFor="cond-type-select" className="structured-field-badge">{lang === 'en' ? 'VietGAP Standard' : 'Tiêu chuẩn VietGAP'}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <select className="ui-select"
                id="cond-type-select"
                value={values.conditionType}
                onChange={(e) => setValues({ ...values, conditionType: e.target.value })}
              >
                {CONDITION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {translate(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="cond-desc-input" className="structured-field-label">
                {lang === 'en' ? 'Condition Details & Notes' : 'Thông tin điều kiện và ghi chú'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <label htmlFor="cond-desc-input" className="structured-field-badge">{values.description.length}{(lang === 'en' ? "/1000 characters" : "/1000 ký tự")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea className="ui-textarea"
                ref={descriptionRef}
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
              <label htmlFor="cond-img-input" className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                id="cond-img-input"
                type="url"
                placeholder="https://..."
                value={values.imageUrl}
                onChange={(e) => setValues({ ...values, imageUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              {(lang === 'en' ? "Cancel" : "Hủy")}
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Record' : 'Lưu ghi nhận')}
            </Button>
          </div>
        </form>
      </Modal>
  );
}
