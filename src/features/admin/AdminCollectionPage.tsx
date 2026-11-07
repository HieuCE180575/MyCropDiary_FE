import { useLanguage } from '../../shared/i18n/LanguageContext';
import { Pagination } from '../../shared/components/Pagination';
import { useCallback, useState } from 'react';
import { useApiData } from '../../shared/hooks/useApiData';
import { Icon } from '../../shared/components/Icon';
import { useAdmin } from './AdminProvider';
import { adminConfigs, articleCategories, cropGroups, displayValue, feedbackStatuses, ratingLabels, roleLabels } from './adminConfig';
import { filterRecords } from './adminModel';
import { AdminBadge, AdminEmpty, AdminField, AdminModal, AdminPageHeading } from './AdminComponents';
import type { AdminCommand, AdminRecord, Collection } from './adminTypes';
import { FarmGoongMap } from '../farm-management/components/FarmGoongMap';
import { parseBoundaryCoordinates } from '../farm-management/goongMapService';


const ADMIN_COL_EN: Record<string, string> = {
  'Trang trại': 'Farm Name',
  'Người đăng ký': 'Applicant',
  'Tỉnh / thành phố': 'Province / City',
  'Ngày gửi': 'Submitted Date',
  'Họ và tên': 'Full Name',
  'Email': 'Email',
  'Vai trò': 'Role',
  'Ngày đăng ký': 'Registered Date',
  'Tên danh mục': 'Category Name',
  'Mã danh mục': 'Category Code',
  'Nhóm cây trồng': 'Crop Group',
  'Cập nhật gần nhất': 'Last Updated',
  'Tên quy tắc': 'Rule Name',
  'Trường kiểm tra': 'Inspection Field',
  'Hoạt động': 'Activity',
  'Mức yêu cầu': 'Requirement Level',
  'Tiêu đề': 'Title',
  'Chuyên mục': 'Category',
  'Người biên soạn': 'Author',
  'Nội dung phản hồi': 'Feedback Content',
  'Người gửi': 'Sender',
  'Đánh giá': 'Rating',
  'Người thao tác': 'Operator',
  'Hành động': 'Action',
  'Đối tượng': 'Target Object',
  'Thời gian': 'Timestamp',
  'Người thực hiện': 'Performed By',
  'Thao tác': 'Action',
};

type DialogState = { mode: 'detail' | 'edit' | 'create'; id?: string } | { mode: 'action'; id: string; status: string };
const initialFilters = { query: '', status: '', from: '', to: '', extra: '' };

export function AdminCollectionPage({ collection }: { collection: Collection }) {
  const { lang, t: translate } = useLanguage();
  const { state, registrationsLoading, registrationsError, reloadRegistrations, usersLoading, usersError, reloadUsers } = useAdmin();
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
  if (collection === 'registrations' && (registrationsLoading || registrationsError)) return <section className="admin-page">
    <AdminPageHeading title={translate(config.title)} description={translate(config.description)} />
    {registrationsLoading ? <p role="status">{(lang === 'en' ? "Loading registrations..." : "Đang tải hồ sơ...")}</p> : <div className="admin-panel"><p role="alert">{translate(registrationsError)}</p><button className="action-button" onClick={reloadRegistrations}>{(lang === 'en' ? "Retry" : "Thử lại")}</button></div>}
  </section>;
  if (collection === 'users' && (usersLoading || usersError)) return <section className="admin-page">
    <AdminPageHeading title={translate(config.title)} description={translate(config.description)} />
    {usersLoading ? <p role="status">{(lang === 'en' ? "Loading accounts..." : "Đang tải danh sách tài khoản...")}</p> : <div className="admin-panel"><p role="alert">{translate(usersError)}</p><button className="action-button" onClick={reloadUsers}>{(lang === 'en' ? "Retry" : "Thử lại")}</button></div>}
  </section>;
  return <section className="admin-page">
    <AdminPageHeading title={translate(config.title)} description={translate(config.description)}>{config.createLabel && <button className="action-button solid" onClick={() => setDialog({ mode: 'create' })}><Icon name="plus" />{translate(config.createLabel)}</button>}</AdminPageHeading>
    <div className="admin-status-cards">{Object.entries(config.statuses).map(([status, label]) => <button key={status} className={filters.status === status ? 'selected' : ''} aria-pressed={filters.status === status} onClick={() => filter('status', filters.status === status ? '' : status)}><span>{translate(label)}</span><strong>{state[collection].filter(item => item.status === status).length}</strong></button>)}</div>
    <section className="admin-panel" aria-label={(lang === 'en' ? `List ${translate(config.singular)}` : `Danh sách ${translate(config.singular)}`)}>
      <div className="admin-list-heading"><h2>{(lang === 'en' ? "List " : "Danh sách ")} {translate(config.singular)}<span>{records.length}</span></h2>{collection === 'registrations' ? <button className="action-button" onClick={reloadRegistrations}>{(lang === 'en' ? "Reload" : "Tải lại")}</button> : collection === 'users' ? <button className="action-button" onClick={reloadUsers}>{(lang === 'en' ? "Reload" : "Tải lại")}</button> : <span className="admin-subtle">{(lang === 'en' ? "Sample data" : "Dữ liệu minh họa")}</span>}</div>
      <div className="admin-filters">
        <label className="admin-search"><Icon name="search" /><input aria-label={(lang === 'en' ? `Search ${translate(config.singular)}` : `Tìm kiếm ${translate(config.singular)}`)} placeholder={lang === 'en' ? 'Search by name, code, or content...' : 'Tìm theo tên, mã hoặc nội dung…'} value={filters.query} onChange={(event) => filter('query', event.target.value)} /></label>
        <label><span>{lang === 'en' ? 'Status' : 'Trạng thái'}</span><select value={filters.status} onChange={(event) => filter('status', event.target.value)}><option value="">{lang === 'en' ? 'All Statuses' : 'Tất cả trạng thái'}</option>{Object.entries(config.statuses).map(([value, label]) => <option key={value} value={value}>{translate(label)}</option>)}</select></label>
        {extra && <label><span>{translate(extra.label)}</span><select value={filters.extra} onChange={(event) => filter('extra', event.target.value)}><option value="">{lang === 'en' ? 'All' : 'Tất cả'}</option>{Object.entries(extra.options).map(([value, label]) => <option key={value} value={value}>{translate(label)}</option>)}</select></label>}
        <label><span>{(lang === 'en' ? "From date" : "Từ ngày")}</span><input type="date" value={filters.from} onChange={(event) => filter('from', event.target.value)} /></label>
        <label><span>{(lang === 'en' ? "To date" : "Đến ngày")}</span><input type="date" value={filters.to} onChange={(event) => filter('to', event.target.value)} /></label>
        <button className="admin-reset" onClick={reset}><Icon name="refresh" />{lang === 'en' ? 'Reset Filters' : 'Xóa bộ lọc'}</button>
      </div>
      {invalidDate && <p className="admin-form-error" role="alert">{(lang === 'en' ? "The start date must not be after the end date." : "Ngày bắt đầu không được sau ngày kết thúc.")}</p>}
      {rows.length ? <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">{(lang === 'en' ? "List " : "Danh sách ")} {translate(config.singular)}</caption><thead><tr>{config.columns.map(column => <th scope="col" key={column.key}>{lang === 'en' ? (ADMIN_COL_EN[column.label] || column.label) : column.label}</th>)}<th scope="col">{lang === 'en' ? 'Status' : 'Trạng thái'}</th><th scope="col" className="admin-action-col">{lang === 'en' ? 'Actions' : 'Thao tác'}</th></tr></thead><tbody>{rows.map(record => <tr key={record.id}>{config.columns.map((column, index) => <td key={column.key}>{index === 0 ? <button className="admin-record-link" onClick={() => setDialog({ mode: 'detail', id: record.id })}><strong>{translate(displayValue(column.key, record[column.key]))}</strong><small>{record.id}</small></button> : <span>{translate(displayValue(column.key, record[column.key]))}</span>}</td>)}<td><AdminBadge collection={collection} status={record.status} /></td><td><div className="admin-row-actions"><button className="detail-button" onClick={() => setDialog({ mode: 'detail', id: record.id })} aria-label={(lang === 'en' ? `View details ${record.name}` : `Xem chi tiết ${record.name}`)}><Icon name="eye" /></button>{config.createLabel && <button className="edit-button" onClick={() => setDialog({ mode: 'edit', id: record.id })} aria-label={(lang === 'en' ? `Edit ${record.name}` : `Sửa ${record.name}`)}><Icon name="edit" /></button>}</div></td></tr>)}</tbody></table></div> : <AdminEmpty />}
      <div className="admin-pagination"><span>{(lang === 'en' ? records.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, records.length)} of ${records.length} results` : "0 results" : records.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, records.length)} trên ${records.length} kết quả` : '0 kết quả')}</span><label>{(lang === 'en' ? "Rows per page" : "Số dòng")}<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label><Pagination page={currentPage} totalPages={pages} onChange={setPage} /></div>
    </section>
    {collection === 'rules' && <p className="admin-footnote"><Icon name="check" />{(lang === 'en' ? "Rule changes apply to the next inspection; saved results are preserved." : "Thay đổi quy tắc chỉ áp dụng cho lần kiểm tra tiếp theo; kết quả đã lưu được giữ nguyên.")}</p>}
    {collection === 'articles' && <p className="admin-footnote"><Icon name="book" />{(lang === 'en' ? "Only approved articles are used as sources for new AI answers." : "Chỉ bài viết đã duyệt được dùng làm nguồn cho câu trả lời AI mới.")}</p>}
    {dialog && <RecordDialog key={`${collection}-${dialog.mode}-${dialog.id ?? 'new'}`} collection={collection} dialog={dialog} close={() => setDialog(null)} change={setDialog} />}
  </section>;
}

function RecordDialog({ collection, dialog, close, change }: { collection: Collection; dialog: DialogState; close: () => void; change: (dialog: DialogState) => void }) {
  const { lang, t: translate } = useLanguage();
  const { state, execute, loadDetail } = useAdmin();
  const config = adminConfigs[collection];
  const needsDetail = dialog.mode === 'detail' && (collection === 'users' || collection === 'registrations');
  const load = useCallback((signal: AbortSignal) => {
    if (dialog.mode === 'detail' && dialog.id && (collection === 'users' || collection === 'registrations')) {
      return loadDetail(collection, dialog.id, signal);
    }
    return Promise.resolve(undefined);
  }, [collection, dialog.mode, dialog.id, loadDetail]);
  const { data, loading, error: detailError, retry } = useApiData(load);
  const record = needsDetail ? data : state[collection].find(item => item.id === dialog.id);
  const [values, setValues] = useState<Record<string, string>>(record ?? {});
  const [reason, setReason] = useState('');
  const [reply, setReply] = useState(record?.reply ?? '');
  const [feedbackStatus, setFeedbackStatus] = useState(record?.status ?? 'OPEN');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (command: AdminCommand) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try { await execute(command); close(); }
    catch (failure) { setError((lang === 'en' ? failure instanceof Error ? translate(failure.message) : "Unable to complete the action." : failure instanceof Error ? failure.message : 'Không thể thực hiện thao tác.')); }
    finally { setSubmitting(false); }
  };
  if (needsDetail && (loading || detailError)) {
    return <AdminModal title={(lang === 'en' ? `Details ${translate(config.singular)}` : `Chi tiết ${translate(config.singular)}`)} close={close} wide><div className="admin-modal-body">
      {loading ? <p role="status">{(lang === 'en' ? "Loading details..." : "Đang tải chi tiết...")}</p> : <><p role="alert" className="admin-form-error">{translate(detailError ?? '')}</p><button className="action-button" onClick={retry}>{(lang === 'en' ? "Retry" : "Thử lại")}</button></>}
    </div></AdminModal>;
  }
  if (dialog.mode !== 'create' && !record) return null;
  if (dialog.mode === 'create' || dialog.mode === 'edit') {
    if (collection !== 'crops' && collection !== 'rules' && collection !== 'articles') return null;
    return <AdminModal title={(lang === 'en' ? `${((dialog.mode === 'create' ? "Add" : "Edit"))} ${translate(config.singular)}` : `${((dialog.mode === 'create' ? 'Thêm' : 'Chỉnh sửa'))} ${translate(config.singular)}`)} close={() => { if (!submitting) close(); }} wide><form onSubmit={(event) => { event.preventDefault(); submit({ type: 'save', collection, id: record?.id, values }); }}><div className="admin-modal-body">
      <p className="admin-subtle">{(lang === 'en' ? "Fields marked * are required." : "Các trường có dấu * là bắt buộc.")}</p><div className="admin-form-grid">{config.fields.map(field => <AdminField key={field.key} field={field} value={values[field.key] ?? ''} onChange={(value) => setValues(previous => ({ ...previous, [field.key]: value }))} />)}</div>
      {collection === 'articles' && <p className="admin-inline-note">{(lang === 'en' ? "Articles are saved as drafts for review. A reference source is required for approval." : "Bài viết được lưu dưới dạng bản nháp để kiểm tra lại trước khi duyệt. Nguồn tham khảo là bắt buộc khi duyệt.")}</p>}
      {error && <p role="alert" className="admin-form-error">{translate(error)}</p>}
    </div><div className="admin-modal-footer"><button className="action-button" type="button" onClick={close}>{(lang === 'en' ? "Cancel" : "Hủy")}</button><button className="action-button solid" type="submit" disabled={submitting}>{(lang === 'en' ? collection === 'articles' ? "Save draft" : "Save changes" : collection === 'articles' ? 'Lưu bản nháp' : 'Lưu thay đổi')}</button></div></form></AdminModal>;
  }
  if (!record) return null;
  if (dialog.mode === 'action') {
    const reject = collection === 'registrations' && dialog.status === 'REJECTED';
    const label = collection === 'registrations' ? (reject ? 'Từ chối hồ sơ' : 'Duyệt hồ sơ') : collection === 'users' ? (dialog.status === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản') : config.statuses[dialog.status];
    const danger = ['REJECTED', 'LOCKED', 'INACTIVE', 'ARCHIVED'].includes(dialog.status);
    return <AdminModal title={translate(label)} close={() => { if (!submitting) close(); }}><form onSubmit={(event) => { event.preventDefault(); if (collection === 'registrations') submit({ type: 'review', collection, id: record.id, status: dialog.status as 'APPROVED' | 'REJECTED', reason }); else if (collection === 'users' || collection === 'crops' || collection === 'rules' || collection === 'articles') submit({ type: 'status', collection, id: record.id, status: dialog.status }); }}><div className="admin-modal-body"><p>{(lang === 'en' ? "Do you want to " : "Bạn muốn ")} <strong>{translate(label).toLocaleLowerCase('vi-VN')}</strong> {(lang === 'en' ? " for " : " đối với ")} <strong>{record.name}</strong>?</p>
      {collection === 'registrations' && !reject && <p className="admin-inline-note">{(lang === 'en' ? "Approving a registration activates the farm and grants the applicant farm owner access. The farm and owner permissions are created after approval succeeds." : "Theo quy trình chính thức, duyệt hồ sơ sẽ kích hoạt trang trại và cấp quyền chủ trang trại cho người đăng ký. Trang trại và quyền chủ trang trại được tạo trên hệ thống sau khi duyệt thành công.")}</p>}
      {collection === 'users' && <p className="admin-inline-note">{(lang === 'en' ? "Locking an account blocks sign-in; unlocking restores normal access." : "Khóa tài khoản sẽ chặn quyền đăng nhập vào hệ thống; mở khóa sẽ cho phép tài khoản tiếp tục hoạt động bình thường.")}</p>}
      {(collection === 'crops' || collection === 'rules') && <p className="admin-inline-note">{(lang === 'en' ? "Historical data referencing " : "Dữ liệu lịch sử đã tham chiếu đến ")} {translate(config.singular)} {(lang === 'en' ? " is preserved." : " này được giữ nguyên.")}</p>}
      {reject && <AdminField field={{ key: 'reason', label: 'Lý do từ chối', type: 'textarea', required: true, maxLength: 1000 }} value={reason} onChange={setReason} />}
      {error && <p role="alert" className="admin-form-error">{translate(error)}</p>}
    </div><div className="admin-modal-footer"><button className="action-button" type="button" onClick={close} disabled={submitting}>{(lang === 'en' ? "Back" : "Quay lại")}</button><button className={`action-button ${danger ? 'danger' : 'solid'}`} type="submit" disabled={submitting}>{(lang === 'en' ? submitting ? "Processing..." : `Confirm ${translate(label).toLocaleLowerCase('vi-VN')}` : submitting ? 'Đang xử lý...' : `Xác nhận ${translate(label).toLocaleLowerCase('vi-VN')}`)}</button></div></form></AdminModal>;
  }
  const details = [...config.fields, ...(config.details ?? [])];
  const regLat = record.latitude && !Number.isNaN(Number(record.latitude)) ? Number(record.latitude) : null;
  const regLng = record.longitude && !Number.isNaN(Number(record.longitude)) ? Number(record.longitude) : null;
  const regBoundary = parseBoundaryCoordinates(record.boundaryCoordinates);

  return <AdminModal title={(lang === 'en' ? `Details ${translate(config.singular)}` : `Chi tiết ${translate(config.singular)}`)} close={close} wide><div className="admin-modal-body">
    <div className="admin-detail-title"><span className="shortcut-icon"><Icon name={config.icon} /></span><div><span className="admin-subtle">{record.id}</span><h3>{record.name}</h3><AdminBadge collection={collection} status={record.status} /></div></div>
    <dl className="admin-details"><div><dt>{(lang === 'en' ? "Created date" : "Ngày tạo")}</dt><dd>{translate(displayValue('createdAt', record.createdAt))}</dd></div>{details.filter(field => field.key !== 'name').map(field => <div key={field.key} className={field.type === 'textarea' || ['question', 'answer', 'comment', 'reply', 'description', 'reason', 'source'].includes(field.key) ? 'full' : ''}><dt>{translate(field.label)}</dt><dd>{field.key === 'document' && /^https?:\/\//i.test(record[field.key] ?? '') ? <a href={record[field.key]} target="_blank" rel="noreferrer">{(lang === 'en' ? "Open document" : "Mở tài liệu")}</a> : displayValue(field.key, record[field.key])}</dd></div>)}</dl>
    {collection === 'registrations' && (
      <div style={{ marginTop: '16px' }}>
        <FarmGoongMap
          farmName={record.name}
          address={record.address}
          province={record.province}
          district={record.district}
          ward={record.ward}
          latitude={regLat}
          longitude={regLng}
          boundary={regBoundary}
          editable={false}
          height={320}
        />
      </div>
    )}
    {collection === 'feedback' && <form id="feedback-review-form" className="admin-feedback-form" onSubmit={(event) => { event.preventDefault(); submit({ type: 'feedback', collection: 'feedback', id: record.id, reply, status: feedbackStatus }); }}><h3>{(lang === 'en' ? "Review feedback" : "Xử lý phản hồi")}</h3><AdminField field={{ key: 'reply', label: 'Nội dung trả lời người gửi', type: 'textarea', maxLength: 3000 }} value={reply} onChange={setReply} /><AdminField field={{ key: 'status', label: 'Trạng thái xử lý', type: 'select', options: feedbackStatuses, required: true }} value={feedbackStatus} onChange={setFeedbackStatus} /><p className="admin-subtle">{(lang === 'en' ? "Replies in this preview are not sent to real users." : "Nội dung trả lời trong bản xem trước không được gửi đến người dùng thật.")}</p>{error && <p role="alert" className="admin-form-error">{translate(error)}</p>}</form>}
  </div><div className="admin-modal-footer"><button className="action-button" onClick={close}>{(lang === 'en' ? "Close" : "Đóng")}</button><RecordActions collection={collection} record={record} change={change} />{collection === 'feedback' && <button className="action-button solid" type="submit" form="feedback-review-form">{(lang === 'en' ? "Save review response" : "Lưu phản hồi xử lý")}</button>}</div></AdminModal>;
}

function RecordActions({ collection, record, change }: { collection: Collection; record: AdminRecord; change: (dialog: DialogState) => void }) {
  const { lang } = useLanguage();
  const action = (status: string) => change({ mode: 'action', id: record.id, status });
  if (collection === 'registrations' && record.status === 'PENDING') return <><button className="action-button danger" onClick={() => action('REJECTED')}>{(lang === 'en' ? "Reject" : "Từ chối")}</button><button className="action-button solid" onClick={() => action('APPROVED')}>{(lang === 'en' ? "Approve registration" : "Duyệt hồ sơ")}</button></>;
  if (collection === 'users') return record.role === 'ADMIN' ? <span className="admin-subtle">{(lang === 'en' ? "Administrator accounts are protected in this preview." : "Tài khoản quản trị được bảo vệ trong bản xem trước.")}</span> : <button className={`action-button ${record.status === 'ACTIVE' ? 'danger' : 'solid'}`} onClick={() => action(record.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE')}>{(lang === 'en' ? record.status === 'ACTIVE' ? "Lock account" : "Unlock account" : record.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản')}</button>;
  if (collection === 'crops' || collection === 'rules') return <><button className="action-button" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</button><button className={`action-button ${record.status === 'ACTIVE' ? 'danger' : 'solid'}`} onClick={() => action(record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>{(lang === 'en' ? record.status === 'ACTIVE' ? "Deactivate" : "Activate" : record.status === 'ACTIVE' ? 'Ngừng áp dụng' : 'Kích hoạt')}</button></>;
  if (collection === 'articles') return <><button className="action-button" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</button>{record.status !== 'ARCHIVED' && <button className="action-button danger" onClick={() => action('ARCHIVED')}>{(lang === 'en' ? "Archive / unpublish" : "Lưu trữ / ngừng công bố")}</button>}{record.status !== 'APPROVED' && <button className="action-button solid" onClick={() => action('APPROVED')}>{(lang === 'en' ? "Approve and publish" : "Duyệt và công bố")}</button>}</>;
  return null;
}
