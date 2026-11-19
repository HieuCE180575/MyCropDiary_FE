import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { createElement, act } from 'react';

test('soil assessments keep empty server lists and retain the form after a rejected save', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const calls = [];
  const block = { blockId: 1, zoneId: 1, blockName: 'Test block', zoneName: 'Test zone', areaValue: 100, areaUnit: 'm2', status: 'ACTIVE' };
  const record = { assessmentId: 91, blockId: 1, zoneId: 1, farmId: 1, soilPh: 0, moisturePercent: 0, nutrientData: '{"sampleCode":"S-91","organicMatterPct":0,"extraResult":"Retain me"}', assessedAt: '2026-11-19T00:00:00Z' };
  let history = [];
  let rejectSave = true;
  let rejectDelete = true;
  let rejectHistory = false;
  globalThis.__soilApiTest = {
    fetchBlockById: async () => block,
    fetchZoneById: async () => ({ zoneId: 1, zoneName: 'Test zone' }),
    fetchBlockConditions: async () => [],
    fetchBlockRiskRecords: () => [],
    fetchWaterAssessmentHistoryApi: async () => [],
    fetchSoilAssessmentHistoryApi: async () => { calls.push(['LIST']); if (rejectHistory) throw new Error('History unavailable'); return history; },
    fetchSoilAssessmentDetailsApi: async id => { calls.push(['GET', id]); return record; },
    createSoilAssessmentApi: async (id, payload) => { calls.push(['POST', id, payload]); if (rejectSave) throw new Error('Server rejected soil save'); const saved = { ...record, ...payload }; history = [saved]; return saved; },
    updateSoilAssessmentApi: async (id, payload) => { calls.push(['PUT', id, payload]); history = [{ ...record, ...payload }]; return history[0]; },
    deleteSoilAssessmentApi: async id => { calls.push(['DELETE', id]); if (rejectDelete) throw new Error('Linked soil record'); history = []; },
  };
  const apiNames = Object.keys(globalThis.__soilApiTest).concat('deleteBlock', 'saveRiskRecord');
  const cropNames = ['fetchCropCategories', 'fetchCropSeasonsForBlock', 'createCropSeason', 'updateCropSeason', 'assignBlockToSeason', 'updateSeasonBlock'];
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', plugins: [{
    name: 'soil-page-test', enforce: 'pre',
    resolveId(source, importer) {
      if (!importer?.includes('BlockDetailPage')) return;
      if (source.endsWith('/zoneBlockService')) return '\0soil-api';
      if (source.endsWith('/cropSeasonService')) return '\0soil-crops';
      if (source.endsWith('/FarmWorkspace')) return '\0soil-workspace';
      if (source.endsWith('/realtimeSync')) return '\0soil-realtime';
      for (const name of ['BlockModal', 'RecordConditionModal', 'FarmGoongMap', 'CropCategoryCombobox']) if (source.endsWith('/' + name)) return '\0soil-stub-' + name;
    },
    load(id) {
      if (id === '\0soil-api') return apiNames.map(name => `export const ${name} = (...args) => globalThis.__soilApiTest.${name}(...args);`).join('\n');
      if (id === '\0soil-crops') return cropNames.map(name => `export const ${name} = async () => [];`).join('\n');
      if (id === '\0soil-workspace') return 'export const useFarmWorkspace = () => ({selectedFarm: {id: 1, farmName: "Test farm", role: "OWNER"}});';
      if (id === '\0soil-realtime') return 'export const useRealtimeSync = () => {};';
      if (id.startsWith('\0soil-stub-')) return `export const ${id.slice('\0soil-stub-'.length)} = () => null;`;
    },
  }] });
  let root;
  try {
    const { soilAssessmentRecord, soilNutrients } = await server.ssrLoadModule('/src/features/production/soilAssessmentData.ts');
    const sparse = soilAssessmentRecord({ assessmentId: 92, blockId: 1, nutrientData: '' });
    assert.equal(sparse.sampleCode, '');
    assert.equal(sparse.phLevel, '');
    assert.equal(sparse.heavyMetalResult, '');
    assert.equal(sparse.conclusion, '');
    assert.equal(soilAssessmentRecord(record).phLevel, 0);
    assert.equal(soilAssessmentRecord(record).organicMatterPct, 0);
    assert.deepEqual(soilNutrients('not JSON'), {});
    const { BlockDetailPage } = await server.ssrLoadModule('/src/pages/zone/BlockDetailPage.tsx');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { MemoryRouter } = await import('react-router-dom');
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(LanguageProvider, null, createElement(BlockDetailPage)))));
    await act(async () => document.querySelector('#block-detail-tab-soil').click());
    assert.equal(document.querySelectorAll('#block-detail-panel-soil th').length, 5);
    assert.doesNotMatch(document.querySelector('#block-detail-panel-soil thead').textContent, /Organic Matter|Chất hữu cơ|Heavy Metals|Kim loại nặng|Sample Code|Mã mẫu/);
    assert.equal(document.querySelectorAll('#block-detail-panel-soil tbody tr').length, 1);
    assert.equal(document.querySelector('#block-detail-panel-soil .table-icon-btn'), null);
    const add = document.querySelector('#block-detail-panel-soil .panel-title button');
    assert.ok(add);
    await act(async () => add.click());
    const submit = () => act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    await submit();
    assert.match(document.querySelector('dialog [role="alert"]').textContent, /Server rejected soil save/);
    assert.equal(document.querySelector('#block-detail-page-control-22').value, '6.5');
    assert.equal(document.querySelectorAll('#block-detail-panel-soil .table-icon-btn').length, 0);
    assert.equal(document.querySelector('.status-note'), null);
    rejectSave = false;
    await submit();
    assert.equal(document.querySelector('dialog'), null);
    assert.ok(document.querySelector('#block-detail-panel-soil .table-icon-btn.primary'));
    await act(async () => document.querySelector('#block-detail-panel-soil .table-icon-btn.edit').click());
    assert.deepEqual(calls.find(call => call[0] === 'GET'), ['GET', 91]);
    await submit();
    const update = calls.find(call => call[0] === 'PUT');
    assert.equal(update[2].soilPh, 0);
    assert.equal(JSON.parse(update[2].nutrientData).extraResult, 'Retain me');
    const cells = document.querySelectorAll('#block-detail-panel-soil tbody tr:first-child td');
    assert.equal(cells[1].textContent, '0');
    assert.equal(cells[2].textContent, '0');
    await act(async () => document.querySelector('#block-detail-panel-soil .table-icon-btn.danger').click());
    await act(async () => document.querySelector('dialog .confirm-dialog-actions button:last-child').click());
    assert.ok(document.querySelector('#block-detail-panel-soil .table-icon-btn.primary'), 'failed delete must retain the row');
    rejectDelete = false;
    await act(async () => document.querySelector('#block-detail-panel-soil .table-icon-btn.danger').click());
    await act(async () => document.querySelector('dialog .confirm-dialog-actions button:last-child').click());
    assert.equal(document.querySelector('#block-detail-panel-soil .table-icon-btn'), null);
    rejectHistory = true;
    await act(async () => document.querySelector('#block-detail-panel-soil .zone-clean-reload-btn').click());
    assert.match(document.querySelector('#block-detail-panel-soil [role="alert"]').textContent, /History unavailable/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.__soilApiTest;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
