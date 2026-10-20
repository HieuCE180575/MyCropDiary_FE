import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Icon } from '../../../shared/components/Icon';
import { recordBlockCondition } from '../zoneBlockService';
import type { Block, BlockConditionObservation } from '../types';

interface RecordConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: Block | null;
  onSuccess: (observation: BlockConditionObservation) => void;
}

const PRESET_CONDITIONS = [
  { label: '🌱 Cây sinh trưởng tốt', value: 'Cây sinh trưởng tốt' },
  { label: '💧 Độ ẩm thấp / Khô hạn', value: 'Độ ẩm thấp / Khô hạn' },
  { label: '🐛 Sâu bệnh hại phát sinh', value: 'Sâu bệnh hại phát sinh' },
  { label: '🌊 Ngập úng cục bộ', value: 'Ngập úng cục bộ' },
  { label: '🍃 Thiếu dinh dưỡng / Vàng lá', value: 'Thiếu dinh dưỡng / Vàng lá' },
  { label: '🧪 Đất bạc màu / Cần cải tạo', value: 'Đất bạc màu / Cần cải tạo' },
  { label: '🌾 Đã sẵn sàng thu hoạch', value: 'Đã sẵn sàng thu hoạch' },
];

export function RecordConditionModal({ isOpen, onClose, block, onSuccess }: RecordConditionModalProps) {
  const [conditionType, setConditionType] = useState(PRESET_CONDITIONS[0].value);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!block) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Vui lòng nhập chi tiết mô tả hiện trạng lô đất.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const observation = await recordBlockCondition(block.blockId, {
        conditionType,
        description,
        imageUrl,
      });
      onSuccess(observation);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ghi nhận tình trạng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`Ghi nhận tình trạng: ${block.blockName}`}>
      <form onSubmit={handleSubmit} className="form-layout">
        {error && <div className="alert alert--error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Tình trạng nhanh (Nhấp để chọn):</label>
          <div className="condition-tag-list">
            {PRESET_CONDITIONS.map((c) => (
              <button
                type="button"
                key={c.value}
                className={`condition-quick-tag ${conditionType === c.value ? 'selected' : ''}`}
                onClick={() => setConditionType(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="conditionTypeSelect">Loại hiện trạng:</label>
          <input
            id="conditionTypeSelect"
            type="text"
            className="form-input"
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="conditionDesc">
            Mô tả chi tiết hiện trạng <span className="required-star">*</span>:
          </label>
          <textarea
            id="conditionDesc"
            className="form-textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả sự phát triển của cây trồng, màu sắc lá, độ ẩm đất, sâu bệnh hoặc các yếu tố ngoại cảnh tác động..."
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="conditionImage">Đường dẫn hình ảnh thực tế (URL):</label>
          <input
            id="conditionImage"
            type="url"
            className="form-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/images/crop_photo.jpg"
          />
          {imageUrl && (
            <div style={{ marginTop: '8px' }}>
              <img
                src={imageUrl}
                alt="Preview"
                style={{ maxHeight: '120px', borderRadius: '8px', objectFit: 'cover' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy bỏ
          </button>
          <button type="submit" className="btn btn-primary-emerald" disabled={submitting}>
            {submitting ? (
              <>
                <Icon name="loader" className="animate-spin" /> Đang lưu...
              </>
            ) : (
              <>
                <Icon name="check-circle" /> Ghi nhận tình trạng
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
