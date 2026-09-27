import { Modal } from '../../../shared/components/Modal';
import { KNOWLEDGE_CATEGORY_LABEL } from '../constants';
import type { KnowledgeArticle } from '../types';

interface KnowledgeDetailModalProps {
  article: KnowledgeArticle | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function KnowledgeDetailModal({ article, onClose }: KnowledgeDetailModalProps) {
  return (
    <Modal open={article !== null} onClose={onClose} title={article?.title}>
      {article ? (
        <>
          <div className="knowledge-card-meta">
            <span className="module-code">{KNOWLEDGE_CATEGORY_LABEL[article.category]}</span>
            <span>📅 {formatDate(article.publishedAt)}</span>
            <span>⏱ {article.readTimeMinutes} phút đọc</span>
            <span>👁 {article.viewCount.toLocaleString('vi-VN')}</span>
          </div>
          <p>{article.content}</p>
          <div className="knowledge-tag-row">
            {article.tags.map((tag) => (
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
