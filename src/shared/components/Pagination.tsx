interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const SIBLING_COUNT = 1;

/** Tạo danh sách số trang rút gọn kèm dấu "…", ví dụ: 1 … 4 5 6 … 12 */
function buildPageList(page: number, totalPages: number): (number | 'ellipsis')[] {
  const totalNumbersToShow = SIBLING_COUNT * 2 + 5;
  if (totalPages <= totalNumbersToShow) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(page - SIBLING_COUNT, 1);
  const rightSibling = Math.min(page + SIBLING_COUNT, totalPages);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  const pages: (number | 'ellipsis')[] = [1];
  if (showLeftEllipsis) pages.push('ellipsis');
  for (let p = leftSibling === 1 ? 2 : leftSibling; p <= (rightSibling === totalPages ? totalPages - 1 : rightSibling); p++) {
    if (p > 1 && p < totalPages) pages.push(p);
  }
  if (showRightEllipsis) pages.push('ellipsis');
  pages.push(totalPages);

  return pages;
}

/** Điều hướng phân trang dùng lại cho các danh sách có nhiều trang. */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        type="button"
        className="pagination-btn"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹ Trước
      </button>

      <div className="pagination-pages">
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`pagination-page${p === page ? ' active' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className="pagination-btn"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau ›
      </button>
    </nav>
  );
}
