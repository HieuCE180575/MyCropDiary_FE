import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pagination } from '../shared/components/Pagination';
import { useDebounce } from '../shared/hooks/useDebounce';
import { useApiData } from '../shared/hooks/useApiData';
import { KnowledgeSearchBar } from '../features/knowledge/components/KnowledgeSearchBar';
import { KnowledgeFilterBar } from '../features/knowledge/components/KnowledgeFilterBar';
import { KnowledgeList } from '../features/knowledge/components/KnowledgeList';
import { KnowledgeDetailModal } from '../features/knowledge/components/KnowledgeDetailModal';
import { KnowledgeDynamicBanner } from '../features/knowledge/components/KnowledgeDynamicBanner';
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
  const { lang } = useLanguage();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [category, setCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [sort, setSort] = useState<KnowledgeSort>('newest');
  const [page, setPage] = useState(1);

  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const load = useCallback((signal: AbortSignal) => fetchKnowledgeArticles({ search: debouncedSearch, category, sort, page, pageSize: KNOWLEDGE_PAGE_SIZE }, signal), [debouncedSearch, category, sort, page]);
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
    return lang === 'en' ? `Showing ${start}–${end} of ${result.totalItems} articles` : `Hiển thị ${start}–${end} trên ${result.totalItems} bài viết`;
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

  return (
    <div className="public-knowledge-view">
      <div className="public-container">
        <section className="knowledge-page-content">
          <KnowledgeDynamicBanner onSelectCategory={handleCategoryChange} />

          <div className="panel knowledge-toolbar">
            <KnowledgeSearchBar value={searchInput} onChange={setSearchInput} />
            <KnowledgeFilterBar
              category={category}
              onCategoryChange={handleCategoryChange}
              sort={sort}
              onSortChange={handleSortChange}
            />
          </div>

          {error ? (
            <div className="panel empty-state" role="alert">
              <div className="empty-icon">⚠️</div>
              <h2>{lang === 'en' ? 'An error occurred' : 'Đã có lỗi xảy ra'}</h2>
              <p>{error}</p>
              <button type="button" className="primary-button" onClick={retry}>{lang === 'en' ? 'Retry' : 'Thử lại'}</button>
            </div>
          ) : (
            <>
              {resultSummary && !loading ? <p className="knowledge-result-summary">{resultSummary}</p> : null}

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
