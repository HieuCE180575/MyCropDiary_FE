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
          <div className="featured-card-media" onClick={() => onOpen(article)}>
            <img src={article.image} alt={article.title} className="featured-cover-img" loading="lazy" />
          </div>
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
            <button type="button" className="featured-title-btn" onClick={() => onOpen(article)}>
              {article.title}
            </button>
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
            <button
              type="button"
              className="primary-button"
              style={{ padding: '8px 18px', fontSize: '13.5px' }}
              onClick={() => onOpen(article)}
            >
              {lang === 'en' ? 'Read full guide ›' : 'Đọc bài viết đầy đủ ›'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
