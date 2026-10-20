import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Icon } from '../../../shared/components/Icon';
import { createZone, updateZone } from '../zoneBlockService';
import type { Zone, ZoneFormValues } from '../types';

interface ZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: number;
  zoneToEdit?: Zone | null;
  onSuccess: (zone: Zone) => void;
}

export function ZoneModal({ isOpen, onClose, farmId, zoneToEdit, onSuccess }: ZoneModalProps) {
  const isEdit = Boolean(zoneToEdit);
  const [zoneName, setZoneName] = useState('');
  const [areaValue, setAreaValue] = useState('');
  const [areaUnit, setAreaUnit] = useState('m2');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (zoneToEdit) {
      setZoneName(zoneToEdit.zoneName);
      setAreaValue(String(zoneToEdit.areaValue));
      setAreaUnit(zoneToEdit.areaUnit || 'm2');
      setDescription(zoneToEdit.description || '');
      setImageUrl(zoneToEdit.imageUrl || '');
    } else {
      setZoneName('');
      setAreaValue('');
      setAreaUnit('m2');
      setDescription('');
      setImageUrl('');
    }
    setError(null);
  }, [zoneToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      setError('Vui lòng nhập tên phân khu (Zone).');
      return;
    }
    if (!areaValue || isNaN(parseFloat(areaValue)) || parseFloat(areaValue) <= 0) {
      setError('Diện tích phân khu phải là số dương hợp lệ.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const values: ZoneFormValues = {
      zoneName,
      areaValue,
      areaUnit,
      description,
      imageUrl,
    };

    try {
      let result: Zone;
      if (isEdit && zoneToEdit) {
        result = await updateZone(zoneToEdit.zoneId, values);
      } else {
        result = await createZone(farmId, values);
      }
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu phân khu thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEdit ? `Cập nhật phân khu: ${zoneToEdit?.zoneName}` : 'Tạo Phân khu sản xuất mới (Zone)'}
    >
      <form onSubmit={handleSubmit} className="form-layout">
        {error && <div className="alert alert--error">{error}</div>}

        <div className="form-group">
          <label className="form-label" htmlFor="zoneNameInput">
            Tên phân khu (Zone) <span className="required-star">*</span>:
          </label>
          <input
            id="zoneNameInput"
            type="text"
            className="form-input"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            placeholder="Ví dụ: Phân khu A - Dưa lưới, Khu B - Rau ăn lá..."
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="zoneAreaInput">
              Quy mô diện tích <span className="required-star">*</span>:
            </label>
            <input
              id="zoneAreaInput"
              type="number"
              step="any"
              className="form-input"
              value={areaValue}
              onChange={(e) => setAreaValue(e.target.value)}
              placeholder="Ví dụ: 10000"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="zoneUnitSelect">Đơn vị:</label>
            <select
              id="zoneUnitSelect"
              className="form-select"
              value={areaUnit}
              onChange={(e) => setAreaUnit(e.target.value)}
            >
              <option value="m2">m²</option>
              <option value="ha">hecta (ha)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="zoneDescInput">Mô tả phân khu & cơ sở hạ tầng:</label>
          <textarea
            id="zoneDescInput"
            className="form-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả công nghệ nhà màng, hệ thống tưới tiêu, tiêu chuẩn VietGAP áp dụng..."
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="zoneImageInput">Link hình ảnh thực tế phân khu:</label>
          <input
            id="zoneImageInput"
            type="url"
            className="form-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary-emerald" disabled={submitting}>
            {submitting ? (
              <>
                <Icon name="loader" className="animate-spin" /> Đang lưu...
              </>
            ) : (
              <>
                <Icon name="save" /> {isEdit ? 'Cập nhật phân khu' : 'Tạo phân khu'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
