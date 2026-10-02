import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../../shared/components/Icon';
import { adminConfigs } from './adminConfig';
import type { Collection, Field } from './adminTypes';

export function AdminBadge({ collection, status }: { collection: Collection; status: string }) {
  const tone = ['ACTIVE', 'APPROVED', 'RESOLVED', 'RECORDED'].includes(status) ? 'green' : ['REJECTED', 'LOCKED'].includes(status) ? 'red' : ['PENDING', 'OPEN', 'DRAFT'].includes(status) ? 'amber' : status === 'IN_REVIEW' ? 'blue' : 'gray';
  return <span className={`admin-badge ${tone}`}><i />{adminConfigs[collection].statuses[status] ?? 'Chưa xác định'}</span>;
}

export function AdminModal({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className={`admin-modal${wide ? ' wide' : ''}`} aria-labelledby="admin-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }}>
    <div className="admin-modal-heading"><h2 id="admin-dialog-title">{title}</h2><button type="button" onClick={close} className="admin-close" aria-label="Đóng cửa sổ"><Icon name="close" /></button></div>
    {children}
  </dialog>;
}

export function AdminField({ field, value, onChange }: { field: Field; value: string; onChange: (value: string) => void }) {
  return <label className={`admin-field${field.type === 'textarea' ? ' full' : ''}`}><span>{field.label}{field.required && <b aria-hidden="true"> *</b>}</span>
    {field.type === 'select' ? <select value={value} required={field.required} onChange={(event) => onChange(event.target.value)}><option value="">Chọn {field.label.toLocaleLowerCase('vi-VN')}</option>{Object.entries(field.options ?? {}).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
      : field.type === 'textarea' ? <textarea rows={field.key === 'content' ? 10 : 4} value={value} required={field.required} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />
        : <input value={value} required={field.required} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />}
  </label>;
}

export function AdminEmpty({ title = 'Không tìm thấy kết quả', text = 'Hãy thử đổi từ khóa hoặc bộ lọc để tìm thông tin phù hợp.' }: { title?: string; text?: string }) {
  return <div className="admin-empty"><span><Icon name="search" /></span><h3>{title}</h3><p>{text}</p></div>;
}

export function AdminPageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="admin-page-heading"><div><p className="admin-eyebrow">KHÔNG GIAN QUẢN TRỊ</p><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
