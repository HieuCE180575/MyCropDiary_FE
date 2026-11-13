import { Button } from '../../shared/components/Button';
import { Pagination } from '../../shared/components/Pagination';
import { Icon } from '../../shared/components/Icon';
import { AdminBadge, AdminEmpty, AdminField, AdminModal, AdminPageHeading } from './AdminComponents';
import { FarmGoongMap } from '../farm-management/components/FarmGoongMap';

import { useLanguage } from '../../shared/i18n/LanguageContext';

import { useCallback, useMemo, useState } from 'react';
import { useApiData } from '../../shared/hooks/useApiData';

import { useAdmin } from './AdminProvider';
import { adminConfigs, articleCategories, cropGroups, displayValue, feedbackStatuses, ratingLabels, roleLabels } from './adminConfig';
import { filterRecords } from './adminModel';

import type { AdminCommand, AdminRecord, Collection, EditableCollection, StatusCollection } from './adminTypes';

import { parseBoundaryCoordinates } from '../farm-management/goongMapService';

const ADMIN_COL_EN: Record<string, string> = {
  'Trang trại': 'Farm Name',
  'Tên trang trại': 'Farm Name',
  'Mã trang trại': 'Farm Code',
  'Tên phân khu': 'Zone Name',
  'Mã phân khu': 'Zone Code',
  'Tên lô đất': 'Block Name',
  'Mã lô đất': 'Block Code',
  'Thuộc phân khu': 'Parent Zone',
  'Thuộc trang trại': 'Parent Farm',
  'Chủ sở hữu (Của ai)': 'Owner',
  'Email chủ trại': 'Owner Email',
  'Số điện thoại': 'Phone Number',
  'Địa chỉ canh tác': 'Farm Address',
  'Địa chỉ trang trại': 'Farm Address',
  'Quy mô (Khu · Lô · Diện tích)': 'Scale (Zones · Blocks · Area)',
  'Nhân sự phụ trách': 'Assigned Staff',
  'Diện tích': 'Area',
  'Số lô đất': 'Block Count',
  'Loại đất': 'Soil Type',
  'Người đăng ký': 'Applicant',
  'Email liên hệ': 'Contact Email',
  'Tỉnh / thành phố': 'Province / City',
  'Họ và tên': 'Full Name',
  'Email': 'Email',
  'Vai trò': 'Role',
  'Trang trại tham gia': 'Farms',
  'Phân khu phụ trách': 'Assigned Zones',
  'Tên danh mục': 'Category Name',
  'Mã danh mục': 'Category Code',
  'Nhóm cây trồng': 'Crop Group',
  'Mô tả kỹ thuật': 'Description',
  'Tên quy tắc': 'Rule Name',
  'Trường kiểm tra': 'Inspection Field',
  'Hoạt động': 'Activity',
  'Mức yêu cầu': 'Requirement Level',
  'Hướng dẫn': 'Guidance',
  'Tiêu đề': 'Title',
  'Chuyên mục': 'Category',
  'Người biên soạn': 'Author',
  'Nguồn tham khảo': 'Reference Source',
  'Nội dung phản hồi': 'Feedback Content',
  'Người gửi': 'Sender',
  'Đánh giá': 'Rating',
  'Câu hỏi của người dùng': 'User Question',
  'Người thao tác': 'Operator',
  'Hành động': 'Action',
  'Đối tượng': 'Target Object',
  'Người thực hiện': 'Performed By',
  'Thao tác': 'Action',
  'Nội dung thay đổi': 'Change Summary',
};

const EDITABLE_COLLECTIONS: EditableCollection[] = [
  'farms',
  'zones',
  'blocks',
  'users',
  'registrations',
  'crops',
  'rules',
  'articles',
];

function isEditableCollection(collection: Collection): collection is EditableCollection {
  return EDITABLE_COLLECTIONS.includes(collection as EditableCollection);
}

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

  const farmFilterOptions = useMemo(() => {
    const names = new Set<string>();
    for (const f of state.farms) if (f.name) names.add(f.name);
    for (const z of state.zones) if (z.farmName) names.add(z.farmName);
    for (const b of state.blocks) if (b.farmName) names.add(b.farmName);
    return Object.fromEntries([...names].map((n) => [n, n]));
  }, [state.farms, state.zones, state.blocks]);

  const extra =
    collection === 'users'
      ? { key: 'role', label: 'Vai trò', options: roleLabels }
      : collection === 'feedback'
        ? { key: 'rating', label: 'Đánh giá', options: ratingLabels }
        : collection === 'crops' || collection === 'rules'
          ? { key: 'group', label: 'Nhóm cây', options: { ...(collection === 'rules' ? { ALL: 'Tất cả nhóm cây' } : {}), ...cropGroups } }
          : collection === 'articles'
            ? { key: 'category', label: 'Chuyên mục', options: articleCategories }
            : collection === 'zones' || collection === 'blocks'
              ? { key: 'farmName', label: 'Trang trại', options: farmFilterOptions }
              : null;

  const invalidDate = !!filters.from && !!filters.to && filters.from > filters.to;
  const records = filterRecords(state[collection], { ...filters, extraKey: extra?.key });
  const pages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filter = (key: keyof typeof filters, value: string) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1); };
  const reset = () => { setFilters(initialFilters); setPage(1); };

  if (collection === 'registrations' && (registrationsLoading || registrationsError)) return <section className="admin-page">
    <AdminPageHeading title={translate(config.title)} description={translate(config.description)} />
    {registrationsLoading ? <p role="status">{(lang === 'en' ? "Loading registrations..." : "Đang tải hồ sơ...")}</p> : <div className="admin-panel"><p role="alert">{translate(registrationsError)}</p><Button variant="secondary" onClick={reloadRegistrations}>{(lang === 'en' ? "Retry" : "Thử lại")}</Button></div>}
  </section>;
  if (collection === 'users' && (usersLoading || usersError)) return <section className="admin-page">
    <AdminPageHeading title={translate(config.title)} description={translate(config.description)} />
    {usersLoading ? <p role="status">{(lang === 'en' ? "Loading accounts..." : "Đang tải danh sách tài khoản...")}</p> : <div className="admin-panel"><p role="alert">{translate(usersError)}</p><Button variant="secondary" onClick={reloadUsers}>{(lang === 'en' ? "Retry" : "Thử lại")}</Button></div>}
  </section>;

  const canRowEdit = Boolean(config.createLabel || config.allowEdit);

  return <section className="admin-page">
    <AdminPageHeading title={translate(config.title)} description={translate(config.description)}>{config.createLabel && <Button variant="primary" onClick={() => setDialog({ mode: 'create' })}><Icon name="plus" />{translate(config.createLabel)}</Button>}</AdminPageHeading>
    <div className="admin-status-cards">{Object.entries(config.statuses).map(([status, label]) => <button key={status} className={filters.status === status ? 'selected' : ''} aria-pressed={filters.status === status} onClick={() => filter('status', filters.status === status ? '' : status)}><span>{translate(label)}</span><strong>{state[collection].filter(item => item.status === status).length}</strong></button>)}</div>
    <section className="admin-panel" aria-label={(lang === 'en' ? `List ${translate(config.singular)}` : `Danh sách ${translate(config.singular)}`)}>
      <div className="admin-list-heading"><h2>{(lang === 'en' ? "List " : "Danh sách ")} {translate(config.singular)}<span>{records.length}</span></h2>{(collection === 'registrations' || collection === 'farms' || collection === 'zones' || collection === 'blocks') ? <Button variant="secondary" onClick={reloadRegistrations}>{(lang === 'en' ? "Reload" : "Tải lại")}</Button> : collection === 'users' ? <Button variant="secondary" onClick={reloadUsers}>{(lang === 'en' ? "Reload" : "Tải lại")}</Button> : <span className="admin-subtle">{(lang === 'en' ? "System data" : "Dữ liệu hệ thống")}</span>}</div>
      <div className="admin-filters">
        <label className="admin-search"><Icon name="search" /><input className="ui-input" aria-label={(lang === 'en' ? `Search ${translate(config.singular)}` : `Tìm kiếm ${translate(config.singular)}`)} placeholder={lang === 'en' ? 'Search by name, owner, farm, staff, or code...' : 'Tìm theo tên, chủ sở hữu, trang trại, nhân sự hoặc mã…'} value={filters.query} onChange={(event) => filter('query', event.target.value)} /></label>
        <label><span>{lang === 'en' ? 'Status' : 'Trạng thái'}</span><select className="ui-select" value={filters.status} onChange={(event) => filter('status', event.target.value)}><option value="">{lang === 'en' ? 'All Statuses' : 'Tất cả trạng thái'}</option>{Object.entries(config.statuses).map(([value, label]) => <option key={value} value={value}>{translate(label)}</option>)}</select></label>
        {extra && <label><span>{translate(extra.label)}</span><select className="ui-select" value={filters.extra} onChange={(event) => filter('extra', event.target.value)}><option value="">{lang === 'en' ? 'All' : 'Tất cả'}</option>{Object.entries(extra.options).map(([value, label]) => <option key={value} value={value}>{translate(label)}</option>)}</select></label>}
        <button className="admin-reset" onClick={reset}><Icon name="refresh" />{lang === 'en' ? 'Reset Filters' : 'Xóa bộ lọc'}</button>
      </div>
      {invalidDate && <p className="admin-form-error" role="alert">{(lang === 'en' ? "The start date must not be after the end date." : "Ngày bắt đầu không được sau ngày kết thúc.")}</p>}
      {rows.length ? <div className="admin-table-scroll ui-table-scroll" tabIndex={0}><table className="ui-data-table admin-table"><caption className="sr-only">{(lang === 'en' ? "List " : "Danh sách ")} {translate(config.singular)}</caption><thead><tr>{config.columns.map(column => <th scope="col" key={column.key}>{lang === 'en' ? (ADMIN_COL_EN[column.label] || column.label) : column.label}</th>)}<th scope="col">{lang === 'en' ? 'Status' : 'Trạng thái'}</th><th scope="col" className="admin-action-col">{lang === 'en' ? 'Actions' : 'Thao tác'}</th></tr></thead><tbody>{rows.map(record => <tr key={record.id}>{config.columns.map((column, index) => <td key={column.key}>{index === 0 ? <button className="admin-record-link" onClick={() => setDialog({ mode: 'detail', id: record.id })}><strong>{displayValue(column.key, record[column.key], lang)}</strong><small>{record.code || record.id}</small></button> : <span>{displayValue(column.key, record[column.key], lang)}</span>}</td>)}<td><AdminBadge collection={collection} status={record.status} /></td><td><div className="table-action-btns"><button className="table-icon-btn primary" onClick={() => setDialog({ mode: 'detail', id: record.id })} aria-label={(lang === 'en' ? `View details ${record.name}` : `Xem chi tiết ${record.name}`)}><Icon name="eye" /></button>{canRowEdit && <button className="table-icon-btn edit" onClick={() => setDialog({ mode: 'edit', id: record.id })} aria-label={(lang === 'en' ? `Edit ${record.name}` : `Sửa ${record.name}`)}><Icon name="edit" /></button>}</div></td></tr>)}</tbody></table></div> : <AdminEmpty />}
      <div className="admin-pagination"><span>{(lang === 'en' ? records.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, records.length)} of ${records.length} results` : "0 results" : records.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, records.length)} trên ${records.length} kết quả` : '0 kết quả')}</span><label>{(lang === 'en' ? "Rows per page" : "Số dòng")}<select className="ui-select" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label><Pagination page={currentPage} totalPages={pages} onChange={setPage} /></div>
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
      {loading ? <p role="status">{(lang === 'en' ? "Loading details..." : "Đang tải chi tiết...")}</p> : <><p role="alert" className="admin-form-error">{translate(detailError ?? '')}</p><Button variant="secondary" onClick={retry}>{(lang === 'en' ? "Retry" : "Thử lại")}</Button></>}
    </div></AdminModal>;
  }

  if (dialog.mode !== 'create' && !record) return null;

  if (dialog.mode === 'create' || dialog.mode === 'edit') {
    if (!isEditableCollection(collection)) return null;
    return <AdminModal title={(lang === 'en' ? `${((dialog.mode === 'create' ? "Add" : "Edit"))} ${translate(config.singular)}` : `${((dialog.mode === 'create' ? 'Thêm' : 'Chỉnh sửa'))} ${translate(config.singular)}`)} close={() => { if (!submitting) close(); }} wide><form onSubmit={(event) => { event.preventDefault(); submit({ type: 'save', collection, id: record?.id, values }); }}><div className="admin-modal-body">
      <p className="admin-subtle">{(lang === 'en' ? "Fields marked * are required." : "Các trường có dấu * là bắt buộc.")}</p><div className="admin-form-grid">{config.fields.map(field => <AdminField key={field.key} field={field} value={values[field.key] ?? ''} onChange={(value) => setValues(previous => ({ ...previous, [field.key]: value }))} />)}</div>
      {collection === 'articles' && <p className="admin-inline-note">{(lang === 'en' ? "Articles are saved as drafts for review. A reference source is required for approval." : "Bài viết được lưu dưới dạng bản nháp để kiểm tra lại trước khi duyệt. Nguồn tham khảo là bắt buộc khi duyệt.")}</p>}
      {error && <p role="alert" className="admin-form-error">{translate(error)}</p>}
    </div><div className="admin-modal-footer"><Button variant="secondary" type="button" onClick={close}>{(lang === 'en' ? "Cancel" : "Hủy")}</Button><Button variant="primary" type="submit" loading={submitting}>{(lang === 'en' ? collection === 'articles' ? "Save draft" : "Save changes" : collection === 'articles' ? 'Lưu bản nháp' : 'Lưu thay đổi')}</Button></div></form></AdminModal>;
  }

  if (!record) return null;

  if (dialog.mode === 'action') {
    const reject = collection === 'registrations' && dialog.status === 'REJECTED';
    const label = collection === 'registrations'
      ? (reject ? 'Từ chối hồ sơ' : 'Duyệt hồ sơ')
      : collection === 'users'
        ? (dialog.status === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản')
        : config.statuses[dialog.status];
    const danger = ['REJECTED', 'LOCKED', 'INACTIVE', 'ARCHIVED'].includes(dialog.status);
    return <AdminModal title={translate(label)} close={() => { if (!submitting) close(); }}><form onSubmit={(event) => {
      event.preventDefault();
      if (collection === 'registrations') {
        submit({ type: 'review', collection, id: record.id, status: dialog.status as 'APPROVED' | 'REJECTED', reason });
      } else if (['farms', 'zones', 'blocks', 'users', 'crops', 'rules', 'articles'].includes(collection)) {
        submit({ type: 'status', collection: collection as StatusCollection, id: record.id, status: dialog.status });
      }
    }}><div className="admin-modal-body"><p>{(lang === 'en' ? "Do you want to " : "Bạn muốn ")} <strong>{translate(label).toLocaleLowerCase('vi-VN')}</strong> {(lang === 'en' ? " for " : " đối với ")} <strong>{record.name}</strong>?</p>
      {collection === 'registrations' && !reject && <p className="admin-inline-note">{(lang === 'en' ? "Approving a registration activates the farm and grants the applicant farm owner access. The farm and owner permissions are created after approval succeeds." : "Theo quy trình chính thức, duyệt hồ sơ sẽ kích hoạt trang trại và cấp quyền chủ trang trại cho người đăng ký. Trang trại và quyền chủ trang trại được tạo trên hệ thống sau khi duyệt thành công.")}</p>}
      {collection === 'users' && <p className="admin-inline-note">{(lang === 'en' ? "Locking an account blocks sign-in; unlocking restores normal access." : "Khóa tài khoản sẽ chặn quyền đăng nhập vào hệ thống; mở khóa sẽ cho phép tài khoản tiếp tục hoạt động bình thường.")}</p>}
      {(collection === 'crops' || collection === 'rules' || collection === 'farms' || collection === 'zones' || collection === 'blocks') && <p className="admin-inline-note">{(lang === 'en' ? "Historical data referencing " : "Dữ liệu lịch sử đã tham chiếu đến ")} {translate(config.singular)} {(lang === 'en' ? " is preserved." : " này được giữ nguyên.")}</p>}
      {reject && <AdminField field={{ key: 'reason', label: 'Lý do từ chối', type: 'textarea', required: true, maxLength: 1000 }} value={reason} onChange={setReason} />}
      {error && <p role="alert" className="admin-form-error">{translate(error)}</p>}
    </div><div className="admin-modal-footer"><Button variant="secondary" type="button" onClick={close} disabled={submitting}>{(lang === 'en' ? "Back" : "Quay lại")}</Button><Button variant={danger ? 'danger' : 'primary'} type="submit" loading={submitting}>{(lang === 'en' ? submitting ? "Processing..." : `Confirm ${translate(label).toLocaleLowerCase('vi-VN')}` : submitting ? 'Đang xử lý...' : `Xác nhận ${translate(label).toLocaleLowerCase('vi-VN')}`)}</Button></div></form></AdminModal>;
  }

  const seenKeys = new Set<string>(['name']);
  const details = [...config.fields, ...(config.details ?? [])].filter((field) => {
    if (seenKeys.has(field.key)) return false;
    seenKeys.add(field.key);
    return true;
  });
  const regLat = record.latitude && !Number.isNaN(Number(record.latitude)) ? Number(record.latitude) : null;
  const regLng = record.longitude && !Number.isNaN(Number(record.longitude)) ? Number(record.longitude) : null;
  const regBoundary = parseBoundaryCoordinates(record.boundaryCoordinates);

  return <AdminModal title={(lang === 'en' ? `Details ${translate(config.singular)}` : `Chi tiết ${translate(config.singular)}`)} close={close} wide><div className="admin-modal-body">
    <div className="admin-detail-title"><span className="shortcut-icon"><Icon name={config.icon} /></span><div><span className="admin-subtle">{record.code || record.id}</span><h3>{record.name}</h3><AdminBadge collection={collection} status={record.status} /></div></div>
    <dl className="admin-details">{details.map(field => <div key={field.key} className={field.type === 'textarea' || ['question', 'answer', 'comment', 'reply', 'description', 'reason', 'source', 'blocksSummary', 'zoneSummary', 'staffSummary', 'farmsSummary', 'zonesSummary'].includes(field.key) ? 'full' : ''}><dt>{translate(field.label)}</dt><dd>{field.key === 'document' && /^https?:\/\//i.test(record[field.key] ?? '') ? <a href={record[field.key]} target="_blank" rel="noreferrer">{(lang === 'en' ? "Open document" : "Mở tài liệu")}</a> : displayValue(field.key, record[field.key], lang)}</dd></div>)}</dl>
    {(collection === 'registrations' || collection === 'farms') && (
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
  </div><div className="admin-modal-footer"><Button variant="secondary" onClick={close}>{(lang === 'en' ? "Close" : "Đóng")}</Button><RecordActions collection={collection} record={record} change={change} />{collection === 'feedback' && <Button variant="primary" type="submit" form="feedback-review-form">{(lang === 'en' ? "Save review response" : "Lưu phản hồi xử lý")}</Button>}</div></AdminModal>;
}

function RecordActions({ collection, record, change }: { collection: Collection; record: AdminRecord; change: (dialog: DialogState) => void }) {
  const { lang } = useLanguage();
  const action = (status: string) => change({ mode: 'action', id: record.id, status });
  if (collection === 'registrations') {
    return <>
      <Button variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      {record.status === 'PENDING' && <>
        <Button variant="danger" onClick={() => action('REJECTED')}>{(lang === 'en' ? "Reject" : "Từ chối")}</Button>
        <Button variant="primary" onClick={() => action('APPROVED')}>{(lang === 'en' ? "Approve registration" : "Duyệt hồ sơ")}</Button>
      </>}
    </>;
  }
  if (collection === 'users') {
    return <>
      <Button variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      {record.role === 'ADMIN'
        ? <span className="admin-subtle">{(lang === 'en' ? "Administrator accounts are protected in this preview." : "Tài khoản quản trị được bảo vệ trong bản xem trước.")}</span>
        : <Button variant={record.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => action(record.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE')}>{(lang === 'en' ? record.status === 'ACTIVE' ? "Lock account" : "Unlock account" : record.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản')}</Button>}
    </>;
  }
  if (collection === 'farms' || collection === 'zones' || collection === 'blocks' || collection === 'crops' || collection === 'rules') {
    return <>
      <Button variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      <Button variant={record.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => action(record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>{(lang === 'en' ? record.status === 'ACTIVE' ? "Deactivate" : "Activate" : record.status === 'ACTIVE' ? 'Ngừng áp dụng' : 'Kích hoạt')}</Button>
    </>;
  }
  if (collection === 'articles') {
    return <>
      <Button variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      {record.status !== 'ARCHIVED' && <Button variant="danger" onClick={() => action('ARCHIVED')}>{(lang === 'en' ? "Archive / unpublish" : "Lưu trữ / ngừng công bố")}</Button>}
      {record.status !== 'APPROVED' && <Button variant="primary" onClick={() => action('APPROVED')}>{(lang === 'en' ? "Approve and publish" : "Duyệt và công bố")}</Button>}
    </>;
  }
  return null;
}
