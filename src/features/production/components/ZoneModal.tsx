import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import type { Zone, ZoneFormValues } from '../types';
import { createZone, updateZone } from '../zoneBlockService';
import { AlertCircle } from 'lucide-react';

interface ZoneModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  farmId: number;
  farmName?: string;
  initialZone?: Zone | null;
  existingZones?: Zone[];
  totalBlockAreaM2: number;
  totalBlockAreaHa: number;
  onClose: () => void;
  onSuccess: (savedZone: Zone) => void;
}

export function ZoneModal({
  isOpen,
  mode,
  farmId,
  farmName,
  initialZone,
  existingZones = [],
  totalBlockAreaM2,
  totalBlockAreaHa,
  onClose,
  onSuccess,
}: ZoneModalProps) {
  const { lang, t: translate } = useLanguage();
  const [values, setValues] = useState<ZoneFormValues>({
    zoneName: '',
    areaValue: '',
    areaUnit: 'm2',
    description: '',
    imageUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    zoneName?: string;
    areaValue?: string;
  }>({});

  const zoneNameRef = useRef<HTMLInputElement>(null);
  const areaValueRef = useRef<HTMLInputElement>(null);

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
      setError({});
    }
  }, [isOpen, mode, initialZone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = values.zoneName.trim();
    if (!trimmedName) {
      setError(prev => ({ ...prev, zoneName: lang === 'en' ? "Enter a management zone name." : 'Vui lòng nhập tên khu vực quản lý (Zone Name).' }));
      zoneNameRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      zoneNameRef.current?.focus();
      return;
    }

    if (trimmedName.length > 100) {
      setError(prev => ({ ...prev, zoneName: lang === 'en' ? "Zone name must not exceed 100 characters." : 'Tên phân khu (Zone) không được vượt quá 100 ký tự.' }));
      zoneNameRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      zoneNameRef.current?.focus();
      return;
    }

    if (existingZones && existingZones.length > 0) {
      const isDuplicate = existingZones.some(
        (z) =>
          z.zoneName.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (mode === 'create' || z.zoneId !== initialZone?.zoneId)
      );
      if (isDuplicate) {
        setError(prev => ({ ...prev, zoneName: lang === 'en' ? `Zone name "${trimmedName}" already exists in this farm. Choose another name.` : `Tên phân khu (Zone) "${trimmedName}" đã tồn tại trong trang trại này. Vui lòng chọn tên khác.` }));
        zoneNameRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        zoneNameRef.current?.focus();
        return;
      }
    }

    const areaNum = parseFloat(values.areaValue);
    if (!values.areaValue || isNaN(areaNum) || areaNum <= 0) {
      setError(prev => ({ ...prev, areaValue: lang === 'en' ? "Zone area must be a valid positive number (> 0)." : 'Diện tích phân khu phải là số dương hợp lệ (> 0).' }));
      areaValueRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      areaValueRef.current?.focus();
      return;
    }

    if (mode === 'edit') {
      const currentBlocksTotal =
        values.areaUnit === 'ha'
          ? totalBlockAreaHa
          : totalBlockAreaM2;

      if (areaNum < currentBlocksTotal) {
        setError(prev => ({
          ...prev,
          areaValue: lang === 'en'
            ? `Zone area (${areaNum} ${values.areaUnit}) must not be smaller than the total area of existing blocks (${currentBlocksTotal} ${values.areaUnit}).`
            : `Diện tích phân khu (${areaNum} ${values.areaUnit}) không được nhỏ hơn tổng diện tích các lô đất hiện có (${currentBlocksTotal} ${values.areaUnit}).`
        }));

        areaValueRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        areaValueRef.current?.focus();
        return;
      }
    }

    setLoading(true);
    setError({});

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
      setError(prev => ({ ...prev, areaValue: lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to save Zone information." : err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thông tin Zone.' }));
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
              {mode === 'create' ? (lang === 'en' ? 'New Production Zone' : 'Khu vực sản xuất mới') : (lang === 'en' ? `Update Zone #${initialZone?.zoneId}` : `Cập nhật khu vực #${initialZone?.zoneId}`)}
            </span>
            <h2>{mode === 'create' ? (lang === 'en' ? 'Create New Production Zone' : 'Tạo khu vực sản xuất mới') : (lang === 'en' ? 'Update Production Zone' : 'Cập nhật khu vực sản xuất')}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {Object.keys(error).length > 0 && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} />
              <span>
                {mode === 'create'
                  ? (lang === 'en'
                    ? 'Please correct the errors before adding.'
                    : 'Vui lòng sửa các lỗi trước khi thêm.')
                  : (lang === 'en'
                    ? 'Please correct the errors before saving changes.'
                    : 'Vui lòng sửa các lỗi trước khi lưu thay đổi.')}
              </span>
            </div>
          )}

          <div className="structured-field-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 0 }}>
            <div className="structured-field-header" style={{ borderBottomColor: '#a7f3d0' }}>
              <span className="structured-field-label" style={{ color: '#065f46' }}>
                {lang === 'en' ? 'Affiliated Farm' : 'Trang trại trực thuộc'}
              </span>
              <span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span>
            </div>
            <div style={{ fontWeight: 700, color: '#047857', fontSize: '15px' }}>
              🌱 {farmName || `Farm #${farmId}`}
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="zone-name-input" className="structured-field-label">
                {lang === 'en' ? 'Zone Name' : 'Tên phân khu (Zone)'} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{values.zoneName.length}/100 {lang === 'en' ? 'chars · Required' : 'ký tự · Bắt buộc'}</span>
            </div>
            <div
              className="form-field"
              style={{
                marginBottom: 0,
              }}>
              <input
                ref={zoneNameRef}
                id="zone-name-input"
                type="text"
                maxLength={100}
                placeholder={lang === 'en' ? 'e.g. Zone A - Greenhouse Leafy Vegetables' : 'VD: Khu A - Khu trồng rau ăn lá nhà màng'}
                value={values.zoneName}
                onChange={(e) => {
                  const value = e.target.value;
                  setValues(p => ({ ...p, zoneName: value }));

                  setError(prev => {
                    const updated = { ...prev };
                    if (!value.trim()) {
                      updated.zoneName = lang === 'en'
                        ? 'Please enter a zone name.'
                        : 'Vui lòng nhập tên phân khu.';
                    } else {
                      delete updated.zoneName;
                    }
                    return updated;
                  });
                }}
                required
              />
              {error.zoneName && (
                <p style={{
                  color: '#dc2626',
                  fontSize: '12px',
                  margin: '5px 0 0'
                }}>
                  {error.zoneName}
                </p>
              )}
            </div>
          </div>

          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="zone-area-input" className="structured-field-label">
                  {lang === 'en' ? 'Planned Zone Area' : 'Diện tích phân khu'} <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">&gt; 0</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  ref={areaValueRef}
                  id="zone-area-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={(lang === 'en' ? "e.g. 2500" : "VD: 2500")}
                  value={values.areaValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    const newAreaNum = parseFloat(newValue);

                    setValues(p => ({ ...p, areaValue: newValue }));

                    setError(prev => {
                      const updated = { ...prev };

                      if (!newValue || isNaN(newAreaNum) || newAreaNum <= 0) {
                        updated.areaValue = lang === 'en'
                          ? 'Zone area must be a valid positive number (> 0).'
                          : 'Diện tích phân khu phải là số dương hợp lệ (> 0).';
                      } else {
                        delete updated.areaValue;
                      }

                      return updated;
                    });
                  }}
                  required
                />
                {error && (
                  <p style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    margin: '5px 0 0'
                  }}>
                    {error.areaValue}
                  </p>
                )}
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="zone-unit-select" className="structured-field-label">{lang === 'en' ? 'Area Unit' : 'Đơn vị diện tích'}</label>
                <span className="structured-field-badge">{lang === 'en' ? 'Unit' : 'Đơn vị'}</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="zone-unit-select"
                  value={values.areaUnit}
                  onChange={(e) => setValues({ ...values, areaUnit: e.target.value })}
                >
                  <option value="m2">m²</option>
                  <option value="ha">ha</option>
                </select>
              </div>
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="zone-desc-input" className="structured-field-label">
                {lang === 'en' ? 'Zone Features & Infrastructure' : 'Mô tả đặc điểm phân khu & hạ tầng'}
              </label>
              <span className="structured-field-badge">{values.description.length}{(lang === 'en' ? "/500 characters" : "/500 ký tự")}</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea
                id="zone-desc-input"
                rows={3}
                maxLength={500}
                placeholder={lang === 'en' ? 'Describe boundaries, greenhouse/net house conditions, water sources, and crop types...' : 'Mô tả vị trí tiếp giáp, điều kiện nhà màng/nhà lưới, nguồn nước và nhóm cây trồng...'}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
              />
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="zone-image-input" className="structured-field-label">
                {lang === 'en' ? 'Map / Field Image URL' : 'Đường dẫn ảnh sơ đồ / thực địa'}
              </label>
              <span className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</span>
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
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : mode === 'create' ? (lang === 'en' ? 'Create Zone' : 'Tạo Zone') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
