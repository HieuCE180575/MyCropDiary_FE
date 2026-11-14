import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { FarmGoongMap } from './FarmGoongMap';
import { formatDateTime as uiFormatDateTime } from '../../../shared/format/formatters';
import { useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { parseEvidenceFiles, formatFileSize, getFileTypeInfo } from '../../../shared/api/fileUploadService';
import { FilePreviewModal } from '../../../shared/components/FilePreviewModal';
import { FARM_REGISTRATION_STATUS_LABEL, FARM_REGISTRATION_STATUS_TONE } from '../constants';
import { parseBoundaryCoordinates } from '../goongMapService';
import type { FarmRegistration } from '../types';

import { useLanguage } from '../../../shared/i18n/LanguageContext';

interface FarmRegistrationStatusProps {
  registration: FarmRegistration;
  evidenceOnly?: boolean;
  cancelling: boolean;
  cancelError: string | null;
  onCancel: () => void;
  onStartNew: () => void;
}

function formatDateTime(iso: string, lang: 'en' | 'vi'): string {
  return uiFormatDateTime(iso, lang, { dateStyle: 'medium', timeStyle: 'short' });
}

export function FarmRegistrationStatus({
  registration,
  evidenceOnly = false,
  cancelling,
  cancelError,
  onCancel,
  onStartNew,
}: FarmRegistrationStatusProps) {
  const { lang, t: translate } = useLanguage();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const canCancel = registration.status === 'pending';
  const canStartNew = registration.status === 'rejected' || registration.status === 'cancelled';
  const boundaryPoints = parseBoundaryCoordinates(registration.boundaryCoordinates);
  const evidenceFiles = parseEvidenceFiles(registration.documentUrl);

  return (
    <div className={evidenceOnly ? "farm-registration-status farm-registration-evidence" : "panel farm-registration-status"}>
      {!evidenceOnly && <div className="panel-title">
        <div>
          <span className="eyebrow">{lang === 'en' ? 'REGISTRATION STATUS' : 'Trạng thái đăng ký'}</span>
          <h2>{registration.proposedFarmName}</h2>
        </div>
        <StatusBadge
          label={FARM_REGISTRATION_STATUS_LABEL[registration.status]}
          tone={FARM_REGISTRATION_STATUS_TONE[registration.status]}
        />
      </div>}

      <dl className={evidenceOnly ? "detail-list farm-profile-fields" : "detail-list"}>
        {!evidenceOnly && <>
        <div>
          <dt>{lang === 'en' ? 'Address' : 'Địa chỉ'}</dt>
          <dd>{registration.address}</dd>
        </div>
        {([
          ['province', lang === 'en' ? 'Province / City' : 'Tỉnh / thành phố'],
          ['district', lang === 'en' ? 'District' : 'Quận / huyện'],
          ['ward', lang === 'en' ? 'Ward / Commune' : 'Phường / xã'],
        ] as const).map(([field, label]) => registration[field] ? (
          <div key={field}><dt>{translate(label)}</dt><dd>{registration[field]}</dd></div>
        ) : null)}
        {registration.latitude != null && registration.longitude != null ? (
          <div>
            <dt>{lang === 'en' ? 'Coordinates' : 'Tọa độ'}</dt>
            <dd>{registration.latitude.toFixed(6)}, {registration.longitude.toFixed(6)}</dd>
          </div>
        ) : null}
        </>}
        {evidenceFiles.length > 0 && (
          <div className={evidenceOnly ? "farm-profile-field-wide" : undefined}>
            <dt>{lang === 'en' ? `Supporting Documents (${evidenceFiles.length} files)` : `Tài liệu minh chứng (${evidenceFiles.length} tệp)`}</dt>
            <dd>
              <div className="status-evidence-list">
                {evidenceFiles.map((file, idx) => {
                  const typeInfo = getFileTypeInfo(file);

                  return (
                    <div key={`${file.url}-${idx}`} className="status-evidence-item" style={evidenceOnly ? { flexWrap: "wrap" } : undefined}>
                      <div className="status-evidence-info">
                        <span className={`file-upload-item-icon ${typeInfo.badgeClass}`}>
                          <Icon name={typeInfo.iconName} />
                        </span>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a', overflowWrap: 'anywhere' }}>{file.name}</strong>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {formatFileSize(file.size) || (typeInfo.isPdf ? 'PDF • Cloudinary' : typeInfo.isImage ? 'Image • Cloudinary' : 'Cloudinary Document')}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="action-button file-upload-item-view-btn"
                          onClick={() => setPreviewIndex(idx)}
                          title={lang === 'en' ? 'Preview on web' : 'Xem trực tiếp trên web'}
                        >
                          <Icon name="eye" /> {lang === 'en' ? 'Preview' : 'Xem trực tiếp'}
                        </button>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="action-button file-preview-open-link"
                          title={lang === 'en' ? 'Open original Cloudinary link in new tab' : 'Mở liên kết gốc Cloudinary trong tab mới'}
                        >
                          <Icon name="external-link" /> {lang === 'en' ? 'Open link' : 'Mở link'}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </dd>
          </div>
        )}
        {registration.description ? (
          <div>
            <dt>{lang === 'en' ? 'Description' : 'Mô tả'}</dt>
            <dd>{registration.description}</dd>
          </div>
        ) : null}
        <div>
          <dt>{lang === 'en' ? 'Submitted At' : 'Ngày gửi'}</dt>
          <dd>{formatDateTime(registration.submittedAt, lang)}</dd>
        </div>
        {registration.reviewedAt ? (
          <div>
            <dt>{lang === 'en' ? 'Processed At' : 'Ngày xử lý'}</dt>
            <dd>{formatDateTime(registration.reviewedAt, lang)}</dd>
          </div>
        ) : null}
        {registration.reviewComment ? (
          <div>
            <dt>{lang === 'en' ? 'Notes' : 'Ghi chú'}</dt>
            <dd>{registration.reviewComment}</dd>
          </div>
        ) : null}
      </dl>

      {/* Bản đồ hiển thị tọa độ & vẽ sơ đồ ranh giới trang trại đã đăng ký trên Goong Map */}
      {!evidenceOnly && <div style={{ marginTop: '20px', marginBottom: '20px' }}>
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
      </div>}

      {cancelError ? <p className="form-error-banner">{translate(cancelError)}</p> : null}

      {registration.status === 'pending' ? (
        <p className="status-note">
          {lang === 'en'
            ? 'Your farm registration is currently under administrative review. You can cancel this request at any time prior to approval.'
            : 'Đăng ký của bạn đang được quản trị viên xem xét. Bạn có thể hủy đăng ký này bất cứ lúc nào trước khi được duyệt.'}
        </p>
      ) : null}

      <div className="farm-registration-actions">
        {canCancel ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmOpen(true)}
            disabled={cancelling}
          >
            {lang === 'en' ? 'Cancel Registration' : 'Hủy đăng ký'}
          </Button>
        ) : null}
        {canStartNew ? (
          <Button type="button" variant="primary" onClick={onStartNew}>
            {lang === 'en' ? 'Start New Registration' : 'Gửi đăng ký mới'}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={lang === 'en' ? 'Cancel Farm Registration?' : 'Hủy đăng ký trang trại?'}
        description={
          lang === 'en'
            ? 'After cancellation, you will need to submit a new application if you wish to register a farm.'
            : 'Sau khi hủy, bạn sẽ cần gửi lại đăng ký từ đầu nếu muốn trở thành chủ trang trại.'
        }
        confirmLabel={lang === 'en' ? 'Cancel Registration' : 'Hủy đăng ký'}
        cancelLabel={lang === 'en' ? 'Close' : 'Đóng'}
        tone="danger"
        loading={cancelling}
        onConfirm={() => {
          setConfirmOpen(false);
          onCancel();
        }}
        onClose={() => setConfirmOpen(false)}
      />

      {previewIndex !== null && (
        <FilePreviewModal
          files={evidenceFiles}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}