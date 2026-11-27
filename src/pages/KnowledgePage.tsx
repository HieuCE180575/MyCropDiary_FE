import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../shared/components/EmptyState';
import { Button } from '../shared/components/Button';
import { Pagination } from '../shared/components/Pagination';
import { KnowledgeSearchBar } from '../features/knowledge/components/KnowledgeSearchBar';
import { KnowledgeFilterBar } from '../features/knowledge/components/KnowledgeFilterBar';
import { KnowledgeList } from '../features/knowledge/components/KnowledgeList';
import { KnowledgeDetailModal } from '../features/knowledge/components/KnowledgeDetailModal';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const traceCode = searchParams.get('code')?.trim() || '';
  const traceLot = searchParams.get('lot')?.trim() || '';
  const traceFarm = searchParams.get('farm')?.trim() || '';
  const traceSeason = searchParams.get('season')?.trim() || '';
  const traceBlock = searchParams.get('block')?.trim() || '';
  const traceDate = searchParams.get('date')?.trim() || '';
  const traceQty = searchParams.get('qty')?.trim() || '';
  const traceGrade = searchParams.get('grade')?.trim() || '';
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

  return (
    <div className="public-knowledge-view">
      <div className="public-container">
        <section className="knowledge-page-content">
          {traceCode && (
            <div
              className="panel"
              role="region"
              aria-label={lang === 'en' ? 'Harvest Lot Traceability' : 'Thông tin truy xuất nguồn gốc lô thu hoạch'}
              style={{
                marginBottom: '20px',
                padding: '20px 24px',
                border: '1.5px solid var(--color-primary)',
                borderRadius: '14px',
                background: 'var(--color-success-bg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary-text)' }}>
                    {lang === 'en' ? 'QR HARVEST LOT TRACEABILITY' : 'TRUY XUẤT NGUỒN GỐC LÔ THU HOẠCH (QR)'}
                  </span>
                  <h2 style={{ margin: '4px 0 0', fontSize: '20px', color: 'var(--color-text)' }}>
                    {traceCode}
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSearchParams({})}
                >
                  {lang === 'en' ? 'Close traceability card' : 'Đóng thông tin truy xuất'}
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {traceLot && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Harvest Lot Code' : 'Mã lô thu hoạch'}</div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{traceLot}</strong>
                  </div>
                )}
                {traceFarm && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Farm' : 'Trang trại'}</div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{traceFarm}</strong>
                  </div>
                )}
                {traceSeason && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Crop Season' : 'Mùa vụ'}</div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{traceSeason}</strong>
                  </div>
                )}
                {traceBlock && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Production Block' : 'Lô sản xuất'}</div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{traceBlock}</strong>
                  </div>
                )}
                {traceDate && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Harvest Date' : 'Ngày thu hoạch'}</div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{traceDate.slice(0, 10)}</strong>
                  </div>
                )}
                {traceQty && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Harvested Yield' : 'Sản lượng'}</div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{traceQty}</strong>
                  </div>
                )}
                {traceGrade && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{lang === 'en' ? 'Quality Grade' : 'Phân loại chất lượng'}</div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{traceGrade}</strong>
                  </div>
                )}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '12.5px', color: 'var(--color-muted)' }}>
                {lang === 'en'
                  ? 'Traceability data recorded in the farm digital diary on MyCropDiary.'
                  : 'Thông tin truy xuất được ghi nhận từ nhật ký canh tác điện tử trên hệ thống MyCropDiary.'}
              </p>
            </div>
          )}
          {/* Header trung tâm tri thức nông nghiệp chuẩn mực có ảnh Banner */}
          <header className="knowledge-hero-header">
            <div className="knowledge-hero-grid">
              <div className="knowledge-hero-left">
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

              <div className="knowledge-hero-right">
                <div className="knowledge-hero-media">
                  <img
                    src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=85"
                    alt={lang === 'en' ? 'VietGAP high-tech agriculture' : 'Nông trại công nghệ cao VietGAP'}
                    className="hero-banner-image"
                    loading="eager"
                  />
                  <div className="hero-media-badge">
                    <span className="badge-standard-text">TCVN 11892-1:2017</span>
                    <span className="badge-subtitle">{lang === 'en' ? 'National Standard' : 'Quy chuẩn Quốc gia'}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Thanh lọc chuyên mục và sắp xếp tách biệt */}
          <div className="knowledge-toolbar-wrap">
            <KnowledgeFilterBar
              category={category}
              onCategoryChange={handleCategoryChange}
              sort={sort}
              onSortChange={handleSortChange}
              summary={resultSummary && !loading ? resultSummary : null}
              onReset={handleResetFilters}
            />
          </div>

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
