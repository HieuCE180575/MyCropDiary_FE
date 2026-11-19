import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

export function isDeleteError(text: string, type: string) {
  return type === 'error' && /xóa|xoá|delet|remov|foreign key|constraint/i.test(text);
}

export function DeleteErrorToast({ text, onClose }: { text: string; onClose: () => void }) {
  const { lang } = useLanguage();
  const sentenceEnd = text.search(/\.\s+/);
  const title = sentenceEnd < 0 ? text : text.slice(0, sentenceEnd);
  const description = sentenceEnd < 0 ? '' : text.slice(sentenceEnd + 1).trim();
  const content = <span className="ui-delete-error-toast-message">
    <strong>{title}</strong>
    {description && <span>{description}</span>}
  </span>;
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    // The top layer keeps feedback visible even when a confirmation dialog is open.
    ref.current?.showPopover?.();
    const timer = window.setTimeout(() => closeRef.current(), 6000);
    return () => window.clearTimeout(timer);
  }, [text]);
  return createPortal(
    <div ref={ref} popover="manual" className="ui-delete-error-toast" role="alert">
      <Icon name="warning" size={20} />
      {content}
      <button type="button" onClick={onClose} aria-label={lang === 'en' ? 'Dismiss notification' : 'Đóng thông báo'}>
        <Icon name="close" size={16} />
      </button>
      <div key={text} className="ui-delete-error-toast-fill" aria-hidden="true">
        <Icon name="warning" size={20} />
        {content}
        <span className="ui-delete-error-toast-close"><Icon name="close" size={16} /></span>
      </div>
    </div>, document.body,
  );
}
