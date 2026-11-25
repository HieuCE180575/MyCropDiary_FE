import { message, type TranslationMessage } from "../../../shared/i18n/translate";
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import { Modal } from '../../../shared/components/Modal';
import { FarmGoongMap } from '../../farm-management/components/FarmGoongMap';

import { useEffect, useState, useRef } from 'react';
import type { Block, BlockFormValues, Zone } from '../types';
import { createBlock, updateBlock } from '../zoneBlockService';
import { AlertCircle } from 'lucide-react';

import { useLanguage } from '../../../shared/i18n/LanguageContext';

interface BlockModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  zoneId: number;
  zoneName?: string;
  availableZones?: Zone[];
  lockZone?: boolean;
  initialBlock?: Block | null;
  onClose: () => void;
  onSuccess: (savedBlock: Block) => void;
}

export function BlockModal({
  isOpen,
  mode,
  zoneId,
  zoneName,
  availableZones = [],
  lockZone = false,
  initialBlock,
  onClose,
  onSuccess,
}: BlockModalProps) {
  const { lang, t: translate } = useLanguage();
  const [selectedZoneId, setSelectedZoneId] = useState<number>(zoneId);
  const [values, setValues] = useState<BlockFormValues>({
    blockName: '',
    areaValue: '',
    areaUnit: 'm2',
    soilType: '',
    description: '',
    imageUrl: '',
    latitude: '',
    longitude: '',
    status: 'AVAILABLE',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TranslationMessage | null>(null);
  const blockNameRef = useRef<HTMLInputElement>(null);
  const areaValueRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedZoneId(initialBlock?.zoneId || zoneId || availableZones[0]?.zoneId || 1);
      if (mode === 'edit' && initialBlock) {
        setValues({
          blockName: initialBlock.blockName || '',
          areaValue: String(initialBlock.areaValue || ''),
          areaUnit: initialBlock.areaUnit || 'm2',
          soilType: initialBlock.soilType || '',
          description: initialBlock.description || '',
          imageUrl: initialBlock.imageUrl || '',
          latitude: initialBlock.latitude != null ? String(initialBlock.latitude) : '',
          longitude: initialBlock.longitude != null ? String(initialBlock.longitude) : '',
          status: initialBlock.status || 'AVAILABLE',
        });
      } else {
        setValues({
          blockName: '',
          areaValue: '',
          areaUnit: 'm2',
          soilType: 'Loam nhẹ pha cát (Sandy Loam)',
          description: '',
          imageUrl: '',
          latitude: '',
          longitude: '',
          status: 'AVAILABLE',
        });
      }
      setError(null);
    }
  }, [isOpen, mode, initialBlock, zoneId, availableZones]);

  if (!isOpen) return null;

  const isZoneLocked = mode === 'edit' || lockZone || availableZones.length <= 1;
  const resolvedZoneName =
    availableZones.find((z) => z.zoneId === selectedZoneId)?.zoneName ||
    initialBlock?.zoneName ||
    zoneName ||
    `Zone`;

  const parsedLat = values.latitude ? parseFloat(values.latitude) : null;
  const parsedLng = values.longitude ? parseFloat(values.longitude) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBlockName = values.blockName.trim();
    if (!trimmedBlockName) {
      setError((lang === 'en' ? "Enter a production block name." : 'Vui lòng nhập tên lô trồng.'));
      blockNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      blockNameRef.current?.focus();
      return;
    }
    const areaNum = parseFloat(values.areaValue);
    if (!values.areaValue || isNaN(areaNum) || areaNum <= 0) {
      setError((lang === 'en' ? "Block area must be greater than 0." : 'Diện tích lô trồng phải lớn hơn 0.'));
      areaValueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      areaValueRef.current?.focus();
      return;
    }

    const targetZone = availableZones.find((z) => z.zoneId === selectedZoneId);
    if (targetZone?.blocks && targetZone.blocks.length > 0) {
      const isDuplicate = targetZone.blocks.some(
        (b) =>
          b.blockName.trim().toLowerCase() === trimmedBlockName.toLowerCase() &&
          (mode === 'create' || b.blockId !== initialBlock?.blockId)
      );
      if (isDuplicate) {
        setError((message("Block name \"{value1}\" already exists in zone \"{value2}\". Choose another name.", { value1: trimmedBlockName, value2: targetZone.zoneName })));
        blockNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        blockNameRef.current?.focus();
        return;
      }
    }
    if (targetZone && targetZone.areaValue) {
      const toM2 = (val: number | null | undefined, unit?: string | null) =>
        !val || !Number.isFinite(val) ? 0 : unit?.toLowerCase() === 'ha' ? val * 10000 : val;
      const zoneAreaM2 = toM2(targetZone.areaValue, targetZone.areaUnit);
      const newBlockAreaM2 = toM2(areaNum, values.areaUnit);
      if (newBlockAreaM2 > zoneAreaM2) {
        setError(
          (lang === 'en'
            ? `Block area (${Math.round(newBlockAreaM2).toLocaleString()} m²) must not exceed the zone area ${targetZone.zoneName} (${Math.round(zoneAreaM2).toLocaleString()} m²).`
            : `Diện tích lô (${Math.round(newBlockAreaM2).toLocaleString()} m²) không được lớn hơn diện tích phân khu ${targetZone.zoneName} (${Math.round(zoneAreaM2).toLocaleString()} m²).`)
        );
        areaValueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        areaValueRef.current?.focus();
        return;
      }
      const existingBlocksM2 = (targetZone.blocks || [])
        .filter((b) => mode === 'create' || b.blockId !== initialBlock?.blockId)
        .reduce((sum, b) => sum + toM2(b.areaValue, b.areaUnit), 0);
      const totalBlocksM2 = existingBlocksM2 + newBlockAreaM2;
      if (totalBlocksM2 > zoneAreaM2) {
        setError(
          (lang === 'en'
            ? `Total area of all blocks (${Math.round(totalBlocksM2).toLocaleString()} m²) exceeds the area of zone ${targetZone.zoneName} (${Math.round(zoneAreaM2).toLocaleString()} m²).`
            : `Tổng diện tích các lô đất (${Math.round(totalBlocksM2).toLocaleString()} m²) vượt quá diện tích phân khu ${targetZone.zoneName} (${Math.round(zoneAreaM2).toLocaleString()} m²).`)
        );
        areaValueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        areaValueRef.current?.focus();
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let saved: Block;
      if (mode === 'create') {
        saved = await createBlock(selectedZoneId, values);
      } else {
        if (!initialBlock) throw new Error('Không tìm thấy dữ liệu Block để cập nhật.');
        saved = await updateBlock(initialBlock.blockId, values);
      }
      onSuccess(saved);
      onClose();
    } catch (err) {
      setError((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to save Block information." : err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thông tin lô trồng.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal structured open customLayout onClose={onClose} style={{ width: 'min(760px, 100%)', maxHeight: '92vh' }}>
        <div className="modal-header">
          <div>
            <h2>{mode === 'create' ? (lang === 'en' ? 'Create New Production Block' : 'Tạo lô trồng mới') : (lang === 'en' ? 'Update Production Block' : 'Cập nhật lô trồng')}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={translate("Close")}><Icon name="close" /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="form-error-banner" role="alert" style={{
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

          {/* Parent Zone Field */}
          <div
            className={`structured-field-card${isZoneLocked ? ' ui-form-context' : ''}`}
            style={{
              background: isZoneLocked ? 'var(--color-success-bg)' : 'var(--color-page)',
              borderColor: isZoneLocked ? 'var(--color-border)' : 'var(--color-border)',
              marginBottom: 0,
            }}
          >
            <div className="structured-field-header" style={{ borderBottomColor: isZoneLocked ? 'var(--color-border)' : 'var(--color-input-border)' }}>
              <label htmlFor="block-zone-select" className="structured-field-label">
                {lang === 'en' ? 'Parent Zone' : 'Khu vực quản lý trực thuộc'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span className="structured-field-badge">
                {isZoneLocked ? (lang === 'en' ? 'Fixed Zone' : 'Cố định khu vực') : (lang === 'en' ? 'Select Zone' : 'Chọn khu vực')}
              </span>
            </div>
            {isZoneLocked ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ color: 'var(--color-primary-text)', fontSize: '15px' }}>{resolvedZoneName}</strong>
                <small style={{ color: 'var(--color-primary-text)', fontWeight: 600 }}>
                  {mode === 'edit' ? (lang === 'en' ? 'Block zone cannot be changed during edit' : 'Không chuyển lô sang khu vực khác khi chỉnh sửa') : (lang === 'en' ? 'Auto-filled based on current zone' : 'Tự động điền theo khu vực hiện tại')}
                </small>
              </div>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="block-zone-select"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                >
                  {availableZones.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>
                      {z.zoneName} ({z.areaValue} {translate(z.areaUnit)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Block Name */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="block-name-input" className="structured-field-label">
                {lang === 'en' ? 'Block Name' : 'Tên lô trồng'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <label htmlFor="block-name-input" className="structured-field-badge">{values.blockName.length}/100 {lang === 'en' ? 'chars · Required' : 'ký tự · Bắt buộc'}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                ref={blockNameRef}
                id="block-name-input"
                type="text"
                maxLength={100}
                placeholder={lang === 'en' ? 'e.g. Block B01 - Cabbage cultivation block' : 'VD: Lô B01 - Lô trồng rau cải'}
                value={values.blockName}
                onChange={(e) => setValues({ ...values, blockName: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Area & Unit */}
          <div className="farm-registration-location-fields" style={{ gap: '16px' }}>
            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="block-area-input" className="structured-field-label">
                  {lang === 'en' ? 'Block Area' : 'Diện tích lô trồng'} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <label htmlFor="block-area-input" className="structured-field-badge">&gt; 0</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input className="ui-input"
                  ref={areaValueRef}
                  id="block-area-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={(lang === 'en' ? "e.g. 500" : "VD: 500")}
                  value={values.areaValue}
                  onChange={(e) => setValues({ ...values, areaValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="block-unit-select" className="structured-field-label">{lang === 'en' ? 'Area Unit' : 'Đơn vị diện tích'}</label>
                <label htmlFor="block-unit-select" className="structured-field-badge">{lang === 'en' ? 'Unit' : 'Đơn vị'}</label>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select className="ui-select"
                  id="block-unit-select"
                  value={values.areaUnit}
                  onChange={(e) => setValues({ ...values, areaUnit: e.target.value })}
                >
                  <option value="m2">m²</option>
                  <option value="ha">ha</option>
                </select>
              </div>
            </div>
          </div>

          {/* Soil Type */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="block-soil-input" className="structured-field-label">
                {lang === 'en' ? 'Soil Type & Substrate' : 'Loại đất & nền thổ nhưỡng'}
              </label>
              <label htmlFor="block-soil-input" className="structured-field-badge">{values.soilType.length}{(lang === 'en' ? "/120 characters" : "/120 ký tự")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input className="ui-input"
                id="block-soil-input"
                type="text"
                maxLength={120}
                placeholder={lang === 'en' ? 'e.g. Sandy loam, Ancient alluvial, Coco peat substrate...' : 'VD: Loam nhẹ pha cát, Alluvial cổ, Giá thể xơ dừa...'}
                value={values.soilType}
                onChange={(e) => setValues({ ...values, soilType: e.target.value })}
              />
            </div>
          </div>

          {/* Coordinates + Interactive Goong Map like FarmRegistrationPage */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <span className="structured-field-label">
                {lang === 'en' ? 'GPS Coordinates & Interactive Block Map' : 'Vị trí tọa độ GPS & Bản đồ lô trồng'}
              </span>
              <span className="structured-field-badge">{lang === 'en' ? 'Coordinates' : 'Tọa độ'}</span>
            </div>
            <div className="farm-registration-location-fields" style={{ gap: '12px', marginBottom: '12px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label htmlFor="block-lat-input">{translate("Latitude")}</label>
                <input className="ui-input"
                  id="block-lat-input"
                  type="number"
                  step="0.000001"
                  placeholder={(lang === 'en' ? "e.g. 10.762622" : "VD: 10.762622")}
                  value={values.latitude}
                  onChange={(e) => setValues({ ...values, latitude: e.target.value })}
                />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label htmlFor="block-lng-input">{translate("Longitude")}</label>
                <input className="ui-input"
                  id="block-lng-input"
                  type="number"
                  step="0.000001"
                  placeholder={(lang === 'en' ? "e.g. 106.660172" : "VD: 106.660172")}
                  value={values.longitude}
                  onChange={(e) => setValues({ ...values, longitude: e.target.value })}
                />
              </div>
            </div>
            <FarmGoongMap
              farmName={values.blockName || 'Lô trồng mới'}
              address={resolvedZoneName}
              latitude={parsedLat && !isNaN(parsedLat) ? parsedLat : null}
              longitude={parsedLng && !isNaN(parsedLng) ? parsedLng : null}
              editable={true}
              height={240}
              onLocationChange={(lat, lng) => {
                setValues((prev) => ({
                  ...prev,
                  latitude: String(lat),
                  longitude: String(lng),
                }));
              }}
            />
          </div>

          {/* Description */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="block-desc-input" className="structured-field-label">
                {lang === 'en' ? 'Block Description' : 'Mô tả lô trồng'}
              </label>
              <label htmlFor="block-desc-input" className="structured-field-badge">{values.description.length}{(lang === 'en' ? "/500 characters" : "/500 ký tự")}</label>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea className="ui-textarea"
                id="block-desc-input"
                rows={3}
                maxLength={500}
                placeholder={lang === 'en' ? 'Notes on bed characteristics, drip irrigation system, farming history...' : 'Ghi chú đặc điểm mặt luống, hệ thống tưới nhỏ giọt, lịch sử canh tác trên Block...'}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <Button className="ui-cancel-button" type="button" variant="secondary" onClick={onClose} disabled={loading}>{translate("Cancel")}</Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : mode === 'create' ? (lang === 'en' ? 'Create Block' : 'Tạo lô trồng') : (lang === 'en' ? 'Save Changes' : 'Lưu thay đổi')}
            </Button>
          </div>
        </form>
      </Modal>
  );
}
