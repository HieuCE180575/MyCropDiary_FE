import { KNOWLEDGE_CATEGORY_OPTIONS, getKnowledgeCategoryLabel } from '../constants';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { Icon } from '../../../shared/components/Icon';
import type { KnowledgeCategory, KnowledgeSort } from '../types';

interface KnowledgeFilterBarProps {
  category: KnowledgeCategory | 'all';
  onCategoryChange: (category: KnowledgeCategory | 'all') => void;
  sort: KnowledgeSort;
  onSortChange: (sort: KnowledgeSort) => void;
  summary?: string | null;
  onReset?: () => void;
}

export function KnowledgeFilterBar({
  category,
  onCategoryChange,
  sort,
  onSortChange,
  summary,
  onReset,
}: KnowledgeFilterBarProps) {
  const { lang, t: translate } = useLanguage();

  return (
    <div className="knowledge-filter-bar-card">
      <div className="filter-header-row">
        <span className="filter-heading-label">
          {lang === 'en' ? 'Browse by Topic:' : 'Chuyên mục kỹ thuật:'}
        </span>
      </div>

      <div className="filter-chip-row" role="group" aria-label={lang === 'en' ? 'Filter by topic' : 'Lọc theo chủ đề'}>
        <button
          type="button"
          className={`filter-chip${category === 'all' ? ' active' : ''}`}
          aria-pressed={category === 'all'}
          onClick={() => onCategoryChange('all')}
        >
          {lang === 'en' ? 'All' : 'Tất cả'}
        </button>
        {KNOWLEDGE_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`filter-chip${category === option.value ? ' active' : ''}`}
            aria-pressed={category === option.value}
            onClick={() => onCategoryChange(option.value)}
          >
            {getKnowledgeCategoryLabel(option.value, lang)}
          </button>
        ))}
      </div>

      <div className="filter-sub-row">
        <div className="filter-summary-col">
          {summary ? (
            <p className="knowledge-result-summary">{translate(summary)}</p>
          ) : (
            <p className="knowledge-result-summary-placeholder" />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="sort-select">
            <span>{lang === 'en' ? 'Sort by' : 'Sắp xếp:'}</span>
            <select
              className="ui-select"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as KnowledgeSort)}
              aria-label={lang === 'en' ? 'Sort articles' : 'Sắp xếp bài viết'}
            >
              <option value="newest">{lang === 'en' ? 'Newest' : 'Mới nhất'}</option>
              <option value="popular">{lang === 'en' ? 'Most Popular' : 'Xem nhiều nhất'}</option>
            </select>
          </label>

          {onReset && (
            <button
              type="button"
              className="zone-clean-reload-btn"
              title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}
              onClick={onReset}
            >
              <Icon name="refresh" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
