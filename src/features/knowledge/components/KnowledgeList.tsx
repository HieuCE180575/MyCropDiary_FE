import { EmptyState } from '../../../shared/components/EmptyState';
import { KnowledgeCard } from './KnowledgeCard';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import type { KnowledgeArticle } from '../types';

interface KnowledgeListProps {
  articles: KnowledgeArticle[];
  loading: boolean;
  hasActiveFilters: boolean;
  onOpen: (article: KnowledgeArticle) => void;
  onResetFilters: () => void;
}

export function KnowledgeList({ articles, loading, hasActiveFilters, onOpen, onResetFilters }: KnowledgeListProps) {
  const { lang } = useLanguage();
  if (loading) {
    return (
      <div className="knowledge-grid">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="knowledge-card skeleton" aria-hidden="true">
            <div className="skeleton-line skeleton-badge" />
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-short" />
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <EmptyState
        icon="📖"
        title={lang === 'en' ? 'No matching knowledge found' : 'Không tìm thấy kiến thức phù hợp'}
        description={
          hasActiveFilters
            ? (lang === 'en' ? 'Try different keywords or clear applied filters.' : 'Hãy thử từ khoá khác hoặc bỏ bớt bộ lọc đang áp dụng.')
            : (lang === 'en' ? 'The VietGAP knowledge library currently has no content.' : 'Thư viện kiến thức VietGAP hiện chưa có nội dung nào.')
        }
        action={
          hasActiveFilters ? (
            <button type="button" className="primary-button" onClick={onResetFilters}>
              {lang === 'en' ? 'Reset Filters' : 'Đặt lại bộ lọc'}
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="knowledge-grid">
      {articles.map((article) => (
        <KnowledgeCard key={article.id} article={article} onOpen={onOpen} />
      ))}
    </div>
  );
}
