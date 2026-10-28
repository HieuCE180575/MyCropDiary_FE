import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import axios from 'axios';

test('public knowledge uses server filters, pagination and detail on both knowledge and home pages', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldAdapter = axios.defaults.adapter;
  const calls = [];
  let detailFailure = true;
  let listFailure = false;
  let emptyList = false;
  let holdDetail = false;
  let releaseDetail;
  let detailSignal;
  const article = { id: 41, title: 'Server article', summary: null, content: 'List content must not be used',
    coverImageUrl: 'https://example.com/cover.jpg', category: 'regulation', tags: ['server tag'],
    publishedAt: '2026-10-28T08:00:00', readTimeMinutes: 2, viewCount: 7 };
  axios.defaults.adapter = async config => {
    calls.push(config.url);
    assert.equal(config.headers.has('Authorization'), false);
    let success = true;
    let data;
    if (config.url.startsWith('/knowledge/articles?')) {
      const query = new URL(config.url, 'http://localhost').searchParams;
      success = !listFailure;
      data = { items: emptyList ? [] : [article], page: Number(query.get('page')), size: Number(query.get('size')),
        totalElements: emptyList ? 0 : 20, totalPages: emptyList ? 0 : 4, last: false };
    } else {
      assert.equal(config.url, '/knowledge/articles/41');
      detailSignal = config.signal;
      if (holdDetail) await new Promise(resolve => { releaseDetail = resolve; });
      success = !detailFailure;
      data = { ...article, title: 'Detail from server', content: 'Fresh server content\nSecond paragraph', viewCount: 8 };
    }
    return { config, status: 200, headers: {}, statusText: '', data: JSON.stringify({ success, message: success ? 'OK' : 'Server rejected request', data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text);
  const setValue = async (node, value) => act(async () => {
    const prototype = node.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new dom.window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
  try {
    const { createRoot } = await import('react-dom/client');
    const { MemoryRouter } = await import('react-router-dom');
    const { KnowledgePage } = await server.ssrLoadModule('/src/pages/KnowledgePage.tsx');
    const { HomePage } = await server.ssrLoadModule('/src/pages/HomePage.tsx');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(KnowledgePage))));
    assert.match(calls[0], /page=0&size=6&sort=newest/);
    assert.match(document.querySelector('.knowledge-result-summary').textContent, /trên 20 bài viết/);
    assert.equal(document.querySelector('.knowledge-card-image').getAttribute('src'), article.coverImageUrl);
    await act(async () => document.querySelector('[aria-label="Trang 2"]').click());
    assert.equal(new URL(calls.at(-1), 'http://localhost').searchParams.get('page'), '1');
    await act(async () => button('Đất & nguồn nước').click());
    let query = new URL(calls.at(-1), 'http://localhost').searchParams;
    assert.equal(query.get('category'), 'soil-water');
    assert.equal(query.get('page'), '0');
    await setValue(document.querySelector('select'), 'popular');
    assert.equal(new URL(calls.at(-1), 'http://localhost').searchParams.get('sort'), 'popular');
    await setValue(document.querySelector('input[type="search"]'), '  đất sạch  ');
    await act(async () => new Promise(resolve => setTimeout(resolve, 400)));
    query = new URL(calls.at(-1), 'http://localhost').searchParams;
    assert.equal(query.get('keyword'), 'đất sạch');
    assert.equal(query.has('search'), false);
    await act(async () => button('Đọc thêm ›').click());
    assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent, /Server rejected/);
    assert.doesNotMatch(document.querySelector('[role="dialog"]').textContent, /List content must not be used/);
    detailFailure = false;
    await act(async () => button('Thử lại').click());
    assert.match(document.querySelector('[role="dialog"]').textContent, /Detail from server/);
    assert.match(document.querySelector('[role="dialog"]').textContent, /Fresh server content/);
    assert.match(document.querySelector('[role="dialog"]').textContent, /server tag/);
    await act(async () => document.querySelector('.modal-close').click());
    holdDetail = true;
    await act(async () => button('Đọc thêm ›').click());
    await act(async () => document.querySelector('.modal-close').click());
    assert.equal(detailSignal.aborted, true);
    await act(async () => releaseDetail());
    assert.equal(document.querySelector('[role="dialog"]'), null);
    holdDetail = false;
    listFailure = true;
    await act(async () => button('Tất cả').click());
    assert.match(document.querySelector('[role="alert"]').textContent, /Server rejected/);
    assert.equal(document.querySelectorAll('.knowledge-card').length, 0);
    listFailure = false;
    emptyList = true;
    await act(async () => button('Thử lại').click());
    assert.match(document.body.textContent, /Không tìm thấy kiến thức phù hợp/);
    emptyList = false;
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(HomePage))));
    query = new URL(calls.at(-1), 'http://localhost').searchParams;
    assert.equal(query.get('size'), '4');
    assert.equal(query.get('sort'), 'popular');
    assert.match(document.querySelector('.knowledge-spotlight-card').textContent, /Server article/);
    await act(async () => button('Đọc tóm tắt nhanh').click());
    assert.match(document.querySelector('[role="dialog"]').textContent, /Fresh server content/);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    axios.defaults.adapter = oldAdapter;
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
