import { Pagination } from '../../shared/components/Pagination';
import { useState } from 'react';
import { Icon } from '../../shared/components/Icon';
import { useAdmin } from './AdminProvider';
import { adminConfigs, articleCategories, cropGroups, displayValue, feedbackStatuses, ratingLabels, roleLabels } from './adminConfig';
import { filterRecords } from './adminModel';
import { AdminBadge, AdminEmpty, AdminField, AdminModal, AdminPageHeading } from './AdminComponents';
import type { AdminCommand, AdminRecord, Collection } from './adminTypes';

type DialogState = { mode: 'detail' | 'edit' | 'create'; id?: string } | { mode: 'action'; id: string; status: string };
const initialFilters = { query: '', status: '', from: '', to: '', extra: '' };

export function AdminCollectionPage({ collection }: { collection: Collection }) {
  const { state } = useAdmin();
  const config = adminConfigs[collection];
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const extra = collection === 'users' ? { key: 'role', label: 'Vai trò', options: roleLabels } : collection === 'feedback' ? { key: 'rating', label: 'Đánh giá', options: ratingLabels } : collection === 'crops' || collection === 'rules' ? { key: 'group', label: 'Nhóm cây', options: { ...(collection === 'rules' ? { ALL: 'Tất cả nhóm cây' } : {}), ...cropGroups } } : collection === 'articles' ? { key: 'category', label: 'Chuyên mục', options: articleCategories } : null;
  const invalidDate = !!filters.from && !!filters.to && filters.from > filters.to;
  const records = filterRecords(state[collection], { ...filters, extraKey: extra?.key });
  const pages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filter = (key: keyof typeof filters, value: string) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1); };
  const reset = () => { setFilters(initialFilters); setPage(1); };
  return <section className="admin-page">
    <AdminPageHeading title={config.title} description={config.description}>{config.createLabel && <button className="action-button solid" onClick={() => setDialog({ mode: 'create' })}><Icon name="plus" />{config.createLabel}</button>}</AdminPageHeading>
    <div className="admin-status-cards">{Object.entries(config.statuses).map(([status, label]) => <button key={status} className={filters.status === status ? 'selected' : ''} aria-pressed={filters.status === status} onClick={() => filter('status', filters.status === status ? '' : status)}><span>{label}</span><strong>{state[collection].filter(item => item.status === status).length}</strong></button>)}</div>
    <section className="admin-panel" aria-label={`Danh sách ${config.singular}`}>
      <div className="admin-list-heading"><h2>Danh sách {config.singular}<span>{records.length}</span></h2><span className="admin-subtle">Dữ liệu minh họa</span></div>
      <div className="admin-filters">
        <label className="admin-search"><Icon name="search" /><input aria-label={`Tìm kiếm ${config.singular}`} placeholder="Tìm theo tên, mã hoặc nội dung…" value={filters.query} onChange={(event) => filter('query', event.target.value)} /></label>
        <label><span>Trạng thái</span><select value={filters.status} onChange={(event) => filter('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(config.statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {extra && <label><span>{extra.label}</span><select value={filters.extra} onChange={(event) => filter('extra', event.target.value)}><option value="">Tất cả</option>{Object.entries(extra.options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <label><span>Từ ngày</span><input type="date" value={filters.from} onChange={(event) => filter('from', event.target.value)} /></label>
        <label><span>Đến ngày</span><input type="date" value={filters.to} onChange={(event) => filter('to', event.target.value)} /></label>
        <button className="admin-reset" onClick={reset}><Icon name="refresh" />Xóa bộ lọc</button>
      </div>
      {invalidDate && <p className="admin-form-error" role="alert">Ngày bắt đầu không được sau ngày kết thúc.</p>}
      {rows.length ? <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">Danh sách {config.singular}</caption><thead><tr>{config.columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}<th scope="col">Trạng thái</th><th scope="col" className="admin-action-col">Thao tác</th></tr></thead><tbody>{rows.map(record => <tr key={record.id}>{config.columns.map((column, index) => <td key={column.key}>{index === 0 ? <button className="admin-record-link" onClick={() => setDialog({ mode: 'detail', id: record.id })}><strong>{displayValue(column.key, record[column.key])}</strong><small>{record.id}</small></button> : <span>{displayValue(column.key, record[column.key])}</span>}</td>)}<td><AdminBadge collection={collection} status={record.status} /></td><td><div className="admin-row-actions"><button className="detail-button" onClick={() => setDialog({ mode: 'detail', id: record.id })} aria-label={`Xem chi tiết ${record.name}`}><Icon name="eye" /></button>{config.createLabel && <button className="edit-button" onClick={() => setDialog({ mode: 'edit', id: record.id })} aria-label={`Sửa ${record.name}`}><Icon name="edit" /></button>}</div></td></tr>)}</tbody></table></div> : <AdminEmpty />}
      <div className="admin-pagination"><span>{records.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, records.length)} trên ${records.length} kết quả` : '0 kết quả'}</span><label>Số dòng<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label><Pagination page={currentPage} totalPages={pages} onChange={setPage} /></div>
    </section>
    {collection === 'rules' && <p className="admin-footnote"><Icon name="check" />Thay đổi quy tắc chỉ áp dụng cho lần kiểm tra tiếp theo; kết quả đã lưu được giữ nguyên.</p>}
    {collection === 'articles' && <p className="admin-footnote"><Icon name="book" />Chỉ bài viết đã duyệt được dùng làm nguồn cho câu trả lời AI mới.</p>}
    {dialog && <RecordDialog key={`${collection}-${dialog.mode}-${dialog.id ?? 'new'}`} collection={collection} dialog={dialog} close={() => setDialog(null)} change={setDialog} />}
  </section>;
}

function RecordDialog({ collection, dialog, close, change }: { collection: Collection; dialog: DialogState; close: () => void; change: (dialog: DialogState) => void }) {
  const { state, execute } = useAdmin();
  const config = adminConfigs[collection];
  const record = state[collection].find(item => item.id === dialog.id);
  const [values, setValues] = useState<Record<string, string>>(record ?? {});
  const [reason, setReason] = useState('');
  const [reply, setReply] = useState(record?.reply ?? '');
  const [feedbackStatus, setFeedbackStatus] = useState(record?.status ?? 'OPEN');
  const [error, setError] = useState('');
  const submit = (command: AdminCommand) => { try { execute(command); close(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể thực hiện thao tác.'); } };
  if (dialog.mode !== 'create' && !record) return null;
  if (dialog.mode === 'create' || dialog.mode === 'edit') {
    if (collection !== 'crops' && collection !== 'rules' && collection !== 'articles') return null;
    return <AdminModal title={`${dialog.mode === 'create' ? 'Thêm' : 'Chỉnh sửa'} ${config.singular}`} close={close} wide><form onSubmit={(event) => { event.preventDefault(); submit({ type: 'save', collection, id: record?.id, values }); }}><div className="admin-modal-body">
      <p className="admin-subtle">Các trường có dấu * là bắt buộc.</p><div className="admin-form-grid">{config.fields.map(field => <AdminField key={field.key} field={field} value={values[field.key] ?? ''} onChange={(value) => setValues(previous => ({ ...previous, [field.key]: value }))} />)}</div>
      {collection === 'articles' && <p className="admin-inline-note">Bài viết được lưu dưới dạng bản nháp để kiểm tra lại trước khi duyệt. Nguồn tham khảo là bắt buộc khi duyệt.</p>}
      {error && <p role="alert" className="admin-form-error">{error}</p>}
    </div><div className="admin-modal-footer"><button className="action-button" type="button" onClick={close}>Hủy</button><button className="action-button solid" type="submit">{collection === 'articles' ? 'Lưu bản nháp' : 'Lưu thay đổi'}</button></div></form></AdminModal>;
  }
  if (!record) return null;
  if (dialog.mode === 'action') {
    const reject = collection === 'registrations' && dialog.status === 'REJECTED';
    const label = collection === 'registrations' ? (reject ? 'Từ chối hồ sơ' : 'Duyệt hồ sơ') : collection === 'users' ? (dialog.status === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản') : config.statuses[dialog.status];
    const danger = ['REJECTED', 'LOCKED', 'INACTIVE', 'ARCHIVED'].includes(dialog.status);
    return <AdminModal title={label} close={close}><form onSubmit={(event) => { event.preventDefault(); if (collection === 'registrations') submit({ type: 'review', collection, id: record.id, status: dialog.status as 'APPROVED' | 'REJECTED', reason }); else if (collection === 'users' || collection === 'crops' || collection === 'rules' || collection === 'articles') submit({ type: 'status', collection, id: record.id, status: dialog.status }); }}><div className="admin-modal-body"><p>Bạn muốn <strong>{label.toLocaleLowerCase('vi-VN')}</strong> đối với <strong>{record.name}</strong>?</p>
      {collection === 'registrations' && !reject && <p className="admin-inline-note">Theo quy trình chính thức, duyệt hồ sơ sẽ kích hoạt trang trại và cấp quyền chủ trang trại cho người đăng ký. Bản xem trước chỉ mô phỏng kết quả xét duyệt.</p>}
      {collection === 'users' && <p className="admin-inline-note">Khóa tài khoản ngăn đăng nhập; mở khóa không thay đổi các điều kiện xác thực còn lại. Tài khoản trong bản xem trước là dữ liệu minh họa.</p>}
      {(collection === 'crops' || collection === 'rules') && <p className="admin-inline-note">Dữ liệu lịch sử đã tham chiếu đến {config.singular} này được giữ nguyên.</p>}
      {reject && <AdminField field={{ key: 'reason', label: 'Lý do từ chối', type: 'textarea', required: true, maxLength: 1000 }} value={reason} onChange={setReason} />}
      {error && <p role="alert" className="admin-form-error">{error}</p>}
    </div><div className="admin-modal-footer"><button className="action-button" type="button" onClick={close}>Quay lại</button><button className={`action-button ${danger ? 'danger' : 'solid'}`} type="submit">Xác nhận {label.toLocaleLowerCase('vi-VN')}</button></div></form></AdminModal>;
  }
  const details = [...config.fields, ...(config.details ?? [])];
  return <AdminModal title={`Chi tiết ${config.singular}`} close={close} wide><div className="admin-modal-body">
    <div className="admin-detail-title"><span className="shortcut-icon"><Icon name={config.icon} /></span><div><span className="admin-subtle">{record.id}</span><h3>{record.name}</h3><AdminBadge collection={collection} status={record.status} /></div></div>
    <dl className="admin-details"><div><dt>Ngày tạo</dt><dd>{displayValue('createdAt', record.createdAt)}</dd></div>{details.filter(field => field.key !== 'name').map(field => <div key={field.key} className={field.type === 'textarea' || ['question', 'answer', 'comment', 'reply', 'description', 'reason', 'source'].includes(field.key) ? 'full' : ''}><dt>{field.label}</dt><dd>{displayValue(field.key, record[field.key])}</dd></div>)}</dl>
    {collection === 'feedback' && <form id="feedback-review-form" className="admin-feedback-form" onSubmit={(event) => { event.preventDefault(); submit({ type: 'feedback', collection: 'feedback', id: record.id, reply, status: feedbackStatus }); }}><h3>Xử lý phản hồi</h3><AdminField field={{ key: 'reply', label: 'Nội dung trả lời người gửi', type: 'textarea', maxLength: 3000 }} value={reply} onChange={setReply} /><AdminField field={{ key: 'status', label: 'Trạng thái xử lý', type: 'select', options: feedbackStatuses, required: true }} value={feedbackStatus} onChange={setFeedbackStatus} /><p className="admin-subtle">Nội dung trả lời trong bản xem trước không được gửi đến người dùng thật.</p>{error && <p role="alert" className="admin-form-error">{error}</p>}</form>}
  </div><div className="admin-modal-footer"><button className="action-button" onClick={close}>Đóng</button><RecordActions collection={collection} record={record} change={change} />{collection === 'feedback' && <button className="action-button solid" type="submit" form="feedback-review-form">Lưu phản hồi xử lý</button>}</div></AdminModal>;
}

function RecordActions({ collection, record, change }: { collection: Collection; record: AdminRecord; change: (dialog: DialogState) => void }) {
  const action = (status: string) => change({ mode: 'action', id: record.id, status });
  if (collection === 'registrations' && record.status === 'PENDING') return <><button className="action-button danger" onClick={() => action('REJECTED')}>Từ chối</button><button className="action-button solid" onClick={() => action('APPROVED')}>Duyệt hồ sơ</button></>;
  if (collection === 'users') return record.role === 'ADMIN' ? <span className="admin-subtle">Tài khoản quản trị được bảo vệ trong bản xem trước.</span> : <button className={`action-button ${record.status === 'ACTIVE' ? 'danger' : 'solid'}`} onClick={() => action(record.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE')}>{record.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button>;
  if (collection === 'crops' || collection === 'rules') return <><button className="action-button" onClick={() => change({ mode: 'edit', id: record.id })}>Chỉnh sửa</button><button className={`action-button ${record.status === 'ACTIVE' ? 'danger' : 'solid'}`} onClick={() => action(record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>{record.status === 'ACTIVE' ? 'Ngừng áp dụng' : 'Kích hoạt'}</button></>;
  if (collection === 'articles') return <><button className="action-button" onClick={() => change({ mode: 'edit', id: record.id })}>Chỉnh sửa</button>{record.status !== 'ARCHIVED' && <button className="action-button danger" onClick={() => action('ARCHIVED')}>Lưu trữ / ngừng công bố</button>}{record.status !== 'APPROVED' && <button className="action-button solid" onClick={() => action('APPROVED')}>Duyệt và công bố</button>}</>;
  return null;
}
