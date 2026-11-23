import { Link } from 'react-router-dom';
import { formatDate as uiFormatDate, formatNumber as uiFormatNumber } from '../../../shared/format/formatters';
import { getKnowledgeCategoryLabel } from '../constants';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import type { KnowledgeArticle } from '../types';

interface KnowledgeFeaturedArticleProps {
  article: KnowledgeArticle;
  onOpen: (article: KnowledgeArticle) => void;
}

function formatDate(iso: string, lang: 'en' | 'vi'): string {
  return uiFormatDate(iso, lang, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function KnowledgeFeaturedArticle({ article, onOpen }: KnowledgeFeaturedArticleProps) {
  const { lang } = useLanguage();

  return (
    <section className="knowledge-featured-card" aria-label={lang === 'en' ? 'Featured Guide' : 'Bài viết tiêu biểu'}>
      <div className="featured-card-grid">
        {article.image ? (
          <Link to={`/knowledge/${article.id}`} className="featured-card-media" aria-label={article.title}>
            <img src={article.image} alt={article.title} className="featured-cover-img" loading="lazy" />
          </Link>
        ) : null}

        <div className="featured-card-content">
          <div className="featured-card-eyebrow">
            <span className="featured-badge-text">
              {lang === 'en' ? 'FEATURED VIETGAP GUIDE' : 'TIÊU ĐIỂM CANH TÁC VIETGAP'}
            </span>
            <span className="module-code">
              {article.category
                ? getKnowledgeCategoryLabel(article.category, lang)
                : (lang === 'en' ? 'Agricultural Knowledge' : 'Kiến thức nông nghiệp')}
            </span>
          </div>

          <h2 className="featured-card-title">
            <Link to={`/knowledge/${article.id}`} className="featured-title-link">
              {article.title}
            </Link>
          </h2>

          <p className="featured-card-summary">{article.summary}</p>

          <div className="knowledge-card-meta featured-meta">
            <span>{formatDate(article.publishedAt, lang)}</span>
            <span className="meta-dot">·</span>
            <span>{article.readTimeMinutes} {lang === 'en' ? 'min read' : 'phút đọc'}</span>
            <span className="meta-dot">·</span>
            <span>{uiFormatNumber(article.viewCount, lang)} {lang === 'en' ? 'views' : 'lượt xem'}</span>
          </div>

          <div className="featured-card-actions">
            <Link
              to={`/knowledge/${article.id}`}
              className="primary-button"
              style={{ padding: '9px 20px', fontSize: '13.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {lang === 'en' ? 'Read full guide ›' : 'Đọc bài viết đầy đủ ›'}
            </Link>
            <button
              type="button"
              className="secondary-button"
              style={{ padding: '9px 16px', fontSize: '13.5px' }}
              onClick={() => onOpen(article)}
            >
              {lang === 'en' ? 'Quick view' : 'Xem nhanh'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
