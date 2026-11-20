import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { createElement, act } from 'react';
import { MemoryRouter } from 'react-router-dom';

test('environment and training entry dialogs use shared fields and preserve failed submissions', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const calls = [];
  globalThis.__environmentFormTest = {
    empty: async () => [],
    risks: async () => [{ riskId: 201, zoneId: 2, zoneName: 'Fixture zone', riskType: 'Fixture zone risk', riskLevel: 'MEDIUM', assessedAt: '2026-01-22', description: 'Risk description', mitigationPlan: 'Risk controls', assessedByName: 'Fixture assessor' }],
    soils: async () => [{ assessmentId: 301, blockId: 3, zoneId: 2, blockName: 'Fixture block', soilPh: 5.9, moisturePercent: 65, assessedAt: '2026-02-20' }],
    soilDetails: async () => ({ assessmentId: 301, blockId: 3, zoneId: 2, blockName: 'Fixture block', soilPh: 5.9, moisturePercent: 65, assessedAt: '2026-02-20' }),
    blocks: async () => [{ blockId: 3, zoneId: 2, blockName: 'Fixture block', zoneName: 'Fixture zone' }],
    training: async () => ({ items: [], totalElements: 0, totalPages: 0 }),
    save: async (...args) => { calls.push(args); throw new Error('Fixture server rejected save'); },
  };
  const services = {
    zoneBlockService: { fetchFarmRiskHistoryApi: 'risks', fetchFarmSoilAssessmentHistoryApi: 'soils', fetchFarmWaterAssessmentHistoryApi: 'empty', fetchSoilAssessmentDetailsApi: 'soilDetails', fetchWaterAssessmentDetailsApi: 'empty', createSoilAssessmentApi: 'save', createWaterAssessmentApi: 'save', fetchBlocks: 'blocks' },
    trainingService: { fetchTrainingHistoryApi: 'training', fetchTrainingDetailsApi: 'empty', createTrainingRecordApi: 'save', deleteTrainingRecordApi: 'empty' },
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', plugins: [{
    name: 'environment-form-test', enforce: 'pre',
    resolveId(source, importer) {
      if (!importer?.includes('VietGAPCompliancePage')) return;
      if (source.endsWith('/FarmWorkspace')) return '\0env-form-farm';
      for (const service of Object.keys(services)) if (source.endsWith('/' + service)) return '\0env-form-' + service;
    },
    load(id) {
      if (id === '\0env-form-farm') return 'export const useFarmWorkspace = () => ({selectedFarm: {id: 1, farmName: "Fixture farm"}});';
      for (const [service, exports] of Object.entries(services)) if (id === '\0env-form-' + service) return Object.entries(exports).map(([name, fn]) => `export const ${name} = (...args) => globalThis.__environmentFormTest.${fn}(...args);`).join('\n');
    },
  }] });
  let root;
  try {
    const { VietGAPCompliancePage } = await server.ssrLoadModule('/src/features/compliance/VietGAPCompliancePage.tsx');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    const render = tab => act(async () => root.render(createElement(MemoryRouter, null, createElement(LanguageProvider, null, createElement(VietGAPCompliancePage, { key: tab, initialTab: tab })))));
    const click = async pattern => {
      const button = [...document.querySelectorAll('button')].find(node => pattern.test(node.textContent));
      assert.ok(button, `Missing button ${pattern}`);
      await act(async () => button.click());
    };
    const verifyDialog = () => {
      const dialog = document.querySelector('dialog');
      assert.ok(dialog.classList.contains('form-standard-modal'));
      assert.ok(dialog.classList.contains('modal-form-layout'));
      assert.equal(dialog.querySelector('form > .modal-body + .modal-footer')?.parentElement.tagName, 'FORM');
      assert.ok(dialog.querySelector('.modal-footer .ui-cancel-button'));
      for (const control of dialog.querySelectorAll('input:not([type="file"]):not([aria-hidden="true"]), textarea, select')) {
        assert.ok(control.closest('.structured-field-card'), control.outerHTML);
        assert.ok(control.id && dialog.querySelector(`label[for="${control.id}"]`), control.outerHTML);
      }
      return dialog;
    };
    await render('environment');
    const viewRisk = document.querySelector('button[title="Xem chi tiết rủi ro"], button[title="View risk details"]');
    assert.ok(viewRisk);
    viewRisk.focus();
    await act(async () => viewRisk.click());
    const riskDialog = document.querySelector('dialog');
    assert.ok(riskDialog?.open, 'risk details open in a native modal, not below the list');
    assert.match(riskDialog.textContent, /Fixture zone risk/);
    assert.match(riskDialog.querySelector('.modal-header h2').textContent, /Chi tiết rủi ro vùng sản xuất|Production area risk details/);
    assert.doesNotMatch(riskDialog.querySelector('.modal-header').textContent, /Fixture zone risk/);
    const riskName = riskDialog.querySelector('.modal-body .ui-detail-primary');
    assert.match(riskName.textContent, /Tên loại rủi ro|Risk type/);
    assert.match(riskName.textContent, /Fixture zone risk/);
    assert.match(riskDialog.textContent, /Risk controls/);
    assert.equal(document.body.style.overflow, 'hidden');
    await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true })));
    assert.equal(document.querySelector('dialog'), null);
    assert.equal(document.activeElement, viewRisk);
    await act(async () => document.querySelector('#vietgap-environment-tab-soils').click());
    const viewSoil = document.querySelector('button[title="View soil assessment details"], button[title="Xem chi tiết đánh giá đất"]');
    assert.ok(viewSoil);
    viewSoil.focus();
    await act(async () => viewSoil.click());
    const soilDialog = document.querySelector('dialog');
    assert.ok(soilDialog?.open);
    assert.match(soilDialog.textContent, /Fixture block/);
    assert.ok(soilDialog.querySelector('.modal-footer'));
    assert.equal(document.body.style.overflow, 'hidden');
    await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true })));
    assert.equal(document.querySelector('dialog'), null);
    assert.equal(document.activeElement, viewSoil);
    await click(/Ghi nhận mẫu đất|Record Soil Sample/);
    let dialog = verifyDialog();
    const ph = dialog.querySelector('input[type="number"]');
    const value = ph.value;
    await act(async () => dialog.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(calls.length, 1);
    assert.match(document.querySelector('dialog').textContent, /Fixture server rejected save/);
    assert.equal(document.querySelector('dialog input[type="number"]').value, value);
    await act(async () => document.querySelector('dialog .ui-cancel-button').click());
    await act(async () => document.querySelector('#vietgap-environment-tab-waters').click());
    await click(/Ghi nhận mẫu nước|Record Water Sample/);
    verifyDialog();
    await act(async () => document.querySelector('dialog .ui-cancel-button').click());
    await render('training');
    await click(/Thêm khóa đào tạo|Add Training Course/i);
    dialog = verifyDialog();
    assert.equal(dialog.querySelectorAll('.structured-field-card').length, 4);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.__environmentFormTest;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
