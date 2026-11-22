import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { createElement, act } from 'react';

test('purchases select materials by name while sending the internal identifier only to the API', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const calls = [];
  globalThis.__purchasePickerTest = {
    search: async (farmId, filters) => { calls.push(['search', farmId, filters]); return [{ purchaseId: 77, referenceNo: 'REMOTE-77', purchaseDate: '2026-11-19', supplierName: 'Remote supplier', totalAmount: 50000 }]; },
    catalog: async url => { calls.push(['catalog', url]); return { success: true, data: [{ id: 87, materialName: 'Organic fertilizer' }] }; },
    save: async (farmId, payload) => { calls.push(['save', farmId, payload]); return { purchaseId: 99, purchaseDate: '2026-11-19', ...payload }; },
  };
  const names = ['fetchInputPurchases', 'searchInputPurchases', 'fetchInputPurchaseDetails', 'recordInputPurchase', 'deleteInputPurchase', 'linkWarehouseReceipt', 'fetchSuppliers'];
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', plugins: [{
    name: 'purchase-picker-test', enforce: 'pre',
    resolveId(source, importer) {
      if (!importer?.includes('InputPurchasesPage')) return;
      if (source.endsWith('/procurementService')) return '\0purchase-test-api';
      if (source.endsWith('/httpClient')) return '\0purchase-test-http';
      if (source.endsWith('/FarmWorkspace')) return '\0purchase-test-farm';
    },
    load(id) {
      if (id === '\0purchase-test-api') return names.map(name => `export const ${name} = ${name === 'recordInputPurchase' ? '(...args) => globalThis.__purchasePickerTest.save(...args)' : name === 'searchInputPurchases' ? '(...args) => globalThis.__purchasePickerTest.search(...args)' : 'async () => []'};`).join('\n');
      if (id === '\0purchase-test-http') return 'export const apiRequest = url => globalThis.__purchasePickerTest.catalog(url);';
      if (id === '\0purchase-test-farm') return 'export const useFarmWorkspace = () => ({selectedFarm: {id: 1}});';
    },
  }] });
  let root;
  try {
    const { InputPurchasesPage } = await server.ssrLoadModule('/src/features/operations/InputPurchasesPage.tsx');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(LanguageProvider, null, createElement(InputPurchasesPage))));
    const search = document.querySelector('input[type="search"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(search, 'REMOTE-77');
      search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    await act(async () => search.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    assert.equal(calls.find(call => call[0] === 'search')[2].keyword, 'REMOTE-77');
    assert.match(document.querySelector('tbody').textContent, /REMOTE-77/);
    const open = [...document.querySelectorAll('button')].find(button => /Record Purchase|Ghi nhận phiếu mua/.test(button.textContent));
    await act(async () => open.click());
    const picker = document.querySelector('.purchase-item-row select');
    assert.ok(picker);
    assert.equal(picker.value, '');
    assert.match(picker.textContent, /Organic fertilizer/);
    assert.doesNotMatch(document.querySelector('dialog').textContent, /Material ID|Mã vật tư/);
    assert.equal(document.querySelector('.purchase-item-row input[type="number"]').placeholder, 'Số lượng');
    await act(async () => { picker.value = '87'; picker.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    await act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(calls.find(call => call[0] === 'save')[2].items[0].materialId, 87);
    assert.doesNotMatch(document.body.textContent, /#PUR-99/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.__purchasePickerTest;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
