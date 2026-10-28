import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import axios from 'axios';

test('sidebar toggles for Admin, User, Owner and Staff without changing URL, content or permissions', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldAdapter = axios.defaults.adapter;
  let currentFarmRole = null;
  const logoutCalls = [];
  const zone = { zoneId: 5, farmId: 1, zoneName: 'Khu cây ăn trái', areaValue: 1000,
    areaUnit: 'm2', status: 'active', createdAt: '2026-10-01T00:00:00Z' };
  axios.defaults.adapter = async (config) => {
    if (config.url === '/auth/logout') logoutCalls.push(config);
    let data = {
      items: currentFarmRole ? [{ id: 1, farmCode: 'F1', farmName: 'Test Farm', currentUserRole: currentFarmRole, status: 'ACTIVE' }] : [],
      page: 0, size: 12, totalPages: 1, totalElements: currentFarmRole ? 1 : 0, last: true,
    };
    if (config.url === '/farms/1/zones') data = [zone];
    if (config.url === '/zones/5') data = zone;
    if (config.url.startsWith('/blocks?') || config.url.includes('zone-assignments') || config.url.endsWith('/zones/assigned')) data = [];
    return ({
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    data: JSON.stringify({ success: true, data }),
    });
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    function Location() { return createElement('output', { id: 'test-location' }, useLocation().pathname); }
    for (const role of ['ADMIN', 'USER', 'OWNER', 'STAFF']) {
      const farmRole = ['OWNER', 'STAFF'].includes(role) ? role : null;
      currentFarmRole = farmRole;
      storage.saveAccessToken('test-session', { userId: role, email: 'test@example.com', fullName: 'Test', systemRole: role === 'ADMIN' ? 'ADMIN' : 'USER' }, `refresh-${role}`);
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [role === 'ADMIN' ? '/admin/registrations' : '/dashboard'] }, createElement(AuthProvider, null, createElement(App), createElement(Location)))));
      if (farmRole) {
        const select = document.querySelector('.workspace-switcher select');
        assert.ok(select, role);
        await act(async () => { select.value = '1'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
      }
      const url = document.getElementById('test-location').textContent;
      const content = document.querySelector('main').innerHTML;
      const links = [...document.querySelectorAll('.sidebar a')].map(link => link.getAttribute('href'));
      const button = document.querySelector('.sidebar-toggle');
      const brand = document.querySelector('.sidebar > .brand');
      assert.ok(brand.querySelector('svg'));
      assert.ok(button.closest('.sidebar'));
      assert.equal(button.getAttribute('aria-expanded'), 'true');
      await act(async () => button.click());
      assert.equal(document.querySelector('.sidebar-content').hidden, true, role);
      assert.equal(document.querySelector('.sidebar > .brand'), brand);
      assert.equal(brand.querySelector('strong').hidden, true);
      assert.equal(button.getAttribute('aria-expanded'), 'false');
      assert.equal(document.getElementById('test-location').textContent, url);
      assert.equal(document.querySelector('main').innerHTML, content);
      await act(async () => button.click());
      assert.equal(document.querySelector('.sidebar-content').hidden, false, role);
      assert.equal(brand.querySelector('strong').hidden, false);
      assert.equal(button.getAttribute('aria-expanded'), 'true');
      assert.equal(document.getElementById('test-location').textContent, url);
      assert.deepEqual([...document.querySelectorAll('.sidebar a')].map(link => link.getAttribute('href')), links);
      if (farmRole) {
        const productionLink = document.querySelector('.sidebar a[href="/production-areas"]');
        await act(async () => productionLink.click());
        assert.equal(productionLink.getAttribute('aria-current'), 'page');
        document.documentElement.scrollTop = 500;
        document.body.scrollTop = 500;
        await act(async () => document.querySelector('.zone-card-actions a').click());
        assert.equal(document.getElementById('test-location').textContent, '/zones/5');
        assert.equal(document.documentElement.scrollTop, 0);
        assert.equal(document.body.scrollTop, 0);
        assert.equal(productionLink.classList.contains('active'), true);
        assert.equal(productionLink.getAttribute('aria-current'), 'page');
        assert.match(document.querySelector('main').textContent, /Phân khu chưa có lô đất nào/);
      }
      await act(async () => document.querySelector('.sidebar-logout').click());
      const logout = logoutCalls.at(-1);
      assert.equal(logoutCalls.length, ['ADMIN', 'USER', 'OWNER', 'STAFF'].indexOf(role) + 1);
      assert.equal(logout.method, 'post');
      assert.deepEqual(JSON.parse(logout.data), { refreshToken: `refresh-${role}` });
      assert.equal(logout.headers.has('Authorization'), false);
      assert.equal(storage.getAccessToken(), null);
      assert.equal(storage.getRefreshToken(), null);
      await act(async () => root.unmount());
      root = undefined;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    axios.defaults.adapter = oldAdapter;
    dom.window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
