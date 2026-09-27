export type KnowledgeCategory =
  | 'regulation'
  | 'soil-water'
  | 'seed-cultivation'
  | 'fertilizer-pesticide'
  | 'harvest-post-harvest'
  | 'record-traceability'
  | 'training-certification';

export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
  readTimeMinutes: number;
  publishedAt: string; // ISO date string
  viewCount: number;
}

export type KnowledgeSort = 'newest' | 'popular';

export interface KnowledgeQueryParams {
  search?: string;
  category?: KnowledgeCategory | 'all';
  sort?: KnowledgeSort;
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
