import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { createElement, act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

test('season save errors stay beside save controls outside the scrolling form body', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
  let saves = 0;
  globalThis.__seasonErrorTest = {
    empty: async () => [],
    detail: async () => ({cropSeasonId: 3, seasonName: 'Fixture season', cropCategoryId: 1, cropCategoryName: 'Tomato', startDate: '2026-01-01', endDate: '2026-12-31', seasonStatus: 'completed', notes: 'Keep this note'}),
    save: async () => { saves++; throw Error('This completed season cannot be edited'); },
  };
  const names = ['fetchCropCategories', 'fetchCropSeasonsByFarm', 'fetchCropSeasonDetail', 'createCropSeason', 'updateCropSeason', 'updateCropSeasonStatus', 'deleteCropSeason', 'fetchBlocksInSeason', 'assignBlockToSeason', 'updateSeasonBlock', 'removeBlockFromSeason'];
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', plugins: [{
    name: 'season-error-test', enforce: 'pre',
    resolveId(source, importer) {
      if (!importer?.includes('CropSeasonsPage')) return;
      if (source.endsWith('/cropSeasonService')) return '\0season-error-api';
      if (source.endsWith('/zoneBlockService')) return '\0season-error-blocks';
      if (source.endsWith('/FarmWorkspace')) return '\0season-error-farm';
      if (source.endsWith('/realtimeSync')) return '\0season-error-realtime';
    },
    load(id) {
      if (id === '\0season-error-api') return names.map(name => `export const ${name} = (...args) => globalThis.__seasonErrorTest.${name === 'fetchCropSeasonDetail' ? 'detail' : name === 'updateCropSeason' ? 'save' : 'empty'}(...args);`).join('\n');
      if (id === '\0season-error-blocks') return 'export const fetchBlocks = async () => [];';
      if (id === '\0season-error-farm') return 'export const useFarmWorkspace = () => ({selectedFarm: {id: 1, farmName: "Fixture farm", role: "OWNER"}});';
      if (id === '\0season-error-realtime') return 'export const useRealtimeSync = () => {};';
    },
  }] });
  let root;
  try {
    const {CropSeasonsPage} = await server.ssrLoadModule('/src/features/operations/CropSeasonsPage.tsx');
    const {LanguageProvider} = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const {createRoot} = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, {initialEntries: ['/crop-seasons/3']}, createElement(LanguageProvider, null, createElement(Routes, null, createElement(Route, {path: '/crop-seasons/:cropSeasonId', element: createElement(CropSeasonsPage)}))))));
    const open = [...document.querySelectorAll('button')].find(button => /Select blocks|Ch\u1ecdn l\u00f4 tr\u1ed3ng/.test(button.textContent));
    assert.ok(open);
    await act(async () => open.click());
    const dialog = document.querySelector('dialog');
    assert.ok(dialog.classList.contains('modal-form-layout'));
    const form = dialog.querySelector('form');
    const body = form.querySelector(':scope > .modal-body');
    const footer = form.querySelector(':scope > .modal-footer');
    assert.ok(body && footer);
    body.scrollTop = 1000;
    await act(async () => form.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true})));
    assert.equal(saves, 1);
    assert.match(footer.querySelector('[role="alert"]').textContent, /completed season cannot be edited/);
    assert.equal(body.querySelector('[role="alert"]'), null);
    assert.ok(footer.querySelector('button[type="submit"]'));
    assert.equal(document.querySelector('#modal-cs-notes').value, 'Keep this note');
    assert.ok(document.querySelector('dialog'));
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.__seasonErrorTest;
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
