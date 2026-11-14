import { Icon } from '../../../shared/components/Icon';
import { useLanguage } from '../../../shared/i18n/LanguageContext';

interface AuditConfirmationModalProps {
  isOpen: boolean;
  pendingCount: number;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function AuditConfirmationModal({
  isOpen,
  pendingCount,
  isLoading,
  onConfirm,
  onClose,
}: AuditConfirmationModalProps) {
  const { lang } = useLanguage();
  if (!isOpen) return null;

  const hasPending = pendingCount > 0;

  return (
    <div
      className="modal-backdrop"
      style={{
        zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={isLoading ? undefined : onClose}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: '480px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: hasPending ? '#fffbeb' : '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: hasPending ? '#d97706' : '#dc2626',
              flexShrink: 0,
            }}
          >
            <Icon name={hasPending ? 'warning' : 'lock'} size={22} />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#0f172a', fontWeight: 700 }}>
              {lang === 'en' ? 'Lock VietGAP Audit Dossier?' : 'Khóa hồ sơ tự đánh giá VietGAP?'}
            </h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
              {lang === 'en'
                ? 'Locking is a terminal action. Once locked, all evaluation statuses and evidence will be frozen for audit compliance.'
                : 'Khóa hồ sơ là thao tác kết thúc đợt kiểm tra. Khi đã khóa, toàn bộ kết quả đánh giá và minh chứng sẽ được đóng băng để phục vụ thanh tra, không thể chỉnh sửa tiếp.'}
            </p>
          </div>
        </div>

        {hasPending && (
          <div
            style={{
              background: '#fef3c7',
              borderRadius: '6px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#92400e',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <Icon name="warning" size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>{lang === 'en' ? 'Warning: ' : 'Cảnh báo: '}</strong>
              {lang === 'en'
                ? `There are still ${pendingCount} pending criterion/criteria awaiting evaluation. Locking now may lower your overall compliance score.`
                : `Hiện vẫn còn ${pendingCount} tiêu chí đang ở trạng thái chờ đánh giá. Việc khóa hồ sơ lúc này có thể ảnh hưởng đến kết quả đánh giá tuân thủ.`}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="secondary-button"
            disabled={isLoading}
            onClick={onClose}
            style={{ fontSize: '13px', padding: '8px 16px', border: 'none', background: '#f1f5f9', color: '#334155' }}
          >
            {lang === 'en' ? 'Cancel' : 'Hủy thao tác'}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isLoading}
            onClick={onConfirm}
            style={{
              fontSize: '13px',
              padding: '8px 18px',
              background: '#dc2626',
              border: 'none',
              color: '#ffffff',
            }}
          >
            {isLoading
              ? (lang === 'en' ? 'Locking...' : 'Đang xử lý...')
              : (lang === 'en' ? 'Confirm & Lock' : 'Xác nhận khóa hồ sơ')}
          </button>
        </div>
      </div>
    </div>
  );
}
