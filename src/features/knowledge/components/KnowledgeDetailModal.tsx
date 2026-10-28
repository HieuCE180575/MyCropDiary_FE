import { useCallback } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { useApiData } from '../../../shared/hooks/useApiData';
import { KNOWLEDGE_CATEGORY_LABEL } from '../constants';
import { fetchKnowledgeArticleById } from '../knowledgeService';
import type { KnowledgeArticle } from '../types';

interface KnowledgeDetailModalProps {
  article: KnowledgeArticle | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function KnowledgeDetailModal({ article, onClose }: KnowledgeDetailModalProps) {
  const id = article?.id;
  const load = useCallback((signal: AbortSignal) => id === undefined ? Promise.resolve(null) : fetchKnowledgeArticleById(id, signal), [id]);
  const { data, loading, error, retry } = useApiData(load);
  const detail = !loading && !error ? data : null;
  return (
    <Modal open={article !== null} onClose={onClose} title={detail?.title ?? article?.title}>
      {loading ? <p role="status">Đang tải bài viết...</p> : error ? (
        <div role="alert"><p>{error}</p><button type="button" className="action-button" onClick={retry}>Thử lại</button></div>
      ) : detail ? (
        <>
          <div className="knowledge-card-meta">
            <span className="module-code">{detail.category ? KNOWLEDGE_CATEGORY_LABEL[detail.category] : 'Kiến thức nông nghiệp'}</span>
            <span>📅 {formatDate(detail.publishedAt)}</span>
            <span>⏱ {detail.readTimeMinutes} phút đọc</span>
            <span>👁 {detail.viewCount.toLocaleString('vi-VN')}</span>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{detail.content}</p>
          <div className="knowledge-tag-row">
            {detail.tags.map((tag) => (
              <span key={tag} className="knowledge-tag">
                #{tag}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
