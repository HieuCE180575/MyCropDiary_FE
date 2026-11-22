import { Modal } from '../../shared/components/Modal';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeading } from '../../shared/components/PageHeading';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useId, type ReactNode } from 'react';

import { type BadgeTone } from '../../shared/components/StatusBadge';


import { adminConfigs } from './adminConfig';
import type { Collection, Field } from './adminTypes';

export function AdminBadge({ collection, status }: { collection: Collection; status: string }) {
  const { t: translate } = useLanguage();
  const tone = ['ACTIVE', 'APPROVED', 'RESOLVED', 'RECORDED'].includes(status) ? 'green' : ['REJECTED', 'LOCKED'].includes(status) ? 'red' : ['PENDING', 'OPEN', 'DRAFT', 'NEEDS_REVIEW'].includes(status) ? 'amber' : ['IN_REVIEW', 'HARVESTED'].includes(status) ? 'blue' : 'gray';
  const raw = adminConfigs[collection].statuses[status] ?? 'Chưa xác định';
  const tones: Record<string, BadgeTone> = { green: 'success', red: 'danger', amber: 'warning', blue: 'info', gray: 'neutral' };
  return <StatusBadge label={translate(raw)} tone={tones[tone]} />;
}

export function AdminModal({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  return <Modal structured open onClose={close} title={title} variant="admin" className={wide ? 'wide' : undefined}>{children}</Modal>;
}

export function AdminField({ field, value, onChange, disabled = false }: { field: Field; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { lang, t: translate } = useLanguage();
  const id = useId();
  const helpId = field.help ? `${id}-help` : undefined;
  return <div className={`structured-field-card admin-field${field.type === 'textarea' || field.full ? ' full' : ''}`}>
    <div className="structured-field-header">
      <label className="structured-field-label" htmlFor={id}>{translate(field.label)}{field.required && <b aria-hidden="true"> *</b>}</label>
      <span className="structured-field-badge">{field.maxLength && `${value.length}/${field.maxLength} · `}{lang === 'en' ? (field.required ? 'Required' : 'Optional') : (field.required ? 'Bắt buộc' : 'Tùy chọn')}</span>
    </div>
    {field.type === 'select' ? <select id={id} aria-describedby={helpId} disabled={disabled} className="ui-select" value={value} required={field.required} onChange={(event) => onChange(event.target.value)}><option value="">{(lang === 'en' ? "Select " : "Chọn ")} {translate(field.label).toLocaleLowerCase('vi-VN')}</option>{Object.entries(field.options ?? {}).map(([key, label]) => <option value={key} key={key}>{translate(label)}</option>)}</select>
      : field.type === 'textarea' ? <textarea id={id} aria-describedby={helpId} disabled={disabled} className="ui-textarea" rows={field.key === 'content' ? 10 : 4} value={value} required={field.required} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />
        : <input id={id} aria-describedby={helpId} disabled={disabled} className="ui-input" value={value} required={field.required} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />}
    {field.help && <small id={helpId} className="admin-field-help">{field.help[lang]}</small>}
  </div>;
}

export function AdminEmpty({ title = 'Không tìm thấy kết quả', text = 'Hãy thử đổi từ khóa hoặc bộ lọc để tìm thông tin phù hợp.' }: { title?: string; text?: string }) {
  const { t: translate } = useLanguage();
  return <EmptyState icon="search" title={translate(title)} description={translate(text)} />;
}

export function AdminPageHeading({ title, description, children, hideEyebrow }: { title: string; description: string; children?: ReactNode; hideEyebrow?: boolean }) {
  const { lang, t: translate } = useLanguage();
  return <PageHeading title={translate(title)} description={translate(description)} leading={hideEyebrow ? undefined : <p className="eyebrow">{lang === 'en' ? "ADMIN WORKSPACE" : "KHÔNG GIAN QUẢN TRỊ"}</p>}>{children}</PageHeading>;
}
