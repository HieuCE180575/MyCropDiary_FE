import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement as h, act } from 'react';
import { MemoryRouter } from 'react-router-dom';

test('statistics hide stale totals during loading and failure, retry successfully, and abort on unmount', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173/admin/statistics' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  let mode = 'pending';
  let release;
  let signal;
  let failExpenses = false;
  let emptyExpenses = false;
  const calls = [];
  const fixtureDate = new Date().toISOString();
  globalThis.__adminStatsTest = {
    state: { users: [], registrations: [], farms: [], zones: [], blocks: [], compliance: [], feedback: [], seasons: [] },
    request: async (path, options) => {
      calls.push(path);
      if (path === '/admin/farms') return { success: true, data: [{ farmId: 1, farmName: 'Farm A', ownerName: 'Owner A', zoneCount: 1, blockCount: 1, status: 'ACTIVE', address: 'Address A' }] };
      if (path === '/admin/zones') return { success: true, data: [{ zoneId: 1, farmId: 1, zoneName: 'Zone A', areaValue: 20000, areaUnit: 'm2' }] };
      if (path === '/admin/blocks') return { success: true, data: [{ blockId: 1, areaValue: 20000, areaUnit: 'm2' }] };
      if (path === '/admin/compliance') return { success: true, data: [{ seasonId: 1, seasonName: 'Season A', cropName: 'Melon', farmName: 'Farm A', status: 'HARVESTED', expectedYield: '500 kg' }] };
      if (path === '/admin/ai-feedback') return { success: true, data: [{ feedbackId: 1, feedbackText: 'Feedback A', senderName: 'User A', status: 'RESOLVED', rating: 5, createdAt: fixtureDate }] };
      if (path === '/farms/1/expenses') {
        if (failExpenses) throw new Error('Forbidden');
        if (emptyExpenses) return { success: true, data: [] };
        return { success: true, data: [{ expenseId: 1, farmId: 1, expenseCategory: 'LABOR', description: 'Expense A', amount: 1000000, expenseDate: fixtureDate, createdAt: fixtureDate }] };
      }
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
    const render = key => act(async () => root.render(h(MemoryRouter, null, h(LanguageProvider, null, h(AdminStatistics, { key })))));
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
    assert.equal(document.querySelectorAll('.account-kpi').length, 3);
    assert.ok([...document.querySelectorAll('.account-kpi strong')].every(node => node.textContent === '0'));
    assert.equal(document.querySelectorAll('.account-chart-panel svg[role="img"]').length, 2);
    assert.equal(document.querySelector('.account-role-panel'), null);
    assert.equal(document.querySelectorAll('.account-plot .account-cumulative-point').length, 6);
    const period = document.querySelector('.account-period select');
    await act(async () => { period.value = '12'; period.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.equal(document.querySelectorAll('.account-plot .account-cumulative-point').length, 12);
    assert.ok(!document.querySelector('.account-dashboard').innerHTML.includes('NaN'));
    const now = new Date();
    const earlier = new Date(now.getFullYear(), now.getMonth() - 8, 1).toISOString();
    globalThis.__adminStatsTest.state.users = [
      { id: 'old', name: 'Older User', status: 'ACTIVE', email: 'old@example.com', createdAt: earlier },
      { id: 'new', name: 'Newest User', status: 'ACTIVE', email: 'new@example.com', createdAt: now.toISOString() },
    ];
    await render('populated');
    const cumulative = [...document.querySelectorAll('.account-cumulative-point title')];
    assert.ok(cumulative[0].textContent.endsWith(': 1'), 'Cumulative series includes accounts registered before the period');
    assert.ok(cumulative.at(-1).textContent.endsWith(': 2'));
    assert.ok(document.querySelectorAll('.account-new-point title')[5].textContent.endsWith(': 1'));
    assert.match(document.querySelector('.account-recent-table tbody tr').textContent, /Newest User/);
    assert.equal(document.querySelector('.account-recent-panel a').getAttribute('href'), '/admin/users');
    globalThis.__adminStatsTest.state.registrations = [{ id: '1', name: 'Application A', applicant: 'Applicant A', status: 'APPROVED', createdAt: fixtureDate, reviewedAt: fixtureDate }];
    const tab = async label => {
      const button = [...document.querySelectorAll('.admin-stat-tabs button')].find(item => item.textContent === label);
      assert.ok(button, label);
      await act(async () => button.click());
    };
    for (const [label, key] of [['Trang trại & Vùng trồng', 'farms'], ['Mùa vụ', 'seasons'], ['Chi phí', 'costs'], ['Hồ sơ trang trại', 'registrations'], ['Phản hồi AI', 'feedback']]) {
      await tab(label);
      assert.ok(document.querySelector(`[data-analytics-tab="${key}"]`));
      assert.equal(document.querySelectorAll('.analytics-kpi').length, key === 'costs' ? 3 : 4);
      assert.equal(document.querySelectorAll('.analytics-grid .analytics-panel').length, key === 'seasons' ? 2 : 3);
      assert.equal(document.querySelectorAll('.analytics-recent tbody tr').length, 1);
      assert.ok(!document.querySelector('.analytics-dashboard').innerHTML.includes('NaN'));
      if (key === 'farms') {
        assert.match(document.querySelectorAll('.analytics-kpi strong')[3].textContent, /2 ha/);
        assert.match(document.querySelector('.analytics-grouped-bars svg').getAttribute('aria-label'), /Farm A: 1 phân khu, 1 lô đất/);
        assert.equal(document.querySelector('.analytics-recent tbody tr td:last-child').textContent, '2');
        assert.ok(!document.querySelector('.analytics-dashboard').textContent.includes('Chưa có ngày tạo'));
      }
      if (key === 'seasons') {
        assert.match(document.querySelector('.analytics-dashboard').textContent, /Phân bố mùa vụ theo loại cây trồng/);
        assert.match(document.querySelector('.analytics-plot').getAttribute('aria-label'), /Melon: 1/);
        assert.ok(!document.querySelector('.analytics-dashboard').textContent.includes('Sản lượng theo mùa vụ'));
      }
      if (key === 'costs') {
        assert.match(document.querySelector('.analytics-dashboard').textContent, /1\.000\.000/);
        assert.ok(!document.querySelector('.analytics-dashboard').textContent.includes('Ngân sách'));
        assert.match(document.querySelectorAll('.analytics-kpi strong')[1].textContent, /^1$/);
        assert.match(document.querySelectorAll('.analytics-kpi strong')[2].textContent, /^1$/);
        assert.match(document.querySelector('.analytics-recent tbody tr').textContent, /Farm A/);
        const help = [...document.querySelectorAll('.analytics-cost-guide button')].find(button => button.textContent.includes('Hướng dẫn kiểm tra'));
        await act(async () => help.click());
        assert.ok(document.querySelector('.analytics-cost-help'));
        await act(async () => [...document.querySelectorAll('.analytics-cost-guide button')].find(button => button.textContent.includes('Thay đổi khoảng thời gian')).click());
        assert.equal(document.activeElement, document.querySelector('.admin-stat-filters input'));
      }
    }
    failExpenses = true;
    await tab('Chi phí');
    assert.ok(document.querySelector('[role="alert"]'));
    assert.equal(document.querySelector('.analytics-kpis'), null, 'Failed expense reads must not present partial totals');
    assert.equal(document.querySelector('.ui-page-heading button').disabled, true);
    failExpenses = false;
    await act(async () => [...document.querySelectorAll('button')].find(button => button.textContent === 'Thử lại').click());
    assert.ok(document.querySelector('[data-analytics-tab="costs"]'));
    emptyExpenses = true;
    await tab('Tài khoản');
    await tab('Chi phí');
    assert.match(document.querySelector('.analytics-cost-guide').textContent, /Chưa có dữ liệu chi phí trong khoảng thời gian này/);
    assert.equal(document.querySelectorAll('.analytics-kpi').length, 3);
    assert.equal(document.querySelectorAll('.analytics-recent tbody tr').length, 0);
    assert.equal(document.querySelector('.ui-page-heading button').disabled, true);
    assert.ok(!calls.some(path => path.includes('/members')), 'Analytics must not request farm memberships');
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
