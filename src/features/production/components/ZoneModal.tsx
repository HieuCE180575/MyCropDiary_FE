import { useEffect, useState } from 'react';
import type { Zone, ZoneFormValues } from '../types';
import { createZone, updateZone } from '../zoneBlockService';

interface ZoneModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  farmId: number;
  farmName?: string;
  initialZone?: Zone | null;
  onClose: () => void;
  onSuccess: (savedZone: Zone) => void;
}

export function ZoneModal({
  isOpen,
  mode,
  farmId,
  farmName,
  initialZone,
  onClose,
  onSuccess,
}: ZoneModalProps) {
  const [values, setValues] = useState<ZoneFormValues>({
    zoneName: '',
    areaValue: '',
    areaUnit: 'm2',
    description: '',
    imageUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialZone) {
        setValues({
          zoneName: initialZone.zoneName || '',
          areaValue: String(initialZone.areaValue || ''),
          areaUnit: initialZone.areaUnit || 'm2',
          description: initialZone.description || '',
          imageUrl: initialZone.imageUrl || '',
        });
      } else {
        setValues({
          zoneName: '',
          areaValue: '',
          areaUnit: 'm2',
          description: '',
          imageUrl: '',
        });
      }
      setError(null);
    }
  }, [isOpen, mode, initialZone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.zoneName.trim()) {
      setError('Vui lòng nhập tên khu vực quản lý (Zone Name).');
      return;
    }
    if (values.zoneName.trim().length > 100) {
      setError('Zone Name không được vượt quá 100 ký tự.');
      return;
    }
    const areaNum = parseFloat(values.areaValue);
    if (!values.areaValue || isNaN(areaNum) || areaNum <= 0) {
      setError('Diện tích Zone phải là số dương hợp lệ (> 0).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let saved: Zone;
      if (mode === 'create') {
        saved = await createZone(farmId, values);
      } else {
        if (!initialZone) throw new Error('Không tìm thấy thông tin Zone cần cập nhật.');
        saved = await updateZone(initialZone.zoneId, values);
      }
      onSuccess(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thông tin Zone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ width: 'min(680px, 100%)', maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">
              {mode === 'create' ? 'Khu vực sản xuất mới' : `Cập nhật khu vực #${initialZone?.zoneId}`}
            </span>
            <h2>{mode === 'create' ? 'Tạo khu vực sản xuất mới' : 'Cập nhật khu vực sản xuất'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {error ? <p className="form-error-banner" role="alert">{error}</p> : null}

          <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
            <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
              <span className="structured-field-label" style={{ color: '#065f46' }}>
                Trang trại trực thuộc
              </span>
              <span className="structured-field-badge">Cố định</span>
            </div>
            <div style={{ fontWeight: 700, color: '#047857', fontSize: '15px' }}>
              🌱 {farmName || `Farm #${farmId}`}
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="zone-name-input" className="structured-field-label">
                Tên khu vực quản lý <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{values.zoneName.length}/100 ký tự · Bắt buộc</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="zone-name-input"
                type="text"
                maxLength={100}
                placeholder="VD: Khu A - Khu trồng rau ăn lá nhà màng"
                value={values.zoneName}
                onChange={(e) => setValues({ ...values, zoneName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="zone-area-input" className="structured-field-label">
                  Diện tích quy hoạch <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">&gt; 0</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="zone-area-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="VD: 2500"
                  value={values.areaValue}
                  onChange={(e) => setValues({ ...values, areaValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="zone-unit-select" className="structured-field-label">
                  Đơn vị diện tích
                </label>
                <span className="structured-field-badge">Đơn vị</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="zone-unit-select"
                  value={values.areaUnit}
                  onChange={(e) => setValues({ ...values, areaUnit: e.target.value })}
                >
                  <option value="m2">m² (Mét vuông)</option>
                  <option value="ha">ha (Hecta)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="zone-desc-input" className="structured-field-label">
                Mô tả đặc điểm khu vực &amp; hạ tầng
              </label>
              <span className="structured-field-badge">{values.description.length}/500 ký tự</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea
                id="zone-desc-input"
                rows={3}
                maxLength={500}
                placeholder="Mô tả vị trí tiếp giáp, điều kiện nhà màng/nhà lưới, nguồn nước và nhóm cây trồng..."
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="zone-image-input" className="structured-field-label">
                Đường dẫn ảnh sơ đồ / thực địa
              </label>
              <span className="structured-field-badge">Tùy chọn</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="zone-image-input"
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
              {loading ? 'Đang lưu...' : mode === 'create' ? 'Tạo khu vực' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
