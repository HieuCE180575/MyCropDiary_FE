import { useCallback } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { useApiData } from '../../../shared/hooks/useApiData';
import { fetchBlockById } from '../zoneBlockService';

export function BlockDetailModal({ blockId, onClose }: { blockId: number; onClose: () => void }) {
  const load = useCallback((signal: AbortSignal) => fetchBlockById(blockId, signal), [blockId]);
  const { data: block, loading, error, retry } = useApiData(load);
  const fields = block ? [
    ['Mã lô đất', block.blockId],
    ['Tên lô đất', block.blockName],
    ['Phân khu', block.zoneName ?? `#${block.zoneId}`],
    ['Diện tích', `${block.areaValue.toLocaleString('vi-VN')} ${block.areaUnit}`],
    ['Loại đất', block.soilType],
    ['Trạng thái', block.status],
    ['Vĩ độ', block.latitude],
    ['Kinh độ', block.longitude],
    ['Ngày tạo', block.createdAt ? new Date(block.createdAt).toLocaleString('vi-VN') : null],
    ['Mô tả', block.description],
  ] : [];

  return (
    <Modal open onClose={onClose} title="Chi tiết lô đất">
      {loading ? <p role="status">Đang tải chi tiết lô đất...</p> : error ? (
        <>
          <p role="alert">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={retry}>Thử lại</button>
        </>
      ) : block && (
        <div className="block-detail-modal">
          {block.imageUrl && <img src={block.imageUrl} alt={block.blockName} />}
          <dl className="block-details-list">
            {fields.map(([label, value]) => (
              <div className="block-detail-row" key={label}>
                <dt className="block-detail-label">{label}</dt>
                <dd className="block-detail-value">{value ?? 'Chưa cập nhật'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  );
}
