import { registrationFixtures } from './fixtures/admin-registrations.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import axios from 'axios';

test('admin uses registration APIs while other modules keep their existing behavior', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost:5173' });
  const replacements = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLDialogElement: dom.window.HTMLDialogElement, Node: dom.window.Node, Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const oldAdapter = axios.defaults.adapter;
  let requestCount = 0;
  let fixtures = [];
  let rejectWrite = true;
  let failRead = false;
  const writes = [];
  let userFixtures = [
    { userId: 1, fullName: 'Nguyễn Minh An', email: 'minhan@example.com', phone: '0912345678', systemRole: 'USER', accountStatus: 'ACTIVE', emailVerifiedAt: '2026-09-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' }
  ];
  axios.defaults.adapter = async config => {
    requestCount += 1;
    assert.equal(config.headers.get('Authorization'), 'Bearer preview-test-session');
    if (config.url.startsWith('/admin/users')) {
      if (config.method === 'get') {
        return { status: 200, data: JSON.stringify({ success: true, data: { items: userFixtures, last: true, totalPages: 1 } }), config, headers: {} };
      }
      const statusReq = JSON.parse(config.data);
      userFixtures = userFixtures.map(u => ({ ...u, accountStatus: statusReq.status }));
      return { status: 200, data: JSON.stringify({ success: true, data: userFixtures[0] }), config, headers: {} };
    }
    assert.ok(config.url.startsWith('/admin/farm-registrations'));
    if (failRead) return { config, status: 503, headers: {}, data: JSON.stringify({ success: false, message: 'Không tải được hồ sơ từ backend.' }) };
    let data;
    if (config.method === 'get') data = { items: fixtures, last: true, totalPages: 1 };
    else {
      writes.push(JSON.parse(config.data));
      if (rejectWrite) { rejectWrite = false; return { status: 409, data: JSON.stringify({ success: false, message: 'Hồ sơ đã thay đổi, vui lòng thử lại.' }), config, headers: {} }; }
      const id = config.url.split('/').at(-2);
      const command = JSON.parse(config.data);
      data = { ...fixtures.find(item => String(item.registrationId) === id), status: command.action, rejectionReason: command.rejectionReason };
      fixtures = fixtures.map(item => String(item.registrationId) === id ? data : item);
    }
    return { status: 200, data: JSON.stringify({ success: true, data }), config, headers: {} };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { MemoryRouter } = await import('react-router-dom');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    fixtures = registrationFixtures.map((item, index) => ({ registrationId: index + 1, farmName: item.name, status: item.status, submittedAt: item.createdAt, applicantFullName: item.applicant, applicantEmail: item.email, addressLine: item.address, province: item.province, district: 'Quận kiểm thử', ward: 'Phường kiểm thử', documentUrl: 'https://example.com/ho-so.pdf', description: item.description, rejectionReason: item.reason }));
    storage.saveAccessToken('preview-test-session', { userId: 900, email: 'tester@example.com', fullName: 'Quản trị kiểm thử', systemRole: 'ADMIN' });
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/admin/registrations'] }, createElement(AuthProvider, null, createElement(App)))));
    const query = selector => { const node = document.querySelector(selector); assert.ok(node, `Missing ${selector}`); return node; };
    const click = async selector => { await act(async () => query(selector).click()); };
    const button = async (text, scope = 'dialog') => {
      const node = [...query(scope).querySelectorAll('button')].find(item => item.textContent.trim() === text);
      assert.ok(node, `Missing button ${text}`);
      await act(async () => node.click());
    };
    const set = async (selector, value) => {
      const node = query(selector);
      const prototype = node.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
      await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new dom.window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
    };
    const submit = async () => { await act(async () => query('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))); };
    const navigate = async path => click(`.sidebar a[href="${path}"]`);
    assert.ok(document.body.textContent.includes('Tải lại'));
    assert.ok(!document.querySelector('.admin-list-heading').textContent.includes('Dữ liệu minh họa'));
    assert.equal(query('[aria-label="Trang 1"]').getAttribute('aria-current'), 'page');
    await click('[aria-label="Trang 2"]');
    assert.equal(query('[aria-label="Trang 2"]').getAttribute('aria-current'), 'page');
    assert.equal(document.querySelectorAll('.admin-table tbody tr').length, 1);
    await click('[aria-label="Trang 1"]');
    assert.equal(document.querySelectorAll('.admin-table tbody tr').length, 5);
    await click('[aria-label="Trang sau"]');
    assert.equal(document.querySelectorAll('.admin-table tbody tr').length, 1);
    await set('.admin-search input', 'binh minh');
    assert.equal(document.querySelectorAll('.admin-table tbody tr').length, 1);
    assert.ok(query('.admin-table').textContent.includes('Trang trại Bình Minh'));
    await button('Xóa bộ lọc', '.admin-filters');
    await click('[aria-label="Xem chi tiết Vườn rau An Nhiên"]');
    assert.ok(query('dialog').textContent.includes('Quận kiểm thử'));
    assert.ok(query('dialog').textContent.includes('Phường kiểm thử'));
    assert.equal(query('dialog a').href, 'https://example.com/ho-so.pdf');
    await button('Từ chối');
    await submit();
    assert.ok(query('dialog [role="alert"]').textContent.includes('lý do từ chối'));
    await set('dialog textarea', 'Cần bổ sung mô tả khu sản xuất.');
    await submit();
    assert.ok(query('dialog [role="alert"]').textContent.includes('Hồ sơ đã thay đổi'));
    assert.ok(query('.admin-table tbody tr').textContent.includes('Chờ duyệt'));
    await submit();
    assert.equal(document.querySelector('dialog'), null);
    assert.ok(query('.admin-table tbody tr').textContent.includes('Đã từ chối'));
    assert.ok(query('.admin-toast').textContent.includes('Đã từ chối hồ sơ.'));
    const checkRegistrationDetails = async () => {
      await click('[aria-label="Xem chi tiết Vườn rau An Nhiên"]');
      const detail = label => [...document.querySelectorAll('dialog .admin-details > div')]
        .find(node => node.querySelector('dt')?.textContent === label)?.querySelector('dd')?.textContent;
      assert.equal(detail('Mô tả trang trại'), registrationFixtures[0].description, 'Original description must remain after rejection');
      assert.equal(detail('Lý do từ chối'), 'Cần bổ sung mô tả khu sản xuất.', 'Rejection reason must use its own response field');
      await button('Đóng');
    };
    await checkRegistrationDetails();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5100)); });
    assert.equal(document.querySelector('.admin-toast'), null, 'Notification dismisses after five seconds');

    await navigate('/admin/articles');
    for (const button of document.querySelectorAll('.admin-row-actions .detail-button, .admin-row-actions .edit-button')) {
      assert.equal(button.textContent.trim(), '', 'Row action must show only its icon');
      assert.ok(button.querySelector('svg'));
      assert.ok(button.getAttribute('aria-label'));
    }
    await click('[aria-label="Xem chi tiết Ghi nhận vật tư sử dụng trong mùa vụ"]');
    await button('Duyệt và công bố');
    await submit();
    assert.ok(query('dialog [role="alert"]').textContent.includes('nguồn tham khảo'));
    await click('dialog [aria-label="Đóng cửa sổ"]');
    await click('[aria-label="Sửa Ghi nhận vật tư sử dụng trong mùa vụ"]');
    await set('dialog .admin-field:nth-child(3) input', 'Nguồn tài liệu kiểm thử');
    await submit();
    await click('[aria-label="Xem chi tiết Ghi nhận vật tư sử dụng trong mùa vụ"]');
    await button('Duyệt và công bố');
    await submit();
    const articleRow = [...document.querySelectorAll('tbody tr')].find(row => row.textContent.includes('Ghi nhận vật tư'));
    assert.ok(articleRow.textContent.includes('Đã duyệt'));

    await navigate('/admin/users');
    await click('[aria-label="Xem chi tiết Nguyễn Minh An"]');
    await button('Khóa tài khoản');
    await submit();
    assert.ok(query('tbody tr').textContent.includes('Đã khóa'));

    await navigate('/admin/crops');
    await button('Thêm danh mục', '.admin-page-heading');
    await set('dialog .admin-field:nth-child(1) input', 'RAU_DEN');
    await set('dialog .admin-field:nth-child(2) input', 'Rau dền');
    await set('dialog select', 'LEAFY');
    await submit();
    assert.ok(query('tbody tr').textContent.includes('Rau dền'));

    await navigate('/admin/feedback');
    await click('[aria-label="Xem chi tiết Câu trả lời thiếu nguồn tham khảo"]');
    await set('dialog select', 'RESOLVED');
    await submit();
    assert.ok(query('dialog [role="alert"]').textContent.includes('nội dung trả lời'));
    await set('dialog textarea', 'Đã ghi nhận góp ý và kiểm tra nguồn.');
    await submit();
    assert.ok(query('tbody tr').textContent.includes('Đã giải quyết'));

    await navigate('/admin/audit');
    assert.ok(query('.admin-table').textContent.includes('Quản trị kiểm thử'));
    assert.ok(query('.admin-table').textContent.includes('Xử lý phản hồi AI'));
    await navigate('/admin/statistics');
    await button('Chi phí', '.admin-stat-tabs');
    assert.ok(document.body.textContent.includes('Tổng chi phí'));
    await set('.admin-stat-filters label:first-of-type input', '2027-01');
    assert.ok(document.body.textContent.includes('Tháng bắt đầu không được sau tháng kết thúc'));
    await set('.admin-stat-filters label:last-of-type input', '2027-02');
    assert.ok(document.body.textContent.includes('Chưa có số liệu trong khoảng thời gian này'));
    assert.equal(requestCount, 5, 'Only registration and user requests should reach the backend.');
    await navigate('/admin/registrations');
    await button('Tải lại', '.admin-list-heading');
    await checkRegistrationDetails();
    fixtures = [];
    await button('Tải lại', '.admin-list-heading');
    assert.equal(document.querySelectorAll('.admin-table tbody tr').length, 0);
    assert.ok(document.body.textContent.includes('Không tìm thấy kết quả'));
    failRead = true;
    await button('Tải lại', '.admin-list-heading');
    assert.ok(query('[role="alert"]').textContent.includes('Không tải được hồ sơ từ backend'));
    assert.equal(document.querySelector('.admin-table'), null);
    assert.ok(!document.body.textContent.includes('Vườn rau An Nhiên'));
    assert.deepEqual(writes, [{ action: 'REJECTED', rejectionReason: 'Cần bổ sung mô tả khu sản xuất.' }, { action: 'REJECTED', rejectionReason: 'Cần bổ sung mô tả khu sản xuất.' }]);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    axios.defaults.adapter = oldAdapter;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
