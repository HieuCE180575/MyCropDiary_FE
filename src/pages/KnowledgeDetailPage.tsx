import { useCallback, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchKnowledgeArticle } from '../features/knowledge/knowledgeService';
import { getKnowledgeCategoryLabel } from '../features/knowledge/constants';
import { useApiData } from '../shared/hooks/useApiData';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { formatDate as uiFormatDate, formatNumber as uiFormatNumber } from '../shared/format/formatters';
import { Button } from '../shared/components/Button';
import { EmptyState } from '../shared/components/EmptyState';
import { Icon } from '../shared/components/Icon';
import type { KnowledgeArticle } from '../features/knowledge/types';

function formatDate(iso: string, lang: 'en' | 'vi'): string {
  return uiFormatDate(iso, lang, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const load = useCallback(
    (signal: AbortSignal) => {
      if (!id) return Promise.resolve(null);
      return fetchKnowledgeArticle(id, signal);
    },
    [id]
  );

  const { data: article, loading, error, retry } = useApiData<KnowledgeArticle | null>(load);

  // Cập nhật tiêu đề trang
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} | MyCropDiary VietGAP`;
    } else {
      document.title = lang === 'en' ? 'Knowledge Article | MyCropDiary' : 'Cẩm nang Kỹ thuật | MyCropDiary';
    }
  }, [article?.title, lang]);

  return (
    <div className="public-knowledge-view knowledge-detail-page-view">
      <div className="public-container">
        {/* Navigation bar & Breadcrumbs */}
        <nav className="knowledge-detail-nav" aria-label="Breadcrumb">
          <div className="knowledge-breadcrumb-row">
            <Link to="/" className="breadcrumb-link">
              {lang === 'en' ? 'Home' : 'Trang chủ'}
            </Link>
            <span className="breadcrumb-separator">/</span>
            <Link to="/knowledge" className="breadcrumb-link">
              {lang === 'en' ? 'Knowledge Hub' : 'Cẩm nang kiến thức'}
            </Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">
              {article ? article.title : (lang === 'en' ? 'Article Details' : 'Chi tiết bài viết')}
            </span>
          </div>

          <button
            type="button"
            className="btn-back-to-hub"
            onClick={() => navigate('/knowledge')}
          >
            <Icon name="arrow" className="icon-flip-back" />
            <span>{lang === 'en' ? 'Back to Knowledge Repository' : 'Quay lại Cẩm nang kỹ thuật'}</span>
          </button>
        </nav>

        {/* Content container */}
        <div className="knowledge-detail-container">
          {loading ? (
            <div className="knowledge-detail-loading" role="status">
              <div className="loading-spinner" />
              <p>{lang === 'en' ? 'Loading article details from repository...' : 'Đang tải dữ liệu bài viết từ hệ thống...'}</p>
            </div>
          ) : error ? (
            <EmptyState
              role="alert"
              className="panel"
              title={<>{lang === 'en' ? 'Article Not Available' : 'Không thể tải bài viết'}</>}
              description={<>{t(error)}</>}
              action={
                <div className="flex-gap-sm">
                  <Button type="button" variant="primary" onClick={retry}>
                    {lang === 'en' ? 'Retry' : 'Thử lại'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => navigate('/knowledge')}>
                    {lang === 'en' ? 'Browse Other Articles' : 'Xem các bài viết khác'}
                  </Button>
                </div>
              }
            />
          ) : article ? (
            <article className="knowledge-article-full">
              {/* Header bài viết */}
              <header className="article-full-header">
                <div className="article-category-badge-wrap">
                  <span className="module-code">
                    {article.category
                      ? getKnowledgeCategoryLabel(article.category, lang)
                      : (lang === 'en' ? 'VietGAP Technical Standard' : 'Quy chuẩn kỹ thuật VietGAP')}
                  </span>
                </div>

                <h1 className="article-full-title">{article.title}</h1>

                {/* Metadata chuẩn báo chí */}
                <div className="article-full-meta-bar">
                  <div className="meta-author-group">
                    {article.authorAvatar ? (
                      <img src={article.authorAvatar} alt={article.authorName ?? 'Author'} className="meta-author-avatar" />
                    ) : (
                      <div className="meta-author-avatar-fallback">
                        <Icon name="user" size={14} />
                      </div>
                    )}
                    <span className="meta-author-name">
                      {article.authorName || (lang === 'en' ? 'VietGAP Agronomy Board' : 'Ban Cố Vấn Kỹ Thuật VietGAP')}
                    </span>
                  </div>

                  <span className="meta-dot">·</span>
                  <span className="meta-publish-date">
                    {formatDate(article.publishedAt, lang)}
                  </span>
                  <span className="meta-dot">·</span>
                  <span className="meta-read-time">
                    {article.readTimeMinutes} {lang === 'en' ? 'min read' : 'phút đọc'}
                  </span>
                  <span className="meta-dot">·</span>
                  <span className="meta-view-count">
                    {uiFormatNumber(article.viewCount, lang)} {lang === 'en' ? 'views' : 'lượt xem'}
                  </span>
                </div>
              </header>

              {/* Ảnh bìa lớn tỉ lệ 16:9 */}
              {article.image ? (
                <div className="article-full-cover-wrapper">
                  <img src={article.image} alt={article.title} className="article-full-cover-img" />
                </div>
              ) : null}

              {/* Tóm tắt bài viết (Lead summary callout) */}
              {article.summary ? (
                <aside className="article-lead-summary">
                  <div className="lead-summary-badge">
                    {lang === 'en' ? 'EXECUTIVE SUMMARY' : 'TÓM TẮT QUY TRÌNH'}
                  </div>
                  <p className="lead-summary-text">{article.summary}</p>
                </aside>
              ) : null}

              {/* Nội dung bài viết dài định dạng thoáng */}
              <div className="article-full-body">
                {article.content ? (
                  <div className="article-paragraphs">
                    {article.content.split('\n\n').map((paragraph, idx) => {
                      const trimmed = paragraph.trim();
                      if (!trimmed) return null;

                      // Xử lý tiêu đề con Markdown cấp 2 (## ...)
                      if (trimmed.startsWith('## ')) {
                        return <h2 key={idx} className="article-section-heading">{trimmed.replace(/^##\s+/, '')}</h2>;
                      }
                      // Xử lý tiêu đề con Markdown cấp 3 (### ...)
                      if (trimmed.startsWith('### ')) {
                        return <h3 key={idx} className="article-sub-heading">{trimmed.replace(/^###\s+/, '')}</h3>;
                      }
                      // Xử lý danh sách gạch đầu dòng
                      if (trimmed.includes('\n- ') || trimmed.startsWith('- ') || trimmed.includes('\n* ') || trimmed.startsWith('* ')) {
                        const items = trimmed.split(/\n(?=[-*\d+.\s])/);
                        return (
                          <ul key={idx} className="article-list-block">
                            {items.map((item, itemIdx) => (
                              <li key={itemIdx}>{item.replace(/^[-*]\s+|\d+\.\s+/, '').trim()}</li>
                            ))}
                          </ul>
                        );
                      }

                      return (
                        <p key={idx} className="article-body-p">
                          {trimmed}
                        </p>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* Footer bài viết: Tags & Nguồn */}
              <footer className="article-full-footer">
                {article.tags && article.tags.length > 0 ? (
                  <div className="article-tags-section">
                    <span className="tags-label">
                      {lang === 'en' ? 'Keywords:' : 'Từ khoá chuyên môn:'}
                    </span>
                    <div className="tags-list">
                      {article.tags.map((tag) => (
                        <Link
                          key={tag}
                          to={`/knowledge?search=${encodeURIComponent(tag)}`}
                          className="article-tag-pill"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {article.sourceUrl ? (
                  <div className="article-source-box">
                    <span className="source-label">
                      {lang === 'en' ? 'Official Reference Source:' : 'Nguồn quy chuẩn tham chiếu:'}
                    </span>
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-url-link"
                    >
                      {article.sourceUrl}
                      <Icon name="arrow" className="icon-external" />
                    </a>
                  </div>
                ) : (
                  <div className="article-source-box">
                    <span className="source-label">
                      {lang === 'en' ? 'Reference Standard:' : 'Tiêu chuẩn áp dụng:'}
                    </span>
                    <span className="source-standard-text">
                      TCVN 11892-1:2017 · Thực hành Nông nghiệp tốt tại Việt Nam (VietGAP)
                    </span>
                  </div>
                )}

                {/* Hộp điều hướng chân trang */}
                <div className="article-bottom-actions">
                  <Link to="/knowledge" className="btn-return-hub">
                    <Icon name="arrow" className="icon-flip-back" />
                    <span>{lang === 'en' ? 'Back to Knowledge Repository' : 'Quay lại danh mục cẩm nang'}</span>
                  </Link>

                  <Link to="/register" className="btn-apply-practice">
                    <span>{lang === 'en' ? 'Apply in Farming Diary' : 'Áp dụng vào nhật ký trang trại'}</span>
                    <Icon name="arrow" />
                  </Link>
                </div>
              </footer>
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
}
