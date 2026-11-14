import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FarmRegistrationStatus } from '../features/farm-management/components/FarmRegistrationStatus';
import { cancelFarmRegistration, fetchMyRegistrationById } from '../features/farm-management/registrationService';
import type { FarmRegistration } from '../features/farm-management/types';
import { useApiData } from '../shared/hooks/useApiData';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { PageHeading } from '../shared/components/PageHeading';
import { EmptyState } from '../shared/components/EmptyState';
import { LoadError } from '../shared/components/LoadError';

export function FarmRegistrationDetailPage() {
  const { registrationId = '' } = useParams();
  return <RegistrationDetail key={registrationId} id={registrationId} />;
}

function RegistrationDetail({ id }: { id: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const load = useCallback((signal: AbortSignal) => {
    if (!/^[1-9]\d*$/.test(id)) return Promise.reject(new Error(t('farms.invalidId')));
    return fetchMyRegistrationById(id, signal);
  }, [id, t]);
  const { data, loading, error, retry } = useApiData(load);
  const [updated, setUpdated] = useState<FarmRegistration>();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  async function cancel() {
    if (cancelling || (updated ?? data)?.status !== 'pending') return;
    setCancelling(true);
    setCancelError(null);
    try { setUpdated(await cancelFarmRegistration(id)); }
    catch (reason) { setCancelError(reason instanceof Error ? reason.message : t('farms.cancelError')); }
    finally { setCancelling(false); }
  }
  return <section className="farm-registration-page">
    <PageHeading title={t('farms.registrationRecord')}>
      <Link className="ui-button ui-button--secondary" to="/farms">{t('farms.back')}</Link>
    </PageHeading>
    {loading ? <EmptyState title={t('farms.loading')} /> : error ? <LoadError message={error} onRetry={retry} /> : data &&
      <FarmRegistrationStatus registration={updated ?? data} cancelling={cancelling} cancelError={cancelError}
        onCancel={() => void cancel()} onStartNew={() => navigate('/farms/new')} />}
  </section>;
}
