import { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getFarms, type FarmSummary } from '../features/farm-management/api';
import { fetchMyRegistrations } from '../features/farm-management/registrationService';
import { useOptionalFarmWorkspace } from '../features/farm-management/FarmWorkspace';
import { fetchMyFarmInvitations, respondFarmInvitation, type FarmInvitation } from '../features/staff/staffService';
import { PageHeading } from '../shared/components/PageHeading';
import { EmptyState } from '../shared/components/EmptyState';
import { LoadError } from '../shared/components/LoadError';
import { Button } from '../shared/components/Button';
import { Icon } from '../shared/components/Icon';
import { StatusBadge, type BadgeTone } from '../shared/components/StatusBadge';
import { TablePagination } from '../shared/components/TablePagination';
import { useApiData } from '../shared/hooks/useApiData';
import { usePagination } from '../shared/hooks/usePagination';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { formatDate } from '../shared/format/formatters';

const registrationTones: Record<string, BadgeTone> = {
  invited: 'warning', approved: 'success', pending: 'warning', rejected: 'danger', cancelled: 'neutral',
};

export function ManageFarmsPage() {
  const { lang, t } = useLanguage();
  const location = useLocation();
  const workspace = useOptionalFarmWorkspace();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const load = useCallback(async (signal: AbortSignal) => {
    const loadFarms = async () => {
      const farms: FarmSummary[] = [];
      for (let page = 0; ; page++) {
        const result = await getFarms(signal, page);
        // GET /farms already checks active membership, including farms whose
        // operational status means they cannot be selected as a workspace.
        farms.push(...result.items);
        if (result.last || page + 1 >= result.totalPages) return farms;
      }
    };
    const [farms, registrations, invitations] = await Promise.all([
      loadFarms(),
      fetchMyRegistrations(signal),
      fetchMyFarmInvitations().catch(() => [] as FarmInvitation[]),
    ]);
    return { farms, registrations, invitations };
  }, []);
  const { data, loading, error, retry } = useApiData(load);
  const isOwner = data?.farms.some(farm => farm.currentUserRole?.toUpperCase() === 'OWNER') ?? false;
  const pendingInvitations = data?.invitations ?? [];

  const handleRespondInvitation = async (inv: FarmInvitation, action: 'approve' | 'reject') => {
    setRespondingId(inv.memberId);
    setInviteFeedback(null);
    try {
      await respondFarmInvitation(inv.memberId, action);
      setInviteFeedback({
        type: 'success',
        text: action === 'approve'
          ? (lang === 'en'
            ? `You have joined "${inv.farmName}" successfully.`
            : `Bạn đã đồng ý tham gia trang trại "${inv.farmName}" thành công.`)
          : (lang === 'en'
            ? `You have declined the invitation to "${inv.farmName}".`
            : `Bạn đã từ chối lời mời tham gia trang trại "${inv.farmName}".`),
      });
      retry();
      if (action === 'approve') {
        workspace?.retry();
      }
    } catch (err) {
      setInviteFeedback({
        type: 'error',
        text: err instanceof Error
          ? err.message
          : (lang === 'en' ? 'Unable to respond to invitation.' : 'Không thể phản hồi lời mời tham gia trang trại.'),
      });
    } finally {
      setRespondingId(null);
    }
  };

  // Application IDs must never be used as farm IDs.
  const rows = [
    ...pendingInvitations.map(inv => ({
      key: `invitation-${inv.memberId}`,
      name: inv.farmName,
      address: inv.farmAddress || '',
      date: inv.invitedAt || '',
      code: '',
      role: inv.farmRole?.toUpperCase() === 'OWNER' ? 'OWNER' : 'STAFF',
      status: 'invited',
      kind: 'farms.invitationRecord',
      href: '',
      invitation: inv as FarmInvitation | undefined,
    })),
    ...(data?.farms ?? []).map(farm => ({
      key: `farm-${farm.id}`,
      name: farm.farmName,
      address: farm.address || [farm.district, farm.province].filter(Boolean).join(', '),
      date: farm.createdAt || '',
      code: farm.farmCode || `FARM-${String(farm.id).padStart(3, '0')}`,
      role: farm.currentUserRole?.toUpperCase() ?? '',
      status: 'approved',
      kind: 'farms.farmRecord',
      href: `/farms/${farm.id}`,
      invitation: undefined as FarmInvitation | undefined,
    })),
    ...(data?.registrations ?? []).filter(registration => registration.status !== 'approved').map(registration => ({
      key: `registration-${registration.farmRegistrationId}`,
      name: registration.proposedFarmName,
      address: registration.address,
      date: registration.submittedAt,
      code: '',
      role: '',
      status: registration.status,
      kind: 'farms.registrationRecord',
      href: `/farms/registrations/${registration.farmRegistrationId}`,
      invitation: undefined as FarmInvitation | undefined,
    })),
  ].sort((a, b) => {
    const aInvited = Number(a.status === 'invited');
    const bInvited = Number(b.status === 'invited');
    if (aInvited !== bInvited) return bInvited - aInvited;
    const submittedKey = `registration-${location.state?.submittedRegistrationId}`;
    return Number(b.key === submittedKey) - Number(a.key === submittedKey);
  });
  const filtered = rows.filter(row => (!role || row.role === role) && (!status || row.status === status)
    && `${row.name} ${row.address} ${row.code}`.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase()));
  const pagination = usePagination(filtered, JSON.stringify([keyword, status, role]));
  const create = <Link className="ui-button ui-button--primary" to="/farms/new"><Icon name="plus" />{t(isOwner ? 'farms.add' : 'farms.register')}</Link>;
  return <section className="farm-registration-page">
    <PageHeading title={t('Farm Management')} description={t('farms.description')}>
      {!loading && !error && create}
    </PageHeading>
    {location.state?.registrationSubmitted && <p role="status" className="panel">{t('farm.registration.submitted')}</p>}
    {inviteFeedback && (
      <div
        role={inviteFeedback.type === 'error' ? 'alert' : 'status'}
        className="panel"
        style={{
          marginBottom: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderLeft: `4px solid ${inviteFeedback.type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
          background: inviteFeedback.type === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
          color: inviteFeedback.type === 'error' ? 'var(--color-danger-text)' : 'var(--color-primary-text)',
          fontWeight: 500,
        }}
      >
        <span>{inviteFeedback.text}</span>
        <button type="button" onClick={() => setInviteFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }} aria-label="Close">×</button>
      </div>
    )}
    {!loading && !error && pendingInvitations.length > 0 && (
      <div
        role="status"
        className="panel"
        style={{
          marginBottom: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderLeft: '4px solid #d97706',
          background: 'rgba(245, 158, 11, 0.08)',
          color: 'var(--color-text)',
          fontSize: 14,
        }}
      >
        <Icon name="bell" size={18} />
        <span>
          {lang === 'en'
            ? `You have ${pendingInvitations.length} pending farm invitation(s). Please accept or decline in the list below.`
            : `Bạn có ${pendingInvitations.length} lời mời tham gia trang trại đang chờ xác nhận. Vui lòng chọn Đồng ý hoặc Không đồng ý trong danh sách bên dưới.`}
        </span>
      </div>
    )}
    {loading ? <EmptyState className="panel" title={t('farms.loading')} icon={<Icon name="loader" />} />
      : error ? <LoadError message={error} onRetry={retry} />
        : <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <input className="ui-input" style={{ flex: '1 1 320px', minWidth: 0 }} aria-label={t('farms.search')} placeholder={t('farms.search')} value={keyword} onChange={event => setKeyword(event.target.value)} />
            <select className="ui-select" style={{ width: 'auto', flex: '0 1 220px' }} aria-label={t('farms.statusFilter')} value={status} onChange={event => setStatus(event.target.value)}>
              <option value="">{t('farms.allStatuses')}</option>
              {Object.keys(registrationTones).map(value => <option key={value} value={value}>{t(`farms.status.${value}`)}</option>)}
            </select>
            <select className="ui-select" style={{ width: 'auto' }} aria-label={t('farms.roleFilter')} value={role} onChange={event => setRole(event.target.value)}>
              <option value="">{t('farms.allRoles')}</option><option value="OWNER">{t('farms.owner')}</option><option value="STAFF">{t('farms.staff')}</option>
            </select>
            <Button variant="secondary" style={{ flexShrink: 0 }} onClick={retry} aria-label={t('farms.refresh')}><Icon name="refresh" /></Button>
          </div>
          {rows.length === 0 ? <EmptyState title={t('farms.empty')} action={create} /> : <>
            <div className="ui-table-scroll" tabIndex={0} role="region" aria-label={t('Farm Management')}>
              <table className="ui-data-table">
                <thead><tr>{['farms.number', 'farms.name', 'farms.address', 'farms.submittedAt', 'farms.statusFilter', 'farms.actions'].map(key => <th scope="col" key={key}>{t(key)}</th>)}</tr></thead>
                <tbody>{pagination.items.map((row, index) => <tr key={row.key}>
                  <td>{pagination.start + index}</td>
                  <td>
                    <strong>{row.name}</strong>
                    <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>
                      {t(row.kind)}
                      {row.invitation?.ownerName && (
                        <> · {lang === 'en' ? `Invited by ${row.invitation.ownerName.replace(/\s*\([^)]*\)\s*$/, '').trim()}` : `Người mời: ${row.invitation.ownerName.replace(/\s*\([^)]*\)\s*$/, '').trim()}`}</>
                      )}
                    </div>
                  </td>
                  <td>{row.address || t('farms.notProvided')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{row.date ? formatDate(row.date, lang) : t('farms.notProvided')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><StatusBadge tone={registrationTones[row.status] ?? 'neutral'} label={t(`farms.status.${row.status}`)} /></td>
                  <td style={{ whiteSpace: 'nowrap', overflowWrap: 'normal' }}><div className="table-action-btns" style={{ flexWrap: 'nowrap', gap: 8 }}>
                    {row.invitation ? (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          disabled={respondingId === row.invitation.memberId}
                          onClick={() => void handleRespondInvitation(row.invitation!, 'approve')}
                          style={{
                            padding: '6px 12px',
                            fontSize: 13,
                            minHeight: 34,
                            width: 'auto',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Icon name="check" size={14} />
                          <span>{lang === 'en' ? 'Accept' : 'Đồng ý'}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={respondingId === row.invitation.memberId}
                          onClick={() => void handleRespondInvitation(row.invitation!, 'reject')}
                          style={{
                            padding: '6px 12px',
                            fontSize: 13,
                            minHeight: 34,
                            width: 'auto',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Icon name="close" size={14} />
                          <span>{lang === 'en' ? 'Decline' : 'Từ chối'}</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link className="table-icon-btn primary" to={row.href} title={t('farms.view')} aria-label={`${t('farms.view')}: ${row.name}`}><Icon name="eye" size={15} /></Link>
                        {((row.role === 'OWNER' && row.key.startsWith('farm-')) || (row.key.startsWith('registration-') && row.status === 'pending')) && (
                          <Link
                            className="table-icon-btn edit"
                            to={`${row.href}?edit=1`}
                            title={row.key.startsWith('registration-')
                              ? (lang === 'en' ? 'Edit registration' : 'Chỉnh sửa đơn đăng ký')
                              : (lang === 'en' ? 'Edit farm' : 'Chỉnh sửa trang trại')}
                            aria-label={`${lang === 'en' ? 'Edit' : 'Chỉnh sửa'}: ${row.name}`}
                          >
                            <Icon name="edit" size={15} />
                          </Link>
                        )}
                      </>
                    )}
                  </div></td>
                </tr>)}{!filtered.length && <tr><td colSpan={6}><EmptyState title={t('farms.noMatches')} /></td></tr>}</tbody>
              </table>
            </div>
            <TablePagination {...pagination} />
          </>}
        </div>}
  </section>;
}
