import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

test('admin login opens overview even when a previous profile route was saved', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { LoginPage } = await server.ssrLoadModule('/src/pages/LoginPage.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const { ProtectedRoute } = await server.ssrLoadModule('/src/features/auth/ProtectedRoute.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    for (const [role, from, expected] of [['ADMIN', '/profile', 'overview'], ['ADMIN', '/admin/users', 'overview'], ['ADMIN', undefined, 'overview'], ['USER', '/profile', 'profile'], ['USER', undefined, 'dashboard'], ['USER', '/admin', 'dashboard'], ['USER', '/admin/registrations', 'dashboard']]) {
      storage.saveAccessToken('test-session', { userId: 1, email: 'test@example.com', fullName: 'Test', systemRole: role });
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [{ pathname: '/login', state: from ? { from: { pathname: from } } : null }] },
        createElement(AuthProvider, null, createElement(Routes, null,
          createElement(Route, { path: '/login', element: createElement(LoginPage) }),
          createElement(Route, { path: '/admin', element: createElement('p', null, 'overview') }),
          createElement(Route, { path: '/profile', element: createElement('p', null, 'profile') }),
          createElement(Route, { path: '/dashboard', element: createElement('p', null, 'dashboard') })
        )))));
      assert.equal(document.getElementById('root').textContent, expected);
      await act(async () => root.unmount());
      root = undefined;
    }
    for (const [role, expected] of [['USER', 'dashboard'], ['ADMIN', 'admin-content']]) {
      storage.saveAccessToken('test-session', { userId: 1, email: 'test@example.com', fullName: 'Test', systemRole: role });
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/admin/registrations'] },
        createElement(AuthProvider, null, createElement(Routes, null,
          createElement(Route, { element: createElement(ProtectedRoute) },
            createElement(Route, { path: '/admin/registrations', element: createElement('p', null, 'admin-content') }),
            createElement(Route, { path: '/dashboard', element: createElement('p', null, 'dashboard') })
          )
        )))));
      assert.equal(document.getElementById('root').textContent, expected);
      await act(async () => root.unmount());
      root = undefined;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
