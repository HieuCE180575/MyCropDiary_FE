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
  let activitiesFailure = true;
  let releaseDetail;
  let detailSignal;
  const original = { materialUsageId: 73, farmingActivityId: 18, activityName: 'Bón phân', cropSeasonId: 17, materialId: 5,
    materialName: 'Material A', materialType: 'organic', quantity: 10, unit: 'kg', usedAt: '2026-10-28T08:30:00',
    recorderFullName: 'Server recorder', dosage: null, method: null, safetyIntervalDays: null, notes: 'List notes' };
  let records = [original];
  axios.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, data: config.data && JSON.parse(config.data) });
    let data = {};
    let success = true;
    if (config.url.startsWith('/farms?')) data = { items: [7, 8].map(id => ({ id, farmName: `Farm ${id}`, currentUserRole: 'OWNER', status: 'active' })), last: true, totalPages: 1 };
    else if (config.url.startsWith('/farms/7/crop-seasons?')) {
      const page = new URL(config.url, 'http://localhost').searchParams.get('page');
      data = page === '0'
        ? { items: [{ cropSeasonId: 16, farmId: 7, seasonName: 'Closed season', seasonStatus: 'completed' }], last: false }
        : { items: [17, 19].map(cropSeasonId => ({ cropSeasonId, farmId: 7, seasonName: `Season ${cropSeasonId}`, seasonStatus: 'active' })), last: true };
    }
    else if (config.url.startsWith('/farming-activities?')) {
      const params = new URL(config.url, 'http://localhost').searchParams;
      if (params.get('cropSeasonId') === '19') {
        success = !activitiesFailure;
        data = { items: [], last: true };
      } else {
        data = params.get('page') === '0'
          ? { items: [{ farmingActivityId: 20, cropSeasonId: 17, activityName: 'Tưới nước' }], last: false }
          : { items: [{ farmingActivityId: 18, cropSeasonId: 17, activityName: 'Bón phân' }], last: true };
      }
    }
    else if (config.url.startsWith('/material-usages/materials?')) data = [{ id: 5, farmId: 7, materialName: 'Material A', unit: 'kg' }, { id: 6, farmId: 7, materialName: 'Material B', unit: 'lít' }];
    else if (config.url.startsWith('/material-usages?')) {
      const params = new URL(config.url, 'http://localhost').searchParams;
      assert.equal(params.get('farmId'), '7');
      success = !listFailure;
      const page = Number(params.get('page'));
      const size = Number(params.get('size'));
      const filtered = records.filter(record => !params.get('keyword') || record.materialName.includes(params.get('keyword')));
      data = { items: filtered.slice(page * size, (page + 1) * size), page, size, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size) };
    } else if (config.url === '/material-usages/73' && config.method === 'get') {
      detailSignal = config.signal;
      if (holdDetail) await new Promise(resolve => { releaseDetail = resolve; });
      success = !detailFailure;
      data = { ...original, quantity: 20, notes: 'Fresh detail', dosage: '20ml / bình', method: 'Phun lá', safetyIntervalDays: 7 };
    } else if (config.method === 'put' || config.method === 'post' || config.method === 'delete') {
      success = !writeFailure;
      if (success) {
        if (config.method === 'delete') records = records.filter(record => record.materialUsageId !== Number(config.url.split('/').at(-1)));
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
    records = [original, ...Array.from({ length: 50 }, (_, index) => ({ ...original, materialUsageId: 100 + index, materialName: `Material ${index}` }))];
    await act(async () => button('Tải lại').click());
    assert.equal(document.querySelector('tbody').children.length, 50);
    assert.match(document.querySelector('.mu-pagination').textContent, /1–50 trên 51 bản ghi/);
    const totalCard = [...document.querySelectorAll('.panel')].find(node => node.textContent.includes('TỔNG LẦN SỬ DỤNG'));
    assert.match(totalCard.textContent, /51/);
    const keyword = document.querySelector('input[placeholder="Tên vật tư, ghi chú..."]');
    await setValue(keyword, 'unapplied');
    await act(async () => document.querySelector('[aria-label="Trang sau"]').click());
    assert.equal(document.querySelector('tbody').children.length, 1);
    assert.match(document.querySelector('.mu-pagination').textContent, /51–51 trên 51 bản ghi/);
    assert.equal(document.querySelector('[aria-label="Trang sau"]').disabled, true);
    const lastList = () => new URL(calls.filter(call => call.url.startsWith('/material-usages?')).at(-1).url, 'http://localhost').searchParams;
    assert.equal(lastList().get('page'), '1');
    assert.equal(lastList().has('keyword'), false);
    writeFailure = false;
    await act(async () => button('Xóa').click());
    assert.equal(lastList().get('page'), '0');
    assert.match(document.querySelector('.mu-pagination').textContent, /1–50 trên 50 bản ghi/);
    await setValue(keyword, 'Material A');
    await act(async () => button('Lọc').click());
    assert.equal(lastList().get('page'), '0');
    assert.equal(lastList().get('keyword'), 'Material A');
    assert.match(document.querySelector('.mu-pagination').textContent, /1–1 trên 1 bản ghi/);
    await setValue(keyword, 'no match');
    await act(async () => button('Lọc').click());
    assert.equal(document.querySelector('tbody'), null);
    assert.match(document.querySelector('.mu-pagination').textContent, /0 bản ghi/);
    assert.equal(document.querySelector('[aria-label="Trang sau"]').disabled, true);
    records = [original];
    await act(async () => button('Đặt lại').click());
    assert.equal(lastList().has('keyword'), false);
    await setValue(document.querySelector('#mu-from'), '2026-10-29');
    await setValue(document.querySelector('#mu-to'), '2026-10-01');
    const beforeInvalidDates = calls.length;
    await act(async () => button('Lọc').click());
    assert.equal(calls.length, beforeInvalidDates);
    assert.match(document.querySelector('#mu-date-error').textContent, /Ngày bắt đầu phải trước/);
    await setValue(document.querySelector('#mu-to'), '2026-10-30');
    await act(async () => button('Lọc').click());
    assert.match(document.querySelector('.mu-applied-filters').textContent, /29\/10\/2026/);
    await act(async () => button('Tải lại').click());
    assert.equal(lastList().get('fromDate'), '2026-10-29T00:00:00');
    assert.equal(lastList().get('toDate'), '2026-10-30T23:59:59');
    await act(async () => button('Đặt lại').click());
    writeFailure = true;
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
    assert.equal(document.querySelector('#usage-activity').value, 'Bón phân');
    assert.equal(document.querySelector('[aria-label="Số lượng"]').value, '20');
    for (const [label, value] of [['Liều lượng', '20'], ['Phương pháp sử dụng', 'Phun lá'], ['Số ngày cách ly', '7']]) {
      const input = document.querySelector(`[aria-label="${label}"]`);
      assert.equal(input.disabled, false);
      assert.equal(input.value, value);
    }
    assert.equal(document.querySelector('[aria-label="Đơn vị liều lượng"]').value, 'ml/bình');
    await setValue(document.querySelector('[aria-label="Đơn vị liều lượng"]'), 'custom');
    await setValue(document.querySelector('[aria-label="Liều lượng"]'), 'Theo hướng dẫn trên nhãn');
    assert.equal(document.querySelector('[aria-label="Liều lượng"]').value, 'Theo hướng dẫn trên nhãn');
    await setValue(document.querySelector('[aria-label="Liều lượng"]'), '50');
    await setValue(document.querySelector('[aria-label="Đơn vị liều lượng"]'), 'g/gốc');
    await setValue(document.querySelector('[aria-label="Phương pháp sử dụng"]'), 'custom');
    await setValue(document.querySelector('[aria-label="Phương thức"]'), 'Phương pháp khác đã lưu');
    assert.equal(document.querySelector('[aria-label="Phương thức"]').value, 'Phương pháp khác đã lưu');
    await setValue(document.querySelector('[aria-label="Phương pháp sử dụng"]'), 'Bón gốc');
    const safetyInput = document.querySelector('[aria-label="Số ngày cách ly"]');
    for (const invalid of ['-1', '1.5', '2147483648']) {
      await setValue(safetyInput, invalid);
      const before = calls.length;
      await submit();
      assert.equal(calls.length, before);
      assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent, /số nguyên không âm/);
    }
    await setValue(safetyInput, '0');
    await setValue(document.querySelector('[aria-label="Số lượng"]'), '35');
    await setValue(document.querySelector('[aria-label="Vật tư"]'), '6');
    assert.equal(document.querySelector('[aria-label="Đơn vị"]').value, 'lít');
    await submit();
    assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent, /Server rejected/);
    assert.equal(document.querySelector('[aria-label="Liều lượng"]').value, '50');
    assert.equal(safetyInput.value, '0');
    assert.equal(records[0].quantity, 10);
    writeFailure = false;
    await submit();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(records[0].quantity, 35);
    const update = calls.filter(call => call.method === 'put').at(-1);
    assert.equal(update.url, '/material-usages/73');
    assert.deepEqual(update.data, { materialId: 6, usedAt: '2026-10-28T08:30:00', quantity: 35, unit: 'lít', notes: 'Fresh detail', dosage: '50 g/gốc', method: 'Bón gốc', safetyIntervalDays: 0 });
    assert.match(document.querySelector('tbody').textContent, /An toàn \(0 ngày\)/);
    writeFailure = true;
    await act(async () => button('Xóa').click());
    assert.ok(document.querySelector('tbody tr'));
    writeFailure = false;
    await act(async () => button('Xóa').click());
    assert.equal(document.querySelector('tbody'), null);
    await act(async () => button('Ghi nhận sử dụng vật tư').click());
    assert.equal(document.querySelector('#usage-activity').value, '');
    for (const label of ['Liều lượng', 'Phương pháp sử dụng', 'Số ngày cách ly']) assert.equal(document.querySelector(`[aria-label="${label}"]`).value, '');
    for (const id of ['usage-material-form', 'usage-applied-area', 'usage-plant-count']) assert.equal(document.getElementById(id).disabled, true);
    await submit();
    assert.equal(calls.some(call => call.method === 'post'), false);
    assert.equal(document.querySelector('#usage-activity').disabled, true);
    assert.equal(document.querySelector('#usage-season option[value="16"]'), null);
    await setValue(document.querySelector('#usage-season'), '17');
    assert.ok(document.querySelector('#usage-activity option[value="18"]'));
    await setValue(document.querySelector('#usage-activity'), '18');
    await setValue(document.querySelector('#usage-season'), '19');
    assert.equal(document.querySelector('#usage-activity').value, '');
    assert.equal(document.querySelector('#usage-activity option[value="18"]'), null);
    const beforeInvalid = calls.filter(call => call.method === 'post').length;
    await submit();
    assert.equal(calls.filter(call => call.method === 'post').length, beforeInvalid);
    activitiesFailure = false;
    await act(async () => button('Tải lại hoạt động').click());
    assert.match(document.querySelector('[role="dialog"]').textContent, /chưa có hoạt động/);
    await setValue(document.querySelector('#usage-season'), '17');
    await setValue(document.querySelector('#usage-activity'), '18');
    await setValue(document.querySelector('[aria-label="Vật tư"]'), '5');
    await setValue(document.querySelector('#usage-material-search'), 'Material A');
    assert.equal(document.querySelector('#usage-material option[value="6"]'), null);
    assert.equal(document.querySelector('[aria-label="Vật tư"]').value, '5');
    await setValue(document.querySelector('#usage-material-search'), 'no matching material');
    assert.equal(document.querySelector('[aria-label="Vật tư"]').value, '5');
    assert.match(document.querySelector('[role="dialog"]').textContent, /Không tìm thấy vật tư phù hợp/);
    await setValue(document.querySelector('#usage-material-search'), '');
    assert.ok(document.querySelector('#usage-material option[value="6"]'));
    writeFailure = true;
    await submit();
    const blankCreate = calls.filter(call => call.method === 'post').at(-1).data;
    assert.equal(blankCreate.dosage, '');
    assert.equal(blankCreate.method, '');
    assert.equal(blankCreate.safetyIntervalDays, null);
    await setValue(document.querySelector('[aria-label="Liều lượng"]'), '20');
    await setValue(document.querySelector('[aria-label="Đơn vị liều lượng"]'), 'ml/bình');
    await setValue(document.querySelector('[aria-label="Phương pháp sử dụng"]'), 'Phun lá');
    await setValue(document.querySelector('[aria-label="Số ngày cách ly"]'), '7');
    writeFailure = true;
    await submit();
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.equal(records.length, 0);
    writeFailure = false;
    await submit();
    assert.equal(records[0].materialUsageId, 74);
    assert.equal(calls.filter(call => call.method === 'post').at(-1).data.farmingActivityId, 18);
    assert.equal(records[0].dosage, '20 ml/bình');
    assert.equal(records[0].method, 'Phun lá');
    assert.equal(records[0].safetyIntervalDays, 7);
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
