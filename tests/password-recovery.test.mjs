import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import axios from 'axios';

test('password recovery handles strong password validation, show/hide password toggle, resend, expired OTP and redirects to /login on success', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const replacements = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldAdapter = axios.defaults.adapter;
  const calls = [];
  let expired = true;
  axios.defaults.adapter = async config => {
    calls.push({ url: config.url, data: JSON.parse(config.data) });
    const failed = config.url.endsWith('/reset-password') && expired;
    return { config, status: failed ? 400 : 200, headers: {}, statusText: '',
      data: JSON.stringify({ success: !failed, message: failed ? 'Mã OTP đã hết hạn.' : 'OK', data: null }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { ForgotPasswordPage } = await server.ssrLoadModule('/src/pages/ForgotPasswordPage.tsx');
    function LocationDisplay() {
      const loc = useLocation();
      const stateNotice = loc.state && typeof loc.state === 'object' ? loc.state.notice : '';
      return createElement('div', null,
        createElement('output', { id: 'test-path' }, loc.pathname),
        stateNotice ? createElement('p', { id: 'login-notice' }, stateNotice) : null
      );
    }
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(
      createElement(MemoryRouter, { initialEntries: ['/forgot-password'] },
        createElement(Routes, null,
          createElement(Route, { path: '/forgot-password', element: createElement(ForgotPasswordPage) }),
          createElement(Route, { path: '/login', element: createElement(LocationDisplay) })
        )
      )
    ));
    const set = async (id, value) => {
      const input = document.getElementById(id);
      await act(async () => {
        Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
    };
    const submit = async () => act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    const button = async text => act(async () => {
    const btn = [...document.querySelectorAll('button')].find(node =>
      node.textContent.trim() === text ||
      node.textContent.includes(text) ||
      (text === 'Gửi lại mã OTP' && (node.textContent.includes('Resend') || node.textContent.includes('OTP')))
    );
    if (btn) btn.click();
  });
    await set('recovery-email', 'invalid');
    await submit();
    assert.equal(calls.length, 0);
    await set('recovery-email', 'farmer@example.com');
    await submit();
    assert.ok(document.getElementById('recovery-otp'));
    assert.match(document.querySelector('[role="status"]').textContent, /Nếu email/);

    // Verify show/hide password toggle works
    const pwdInput = document.getElementById('recovery-password');
    assert.equal(pwdInput.getAttribute('type'), 'password');
    const toggleBtn = document.querySelector('button[aria-label="Hiện mật khẩu"]');
    assert.ok(toggleBtn);
    await act(async () => toggleBtn.click());
    assert.equal(pwdInput.getAttribute('type'), 'text');

    // Weak password rejected (missing uppercase and special character)
    await set('recovery-otp', '012345');
    await set('recovery-password', 'password123');
    await set('recovery-confirmation', 'password123');
    await submit();
    assert.match(document.querySelector('[role="alert"]').textContent, /in hoa/);
    assert.equal(calls.length, 1);

    // Strong password but mismatched confirmation
    await set('recovery-password', 'Password@123');
    await set('recovery-confirmation', 'Different@123');
    await submit();
    assert.match(document.querySelector('[role="alert"]').textContent, /không khớp/);
    assert.equal(calls.length, 1);

    // Matching strong password -> hits API -> expired OTP error
    await set('recovery-confirmation', 'Password@123');
    await submit();
    assert.match(document.querySelector('[role="alert"]').textContent, /hết hạn/);
    await button('Gửi lại mã OTP');
    assert.equal(calls.at(-1).url, '/auth/forgot-password');
    assert.equal(document.getElementById('recovery-otp').value, '');
    await set('recovery-otp', '012345');
    expired = false;
    await submit();
    assert.deepEqual(calls.at(-1).data, { email: 'farmer@example.com', otp: '012345', newPassword: 'Password@123' });
    assert.equal(document.getElementById('test-path').textContent, '/login');
    assert.match(document.getElementById('login-notice').textContent, /(Đặt lại mật khẩu thành công|Password reset successfully)/);
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
