import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
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
    if (config.url.startsWith('/blocks?') || config.url.includes('zone-assignments') || config.url.endsWith('/zones/assigned') || config.url.startsWith('/farms/1/members/staff') || config.url.startsWith('/farms/1/workers')) data = [];
    if (config.url.startsWith('/ai/')) data = [];
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
    const { moduleDefinitions } = await server.ssrLoadModule('/src/app/routes/moduleDefinitions.ts');
    const { translations } = await server.ssrLoadModule('/src/shared/i18n/translations.ts');
    for (const module of moduleDefinitions) {
      assert.ok(translations.vi[module.title], `Missing Vietnamese navigation label: ${module.title}`);
    }
    let navigate;
    function Location() { navigate = useNavigate(); return createElement('output', { id: 'test-location' }, useLocation().pathname); }
    for (const role of ['ADMIN', 'USER', 'OWNER', 'STAFF']) {
      const farmRole = ['OWNER', 'STAFF'].includes(role) ? role : null;
      currentFarmRole = farmRole;
      localStorage.setItem('mcd_lang', 'vi');
      localStorage.setItem('mcd_theme', 'dark');
      storage.saveAccessToken('test-session', { userId: role, email: 'test@example.com', fullName: 'Test', systemRole: role === 'ADMIN' ? 'ADMIN' : 'USER' }, `refresh-${role}`);
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [role === 'ADMIN' ? '/admin/registrations' : '/dashboard'] }, createElement(AuthProvider, null, createElement(App), createElement(Location)))));
      assert.equal(document.documentElement.dataset.theme, 'dark', `${role}: restore the workspace preference`);
      assert.equal(document.body.classList.contains('dark-theme'), true);
      if (farmRole) {
        const select = document.querySelector('.workspace-switcher select');
        assert.ok(select, role);
        await act(async () => { select.value = '1'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
      }
      for (const language of ['vi', 'en', 'vi']) {
        if (document.documentElement.lang !== language) {
          await act(async () => document.querySelector('.header-translate-btn').click());
        }
        const expected = key => language === 'vi' ? translations.vi[key] : key;
        assert.equal(document.querySelector('.sidebar-nav-caption').textContent, expected('MENU'));
        assert.equal(document.querySelector('.nav-list').getAttribute('aria-label'), expected('Primary navigation'));
        assert.equal(document.querySelector('.sidebar a[href="/profile"]').textContent.trim(), expected('Profile'));
        for (const group of document.querySelectorAll('.sidebar-nav-group')) {
          const titles = { overview: 'Dashboard', farm: 'Farm Setup', supplies: 'Material Preparation',
            cultivation: 'Cultivation', compliance: 'VietGAP Compliance', reports: 'Costs & Reports',
            knowledge: 'Knowledge & AI', account: 'Account' };
          assert.equal(group.querySelector('.sidebar-group-toggle span').textContent, expected(titles[group.dataset.group]));
        }
        for (const module of moduleDefinitions) {
          const link = document.querySelector(`.nav-list a[href="/${module.path}"]`);
          if (link && module.key !== 'admin') {
            assert.equal(link.textContent.trim(), expected(module.key === 'profile' ? 'Profile' : module.title), `${role}: ${language}: ${module.key}`);
          }
        }
        if (role === 'USER') {
          assert.equal(document.querySelector('.season-card strong').textContent.trim(), expected('Your Farm'));
          assert.equal(document.querySelector('.season-card a').textContent.trim(), expected('Register Farm'));
        }
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
      assert.equal(button.title, 'Mở rộng thanh điều hướng');
      assert.equal(document.querySelector('.nav-list a[href="/profile"]').title, 'Hồ sơ');
      assert.equal(document.querySelector('.sidebar-logout').title, translations.vi['Sign Out']);
      assert.equal(document.getElementById('test-location').textContent, url);
      assert.equal(document.querySelector('main').innerHTML, content);
      await act(async () => button.click());
      assert.equal(document.querySelector('.sidebar-content').hidden, false, role);
      assert.equal(brand.querySelector('strong').hidden, false);
      assert.equal(button.getAttribute('aria-expanded'), 'true');
      assert.equal(document.getElementById('test-location').textContent, url);
      assert.deepEqual([...document.querySelectorAll('.sidebar a')].map(link => link.getAttribute('href')), links);
      if (role !== 'ADMIN') {
        const expectedGroups = [
          ['overview', ['/dashboard']],
          ['farm', ['/farm-registration', '/farm', '/members', '/production-areas']],
          ['supplies', ['/suppliers', '/purchases']],
          ['cultivation', ['/crop-seasons', '/tasks', '/activities', '/materials', '/harvests']],
          ['compliance', ['/checklists', '/assessments', '/environment', '/training']],
          ['reports', ['/expenses', '/reports']],
          ['knowledge', ['/knowledge', '/ai', '/ai-history', '/ai-feedback', '/ai-drafts']],
          ['account', ['/profile']],
        ].map(([id, paths]) => [id, paths.filter(path => links.includes(path))]).filter(([, paths]) => paths.length);
        assert.deepEqual([...document.querySelectorAll('.sidebar-nav-group')].map(group => [group.dataset.group,
          [...group.querySelectorAll('a')].map(link => link.getAttribute('href'))]), expectedGroups);
        const groupToggle = document.querySelector('[data-group="knowledge"] .sidebar-group-toggle');
        await act(async () => groupToggle.click());
        assert.equal(groupToggle.getAttribute('aria-expanded'), 'false');
        assert.equal(document.getElementById(groupToggle.getAttribute('aria-controls')).hidden, true);
        assert.equal(document.getElementById('test-location').textContent, url);
        assert.equal(document.querySelector('main').innerHTML, content);
        await act(async () => navigate('/ai-history'));
        assert.equal(groupToggle.getAttribute('aria-expanded'), 'true', 'Navigation opens the active group');
        assert.equal(document.querySelector('.sidebar a[href="/ai-history"]').getAttribute('aria-current'), 'page');
      }
      if (farmRole) {
        assert.equal(document.querySelector('.sidebar a[href="/workers"]'), null);
        const membersLink = document.querySelector('.sidebar a[href="/members"]');
        assert.ok(membersLink, role);
        assert.equal(membersLink.textContent.trim(), translations.vi['Staff & Assignments']);
        await act(async () => membersLink.click());
        assert.equal(document.getElementById('test-location').textContent, '/members');
        assert.ok(document.querySelector('main [role="tablist"]'), `${role} can still access staff management`);
        const staffTabs = [...document.querySelectorAll('main [role="tab"]')];
        assert.equal(staffTabs.length, 3);
        const search = document.querySelector('#staff-panel-staff input[type="search"]');
        await act(async () => {
          Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(search, 'Retained filter');
          search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        });
        for (const tab of [...staffTabs.slice(1), staffTabs[0]]) {
          await act(async () => tab.click());
          assert.equal(document.querySelectorAll('main [role="tab"][aria-selected="true"]').length, 1);
          assert.equal(tab.getAttribute('aria-selected'), 'true');
          const panel = document.getElementById(tab.getAttribute('aria-controls'));
          assert.equal(panel?.getAttribute('role'), 'tabpanel');
          assert.equal(panel.getAttribute('aria-labelledby'), tab.id);
          assert.equal(document.getElementById('test-location').textContent, '/members');
        }
        assert.equal(document.querySelector('#staff-panel-staff input[type="search"]').value, 'Retained filter');
        await act(async () => navigate('/workers'));
        assert.equal(document.getElementById('test-location').textContent, '/members');
        assert.equal(membersLink.getAttribute('aria-current'), 'page');
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
        assert.match(document.querySelector('main').textContent, /Khu vực chưa có lô sản xuất nào/);
      }
      await act(async () => document.querySelector('.sidebar-logout').click());
      const logout = logoutCalls.at(-1);
      assert.equal(logoutCalls.length, ['ADMIN', 'USER', 'OWNER', 'STAFF'].indexOf(role) + 1);
      assert.equal(logout.method, 'post');
      assert.deepEqual(JSON.parse(logout.data), { refreshToken: `refresh-${role}` });
      assert.equal(logout.headers.has('Authorization'), false);
      assert.equal(storage.getAccessToken(), null);
      assert.equal(storage.getRefreshToken(), null);
      assert.equal(document.getElementById('test-location').textContent, '/login');
      assert.equal(document.documentElement.dataset.theme, 'light', `${role}: logout must show a light login page`);
      assert.equal(document.body.classList.contains('dark-theme'), false);
      assert.equal(localStorage.getItem('mcd_theme'), 'dark', 'Public pages must not overwrite the workspace preference');
      await act(async () => navigate('/register'));
      assert.equal(document.documentElement.dataset.theme, 'light');
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
