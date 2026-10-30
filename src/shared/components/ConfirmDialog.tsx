import { Modal } from './Modal';

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
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description ? <p>{description}</p> : null}
      <div className="confirm-dialog-actions">
        <button type="button" className="ghost-button" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === 'danger' ? 'danger-button' : 'primary-button'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
