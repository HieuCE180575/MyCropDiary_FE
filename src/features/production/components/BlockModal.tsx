import { useEffect, useState } from 'react';
import type { Block, BlockFormValues, Zone } from '../types';
import { createBlock, updateBlock } from '../zoneBlockService';
import { FarmGoongMap } from '../../farm-management/components/FarmGoongMap';

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
  const [error, setError] = useState<string | null>(null);

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
          soilType: 'Đất thịt nhẹ pha cát (Sandy Loam)',
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
    `Zone #${selectedZoneId}`;

  const parsedLat = values.latitude ? parseFloat(values.latitude) : null;
  const parsedLng = values.longitude ? parseFloat(values.longitude) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.blockName.trim()) {
      setError('Vui lòng nhập tên Lô sản xuất (Block Name).');
      return;
    }
    const areaNum = parseFloat(values.areaValue);
    if (!values.areaValue || isNaN(areaNum) || areaNum <= 0) {
      setError('Diện tích Block (Area) phải lớn hơn 0.');
      return;
    }

    const targetZone = availableZones.find((z) => z.zoneId === selectedZoneId);
    if (targetZone && targetZone.areaValue && areaNum > targetZone.areaValue) {
      setError(
        `Diện tích lô đất (${areaNum} ${values.areaUnit}) không được lớn hơn diện tích của phân khu ${targetZone.zoneName} (${targetZone.areaValue} ${targetZone.areaUnit}).`
      );
      return;
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
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thông tin Block.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ width: 'min(760px, 100%)', maxHeight: '92vh' }}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">
              {mode === 'create' ? 'Lô sản xuất mới' : `Cập nhật lô sản xuất #${initialBlock?.blockId}`}
            </span>
            <h2>{mode === 'create' ? 'Tạo lô sản xuất mới' : 'Cập nhật lô sản xuất'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          {error ? <p className="form-error-banner" role="alert">{error}</p> : null}

          {/* Parent Zone Field */}
          <div
            className="structured-field-card"
            style={{
              background: isZoneLocked ? '#ecfdf5' : '#f8fafc',
              borderColor: isZoneLocked ? '#a7f3d0' : '#e2e8f0',
              marginBottom: 0,
            }}
          >
            <div className="structured-field-header" style={{ borderBottomColor: isZoneLocked ? '#a7f3d0' : '#cbd5e1' }}>
              <label htmlFor="block-zone-select" className="structured-field-label">
                Khu vực quản lý trực thuộc <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">
                {isZoneLocked ? 'Cố định khu vực' : 'Chọn khu vực'}
              </span>
            </div>
            {isZoneLocked ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ color: '#047857', fontSize: '15px' }}>🗺️ {resolvedZoneName}</strong>
                <small style={{ color: '#065f46', fontWeight: 600 }}>
                  {mode === 'edit'
                    ? 'Không chuyển lô sang khu vực khác khi chỉnh sửa'
                    : 'Tự động điền theo khu vực hiện tại'}
                </small>
              </div>
            ) : (
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="block-zone-select"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(Number(e.target.value))}
                >
                  {availableZones.map((z) => (
                    <option key={z.zoneId} value={z.zoneId}>
                      {z.zoneName} ({z.areaValue} {z.areaUnit})
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
                Tên lô sản xuất <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span className="structured-field-badge">{values.blockName.length}/100 ký tự · Bắt buộc</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="block-name-input"
                type="text"
                maxLength={100}
                placeholder="VD: Lô B01 - Lô sản xuất rau cải"
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
                  Diện tích lô sản xuất <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span className="structured-field-badge">&gt; 0</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <input
                  id="block-area-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="VD: 500"
                  value={values.areaValue}
                  onChange={(e) => setValues({ ...values, areaValue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="structured-field-card" style={{ marginBottom: 0 }}>
              <div className="structured-field-header">
                <label htmlFor="block-unit-select" className="structured-field-label">
                  Đơn vị diện tích
                </label>
                <span className="structured-field-badge">Đơn vị</span>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <select
                  id="block-unit-select"
                  value={values.areaUnit}
                  onChange={(e) => setValues({ ...values, areaUnit: e.target.value })}
                >
                  <option value="m2">m² (Mét vuông)</option>
                  <option value="ha">ha (Hecta)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Soil Type */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <label htmlFor="block-soil-input" className="structured-field-label">
                Loại đất &amp; nền thổ nhưỡng
              </label>
              <span className="structured-field-badge">{values.soilType.length}/120 ký tự</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <input
                id="block-soil-input"
                type="text"
                maxLength={120}
                placeholder="VD: Đất thịt nhẹ pha cát, Đất phù sa cổ, Giá thể xơ dừa..."
                value={values.soilType}
                onChange={(e) => setValues({ ...values, soilType: e.target.value })}
              />
            </div>
          </div>

          {/* Coordinates + Interactive Goong Map like FarmRegistrationPage */}
          <div className="structured-field-card" style={{ marginBottom: 0 }}>
            <div className="structured-field-header">
              <span className="structured-field-label">
                Vị trí tọa độ GPS &amp; Bản đồ lô sản xuất
              </span>
              <span className="structured-field-badge">Tọa độ</span>
            </div>
            <div className="farm-registration-location-fields" style={{ gap: '12px', marginBottom: '12px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <span>Vĩ độ</span>
                <input
                  id="block-lat-input"
                  type="number"
                  step="0.000001"
                  placeholder="VD: 10.762622"
                  value={values.latitude}
                  onChange={(e) => setValues({ ...values, latitude: e.target.value })}
                />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <span>Kinh độ</span>
                <input
                  id="block-lng-input"
                  type="number"
                  step="0.000001"
                  placeholder="VD: 106.660172"
                  value={values.longitude}
                  onChange={(e) => setValues({ ...values, longitude: e.target.value })}
                />
              </div>
            </div>
            <FarmGoongMap
              farmName={values.blockName || 'Lô sản xuất mới'}
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
                Mô tả chi tiết lô sản xuất
              </label>
              <span className="structured-field-badge">{values.description.length}/500 ký tự</span>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <textarea
                id="block-desc-input"
                rows={3}
                maxLength={500}
                placeholder="Ghi chú đặc điểm mặt luống, hệ thống tưới nhỏ giọt, lịch sử canh tác trên lô đất..."
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
              />
            </div>
          </div>

          <div className="confirm-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="ghost-button" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Đang lưu...' : mode === 'create' ? 'Tạo lô đất' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
