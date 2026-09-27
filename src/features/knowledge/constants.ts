import type { KnowledgeCategory } from './types';

export const KNOWLEDGE_PAGE_SIZE = 6;

export const KNOWLEDGE_CATEGORY_OPTIONS: { value: KnowledgeCategory; label: string }[] = [
  { value: 'regulation', label: 'Quy định chung' },
  { value: 'soil-water', label: 'Đất & nguồn nước' },
  { value: 'seed-cultivation', label: 'Giống & gieo trồng' },
  { value: 'fertilizer-pesticide', label: 'Phân bón & thuốc BVTV' },
  { value: 'harvest-post-harvest', label: 'Thu hoạch & sau thu hoạch' },
  { value: 'record-traceability', label: 'Ghi chép & truy xuất nguồn gốc' },
  { value: 'training-certification', label: 'Đào tạo & chứng nhận' },
];

export const KNOWLEDGE_CATEGORY_LABEL: Record<KnowledgeCategory, string> = KNOWLEDGE_CATEGORY_OPTIONS.reduce(
  (map, option) => ({ ...map, [option.value]: option.label }),
  {} as Record<KnowledgeCategory, string>,
);
