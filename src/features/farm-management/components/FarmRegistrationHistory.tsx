import { useCallback } from 'react';
import { useAuth } from '../../auth';
import { fetchMyRegistrations, fetchMyRegistrationById } from '../registrationService';
import { useApiData } from '../../../shared/hooks/useApiData';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import { LoadError } from '../../../shared/components/LoadError';
import { FarmRegistrationStatus } from './FarmRegistrationStatus';

/** Account application history is kept separate from current farm data. */
export function FarmRegistrationHistory({ farmId }: { farmId: number }) {
  const { user } = useAuth();
  return <RegistrationHistory key={`${user?.userId}:${farmId}`} farmId={farmId} userId={user?.userId} />;
}

function RegistrationHistory({ userId }: { farmId: number; userId: number | undefined }) {
  const { t } = useLanguage();
  const load = useCallback((signal: AbortSignal) => fetchMyRegistrations(signal), [userId]);
  const { data, loading, error, retry } = useApiData(load);
  const approved = data?.filter(record => record.status === 'approved') ?? [];
  return <section id="farm-registration-documents" className="farm-registration-history" style={{ scrollMarginTop: 100 }}>
    {loading ? <p role="status">{t('farms.loading')}</p> : error ? <LoadError message={error} onRetry={retry} /> : <>
      {approved.length === 0 && <p>{t('farms.noApprovedRegistrations')}</p>}
      {approved.map(record => <section key={record.farmRegistrationId} aria-label={`#${record.farmRegistrationId} - ${record.proposedFarmName}`}>
        <SelectedRegistration id={record.farmRegistrationId} />
      </section>)}
    </>}
  </section>;
}

function SelectedRegistration({ id }: { id: string }) {
  const { t } = useLanguage();
  const load = useCallback((signal: AbortSignal) => fetchMyRegistrationById(id, signal), [id]);
  const { data, loading, error, retry } = useApiData(load);
  if (loading) return <p role="status">{t('farms.loading')}</p>;
  if (error) return <LoadError message={error} onRetry={retry} />;
  if (!data || data.status !== 'approved') return <p role="status">{t('farms.savedRegistrationUnavailable')}</p>;
  return <FarmRegistrationStatus evidenceOnly registration={data} cancelling={false} cancelError={null} onCancel={() => {}} onStartNew={() => {}} />;
}
