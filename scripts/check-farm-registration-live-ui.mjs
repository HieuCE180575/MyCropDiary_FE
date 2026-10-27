import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';

const reports = (await readdir('artifacts')).filter(name => /^farm-registration-live-.*\.json$/.test(name)).sort();
const reportPath = `artifacts/${reports.at(-1)}`;
const report = JSON.parse((await readFile(reportPath, 'utf8')).replace(/^\uFEFF/, ''));
assert.equal(report.completed, true, 'Run the API/SQL checks first');
const seedSql = await readFile('../../Project_BE/MyCropDiary_BE/MyCropDiary_SQLServer.sql', 'utf8');
const password = seedSql.match(/Default login password for all accounts:\s*([^\r\n]+)/)[1].trim();
async function login(email) {
  const response = await fetch(`${report.api}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, 'Real login must succeed');
  return (await response.json()).data;
}
const user = await login(report.testEmail);
const admin = await login('admin@cropdiary.com');
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
const replacements = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, HTMLDialogElement: dom.window.HTMLDialogElement, Node: dom.window.Node,
  Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
let root;
report.uiChecks = [];
function check(name, passed) {
  report.uiChecks.push({ check: name, passed: !!passed });
  assert.ok(passed, name);
  console.log(`PASS: ${name}`);
}
async function until(predicate) {
  const deadline = Date.now() + 15000;
  while (!predicate() && Date.now() < deadline) await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
  assert.ok(predicate(), 'UI did not reach the expected state within 15 seconds');
}
try {
  const { createRoot } = await import('react-dom/client');
  const { MemoryRouter } = await import('react-router-dom');
  const { App } = await server.ssrLoadModule('/src/app/App.tsx');
  const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
  const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
  const mount = async (session, path) => {
    if (root) await act(async () => root.unmount());
    storage.saveAccessToken(session.accessToken, {
      userId: session.userId, email: session.email, fullName: session.fullName, systemRole: session.systemRole.toUpperCase(),
    });
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [path] }, createElement(AuthProvider, null, createElement(App)))));
  };
  await mount(user, '/dashboard');
  await until(() => document.querySelector(`select[aria-label="Chọn không gian làm việc"] option[value="${report.farmId}"]`));
  check('Real farm appears in the React workspace selector as Owner', document.querySelector(`select[aria-label="Chọn không gian làm việc"] option[value="${report.farmId}"]`).textContent.includes('Chủ trang trại'));
  check('React grants Owner-only expenses and membership navigation', document.querySelector('.sidebar a[href="/expenses"]') && document.querySelector('.sidebar a[href="/members"]'));
  await mount(user, '/admin/registrations');
  await until(() => document.querySelector('.personal-dashboard'));
  check('React blocks the User from viewing admin registrations', !document.querySelector('.admin-table'));
  await mount(admin, '/admin/registrations');
  const label = `Xem chi tiết E2E REJECT ${report.runId}`;
  await until(() => [...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === label));
  const detailsButton = [...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === label);
  await act(async () => detailsButton.click());
  const value = label => [...document.querySelectorAll('dialog .admin-details > div')].find(node => node.querySelector('dt')?.textContent === label)?.querySelector('dd')?.textContent;
  check('Admin React detail shows the preserved original description from the real backend', value('Mô tả trang trại') === `Original rejection description ${report.runId}`);
  check('Admin React detail shows rejection reason in its separate field', value('Lý do từ chối') === `Separate rejection reason ${report.runId}`);
  const staff = await login('staff1@dalatfarm.com');
  const staffHeaders = { Authorization: `Bearer ${staff.accessToken}` };
  const staffAdminResponse = await fetch(`${report.api}/admin/farm-registrations`, { headers: staffHeaders });
  check('Real backend denies Staff access to admin registration APIs', staffAdminResponse.status === 403);
  const otherRegistration = await fetch(`${report.api}/farm-registrations/${report.registrationIds[0]}`, { headers: staffHeaders });
  check('Staff cannot read another applicant registration through the User API', [403, 404].includes(otherRegistration.status));
  await mount(staff, '/admin/registrations');
  await until(() => document.querySelector('.personal-dashboard'));
  check('React also blocks Staff from admin registration screens', !document.querySelector('.admin-table'));
  report.uiCompleted = true;
} catch (error) {
  report.uiCompleted = false;
  report.uiError = error.message;
  throw error;
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  dom.window.close();
  for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}
