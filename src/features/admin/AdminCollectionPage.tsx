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
      {rows.length ? <div className="admin-table-scroll ui-table-scroll" tabIndex={0}><table className={`ui-data-table admin-table${collection === 'compliance' ? ' admin-compliance-table' : collection === 'users' ? ' admin-users-table' : ''}`}><caption className="sr-only">{(lang === 'en' ? "List " : "Danh sách ")} {translate(config.singular)}</caption><thead><tr>{listColumns.map(column => <th scope="col" key={column.key}>{translate(column.label)}</th>)}{showStatus && <th scope="col">{lang === 'en' ? 'Status' : 'Trạng thái'}</th>}<th scope="col" className="admin-action-col">{lang === 'en' ? 'Actions' : 'Thao tác'}</th></tr></thead><tbody>{rows.map(record => <tr key={record.id}>{listColumns.map((column) => <td key={column.key} style={column.key.endsWith('At') ? { whiteSpace: 'nowrap' } : undefined}>{column.key === 'name' ? <button className="admin-record-link" onClick={() => setDialog({ mode: 'detail', id: record.id })}><strong className="admin-list-title">{displayValue(column.key, record[column.key], lang)}</strong></button> : <span>{displayValue(column.key, collection === 'compliance' && column.key === 'checklistProgress' ? record[column.key]?.match(/^\s*(\d+(?:[.,]\d+)?\s*%)/)?.[1] ?? record[column.key] : record[column.key], lang)}</span>}</td>)}{showStatus && <td><AdminBadge collection={collection} status={record.status} /></td>}<td><div className="table-action-btns"><button className="table-icon-btn primary" onClick={() => setDialog({ mode: 'detail', id: record.id })} aria-label={(lang === 'en' ? `View details ${record.name}` : `Xem chi tiết ${record.name}`)}><Icon name="eye" /></button>{canRowEdit && <button className="table-icon-btn edit" onClick={() => setDialog({ mode: 'edit', id: record.id })} aria-label={(lang === 'en' ? `Edit ${record.name}` : `Sửa ${record.name}`)}><Icon name="edit" /></button>}{collection === 'users' && (record.role === 'ADMIN' ? <button className="admin-action-toggle-btn muted" disabled aria-label={lang === 'en' ? 'Administrator account is protected' : 'Tài khoản quản trị được bảo vệ'} title={lang === 'en' ? 'Administrator account is protected' : 'Tài khoản quản trị được bảo vệ'}><Icon name="shield" /><span>{lang === 'en' ? 'Protected' : 'Bảo vệ'}</span></button> : record.status === 'ACTIVE' ? <button className="admin-action-toggle-btn danger" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'LOCKED' })} aria-label={lang === 'en' ? `Lock account ${record.name}` : `Khóa tài khoản ${record.name}`} title={lang === 'en' ? `Ban / Lock account ${record.name}` : `Khóa / Ban tài khoản ${record.name}`}><Icon name="lock" /><span>{lang === 'en' ? 'Ban / Lock' : 'Khóa / Ban'}</span></button> : <button className="admin-action-toggle-btn primary" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'ACTIVE' })} aria-label={lang === 'en' ? `Unlock account ${record.name}` : `Mở khóa tài khoản ${record.name}`} title={lang === 'en' ? `Unban / Unlock account ${record.name}` : `Mở khóa / Unban tài khoản ${record.name}`}><Icon name="unlock" /><span>{lang === 'en' ? 'Unban / Unlock' : 'Mở khóa / Unban'}</span></button>)}{(collection === 'farms' || collection === 'zones' || collection === 'blocks' || collection === 'crops' || collection === 'rules') && (record.status === 'ACTIVE' ? <button className="admin-action-toggle-btn danger" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'INACTIVE' })} aria-label={lang === 'en' ? `Deactivate ${record.name}` : `${collection === 'crops' ? 'Ngừng sử dụng' : collection === 'rules' ? 'Ngừng áp dụng' : 'Tạm ngưng'} ${record.name}`} title={lang === 'en' ? `Deactivate ${record.name}` : `${collection === 'crops' ? 'Ngừng sử dụng' : collection === 'rules' ? 'Ngừng áp dụng' : 'Tạm ngưng'} ${record.name}`}><Icon name="ban" /><span>{lang === 'en' ? 'Deactivate' : (collection === 'crops' ? 'Ngừng sử dụng' : collection === 'rules' ? 'Ngừng áp dụng' : 'Tạm ngưng')}</span></button> : <button className="admin-action-toggle-btn primary" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'ACTIVE' })} aria-label={lang === 'en' ? `Activate ${record.name}` : `Kích hoạt ${record.name}`} title={lang === 'en' ? `Activate ${record.name}` : `Kích hoạt ${record.name}`}><Icon name="check-circle" /><span>{lang === 'en' ? 'Activate' : 'Kích hoạt'}</span></button>)}{collection === 'articles' && (record.status === 'APPROVED' ? <button className="admin-action-toggle-btn danger" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'ARCHIVED' })} aria-label={lang === 'en' ? `Archive / unpublish ${record.name}` : `Lưu trữ / ngừng công bố ${record.name}`} title={lang === 'en' ? `Deactivate / Archive ${record.name}` : `Ngừng công bố / lưu trữ ${record.name}`}><Icon name="ban" /><span>{lang === 'en' ? 'Deactivate' : 'Ngừng đăng'}</span></button> : <button className="admin-action-toggle-btn primary" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'APPROVED' })} aria-label={lang === 'en' ? `Approve and publish ${record.name}` : `Duyệt và công bố ${record.name}`} title={lang === 'en' ? `Activate / Publish ${record.name}` : `Duyệt và công bố ${record.name}`}><Icon name="check-circle" /><span>{lang === 'en' ? 'Activate' : 'Duyệt đăng'}</span></button>)}{collection === 'compliance' && (<>{record.status !== 'NEEDS_REVIEW' && <button className="table-icon-btn condition" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'NEEDS_REVIEW' })} aria-label={lang === 'en' ? `Flag for review ${record.name}` : `Cần rà soát VietGAP ${record.name}`} title={lang === 'en' ? `Flag for review ${record.name}` : `Cần rà soát VietGAP ${record.name}`}><Icon name="warning" /></button>}{record.status === 'ACTIVE' ? <button className="admin-action-toggle-btn danger" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'CANCELLED' })} aria-label={lang === 'en' ? `Deactivate ${record.name}` : `Tạm ngưng mùa vụ ${record.name}`} title={lang === 'en' ? `Deactivate season ${record.name}` : `Tạm ngưng mùa vụ ${record.name}`}><Icon name="ban" /><span>{lang === 'en' ? 'Deactivate' : 'Tạm ngưng'}</span></button> : <button className="admin-action-toggle-btn primary" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'ACTIVE' })} aria-label={lang === 'en' ? `Activate ${record.name}` : `Kích hoạt mùa vụ ${record.name}`} title={lang === 'en' ? `Activate season ${record.name}` : `Kích hoạt mùa vụ ${record.name}`}><Icon name="check-circle" /><span>{lang === 'en' ? 'Activate' : 'Kích hoạt'}</span></button>}</>)}{collection === 'registrations' && (record.status === 'PENDING' ? (<><button className="admin-action-toggle-btn primary" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'APPROVED' })} aria-label={lang === 'en' ? `Approve registration ${record.name}` : `Duyệt hồ sơ ${record.name}`} title={lang === 'en' ? `Approve registration ${record.name}` : `Duyệt hồ sơ ${record.name}`}><Icon name="check-circle" /><span>{lang === 'en' ? 'Approve' : 'Duyệt'}</span></button><button className="admin-action-toggle-btn danger" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'REJECTED' })} aria-label={lang === 'en' ? `Reject registration ${record.name}` : `Từ chối hồ sơ ${record.name}`} title={lang === 'en' ? `Reject registration ${record.name}` : `Từ chối hồ sơ ${record.name}`}><Icon name="close" /><span>{lang === 'en' ? 'Reject' : 'Từ chối'}</span></button></>) : record.status === 'APPROVED' ? <button className="admin-action-toggle-btn danger" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'CANCELLED' })} aria-label={lang === 'en' ? `Deactivate registration ${record.name}` : `Tạm ngưng hồ sơ ${record.name}`} title={lang === 'en' ? `Deactivate registration ${record.name}` : `Tạm ngưng hồ sơ ${record.name}`}><Icon name="ban" /><span>{lang === 'en' ? 'Deactivate' : 'Tạm ngưng'}</span></button> : <button className="admin-action-toggle-btn primary" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'APPROVED' })} aria-label={lang === 'en' ? `Activate registration ${record.name}` : `Kích hoạt hồ sơ ${record.name}`} title={lang === 'en' ? `Activate / Approve ${record.name}` : `Kích hoạt / Duyệt ${record.name}`}><Icon name="check-circle" /><span>{lang === 'en' ? 'Activate' : 'Kích hoạt'}</span></button>)}{collection === 'feedback' && (record.status !== 'RESOLVED' ? <button className="admin-action-toggle-btn primary" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'RESOLVED' })} aria-label={lang === 'en' ? `Mark resolved ${record.name}` : `Đánh dấu đã giải quyết ${record.name}`} title={lang === 'en' ? `Mark resolved ${record.name}` : `Đánh dấu đã giải quyết ${record.name}`}><Icon name="check-circle" /><span>{lang === 'en' ? 'Resolve' : 'Giải quyết'}</span></button> : <button className="admin-action-toggle-btn danger" onClick={() => setDialog({ mode: 'action', id: record.id, status: 'OPEN' })} aria-label={lang === 'en' ? `Reopen feedback ${record.name}` : `Mở lại phản hồi ${record.name}`} title={lang === 'en' ? `Reopen feedback ${record.name}` : `Mở lại phản hồi ${record.name}`}><Icon name="refresh" /><span>{lang === 'en' ? 'Reopen' : 'Mở lại'}</span></button>)}</div></td></tr>)}</tbody></table></div> : <AdminEmpty />}
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
    </div><div className="admin-modal-footer"><small className="admin-required-note"><span aria-hidden="true">*</span> {lang === 'en' ? 'Required information' : 'Thông tin bắt buộc'}</small><Button className="ui-cancel-button" variant="secondary" type="button" onClick={close} disabled={submitting}>{(lang === 'en' ? "Cancel" : "Hủy")}</Button>{dialog.mode === 'edit' && record && <RecordActions collection={collection} record={record} change={change} hideEdit />}<Button variant="primary" type="submit" loading={submitting}>{(lang === 'en' ? collection === 'articles' ? "Save draft" : "Save changes" : collection === 'articles' ? 'Lưu bản nháp' : 'Lưu thay đổi')}</Button></div></form></AdminModal>;
  }

  if (!record) return null;

  if (dialog.mode === 'action') {
    const isReject = collection === 'registrations' && dialog.status === 'REJECTED';
    const isCancelReg = collection === 'registrations' && dialog.status === 'CANCELLED';
    const isLockUser = collection === 'users' && dialog.status === 'LOCKED';
    const isUnlockUser = collection === 'users' && dialog.status === 'ACTIVE';
    const isDeactivate = ['farms', 'zones', 'blocks', 'crops', 'rules'].includes(collection) && dialog.status === 'INACTIVE';
    const isActivate = ['farms', 'zones', 'blocks', 'crops', 'rules'].includes(collection) && dialog.status === 'ACTIVE';
    const isResolveFeedback = collection === 'feedback' && dialog.status === 'RESOLVED';

    const getActionTitle = () => {
      if (collection === 'users') {
        return isLockUser
          ? (lang === 'en' ? 'Lock / Ban User Account' : 'Khóa / Ban tài khoản người dùng')
          : (lang === 'en' ? 'Unlock / Unban User Account' : 'Mở khóa / Unban tài khoản người dùng');
      }
      if (collection === 'registrations') {
        if (isReject) return lang === 'en' ? 'Reject Farm Registration' : 'Từ chối hồ sơ đăng ký';
        if (isCancelReg) return lang === 'en' ? 'Deactivate Farm Registration' : 'Tạm ngưng hồ sơ đăng ký';
        return lang === 'en' ? 'Approve / Activate Farm Registration' : 'Duyệt hồ sơ đăng ký trang trại';
      }
      if (collection === 'crops') {
        return isDeactivate
          ? (lang === 'en' ? 'Deactivate Crop Category' : 'Ngừng sử dụng danh mục cây trồng')
          : (lang === 'en' ? 'Activate Crop Category' : 'Kích hoạt sử dụng danh mục cây trồng');
      }
      if (collection === 'rules') {
        return isDeactivate
          ? (lang === 'en' ? 'Deactivate Checklist Rule' : 'Ngừng áp dụng quy tắc bảng kiểm')
          : (lang === 'en' ? 'Activate Checklist Rule' : 'Kích hoạt áp dụng quy tắc bảng kiểm');
      }
      if (collection === 'farms' || collection === 'zones' || collection === 'blocks') {
        const entityLabel = collection === 'farms' ? (lang === 'en' ? 'Farm' : 'trang trại') : collection === 'zones' ? (lang === 'en' ? 'Zone' : 'phân khu') : (lang === 'en' ? 'Block' : 'lô đất');
        return isDeactivate
          ? (lang === 'en' ? `Deactivate ${entityLabel}` : `Tạm ngưng hoạt động ${entityLabel}`)
          : (lang === 'en' ? `Activate ${entityLabel}` : `Kích hoạt hoạt động ${entityLabel}`);
      }
      if (collection === 'compliance') {
        if (dialog.status === 'NEEDS_REVIEW') return lang === 'en' ? 'Flag for VietGAP Review' : 'Cần rà soát VietGAP';
        if (dialog.status === 'HARVESTED') return lang === 'en' ? 'Mark Harvested' : 'Đánh dấu đã thu hoạch';
        if (dialog.status === 'CANCELLED') return lang === 'en' ? 'Deactivate / Cancel Season' : 'Tạm ngưng / hủy mùa vụ';
        return lang === 'en' ? 'Activate / Mark Growing' : 'Kích hoạt / đánh dấu đang canh tác';
      }
      if (collection === 'articles') {
        return dialog.status === 'ARCHIVED'
          ? (lang === 'en' ? 'Deactivate / Archive Article' : 'Lưu trữ / ngừng công bố bài viết')
          : (lang === 'en' ? 'Approve and Publish Article' : 'Duyệt và công bố bài viết');
      }
      if (collection === 'feedback') {
        return isResolveFeedback
          ? (lang === 'en' ? 'Resolve AI Feedback' : 'Đánh dấu giải quyết phản hồi AI')
          : (lang === 'en' ? 'Reopen AI Feedback' : 'Mở lại phản hồi AI');
      }
      return config.statuses[dialog.status] || (lang === 'en' ? 'Update Status' : 'Đổi trạng thái');
    };

    const getActionQuestion = () => {
      if (collection === 'users') {
        return isLockUser
          ? (lang === 'en' ? `Are you sure you want to lock/ban the account for "${record.name}"?` : `Bạn có chắc chắn muốn khóa (ban) tài khoản đối với "${record.name}"?`)
          : (lang === 'en' ? `Are you sure you want to unlock/unban the account for "${record.name}"?` : `Bạn có chắc chắn muốn mở khóa (unban) tài khoản đối với "${record.name}"?`);
      }
      if (collection === 'registrations') {
        if (isReject) return lang === 'en' ? `Are you sure you want to reject registration for "${record.name}"?` : `Bạn có chắc chắn muốn từ chối hồ sơ đăng ký của "${record.name}"?`;
        if (isCancelReg) return lang === 'en' ? `Are you sure you want to deactivate registration for "${record.name}"?` : `Bạn có chắc chắn muốn tạm ngưng hồ sơ đăng ký của "${record.name}"?`;
        return lang === 'en' ? `Are you sure you want to approve/activate registration for "${record.name}"?` : `Bạn có chắc chắn muốn phê duyệt / kích hoạt hồ sơ đăng ký của "${record.name}"?`;
      }
      if (collection === 'compliance' && dialog.status === 'CANCELLED') {
        return lang === 'en'
          ? `Are you sure you want to deactivate season "${record.name}"?`
          : `Bạn có chắc chắn muốn tạm ngưng mùa vụ "${record.name}"?`;
      }
      if (collection === 'feedback') {
        return isResolveFeedback
          ? (lang === 'en' ? `Confirm resolving AI feedback "${record.name}"?` : `Xác nhận đánh dấu đã giải quyết phản hồi "${record.name}"?`)
          : (lang === 'en' ? `Are you sure you want to reopen feedback "${record.name}"?` : `Bạn có chắc chắn muốn mở lại phản hồi "${record.name}"?`);
      }
      if (isDeactivate) {
        return lang === 'en'
          ? `Are you sure you want to deactivate "${record.name}"?`
          : (collection === 'crops'
              ? `Bạn có chắc chắn muốn ngừng sử dụng danh mục cây trồng "${record.name}"?`
              : collection === 'rules'
                ? `Bạn có chắc chắn muốn ngừng áp dụng quy tắc bảng kiểm "${record.name}"?`
                : `Bạn có chắc chắn muốn tạm ngưng hoạt động đối với "${record.name}"?`);
      }
      if (isActivate) {
        return lang === 'en'
          ? `Are you sure you want to activate "${record.name}"?`
          : (collection === 'crops'
              ? `Bạn có chắc chắn muốn kích hoạt sử dụng lại danh mục cây trồng "${record.name}"?`
              : collection === 'rules'
                ? `Bạn có chắc chắn muốn kích hoạt áp dụng quy tắc bảng kiểm "${record.name}"?`
                : `Bạn có chắc chắn muốn kích hoạt hoạt động đối với "${record.name}"?`);
      }
      return lang === 'en'
        ? `Are you sure you want to update status for "${record.name}"?`
        : `Bạn có chắc chắn muốn cập nhật trạng thái đối với "${record.name}"?`;
    };

    const getConfirmButtonLabel = () => {
      if (collection === 'users') {
        return isLockUser
          ? (lang === 'en' ? (submitting ? 'Locking...' : 'Lock account') : (submitting ? 'Đang khóa...' : 'Khóa tài khoản'))
          : (lang === 'en' ? (submitting ? 'Unlocking...' : 'Unlock account') : (submitting ? 'Đang mở khóa...' : 'Mở khóa tài khoản'));
      }
      if (collection === 'registrations') {
        if (isReject) return lang === 'en' ? (submitting ? 'Rejecting...' : 'Reject registration') : (submitting ? 'Đang từ chối...' : 'Từ chối hồ sơ');
        if (isCancelReg) return lang === 'en' ? (submitting ? 'Deactivating...' : 'Deactivate') : (submitting ? 'Đang xử lý...' : 'Tạm ngưng');
        return lang === 'en' ? (submitting ? 'Approving...' : 'Approve registration') : (submitting ? 'Đang duyệt...' : 'Duyệt hồ sơ');
      }
      if (collection === 'compliance' && dialog.status === 'CANCELLED') {
        return lang === 'en' ? (submitting ? 'Deactivating...' : 'Deactivate') : (submitting ? 'Đang xử lý...' : 'Tạm ngưng');
      }
      if (isDeactivate) {
        const textVi = collection === 'crops' ? 'Ngừng sử dụng' : collection === 'rules' ? 'Ngừng áp dụng' : 'Tạm ngưng';
        return lang === 'en' ? (submitting ? 'Deactivating...' : 'Deactivate') : (submitting ? 'Đang xử lý...' : textVi);
      }
      if (isActivate) {
        return lang === 'en' ? (submitting ? 'Activating...' : 'Activate') : (submitting ? 'Đang xử lý...' : 'Kích hoạt');
      }
      return lang === 'en' ? (submitting ? 'Processing...' : 'Confirm') : (submitting ? 'Đang xử lý...' : 'Xác nhận');
    };

    const danger = ['REJECTED', 'LOCKED', 'INACTIVE', 'ARCHIVED', 'CANCELLED'].includes(dialog.status);
    const actionIcon = isLockUser ? 'lock' : isUnlockUser ? 'unlock' : (danger ? 'ban' : 'check-circle');

    return (
      <AdminModal title={getActionTitle()} close={() => { if (!submitting) close(); }}>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (collection === 'registrations' && record.status === 'PENDING' && (dialog.status === 'APPROVED' || dialog.status === 'REJECTED')) {
            submit({ type: 'review', collection, id: record.id, status: dialog.status, reason });
          } else if (collection === 'feedback' && dialog.status === 'RESOLVED') {
            submit({ type: 'feedback', collection: 'feedback', id: record.id, status: 'RESOLVED', reply: reply.trim() || 'Đã ghi nhận góp ý và cập nhật nguồn kiến thức.' });
          } else {
            submit({ type: 'status', collection: collection as StatusCollection, id: record.id, status: dialog.status, reason });
          }
        }}>
          <div className="admin-modal-body">
            <p>{getActionQuestion()}</p>
            {collection === 'registrations' && !isReject && !isCancelReg && (
              <p className="admin-inline-note">
                {lang === 'en'
                  ? 'Approving a registration activates the farm and grants the applicant farm owner access. The farm and owner permissions are created after approval succeeds.'
                  : 'Theo quy trình chính thức, duyệt hồ sơ sẽ kích hoạt trang trại và cấp quyền chủ trang trại cho người đăng ký. Trang trại và quyền chủ trang trại được tạo trên hệ thống sau khi duyệt thành công.'}
              </p>
            )}
            {collection === 'users' && isLockUser && (
              <p className="admin-inline-note">
                {lang === 'en'
                  ? 'Locking an account immediately blocks system access and disables login sessions until unlocked by an administrator.'
                  : 'Khóa tài khoản sẽ lập tức chặn quyền đăng nhập vào hệ thống; toàn bộ phiên làm việc của người dùng này sẽ bị vô hiệu hóa cho đến khi được mở khóa.'}
              </p>
            )}
            {collection === 'users' && isUnlockUser && (
              <p className="admin-inline-note">
                {lang === 'en'
                  ? 'Unlocking this account restores normal access and enables the user to sign in again.'
                  : 'Mở khóa tài khoản sẽ khôi phục toàn bộ quyền truy cập và cho phép người dùng đăng nhập trở lại bình thường.'}
              </p>
            )}
            {(collection === 'crops' || collection === 'rules' || collection === 'farms' || collection === 'zones' || collection === 'blocks' || collection === 'compliance') && (
              <p className="admin-inline-note">
                {lang === 'en'
                  ? `Historical records and audit logs referencing this ${translate(config.singular)} are permanently preserved.`
                  : `Dữ liệu lịch sử và nhật ký kiểm toán đã tham chiếu đến ${translate(config.singular)} này được giữ nguyên toàn vẹn.`}
              </p>
            )}
            {isReject && (
              <AdminField
                field={{ key: 'reason', label: lang === 'en' ? 'Rejection Reason' : 'Lý do từ chối', type: 'textarea', required: true, maxLength: 1000 }}
                value={reason}
                onChange={setReason}
              />
            )}
            {isLockUser && (
              <AdminField
                field={{ key: 'reason', label: lang === 'en' ? 'Lock Reason (optional/violation details)' : 'Lý do khóa tài khoản (chi tiết vi phạm)', type: 'textarea', maxLength: 1000 }}
                value={reason}
                onChange={setReason}
              />
            )}
            {isResolveFeedback && (
              <AdminField
                field={{ key: 'reply', label: lang === 'en' ? 'Resolution Note / Reply' : 'Nội dung phản hồi / giải quyết', type: 'textarea', maxLength: 3000 }}
                value={reply}
                onChange={setReply}
              />
            )}
            {error && <p role="alert" className="admin-form-error">{translateAdminError(error, lang)}</p>}
          </div>
          <div className="admin-modal-footer">
            <Button className="ui-cancel-button" variant="secondary" type="button" onClick={close} disabled={submitting}>
              {lang === 'en' ? 'Cancel' : 'Hủy'}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} type="submit" loading={submitting}>
              <Icon name={actionIcon} />
              {getConfirmButtonLabel()}
            </Button>
          </div>
        </form>
      </AdminModal>
    );
  }

  const seenKeys = new Set<string>(['name']);
  const details = [...config.fields, ...(config.details ?? [])].filter((field) => {
    if (collection === 'registrations' && ['reviewer', 'reviewedAt', 'reason'].includes(field.key) && !record[field.key]) return false;
    if (field.key === 'lockReason' && record.status !== 'LOCKED' && !record.lockReason) return false;
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
        {collection === 'crops' ? <div className="admin-crop-name-row"><span>{record.name || '—'}</span><AdminBadge collection={collection} status={record.status} /></div> : <div>{record.name || '—'}</div>}
      </div>
      {collection !== 'crops' && <AdminBadge collection={collection} status={record.status} />}
    </div>
    <dl className="admin-details">{details.map(field => <div key={field.key} className={field.type === 'textarea' || ['growthDays', 'lockReason', 'question', 'answer', 'comment', 'reply', 'description', 'reason', 'source', 'document', 'blocksSummary', 'zoneSummary', 'staffSummary', 'farmsSummary', 'zonesSummary', 'assessmentNote'].includes(field.key) ? 'full' : ''}><dt>{translate(field.label)}</dt><dd>{field.key === 'document' && record[field.key] ? (() => {
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

function RecordActions({ collection, record, change, hideEdit = false }: { collection: Collection; record: AdminRecord; change: (dialog: DialogState) => void; hideEdit?: boolean }) {
  const { lang } = useLanguage();
  const action = (status: string) => change({ mode: 'action', id: record.id, status });
  if (collection === 'registrations') {
    return <>
      {!hideEdit && <Button className="ui-edit-action" variant="secondary" type="button" onClick={() => change({ mode: 'edit', id: record.id })}><Icon name="edit" />{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>}
      {record.status === 'PENDING' ? <>
        <Button variant="danger" type="button" onClick={() => action('REJECTED')}><Icon name="close" />{(lang === 'en' ? "Reject" : "Từ chối")}</Button>
        <Button variant="primary" type="button" onClick={() => action('APPROVED')}><Icon name="check-circle" />{(lang === 'en' ? "Approve registration" : "Duyệt hồ sơ")}</Button>
      </> : record.status === 'APPROVED' ? (
        <Button variant="danger" type="button" onClick={() => action('CANCELLED')}><Icon name="ban" />{(lang === 'en' ? "Deactivate" : "Tạm ngưng")}</Button>
      ) : (
        <Button variant="primary" type="button" onClick={() => action('APPROVED')}><Icon name="check-circle" />{(lang === 'en' ? "Activate" : "Kích hoạt")}</Button>
      )}
    </>;
  }
  if (collection === 'users') {
    return <>
      {!hideEdit && <Button className="ui-edit-action" variant="secondary" type="button" onClick={() => change({ mode: 'edit', id: record.id })}><Icon name="edit" />{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>}
      {record.role === 'ADMIN'
        ? <span className="admin-subtle">{(lang === 'en' ? "Administrator accounts are protected in this preview." : "Tài khoản quản trị được bảo vệ trong bản xem trước.")}</span>
        : <Button variant={record.status === 'ACTIVE' ? 'danger' : 'primary'} type="button" onClick={() => action(record.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE')}>
            <Icon name={record.status === 'ACTIVE' ? 'lock' : 'unlock'} />
            {(lang === 'en' ? record.status === 'ACTIVE' ? "Lock account" : "Unlock account" : record.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản')}
          </Button>}
    </>;
  }
  if (collection === 'compliance') {
    return <>
      {!hideEdit && <Button className="ui-edit-action" variant="secondary" type="button" onClick={() => change({ mode: 'edit', id: record.id })}><Icon name="edit" />{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>}
      {record.status !== 'NEEDS_REVIEW' && (
        <Button variant="danger" type="button" onClick={() => action('NEEDS_REVIEW')}><Icon name="warning" />{(lang === 'en' ? "Flag for VietGAP review" : "Cần rà soát VietGAP")}</Button>
      )}
      {record.status !== 'CANCELLED' && (
        <Button variant="danger" type="button" onClick={() => action('CANCELLED')}><Icon name="ban" />{(lang === 'en' ? "Deactivate" : "Tạm ngưng")}</Button>
      )}
      {record.status !== 'HARVESTED' && (
        <Button variant="primary" type="button" onClick={() => action('HARVESTED')}><Icon name="check-circle" />{(lang === 'en' ? "Mark Harvested" : "Đã thu hoạch")}</Button>
      )}
      {record.status !== 'ACTIVE' && (
        <Button variant="primary" type="button" onClick={() => action('ACTIVE')}><Icon name="leaf" />{(lang === 'en' ? "Mark Growing" : "Đang canh tác")}</Button>
      )}
    </>;
  }
  if (collection === 'farms' || collection === 'zones' || collection === 'blocks' || collection === 'crops' || collection === 'rules') {
    const isAct = record.status === 'ACTIVE';
    const deactLabelEn = 'Deactivate';
    const deactLabelVi = (collection === 'crops') ? 'Ngừng sử dụng' : (collection === 'rules') ? 'Ngừng áp dụng' : 'Tạm ngưng';
    const actLabelEn = 'Activate';
    const actLabelVi = 'Kích hoạt';

    return <>
      {!hideEdit && <Button className="ui-edit-action" variant="secondary" type="button" onClick={() => change({ mode: 'edit', id: record.id })}><Icon name="edit" />{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>}
      <Button
        variant={isAct ? 'danger' : 'primary'}
        type="button"
        onClick={() => action(isAct ? 'INACTIVE' : 'ACTIVE')}
      >
        <Icon name={isAct ? 'ban' : 'check-circle'} />
        {lang === 'en' ? (isAct ? deactLabelEn : actLabelEn) : (isAct ? deactLabelVi : actLabelVi)}
      </Button>
    </>;
  }
  if (collection === 'articles') {
    return <>
      {!hideEdit && <Button className="ui-edit-action" variant="secondary" type="button" onClick={() => change({ mode: 'edit', id: record.id })}><Icon name="edit" />{(lang === 'en' ? "Edit" : "Chỉnh sửa")}</Button>}
      {record.status !== 'ARCHIVED' && <Button variant="danger" type="button" onClick={() => action('ARCHIVED')}><Icon name="ban" />{(lang === 'en' ? "Archive / unpublish" : "Lưu trữ / ngừng công bố")}</Button>}
      {record.status !== 'APPROVED' && <Button variant="primary" type="button" onClick={() => action('APPROVED')}><Icon name="check-circle" />{(lang === 'en' ? "Approve and publish" : "Duyệt và công bố")}</Button>}
    </>;
  }
  return null;
}
