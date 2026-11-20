import { Button } from '../../shared/components/Button';
import { Pagination } from '../../shared/components/Pagination';
import { Icon } from '../../shared/components/Icon';
import { AdminBadge, AdminEmpty, AdminField, AdminModal, AdminPageHeading } from './AdminComponents';
import { FarmGoongMap } from '../farm-management/components/FarmGoongMap';

import { useLanguage } from '../../shared/i18n/LanguageContext';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApiData } from '../../shared/hooks/useApiData';

import { useAdmin } from './AdminProvider';
import { adminConfigs, articleCategories, cropGroups, displayValue, feedbackStatuses, ratingLabels, roleLabels, translateAdminError } from './adminConfig';
import { filterRecords } from './adminModel';

import type { AdminCommand, AdminRecord, Collection, EditableCollection, StatusCollection } from './adminTypes';

import { parseBoundaryCoordinates } from '../farm-management/goongMapService';
import { parseEvidenceFiles, formatFileSize, getFileTypeInfo, type EvidenceFileItem } from '../../shared/api/fileUploadService';
import { FilePreviewModal } from '../../shared/components/FilePreviewModal';

const EDITABLE_COLLECTIONS: EditableCollection[] = [
  'farms',
  'zones',
  'blocks',
  'compliance',
  'users',
  'registrations',
  'crops',
  'rules',
  'articles',
];

function isEditableCollection(collection: Collection): collection is EditableCollection {
  return EDITABLE_COLLECTIONS.includes(collection as EditableCollection);
}

type DialogState =
  | { mode: 'detail' | 'edit' | 'create'; id?: string; prefill?: Record<string, string> }
  | { mode: 'action'; id: string; status: string };
const initialFilters = { query: '', status: '', from: '', to: '', extra: '' };

export function AdminCollectionPage({ collection }: { collection: Collection }) {
  const { lang, t: translate } = useLanguage();
  const { state, registrationsLoading, registrationsError, reloadRegistrations, usersLoading, usersError, reloadUsers } = useAdmin();
  const config = adminConfigs[collection];
  const showStatus = collection !== 'audit';
  const listColumns = config.columns.filter(column => !config.listKeys || config.listKeys.includes(column.key));
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    query: searchParams.get('query') ?? '',
    extra: searchParams.get('extra') ?? '',
    status: searchParams.get('status') ?? '',
  }));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    const q = searchParams.get('query') ?? '';
    const ex = searchParams.get('extra') ?? '';
    const st = searchParams.get('status') ?? '';
    const draftTitle = searchParams.get('draftTitle') ?? '';
    const draftContent = searchParams.get('draftContent') ?? '';

    if (q || ex || st) {
      setFilters({
        ...initialFilters,
        query: q,
        extra: ex,
        status: st,
      });
      setPage(1);
    }
    if (collection === 'articles' && draftTitle) {
      setDialog({
        mode: 'create',
        prefill: {
          name: draftTitle,
          category: 'VIETGAP',
          source: 'TCVN 11892-1:2017',
          content: draftContent,
        },
      });
    }
  }, [collection, searchParams]);

  const farmFilterOptions = useMemo(() => {
    const names = new Set<string>();
    for (const f of state.farms) if (f.name) names.add(f.name);
    for (const z of state.zones) if (z.farmName) names.add(z.farmName);
    for (const b of state.blocks) if (b.farmName) names.add(b.farmName);
    for (const c of state.compliance) if (c.farmName) names.add(c.farmName);
    return Object.fromEntries([...names].map((n) => [n, n]));
  }, [state.farms, state.zones, state.blocks, state.compliance]);

  const extra =
    collection === 'users'
      ? { key: 'role', label: 'Vai trò', options: roleLabels }
      : collection === 'feedback'
        ? { key: 'rating', label: 'Đánh giá', options: ratingLabels }
        : collection === 'crops' || collection === 'rules'
          ? { key: 'group', label: 'Nhóm cây', options: { ...(collection === 'rules' ? { ALL: 'Tất cả nhóm cây' } : {}), ...cropGroups } }
          : collection === 'articles'
            ? { key: 'category', label: 'Chuyên mục', options: articleCategories }
            : collection === 'zones' || collection === 'blocks' || collection === 'compliance'
              ? { key: 'farmName', label: 'Trang trại', options: farmFilterOptions }
              : null;

  const invalidDate = !!filters.from && !!filters.to && filters.from > filters.to;
  const records = filterRecords(state[collection], { ...filters, extraKey: extra?.key });
  const pages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const filter = (key: keyof typeof filters, value: string) => { setFilters(previous => ({ ...previous, [key]: value })); setPage(1); };
  const reset = () => {
    setFilters(initialFilters);
    setPage(1);
    if (searchParams.size > 0) setSearchParams({}, { replace: true });
  };

  const exportCsv = () => {
    const headers = [...config.columns.map(c => translate(c.label)), ...(showStatus ? [translate('Trạng thái')] : [])];
    const escapeCell = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const csvRows = [
      headers.map(escapeCell).join(','),
      ...records.map(r => [
        ...config.columns.map(c => escapeCell(displayValue(c.key, r[c.key], lang))),
        ...(showStatus ? [escapeCell(translate(config.statuses[r.status] || r.status))] : []),
      ].join(',')),
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mycropdiary-admin-${collection}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
    <AdminPageHeading title={translate(config.title)} description={translate(config.description)}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={exportCsv}>
          <Icon name="report" />
          {lang === 'en' ? 'Export CSV' : 'Xuất CSV'}
        </Button>
        {config.createLabel && <Button variant="primary" onClick={() => setDialog({ mode: 'create' })}><Icon name="plus" />{translate(config.createLabel)}</Button>}
      </div>
    </AdminPageHeading>
    {showStatus && <div className="admin-status-cards">{Object.entries(config.statuses).map(([status, label]) => <button key={status} className={filters.status === status ? 'selected' : ''} aria-pressed={filters.status === status} onClick={() => filter('status', filters.status === status ? '' : status)}><span>{translate(label)}</span><strong>{state[collection].filter(item => item.status === status).length}</strong></button>)}</div>}
    <section className="admin-panel" aria-label={(lang === 'en' ? `List ${translate(config.singular)}` : `Danh sách ${translate(config.singular)}`)}>
      <div className="admin-list-heading"><h2>{(lang === 'en' ? "List " : "Danh sách ")} {translate(config.singular)}</h2>{(collection === 'registrations' || collection === 'farms' || collection === 'zones' || collection === 'blocks' || collection === 'compliance') ? <Button variant="secondary" onClick={reloadRegistrations}>{(lang === 'en' ? "Reload" : "Tải lại")}</Button> : collection === 'users' ? <Button variant="secondary" onClick={reloadUsers}>{(lang === 'en' ? "Reload" : "Tải lại")}</Button> : <span className="admin-subtle">{(lang === 'en' ? "System data" : "Dữ liệu hệ thống")}</span>}</div>
      <div className="admin-filters">
        <label className="admin-search"><Icon name="search" /><input className="ui-input" aria-label={(lang === 'en' ? `Search ${translate(config.singular)}` : `Tìm kiếm ${translate(config.singular)}`)} placeholder={lang === 'en' ? 'Search by name, owner, farm, staff, or code...' : 'Tìm theo tên, chủ sở hữu, trang trại, nhân sự hoặc mã…'} value={filters.query} onChange={(event) => filter('query', event.target.value)} /></label>
        {showStatus && <label><span>{lang === 'en' ? 'Status' : 'Trạng thái'}</span><select className="ui-select" value={filters.status} onChange={(event) => filter('status', event.target.value)}><option value="">{lang === 'en' ? 'All Statuses' : 'Tất cả trạng thái'}</option>{Object.entries(config.statuses).map(([value, label]) => <option key={value} value={value}>{translate(label)}</option>)}</select></label>}
        {extra && <label><span>{translate(extra.label)}</span><select className="ui-select" value={filters.extra} onChange={(event) => filter('extra', event.target.value)}><option value="">{lang === 'en' ? 'All' : 'Tất cả'}</option>{Object.entries(extra.options).map(([value, label]) => <option key={value} value={value}>{translate(label)}</option>)}</select></label>}
        <Button type="button" variant="secondary" className="admin-reset-icon" onClick={reset} title={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'} aria-label={lang === 'en' ? 'Reset filters' : 'Đặt lại bộ lọc'}><Icon name="refresh" size={18} /></Button>
      </div>
      {invalidDate && <p className="admin-form-error" role="alert">{(lang === 'en' ? "The start date must not be after the end date." : "Ngày bắt đầu không được sau ngày kết thúc.")}</p>}
      {rows.length ? <div className="admin-table-scroll ui-table-scroll" tabIndex={0}><table className="ui-data-table admin-table"><caption className="sr-only">{(lang === 'en' ? "List " : "Danh sách ")} {translate(config.singular)}</caption><thead><tr>{listColumns.map(column => <th scope="col" key={column.key}>{translate(column.label)}</th>)}{showStatus && <th scope="col">{lang === 'en' ? 'Status' : 'Trạng thái'}</th>}<th scope="col" className="admin-action-col">{lang === 'en' ? 'Actions' : 'Thao tác'}</th></tr></thead><tbody>{rows.map(record => <tr key={record.id}>{listColumns.map((column) => <td key={column.key} style={column.key.endsWith('At') ? { whiteSpace: 'nowrap' } : undefined}>{column.key === 'name' ? <button className="admin-record-link" onClick={() => setDialog({ mode: 'detail', id: record.id })}><strong className="admin-list-title">{displayValue(column.key, record[column.key], lang)}</strong></button> : <span>{displayValue(column.key, record[column.key], lang)}</span>}</td>)}{showStatus && <td><AdminBadge collection={collection} status={record.status} /></td>}<td><div className="table-action-btns"><button className="table-icon-btn primary" onClick={() => setDialog({ mode: 'detail', id: record.id })} aria-label={(lang === 'en' ? `View details ${record.name}` : `Xem chi tiết ${record.name}`)}><Icon name="eye" /></button>{canRowEdit && <button className="table-icon-btn edit" onClick={() => setDialog({ mode: 'edit', id: record.id })} aria-label={(lang === 'en' ? `Edit ${record.name}` : `Sửa ${record.name}`)}><Icon name="edit" /></button>}</div></td></tr>)}</tbody></table></div> : <AdminEmpty />}
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
  const initialFormValues = dialog.mode !== 'action' && dialog.prefill ? { ...record, ...dialog.prefill } : (record ?? {});
  const [values, setValues] = useState<Record<string, string>>(initialFormValues);
  const [reason, setReason] = useState('');
  const [reply, setReply] = useState(record?.reply ?? '');
  const [feedbackStatus, setFeedbackStatus] = useState(record?.status ?? 'OPEN');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<EvidenceFileItem[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const submit = async (command: AdminCommand) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try { await execute(command); close(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể thực hiện thao tác.'); }
    finally { setSubmitting(false); }
  };

  if (needsDetail && (loading || detailError)) {
    return <AdminModal title={(lang === 'en' ? `Details: ${translate(config.singular)}` : `Chi tiết ${translate(config.singular)}`)} close={close} wide><div className="admin-modal-body">
      {loading ? <p role="status">{(lang === 'en' ? "Loading details..." : "Đang tải chi tiết...")}</p> : <><p role="alert" className="admin-form-error">{translate(detailError ?? '')}</p><Button variant="secondary" onClick={retry}>{(lang === 'en' ? "Retry" : "Thử lại")}</Button></>}
    </div></AdminModal>;
  }

  if (dialog.mode !== 'create' && !record) return null;

  if (dialog.mode === 'create' || dialog.mode === 'edit') {
    if (!isEditableCollection(collection)) return null;
    return <AdminModal title={(lang === 'en' ? `${((dialog.mode === 'create' ? "Add" : "Edit"))} ${translate(config.singular)}` : `${((dialog.mode === 'create' ? 'Thêm' : 'Chỉnh sửa'))} ${translate(config.singular)}`)} close={() => { if (!submitting) close(); }} wide><form onSubmit={(event) => { event.preventDefault(); submit({ type: 'save', collection, id: record?.id, values }); }}><div className="admin-modal-body">
      {collection === 'users' && record && <div className="structured-field-card ui-form-context admin-user-email">
        <div className="structured-field-header"><span className="structured-field-label">Email</span><span className="structured-field-badge">{lang === 'en' ? 'Fixed' : 'Cố định'}</span></div>
        <div>{record.email || '—'}</div>
      </div>}
      <div className="admin-form-grid">{config.fields.map(field => <AdminField key={field.key} field={field} disabled={submitting} value={values[field.key] ?? ''} onChange={(value) => setValues(previous => ({ ...previous, [field.key]: value }))} />)}</div>
      {collection === 'rules' && <p className="admin-inline-note">{lang === 'en' ? 'Rule changes apply to the next inspection. Saved assessment results are preserved.' : 'Thay đổi quy tắc áp dụng cho lần kiểm tra tiếp theo; kết quả đánh giá đã lưu được giữ nguyên.'}</p>}
      {collection === 'articles' && <p className="admin-inline-note">{(lang === 'en' ? "Articles are saved as drafts for review. A reference source is required for approval." : "Bài viết được lưu dưới dạng bản nháp để kiểm tra lại trước khi duyệt. Nguồn tham khảo là bắt buộc khi duyệt.")}</p>}
      {error && <p role="alert" className="admin-form-error">{translateAdminError(error, lang)}</p>}
    </div><div className="admin-modal-footer"><small className="admin-required-note"><span aria-hidden="true">*</span> {lang === 'en' ? 'Required information' : 'Thông tin bắt buộc'}</small><Button className="ui-cancel-button" variant="secondary" type="button" onClick={close} disabled={submitting}>{(lang === 'en' ? "Cancel" : "Hủy")}</Button><Button variant="primary" type="submit" loading={submitting}>{(lang === 'en' ? collection === 'articles' ? "Save draft" : "Save changes" : collection === 'articles' ? 'Lưu bản nháp' : 'Lưu thay đổi')}</Button></div></form></AdminModal>;
  }

  if (!record) return null;

  if (dialog.mode === 'action') {
    const reject = collection === 'registrations' && dialog.status === 'REJECTED';
    const label = collection === 'registrations'
      ? (reject ? 'Từ chối hồ sơ' : 'Duyệt hồ sơ')
      : collection === 'users'
        ? (dialog.status === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản')
        : config.statuses[dialog.status];
    const danger = ['REJECTED', 'LOCKED', 'INACTIVE', 'ARCHIVED', 'CANCELLED'].includes(dialog.status);
    return <AdminModal title={translate(label)} close={() => { if (!submitting) close(); }}><form onSubmit={(event) => {
      event.preventDefault();
      if (collection === 'registrations') {
        submit({ type: 'review', collection, id: record.id, status: dialog.status as 'APPROVED' | 'REJECTED', reason });
      } else if (['farms', 'zones', 'blocks', 'compliance', 'users', 'crops', 'rules', 'articles'].includes(collection)) {
        submit({ type: 'status', collection: collection as StatusCollection, id: record.id, status: dialog.status });
      }
    }}><div className="admin-modal-body"><p>{(lang === 'en' ? "Do you want to " : "Bạn muốn ")} <strong>{translate(label).toLocaleLowerCase('vi-VN')}</strong> {(lang === 'en' ? " for " : " đối với ")} <strong>{record.name}</strong>?</p>
      {collection === 'registrations' && !reject && <p className="admin-inline-note">{(lang === 'en' ? "Approving a registration activates the farm and grants the applicant farm owner access. The farm and owner permissions are created after approval succeeds." : "Theo quy trình chính thức, duyệt hồ sơ sẽ kích hoạt trang trại và cấp quyền chủ trang trại cho người đăng ký. Trang trại và quyền chủ trang trại được tạo trên hệ thống sau khi duyệt thành công.")}</p>}
      {collection === 'users' && <p className="admin-inline-note">{(lang === 'en' ? "Locking an account blocks sign-in; unlocking restores normal access." : "Khóa tài khoản sẽ chặn quyền đăng nhập vào hệ thống; mở khóa sẽ cho phép tài khoản tiếp tục hoạt động bình thường.")}</p>}
      {(collection === 'crops' || collection === 'rules' || collection === 'farms' || collection === 'zones' || collection === 'blocks' || collection === 'compliance') && <p className="admin-inline-note">{(lang === 'en' ? "Historical data referencing " : "Dữ liệu lịch sử đã tham chiếu đến ")} {translate(config.singular)} {(lang === 'en' ? " is preserved." : " này được giữ nguyên.")}</p>}
      {collection === 'articles' && <p className="admin-inline-note">{lang === 'en' ? (dialog.status === 'APPROVED' ? 'Publishing makes this article available in the knowledge library. A reference source is required.' : 'Archiving removes this article from publication and preserves its content.') : (dialog.status === 'APPROVED' ? 'Duyệt sẽ công bố bài viết trong thư viện kiến thức. Cần bổ sung nguồn tham khảo.' : 'Lưu trữ sẽ ngừng công bố bài viết và giữ nguyên nội dung.')}</p>}
      {reject && <AdminField field={{ key: 'reason', label: 'Lý do từ chối', type: 'textarea', required: true, maxLength: 1000, help: { vi: 'Nêu rõ thông tin cần bổ sung hoặc điều chỉnh để người đăng ký hoàn thiện hồ sơ.', en: 'Explain what the applicant needs to add or correct to complete the registration.' } }} value={reason} onChange={setReason} disabled={submitting} />}
      {error && <p role="alert" className="admin-form-error">{translateAdminError(error, lang)}</p>}
    </div><div className="admin-modal-footer"><Button className="ui-cancel-button" variant="secondary" type="button" onClick={close} disabled={submitting}>{lang === 'en' ? 'Cancel' : 'Hủy'}</Button><Button variant={danger ? 'danger' : 'primary'} type="submit" loading={submitting}>{(lang === 'en' ? submitting ? "Processing..." : `Confirm ${translate(label).toLocaleLowerCase('vi-VN')}` : submitting ? 'Đang xử lý...' : `Xác nhận ${translate(label).toLocaleLowerCase('vi-VN')}`)}</Button></div></form></AdminModal>;
  }

  const seenKeys = new Set<string>(['name']);
  const details = [...config.fields, ...(config.details ?? [])].filter((field) => {
    if (collection === 'registrations' && ['reviewer', 'reviewedAt', 'reason'].includes(field.key) && !record[field.key]) return false;
    if (seenKeys.has(field.key)) return false;
    seenKeys.add(field.key);
    return true;
  });
  const regLat = record.latitude && !Number.isNaN(Number(record.latitude)) ? Number(record.latitude) : null;
  const regLng = record.longitude && !Number.isNaN(Number(record.longitude)) ? Number(record.longitude) : null;
  const regBoundary = parseBoundaryCoordinates(record.boundaryCoordinates);

  return <AdminModal title={(lang === 'en' ? `Details: ${translate(config.singular)}` : `Chi tiết ${translate(config.singular)}`)} close={() => { if (!submitting) close(); }} wide><div className="admin-modal-body">
    <div className="admin-detail-heading">
      <div className="structured-field-card supplier-detail-field ui-detail-primary">
        <div className="structured-field-header"><span className="structured-field-label">{translate(config.fields.find(field => field.key === 'name')?.label || config.columns.find(column => column.key === 'name')?.label || (lang === 'en' ? 'Name' : 'Tên'))}</span></div>
        <div>{record.name || '—'}</div>
      </div>
      <AdminBadge collection={collection} status={record.status} />
    </div>
    <dl className="admin-details">{details.map(field => <div key={field.key} className={field.type === 'textarea' || ['question', 'answer', 'comment', 'reply', 'description', 'reason', 'source', 'document', 'blocksSummary', 'zoneSummary', 'staffSummary', 'farmsSummary', 'zonesSummary', 'assessmentNote'].includes(field.key) ? 'full' : ''}><dt>{translate(field.label)}</dt><dd>{field.key === 'document' && record[field.key] ? (() => {
      const evidenceFiles = parseEvidenceFiles(record[field.key]);
      if (evidenceFiles.length === 0) return displayValue(field.key, record[field.key], lang);
      return (
        <div className="status-evidence-list admin-evidence-list">
          {evidenceFiles.map((file, idx) => {
            const typeInfo = getFileTypeInfo(file);
            return (
              <div key={`${file.url}-${idx}`} className="status-evidence-item">
                <div className="status-evidence-info">
                  <span className={`file-upload-item-icon ${typeInfo.badgeClass}`}>
                    <Icon name={typeInfo.iconName} />
                  </span>
                  <div className="admin-evidence-description">
                    <strong>{file.name}</strong>
                    <div className="admin-evidence-meta">
                      {formatFileSize(file.size) || (typeInfo.isPdf ? 'PDF' : typeInfo.isImage ? (lang === 'en' ? 'Image' : 'Hình ảnh') : (lang === 'en' ? 'Document' : 'Tài liệu'))}
                    </div>
                  </div>
                </div>
                <div className="admin-evidence-actions">
                  <Button variant="secondary" size="compact"
                    type="button"
                    onClick={() => {
                      setPreviewFiles(evidenceFiles);
                      setPreviewIndex(idx);
                    }}
                    title={lang === 'en' ? 'Preview on web' : 'Xem trực tiếp trên web'}
                  >
                    <Icon name="eye" /> {lang === 'en' ? 'Preview' : 'Xem trực tiếp'}
                  </Button>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ui-button ui-button--secondary ui-button--compact ui-navigation-action"
                    title={lang === 'en' ? 'Open original file in a new tab' : 'Mở tài liệu gốc trong tab mới'}
                  >
                    <Icon name="external-link" /> {lang === 'en' ? 'Open file' : 'Mở tài liệu'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      );
    })() : displayValue(field.key, record[field.key], lang)}</dd></div>)}</dl>
    {(collection === 'farms' || collection === 'zones' || collection === 'blocks' || collection === 'compliance' || collection === 'users' || collection === 'feedback') && (
      <div className="admin-cross-links" style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '10px', background: 'var(--color-subtle, #f8fafc)', border: '1px solid var(--color-border, #e2e8f0)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <strong style={{ fontSize: '0.84rem', marginRight: '6px' }}>{lang === 'en' ? 'Quick Links:' : 'Liên kết nghiệp vụ nhanh:'}</strong>
        {collection === 'farms' && (
          <>
            <Link to={`/admin/zones?extra=${encodeURIComponent(record.name)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'View Farm Zones' : 'Xem Phân khu của trang trại'}
            </Link>
            <Link to={`/admin/blocks?extra=${encodeURIComponent(record.name)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'View Farm Blocks' : 'Xem Lô đất của trang trại'}
            </Link>
            <Link to={`/admin/compliance?extra=${encodeURIComponent(record.name)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'View Seasons & VietGAP' : 'Xem Mùa vụ & VietGAP'}
            </Link>
            {record.ownerName && (
              <Link to={`/admin/users?query=${encodeURIComponent(record.ownerName)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
                {lang === 'en' ? 'View Owner Account' : `Tài khoản chủ sở hữu (${record.ownerName})`}
              </Link>
            )}
          </>
        )}
        {collection === 'zones' && (
          <>
            <Link to={`/admin/blocks?query=${encodeURIComponent(record.name)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'View Blocks in Zone' : 'Xem các Lô đất thuộc phân khu'}
            </Link>
            {record.farmName && (
              <Link to={`/admin/farms?query=${encodeURIComponent(record.farmName)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
                {lang === 'en' ? 'View Parent Farm' : `Xem Trang trại (${record.farmName})`}
              </Link>
            )}
            <Link to={`/admin/compliance?query=${encodeURIComponent(record.name)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'View Zone Seasons' : 'Xem Mùa vụ trong phân khu'}
            </Link>
            {record.ownerName && (
              <Link to={`/admin/users?query=${encodeURIComponent(record.ownerName)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
                {lang === 'en' ? 'View Owner Account' : `Chủ sở hữu (${record.ownerName})`}
              </Link>
            )}
          </>
        )}
        {collection === 'blocks' && (
          <>
            {record.zoneName && (
              <Link to={`/admin/zones?query=${encodeURIComponent(record.zoneName)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
                {lang === 'en' ? 'View Parent Zone' : `Xem Phân khu (${record.zoneName})`}
              </Link>
            )}
            {record.farmName && (
              <Link to={`/admin/farms?query=${encodeURIComponent(record.farmName)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
                {lang === 'en' ? 'View Parent Farm' : `Xem Trang trại (${record.farmName})`}
              </Link>
            )}
            <Link to={`/admin/compliance?query=${encodeURIComponent(record.name)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'View Seasons on Block' : 'Xem Mùa vụ trên lô đất'}
            </Link>
          </>
        )}
        {collection === 'compliance' && (
          <>
            {record.farmName && (
              <Link to={`/admin/farms?query=${encodeURIComponent(record.farmName)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
                {lang === 'en' ? 'View Farm' : `Xem Trang trại (${record.farmName})`}
              </Link>
            )}
            <Link to="/admin/rules" onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'VietGAP Checklist Rules' : 'Xem Quy tắc bảng kiểm VietGAP'}
            </Link>
          </>
        )}
        {collection === 'users' && (
          <>
            <Link to={`/admin/farms?query=${encodeURIComponent(record.name)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'View User Farms' : 'Xem Trang trại của tài khoản'}
            </Link>
            <Link to={`/admin/zones?query=${encodeURIComponent(record.name)}`} onClick={close} className="ui-button ui-button--secondary ui-button--compact ui-navigation-action">
              {lang === 'en' ? 'View Assigned Zones' : 'Xem Phân khu phụ trách'}
            </Link>
          </>
        )}
        {collection === 'feedback' && (
          <Link
            to={`/admin/articles?draftTitle=${encodeURIComponent(record.question || record.name)}&draftContent=${encodeURIComponent(`Câu hỏi thực tế từ nông hộ:\n${record.question || record.name}\n\nHướng dẫn chuẩn VietGAP (TCVN 11892-1:2017):\n${record.answer || ''}`)}`}
            onClick={close}
            className="ui-button ui-button--secondary ui-button--compact ui-navigation-action"
          >
            {lang === 'en' ? 'Draft Knowledge Article from this Question' : 'Biên soạn bài viết kiến thức từ câu hỏi này'}
          </Link>
        )}
      </div>
    )}
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
    {collection === 'feedback' && <form id="feedback-review-form" className="admin-feedback-form" onSubmit={(event) => { event.preventDefault(); submit({ type: 'feedback', collection: 'feedback', id: record.id, reply, status: feedbackStatus }); }}><h3>{(lang === 'en' ? "Review feedback" : "Xử lý phản hồi")}</h3><AdminField field={{ key: 'reply', label: 'Nội dung trả lời người gửi', type: 'textarea', maxLength: 3000, required: feedbackStatus === 'RESOLVED' }} value={reply} onChange={setReply} disabled={submitting} /><AdminField field={{ key: 'status', label: 'Trạng thái xử lý', type: 'select', options: feedbackStatuses, required: true }} value={feedbackStatus} onChange={setFeedbackStatus} disabled={submitting} /><p className="admin-inline-note">{lang === 'en' ? 'Enter a reply before marking this feedback as resolved.' : 'Nhập nội dung trả lời trước khi đánh dấu đã giải quyết.'}</p><p className="admin-subtle">{(lang === 'en' ? "Replies in this preview are not sent to real users." : "Nội dung trả lời trong bản xem trước không được gửi đến người dùng thật.")}</p></form>}
  </div><div className="admin-modal-footer">{error && <p role="alert" className="admin-form-error form-error-banner">{translateAdminError(error, lang)}</p>}<Button className={'ui-close-action'} variant="secondary" onClick={close} disabled={submitting}>{(lang === 'en' ? "Close" : "Đóng")}</Button><RecordActions collection={collection} record={record} change={change} />{collection === 'feedback' && <Button variant="primary" type="submit" form="feedback-review-form" loading={submitting}>{(lang === 'en' ? "Save review response" : "Lưu phản hồi xử lý")}</Button>}</div>
  {previewFiles && previewFiles.length > 0 && (
    <FilePreviewModal
      files={previewFiles}
      initialIndex={previewIndex}
      onClose={() => setPreviewFiles(null)}
    />
  )}
  </AdminModal>;
}

function RecordActions({ collection, record, change }: { collection: Collection; record: AdminRecord; change: (dialog: DialogState) => void }) {
  const { lang } = useLanguage();
  const action = (status: string) => change({ mode: 'action', id: record.id, status });
  if (collection === 'registrations') {
    return <>
      <Button className={'ui-edit-action'} variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      {record.status === 'PENDING' && <>
        <Button variant="danger" onClick={() => action('REJECTED')}>{(lang === 'en' ? "Reject" : "Từ chối")}</Button>
        <Button variant="primary" onClick={() => action('APPROVED')}>{(lang === 'en' ? "Approve registration" : "Duyệt hồ sơ")}</Button>
      </>}
    </>;
  }
  if (collection === 'users') {
    return <>
      <Button className={'ui-edit-action'} variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      {record.role === 'ADMIN'
        ? <span className="admin-subtle">{(lang === 'en' ? "Administrator accounts are protected in this preview." : "Tài khoản quản trị được bảo vệ trong bản xem trước.")}</span>
        : <Button variant={record.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => action(record.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE')}>{(lang === 'en' ? record.status === 'ACTIVE' ? "Lock account" : "Unlock account" : record.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản')}</Button>}
    </>;
  }
  if (collection === 'compliance') {
    return <>
      <Button className={'ui-edit-action'} variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      {record.status !== 'NEEDS_REVIEW' && (
        <Button variant="danger" onClick={() => action('NEEDS_REVIEW')}>{(lang === 'en' ? "Flag for VietGAP review" : "Cần rà soát VietGAP")}</Button>
      )}
      {record.status !== 'HARVESTED' && (
        <Button variant="primary" onClick={() => action('HARVESTED')}>{(lang === 'en' ? "Mark Harvested" : "Đã thu hoạch")}</Button>
      )}
      {record.status !== 'ACTIVE' && (
        <Button variant="primary" onClick={() => action('ACTIVE')}>{(lang === 'en' ? "Mark Growing" : "Đang canh tác")}</Button>
      )}
    </>;
  }
  if (collection === 'farms' || collection === 'zones' || collection === 'blocks' || collection === 'crops' || collection === 'rules') {
    return <>
      <Button className={'ui-edit-action'} variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      <Button variant={record.status === 'ACTIVE' ? 'danger' : 'primary'} onClick={() => action(record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}>{(lang === 'en' ? record.status === 'ACTIVE' ? "Deactivate" : "Activate" : record.status === 'ACTIVE' ? 'Ngừng áp dụng' : 'Kích hoạt')}</Button>
    </>;
  }
  if (collection === 'articles') {
    return <>
      <Button className={'ui-edit-action'} variant="secondary" onClick={() => change({ mode: 'edit', id: record.id })}>{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>
      {record.status !== 'ARCHIVED' && <Button variant="danger" onClick={() => action('ARCHIVED')}>{(lang === 'en' ? "Archive / unpublish" : "Lưu trữ / ngừng công bố")}</Button>}
      {record.status !== 'APPROVED' && <Button variant="primary" onClick={() => action('APPROVED')}>{(lang === 'en' ? "Approve and publish" : "Duyệt và công bố")}</Button>}
    </>;
  }
  return null;
}
