import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

test('VietGAP sidebar order, route tabs, history and retained inputs work for Owner and Staff', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
    IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const adapter = axios.defaults.adapter;
  let farmRole = 'OWNER';
  const writes = [];
  let requests = 0;
  axios.defaults.adapter = async config => {
    requests++;
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) writes.push(config);
    let data = [];
    if (config.url.startsWith('/farms?')) data = { items: [{ id: 1, farmName: 'Test farm', currentUserRole: farmRole, status: 'ACTIVE' }], last: true, totalPages: 1 };
    if (config.url.includes('/trainings')) data = { items: [], totalElements: 0 };
    return { config, headers: {}, status: 200, statusText: 'OK', data: JSON.stringify({ success: true, data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  let navigate;
  let pathname;
  try {
    const { createRoot } = await import('react-dom/client');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    const { moduleDefinitions } = await server.ssrLoadModule('/src/app/routes/moduleDefinitions.ts');
    const paths = ['/checklists', '/assessments', '/environment', '/training'];
    const keys = paths.map(path => path.slice(1));
    const start = moduleDefinitions.findIndex(module => module.key === 'checklists');
    assert.deepEqual(moduleDefinitions.slice(start, start + 4).map(module => module.key), keys);
    assert.deepEqual(keys.map(key => moduleDefinitions.find(module => module.key === key).icon), ['check', 'check', 'drop', 'book']);
    localStorage.setItem('mcd_lang', 'en');
    storage.saveAccessToken('test-session', { userId: 1, email: 'test@example.com', fullName: 'Test', systemRole: 'USER' }, 'refresh');
    function Location() { navigate = useNavigate(); pathname = useLocation().pathname; return null; }
    const mount = async path => {
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [path] },
        createElement(AuthProvider, null, createElement(App), createElement(Location)))));
      const workspace = document.querySelector('.workspace-switcher select');
      if (workspace && workspace.value !== '1') await act(async () => {
        workspace.value = '1'; workspace.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      });
    };
    const labels = ['Criteria checklist (', 'Internal assessments', 'Soil, Water & Environment', 'Occupational safety training'];
    const tab = index => [...document.querySelectorAll('main button')].find(button => button.textContent.includes(labels[index]));
    const assertTab = path => {
      assert.equal(pathname, path);
      const index = paths.indexOf(path);
      for (let i = 0; i < 4; i++) assert.equal(tab(i).getAttribute('aria-selected'), String(i === index));
      for (const linkPath of paths) assert.equal(document.querySelector(`.sidebar a[href="${linkPath}"]`).getAttribute('aria-current'), linkPath === path ? 'page' : null);
      const contents = ['VietGAP field inspection history', 'VietGAP internal assessment records', 'Saved soil test records', 'VietGAP training records'];
      assert.ok(document.querySelector('main').textContent.includes(contents[index]));
    };
    const sidebar = async path => {
      await act(async () => document.querySelector(`.sidebar a[href="${path}"]`).click()); assertTab(path);
    };
    for (const role of ['OWNER', 'STAFF']) {
      farmRole = role;
      await mount('/profile');
      const menu = [...document.querySelectorAll('.nav-list a')].map(link => link.getAttribute('href'));
      assert.deepEqual(menu.slice(menu.indexOf(paths[0]), menu.indexOf(paths[0]) + 4), paths);
      for (const path of paths) {
        await act(async () => navigate('/profile')); await sidebar(path);
      }
      // All twelve transitions and repeated clicks on the selected item.
      for (const from of paths) {
        await sidebar(from); await sidebar(from);
        for (const to of paths.filter(path => path !== from)) { await sidebar(to); await sidebar(from); }
      }
      await sidebar('/training');
      const filter = document.querySelector('input[placeholder="Search by title, organizer, or content..."]');
      await act(async () => {
        Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(filter, 'Retained course filter');
        filter.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
      for (const index of [0, 1, 2, 3]) { await act(async () => tab(index).click()); assertTab(paths[index]); }
      assert.equal(document.querySelector('input[placeholder="Search by title, organizer, or content..."]').value, 'Retained course filter');
      await act(async () => tab(3).click());
      for (const path of ['/environment', '/assessments', '/checklists', '/training']) {
        await act(async () => navigate(-1)); assertTab(path);
      }
      for (const path of paths) { await act(async () => navigate(1)); assertTab(path); }
      assert.equal(document.querySelector('input[placeholder="Search by title, organizer, or content..."]').value, 'Retained course filter');
      // Same sidebar DOM supports the collapsed layout, with unchanged order and routes.
      await act(async () => document.querySelector('.sidebar-toggle').click());
      await sidebar('/environment');
      await act(async () => document.querySelector('.sidebar-toggle').click());
      await sidebar('/checklists');
      const checkSubTabs = async (prefix, count) => {
        const tabs = [...document.querySelectorAll(`[role="tab"][id^="${prefix}-tab-"]`)];
        assert.equal(tabs.length, count);
        const before = requests;
        tabs[0].focus();
        await act(async () => tabs[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
        assert.ok(document.activeElement === tabs[1]);
        assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
        for (const selected of [...tabs, tabs[0]]) {
          await act(async () => selected.click());
          assert.equal(selected.getAttribute('aria-selected'), 'true');
          const panel = document.getElementById(selected.getAttribute('aria-controls'));
          assert.equal(panel.getAttribute('aria-labelledby'), selected.id);
          assert.equal(panel.getAttribute('role'), 'tabpanel');
          for (const table of panel.querySelectorAll('table')) {
            assert.ok(table.classList.contains('ui-data-table'));
            assert.ok(table.parentElement.classList.contains('ui-table-scroll'));
            assert.ok([...table.querySelectorAll('th')].every(header => header.scope === 'col'));
          }
          assert.equal(tabs.filter(item => item.getAttribute('aria-selected') === 'true').length, 1);
        }
        assert.equal(requests, before, 'Sub-tabs reuse the existing data');
      };
      await checkSubTabs('vietgap-checklist', 2);
      await sidebar('/environment');
      await checkSubTabs('vietgap-environment', 3);
      const beforeTheme = requests;
      for (const theme of ['dark', 'light']) {
        await act(async () => document.querySelector('.theme-toggle-switch').click());
        assert.equal(document.documentElement.dataset.theme, theme);
        assert.equal(document.getElementById('vietgap-environment-tab-risks').getAttribute('aria-selected'), 'true');
        await act(async () => document.querySelector('.account-profile').click());
        const menu = document.querySelector('.account-dropdown-menu');
        assert.equal(menu.style.background, 'var(--color-surface)');
        assert.equal(menu.querySelector('p').style.color, 'var(--color-text)');
        assert.equal(menu.querySelector('.logout-action').style.color, 'rgb(220, 38, 38)');
        await act(async () => document.querySelector('.account-profile').click());
      }
      assert.equal(requests, beforeTheme);
      for (const language of ['vi', 'en']) {
        await act(async () => document.querySelector('.header-translate-btn').click());
        assert.equal(document.documentElement.lang, language);
        assert.equal(document.getElementById('vietgap-environment-tab-risks').getAttribute('aria-selected'), 'true');
      }
      await act(async () => root.unmount()); root = undefined;
      // Fresh mounts verify URL selection after direct entry / refresh.
      for (const path of paths) {
        await mount(path); assertTab(path);
        await act(async () => root.unmount()); root = undefined;
      }
    }
    assert.equal(writes.length, 0, 'Navigation never submits or changes business data');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); axios.defaults.adapter = adapter; dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
