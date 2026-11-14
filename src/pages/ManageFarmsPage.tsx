import { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getFarms, type FarmSummary } from '../features/farm-management/api';
import { fetchMyRegistrations } from '../features/farm-management/registrationService';
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
  approved: 'success', pending: 'warning', rejected: 'danger', cancelled: 'neutral',
};

export function ManageFarmsPage() {
  const { lang, t } = useLanguage();
  const location = useLocation();
  const [keyword, setKeyword] = useState('');
  const [layout, setLayout] = useState<'table' | 'cards'>('table');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
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
    const [farms, registrations] = await Promise.all([loadFarms(), fetchMyRegistrations(signal)]);
    return { farms, registrations };
  }, []);
  const { data, loading, error, retry } = useApiData(load);
  const isOwner = data?.farms.some(farm => farm.currentUserRole?.toUpperCase() === 'OWNER') ?? false;
  // Application IDs must never be used as farm IDs.
  const rows = [
    ...(data?.farms ?? []).map(farm => ({ key: `farm-${farm.id}`, name: farm.farmName,
      address: farm.address || [farm.district, farm.province].filter(Boolean).join(', '), date: farm.createdAt || '',
      code: farm.farmCode || `FARM-${String(farm.id).padStart(3, '0')}`, role: farm.currentUserRole?.toUpperCase() ?? '', status: 'approved', kind: 'farms.farmRecord', href: `/farms/${farm.id}` })),
    ...(data?.registrations ?? []).filter(registration => registration.status !== 'approved').map(registration => ({ key: `registration-${registration.farmRegistrationId}`,
      name: registration.proposedFarmName, address: registration.address, date: registration.submittedAt,
      code: '', role: '', status: registration.status, kind: 'farms.registrationRecord', href: `/farms/registrations/${registration.farmRegistrationId}` })),
  ].sort((a, b) => {
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
    {loading ? <EmptyState className="panel" title={t('farms.loading')} icon={<Icon name="loader" />} />
      : error ? <LoadError message={error} onRetry={retry} />
        : <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <input className="ui-input" style={{ flex: '1 1 240px' }} aria-label={t('farms.search')} placeholder={t('farms.search')} value={keyword} onChange={event => setKeyword(event.target.value)} />
            <select className="ui-select" style={{ width: 'auto', flex: '0 1 220px' }} aria-label={t('farms.statusFilter')} value={status} onChange={event => setStatus(event.target.value)}>
              <option value="">{t('farms.allStatuses')}</option>
              {Object.keys(registrationTones).map(value => <option key={value} value={value}>{t(`farms.status.${value}`)}</option>)}
            </select>
            <select className="ui-select" style={{ width: 'auto' }} aria-label={t('farms.roleFilter')} value={role} onChange={event => setRole(event.target.value)}>
              <option value="">{t('farms.allRoles')}</option><option value="OWNER">{t('farms.owner')}</option><option value="STAFF">{t('farms.staff')}</option>
            </select>
            <Button variant="secondary" aria-pressed={layout === 'table'} onClick={() => setLayout('table')}>{t('farms.tableView')}</Button>
            <Button variant="secondary" aria-pressed={layout === 'cards'} onClick={() => setLayout('cards')}>{t('farms.cardView')}</Button>
            <Button variant="secondary" style={{ flexShrink: 0 }} onClick={retry} aria-label={t('farms.refresh')}><Icon name="refresh" /></Button>
          </div>
          {rows.length === 0 ? <EmptyState title={t('farms.empty')} action={create} /> : <>
            {layout === 'cards' ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
              {pagination.items.map(row => <article className="panel" key={row.key}>
                <h2 style={{ fontSize: 18 }}>{row.name}</h2><p>{t(row.kind)}</p>
                <p>{row.address || t('farms.notProvided')}</p>
                <StatusBadge tone={registrationTones[row.status] ?? 'neutral'} label={t(`farms.status.${row.status}`)} />
                <p><Link className="ui-button ui-button--secondary" to={row.href}>{t('farms.view')}</Link></p>
              </article>)}
              {!filtered.length && <EmptyState title={t('farms.noMatches')} />}
            </div> : <div className="ui-table-scroll" tabIndex={0} role="region" aria-label={t('Farm Management')}>
              <table className="ui-data-table">
                <thead><tr>{['farms.number', 'farms.name', 'farms.address', 'farms.submittedAt', 'farms.statusFilter', 'farms.actions'].map(key => <th scope="col" key={key}>{t(key)}</th>)}</tr></thead>
                <tbody>{pagination.items.map((row, index) => <tr key={row.key}>
                  <td>{pagination.start + index}</td>
                  <td><strong>{row.name}</strong><div style={{ color: 'var(--color-muted)', fontSize: 12 }}>{t(row.kind)}</div></td>
                  <td>{row.address || t('farms.notProvided')}</td>
                  <td>{row.date ? formatDate(row.date, lang) : t('farms.notProvided')}</td>
                  <td><StatusBadge tone={registrationTones[row.status] ?? 'neutral'} label={t(`farms.status.${row.status}`)} /></td>
                  <td><div className="table-action-btns"><Link className="table-icon-btn primary" to={row.href} title={t('farms.view')} aria-label={`${t('farms.view')}: ${row.name}`}><Icon name="eye" /></Link></div></td>
                </tr>)}{!filtered.length && <tr><td colSpan={6}><EmptyState title={t('farms.noMatches')} /></td></tr>}</tbody>
              </table>
            </div>}
            <TablePagination {...pagination} />
          </>}
        </div>}
  </section>;
}
