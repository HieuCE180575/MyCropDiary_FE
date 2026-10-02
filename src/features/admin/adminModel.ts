import { adminConfigs, displayValue } from './adminConfig';
import type { AdminCommand, AdminRecord, AdminState, Collection } from './adminTypes';

function validateRecord(state: AdminState, collection: 'crops' | 'rules' | 'articles', record: AdminRecord) {
  for (const field of adminConfigs[collection].fields) {
    const value = record[field.key] ?? '';
    if (field.required && !value.trim()) throw new Error(`Vui lòng nhập ${field.label.toLocaleLowerCase('vi-VN')}.`);
    if (field.maxLength && value.length > field.maxLength) throw new Error(`${field.label} không được vượt quá ${field.maxLength} ký tự.`);
    if (field.options && !Object.hasOwn(field.options, value)) throw new Error(`${field.label} không hợp lệ.`);
  }
  if (collection === 'crops') {
    if (!/^[A-Z0-9_]+$/.test(record.code)) throw new Error('Mã danh mục chỉ gồm chữ in hoa không dấu, chữ số và dấu gạch dưới.');
    if (state.crops.some(item => item.id !== record.id && item.code === record.code)) throw new Error('Mã danh mục đã tồn tại. Vui lòng chọn mã khác.');
  }
  if (collection === 'rules' && record.status === 'ACTIVE' && state.rules.some(item => item.id !== record.id && item.status === 'ACTIVE' && item.field === record.field && item.activity === record.activity && item.group === record.group)) {
    throw new Error('Đã có quy tắc đang áp dụng cho trường và phạm vi này. Hãy sửa quy tắc hiện có hoặc ngừng áp dụng trước.');
  }
  if (collection === 'articles' && record.status === 'APPROVED' && !record.source?.trim()) throw new Error('Cần bổ sung nguồn tham khảo trước khi duyệt bài viết.');
}

export function applyAdminCommand(state: AdminState, command: AdminCommand, meta: { id: string; actor: string; now: string }): AdminState {
  const config = adminConfigs[command.collection];
  const existing = command.id ? state[command.collection].find(item => item.id === command.id) : undefined;
  if (command.id && !existing) throw new Error('Bản ghi không còn tồn tại. Vui lòng đóng cửa sổ và thử lại.');
  let next: AdminRecord;
  let action: string;
  switch (command.type) {
    case 'save': {
      const values = Object.fromEntries(config.fields.map(field => [field.key, (command.values[field.key] ?? '').trim()]));
      next = { id: meta.id, name: '', status: command.collection === 'articles' ? 'DRAFT' : 'ACTIVE', createdAt: meta.now, ...existing, ...values, updatedAt: meta.now };
      if (command.collection === 'articles') { next.status = 'DRAFT'; next.author = existing?.author || meta.actor; }
      validateRecord(state, command.collection, next);
      action = `${existing ? 'Cập nhật' : 'Tạo'} ${config.singular}`;
      break;
    }
    case 'status': {
      if (!existing || !Object.hasOwn(config.statuses, command.status)) throw new Error('Trạng thái yêu cầu không hợp lệ.');
      if (existing.status === command.status) throw new Error('Bản ghi đã ở trạng thái này.');
      if (command.collection === 'users' && existing.role === 'ADMIN') throw new Error('Không thể khóa tài khoản quản trị trong bản xem trước.');
      next = { ...existing, status: command.status, updatedAt: meta.now };
      if (command.collection !== 'users') validateRecord(state, command.collection, next);
      action = command.collection === 'users' ? `${command.status === 'LOCKED' ? 'Khóa' : 'Mở khóa'} tài khoản` : `${config.statuses[command.status]} ${config.singular}`;
      break;
    }
    case 'review': {
      if (!existing || existing.status !== 'PENDING') throw new Error('Chỉ có thể xét duyệt hồ sơ đang chờ duyệt.');
      if (command.status !== 'APPROVED' && command.status !== 'REJECTED') throw new Error('Kết quả xét duyệt không hợp lệ.');
      if (command.status === 'REJECTED' && !command.reason.trim()) throw new Error('Vui lòng nhập lý do từ chối để người đăng ký có thể bổ sung hồ sơ.');
      if (command.reason.length > 1000) throw new Error('Lý do từ chối không được vượt quá 1.000 ký tự.');
      next = { ...existing, status: command.status, reason: command.status === 'REJECTED' ? command.reason.trim() : '', reviewer: meta.actor, reviewedAt: meta.now, updatedAt: meta.now };
      action = command.status === 'APPROVED' ? 'Duyệt đăng ký trang trại' : 'Từ chối đăng ký trang trại';
      break;
    }
    case 'feedback': {
      if (!existing || !Object.hasOwn(config.statuses, command.status)) throw new Error('Trạng thái phản hồi không hợp lệ.');
      if (command.status === 'RESOLVED' && !command.reply.trim()) throw new Error('Vui lòng nhập nội dung trả lời trước khi đánh dấu đã giải quyết.');
      if (command.reply.length > 3000) throw new Error('Nội dung trả lời không được vượt quá 3.000 ký tự.');
      next = { ...existing, reply: command.reply.trim(), status: command.status, updatedAt: meta.now };
      action = 'Xử lý phản hồi AI';
      break;
    }
  }
  const log: AdminRecord = { id: `NK-${meta.id}`, name: action, status: 'RECORDED', createdAt: meta.now, actor: meta.actor, resource: config.title, resourceId: next.id, description: `${next.name}: ${config.statuses[next.status]}. Thao tác trong bản xem trước.` };
  return { ...state, [command.collection]: existing ? state[command.collection].map(item => item.id === next.id ? next : item) : [next, ...state[command.collection]], audit: [log, ...state.audit] };
}

export function filterRecords(records: AdminRecord[], filters: { query: string; status: string; from: string; to: string; extraKey?: string; extra?: string }) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi-VN');
  const query = normalize(filters.query.trim());
  if (filters.from && filters.to && filters.from > filters.to) return [];
  return records.filter(item => (!filters.status || item.status === filters.status)
    && (!filters.extra || !filters.extraKey || item[filters.extraKey] === filters.extra)
    && (!filters.from || item.createdAt.slice(0, 10) >= filters.from)
    && (!filters.to || item.createdAt.slice(0, 10) <= filters.to)
    && (!query || Object.entries(item).some(([key, value]) => normalize(displayValue(key, value)).includes(query))));
}

export function collectionFromPath(key: string): Collection | null {
  const collection = key.replace('admin-', '');
  return Object.hasOwn(adminConfigs, collection) ? collection as Collection : null;
}
