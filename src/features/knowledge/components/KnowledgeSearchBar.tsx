import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { Icon } from '../../../shared/components/Icon';

interface KnowledgeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (tag: string) => void;
  onReset?: () => void;
}

const POPULAR_SUGGESTIONS = [
  'Dưa lưới',
  'QCVN 39 nước tưới',
  'Thời gian cách ly PHI',
  'Ủ phân hữu cơ',
  'Bọ phấn trắng',
];

export function KnowledgeSearchBar({ value, onChange, onSelectSuggestion, onReset }: KnowledgeSearchBarProps) {
  const { lang } = useLanguage();

  return (
    <div className="knowledge-search-wrapper" style={{ width: '100%' }}>
      <div className="zone-clean-search" style={{ width: '100%' }}>
        <span className="search-icon" aria-hidden="true">
          <Icon name="search" size={17} />
        </span>
        <input
          id="knowledge-search-bar-control-1"
          className="ui-input"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            lang === 'en'
              ? 'Search technical guides, pests, VietGAP standards or keywords...'
              : 'Tìm kiếm hướng dẫn kỹ thuật, sâu bệnh, quy chuẩn VietGAP hoặc từ khoá...'
          }
          aria-label={lang === 'en' ? 'Search VietGAP knowledge' : 'Tìm kiếm kiến thức VietGAP'}
        />
        {value ? (
          <button
            type="button"
            className="search-clear"
            aria-label={lang === 'en' ? 'Clear search' : 'Xoá tìm kiếm'}
            onClick={() => {
              onChange('');
              if (onReset) onReset();
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="knowledge-search-suggestions">
        <span className="suggestion-label">
          {lang === 'en' ? 'Popular topics:' : 'Chủ đề quan tâm:'}
        </span>
        <div className="suggestion-chips">
          {POPULAR_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="suggestion-chip"
              onClick={() => {
                if (onSelectSuggestion) {
                  onSelectSuggestion(tag);
                } else {
                  onChange(tag);
                }
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
