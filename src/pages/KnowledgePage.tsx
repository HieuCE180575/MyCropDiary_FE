import { useEffect, useMemo, useState } from 'react';
import { Pagination } from '../shared/components/Pagination';
import { useDebounce } from '../shared/hooks/useDebounce';
import { KnowledgeSearchBar } from '../features/knowledge/components/KnowledgeSearchBar';
import { KnowledgeFilterBar } from '../features/knowledge/components/KnowledgeFilterBar';
import { KnowledgeList } from '../features/knowledge/components/KnowledgeList';
import { KnowledgeDetailModal } from '../features/knowledge/components/KnowledgeDetailModal';
import { KnowledgeDynamicBanner } from '../features/knowledge/components/KnowledgeDynamicBanner';
import { fetchKnowledgeArticles } from '../features/knowledge/knowledgeService';
import { KNOWLEDGE_PAGE_SIZE } from '../features/knowledge/constants';
import type { KnowledgeArticle, KnowledgeCategory, KnowledgeSort, PagedResult } from '../features/knowledge/types';

const EMPTY_RESULT: PagedResult<KnowledgeArticle> = {
  items: [],
  page: 1,
  pageSize: KNOWLEDGE_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};

export function KnowledgePage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [category, setCategory] = useState<KnowledgeCategory | 'all'>('all');
  const [sort, setSort] = useState<KnowledgeSort>('newest');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PagedResult<KnowledgeArticle>>(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const hasActiveFilters = debouncedSearch.trim() !== '' || category !== 'all';

  // Quay về trang 1 mỗi khi từ khoá tìm kiếm thay đổi.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchKnowledgeArticles({ search: debouncedSearch, category, sort, page, pageSize: KNOWLEDGE_PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult(data);
      })
      .catch(() => {
        if (!ignore) setError('Không thể tải danh sách kiến thức. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, category, sort, page, reloadToken]);

  const resultSummary = useMemo(() => {
    if (result.totalItems === 0) return null;
    const start = (result.page - 1) * result.pageSize + 1;
    const end = Math.min(result.page * result.pageSize, result.totalItems);
    return `Hiển thị ${start}–${end} trên ${result.totalItems} bài viết`;
  }, [result]);

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
            <div className="panel empty-state">
              <div className="empty-icon">⚠️</div>
              <h2>Đã có lỗi xảy ra</h2>
              <p>{error}</p>
              <button type="button" className="primary-button" onClick={() => setReloadToken((t) => t + 1)}>
                Thử lại
              </button>
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