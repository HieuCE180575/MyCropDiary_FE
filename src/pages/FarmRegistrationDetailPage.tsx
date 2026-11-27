import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FarmRegistrationForm } from '../features/farm-management/components/FarmRegistrationForm';
import { FarmRegistrationStatus } from '../features/farm-management/components/FarmRegistrationStatus';
import { cancelFarmRegistration, fetchMyRegistrationById, updateMyRegistration } from '../features/farm-management/registrationService';
import type { FarmRegistration, FarmRegistrationFormValues } from '../features/farm-management/types';
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
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const load = useCallback((signal: AbortSignal) => {
    if (!/^[1-9]\d*$/.test(id)) return Promise.reject(new Error(t('farms.invalidId')));
    return fetchMyRegistrationById(id, signal);
  }, [id, t]);
  const { data, loading, error, retry } = useApiData(load);
  const [updated, setUpdated] = useState<FarmRegistration>();
  const [isEditing, setIsEditing] = useState(() => searchParams.get('edit') === '1');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const current = updated ?? data;

  async function cancel() {
    if (cancelling || current?.status !== 'pending') return;
    setCancelling(true);
    setCancelError(null);
    try { setUpdated(await cancelFarmRegistration(id)); }
    catch (reason) { setCancelError(reason instanceof Error ? reason.message : t('farms.cancelError')); }
    finally { setCancelling(false); }
  }

  async function saveEdit(values: FarmRegistrationFormValues) {
    if (savingEdit || current?.status !== 'pending') return;
    setSavingEdit(true);
    setEditError(null);
    setEditSuccess(null);
    try {
      const saved = await updateMyRegistration(id, values);
      setUpdated(saved);
      setIsEditing(false);
      if (searchParams.get('edit')) setSearchParams({});
      setEditSuccess(
        lang === 'en'
          ? 'Farm registration updated successfully.'
          : 'Đã cập nhật đơn đăng ký trang trại thành công.'
      );
    } catch (reason) {
      setEditError(
        reason instanceof Error
          ? reason.message
          : (lang === 'en' ? 'Unable to update farm registration.' : 'Không thể cập nhật đơn đăng ký trang trại.')
      );
    } finally {
      setSavingEdit(false);
    }
  }

  return <section className="farm-registration-page">
    <PageHeading
      title={isEditing && current?.status === 'pending'
        ? (lang === 'en' ? 'Edit Farm Registration' : 'Chỉnh sửa đơn đăng ký trang trại')
        : t('farms.registrationRecord')}
    >
      <Link className="ui-button ui-button--secondary" to="/farms">{t('farms.back')}</Link>
    </PageHeading>
    {editSuccess && (
      <div
        role="status"
        className="panel"
        style={{
          marginBottom: 14,
          padding: '12px 16px',
          borderLeft: '4px solid var(--color-primary)',
          background: 'var(--color-success-bg)',
          color: 'var(--color-primary-text)',
          fontWeight: 500,
        }}
      >
        {editSuccess}
      </div>
    )}
    {loading ? <EmptyState title={t('farms.loading')} /> : error ? <LoadError message={error} onRetry={retry} /> : current && (
      isEditing && current.status === 'pending' ? (
        <div className="panel">
          <FarmRegistrationForm
            initialValues={{
              proposedFarmName: current.proposedFarmName || '',
              address: current.address || '',
              province: current.province || '',
              district: current.district || '',
              ward: current.ward || '',
              latitude: current.latitude ?? null,
              longitude: current.longitude ?? null,
              boundaryCoordinates: current.boundaryCoordinates || '',
              documentUrl: current.documentUrl || '',
              description: current.description || '',
            }}
            submitLabel={lang === 'en' ? 'Save Changes' : 'Lưu thay đổi'}
            submittingLabel={lang === 'en' ? 'Saving changes...' : 'Đang lưu thay đổi...'}
            submitting={savingEdit}
            submitError={editError}
            onSubmit={(values) => void saveEdit(values)}
            onCancel={() => {
              setIsEditing(false);
              setEditError(null);
              if (searchParams.get('edit')) setSearchParams({});
            }}
          />
        </div>
      ) : (
        <FarmRegistrationStatus
          registration={current}
          cancelling={cancelling}
          cancelError={cancelError}
          onEdit={current.status === 'pending' ? () => { setEditSuccess(null); setEditError(null); setIsEditing(true); } : undefined}
          onCancel={() => void cancel()}
          onStartNew={() => navigate('/farms/new')}
        />
      )
    )}
  </section>;
}
