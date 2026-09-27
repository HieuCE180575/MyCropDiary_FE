import { KNOWLEDGE_CATEGORY_OPTIONS } from '../constants';
import type { KnowledgeCategory, KnowledgeSort } from '../types';

interface KnowledgeFilterBarProps {
  category: KnowledgeCategory | 'all';
  onCategoryChange: (category: KnowledgeCategory | 'all') => void;
  sort: KnowledgeSort;
  onSortChange: (sort: KnowledgeSort) => void;
}

export function KnowledgeFilterBar({ category, onCategoryChange, sort, onSortChange }: KnowledgeFilterBarProps) {
  return (
    <div className="knowledge-filter-bar">
      <div className="filter-chip-row" role="group" aria-label="Lọc theo chủ đề">
        <button
          type="button"
          className={`filter-chip${category === 'all' ? ' active' : ''}`}
          onClick={() => onCategoryChange('all')}
        >
          Tất cả
        </button>
        {KNOWLEDGE_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`filter-chip${category === option.value ? ' active' : ''}`}
            onClick={() => onCategoryChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="sort-select">
        <span>Sắp xếp</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value as KnowledgeSort)}>
          <option value="newest">Mới nhất</option>
          <option value="popular">Xem nhiều nhất</option>
        </select>
      </label>
    </div>
  );
}
