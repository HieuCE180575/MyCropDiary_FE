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
      {article.image && (
        <img src={article.image} alt={article.title} className="knowledge-card-image" loading="lazy" />
      )}
      <span className="module-code" style={{justifySelf: 'start'}}>
        {article.category ? getKnowledgeCategoryLabel(article.category, lang) : (lang === 'en' ? 'Agricultural Knowledge' : 'Kiến thức nông nghiệp')}
      </span>
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      <div className="knowledge-card-meta">
        <span>📅 {formatDate(article.publishedAt, lang)}</span>
        <span>⏱ {article.readTimeMinutes} {lang === 'en' ? 'min read' : 'phút đọc'}</span>
        <span>👁 {uiFormatNumber(article.viewCount, lang)}</span>
      </div>
      <button type="button" className="knowledge-card-link" onClick={() => onOpen(article)}>
        {lang === 'en' ? 'Read more ›' : 'Đọc thêm ›'}
      </button>
    </article>
  );
}
