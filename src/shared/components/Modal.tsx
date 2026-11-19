import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { useEffect, useId, useRef } from 'react';

import type { CSSProperties, ReactNode } from 'react';

let openDialogCount = 0;
let previousBodyOverflow = '';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  headerIcon?: ReactNode;
  variant?: 'default' | 'admin';
  customLayout?: boolean;
  structured?: boolean;
  style?: CSSProperties;
}

/** Modal/hộp thoại dùng lại để hiển thị chi tiết hoặc xác nhận. */
export function Modal({ open, onClose, title, children, className, headerIcon, variant = 'default', customLayout = false, structured = false, style }: ModalProps) {
  const { lang, t: translate } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (!dialog) return;
    if (customLayout) {
      const heading = dialog.querySelector('h2, h3');
      if (heading) { heading.id ||= titleId; dialog.setAttribute('aria-labelledby', heading.id); }
    }
    const previous = document.activeElement as HTMLElement | null;
    if (openDialogCount++ === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'))
      .filter(element => !element.closest('[hidden], [inert]') && element.getAttribute('aria-hidden') !== 'true' && window.getComputedStyle(element).display !== 'none');
    (dialog.querySelector<HTMLElement>('[autofocus]') ?? controls()[0] ?? dialog).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialog.open || !dialog.contains(document.activeElement)) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = controls();
        const first = items[0];
        const last = items.at(-1);
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      if (--openDialogCount === 0) document.body.style.overflow = previousBodyOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
      <dialog ref={ref} tabIndex={-1} style={{ ...style, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100dvh - 32px)' }} className={[variant === 'admin' ? 'admin-modal' : 'modal-card', 'ui-modal', structured && 'form-standard-modal', className].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-label={title || customLayout ? undefined : (lang === 'en' ? 'Dialog' : 'Hộp thoại')}
        onCancel={event => { event.preventDefault(); onClose(); }}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
        }}>
        {!customLayout && <div className={variant === 'admin' ? 'admin-modal-heading' : 'modal-header'}>
          {title ? (
            <h2 id={titleId} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {headerIcon}
              <span>{translate(title)}</span>
            </h2>
          ) : (
            <span />
          )}
          <button type="button" className={variant === 'admin' ? 'admin-close' : 'modal-close'} aria-label={(lang === 'en' ? "Close dialog" : "Đóng cửa sổ")} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>}
        {customLayout || variant === 'admin' ? children : <div className="modal-body">{children}</div>}
      </dialog>
  );
}
