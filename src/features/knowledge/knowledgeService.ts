import { MOCK_KNOWLEDGE_ARTICLES } from './mockData';
import type { KnowledgeArticle, KnowledgeQueryParams, PagedResult } from './types';

// Khi backend UC-01–03 sẵn sàng, thay thế nội dung hàm bên dưới bằng lời gọi qua
// `apiRequest<ApiResponse<PagedResult<KnowledgeArticle>>>` tới `/knowledge/articles`
// với cùng bộ tham số `KnowledgeQueryParams`, ví dụ:
//
// const search = new URLSearchParams({
//   ...(params.search ? { search: params.search } : {}),
//   ...(params.category && params.category !== 'all' ? { category: params.category } : {}),
//   sort: params.sort ?? 'newest',
//   page: String(params.page),
//   pageSize: String(params.pageSize),
// });
// const res = await apiRequest<ApiResponse<PagedResult<KnowledgeArticle>>>(`/knowledge/articles?${search}`);
// return res.data;

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFC');
}

function matchesSearch(article: KnowledgeArticle, search: string): boolean {
  const keyword = normalize(search.trim());
  if (!keyword) return true;
  return (
    normalize(article.title).includes(keyword) ||
    normalize(article.summary).includes(keyword) ||
    article.tags.some((tag) => normalize(tag).includes(keyword))
  );
}

/** Giả lập độ trễ mạng để UI loading state hoạt động như khi gọi API thật. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchKnowledgeArticles(params: KnowledgeQueryParams): Promise<PagedResult<KnowledgeArticle>> {
  await delay(280);

  const { search = '', category = 'all', sort = 'newest', page, pageSize } = params;

  let filtered = MOCK_KNOWLEDGE_ARTICLES.filter((article) => matchesSearch(article, search));
  if (category !== 'all') {
    filtered = filtered.filter((article) => article.category === category);
  }

  filtered = [...filtered].sort((a, b) =>
    sort === 'popular'
      ? b.viewCount - a.viewCount
      : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, page: safePage, pageSize, totalItems, totalPages };
}
