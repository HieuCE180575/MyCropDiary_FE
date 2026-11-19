import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';

test('detail requests display API errors and ignore dismissed, superseded and out-of-scope responses', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { useDetailRequest } = await server.ssrLoadModule('/src/shared/hooks/useDetailRequest.tsx');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { createRoot } = await import('react-dom/client');
    root = createRoot(document.getElementById('root'));
    let loader;
    const shown = [];
    function Harness({ scope }) { loader = useDetailRequest(scope); return loader.feedback; }
    const render = scope => act(async () => root.render(createElement(LanguageProvider, null, createElement(Harness, { scope }))));
    const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
    await render(1);
    const first = deferred();
    let firstRequest;
    await act(async () => { firstRequest = loader.load(() => first.promise, value => shown.push(value)); });
    assert.ok(document.querySelector('[role="status"]'));
    await act(async () => { document.querySelector('.modal-close').click(); });
    await act(async () => { first.resolve('dismissed'); await firstRequest; });
    assert.deepEqual(shown, []);
    await act(async () => { await loader.load(() => Promise.reject(new Error('API unavailable')), value => shown.push(value)); });
    assert.equal(document.querySelector('[role="alert"]').textContent, 'API unavailable');
    assert.deepEqual(shown, []);
    const old = deferred(); let oldRequest;
    await act(async () => { oldRequest = loader.load(() => old.promise, value => shown.push(value)); });
    await act(async () => { await loader.load(() => Promise.resolve('fresh API record'), value => shown.push(value)); });
    await act(async () => { old.resolve('stale'); await oldRequest; });
    assert.deepEqual(shown, ['fresh API record']);
    const scoped = deferred(); let scopedRequest;
    await act(async () => { scopedRequest = loader.load(() => scoped.promise, value => shown.push(value)); });
    await render(2);
    await act(async () => { scoped.resolve('previous farm'); await scopedRequest; });
    assert.deepEqual(shown, ['fresh API record']);
    assert.equal(document.querySelector('dialog'), null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); dom.window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
