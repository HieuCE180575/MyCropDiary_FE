import { getFarms } from './api';
import { Pagination } from '../../shared/components/Pagination';
import { useApiData } from '../../shared/hooks/useApiData';
import { useCallback, useState } from 'react';

const statusLabels: Record<string, string> = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', PENDING: 'Chờ duyệt', INVITED: 'Đã mời', LOCKED: 'Đã khóa' };
const roleLabels: Record<string, string> = { OWNER: 'Chủ trang trại', STAFF: 'Nhân viên', ADMIN: 'Quản trị viên', USER: 'Người dùng' };

export function FarmList() {
  const [page, setPage] = useState(0);
  const load = useCallback((signal: AbortSignal) => getFarms(signal, page), [page]);
  const { data, error, loading, retry } = useApiData(load);
  return <section className="panel" aria-labelledby="farm-list-title">
    <div className="panel-title"><h2 id="farm-list-title">Danh sách trang trại</h2><button type="button" onClick={retry} disabled={loading}>Tải lại</button></div>
    {loading ? <p role="status">Đang tải trang trại…</p>
      : error ? <p role="alert" className="api-error">{error}</p>
      : !data?.items.length ? <p>Chưa có trang trại nào.</p>
      : <div className="module-grid">{data.items.map((farm) => <article className="module-card" key={farm.id}>
        <span className="module-code">{farm.farmCode}</span><h3>{farm.farmName}</h3><p>Trạng thái: {statusLabels[farm.status] ?? 'Chưa xác định'}</p>
        <p>{[farm.district, farm.province].filter(Boolean).join(', ')}</p>
        {farm.currentUserRole && <p>Vai trò: {roleLabels[farm.currentUserRole] ?? 'Thành viên'}</p>}
      </article>)}</div>}
    <div className="farm-pagination">
      {!loading && !error && data && <span>{data.totalElements} trang trại</span>}
      <Pagination page={page + 1} totalPages={data?.totalPages ?? page + 1} disabled={loading || !!error || !data} onChange={(number) => setPage(number - 1)} />
    </div>
  </section>;
}
