import { Modal } from '../../shared/components/Modal';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeading } from '../../shared/components/PageHeading';
const ADMIN_STATUS_EN: Record<string, string> = {
  'Chờ duyệt': 'Pending Review',
  'Đã duyệt': 'Approved',
  'Đã từ chối': 'Rejected',
  'Đã hủy': 'Cancelled',
  'Đang hoạt động': 'Active',
  'Đã khóa': 'Locked',
  'Đang sử dụng': 'Active',
  'Ngừng sử dụng': 'Inactive',
  'Đang áp dụng': 'Active',
  'Ngừng áp dụng': 'Inactive',
  'Bản nháp': 'Draft',
  'Đã lưu trữ': 'Archived',
  'Mới tiếp nhận': 'Open',
  'Đang xử lý': 'In Review',
  'Đã giải quyết': 'Resolved',
  'Đang canh tác': 'Growing',
  'Đã thu hoạch': 'Harvested',
  'Cần rà soát VietGAP': 'Needs VietGAP Review',
  'Tạm ngưng': 'Inactive',
};

import { useLanguage } from '../../shared/i18n/LanguageContext';
import type { ReactNode } from 'react';

import { type BadgeTone } from '../../shared/components/StatusBadge';


import { adminConfigs } from './adminConfig';
import type { Collection, Field } from './adminTypes';

export function AdminBadge({ collection, status }: { collection: Collection; status: string }) {
  const { lang, t: translate } = useLanguage();
  const tone = ['ACTIVE', 'APPROVED', 'RESOLVED', 'RECORDED'].includes(status) ? 'green' : ['REJECTED', 'LOCKED'].includes(status) ? 'red' : ['PENDING', 'OPEN', 'DRAFT', 'NEEDS_REVIEW'].includes(status) ? 'amber' : ['IN_REVIEW', 'HARVESTED'].includes(status) ? 'blue' : 'gray';
  const raw = adminConfigs[collection].statuses[status] ?? 'Chưa xác định';
  const label = lang === 'en' ? (ADMIN_STATUS_EN[raw] || raw) : raw;
  const tones: Record<string, BadgeTone> = { green: 'success', red: 'danger', amber: 'warning', blue: 'info', gray: 'neutral' };
  return <StatusBadge label={translate(label)} tone={tones[tone]} />;
}

export function AdminModal({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  return <Modal structured open onClose={close} title={title} variant="admin" className={wide ? 'wide' : undefined}>{children}</Modal>;
}

export function AdminField({ field, value, onChange }: { field: Field; value: string; onChange: (value: string) => void }) {
  const { lang, t: translate } = useLanguage();
  return <label className={`structured-field-card admin-field${field.type === 'textarea' ? ' full' : ''}`}><span>{translate(field.label)}{field.required && <b aria-hidden="true"> *</b>}</span>
    {field.type === 'select' ? <select className="ui-select" value={value} required={field.required} onChange={(event) => onChange(event.target.value)}><option value="">{(lang === 'en' ? "Select " : "Chọn ")} {translate(field.label).toLocaleLowerCase('vi-VN')}</option>{Object.entries(field.options ?? {}).map(([key, label]) => <option value={key} key={key}>{translate(label)}</option>)}</select>
      : field.type === 'textarea' ? <textarea className="ui-textarea" rows={field.key === 'content' ? 10 : 4} value={value} required={field.required} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />
        : <input className="ui-input" value={value} required={field.required} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />}
  </label>;
}

export function AdminEmpty({ title = 'Không tìm thấy kết quả', text = 'Hãy thử đổi từ khóa hoặc bộ lọc để tìm thông tin phù hợp.' }: { title?: string; text?: string }) {
  const { t: translate } = useLanguage();
  return <EmptyState icon="search" title={translate(title)} description={translate(text)} />;
}

export function AdminPageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  const { lang, t: translate } = useLanguage();
  return <PageHeading title={translate(title)} description={translate(description)} leading={<p className="eyebrow">{lang === 'en' ? "ADMIN WORKSPACE" : "KHÔNG GIAN QUẢN TRỊ"}</p>}>{children}</PageHeading>;
}
