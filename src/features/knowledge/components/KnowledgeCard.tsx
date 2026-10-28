import { KNOWLEDGE_CATEGORY_LABEL } from '../constants';
import type { KnowledgeArticle } from '../types';

interface KnowledgeCardProps {
  article: KnowledgeArticle;
  onOpen: (article: KnowledgeArticle) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function KnowledgeCard({ article, onOpen }: KnowledgeCardProps) {
  return (
    <article className="knowledge-card">
      {article.image && (
        <img src={article.image} alt={article.title} className="knowledge-card-image" loading="lazy" />
      )}
      <span className="module-code" style={{justifySelf: 'start'}}>{article.category ? KNOWLEDGE_CATEGORY_LABEL[article.category] : 'Kiến thức nông nghiệp'}</span>
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      <div className="knowledge-card-meta">
        <span>📅 {formatDate(article.publishedAt)}</span>
        <span>⏱ {article.readTimeMinutes} phút đọc</span>
        <span>👁 {article.viewCount.toLocaleString('vi-VN')}</span>
      </div>
      <button type="button" className="knowledge-card-link" onClick={() => onOpen(article)}>
        Đọc thêm ›
      </button>
    </article>
  );
}
