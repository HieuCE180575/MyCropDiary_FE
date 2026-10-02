import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';

test('admin preview supports reviewing, editing, filtering, pagination and feedback without sending network writes', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost:5173' });
  const replacements = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLDialogElement: dom.window.HTMLDialogElement, Node: dom.window.Node, Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Preview must not make API calls.'); };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { MemoryRouter } = await import('react-router-dom');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
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
    assert.ok(document.body.textContent.includes('Dữ liệu minh họa'));
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
    await button('Từ chối');
    await submit();
    assert.ok(query('dialog [role="alert"]').textContent.includes('lý do từ chối'));
    await set('dialog textarea', 'Cần bổ sung mô tả khu sản xuất.');
    await submit();
    assert.equal(document.querySelector('dialog'), null);
    assert.ok(query('.admin-table tbody tr').textContent.includes('Đã từ chối'));

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
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    globalThis.fetch = oldFetch;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
