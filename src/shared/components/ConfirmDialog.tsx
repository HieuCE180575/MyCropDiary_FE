import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { useLanguage } from '../i18n/LanguageContext';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
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
  children,
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
      {description ? <p>{typeof description === 'string' ? translate(description) : description}</p> : null}
      {children}
      <div className="confirm-dialog-actions">
        <Button className="ui-cancel-button" onClick={onClose} disabled={loading}>
          {translate(cancelLabel)}
        </Button>
        <Button
          className={tone !== 'danger' && /^(cancel\b|hủy\b|huỷ\b)/i.test(confirmLabel) ? 'ui-cancel-button' : undefined}
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
