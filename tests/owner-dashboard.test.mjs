import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

test('owner metrics convert areas, reject ambiguous allocations and clamp time progress', async () => {
  const source = stripTypeScriptTypes(await readFile('src/features/owner-dashboard/dashboardModel.ts', 'utf8'), { mode: 'transform' });
  const model = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.equal(model.areaInM2(1.5, 'ha'), 15000);
  assert.equal(model.areaInM2(500, 'm²'), 500);
  assert.equal(model.areaInM2(1, 'unknown'), null);
  assert.equal(model.areaInM2(-1, 'm2'), null);
  assert.equal(model.timeProgress('2026-01-01', '2026-03-01', new Date('2025-01-01').getTime()), 0);
  assert.equal(model.timeProgress('2026-01-01', '2026-03-01', new Date('2027-01-01').getTime()), 100);
  assert.equal(model.timeProgress('2026-03-01', '2026-01-01'), null);
  assert.equal(model.timeProgress('2026-01-01', null), null);
  const seasons = [
    { cropSeasonId: 1, cropCategoryName: 'Dưa lưới', seasonStatus: 'active' },
    { cropSeasonId: 2, cropCategoryName: 'Rau', seasonStatus: 'completed' },
  ];
  const allocations = [
    { cropSeasonId: 1, blockId: 10, plantedArea: 1, areaUnit: 'ha' },
    { cropSeasonId: 2, blockId: 10, plantedArea: 1, areaUnit: 'ha' },
  ];
  assert.deepEqual(model.aggregateCropAreas(seasons, allocations), [{ name: 'Dưa lưới', areaM2: 10000 }]);
  assert.equal(model.aggregateCropAreas([...seasons, { cropSeasonId: 3, cropCategoryName: 'Rau', seasonStatus: 'active' }], [...allocations, { cropSeasonId: 3, blockId: 10, plantedArea: 1, areaUnit: 'ha' }]), null);
  assert.equal(model.aggregateCropAreas(seasons, []), null);
});

test('owner dashboard uses live farm totals, labels samples, opens existing edit and keeps Staff dashboard', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const adapter = axios.defaults.adapter;
  const calls = [];
  const farms = [
    { id: 1, farmName: 'Farm One', currentUserRole: 'OWNER', status: 'ACTIVE' },
    { id: 2, farmName: 'Farm Two', currentUserRole: 'STAFF', status: 'ACTIVE' },
  ];
  let failed = false;
  axios.defaults.adapter = async config => {
    calls.push(config.url);
    let data;
    if (config.url.startsWith('/farms?')) data = { items: farms, last: true, totalPages: 1 };
    else if (config.url === '/farms/1') data = { ...farms[0], address: 'Địa chỉ thật', description: 'Farm description', latitude: null, longitude: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    else if (config.url.startsWith('/blocks?')) data = [101, 102].map((blockId, i) => ({ blockId, farmId: 1, zoneId: 5, blockName: 'Block ' + blockId, areaValue: i ? .5 : 10000, areaUnit: i ? 'ha' : 'm2', status: 'active' }));
    else if (config.url === '/farms/1/zones') data = [5, 6].map(zoneId => ({ zoneId, farmId: 1, zoneName: 'Zone ' + zoneId, areaValue: 99999, areaUnit: 'm2', status: 'active' }));
    else if (config.url.startsWith('/farms/1/members/staff')) data = [10, 10, 11].map((userId, index) => ({ id: 100 + index, userId, farmId: 1, fullName: 'Staff ' + userId, email: 'test@example.com', farmRole: 'staff', status: 'active' }));
    else if (config.url.startsWith('/farms/1/crop-seasons?')) {
      const page = new URL(config.url, 'http://localhost').searchParams.get('page');
      data = { items: [{ cropSeasonId: page === '0' ? 11 : 12, farmId: 1, seasonName: page === '0' ? 'Live season' : 'Old season', cropCategoryName: 'Dưa lưới', seasonStatus: page === '0' ? 'active' : 'completed', startDate: '2026-01-01', endDate: '2026-12-31', createdAt: '2026-01-01T08:00:00' }], last: page === '1' };
    } else if (config.url === '/crop-seasons/11/blocks') data = [101, 102].map((blockId, i) => ({ cropSeasonId: 11, blockId, plantedArea: i ? 5000 : 10000, areaUnit: 'm2' }));
    else if (config.url.startsWith('/material-usages?')) data = { items: [{ materialUsageId: 3, materialName: 'Live material', quantity: 2, unit: 'kg', usedAt: '2026-10-01T08:00:00' }] };
    else throw new Error('Unexpected request ' + config.url);
    return { config, headers: {}, status: failed && !config.url.startsWith('/farms?') ? 500 : 200, statusText: '', data: JSON.stringify({ success: !failed || config.url.startsWith('/farms?'), message: 'Test response', data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    storage.saveAccessToken('test-session', { userId: 1, systemRole: 'USER', email: 'owner@example.com', fullName: 'Owner' });
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/dashboard'] }, createElement(AuthProvider, null, createElement(App)))));
    assert.match(document.querySelector('.owner-hero h1').textContent, /Farm One/);
    assert.match(document.querySelector('.owner-hero-meta').textContent, /Địa chỉ thật/);
    const cards = [...document.querySelectorAll('.owner-stat-value-row > strong')].map(node => node.textContent);
    assert.deepEqual(cards, ['1,5 ha', '1', '2 người', '2 khu']);
    assert.equal(document.querySelectorAll('.owner-stat-grid .owner-demo-tag').length, 0);
    assert.match(document.querySelector('.owner-season-list').textContent, /Live season/);
    assert.doesNotMatch(document.querySelector('.owner-season-list').textContent, /Old season/);
    assert.match(document.querySelector('.owner-donut-label').textContent, /1,5 ha/);
    assert.ok(document.querySelector('.owner-environment-panel .owner-demo-tag'));
    assert.match(document.querySelector('.owner-recent-list').textContent, /Live material/);
    assert.ok(!calls.includes('/crop-seasons/12/blocks'));
    await act(async () => {
      const select = document.querySelector('.workspace-switcher select');
      select.value = '2'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });
    assert.equal(document.querySelector('.owner-dashboard'), null);
    assert.match(document.querySelector('.personal-dashboard').textContent, /Farm Two/);
    await act(async () => { const select = document.querySelector('.workspace-switcher select'); select.value = '1'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    await act(async () => document.querySelector('.owner-edit-link').click());
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.match(document.querySelector('[role="dialog"]').textContent, /Chỉnh sửa/);
    failed = true;
    const api = await server.ssrLoadModule('/src/features/owner-dashboard/dashboardApi.ts');
    const result = await api.loadOwnerDashboard(1, new AbortController().signal);
    assert.equal(result.seasons, null);
    assert.ok(result.issues.includes('mùa vụ'));
    assert.equal(result.staffCount, null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); axios.defaults.adapter = adapter; dom.window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
