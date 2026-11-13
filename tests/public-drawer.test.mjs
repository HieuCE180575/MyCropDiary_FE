import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

test('public mobile drawer supports guests and accounts, keyboard, language, navigation and desktop resize', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const listeners = new Set();
  const desktop = { matches: false, addEventListener: (_, callback) => listeners.add(callback),
    removeEventListener: (_, callback) => listeners.delete(callback) };
  dom.window.matchMedia = () => desktop;
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const adapter = axios.defaults.adapter;
  const requests = [];
  axios.defaults.adapter = async config => {
    requests.push(config);
    return { config, headers: {}, status: 200, data: JSON.stringify({ success: true, data: [] }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { PublicHeader } = await server.ssrLoadModule('/src/shared/components/PublicHeader.tsx');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    let navigate;
    let pathname;
    function Location() { navigate = useNavigate(); pathname = useLocation().pathname; return null; }
    for (const role of [null, 'USER', 'ADMIN']) {
      desktop.matches = false;
      localStorage.setItem('mcd_lang', 'vi');
      if (role) storage.saveAccessToken('fixture', { userId: 1, email: 'fixture@example.test', fullName: 'Fixture', systemRole: role });
      else storage.clearAccessToken();
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/about'] },
        createElement(LanguageProvider, null, createElement(AuthProvider, null, createElement(PublicHeader), createElement(Location))))));
      const opener = document.querySelector('.mobile-menu-toggle');
      const open = async () => {
        opener.focus(); await act(async () => opener.click());
        const dialog = document.querySelector('dialog'); assert.ok(dialog?.open);
        assert.equal(opener.getAttribute('aria-expanded'), 'true');
        assert.ok(document.getElementById(opener.getAttribute('aria-controls')));
        assert.ok(document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent);
        assert.equal(document.body.style.overflow, 'hidden');
        assert.equal(document.activeElement, dialog.querySelector('.modal-close'));
        return dialog;
      };
      let dialog = await open();
      assert.equal(dialog.querySelector('a[href="/about"]').getAttribute('aria-current'), 'page');
      if (role) assert.ok(dialog.querySelector(`a[href="${role === 'ADMIN' ? '/admin' : '/dashboard'}"]`));
      else assert.ok(dialog.querySelector('a[href="/register"]'));
      const close = dialog.querySelector('.modal-close');
      const controls = [...dialog.querySelectorAll('button, a[href]')];
      await act(async () => close.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
      assert.equal(document.activeElement, controls.at(-1));
      await act(async () => controls.at(-1).dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
      assert.equal(document.activeElement, close);
      const titleBefore = dialog.querySelector('h2').textContent;
      await act(async () => dialog.querySelector('.header-translate-btn').click());
      assert.notEqual(dialog.querySelector('h2').textContent, titleBefore);
      await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true })));
      assert.equal(document.querySelector('dialog'), null);
      assert.equal(document.body.style.overflow, ''); assert.equal(document.activeElement, opener);
      dialog = await open();
      await act(async () => dialog.querySelector('.modal-close').click());
      assert.equal(document.querySelector('dialog'), null);
      dialog = await open();
      await act(async () => dialog.querySelector('a[href="/features"]').click());
      assert.equal(pathname, '/features'); assert.equal(document.querySelector('dialog'), null);
      await open();
      await act(async () => navigate(-1));
      assert.equal(pathname, '/about'); assert.equal(document.querySelector('dialog'), null);
      await open();
      await act(async () => { desktop.matches = true; for (const listener of listeners) listener(); });
      assert.equal(document.querySelector('dialog'), null); assert.equal(document.body.style.overflow, '');
      desktop.matches = false;
      dialog = await open();
      await act(async () => dialog.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, clientX: -1, clientY: -1 })));
      assert.equal(document.querySelector('dialog'), null);
      await act(async () => root.unmount()); root = undefined;
      assert.equal(listeners.size, 0);
    }
    assert.equal(requests.filter(config => config.method !== 'get').length, 0, 'Opening and dismissing navigation never submits data');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); axios.defaults.adapter = adapter; dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
