import { useCallback, useEffect, useState } from 'react';
import { FarmRegistrationForm } from '../features/farm-management/components/FarmRegistrationForm';
import { FarmRegistrationStatus } from '../features/farm-management/components/FarmRegistrationStatus';
import {
  cancelFarmRegistration,
  fetchMyLatestRegistration,
  submitFarmRegistration,
} from '../features/farm-management/registrationService';
import type { FarmRegistration, FarmRegistrationFormValues } from '../features/farm-management/types';

// TODO: lấy từ AuthContext/useAuth khi hệ thống đăng nhập thật được tích hợp.
const CURRENT_USER_ID = 'user-current';

export function FarmRegistrationPage() {
  const [registration, setRegistration] = useState<FarmRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadRegistration = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyLatestRegistration(CURRENT_USER_ID);
      setRegistration(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegistration();
  }, [loadRegistration]);

  async function handleSubmit(values: FarmRegistrationFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await submitFarmRegistration(CURRENT_USER_ID, values);
      setRegistration(created);
      setShowForm(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Gửi đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!registration) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelFarmRegistration(registration.farmRegistrationId, CURRENT_USER_ID);
      setRegistration(updated);
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'Hủy đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  }

  const shouldShowForm = showForm || !registration;

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Đăng ký trang trại</h1>
        </div>
      </div>

      {loading ? (
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin đăng ký...</h2>
        </div>
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
