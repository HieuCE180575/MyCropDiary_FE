import { useCallback, useEffect, useState } from 'react';
import { FarmRegistrationForm } from '../features/farm-management/components/FarmRegistrationForm';
import { FarmRegistrationStatus } from '../features/farm-management/components/FarmRegistrationStatus';
import {
  cancelFarmRegistration,
  fetchMyLatestRegistration,
  submitFarmRegistration,
} from '../features/farm-management/registrationService';
import type { FarmRegistration, FarmRegistrationFormValues } from '../features/farm-management/types';
import { useFarmWorkspace } from '../features/farm-management/FarmWorkspace';
import { useAuth } from '../features/auth';
import { useRealtimeSync } from '../shared/realtime/realtimeSync';

export function FarmRegistrationPage() {
  const { user } = useAuth();
  const { retry: reloadFarms } = useFarmWorkspace();
  const [registration, setRegistration] = useState<FarmRegistration | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadRegistration = useCallback(async (signal?: AbortSignal, silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const data = await fetchMyLatestRegistration(signal);
      if (!signal?.aborted) {
        setRegistration(data);
        if (silent) setLoadError(null);
      }
    } catch (error) {
      if (!signal?.aborted && !silent) {
        setLoadError(error instanceof Error ? error.message : 'Không tải được đăng ký.');
      }
    } finally {
      if (!signal?.aborted && !silent) setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadRegistration(controller.signal, false);
    return () => controller.abort();
  }, [loadRegistration]);

  // Silent background realtime sync when Admin approves/rejects registration
  useRealtimeSync(() => {
    void loadRegistration(undefined, true);
  });

  async function handleSubmit(values: FarmRegistrationFormValues) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await submitFarmRegistration(values);
      setRegistration(created);
      setShowForm(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Gửi đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!registration || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelFarmRegistration(registration.farmRegistrationId);
      setRegistration(updated);
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'Hủy đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  }

  const shouldShowForm = showForm || !registration;

  return (
    <section className="farm-registration-page">
      <div className="page-heading">
        <div>
          <h1>Đăng ký trang trại</h1>
        </div>
        <button className="action-button" disabled={loading || submitting || cancelling} onClick={() => { void loadRegistration(); reloadFarms(); }}>Cập nhật trạng thái</button>
      </div>

      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin đăng ký...</h2>
        </div>
      ) : loadError ? (
        <div className="panel"><p role="alert">{loadError}</p><button className="primary-button" onClick={() => void loadRegistration()}>Thử lại</button></div>
      ) : shouldShowForm ? (
        <FarmRegistrationForm submitting={submitting} submitError={submitError} onSubmit={handleSubmit} />
      ) : (
        registration && (
          <FarmRegistrationStatus
            registration={registration}
            cancelling={cancelling}
            cancelError={cancelError}
            onCancel={handleCancel}
            onStartNew={() => setShowForm(true)}
          />
        )
      )}
    </section>
  );
}
