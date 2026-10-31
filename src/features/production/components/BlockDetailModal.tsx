import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../../shared/components/Modal';
import { useApiData } from '../../../shared/hooks/useApiData';
import { fetchBlockById } from '../zoneBlockService';
import { useLanguage } from '../../../shared/i18n/LanguageContext';

export function BlockDetailModal({ blockId, onClose }: { blockId: number; onClose: () => void }) {
  const { lang } = useLanguage();
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
    <Modal open onClose={onClose} title={lang === 'en' ? 'Block Details' : 'Chi tiết lô đất (Block Summary)'}>
      {loading ? <p role="status">{lang === 'en' ? 'Loading block details...' : 'Đang tải chi tiết lô đất...'}</p> : error ? (
        <>
          <p role="alert">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={retry}>{lang === 'en' ? 'Retry' : 'Thử lại'}</button>
        </>
      ) : block && (
        <div className="block-detail-modal">
          {block.imageUrl && <img src={block.imageUrl} alt={block.blockName} />}
          <dl className="block-details-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', margin: '12px 0' }}>
            {fields.map(([label, value]) => (
              <div
                className="block-detail-row"
                key={String(label)}
                style={{
                  background: '#f8faf9',
                  border: '1px solid #d4e2d9',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <dt className="block-detail-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#527062', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {label}
                </dt>
                <dd className="block-detail-value" style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: '0.93rem' }}>
                  {value ?? (lang === 'en' ? 'Not updated' : 'Chưa cập nhật')}
                </dd>
              </div>
            ))}
          </dl>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <Link
              to={`/zones/${block.zoneId}/blocks/${block.blockId}`}
              className="btn-primary"
              onClick={onClose}
              style={{ textDecoration: 'none' }}
            >
              Open Full Block Details →
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
