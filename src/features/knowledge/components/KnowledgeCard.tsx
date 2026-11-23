import { Link } from 'react-router-dom';
import { formatDate as uiFormatDate, formatNumber as uiFormatNumber } from '../../../shared/format/formatters';
import { getKnowledgeCategoryLabel } from '../constants';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import type { KnowledgeArticle } from '../types';

interface KnowledgeCardProps {
  article: KnowledgeArticle;
  onOpen: (article: KnowledgeArticle) => void;
}

function formatDate(iso: string, lang: 'en' | 'vi'): string {
  return uiFormatDate(iso, lang, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function KnowledgeCard({ article, onOpen }: KnowledgeCardProps) {
  const { lang } = useLanguage();
  return (
    <article className="knowledge-card">
      {article.image ? (
        <Link to={`/knowledge/${article.id}`} className="knowledge-card-image-wrap" aria-label={article.title}>
          <img src={article.image} alt={article.title} className="knowledge-card-image" loading="lazy" />
        </Link>
      ) : null}
      <div className="knowledge-card-body">
        <span className="module-code">
          {article.category
            ? getKnowledgeCategoryLabel(article.category, lang)
            : (lang === 'en' ? 'Agricultural Knowledge' : 'Kiến thức nông nghiệp')}
        </span>
        <h3>
          <Link to={`/knowledge/${article.id}`} className="knowledge-card-title-link">
            {article.title}
          </Link>
        </h3>
        <p>{article.summary}</p>
        <div className="knowledge-card-meta">
          <span>{formatDate(article.publishedAt, lang)}</span>
          <span className="meta-dot">·</span>
          <span>{article.readTimeMinutes} {lang === 'en' ? 'min read' : 'phút đọc'}</span>
          <span className="meta-dot">·</span>
          <span>{uiFormatNumber(article.viewCount, lang)} {lang === 'en' ? 'views' : 'lượt xem'}</span>
        </div>
        <div className="knowledge-card-actions">
          <Link to={`/knowledge/${article.id}`} className="knowledge-read-full-btn">
            {lang === 'en' ? 'View full guide ›' : 'Xem toàn bài viết ›'}
          </Link>
          <button type="button" className="knowledge-card-link" onClick={() => onOpen(article)}>
            {lang === 'en' ? 'Read more ›' : 'Đọc thêm ›'}
          </button>
        </div>
      </div>
    </article>
  );
}
