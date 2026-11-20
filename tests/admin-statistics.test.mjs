import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement as h, act } from 'react';

test('statistics hide stale totals during loading and failure, retry successfully, and abort on unmount', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173/admin/statistics' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  let mode = 'pending';
  let release;
  let signal;
  globalThis.__adminStatsTest = {
    state: { users: [], registrations: [], farms: [], zones: [], blocks: [], compliance: [], feedback: [], seasons: [] },
    request: async (path, options) => {
      assert.equal(path, '/admin/statistics/overview');
      signal = options.signal;
      if (mode === 'pending') await new Promise(resolve => { release = resolve; });
      if (mode === 'error') throw new Error('Statistics API unavailable');
      return { success: true, data: {
        accounts: { totalUsers: 0, activeUsers: 0, lockedUsers: 0, ownerCount: 0, staffCount: 0 },
        registrations: { totalRegistrations: 0, pendingRegistrations: 0, approvedRegistrations: 0, rejectedRegistrations: 0 },
        farms: { totalFarms: 0, activeFarms: 0 },
        seasons: { totalSeasons: 0, activeSeasons: 0, completedSeasons: 0 },
        aiFeedback: { totalFeedbacks: 0, openFeedbacks: 0, resolvedFeedbacks: 0, averageRating: 0 },
      } };
    },
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', plugins: [{
    name: 'admin-statistics-test', enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('/AdminProvider')) return '\0stats-provider';
      if (source === '../auth') return '\0stats-auth';
      if (source.endsWith('/httpClient')) return '\0stats-http';
    },
    load(id) {
      if (id === '\0stats-provider') return 'export const useAdmin = () => ({state:globalThis.__adminStatsTest.state});';
      if (id === '\0stats-auth') return 'export const useAuth = () => ({user:{userId:1}});';
      if (id === '\0stats-http') return 'export const apiRequest = (...args) => globalThis.__adminStatsTest.request(...args);';
    },
  }] });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { AdminStatistics } = await server.ssrLoadModule('/src/features/admin/AdminStatistics.tsx');
    root = createRoot(document.getElementById('root'));
    const render = key => act(async () => root.render(h(LanguageProvider, null, h(AdminStatistics, { key }))));
    await render('first');
    assert.ok(document.querySelector('[role="status"]'));
    assert.equal(document.querySelector('.admin-summary-grid'), null);
    assert.equal(document.querySelector('.ui-page-heading button').disabled, true);
    mode = 'error';
    await act(async () => release());
    assert.match(document.querySelector('[role="alert"]').textContent, /Statistics API unavailable/);
    assert.equal(document.querySelector('.admin-summary-grid'), null);
    mode = 'success';
    const retry = [...document.querySelectorAll('button')].find(node => /Th\u1eed l\u1ea1i|Retry/.test(node.textContent));
    await act(async () => retry.click());
    assert.equal(document.querySelector('[role="alert"]'), null);
    assert.equal(document.querySelector('.ui-page-heading button').disabled, false);
    assert.ok([...document.querySelectorAll('.admin-stat-value')].every(node => node.textContent === '0'));
    mode = 'pending';
    await render('second');
    assert.equal(document.querySelector('.admin-summary-grid'), null);
    await act(async () => root.unmount());
    root = null;
    assert.equal(signal.aborted, true);
    await act(async () => release());
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.__adminStatsTest;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
