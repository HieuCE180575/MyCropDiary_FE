import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

async function loadTypescript(path) {
  const source = stripTypeScriptTypes(await readFile(path, 'utf8'), { mode: 'transform' });
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
const { canAccessModule, farmRole } = await loadTypescript('src/features/auth/accessPolicy.ts');
const { moduleDefinitions } = await loadTypescript('src/app/routes/moduleDefinitions.ts');
const keys = (systemRole, farm = null) => moduleDefinitions.filter(module => canAccessModule(module, systemRole, farm)).map(module => module.key);
const farm = (role, status = 'ACTIVE') => ({ id: 1, currentUserRole: role, status });

test('User without farm membership gets only account, registration, public knowledge and personal AI features', () => {
  assert.deepEqual(keys('USER'), ['farm-registration', 'knowledge', 'ai', 'ai-history', 'ai-feedback', 'profile', 'password']);
});

test('Staff has operational access but no owner-only expenses, purchases or staff administration', () => {
  const allowed = keys('USER', farm('STAFF'));
  for (const key of ['farm', 'workers', 'production', 'seasons', 'tasks', 'activities', 'materials', 'harvests', 'training', 'checklists', 'assessments', 'reports', 'ai-drafts']) assert.ok(allowed.includes(key), key);
  for (const key of ['members', 'suppliers', 'purchases', 'expenses', 'admin']) assert.ok(!allowed.includes(key), key);
});

test('Owner permissions are specific to the selected farm and disappear in personal or staff workspaces', () => {
  const expense = moduleDefinitions.find(module => module.key === 'expenses');
  assert.equal(canAccessModule(expense, 'USER', farm('OWNER')), true);
  assert.equal(canAccessModule(expense, 'USER', { ...farm('STAFF'), id: 2 }), false);
  assert.equal(canAccessModule(expense, 'USER', null), false);
});

test('Pending, inactive, missing and unknown farm roles never unlock operational screens', () => {
  for (const candidate of [farm('OWNER', 'PENDING'), farm('STAFF', 'INACTIVE'), farm(null), farm('ADMIN'), farm('INVITED')]) {
    assert.equal(farmRole(candidate), null);
    assert.deepEqual(keys('USER', candidate), keys('USER'));
  }
});

test('System admin does not inherit farm operational privileges', () => {
  const allowed = keys('ADMIN', farm('ADMIN'));
  for (const key of ['knowledge', 'profile', 'password', 'admin', 'admin-registrations', 'admin-users', 'admin-crops', 'admin-rules', 'admin-articles', 'admin-feedback', 'admin-statistics', 'admin-audit']) assert.ok(allowed.includes(key), key);
  for (const key of ['farm', 'activities', 'expenses', 'members', 'farm-registration', 'ai-drafts']) assert.ok(!allowed.includes(key), key);
  assert.deepEqual(keys(undefined), []);
  assert.deepEqual(keys('OWNER'), []);
});
