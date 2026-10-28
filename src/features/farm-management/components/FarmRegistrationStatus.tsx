import { useState } from 'react';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { FARM_REGISTRATION_STATUS_LABEL, FARM_REGISTRATION_STATUS_TONE } from '../constants';
import { parseBoundaryCoordinates } from '../goongMapService';
import type { FarmRegistration } from '../types';
import { FarmGoongMap } from './FarmGoongMap';

interface FarmRegistrationStatusProps {
  registration: FarmRegistration;
  cancelling: boolean;
  cancelError: string | null;
  onCancel: () => void;
  onStartNew: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function FarmRegistrationStatus({
  registration,
  cancelling,
  cancelError,
  onCancel,
  onStartNew,
}: FarmRegistrationStatusProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canCancel = registration.status === 'pending';
  const canStartNew = registration.status === 'rejected' || registration.status === 'cancelled';
  const boundaryPoints = parseBoundaryCoordinates(registration.boundaryCoordinates);

  return (
    <div className="panel farm-registration-status">
      <div className="panel-title">
        <div>
          <span className="eyebrow">Trạng thái đăng ký</span>
          <h2>{registration.proposedFarmName}</h2>
        </div>
        <StatusBadge
          label={FARM_REGISTRATION_STATUS_LABEL[registration.status]}
          tone={FARM_REGISTRATION_STATUS_TONE[registration.status]}
        />
      </div>

      <dl className="detail-list">
        <div>
          <dt>Địa chỉ</dt>
          <dd>{registration.address}</dd>
        </div>
        {([
          ['province', 'Tỉnh / thành phố'], ['district', 'Quận / huyện'], ['ward', 'Phường / xã'],
        ] as const).map(([field, label]) => registration[field] ? (
          <div key={field}><dt>{label}</dt><dd>{registration[field]}</dd></div>
        ) : null)}
        {registration.latitude != null && registration.longitude != null ? (
          <div>
            <dt>Tọa độ</dt>
            <dd>{registration.latitude.toFixed(6)}, {registration.longitude.toFixed(6)}</dd>
          </div>
        ) : null}
        {registration.documentUrl && /^https?:\/\//i.test(registration.documentUrl) && (
          <div><dt>Tài liệu minh chứng</dt><dd><a href={registration.documentUrl} target="_blank" rel="noreferrer">Mở tài liệu minh chứng</a></dd></div>
        )}
        {registration.description ? (
          <div>
            <dt>Mô tả</dt>
            <dd>{registration.description}</dd>
          </div>
        ) : null}
        <div>
          <dt>Ngày gửi</dt>
          <dd>{formatDateTime(registration.submittedAt)}</dd>
        </div>
        {registration.reviewedAt ? (
          <div>
            <dt>Ngày xử lý</dt>
            <dd>{formatDateTime(registration.reviewedAt)}</dd>
          </div>
        ) : null}
        {registration.reviewComment ? (
          <div>
            <dt>Ghi chú</dt>
            <dd>{registration.reviewComment}</dd>
          </div>
        ) : null}
      </dl>

      {/* Bản đồ hiển thị tọa độ & vẽ sơ đồ ranh giới trang trại đã đăng ký trên Goong Map */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <FarmGoongMap
          farmName={registration.proposedFarmName}
          address={registration.address}
          province={registration.province}
          district={registration.district}
          ward={registration.ward}
          latitude={registration.latitude ?? null}
          longitude={registration.longitude ?? null}
          boundary={boundaryPoints}
          editable={false}
          height={360}
        />
      </div>

      {cancelError ? <p className="form-error-banner">{cancelError}</p> : null}

      {registration.status === 'pending' ? (
        <p className="status-note">
          Đăng ký của bạn đang được quản trị viên xem xét. Bạn có thể hủy đăng ký này bất cứ lúc nào trước khi được duyệt.
        </p>
      ) : null}

      <div className="farm-registration-actions">
        {canCancel ? (
          <button
            type="button"
            className="danger-button"
            onClick={() => setConfirmOpen(true)}
            disabled={cancelling}
          >
            Hủy đăng ký
          </button>
        ) : null}
        {canStartNew ? (
          <button type="button" className="primary-button" onClick={onStartNew}>
            Gửi đăng ký mới
          </button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Hủy đăng ký trang trại?"
        description="Sau khi hủy, bạn sẽ cần gửi lại đăng ký từ đầu nếu muốn trở thành chủ trang trại."
        confirmLabel="Hủy đăng ký"
        cancelLabel="Đóng"
        tone="danger"
        loading={cancelling}
        onConfirm={() => {
          setConfirmOpen(false);
          onCancel();
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
