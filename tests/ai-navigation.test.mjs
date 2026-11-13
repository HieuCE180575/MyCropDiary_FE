import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

test('AI sidebar and tabs share routes, preserve inputs and support history and direct entry', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage,
    IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const adapter = axios.defaults.adapter;
  const calls = [];
  axios.defaults.adapter = async config => {
    calls.push(config);
    let data = [];
    if (config.url.startsWith('/farms?')) data = { items: [{ id: 1, farmName: 'Test farm', currentUserRole: 'OWNER', status: 'ACTIVE' }], last: true, totalPages: 1 };
    if (config.url === '/ai/conversations') data = [{ conversationId: 7, title: 'Saved conversation',
      status: 'active', createdAt: '2026-11-01', updatedAt: '2026-11-01', messageCount: 2, lastMessageSnippet: 'Saved answer' }];
    if (config.url === '/ai/conversations/7') data = { conversationId: 7, messages: [
      { messageId: 1, conversationId: 7, senderType: 'assistant', messageText: 'Saved answer', createdAt: '2026-11-01' },
      { messageId: 2, conversationId: 7, senderType: 'user', messageText: 'Saved question', createdAt: '2026-11-01' },
    ] };
    return { config, headers: {}, status: 200, statusText: 'OK', data: JSON.stringify({ success: true, data }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  let navigate;
  let pathname;
  try {
    const { createRoot } = await import('react-dom/client');
    const { App } = await server.ssrLoadModule('/src/app/App.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    localStorage.setItem('mcd_lang', 'en');
    storage.saveAccessToken('test-session', { userId: 1, email: 'test@example.com', fullName: 'Test', systemRole: 'USER' }, 'refresh');
    function Location() { navigate = useNavigate(); pathname = useLocation().pathname; return null; }
    const mount = async path => {
      root = createRoot(document.getElementById('root'));
      await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [path] },
        createElement(AuthProvider, null, createElement(App), createElement(Location)))));
      const workspace = document.querySelector('.workspace-switcher select');
      if (workspace && workspace.value !== '1') await act(async () => {
        workspace.value = '1';
        workspace.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      });
    };
    const paths = ['/ai', '/ai-history', '/ai-feedback'];
    const tabLabels = ['AI Assistant Chat', 'Chat History', 'User Feedback & Reports', 'AI Farming Drafts'];
    const tab = index => [...document.querySelectorAll('main button')].find(button => button.textContent.includes(tabLabels[index]));
    const assertTab = path => {
      assert.equal(pathname, path);
      const index = [...paths, '/ai-drafts'].indexOf(path);
      for (let i = 0; i < 4; i++) assert.equal(tab(i).getAttribute('aria-selected'), String(i === index));
      for (const linkPath of paths) assert.equal(document.querySelector(`.sidebar a[href="${linkPath}"]`).getAttribute('aria-current'), linkPath === path ? 'page' : null);
      const main = document.querySelector('main');
      if (path === '/ai') assert.match(main.textContent, /Saved answer/);
      if (path === '/ai-history') assert.ok(main.querySelector('input[placeholder="Search conversations..."]'));
      if (path === '/ai-feedback') assert.match(main.textContent, /Your feedback and report history/);
      if (path === '/ai-drafts') assert.match(main.textContent, /df-|Pending|Approve/i);
    };
    const clickSidebar = async path => {
      await act(async () => document.querySelector(`.sidebar a[href="${path}"]`).click());
      assertTab(path);
    };
    await mount('/profile');
    for (const path of paths) {
      await act(async () => navigate('/profile'));
      await clickSidebar(path);
    }
    const loadedConversations = calls.filter(call => call.url === '/ai/conversations/7').length;
    // All six transitions between distinct AI sidebar entries, plus repeated clicks.
    for (const from of paths) {
      await clickSidebar(from);
      await clickSidebar(from);
      for (const to of paths.filter(path => path !== from)) {
        await clickSidebar(to);
        await clickSidebar(from);
      }
    }
    await clickSidebar('/ai');
    const question = document.querySelector('main textarea, main input:not([type="file"])');
    assert.ok(question);
    await act(async () => {
      const prototype = question.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(question, 'Unsaved question');
      question.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    const beforeThemeChange = calls.length;
    for (const theme of ['dark', 'light']) {
      await act(async () => document.querySelector('.theme-toggle-switch').click());
      assert.equal(document.documentElement.dataset.theme, theme);
      const userBubble = document.querySelector('.ai-message-bubble--user');
      assert.equal(userBubble.style.background, 'var(--color-primary)');
      assert.equal(userBubble.style.color, 'var(--color-on-primary)');
      assert.equal(document.querySelector('.ai-chat-input input').value, 'Unsaved question');
      assert.match(document.querySelector('.ai-message-feed').textContent, /Saved answer/);
    }
    assert.equal(calls.length, beforeThemeChange, 'Changing theme preserves messages and inputs without API requests');
    for (const index of [1, 2, 3, 0]) {
      await act(async () => tab(index).click());
      assertTab([...paths, '/ai-drafts'][index]);
    }
    assert.equal(document.querySelector('main textarea, main input:not([type="file"])').value, 'Unsaved question');
    // Clicking the selected tab must not add a duplicate history entry.
    await act(async () => tab(0).click());
    for (const path of ['/ai-drafts', '/ai-feedback', '/ai-history', '/ai']) {
      await act(async () => navigate(-1));
      assertTab(path);
    }
    for (const path of ['/ai-history', '/ai-feedback', '/ai-drafts', '/ai']) {
      await act(async () => navigate(1));
      assertTab(path);
    }
    assert.equal(document.querySelector('main textarea, main input:not([type="file"])').value, 'Unsaved question');
    assert.equal(calls.filter(call => call.url === '/ai/conversations/7').length, loadedConversations, 'AI route changes keep the mounted conversation');
    assert.equal(calls.filter(call => ['post', 'put', 'patch', 'delete'].includes(call.method)).length, 0);
    await act(async () => root.unmount()); root = undefined;
    // Fresh mounts at existing URLs model direct loads and refresh route selection.
    for (const path of [...paths, '/ai-drafts']) {
      await mount(path);
      assertTab(path);
      await act(async () => root.unmount()); root = undefined;
    }
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    axios.defaults.adapter = adapter;
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
