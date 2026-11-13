import { Pagination } from './Pagination';
import { useLanguage } from '../i18n/LanguageContext';
import { formatNumber } from '../format/formatters';


interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  setPage: (page: number) => void;
  disabled?: boolean;
}

export function TablePagination({ page, totalPages, total, start, end, setPage, disabled }: TablePaginationProps) {
  const { lang } = useLanguage();
  const range = `${formatNumber(start, lang)}–${formatNumber(end, lang)}`;
  return <div className="table-pagination">
    <span aria-live="polite">{total === 0 ? (lang === 'en' ? '0 results' : '0 kết quả')
      : lang === 'en' ? `Showing ${range} of ${formatNumber(total, lang)} results`
        : `Hiển thị ${range} trong ${formatNumber(total, lang)} kết quả`}</span>
    <Pagination page={page} totalPages={totalPages} onChange={setPage} disabled={disabled} />
  </div>;
}
