import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Icon } from '../../../shared/components/Icon';
import { createBlock, updateBlock } from '../zoneBlockService';
import type { Block, BlockFormValues } from '../types';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneId: number;
  zoneName: string;
  blockToEdit?: Block | null;
  onSuccess: (block: Block) => void;
}

export function BlockModal({ isOpen, onClose, zoneId, zoneName, blockToEdit, onSuccess }: BlockModalProps) {
  const isEdit = Boolean(blockToEdit);
  const [blockName, setBlockName] = useState('');
  const [areaValue, setAreaValue] = useState('');
  const [areaUnit, setAreaUnit] = useState('m2');
  const [soilType, setSoilType] = useState('Đất phù sa');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (blockToEdit) {
      setBlockName(blockToEdit.blockName);
      setAreaValue(String(blockToEdit.areaValue));
      setAreaUnit(blockToEdit.areaUnit || 'm2');
      setSoilType(blockToEdit.soilType || 'Đất phù sa');
      setDescription(blockToEdit.description || '');
      setImageUrl(blockToEdit.imageUrl || '');
      setLatitude(blockToEdit.latitude ? String(blockToEdit.latitude) : '');
      setLongitude(blockToEdit.longitude ? String(blockToEdit.longitude) : '');
    } else {
      setBlockName('');
      setAreaValue('');
      setAreaUnit('m2');
      setSoilType('Đất phù sa');
      setDescription('');
      setImageUrl('');
      setLatitude('');
      setLongitude('');
    }
    setError(null);
  }, [blockToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockName.trim()) {
      setError('Vui lòng nhập tên lô đất.');
      return;
    }
    if (!areaValue || isNaN(parseFloat(areaValue)) || parseFloat(areaValue) <= 0) {
      setError('Diện tích lô đất phải là số dương hợp lệ.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const values: BlockFormValues = {
      blockName,
      areaValue,
      areaUnit,
      soilType,
      description,
      imageUrl,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
    };

    try {
      let result: Block;
      if (isEdit && blockToEdit) {
        result = await updateBlock(blockToEdit.blockId, values);
      } else {
        result = await createBlock(zoneId, values);
      }
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu lô đất thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEdit ? `Cập nhật lô đất: ${blockToEdit?.blockName}` : `Thêm Lô đất mới vào ${zoneName}`}
    >
      <form onSubmit={handleSubmit} className="form-layout">
        {error && <div className="alert alert--error">{error}</div>}

        <div className="form-group">
          <label className="form-label" htmlFor="blockNameInput">
            Tên lô / thửa đất <span className="required-star">*</span>:
          </label>
          <input
            id="blockNameInput"
            type="text"
            className="form-input"
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            placeholder="Ví dụ: Lô A1, Thửa 02, Giàn 1..."
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="blockAreaInput">
              Diện tích canh tác <span className="required-star">*</span>:
            </label>
            <input
              id="blockAreaInput"
              type="number"
              step="any"
              className="form-input"
              value={areaValue}
              onChange={(e) => setAreaValue(e.target.value)}
              placeholder="Ví dụ: 1500"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="blockUnitSelect">Đơn vị:</label>
            <select
              id="blockUnitSelect"
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
          <label className="form-label" htmlFor="soilTypeSelect">Loại đất / Giá thể trồng:</label>
          <select
            id="soilTypeSelect"
            className="form-select"
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
          >
            <option value="Đất phù sa">Đất phù sa</option>
            <option value="Đất thịt nhẹ">Đất thịt nhẹ</option>
            <option value="Đất cát pha">Đất cát pha</option>
            <option value="Đất đỏ bazan">Đất đỏ bazan</option>
            <option value="Giá thể xơ dừa">Giá thể xơ dừa</option>
            <option value="Thủy canh tuần hoàn">Thủy canh tuần hoàn</option>
            <option value="Khác">Loại đất khác</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="blockDescInput">Mô tả đặc điểm lô đất:</label>
          <textarea
            id="blockDescInput"
            className="form-textarea"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Đặc điểm địa hình, lịch sử canh tác, giống cây dự kiến..."
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="blockImageInput">Link hình ảnh lô đất:</label>
          <input
            id="blockImageInput"
            type="url"
            className="form-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="latInput">Vĩ độ (Latitude):</label>
            <input
              id="latInput"
              type="number"
              step="any"
              className="form-input"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Ví dụ: 10.762622"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="longInput">Kinh độ (Longitude):</label>
            <input
              id="longInput"
              type="number"
              step="any"
              className="form-input"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Ví dụ: 106.660172"
            />
          </div>
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
                <Icon name="save" /> {isEdit ? 'Cập nhật lô đất' : 'Tạo lô đất'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
