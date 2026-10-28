import { apiRequest } from '../../shared/api/httpClient';
import type { ApiResponse } from '../../shared/types/api';
import type { PageResponse } from '../farm-management/api';
import { KNOWLEDGE_CATEGORY_OPTIONS } from './constants';
import type { KnowledgeArticle, KnowledgeQueryParams, PagedResult } from './types';

type ArticleResponse = Omit<KnowledgeArticle, 'image' | 'category' | 'summary' | 'publishedAt'> & {
  coverImageUrl: string | null;
  category: string | null;
  summary: string | null;
  publishedAt: string | null;
  createdAt: string;
};

function toArticle(article: ArticleResponse): KnowledgeArticle {
  return {
    ...article,
    image: article.coverImageUrl ?? undefined,
    summary: article.summary ?? '',
    category: KNOWLEDGE_CATEGORY_OPTIONS.find(option => option.value === article.category)?.value ?? null,
    publishedAt: article.publishedAt ?? article.createdAt,
    tags: article.tags ?? [],
    viewCount: article.viewCount ?? 0,
    readTimeMinutes: article.readTimeMinutes ?? 1,
  };
}

export async function fetchKnowledgeArticles(params: KnowledgeQueryParams, signal?: AbortSignal): Promise<PagedResult<KnowledgeArticle>> {
  const search = new URLSearchParams({ page: String(params.page - 1), size: String(params.pageSize), sort: params.sort ?? 'newest' });
  if (params.search?.trim()) search.set('keyword', params.search.trim());
  if (params.category && params.category !== 'all') search.set('category', params.category);
  const result = await apiRequest<ApiResponse<PageResponse<ArticleResponse>>>(`/knowledge/articles?${search}`, { signal, anonymous: true });
  if (!result.success || !Array.isArray(result.data?.items)) throw new Error(result.message || 'Không tải được danh sách kiến thức.');
  return {
    items: result.data.items.map(toArticle),
    page: result.data.page + 1,
    pageSize: result.data.size,
    totalItems: result.data.totalElements,
    totalPages: Math.max(1, result.data.totalPages),
  };
}

export async function fetchKnowledgeArticleById(id: number, signal?: AbortSignal): Promise<KnowledgeArticle> {
  const result = await apiRequest<ApiResponse<ArticleResponse>>(`/knowledge/articles/${id}`, { signal, anonymous: true });
  if (!result.success || !result.data) throw new Error(result.message || 'Không tải được chi tiết bài viết.');
  return toArticle(result.data);
}