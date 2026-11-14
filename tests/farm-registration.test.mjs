import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import axios from 'axios';

test('Manage Farms unifies applications and accessible farms without switching workspaces', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const replacements = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLDialogElement: dom.window.HTMLDialogElement, Node: dom.window.Node,
    Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const oldAdapter = axios.defaults.adapter;
  const calls = [];
  let unavailable = true, failSubmission = false;
  let applications = [], farms = [];
  const farm = id => ({ id, farmName: `Farm ${id}`, currentUserRole: id === 4 ? 'STAFF' : 'OWNER', status: 'ACTIVE',
    address: `Address ${id}`, description: `Description ${id}`, createdAt: '2026-10-01', updatedAt: '2026-10-01' });
  axios.defaults.adapter = async config => {
    calls.push(config);
    assert.equal(config.headers.get('Authorization'), 'Bearer user-session');
    let data, status = 200;
    const url = new URL(config.url, 'http://fixture');
    if (config.method === 'post' && url.pathname === '/farms') assert.fail('Never create an approved farm directly');
    if (url.pathname === '/farms') {
      const page = Number(url.searchParams.get('page'));
      data = { items: farms.slice(page, page + 1), last: page + 1 >= farms.length, totalPages: farms.length };
    } else if (/^\/farms\/\d+$/.test(url.pathname)) {
      data = farms.find(item => item.id === Number(url.pathname.split('/')[2]));
      if (!data) status = 403;
      else if (config.method === 'put') Object.assign(data, JSON.parse(config.data));
    } else if (url.pathname.includes('/members')) data = [];
    else if (url.pathname === '/farm-registrations' && config.method === 'post') {
      if (failSubmission) status = 503;
      else {
        data = { ...JSON.parse(config.data), registrationId: 23 + applications.length, status: 'PENDING', submittedAt: '2026-10-20T10:00:00' };
        applications.push(data);
      }
    } else if (url.pathname === '/farm-registrations') {
      if (unavailable) status = 503;
      const page = Number(url.searchParams.get('page'));
      data = { items: applications.slice(page, page + 1), last: page + 1 >= applications.length, totalPages: applications.length };
    } else if (url.pathname.startsWith('/farm-registrations/')) {
      data = applications.find(item => item.registrationId === Number(url.pathname.split('/')[2]));
      if (!data) status = 403;
      else if (config.method === 'patch') data.status = 'CANCELLED';
    } else if (url.pathname === '/user/farm-invitations') data = [];
    else if (url.pathname === '/notifications') data = { items: [], totalPages: 0, last: true };
    else status = 404;
    return { config, status, headers: {}, data: JSON.stringify({ success: status === 200, data, message: status === 403 ? 'Bạn không có quyền truy cập dữ liệu này.' : 'Registration service unavailable' }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root, navigate;
  try {
    const { createRoot } = await import('react-dom/client');
    const { MemoryRouter, useNavigate, useLocation } = await import('react-router-dom');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    storage.saveAccessToken('user-session', { userId: 12, email: 'farmer@example.com', fullName: 'Người dùng', systemRole: 'USER' });
    function Location() { navigate = useNavigate(); return createElement('output', { id: 'location' }, useLocation().pathname); }
    const mount = async (path = '/farms') => {
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [path] }, createElement(AuthProvider, null, createElement(App), createElement(Location)))));
    };
    const go = async path => act(async () => navigate(path));
    const click = async selector => {
      const element = document.querySelector(selector);
      assert.ok(element, `Missing ${selector}`);
      await act(async () => element.click());
    };
    const setValue = async (element, value) => act(async () => {
      const prototype = element.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : element.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
      element.dispatchEvent(new dom.window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
    const submit = () => act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));

    await mount('/farms');
    assert.ok(document.querySelector('main [role="alert"]'));
    unavailable = false;
    await click('main [role="alert"] button');
    await go('/farms/new');
    const signature = [...document.querySelectorAll('form input, form textarea')].map(field => field.type);
    await go('/farms');
    assert.equal(document.querySelectorAll('main tbody tr').length, 0);
    applications = [
      { registrationId: 23, farmName: 'Pending farm', addressLine: 'Address P', status: 'PENDING', submittedAt: '2026-10-20' },
      { registrationId: 24, farmName: 'Rejected farm', addressLine: 'Address R', status: 'REJECTED', rejectionReason: 'Missing documents', submittedAt: '2026-10-20' },
      { registrationId: 25, farmName: 'Farm 7', addressLine: 'Address A', province: 'Province A', district: 'District A', ward: 'Ward A', description: 'Original application description', documentUrl: 'https://example.com/certificate.pdf', handledAt: '2026-10-21', status: 'APPROVED', submittedAt: '2026-10-20' },
    ];
    farms = [farm(4),farm(7)];
    await act(async () => root.unmount());
    await mount('/farms');
    assert.equal(document.querySelectorAll('main tbody tr').length, 4);
    assert.equal(document.querySelector('main a[href="/farms/registrations/25"]'), null, 'Approved applications do not duplicate farm records in the list');
    assert.ok(document.querySelector('main a[href="/farms/7"]'), 'Farm records remain accessible alongside applications');
    assert.equal(document.querySelector('main a[href*="history="]'), null);
    await go('/farms?history=1');
    assert.equal(document.querySelectorAll('main tbody tr').length, 4, 'Old history URLs no longer switch to a separate list');
    assert.ok(document.querySelector('main a[href="/farms/7"]'));
    await go('/farms');
    await act(async () => [...document.querySelectorAll('main button[aria-pressed]')].find(button => /Card view|Dạng thẻ/.test(button.textContent) && button.getAttribute('aria-pressed') === 'false')?.click());
    assert.equal(document.querySelector('main table'), null);
    assert.ok(document.querySelector('main article a[href="/farms/7"]'));
    await act(async () => [...document.querySelectorAll('main button[aria-pressed]')].find(button => /Table view|Dạng bảng/.test(button.textContent) && button.getAttribute('aria-pressed') === 'false')?.click());
    assert.ok(calls.some(call => call.url.includes('/farm-registrations?page=2')));
    await setValue(document.querySelector('main select'), 'pending');
    assert.equal(document.querySelectorAll('main tbody tr').length, 1);
    await click('main a[href="/farms/registrations/23"]');
    assert.match(document.querySelector('.farm-registration-status').textContent, /Pending farm/);
    await act(async () => [...document.querySelectorAll('main button')].find(button => /Cancel Registration|Hủy đăng ký/.test(button.textContent)).click());
    await click('dialog .ui-button--danger');
    assert.equal(applications[0].status, 'CANCELLED');
    await go('/farms/registrations/24');
    assert.match(document.querySelector('.farm-registration-status').textContent, /Missing documents/);
    await go('/farms/registrations/999');
    assert.ok(document.querySelector('main [role="alert"]'));
    await go('/farms/7');
    assert.match(document.querySelector('main').textContent, /Description 7/);
    assert.match(document.querySelector('.farm-registration-history').textContent, /Original application description/);
    assert.ok(document.querySelector('.farm-registration-history').closest('.panel').textContent.includes('Description 7'), 'Application fields are inside the farm information card');
    assert.equal(document.querySelector('.farm-registration-history .farm-goong-map'), null);
    assert.equal(document.querySelector('main a[href="/harvests"]'), null, 'Quick links are removed from the profile card');
    assert.ok(document.querySelector('.farm-registration-history a[href="https://example.com/certificate.pdf"]'));
    await go('/farms'); await go('/farms/7');
    assert.ok(document.querySelector('.farm-registration-history a[href="https://example.com/certificate.pdf"]'), 'Documents are visible immediately after reopening farm details');
    assert.equal(document.querySelector('.workspace-switcher select').value, '4');
    await act(async () => [...document.querySelectorAll('main button')].find(button => /Edit Farm & Map|Chỉnh sửa trang trại/.test(button.textContent)).click());
    await setValue(document.querySelector('dialog input'), 'Edited Farm 7');
    await submit();
    assert.equal(calls.filter(call => call.method === 'put').at(-1).url, '/farms/7');
    await go('/farms/4');
    assert.equal(document.querySelector('.farm-registration-history'), null, 'Staff cannot see owner account application history');
    assert.equal([...document.querySelectorAll('main button')].some(button => /Edit Farm & Map|Chỉnh sửa trang trại/.test(button.textContent)), false);
    await go('/farms/999');
    assert.doesNotMatch(document.querySelector('main').textContent, /Description [47]/);
    await go('/farms/new');
    assert.deepEqual([...document.querySelectorAll('form input, form textarea')].map(field => field.type), signature);
    await submit();
    assert.equal(calls.some(call => call.method === 'post'), false);
    const inputs = [...document.querySelectorAll('form input[type="text"]')];
    await setValue(inputs[0], 'New owner farm');
    await setValue(inputs[1], '123 Green Street');
    failSubmission = true;
    await submit();
    assert.equal(document.getElementById('location').textContent, '/farms/new');
    assert.equal(document.querySelector('form input').value, 'New owner farm');
    assert.ok(document.querySelector('form [role="alert"]'));
    failSubmission = false;
    await submit();
    assert.equal(document.getElementById('location').textContent, '/farms');
    assert.equal(applications.at(-1).status, 'PENDING');
    assert.ok(calls.some(call => call.method === 'post' && call.url === '/farm-registrations'));
    assert.equal(calls.some(call => call.method === 'post' && call.url === '/farms'), false);
    await go('/farm');
    assert.equal(document.getElementById('location').textContent, '/farms');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close(); axios.defaults.adapter = oldAdapter;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
