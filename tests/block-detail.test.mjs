import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';

test('block detail opens from the zone, loads server data, retries failures and cancels on close', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldAdapter = axios.defaults.adapter;
  const calls = [];
  let failure = true;
  let hold = false;
  let release;
  let detailSignal;
  let listFailure = false;
  let emptyList = false;
  const block = { blockId: 7, zoneId: 3, blockName: 'Lô A', areaValue: 100,
    areaUnit: 'm2', status: 'AVAILABLE', createdAt: '2026-10-01T00:00:00Z' };
  axios.defaults.adapter = async config => {
    calls.push(config.url);
    let data = [];
    let status = 200;
    if (config.url.startsWith('/farms?')) data = { items: [{ id: 1, farmName: 'Farm', currentUserRole: 'OWNER' }], last: true, totalPages: 1 };
    if (config.url === '/zones/3') data = { zoneId: 3, zoneName: 'Phân khu A', areaValue: 500, areaUnit: 'm2', createdAt: block.createdAt };
    if (config.url.startsWith('/blocks?')) data = emptyList ? [] : [block];
    if (listFailure && config.url === '/farms/1/zones') status = 503;
    if (config.url === '/blocks/7') {
      detailSignal = config.signal;
      if (hold) await new Promise(done => { release = done; });
      status = failure ? 404 : 200;
      data = { ...block, blockName: 'Tên mới từ backend', latitude: 0, longitude: null, description: 'Mô tả từ backend' };
      assert.equal(config.headers.get('Authorization'), 'Bearer test-session');
    }
    return { config, status, headers: {}, statusText: '', data: JSON.stringify({ success: status === 200,
      message: status === 503 ? 'Máy chủ đang lỗi, chưa tải được phân khu.' : failure && config.url === '/blocks/7' ? 'Không tìm thấy lô đất.' : 'OK', data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { ZoneDetailPage } = await server.ssrLoadModule('/src/pages/zone/ZoneDetailPage.tsx');
    const { ZoneListPage } = await server.ssrLoadModule('/src/pages/zone/ZoneListPage.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const { FarmWorkspaceProvider } = await server.ssrLoadModule('/src/features/farm-management/FarmWorkspace.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    storage.saveAccessToken('test-session', { userId: 1, systemRole: 'USER' });
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/zones/3'] },
      createElement(AuthProvider, null, createElement(FarmWorkspaceProvider, null, createElement(Routes, null,
        createElement(Route, { path: '/zones/:zoneId', element: createElement(ZoneDetailPage) })))))));
    assert.equal(calls.includes('/blocks/7'), false);
    await act(async () => document.querySelector('[aria-label="Xem chi tiết Lô A"]').click());
    assert.match(document.querySelector('[role="alert"]').textContent, /Không tìm thấy lô đất/);
    failure = false;
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Thử lại').click());
    const dialog = document.querySelector('[role="dialog"]');
    assert.match(dialog.textContent, /Tên mới từ backend/);
    assert.match(dialog.textContent, /Mô tả từ backend/);
    assert.equal(dialog.querySelector('img'), null);
    assert.equal([...dialog.querySelectorAll('dt')].find(node => node.textContent === 'Vĩ độ').nextElementSibling.textContent, '0');
    await act(async () => document.querySelector('.modal-close').click());
    hold = true;
    await act(async () => document.querySelector('[aria-label="Xem chi tiết Lô A"]').click());
    assert.match(document.querySelector('[role="status"]').textContent, /Đang tải chi tiết/);
    await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' })));
    assert.equal(detailSignal.aborted, true);
    await act(async () => release());
    assert.equal(document.querySelector('[role="dialog"]'), null);
    await act(async () => root.unmount());
    listFailure = true;
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/zones'] },
      createElement(AuthProvider, null, createElement(FarmWorkspaceProvider, null, createElement(ZoneListPage))))));
    assert.match(document.querySelector('[role="alert"]').textContent, /Máy chủ đang lỗi/);
    assert.deepEqual([...document.querySelectorAll('.stat-number')].map(node => node.textContent.trim()), ['—', '—', '—', '—']);
    assert.doesNotMatch(document.body.textContent, /Chưa tìm thấy phân khu nào/);
    listFailure = false;
    emptyList = true;
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Thử lại').click());
    assert.equal(document.querySelector('[role="alert"]'), null);
    assert.match(document.body.textContent, /Chưa tìm thấy phân khu nào/);
    assert.deepEqual([...document.querySelectorAll('.stat-number')].map(node => node.textContent.trim()), ['0 khu', '0 lô', '0 m²', '0 khu']);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    axios.defaults.adapter = oldAdapter;
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
