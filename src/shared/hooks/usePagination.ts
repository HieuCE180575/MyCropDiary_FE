import { useEffect, useState } from 'react';

/** Paginate a complete local result set. Server-paginated lists keep their API pagination. */
export function usePagination<T>(items: T[], resetKey: string, pageSize = 10) {
  const [selection, setSelection] = useState({ key: resetKey, page: 1 });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = selection.key === resetKey ? Math.min(selection.page, totalPages) : 1;
  useEffect(() => {
    if (selection.key !== resetKey || selection.page !== page) setSelection({ key: resetKey, page });
  }, [resetKey, page, selection]);
  return {
    page, totalPages, total: items.length,
    start: items.length ? (page - 1) * pageSize + 1 : 0,
    end: Math.min(page * pageSize, items.length),
    items: items.slice((page - 1) * pageSize, page * pageSize),
    setPage: (next: number) => setSelection({ key: resetKey, page: Math.max(1, Math.min(next, totalPages)) }),
  };
}
