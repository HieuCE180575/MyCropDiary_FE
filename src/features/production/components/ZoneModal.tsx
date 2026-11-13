import { message, type TranslationMessage } from "../../../shared/i18n/translate";
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import { Modal } from '../../../shared/components/Modal';

import { useEffect, useState, useRef } from 'react';
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
  const [error, setError] = useState<TranslationMessage | null>(null);
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
      setError(null);
    }
  }, [isOpen, mode, initialZone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = values.zoneName.trim();
    if (!trimmedName) {
      setError((lang === 'en' ? "Enter a management zone name." : 'Vui lòng nhập tên khu vực quản lý.'));
      zoneNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      zoneNameRef.current?.focus();
      return;
    }
    if (trimmedName.length > 100) {
      setError((lang === 'en' ? "Zone name must not exceed 100 characters." : 'Tên khu vực không được vượt quá 100 ký tự.'));
      zoneNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        setError((message("Zone name \"{value1}\" already exists in this farm. Choose another name.", { value1: trimmedName })));
        zoneNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        zoneNameRef.current?.focus();
        return;
      }
    }
    const areaNum = parseFloat(values.areaValue);
    if (!values.areaValue || isNaN(areaNum) || areaNum <= 0) {
      setError((lang === 'en' ? "Zone area must be a valid positive number (> 0)." : 'Diện tích khu vực phải là số dương hợp lệ (> 0).'));
      areaValueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      areaValueRef.current?.focus();
      return;
    }

    if (mode === 'edit' && initialZone?.blocks && initialZone.blocks.length > 0) {
      const currentBlocksTotal = initialZone.blocks.reduce((sum, b) => sum + (b.areaValue || 0), 0);
      if (areaNum < currentBlocksTotal) {
        setError(
          (lang === 'en' ? `Zone area (${areaNum} ${values.areaUnit}) must not be smaller than the total area of existing blocks (${currentBlocksTotal} ${values.areaUnit}).` : `Area phân khu (${areaNum} ${values.areaUnit}) không được nhỏ hơn tổng diện tích các lô đất hiện có (${currentBlocksTotal} ${values.areaUnit}).`)
        );
        areaValueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        areaValueRef.current?.focus();
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let saved: Zone;
      if (mode === 'create') {
        saved = await createZone(farmId, values);
      } else {
        if (!initialZone) throw new Error('Không tìm thấy thông tin khu vực cần cập nhật.');
        saved = await updateZone(initialZone.zoneId, values);
      }
      onSuccess(saved);
      onClose();
    } catch (err) {
      setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to save Zone information." : err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thông tin khu vực.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open customLayout onClose={onClose} style={{ width: 'min(680px, 100%)', maxHeight: '90vh' }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">
              {mode === 'create' ? (lang === 'en' ? 'New Production Zone' : 'Khu vực sản xuất mới') : (lang === 'en' ? `Update Zone #${initialZone?.zoneId}` : `Cập nhật khu vực #${initialZone?.zoneId}`)}
            </span>
            <h2>{mode === 'create' ? (lang === 'en' ? 'Create New Production Zone' : 'Tạo khu vực sản xuất mới') : (lang === 'en' ? 'Update Production Zone' : 'Cập nhật khu vực sản xuất')}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={translate("Close")}><Icon name="close" /></button>
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
                {lang === 'en' ? 'Affiliated Farm' : 'Trang trại trực thuộc'}
              </span>
              <span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span>
            </div>
            <div style={{ fontWeight: 700, color: 'var(--color-primary-text)', fontSize: '15px' }}>
              🌱 {farmName || `Farm #${farmId}`}
            </div>
          </div>

          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="zone-name-input" className="structured-field-label">
                {lang === 'en' ? 'Zone Name' : 'Tên khu vực'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <label htmlFor="zone-name-input" className="structured-field-badge">{values.zoneName.length}/100 {lang === 'en' ? 'chars · Required' : 'ký tự · Bắt buộc'}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                ref={zoneNameRef}
                id="zone-name-input"
                type="text"
                maxLength={100}
                placeholder={lang === 'en' ? 'e.g. Zone A - Greenhouse Leafy Vegetables' : 'VD: Khu A - Khu trồng rau ăn lá nhà màng'}
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
                  {lang === 'en' ? 'Planned Zone Area' : 'Diện tích phân khu'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <label htmlFor="zone-area-input" className="structured-field-badge">&gt; 0</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
                  ref={areaValueRef}
                  id="zone-area-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={(lang === 'en' ? "e.g. 2500" : "VD: 2500")}
                  value={values.areaValue}
                  onChange={(e) => setValues({ ...values, areaValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="zone-unit-select" className="structured-field-label">{lang === 'en' ? 'Area Unit' : 'Đơn vị diện tích'}</label>
                <label htmlFor="zone-unit-select" className="structured-field-badge">{lang === 'en' ? 'Unit' : 'Đơn vị'}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
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
              <label htmlFor="zone-desc-input" className="structured-field-badge">{values.description.length}{(lang === 'en' ? "/500 characters" : "/500 ký tự")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea className="ui-textarea"
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
              <label htmlFor="zone-image-input" className="structured-field-badge">{lang === 'en' ? 'Optional' : 'Tùy chọn'}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                id="zone-image-input"
                type="url"
                placeholder="https://..."
                value={values.imageUrl}
                onChange={(e) => setValues({ ...values, imageUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>{translate("Cancel")}</Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : mode === 'create' ? (lang === 'en' ? 'Create Zone' : 'Tạo khu vực') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
            </Button>
          </div>
        </form>
      </Modal>
  );
}