import { useLanguage } from '../../../shared/i18n/LanguageContext';
interface KnowledgeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function KnowledgeSearchBar({ value, onChange }: KnowledgeSearchBarProps) {
  const { lang } = useLanguage();
  return (
    <div className="search-input">
      <span className="search-icon" aria-hidden="true">🔍</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={lang === 'en' ? 'Search by title, description or keyword...' : 'Tìm kiếm theo tiêu đề, mô tả hoặc từ khoá...'}
        aria-label="Tìm kiếm kiến thức VietGAP"
      />
      {value ? (
        <button type="button" className="search-clear" aria-label="Xoá tìm kiếm" onClick={() => onChange('')}>
          ✕
        </button>
      ) : null}
    </div>
  );
}
