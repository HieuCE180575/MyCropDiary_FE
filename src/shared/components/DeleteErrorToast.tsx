import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

export function isDeleteError(text: string, type: string) {
  return type === 'error' && /xóa|xoá|delet|remov|foreign key|constraint/i.test(text);
}

const VI_TO_EN_DELETE_PATTERNS: Array<[RegExp, string]> = [
  [
    /Không thể xóa mùa vụ vì đã có nhật ký canh tác hoặc thu hoạch liên kết\.?\s*(Bạn có thể chuyển trạng thái sang đã hủy \(cancelled\)\.?)?/i,
    'Cannot delete this crop season because it already has linked farming activities or harvests. You can change its status to Cancelled instead.',
  ],
  [
    /Không thể xóa mùa vụ.*?(đang hoạt động|hoạt động|liên kết)/i,
    'Cannot delete this crop season because it is active or has linked records. You can mark it as Cancelled instead.',
  ],
  [
    /Không thể xóa trang trại.*mùa vụ/i,
    'Cannot delete this farm while it still has active crop seasons.',
  ],
  [
    /Không thể xóa (phân khu|khu vực|zone)/i,
    'Cannot delete this zone because it still has linked blocks or cultivation records.',
  ],
  [
    /Không thể xóa (lô đất|lô canh tác|block)/i,
    'Cannot delete this block because it is linked to active crop seasons or farming records.',
  ],
  [
    /Không thể xóa nhà cung cấp/i,
    'Cannot delete this supplier because it is referenced by existing purchase records.',
  ],
  [
    /Không thể xóa phiếu mua vật tư/i,
    'Cannot delete this material purchase because its materials may already have been used.',
  ],
  [
    /Không thể xóa bản ghi sử dụng vật tư/i,
    'Unable to delete this material usage record because it is linked to other records.',
  ],
  [
    /Không thể xóa chủ trang trại duy nhất/i,
    'Cannot remove the sole active farm owner.',
  ],
  [
    /Không thể xóa (nhân viên|thành viên)/i,
    'Unable to remove this member because they have linked records.',
  ],
];

function localizeDeleteError(text: string, lang: string, translate: (msg: string) => string): string {
  if (lang !== 'en') return text;
  const translated = translate(text);
  if (translated && translated !== text) return translated;
  for (const [pattern, replacement] of VI_TO_EN_DELETE_PATTERNS) {
    if (pattern.test(text)) return replacement;
  }
  return text;
}

export function DeleteErrorToast({ text, onClose }: { text: string; onClose: () => void }) {
  const { lang, t } = useLanguage();
  const displayText = localizeDeleteError(text, lang, t);
  const sentenceEnd = displayText.search(/\.\s+/);
  const title = sentenceEnd < 0 ? displayText : displayText.slice(0, sentenceEnd);
  const description = sentenceEnd < 0 ? '' : displayText.slice(sentenceEnd + 1).trim();
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
