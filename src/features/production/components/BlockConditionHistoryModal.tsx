import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Icon } from '../../../shared/components/Icon';
import { fetchBlockConditions } from '../zoneBlockService';
import type { Block, BlockConditionObservation } from '../types';

interface BlockConditionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: Block | null;
  onOpenRecord: () => void;
}

export function BlockConditionHistoryModal({ isOpen, onClose, block, onOpenRecord }: BlockConditionHistoryModalProps) {
  const [conditions, setConditions] = useState<BlockConditionObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isOpen || !block) return;
    setLoading(true);
    setError(null);
    fetchBlockConditions(block.blockId)
      .then((data) => setConditions(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không thể tải lịch sử tình trạng.'))
      .finally(() => setLoading(false));
  }, [isOpen, block, attempt]);

  if (!block) return null;

  const getBadgeClass = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('tốt') || lower.includes('thu hoạch') || lower.includes('đạt')) return 'good';
    if (lower.includes('hạn') || lower.includes('thiếu') || lower.includes('bạc')) return 'warning';
    if (lower.includes('sâu') || lower.includes('bệnh') || lower.includes('úng')) return 'danger';
    return '';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`Lịch sử theo dõi: ${block.blockName}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
          Tổng số bản ghi theo dõi: <strong>{conditions.length}</strong>
        </p>
        <button
          type="button"
          className="btn btn-primary-emerald btn-sm-action"
          onClick={() => {
            onClose();
            onOpenRecord();
          }}
        >
          <Icon name="plus" /> Ghi nhận mới
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
          <Icon name="loader" className="animate-spin" size={24} />
          <p style={{ marginTop: '8px' }}>Đang tải lịch sử tình trạng...</p>
        </div>
      ) : error ? (
        <div className="alert alert--error" role="alert">
          <p>{error}</p>
          <button type="button" className="action-button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>
        </div>
      ) : conditions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: '12px' }}>
          <span style={{ fontSize: '32px' }}>📋</span>
          <h4 style={{ margin: '8px 0 4px 0', color: '#1e293b' }}>Chưa có ghi nhận tình trạng nào</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
            Hãy ghi nhận các quan sát về sức khỏe cây trồng, sâu bệnh hoặc chất lượng đất.
          </p>
          <button
            type="button"
            className="btn btn-primary-emerald btn-sm-action"
            onClick={() => {
              onClose();
              onOpenRecord();
            }}
          >
            <Icon name="plus" /> Ghi nhận tình trạng đầu tiên
          </button>
        </div>
      ) : (
        <div className="observation-timeline">
          {conditions.map((item) => (
            <div key={item.observationId} className="observation-item">
              <div className="obs-header">
                <span className={`obs-type-badge ${getBadgeClass(item.conditionType)}`}>
                  {item.conditionType}
                </span>
                <span className="obs-time">{formatDate(item.observedAt)}</span>
              </div>
              <p className="obs-desc">{item.description}</p>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt="Ảnh thực tế"
                  className="obs-image-preview"
                  onClick={() => window.open(item.imageUrl || '', '_blank')}
                  title="Nhấp để xem ảnh đầy đủ"
                />
              )}
              <div className="obs-meta">
                <span>
                  <Icon name="user" size={13} style={{ marginRight: '4px' }} />
                  Người ghi nhận: <strong>{item.recorderFullName || 'Kỹ thuật viên'}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
      </div>
    </Modal>
  );
}
