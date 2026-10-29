import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import axios from 'axios';

test('material usage loads real detail, reuses PUT form, preserves errors and uses real activity IDs', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  dom.window.confirm = () => true;
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldAdapter = axios.defaults.adapter;
  const calls = [];
  let detailFailure = true;
  let writeFailure = true;
  let listFailure = false;
  let holdDetail = false;
  let releaseDetail;
  let detailSignal;
  const original = { materialUsageId: 73, farmingActivityId: 18, cropSeasonId: 17, materialId: 5,
    materialName: 'Material A', materialType: 'organic', quantity: 10, unit: 'kg', usedAt: '2026-10-28T08:30:00',
    recorderFullName: 'Server recorder', dosage: null, method: null, safetyIntervalDays: null, notes: 'List notes' };
  let records = [original];
  axios.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, data: config.data && JSON.parse(config.data) });
    let data = {};
    let success = true;
    if (config.url.startsWith('/farms?')) data = { items: [7, 8].map(id => ({ id, farmName: `Farm ${id}`, currentUserRole: 'OWNER', status: 'active' })), last: true, totalPages: 1 };
    else if (config.url.startsWith('/material-usages/materials?')) data = [{ id: 5, farmId: 7, materialName: 'Material A', unit: 'kg' }, { id: 6, farmId: 7, materialName: 'Material B', unit: 'lít' }];
    else if (config.url.startsWith('/material-usages?')) {
      assert.equal(new URL(config.url, 'http://localhost').searchParams.get('farmId'), '7');
      success = !listFailure;
      data = { items: records };
    } else if (config.url === '/material-usages/73' && config.method === 'get') {
      detailSignal = config.signal;
      if (holdDetail) await new Promise(resolve => { releaseDetail = resolve; });
      success = !detailFailure;
      data = { ...original, quantity: 20, notes: 'Fresh detail' };
    } else if (config.method === 'put' || config.method === 'post' || config.method === 'delete') {
      success = !writeFailure;
      if (success) {
        if (config.method === 'delete') records = [];
        else {
          data = { ...original, ...JSON.parse(config.data), materialUsageId: config.method === 'post' ? 74 : 73 };
          records = [data];
        }
      }
    } else throw new Error('Unexpected request: ' + config.url);
    return { config, status: 200, headers: {}, statusText: '', data: JSON.stringify({ success, message: success ? 'OK' : 'Server rejected request', data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text);
  const setValue = async (node, value) => act(async () => {
    const prototype = node.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new dom.window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
  const submit = async () => act(async () => document.querySelector('[role="dialog"] form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  try {
    const { createRoot } = await import('react-dom/client');
    const { MaterialUsagePage } = await server.ssrLoadModule('/src/features/operations/MaterialUsagePage.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const { FarmWorkspaceProvider, useFarmWorkspace } = await server.ssrLoadModule('/src/features/farm-management/FarmWorkspace.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    storage.saveAccessToken('test-session', { userId: 1, systemRole: 'USER' });
    function SwitchFarm() {
      const { selectFarm } = useFarmWorkspace();
      return createElement('button', { onClick: () => selectFarm(8) }, 'Switch farm');
    }
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(AuthProvider, null,
      createElement(FarmWorkspaceProvider, null, createElement(MaterialUsagePage), createElement(SwitchFarm)))));
    assert.match(document.querySelector('tbody').textContent, /Server recorder/);
    assert.doesNotMatch(document.querySelector('tbody').textContent, /An toàn \(0 ngày\)/);
    await act(async () => button('Chi tiết').click());
    assert.match(document.querySelector('[role="alert"]').textContent, /Server rejected/);
    assert.equal(document.querySelector('[role="dialog"]'), null);
    detailFailure = false;
    await act(async () => button('Chi tiết').click());
    assert.match(document.querySelector('[role="dialog"]').textContent, /Fresh detail/);
    assert.match(document.querySelector('[role="dialog"]').textContent, /20 kg/);
    await act(async () => document.querySelector('.modal-close').click());
    await act(async () => button('Chỉnh sửa').click());
    assert.equal(document.querySelector('#usage-activity').readOnly, true);
    assert.equal(document.querySelector('#usage-activity').value, '18');
    assert.equal(document.querySelector('[aria-label="Số lượng"]').value, '20');
    for (const label of ['Liều lượng', 'Phương thức', 'Số ngày cách ly']) assert.equal(document.querySelector(`[aria-label="${label}"]`).disabled, true);
    await setValue(document.querySelector('[aria-label="Số lượng"]'), '35');
    await setValue(document.querySelector('[aria-label="Vật tư"]'), '6');
    assert.equal(document.querySelector('[aria-label="Đơn vị"]').value, 'lít');
    await submit();
    assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent, /Server rejected/);
    assert.equal(records[0].quantity, 10);
    writeFailure = false;
    await submit();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(records[0].quantity, 35);
    const update = calls.filter(call => call.method === 'put').at(-1);
    assert.equal(update.url, '/material-usages/73');
    assert.deepEqual(update.data, { materialId: 6, usedAt: '2026-10-28T08:30:00', quantity: 35, unit: 'lít', notes: 'Fresh detail' });
    writeFailure = true;
    await act(async () => button('Xóa').click());
    assert.ok(document.querySelector('tbody tr'));
    writeFailure = false;
    await act(async () => button('Xóa').click());
    assert.equal(document.querySelector('tbody'), null);
    await act(async () => button('Ghi nhận sử dụng vật tư').click());
    assert.equal(document.querySelector('#usage-activity').value, '');
    await submit();
    assert.equal(calls.some(call => call.method === 'post'), false);
    await setValue(document.querySelector('#usage-activity'), '18');
    await setValue(document.querySelector('[aria-label="Vật tư"]'), '5');
    writeFailure = true;
    await submit();
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.equal(records.length, 0);
    writeFailure = false;
    await submit();
    assert.equal(records[0].materialUsageId, 74);
    assert.equal(calls.filter(call => call.method === 'post').at(-1).data.farmingActivityId, 18);
    listFailure = true;
    await act(async () => button('Tải lại').click());
    assert.match(document.body.textContent, /Server rejected/);
    assert.equal(document.querySelector('tbody'), null);
    listFailure = false;
    records = [original];
    await act(async () => button('Thử lại').click());
    holdDetail = true;
    await act(async () => button('Chi tiết').click());
    await act(async () => button('Switch farm').click());
    assert.equal(detailSignal.aborted, true);
    await act(async () => releaseDetail());
    assert.equal(document.querySelector('[role="dialog"]'), null);
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
