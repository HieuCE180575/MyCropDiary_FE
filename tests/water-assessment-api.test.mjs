import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { createElement, act } from 'react';

test('water assessments preserve server data and never report a rejected save as successful', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const calls = [];
  const record = { assessmentId: 91, waterSourceId: 7, blockName: 'Block B1', zoneName: 'Zone B', conductedByName: 'Water inspector', waterSourceName: 'Well A', waterSourceType: 'Groundwater', waterPh: 0, temperatureC: 0, qualityStatus: 'CAN_XU_LY', notes: 'Needs treatment', assessedAt: '2026-11-19T03:00:00Z', imageUrl: 'https://example.com/evidence.jpg', labTestReportUrl: 'https://example.com/report.pdf' };
  let rejectSave = true;
  globalThis.__waterApiTest = {
    detail: async id => { calls.push(['GET', id]); return record; },
    update: async (id, payload) => { calls.push(['PUT', id, payload]); if (rejectSave) throw new Error('Server rejected the save'); return { ...record, ...payload }; },
    create: async (id, payload) => { calls.push(['POST', id, payload]); return { ...record, ...payload, assessmentId: 92 }; },
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', plugins: [{
    name: 'water-api-test', enforce: 'pre',
    resolveId(source, importer) { if (source.endsWith('/zoneBlockService') && importer?.includes('BlockWaterAssessments')) return '\0water-api-test'; },
    load(id) { if (id === '\0water-api-test') return `export const fetchWaterAssessmentDetailsApi = (...args) => globalThis.__waterApiTest.detail(...args); export const updateWaterAssessmentApi = (...args) => globalThis.__waterApiTest.update(...args); export const createWaterAssessmentApi = (...args) => globalThis.__waterApiTest.create(...args);`; },
  }] });
  let root;
  try {
    const { waterAssessmentForm, waterAssessmentPayload } = await server.ssrLoadModule('/src/features/production/waterAssessmentForm.ts');
    const payload = waterAssessmentPayload(waterAssessmentForm(record), record);
    assert.equal(payload.waterPh, 0);
    assert.equal(payload.temperatureC, 0);
    assert.equal(payload.waterSourceId, 7);
    assert.equal(payload.imageUrl, record.imageUrl);
    assert.equal(payload.labTestReportUrl, record.labTestReportUrl);
    assert.equal(waterAssessmentForm().waterSourceName, '');
    assert.equal(waterAssessmentPayload(waterAssessmentForm()).waterPh, undefined);
    const { BlockWaterAssessments } = await server.ssrLoadModule('/src/features/production/components/BlockWaterAssessments.tsx');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    const saved = [];
    let reloads = 0;
    await act(async () => root.render(createElement(LanguageProvider, null, createElement(BlockWaterAssessments, { blockId: 3, blockName: 'Block B1', zoneName: 'Zone B', records: [record], loading: false, error: null, onReload: () => reloads++, onSaved: item => saved.push(item) }))));
    await act(async () => document.querySelector('.table-icon-btn.primary').click());
    assert.deepEqual(calls[0], ['GET', 91]);
    assert.ok(document.querySelector(`a[href="${record.labTestReportUrl}"]`));
    assert.ok(document.querySelector(`a[href="${record.imageUrl}"]`));
    for (const value of [record.blockName, record.zoneName, record.conductedByName, record.waterSourceName, record.notes]) {
      assert.ok(document.querySelector('dialog').textContent.includes(value), value);
    }
    assert.match(document.querySelector('dialog').textContent, /Nước ngầm|Groundwater/);
    assert.equal([...document.querySelectorAll('dialog .structured-field-card')].filter(card => card.lastElementChild.textContent === '0').length, 2);
    await act(async () => document.querySelector('dialog .ui-close-action').click());
    await act(async () => document.querySelector('.table-icon-btn.edit').click());
    assert.equal(document.querySelector('#water-waterPh').value, '0');
    const submit = () => act(async () => document.querySelector('dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    await submit();
    assert.equal(saved.length, 0);
    assert.equal(reloads, 0);
    assert.match(document.querySelector('dialog').textContent, /Server rejected/);
    rejectSave = false;
    await submit();
    assert.equal(saved[0].assessmentId, 91);
    assert.equal(reloads, 1);
    assert.equal(document.querySelector('dialog'), null);
    assert.equal(calls.filter(call => call[0] === 'PUT')[0][2].waterSourceId, 7);
    // Creation must call POST and use the identifier returned by the server.
    await act(async () => document.querySelector('.panel-title .ui-button').click());
    await submit();
    assert.equal(saved[1].assessmentId, 92);
    assert.equal(calls.at(-1)[0], 'POST');
    assert.equal(calls.at(-1)[1], 3);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.__waterApiTest;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
