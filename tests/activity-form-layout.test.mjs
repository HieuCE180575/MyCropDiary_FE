import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';
import {createElement, act} from 'react';
import {MemoryRouter} from 'react-router-dom';

test('activity editor uses fixed context and keeps rejected saves in its fixed footer', async () => {
  const dom = new JSDOM('<div id="root"></div>', {url: 'http://localhost'});
  const globals = {window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true};
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
  const activity = {id: 77, cropSeasonId: 43, blockId: 3, activityType: 'Soil Preparation', activityName: 'Fixture activity', startedAt: '2026-11-18T15:45:00', description: 'Keep this description'};
  const calls = [];
  globalThis.__activityFormTest = {
    seasons: async () => [{cropSeasonId: 43, seasonName: 'Fixture season', seasonStatus: 'active'}],
    blocks: async () => [{blockId: 3, zoneId: 2, blockName: 'Fixture block'}],
    workers: async () => [
      {workerId: 201, farmMemberId: null, workerCode: 'CN-EXT-01', fullName: 'External Worker 1', employmentStatus: 'seasonal'},
      {workerId: 202, farmMemberId: null, workerCode: 'CN-EXT-02', fullName: 'External Worker 2', employmentStatus: 'active'},
    ],
    request: async (url, options) => {
      if (options?.method === 'PUT') { calls.push([url, options]); throw Error('Server rejected activity update'); }
      return {success: true, data: {items: [activity]}};
    },
  };
  const server = await createServer({configFile: false, optimizeDeps: {noDiscovery: true, include: []}, server: {middlewareMode: true, watch: null, ws: false}, appType: 'custom', plugins: [{
    name: 'activity-form-test', enforce: 'pre',
    resolveId(source, importer) {
      if (!importer?.includes('FarmingActivitiesPage')) return;
      for (const [suffix, id] of [['cropSeasonService', 'api'], ['httpClient', 'http'], ['FarmWorkspace', 'farm'], ['realtimeSync', 'realtime'], ['staffService', 'staff']]) if(source.endsWith('/'+suffix)) return '\0activity-form-'+id;
    },
    load(id) {
      if (id === '\0activity-form-api') return 'export const fetchCropSeasonsByFarm = (...args) => globalThis.__activityFormTest.seasons(...args); export const fetchBlocksInSeason = (...args) => globalThis.__activityFormTest.blocks(...args);';
      if (id === '\0activity-form-http') return 'export const apiRequest = (...args) => globalThis.__activityFormTest.request(...args);';
      if (id === '\0activity-form-farm') return 'export const useFarmWorkspace = () => ({selectedFarm: {id: 1}});';
      if (id === '\0activity-form-realtime') return 'export const useRealtimeSync = () => {};';
      if (id === '\0activity-form-staff') return 'export const getFarmWorkersApi = (...args) => globalThis.__activityFormTest.workers(...args);';
    },
  }]});
  let root;
  try {
    const {FarmingActivitiesPage} = await server.ssrLoadModule('/src/features/operations/FarmingActivitiesPage.tsx');
    const {LanguageProvider} = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const {createRoot} = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(LanguageProvider, null, createElement(FarmingActivitiesPage)))));
    const edit = [...document.querySelectorAll('button')].find(button => /^(Edit|Ch\u1ec9nh s\u1eeda)$/.test(button.textContent.trim()));
    assert.ok(edit);
    await act(async () => edit.click());
    const dialog = document.querySelector('dialog');
    assert.ok(dialog.classList.contains('modal-form-layout'));
    assert.match(dialog.querySelector('#act-season-select').textContent, /Fixture season/);
    const workerCheckboxes = [...dialog.querySelectorAll('input[type="checkbox"]')];
    assert.equal(workerCheckboxes.length, 2);
    for (const cb of workerCheckboxes) {
      await act(async () => cb.click());
    }
    const form = dialog.querySelector('form');
    const footer = form.querySelector(':scope > .modal-body + .modal-footer');
    assert.ok(footer?.querySelector('button[type="submit"]'));
    form.querySelector('.modal-body').scrollTop = 1000;
    await act(async () => form.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true})));
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], '/farming-activities/77');
    assert.equal(calls[0][1].data.description, 'Keep this description');
    assert.deepEqual(calls[0][1].data.workers, [{workerId: 201}, {workerId: 202}]);
    assert.match(footer.querySelector('[role="alert"]').textContent, /Server rejected activity update/);
    assert.equal(form.querySelector('.modal-body [role="alert"]'), null);
    assert.ok(document.querySelector('dialog'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.__activityFormTest;
    for(const [key, descriptor] of originals) {if(descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];}
  }
});
