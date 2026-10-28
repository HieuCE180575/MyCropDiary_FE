import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import axios from 'axios';

test('harvest loads detail, reuses the form for PUT, and preserves records on API errors', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldAdapter = axios.defaults.adapter;
  const calls = [];
  let detailFailure = true;
  let saveFailure = true;
  let listFailure = false;
  let emptyList = false;
  let holdList = false;
  let releaseList;
  let listSignal;
  let foreignFarm = false;
  const record = { harvestRecordId: 73, cropSeasonId: 17, farmId: 1, harvestLotCode: 'LOT-73',
    harvestedAt: '2026-10-28T08:30:00', quantity: 10, unit: 'basket', qualityGrade: 'A',
    traceabilityCode: 'TRACE-73', storageLocation: null, notes: 'List notes' };
  const detail = { ...record, quantity: 125.5, notes: 'Fresh server notes', recorderFullName: 'Recorder' };
  axios.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, data: config.data && JSON.parse(config.data) });
    let data = {};
    let success = true;
    if (config.url.startsWith('/farms?')) data = { items: [1, 2].map(id => ({ id, farmName: `Farm ${id}`, currentUserRole: 'OWNER', status: 'active' })), last: true, totalPages: 1 };
    if (config.url.startsWith('/harvest-records?')) {
      listSignal = config.signal;
      if (holdList) await new Promise(resolve => { releaseList = resolve; });
      data = { items: emptyList ? [] : [{ ...record, farmId: foreignFarm ? 2 : 1 }] }; success = !listFailure;
    }
    if (config.url === '/harvest-records/73') {
      assert.equal(config.headers.get('Authorization'), 'Bearer test-session');
      success = config.method === 'get' ? !detailFailure : !saveFailure;
      data = config.method === 'get' ? detail : { ...detail, ...JSON.parse(config.data), notes: 'Saved by server' };
    }
    if (config.url === '/harvest-records' && config.method === 'post') {
      success = !saveFailure;
      data = { ...record, ...JSON.parse(config.data), harvestRecordId: 74 };
    }
    return { config, status: 200, headers: {}, statusText: '', data: JSON.stringify({ success, message: success ? 'OK' : 'Server rejected request', data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text);
  const submit = async () => act(async () => document.querySelector('[role="dialog"] form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  const setSeason = async value => act(async () => {
    const input = document.querySelector('#harvest-season-id');
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  try {
    const { createRoot } = await import('react-dom/client');
    const { HarvestPage } = await server.ssrLoadModule('/src/features/operations/HarvestPage.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const { FarmWorkspaceProvider, useFarmWorkspace } = await server.ssrLoadModule('/src/features/farm-management/FarmWorkspace.tsx');
    function SwitchFarm() {
      const { selectFarm } = useFarmWorkspace();
      return createElement('button', { onClick: () => selectFarm(2) }, 'Switch farm');
    }
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    storage.saveAccessToken('test-session', { userId: 1, systemRole: 'USER' });
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(AuthProvider, null,
      createElement(FarmWorkspaceProvider, null, createElement(HarvestPage), createElement(SwitchFarm)))));
    assert.equal(calls.some(call => call.url.startsWith('/harvest-records')), false);
    assert.equal(button('Ghi nhận đợt thu hoạch').disabled, true);
    await setSeason('17');
    assert.equal(button('Xem thu hoạch').disabled, false);
    assert.equal(document.querySelector('#harvest-season-id').value, '17');
    await act(async () => document.querySelector('#harvest-season-id').form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(calls.filter(call => call.url.startsWith('/harvest-records?')).at(-1).url, '/harvest-records?cropSeasonId=17&size=50');
    assert.ok(document.querySelector('[data-harvest-id="73"]'));
    await act(async () => button('Chi tiết').click());
    assert.match(document.querySelector('[role="alert"]').textContent, /Server rejected/);
    assert.equal(document.querySelector('[role="dialog"]'), null);
    detailFailure = false;
    await act(async () => button('Chi tiết').click());
    assert.match(document.querySelector('[role="dialog"]').textContent, /Fresh server notes/);
    assert.match(document.querySelector('[role="dialog"]').textContent, /125,5 basket/);
    await act(async () => document.querySelector('.modal-close').click());
    await act(async () => button('Chỉnh sửa').click());
    assert.equal(document.querySelector('#harvest-lot-code').readOnly, true);
    assert.equal(document.querySelector('#harvest-trace-code').readOnly, true);
    assert.equal(document.querySelector('[aria-label="Sản lượng thu hoạch"]').value, '125.5');
    assert.equal(document.querySelector('[aria-label="Đơn vị"]').value, 'basket');
    assert.equal(document.querySelector('[aria-label="Phân loại phẩm chất"]').value, 'A');
    await submit();
    assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent, /Server rejected/);
    assert.match(document.querySelector('[data-harvest-id="73"]').textContent, /List notes/);
    saveFailure = false;
    await submit();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.querySelectorAll('[data-harvest-id="73"]').length, 1);
    assert.match(document.querySelector('[data-harvest-id="73"]').textContent, /Saved by server/);
    const payload = calls.filter(call => call.method === 'put').at(-1).data;
    assert.deepEqual(Object.keys(payload).sort(), ['harvestedAt', 'notes', 'qualityGrade', 'quantity', 'storageLocation', 'unit']);
    assert.equal(payload.harvestedAt, '2026-10-28T08:30:00');
    assert.equal(payload.quantity, 125.5);
    assert.equal(payload.storageLocation, '');
    // An unsubmitted ID must not change the season used by create/refresh.
    await setSeason('23');
    await act(async () => button('Ghi nhận đợt thu hoạch').click());
    assert.equal(document.querySelector('#harvest-lot-code').readOnly, false);
    saveFailure = true;
    await submit();
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.equal(document.querySelectorAll('[data-harvest-id]').length, 1);
    saveFailure = false;
    await submit();
    assert.ok(document.querySelector('[data-harvest-id="74"]'));
    assert.equal(calls.filter(call => call.method === 'post').at(-1).data.cropSeasonId, 17);
    listFailure = true;
    await act(async () => button('Làm mới').click());
    assert.equal(calls.filter(call => call.url.startsWith('/harvest-records?')).at(-1).url, '/harvest-records?cropSeasonId=17&size=50');
    assert.match(document.querySelector('[role="alert"]').textContent, /Server rejected/);
    assert.equal(document.querySelectorAll('[data-harvest-id]').length, 0);
    listFailure = false;
    emptyList = true;
    await setSeason('17');
    await act(async () => button('Thử lại').click());
    assert.equal(document.querySelector('[role="alert"]'), null);
    assert.match(document.body.textContent, /Chưa có đợt thu hoạch/);
    emptyList = false;
    foreignFarm = true;
    await act(async () => button('Làm mới').click());
    assert.match(document.querySelector('[role="alert"]').textContent, /không thuộc mùa vụ và trang trại/);
    assert.equal(button('Ghi nhận đợt thu hoạch').disabled, true);
    foreignFarm = false;
    await act(async () => button('Thử lại').click());
    assert.ok(document.querySelector('[data-harvest-id="73"]'));
    holdList = true;
    await act(async () => button('Làm mới').click());
    const callCount = calls.length;
    await act(async () => button('Switch farm').click());
    assert.equal(listSignal.aborted, true);
    await act(async () => releaseList());
    assert.equal(document.querySelector('#harvest-season-id').value, '');
    assert.equal(document.querySelectorAll('[data-harvest-id]').length, 0);
    assert.equal(button('Ghi nhận đợt thu hoạch').disabled, true);
    assert.equal(calls.length, callCount);
    const { MemoryRouter } = await import('react-router-dom');
    const { CropSeasonsPage } = await server.ssrLoadModule('/src/features/operations/CropSeasonsPage.tsx');
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(AuthProvider, null,
      createElement(FarmWorkspaceProvider, null, createElement(CropSeasonsPage))))));
    assert.match(document.body.textContent, /Danh sách mùa vụ chưa được kết nối/);
    assert.doesNotMatch(document.body.textContent, /Mùa vụ Đông Xuân|Mùa vụ Hè Thu|Lập mùa vụ mới/);
    assert.equal(document.querySelector('a').getAttribute('href'), '/harvests');
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
