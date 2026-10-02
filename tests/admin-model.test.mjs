import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { SourceTextModule } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const cache = new Map();
async function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = new SourceTextModule(stripTypeScriptTypes(await readFile(file, 'utf8'), { mode: 'transform' }), { identifier: file });
  cache.set(file, module);
  await module.link((name, parent) => load(resolve(dirname(parent.identifier), name + '.ts')));
  return module;
}
const model = await load(resolve('src/features/admin/adminModel.ts'));
const demo = await load(resolve('src/features/admin/adminDemo.ts'));
await model.evaluate();
await demo.evaluate();
const { applyAdminCommand, filterRecords } = model.namespace;
const { createAdminDemo } = demo.namespace;
const meta = { id: 'new-record', actor: 'Quản trị viên kiểm thử', now: '2026-09-30T10:00:00.000Z' };

test('registration review requires a rejection reason, accepts only pending applications and records an audit entry', () => {
  const state = createAdminDemo();
  assert.throws(() => applyAdminCommand(state, { type: 'review', collection: 'registrations', id: 'DK-008', status: 'REJECTED', reason: '   ' }, meta), /lý do từ chối/);
  assert.equal(state.registrations[0].status, 'PENDING');
  const next = applyAdminCommand(state, { type: 'review', collection: 'registrations', id: 'DK-008', status: 'APPROVED', reason: '' }, meta);
  assert.equal(next.registrations[0].status, 'APPROVED');
  assert.equal(next.audit[0].resourceId, 'DK-008');
  assert.equal(next.audit[0].actor, meta.actor);
  assert.equal(state.registrations[0].status, 'PENDING');
  assert.throws(() => applyAdminCommand(next, { type: 'review', collection: 'registrations', id: 'DK-008', status: 'REJECTED', reason: 'Changed' }, meta), /chờ duyệt/);
});

test('article approval requires a source and editing an approved article returns it to draft', () => {
  const state = createAdminDemo();
  assert.throws(() => applyAdminCommand(state, { type: 'status', collection: 'articles', id: 'BV-003', status: 'APPROVED' }, meta), /nguồn tham khảo/);
  const next = applyAdminCommand(state, { type: 'save', collection: 'articles', id: 'BV-001', values: { name: 'Bài viết cập nhật', category: 'DIARY', source: 'Nguồn tham khảo mẫu', content: 'Nội dung đã sửa.' } }, meta);
  assert.equal(next.articles[0].status, 'DRAFT');
  assert.equal(state.articles[0].status, 'APPROVED');
  assert.deepEqual(next.feedback, state.feedback);
});

test('active checklist scopes cannot conflict and executable expressions are not accepted as field names', () => {
  const state = createAdminDemo();
  const values = { name: 'Quy tắc mới', field: 'ACTIVITY_DATE', activity: 'ALL', group: 'ALL', requirement: 'REQUIRED', guidance: '' };
  assert.throws(() => applyAdminCommand(state, { type: 'save', collection: 'rules', values }, meta), /Đã có quy tắc/);
  assert.throws(() => applyAdminCommand(state, { type: 'save', collection: 'rules', values: { ...values, field: 'DROP TABLE' } }, meta), /không hợp lệ/);
  const inactive = applyAdminCommand(state, { type: 'status', collection: 'rules', id: 'QT-001', status: 'INACTIVE' }, meta);
  const next = applyAdminCommand(inactive, { type: 'save', collection: 'rules', values }, { ...meta, id: 'second-rule' });
  assert.throws(() => applyAdminCommand(next, { type: 'status', collection: 'rules', id: 'QT-001', status: 'ACTIVE' }, meta), /Đã có quy tắc/);
  assert.deepEqual(next.seasons, state.seasons);
});

test('category codes are unique, deactivation preserves the record, admin accounts cannot be locked in preview', () => {
  const state = createAdminDemo();
  assert.throws(() => applyAdminCommand(state, { type: 'save', collection: 'crops', values: { name: 'Cải mới', code: 'CAI_XANH', group: 'LEAFY' } }, meta), /đã tồn tại/);
  const next = applyAdminCommand(state, { type: 'status', collection: 'crops', id: 'CT-001', status: 'INACTIVE' }, meta);
  assert.equal(next.crops.length, state.crops.length);
  assert.equal(next.crops[0].status, 'INACTIVE');
  assert.throws(() => applyAdminCommand(state, { type: 'status', collection: 'users', id: 'ND-007', status: 'LOCKED' }, meta), /Không thể khóa/);
});

test('resolving AI feedback requires a reply and does not change knowledge articles', () => {
  const state = createAdminDemo();
  assert.throws(() => applyAdminCommand(state, { type: 'feedback', collection: 'feedback', id: 'PH-001', status: 'RESOLVED', reply: '' }, meta), /nội dung trả lời/);
  const next = applyAdminCommand(state, { type: 'feedback', collection: 'feedback', id: 'PH-001', status: 'RESOLVED', reply: 'Đã kiểm tra nguồn tham khảo.' }, meta);
  assert.equal(next.feedback[0].status, 'RESOLVED');
  assert.deepEqual(next.articles, state.articles);
});

test('Vietnamese search, status, role and date filters compose correctly and invalid date ranges return no matches', () => {
  const state = createAdminDemo();
  const filters = { query: 'nguyen minh an', status: 'ACTIVE', from: '2026-04-01', to: '2026-04-30', extraKey: 'role', extra: 'USER' };
  assert.equal(filterRecords(state.users, filters)[0].id, 'ND-001');
  assert.equal(filterRecords(state.users, { ...filters, status: 'LOCKED' }).length, 0);
  assert.equal(filterRecords(state.users, { ...filters, from: '2026-05-01' }).length, 0);
});
