import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';

test('sidebar toggles for Admin, User, Owner and Staff without changing URL, content or permissions', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldFetch = globalThis.fetch;
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
      globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: { items: farmRole ? [{ id: 1, farmCode: 'F1', farmName: 'Test Farm', currentUserRole: farmRole, status: 'ACTIVE' }] : [], page: 0, size: 12, totalPages: 1, totalElements: farmRole ? 1 : 0, last: true } }), { headers: { 'Content-Type': 'application/json' } });
      storage.saveAccessToken('test-session', { userId: role, email: 'test@example.com', fullName: 'Test', systemRole: role === 'ADMIN' ? 'ADMIN' : 'USER' });
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
      await act(async () => root.unmount());
      root = undefined;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    globalThis.fetch = oldFetch;
    dom.window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
