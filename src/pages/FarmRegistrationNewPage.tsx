import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FarmRegistrationForm } from '../features/farm-management/components/FarmRegistrationForm';
import { submitFarmRegistration } from '../features/farm-management/registrationService';
import type { FarmRegistrationFormValues } from '../features/farm-management/types';
import { PageHeading } from '../shared/components/PageHeading';
import { Icon } from '../shared/components/Icon';
import { useLanguage } from '../shared/i18n/LanguageContext';

export function FarmRegistrationNewPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function submit(values: FarmRegistrationFormValues) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const registration = await submitFarmRegistration(values);
      if (mounted.current) navigate('/farms', { state: { registrationSubmitted: true, submittedRegistrationId: registration.farmRegistrationId } });
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'farm.registration.failed');
    } finally { if (mounted.current) setSubmitting(false); }
  }
  return <section className="farm-registration-page">
    <PageHeading title={t('farm.registration.newTitle')}>
      <Link className="ui-button ui-button--secondary ui-navigation-action" to="/farms">
        <Icon name="arrow-left" size={16} />
        {t('farms.back')}
      </Link>
    </PageHeading>
    <FarmRegistrationForm submitting={submitting} submitError={error} onSubmit={submit} onCancel={() => navigate('/farms')} />
  </section>;
}
