import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { assertAccessibleControls } from './helpers/assert-ui.mjs';

test('migrated farm, AI, VietGAP and inventory dialogs retain keyboard, drafts and submit contracts', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const nativeTimeout = globalThis.setTimeout;
  const timers = new Set();
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
    setTimeout: (callback, delay, ...args) => {
      const timer = nativeTimeout(callback, delay, ...args); timers.add(timer); return timer;
    } };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldAdapter = axios.defaults.adapter;
  const farm = { id: 1, farmName: 'Fixture farm', currentUserRole: 'OWNER', status: 'ACTIVE' };
  const warehouse = { warehouseId: 2, farmId: 1, farmName: farm.farmName, warehouseName: 'Fixture warehouse', address: 'North', totalItemCount: 1 };
  const inventory = { inventoryId: 3, warehouseId: 2, warehouseName: warehouse.warehouseName, materialId: 4,
    materialName: 'Fixture material', unit: 'kg', quantityOnHand: 10, reorderLevel: 2, isLowStock: false };
  const run = { runId: 5, ruleName: 'Fixture rule', farmId: 1, runStatus: 'completed', totalItems: 1, passedItems: 1, failedItems: 0, missingEvidenceCount: 0 };
  const assessment = { internalAssessmentId: 6, farmId: 1, assessmentTitle: 'Fixture assessment', assessedAt: '2026-11-01',
    totalScore: 10, maxPossibleScore: 10, scorePercentage: 100, complianceStatus: 'COMPLIANT', totalCriteria: 1, criteriaWithEvidence: 1, items: [] };
  const training = { trainingRecordId: 7, farmId: 1, farmName: farm.farmName, trainingTitle: 'Fixture training',
    trainingDate: '2026-11-01', attendeeCount: 1, attendees: [{ farmWorkerId: 29, workerCode: 'W29', fullName: 'Fixture attendee', attendanceStatus: 'present' }] };
  const feedback = { feedbackId: 8, aiResponseSnippet: 'Fixture answer', rating: 4, feedbackText: 'Original feedback', createdAt: '2026-11-01', replies: [] };
  const writes = [];
  const calls = [];
  let failWarehouse = false;
  let failAction = false;
  let failedGetPath = '';
  let holdAction = false;
  let releaseAction;
  const member = { id: 20, farmId: 1, userId: 2, fullName: 'Fixture staff', email: 'staff@example.test', farmRole: 'staff', status: 'active', joinedAt: '2026-11-01' };
  axios.defaults.adapter = async config => {
    calls.push(config);
    let data = [];
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      writes.push(config);
      if (holdAction) await new Promise(resolve => { releaseAction = resolve; });
    }
    if (config.url.startsWith('/farms?')) data = { items: [farm], last: true, totalPages: 1 };
    else if (config.url === '/farms/1') data = farm;
    else if (config.url === '/farms/1/reports/summary') data = {
      totalHarvestYield: 10, totalExpenseAmount: 4,
      seasonSummaries: [{ cropSeasonId: 30, seasonName: 'Fixture season', status: 'ACTIVE', harvestYield: 10, totalExpense: 4 }],
      expenseBreakdown: [{ category: 'Fixture cost', amount: 4, percentage: 40, color: '#ab12cd' }],
    };
    else if (config.url.startsWith('/farms/1/members/staff')) data = [member];
    else if (config.url.startsWith('/farms/1/workers')) data = [{ workerId: 22, farmMemberId: 20, fullName: member.fullName, workerCode: 'W22', employmentStatus: 'active' }];
    else if (config.url === '/farms/1/zone-assignments') data = [{ assignmentId: 23, farmMemberId: 20, zoneId: 3, zoneName: 'Fixture zone', staffName: member.fullName, active: true }];
    else if (config.url === '/ai/conversations') data = [{ conversationId: 24, title: 'Fixture conversation', status: 'active', messageCount: 0 }];
    else if (config.url === '/farms/1/input-purchases') data = [{ purchaseId: 25, referenceNo: 'PUR-25', purchaseDate: '2026-11-01', totalAmount: 10, itemCount: 1 }];
    else if (config.url.startsWith('/farms/1/suppliers')) data = config.method === 'post'
      ? { supplierId: 28, ...JSON.parse(config.data) } : [{ supplierId: 26, supplierName: 'Fixture supplier' }];
    else if (config.url === '/suppliers/26') data = { supplierId: 26, ...JSON.parse(config.data || '{}') };
    else if (config.url === '/user/farm-invitations') data = [{ memberId: 27, farmId: 2, farmName: 'Inviting farm', ownerName: 'Inviter', farmRole: 'staff' }];
    else if (config.url === '/ai/feedback/my-history') data = [feedback];
    else if (config.url === '/ai/feedback/8') data = feedback;
    else if (config.url === '/farms/1/checklist-runs') data = [run];
    else if (config.url === '/checklist-runs/5') data = run;
    else if (config.url === '/farms/1/internal-assessments') data = [assessment];
    else if (config.url.startsWith('/farms/1/vietgap-criteria')) data = [31, 32].map(criterionId => ({ criterionId, criterionName: `Criterion ${criterionId}`, maxScore: 100 }));
    else if (config.url === '/internal-assessments/6') data = assessment;
    else if (config.url.startsWith('/farms/1/training-records')) data = { items: [training], totalElements: 1 };
    else if (config.url === '/training-records/7') data = training;
    else if (config.url === '/farms/1/warehouses') data = config.method === 'post' ? warehouse : [warehouse];
    else if (config.url.startsWith('/farms/1/inventories')) data = [inventory];
    else if (config.url.startsWith('/material-usages/materials')) data = [{ id: 4, materialName: inventory.materialName, unit: 'kg' }];
    else if (config.url.startsWith('/farms/1/crop-seasons')) data = { items: [], last: true };
    const failed = (failWarehouse && config.method === 'post' && config.url === '/farms/1/warehouses') || (failAction && config.method !== 'get')
      || (failedGetPath && config.method === 'get' && config.url.startsWith(failedGetPath));
    return { config, headers: {}, status: failed ? 500 : 200, statusText: '', data: JSON.stringify({ success: !failed, message: 'Fixture failure', data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  let navigate;
  try {
    const { createRoot } = await import('react-dom/client');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    localStorage.setItem('mcd_lang', 'en');
    storage.saveAccessToken('fixture', { userId: 1, email: 'owner@example.test', fullName: 'Owner', systemRole: 'USER' }, 'refresh');
    function Location() { navigate = useNavigate(); return null; }
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/farm'] },
      createElement(AuthProvider, null, createElement(App), createElement(Location)))));
    await act(async () => {
      const workspace = document.querySelector('.workspace-switcher select'); workspace.value = '1';
      workspace.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });
    const button = text => {
      const result = [...document.querySelectorAll('main button')].find(item => item.textContent.includes(text));
      assert.ok(result, `Missing button: ${text}; available: ${[...document.querySelectorAll('main button')].map(item => item.textContent).join(' / ')}`); return result;
    };
    const go = async path => {
      await act(async () => navigate(path));
      assertAccessibleControls(document.querySelector('main, .public-content'));
    };
    const fill = async (input, value) => act(async () => {
      const prototype = input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    let checked = 0;
    const checkDialog = async launcher => {
      assert.ok(launcher); launcher.focus(); const before = writes.length;
      await act(async () => launcher.click());
      const dialog = document.querySelector('dialog'); assert.ok(dialog?.open);
      assertAccessibleControls(dialog);
      for (const table of document.querySelectorAll('.ui-data-table')) {
        assert.ok(table.parentElement.classList.contains('ui-table-scroll'));
        assert.equal(table.parentElement.tabIndex, 0);
        assert.ok([...table.querySelectorAll('th')].every(header => header.scope === 'col'));
        assert.ok([...table.querySelectorAll('th, td:not([colspan])')].every(cell => !cell.style.padding));
      }
      for (const label of dialog.querySelectorAll('label[for]')) {
        assert.ok(label.control, `Unlinked label: ${label.textContent}`);
        assert.equal(document.querySelectorAll(`[id="${label.htmlFor}"]`).length, 1);
      }
      const heading = document.getElementById(dialog.getAttribute('aria-labelledby')); assert.ok(heading?.textContent.trim());
      assert.equal(document.body.style.overflow, 'hidden');
      const close = dialog.querySelector('.modal-close'); assert.equal(close.type, 'button');
      assert.equal(close.getAttribute('aria-label'), 'Close dialog'); assert.equal(document.activeElement, close);
      const draft = [...dialog.querySelectorAll('input, select, textarea')].map(control => [control.id, control.value, control.checked]);
      const beforeLanguageChange = calls.length;
      for (const language of ['vi', 'en']) {
        await act(async () => document.querySelector('.header-translate-btn').click());
        assert.equal(document.documentElement.lang, language);
        assert.equal(dialog.querySelector('.modal-close').getAttribute('aria-label'), language === 'vi' ? 'Đóng cửa sổ' : 'Close dialog');
        assert.deepEqual([...dialog.querySelectorAll('input, select, textarea')].map(control => [control.id, control.value, control.checked]), draft);
        assertAccessibleControls(dialog);
        assert.equal(calls.length, beforeLanguageChange, 'Changing language must not reload or submit an open form');
      }
      const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
      await act(async () => close.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
      assert.equal(document.activeElement, controls.at(-1));
      await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true })));
      assert.equal(document.querySelector('dialog'), null); assert.equal(document.body.style.overflow, '');
      assert.equal(document.activeElement, launcher); assert.equal(writes.length, before);
      // The visible X closes the same dialog without submitting.
      await act(async () => launcher.click());
      await act(async () => document.querySelector('dialog .modal-close').click());
      assert.equal(document.querySelector('dialog'), null); assert.equal(writes.length, before);
      checked++;
    };
    await go('/farm'); await checkDialog(button('Add Member'));
    await go('/ai-feedback'); await checkDialog(button('Edit'));
    await go('/checklists'); await checkDialog(button('View results'));
    await go('/assessments'); await checkDialog(button('Details')); await checkDialog(button('Start new assessment'));
    await go('/training'); await checkDialog(button('Details & Attendance')); await checkDialog(button('Add training course'));
    await go('/reports');
    for (const theme of ['dark', 'light']) {
      await act(async () => document.querySelector('.theme-toggle-switch').click());
      assert.equal(document.documentElement.dataset.theme, theme);
      const category = [...document.querySelectorAll('main span')].find(node => node.textContent === 'Fixture cost');
      assert.equal(category.nextElementSibling.style.color, 'var(--color-text)');
      const bar = [...document.querySelectorAll('main div')].find(node => node.style.width === '40%');
      assert.equal(bar.style.background, 'rgb(171, 18, 205)');
      const table = document.querySelector('main .ui-data-table');
      assert.ok(table.parentElement.classList.contains('ui-table-scroll'));
      assert.match(table.textContent, /Fixture season/);
      assert.ok([...table.querySelectorAll('th')].every(header => header.scope === 'col'));
      assert.equal(document.getElementById('reports-tab-reports').getAttribute('aria-selected'), 'true');
    }
    await act(async () => button('Warehouses & Material inventory').click());
    assert.equal(document.querySelectorAll('main h1').length, 1);
    assert.ok(document.querySelector('.ui-page-heading--section h2'));
    await checkDialog(document.querySelector('[aria-label="View Fixture warehouse"]'));
    await checkDialog(button('Add Warehouse'));
    await checkDialog(document.querySelector('[aria-label="Edit Fixture warehouse"]'));
    const inventoryTab = [...document.querySelectorAll('main [role="tab"]')].find(item => item.textContent.includes('Inventory'));
    assert.ok(inventoryTab); await act(async () => inventoryTab.click());
    assert.equal(inventoryTab.getAttribute('aria-selected'), 'true');
    assert.equal(document.getElementById(inventoryTab.getAttribute('aria-controls')).getAttribute('aria-labelledby'), inventoryTab.id);
    assert.equal(document.querySelectorAll('[id="warehouse-panel-inventory"]').length, 1);
    assert.equal(document.querySelector('#reports-tab-warehouses').getAttribute('aria-selected'), 'true');
    await checkDialog(document.querySelector('main .table-icon-btn.edit'));
    await checkDialog(button('Add to Inventory'));
    assert.equal(checked, 12);
    assert.equal(writes.length, 0);

    // Create form: closing preserves its current draft; failure leaves values available for retry.
    const warehousesTab = [...document.querySelectorAll('main button')].find(item => /Storage Warehouses|Warehouses \(/.test(item.textContent));
    assert.ok(warehousesTab); await act(async () => warehousesTab.click());
    await act(async () => button('Add Warehouse').click());
    await fill(document.querySelector('dialog input'), 'Draft warehouse');
    await act(async () => document.querySelector('dialog .modal-close').click());
    await act(async () => button('Add Warehouse').click());
    assert.equal(document.querySelector('dialog input').value, 'Draft warehouse');
    failWarehouse = true;
    await act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.ok(document.querySelector('dialog')); assert.equal(document.querySelector('dialog input').value, 'Draft warehouse');
    assert.equal(writes.length, 1); assert.deepEqual(JSON.parse(writes[0].data), { warehouseName: 'Draft warehouse' });
    failWarehouse = false;
    await act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('dialog'), null); assert.equal(writes.length, 2);
    assert.deepEqual(JSON.parse(writes[1].data), { warehouseName: 'Draft warehouse' });

    // These actions must use the shared dialog, never a browser-native prompt.
    window.confirm = () => assert.fail('Native confirmation must not be called');
    const checkAction = async (launch, method, url, successPattern = /success|Removed|Suspended/i) => {
      const before = writes.length;
      for (const dismiss of ['cancel', 'close', 'escape']) {
        const launcher = launch(); assert.ok(launcher); launcher.focus();
        await act(async () => launcher.click());
        const dialog = document.querySelector('dialog'); assert.ok(dialog?.open);
        assert.ok(document.getElementById(dialog.getAttribute('aria-labelledby')));
        await act(async () => {
          if (dismiss === 'escape') window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
          else dialog.querySelector(dismiss === 'close' ? '.modal-close' : '.confirm-dialog-actions button').click();
        });
        assert.equal(document.querySelector('dialog'), null);
        assert.equal(document.activeElement, launcher);
        assert.equal(writes.length, before);
      }
      for (const failed of [true, false]) {
        failAction = failed; holdAction = true;
        await act(async () => launch().click());
        const confirm = document.querySelector('dialog .ui-button--danger');
        await act(async () => confirm.click());
        const count = writes.length;
        assert.equal(count, before + (failed ? 1 : 2));
        assert.equal(writes.at(-1).method, method);
        assert.equal(writes.at(-1).url, url);
        assert.equal(writes.at(-1).data, undefined);
        assert.equal(confirm.disabled, true);
        assert.equal(confirm.getAttribute('aria-busy'), 'true');
        await act(async () => {
          confirm.click();
          document.querySelector('dialog .modal-close').click();
          window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        });
        assert.ok(document.querySelector('dialog'));
        assert.equal(writes.length, count);
        holdAction = false;
        await act(async () => releaseAction());
        assert.equal(document.querySelector('dialog'), null);
        assert.match(document.querySelector(failed ? 'main [role="alert"], main .form-error-banner' : 'main').textContent, failed ? /Fixture failure/ : successPattern);
        if (failed) assert.ok(launch(), 'The record remains available after a failed request');
      }
    };
    await go('/farm');
    await checkAction(() => document.querySelector('main [title="Remove member"]'), 'patch', '/farms/1/members/20/deactivate');
    await go('/members');
    await checkAction(() => document.querySelector('main [aria-label="Suspend Fixture staff"]'), 'patch', '/farms/1/members/20/deactivate');
    await act(async () => document.getElementById('staff-tab-assignments').click());
    await checkAction(() => document.querySelector('main [aria-label="Cancel assignment for Fixture staff"]'), 'delete', '/farms/1/zone-assignments/23');
    await act(async () => document.getElementById('staff-tab-workers').click());
    await checkAction(() => document.querySelector('main [aria-label="Delete Fixture staff"]'), 'delete', '/farms/1/workers/22');
    await go('/ai-history');
    await checkAction(() => button('Delete'), 'delete', '/ai/conversations/24');
    await go('/reports'); await act(async () => button('Warehouses & Material inventory').click());
    await checkAction(() => document.querySelector('main [aria-label="Delete Fixture warehouse"]'), 'delete', '/warehouses/2');
    await act(async () => document.getElementById('warehouse-tab-inventory').click());
    await checkAction(() => document.querySelector('main [aria-label="Delete Fixture material"]'), 'delete', '/inventories/3');
    await go('/purchases');
    await checkAction(() => document.querySelector('main .table-icon-btn.danger'), 'delete', '/input-purchases/25');
    await go('/training');
    window.alert = () => assert.fail('Native alert must not be called');
    await checkAction(() => button('Delete'), 'delete', '/training-records/7', /Training|training/);

    // Failed form saves show inline errors and preserve the draft; retry keeps the payload.
    for (const [path, launchText, title] of [
      ['/training', 'Add training course', 'Training draft'],
      ['/assessments', 'Start new assessment', 'Assessment draft'],
    ]) {
      await go(path); await act(async () => button(launchText).click());
      const input = document.querySelector('dialog input'); await fill(input, title);
      failAction = true;
      await act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
      assert.match(document.querySelector('dialog [role="alert"]').textContent, /Fixture failure/);
      assert.equal(input.value, title);
      const payload = writes.at(-1).data;
      failAction = false;
      await act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
      assert.equal(document.querySelector('dialog'), null);
      assert.equal(writes.at(-1).data, payload);
    }

    // Supplier name validation and API errors are visible inside each form.
    await go('/suppliers');
    for (const mode of ['create', 'edit']) {
      if (mode === 'create') await act(async () => button('Add Supplier').click());
      else await act(async () => document.querySelector('main [aria-label="Edit Fixture supplier"]').click());
      const input = document.querySelector('dialog input');
      const submitForm = () => act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
      const before = writes.length;
      await fill(input, '   '); await submitForm();
      assert.match(document.querySelector('dialog [role="alert"]').textContent, /supplier name|Supplier name/);
      assert.equal(writes.length, before);
      await fill(input, 'Supplier draft');
      failAction = true; await submitForm();
      assert.match(document.querySelector('dialog [role="alert"]').textContent, /Fixture failure/);
      assert.equal(input.value, 'Supplier draft');
      const payload = writes.at(-1).data;
      failAction = false; await submitForm();
      assert.equal(document.querySelector('dialog'), null);
      assert.equal(writes.at(-1).data, payload);
      const beforeSwitch = calls.length;
      await act(async () => document.querySelector('.header-translate-btn').click());
      assert.match(document.querySelector('main .status-note').textContent, /Đã (thêm|cập nhật) nhà cung cấp "Supplier draft"/);
      await act(async () => document.querySelector('.header-translate-btn').click());
      assert.match(document.querySelector('main .status-note').textContent, /(?:Added|Updated) supplier "Supplier draft"/);
      assert.equal(calls.length, beforeSwitch);
      await go('/farm'); await go('/suppliers');
    }
    await go('/purchases'); await act(async () => button('Record Purchase').click());
    failAction = true;
    await act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.match(document.querySelector('dialog [role="alert"]').textContent, /Fixture failure/);
    await act(async () => document.querySelector('dialog .modal-close').click());

    // Failed invitation replies stay visible in the notification panel and can retry.
    await act(async () => document.querySelector('.notification-btn').click());
    const decline = () => [...document.querySelectorAll('.notification-popover button')].find(node => node.textContent.includes('Decline'));
    failAction = true; await act(async () => decline().click());
    assert.match(document.querySelector('.notification-popover [role="alert"]').textContent, /Fixture failure/);
    assert.ok(decline());
    failAction = false; await act(async () => decline().click());
    assert.equal(document.querySelector('.notification-popover [role="alert"]'), null);
    assert.equal(decline(), undefined);
    assert.equal(writes.at(-1).url, '/user/farm-invitations/27/reject');
    await act(async () => document.querySelector('.notification-btn').click());

    for (const [path, endpoint, emptyText] of [
      ['/suppliers', '/farms/1/suppliers', 'No suppliers matching'],
      ['/purchases', '/farms/1/input-purchases', 'No input purchases found'],
      ['/expenses', '/farms/1/expenses', 'No expense records found'],
    ]) {
      failedGetPath = endpoint; await go(path);
      assert.match(document.querySelector('main [role="alert"]').textContent, /Fixture failure/);
      assert.ok(!document.querySelector('main').textContent.includes(emptyText));
      failedGetPath = ''; await act(async () => button('Retry').click());
      assert.equal(document.querySelector('main [role="alert"]'), null);
    }
    for (const [endpoint, tab] of [['/farms/1/warehouses', 'warehouses'], ['/farms/1/inventories', 'inventory']]) {
      await go('/farm'); failedGetPath = endpoint; await go('/reports');
      await act(async () => document.getElementById('reports-tab-warehouses').click());
      await act(async () => document.getElementById(`warehouse-tab-${tab}`).click());
      assert.match(document.querySelector('main [role="alert"]').textContent, /Fixture failure/);
      failedGetPath = ''; await act(async () => button('Retry').click());
      assert.equal(document.querySelector('main [role="alert"]'), null);
    }
    failedGetPath = '/farms/1/workers'; await go('/members');
    await act(async () => document.getElementById('staff-tab-workers').click());
    assert.match(document.querySelector('main [role="alert"]').textContent, /Fixture failure/);
    failedGetPath = ''; await act(async () => button('Retry').click());
    assert.equal(document.querySelector('main [role="alert"]'), null);

    await go('/reports');
    for (const tab of ['warehouses', 'expenses', 'purchases', 'suppliers']) {
      await act(async () => document.getElementById(`reports-tab-${tab}`).click());
      assert.equal(document.querySelectorAll('main h1').length, 1);
      assert.ok(document.querySelector('.ui-page-heading--section h2'));
      assertAccessibleControls(document.querySelector('main'));
    }
    const { moduleDefinitions } = await server.ssrLoadModule('/src/app/routes/moduleDefinitions.ts');
    for (const path of ['/dashboard', '/zones/new', ...moduleDefinitions.filter(module => module.group !== 'admin').map(module => '/' + module.path)]) {
      await go(path);
      const content = () => document.querySelector('main, .public-content');
      const beforeSwitch = calls.length;
      const values = () => [...content().querySelectorAll('input, select, textarea')].map(control => [control.id, control.value, control.checked]);
      const draft = values();
      const tabs = () => [...document.querySelectorAll('main [role="tab"][aria-selected="true"]')].map(tab => tab.id);
      const activeTabs = tabs();
      for (const language of ['vi', 'en']) {
        await act(async () => document.querySelector('.header-translate-btn').click());
        assert.equal(document.documentElement.lang, language, path);
        assert.ok(content().textContent.trim(), path);
        assert.deepEqual(values(), draft, `${path}: language preserves form and filter values`);
        assert.deepEqual(tabs(), activeTabs, `${path}: language preserves selected tabs`);
        assert.equal(calls.length, beforeSwitch, `${path}: language must not trigger requests`);
      }
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); axios.defaults.adapter = oldAdapter;
    // Toast callbacks must not outlive the browser globals owned by this test.
    for (const timer of timers) clearTimeout(timer);
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
