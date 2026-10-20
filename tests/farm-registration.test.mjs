import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import axios from 'axios';

test('user registration handles load errors, persists through remount and cancels through the API', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const replacements = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLDialogElement: dom.window.HTMLDialogElement, Node: dom.window.Node,
    Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const oldAdapter = axios.defaults.adapter;
  const calls = [];
  let unavailable = true;
  let saved = null;
  axios.defaults.adapter = async config => {
    calls.push(config);
    assert.equal(config.headers.get('Authorization'), 'Bearer user-session');
    let data;
    if (config.url.startsWith('/farms?')) data = { items: [], last: true, totalPages: 0 };
    else if (unavailable) return { config, status: 503, headers: {}, data: JSON.stringify({ success: false, message: 'Chưa tải được hồ sơ.' }) };
    else if (config.method === 'post') {
      const body = JSON.parse(config.data);
      saved = { ...body, registrationId: 23, status: 'PENDING', submittedAt: '2026-10-20T10:00:00' };
      data = saved;
    } else if (config.method === 'patch') { saved = { ...saved, status: 'CANCELLED' }; data = saved; }
    else data = config.url.includes('?') ? { items: saved ? [saved] : [], last: true, totalPages: saved ? 1 : 0 } : saved;
    return { config, status: 200, headers: {}, data: JSON.stringify({ success: true, data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { MemoryRouter } = await import('react-router-dom');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    storage.saveAccessToken('user-session', { userId: 12, email: 'farmer@example.com', fullName: 'Người dùng', systemRole: 'USER' });
    const mount = async () => {
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/farm-registration'] }, createElement(AuthProvider, null, createElement(App)))));
    };
    const button = async text => {
      const node = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text);
      assert.ok(node, `Missing button ${text}`);
      await act(async () => node.click());
    };
    await mount();
    assert.ok(document.querySelector('[role="alert"]').textContent.includes('Chưa tải được hồ sơ'));
    assert.equal(document.querySelector('form'), null);
    unavailable = false;
    await button('Thử lại');
    const values = ['Vườn Xanh', 'Địa chỉ Cần Thơ', 'Cần Thơ', 'Ninh Kiều', 'An Bình', 'Rau sạch', 'https://example.com/giay-chung-nhan.pdf'];
    for (const [index, input] of [...document.querySelectorAll('form input, form textarea')].entries()) {
      const prototype = input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      await act(async () => {
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, values[index]);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
    }
    const documentInput = document.querySelector('input[type="url"]');
    const setDocument = async value => act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(documentInput, value);
      documentInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    await setDocument('javascript:alert(1)');
    await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(calls.some(call => call.method === 'post'), false);
    assert.ok(document.querySelector('.field-error').textContent.includes('http://'));
    await setDocument(values[6]);
    await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('form'), null);
    assert.ok(document.querySelector('.farm-registration-status').textContent.includes('Vườn Xanh'));
    assert.deepEqual(JSON.parse(calls.find(call => call.method === 'post').data), { farmName: 'Vườn Xanh', addressLine: 'Địa chỉ Cần Thơ', province: 'Cần Thơ', district: 'Ninh Kiều', ward: 'An Bình', description: 'Rau sạch', documentUrl: 'https://example.com/giay-chung-nhan.pdf' });
    await act(async () => root.unmount());
    await mount();
    assert.ok(document.querySelector('.farm-registration-status').textContent.includes('Vườn Xanh'));
    assert.ok(document.querySelector('.farm-registration-status').textContent.includes('Ninh Kiều'));
    assert.ok(document.querySelector('.farm-registration-status').textContent.includes('An Bình'));
    assert.equal(document.querySelector('.farm-registration-status a').href, 'https://example.com/giay-chung-nhan.pdf');
    await button('Hủy đăng ký');
    const confirm = [...document.querySelectorAll('.confirm-dialog-actions button')].find(node => node.textContent.trim() === 'Hủy đăng ký');
    await act(async () => confirm.click());
    assert.ok(calls.some(call => call.method === 'patch' && call.url === '/farm-registrations/23/cancel'));
    assert.ok(document.querySelector('.farm-registration-status').textContent.includes('Đã hủy'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    axios.defaults.adapter = oldAdapter;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
