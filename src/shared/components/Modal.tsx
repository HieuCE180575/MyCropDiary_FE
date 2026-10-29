import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  headerIcon?: ReactNode;
}

/** Modal/hộp thoại dùng lại để hiển thị chi tiết hoặc xác nhận. */
export function Modal({ open, onClose, title, children, className, headerIcon }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className={['modal-card', className].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          {title ? <h2>{headerIcon}{title}</h2> : <span />}
          <button type="button" className="modal-close" aria-label="Đóng" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
