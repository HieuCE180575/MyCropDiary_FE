import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

test('rendered navigation and direct routes respect the personal User and Admin workspaces', async () => {
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  const oldWindow = globalThis.window;
  const oldStorage = globalThis.localStorage;
  globalThis.window = new EventTarget();
  globalThis.localStorage = { removeItem() {} };
  try {
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    const render = (path, systemRole) => {
      storage.saveAccessToken('test-session', { userId: 1, email: 'test@example.com', fullName: 'Test User', systemRole });
      return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, createElement(AuthProvider, null, createElement(App))));
    };
    const userDashboard = render('/dashboard', 'USER');
    for (const path of ['farm-registration', 'knowledge', 'ai', 'ai-history', 'ai-feedback', 'profile']) assert.ok(userDashboard.includes(`href="/${path}"`), path);
    assert.ok(!userDashboard.includes('href="/change-password"'));
    for (const path of ['production-areas', 'crop-seasons', 'activities', 'expenses', 'admin']) assert.ok(!userDashboard.includes(`href="/${path}"`), path);
    assert.ok(!userDashboard.includes('Tổng chi phí mùa vụ'));
    const denied = render('/admin', 'USER');
    assert.equal(denied, '', 'Admin route redirects before rendering protected content');
    assert.ok(!denied.includes('Xét duyệt đăng ký trang trại;'));
    const adminDashboard = render('/admin', 'ADMIN');
    assert.ok(adminDashboard.includes('href="/admin"'));
    assert.ok(!adminDashboard.includes('href="/farm-registration"'));
    assert.ok(!adminDashboard.includes('href="/expenses"'));
    assert.ok(adminDashboard.includes('Tổng quan quản trị'));
    assert.ok(!adminDashboard.includes('admin-preview-note'));
    for (const path of ['registrations', 'users', 'crops', 'rules', 'articles', 'feedback', 'statistics', 'audit']) {
      const adminPage = render(`/admin/${path}`, 'ADMIN');
      assert.ok(!adminPage.includes('Chức năng đang được phát triển'), path);
      assert.ok(!adminPage.includes('admin-preview-note'), path);
      const userPage = render(`/admin/${path}`, 'USER');
      assert.equal(userPage, '', path);
      assert.ok(!userPage.includes('minhan@example.com'), path);
    }
    const profile = render('/profile', 'USER');
    assert.ok(profile.includes('test@example.com'));
    assert.ok(profile.includes('Thông tin tài khoản'));
    assert.ok(profile.includes('Xin chào, Test User!'));
  } finally {
    await server.close();
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage;
  }
});
