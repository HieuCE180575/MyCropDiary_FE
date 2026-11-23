import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { formatDate as uiFormatDate, formatNumber as uiFormatNumber } from '../../../shared/format/formatters';
import { useCallback } from 'react';
import { useApiData } from '../../../shared/hooks/useApiData';
import { getKnowledgeCategoryLabel } from '../constants';
import { fetchKnowledgeArticleById } from '../knowledgeService';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import type { KnowledgeArticle } from '../types';

interface KnowledgeDetailModalProps {
  article: KnowledgeArticle | null;
  onClose: () => void;
}

function formatDate(iso: string, lang: 'en' | 'vi'): string {
  return uiFormatDate(iso, lang, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function KnowledgeDetailModal({ article, onClose }: KnowledgeDetailModalProps) {
  const { lang, t: translate } = useLanguage();
  const id = article?.id;
  const load = useCallback(
    (signal: AbortSignal) => (id === undefined ? Promise.resolve(null) : fetchKnowledgeArticleById(id, signal)),
    [id]
  );
  const { data, loading, error, retry } = useApiData(load);
  const detail = !loading && !error ? data : null;

  return (
    <Modal open={article !== null} onClose={onClose} title={detail?.title ?? article?.title}>
      {loading ? (
        <p role="status" className="knowledge-loading-text">
          {lang === 'en' ? 'Loading article details...' : 'Đang tải nội dung bài viết...'}
        </p>
      ) : error ? (
        <div role="alert" className="knowledge-modal-error">
          <p>{translate(error ?? '')}</p>
          <Button type="button" variant="secondary" onClick={retry}>
            {lang === 'en' ? 'Retry' : 'Thử lại'}
          </Button>
        </div>
      ) : detail ? (
        <div className="knowledge-detail-content">
          {detail.image ? (
            <div className="knowledge-detail-cover">
              <img src={detail.image} alt={detail.title} loading="lazy" />
            </div>
          ) : null}

          <div className="knowledge-card-meta knowledge-detail-meta">
            <span className="module-code">
              {detail.category
                ? getKnowledgeCategoryLabel(detail.category, lang)
                : (lang === 'en' ? 'Agricultural Knowledge' : 'Kiến thức nông nghiệp')}
            </span>
            <span className="meta-dot">·</span>
            <span>{formatDate(detail.publishedAt, lang)}</span>
            <span className="meta-dot">·</span>
            <span>{detail.readTimeMinutes} {lang === 'en' ? 'min read' : 'phút đọc'}</span>
            <span className="meta-dot">·</span>
            <span>{uiFormatNumber(detail.viewCount, lang)} {lang === 'en' ? 'views' : 'lượt xem'}</span>
          </div>
          <div className="knowledge-article-prose">
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75, fontSize: '15px', color: '#334155' }}>
              {detail.content}
            </p>
          </div>

          {detail.tags && detail.tags.length > 0 ? (
            <div className="knowledge-tag-row">
              {detail.tags.map((tag) => (
                <span key={tag} className="knowledge-tag">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
