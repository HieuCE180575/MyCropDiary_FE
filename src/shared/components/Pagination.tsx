import { useLanguage } from '../i18n/LanguageContext';
import { Icon } from './Icon';

export function Pagination({ page, totalPages, onChange, disabled = false }: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  const { lang } = useLanguage();
  const count = Math.max(1, totalPages);
  const visible = Array.from(new Set([1, count, ...Array.from({ length: 5 }, (_, index) => page - 2 + index)]))
    .filter(number => number >= 1 && number <= count).sort((a, b) => a - b);
  return <nav className="pagination-controls" aria-label={(lang === 'en' ? "Pagination" : "Phân trang")}>
    <button type="button" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} aria-label={(lang === 'en' ? "Previous page" : "Trang trước")}><Icon name="arrow-left" /></button>
    {visible.map((number, index) => <span className="pagination-item" key={number}>
      {index > 0 && number - visible[index - 1] > 1 && <span className="pagination-ellipsis" aria-hidden="true">…</span>}
      <button type="button" disabled={disabled} aria-label={(lang === 'en' ? `Page ${number}` : `Trang ${number}`)} aria-current={number === page ? 'page' : undefined} onClick={() => onChange(number)}>{number}</button>
    </span>)}
    <button type="button" disabled={disabled || page >= count} onClick={() => onChange(page + 1)} aria-label={(lang === 'en' ? "Next page" : "Trang sau")}><Icon name="arrow" /></button>
  </nav>;
}
