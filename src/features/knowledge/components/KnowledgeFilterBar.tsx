import { KNOWLEDGE_CATEGORY_OPTIONS, getKnowledgeCategoryLabel } from '../constants';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import type { KnowledgeCategory, KnowledgeSort } from '../types';

interface KnowledgeFilterBarProps {
  category: KnowledgeCategory | 'all';
  onCategoryChange: (category: KnowledgeCategory | 'all') => void;
  sort: KnowledgeSort;
  onSortChange: (sort: KnowledgeSort) => void;
}

export function KnowledgeFilterBar({ category, onCategoryChange, sort, onSortChange }: KnowledgeFilterBarProps) {
  const { lang } = useLanguage();
  return (
    <div className="knowledge-filter-bar">
      <div className="filter-chip-row" role="group" aria-label={lang === 'en' ? 'Filter by topic' : 'Lọc theo chủ đề'}>
        <button
          type="button"
          className={`filter-chip${category === 'all' ? ' active' : ''}`}
          onClick={() => onCategoryChange('all')}
        >
          {lang === 'en' ? 'All' : 'Tất cả'}
        </button>
        {KNOWLEDGE_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`filter-chip${category === option.value ? ' active' : ''}`}
            onClick={() => onCategoryChange(option.value)}
          >
            {getKnowledgeCategoryLabel(option.value, lang)}
          </button>
        ))}
      </div>

      <label className="sort-select">
        <span>{lang === 'en' ? 'Sort' : 'Sắp xếp'}</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value as KnowledgeSort)}>
          <option value="newest">{lang === 'en' ? 'Newest' : 'Mới nhất'}</option>
          <option value="popular">{lang === 'en' ? 'Most Popular' : 'Xem nhiều nhất'}</option>
        </select>
      </label>
    </div>
  );
}
