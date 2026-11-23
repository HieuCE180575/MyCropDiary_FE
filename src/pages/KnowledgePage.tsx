import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../shared/components/EmptyState';
import { Button } from '../shared/components/Button';
import { Pagination } from '../shared/components/Pagination';
import { KnowledgeSearchBar } from '../features/knowledge/components/KnowledgeSearchBar';
import { KnowledgeFilterBar } from '../features/knowledge/components/KnowledgeFilterBar';
import { KnowledgeList } from '../features/knowledge/components/KnowledgeList';
import { KnowledgeDetailModal } from '../features/knowledge/components/KnowledgeDetailModal';
import { KnowledgeFeaturedArticle } from '../features/knowledge/components/KnowledgeFeaturedArticle';
import { useDebounce } from '../shared/hooks/useDebounce';
import { useApiData } from '../shared/hooks/useApiData';
import { fetchKnowledgeArticles } from '../features/knowledge/knowledgeService';
import { KNOWLEDGE_PAGE_SIZE } from '../features/knowledge/constants';
import { useLanguage } from '../shared/i18n/LanguageContext';
import type { KnowledgeArticle, KnowledgeCategory, KnowledgeSort, PagedResult } from '../features/knowledge/types';

const EMPTY_RESULT: PagedResult<KnowledgeArticle> = {
  items: [],
  page: 1,
  pageSize: KNOWLEDGE_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

export function KnowledgePage() {
  const { lang, t: translate } = useLanguage();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [category, setCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [sort, setSort] = useState<KnowledgeSort>('newest');
  const [page, setPage] = useState(1);

  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  const load = useCallback(
    (signal: AbortSignal) =>
      fetchKnowledgeArticles({ search: debouncedSearch, category, sort, page, pageSize: KNOWLEDGE_PAGE_SIZE }, signal),
    [debouncedSearch, category, sort, page]
  );
  const { data, loading, error, retry } = useApiData(load);
  const result = data ?? EMPTY_RESULT;

  const hasActiveFilters = debouncedSearch.trim() !== '' || category !== 'all';

  // Quay về trang 1 mỗi khi từ khoá tìm kiếm thay đổi.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const resultSummary = useMemo(() => {
    if (result.totalItems === 0) return null;
    const start = (result.page - 1) * result.pageSize + 1;
    const end = Math.min(result.page * result.pageSize, result.totalItems);
    if (lang === 'vi' || (typeof window !== 'undefined' && window.localStorage?.getItem('mcd_lang') !== 'en')) {
      return `Hiển thị ${start}–${end} trên ${result.totalItems} bài viết`;
    }
    return `Showing ${start}–${end} of ${result.totalItems} articles`;
  }, [result, lang]);

  function handleCategoryChange(next: KnowledgeCategory | 'all') {
    setCategory(next);
    setPage(1);
  }

  function handleSortChange(next: KnowledgeSort) {
    setSort(next);
    setPage(1);
  }

  function handleResetFilters() {
    setSearchInput('');
    setCategory('all');
    setSort('newest');
    setPage(1);
  }

  // Bài viết tiêu biểu hiển thị ở đầu trang khi ở trang 1 và không có bộ lọc tìm kiếm
  const featuredArticle = useMemo(() => {
    if (!loading && !error && !hasActiveFilters && page === 1 && result.items.length > 0) {
      return result.items[0];
    }
    return null;
  }, [loading, error, hasActiveFilters, page, result.items]);

  return (
    <div className="public-knowledge-view">
      <div className="public-container">
        <section className="knowledge-page-content">
          {/* Header trung tâm tri thức nông nghiệp chuẩn mực */}
          <header className="knowledge-hero-header">
            <div className="knowledge-hero-inner">
              <span className="knowledge-eyebrow">
                {lang === 'en' ? 'VIETGAP TECHNICAL REPOSITORY' : 'HỆ THỐNG TRI THỨC CANH TÁC VIETGAP'}
              </span>
              <h1 className="knowledge-hero-title">
                {lang === 'en'
                  ? 'Farming Technical Guides & Standards'
                  : 'Cẩm nang Kỹ thuật & Tiêu chuẩn Canh tác'}
              </h1>
              <p className="knowledge-hero-desc">
                {lang === 'en'
                  ? 'Official guides on high-tech greenhouse crop cultivation, irrigation testing, agrochemical management, and internal audit compliance under TCVN 11892-1:2017.'
                  : 'Tài liệu hướng dẫn quy trình kỹ thuật canh tác nhà màng, kiểm soát mẫu đất nước, sử dụng phân bón thuốc BVTV và đánh giá nội bộ theo chuẩn TCVN 11892-1:2017.'}
              </p>

              <KnowledgeSearchBar
                value={searchInput}
                onChange={setSearchInput}
                onSelectSuggestion={(tag) => {
                  setSearchInput(tag);
                  setPage(1);
                }}
              />
            </div>
          </header>

          {/* Thanh lọc chuyên mục và sắp xếp */}
          <div className="knowledge-toolbar-wrap">
            <KnowledgeFilterBar
              category={category}
              onCategoryChange={handleCategoryChange}
              sort={sort}
              onSortChange={handleSortChange}
              onReset={handleResetFilters}
            />
          </div>

          {/* Bài viết nổi bật (Featured Spotlight Article) */}
          {featuredArticle ? (
            <KnowledgeFeaturedArticle article={featuredArticle} onOpen={setSelectedArticle} />
          ) : null}

          {/* Kết quả danh sách bài viết */}
          {error ? (
            <EmptyState
              role="alert"
              className="panel"
              title={<>{lang === 'en' ? 'An error occurred' : 'Đã có lỗi xảy ra'}</>}
              description={<>{translate(error)}</>}
              action={
                <Button type="button" variant="primary" onClick={retry}>
                  {lang === 'en' ? 'Retry' : 'Thử lại'}
                </Button>
              }
            />
          ) : (
            <>
              {resultSummary && !loading ? (
                <p className="knowledge-result-summary">{translate(resultSummary)}</p>
              ) : null}

              <KnowledgeList
                articles={result.items}
                loading={loading}
                hasActiveFilters={hasActiveFilters}
                onOpen={setSelectedArticle}
                onResetFilters={handleResetFilters}
              />

              {!loading ? (
                <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
              ) : null}
            </>
          )}

          <KnowledgeDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
        </section>
      </div>
    </div>
  );
}
