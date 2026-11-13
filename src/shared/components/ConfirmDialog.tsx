import { Button } from './Button';
import { Modal } from './Modal';
import { useLanguage } from '../i18n/LanguageContext';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Reusable confirmation modal for warnings/actions (delete, cancel, etc.). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t: translate } = useLanguage();
  return (
    <Modal open={open} onClose={() => { if (!loading) onClose(); }} title={translate(title)}>
      {description ? <p>{translate(description)}</p> : null}
      <div className="confirm-dialog-actions">
        <Button onClick={onClose} disabled={loading}>
          {translate(cancelLabel)}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {translate(loading ? 'Processing...' : confirmLabel)}
        </Button>
      </div>
    </Modal>
  );
}
