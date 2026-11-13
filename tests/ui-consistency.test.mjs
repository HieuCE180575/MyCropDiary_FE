import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act, useState } from 'react';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';

test('shared UI preserves pagination boundaries, locale formatting and modal keyboard behavior', async () => {
  const dom = new JSDOM('<button id="launcher">Open</button><div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  dom.window.localStorage.setItem('mcd_lang', 'vi');
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { formatCurrency, formatDate, formatDateTime, formatNumber } = await server.ssrLoadModule('/src/shared/format/formatters.ts');
    assert.match(formatCurrency(1234567, 'vi'), /1\.234\.567/);
    assert.match(formatCurrency(1234567, 'en'), /1,234,567/);
    assert.equal(formatNumber(125.5, 'vi'), '125,5');
    assert.equal(formatDate(null), '—');
    assert.equal(formatDate('bad-date'), '—');
    assert.equal(formatDateTime('bad-date'), '—');
    assert.equal(formatCurrency(Infinity), '—');
    assert.equal(formatDate('2026-11-12', 'vi'), '12/11/2026');

    const { createRoot } = await import('react-dom/client');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { usePagination } = await server.ssrLoadModule('/src/shared/hooks/usePagination.ts');
    const { TablePagination } = await server.ssrLoadModule('/src/shared/components/TablePagination.tsx');
    const { Modal } = await server.ssrLoadModule('/src/shared/components/Modal.tsx');
    function List({ count, filter }) {
      const pagination = usePagination(Array.from({ length: count }, (_, index) => index + 1), filter);
      return createElement('div', null, createElement('output', null, pagination.items.join(',')), createElement(TablePagination, pagination));
    }
    root = createRoot(document.getElementById('root'));
    const renderList = (count, filter = 'all') => act(async () => root.render(createElement(LanguageProvider, null, createElement(List, { count, filter }))));
    await renderList(21);
    await act(async () => document.querySelector('[aria-label="Trang 3"]').click());
    assert.equal(document.querySelector('output').textContent, '21');
    await renderList(11);
    assert.equal(document.querySelector('output').textContent, '11');
    await renderList(11, 'new-filter');
    assert.equal(document.querySelector('[aria-current="page"]').textContent, '1');
    await renderList(0);
    assert.match(document.body.textContent, /0 kết quả/);
    assert.doesNotMatch(document.body.textContent, /1–0/);
    assert.equal(document.querySelector('[aria-label="Trang sau"]').disabled, true);

    for (const variant of ['default', 'admin', 'custom']) {
      function Dialog() {
        const [open, setOpen] = useState(true);
        return createElement(Modal, { open, title: variant === 'custom' ? undefined : 'Keyboard test', variant: variant === 'custom' ? 'default' : variant, customLayout: variant === 'custom', onClose: () => setOpen(false) },
          variant === 'custom' && createElement('div', null,
            createElement('h3', null, 'Custom heading'), createElement('button', { onClick: () => setOpen(false) }, 'Close')),
          createElement('button', { id: 'last' }, 'Last control'));
      }
      await act(async () => root.render(null));
      document.getElementById('launcher').focus();
      await act(async () => root.render(createElement(Dialog)));
      const dialog = document.querySelector('dialog');
      assert.equal(dialog.open, true);
      assert.ok(document.getElementById(dialog.getAttribute('aria-labelledby')));
      assert.equal(document.body.style.overflow, 'hidden');
      const close = dialog.querySelector('button');
      assert.equal(document.activeElement, close);
      close.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
      assert.equal(document.activeElement.id, 'last');
      await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true })));
      assert.equal(document.querySelector('dialog'), null);
      assert.equal(document.activeElement.id, 'launcher');
      assert.equal(document.body.style.overflow, '');
    }
    const { TabList, tabPanelProps } = await server.ssrLoadModule('/src/shared/components/TabList.tsx');
    const changes = [];
    function Tabs() {
      const [value, setValue] = useState('first');
      return createElement('div', null,
        createElement(TabList, { idPrefix: 'test', label: 'Sections', value,
          items: [{ value: 'first', label: 'First' }, { value: 'disabled', label: 'Disabled', disabled: true }, { value: 'last', label: 'Last' }],
          onChange: next => { changes.push(next); setValue(next); } }),
        createElement('div', tabPanelProps('test', value), value));
    }
    await act(async () => root.render(createElement(Tabs)));
    const key = async (element, name) => act(async () => element.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })));
    const first = document.getElementById('test-tab-first');
    const last = document.getElementById('test-tab-last');
    first.focus();
    await key(first, 'ArrowRight');
    assert.equal(document.activeElement, last);
    assert.equal(first.getAttribute('aria-selected'), 'true');
    assert.deepEqual(changes, []);
    await act(async () => last.click()); // Browser Enter/Space activation emits click.
    assert.equal(last.getAttribute('aria-selected'), 'true');
    assert.equal(document.getElementById(last.getAttribute('aria-controls')).getAttribute('aria-labelledby'), last.id);
    await key(last, 'ArrowRight');
    assert.equal(document.activeElement, first);
    await key(first, 'End');
    assert.equal(document.activeElement, last);
    await key(last, 'Home');
    assert.equal(document.activeElement, first);

    const { KnowledgeFilterBar } = await server.ssrLoadModule('/src/features/knowledge/components/KnowledgeFilterBar.tsx');
    function KnowledgeFilters() {
      const [category, setCategory] = useState('all');
      return createElement(LanguageProvider, null, createElement(KnowledgeFilterBar, {
        category, onCategoryChange: setCategory, sort: 'newest', onSortChange: () => {},
      }));
    }
    await act(async () => root.render(createElement(KnowledgeFilters)));
    const chips = [...document.querySelectorAll('.filter-chip')];
    for (const chip of chips) {
      await act(async () => chip.click());
      assert.equal(document.querySelectorAll('.filter-chip[aria-pressed="true"]').length, 1);
      assert.ok(chip.classList.contains('active'));
      assert.equal(chip.getAttribute('aria-pressed'), 'true');
    }

    const { CropCategoryCombobox } = await server.ssrLoadModule('/src/features/operations/CropCategoryCombobox.tsx');
    const selections = [];
    let submissions = 0;
    function CropDialog({ disabled = false }) {
      const [open, setOpen] = useState(true);
      return createElement(LanguageProvider, null, createElement(Modal, { open, title: 'Crop', onClose: () => setOpen(false) },
        createElement('form', { onSubmit: event => { event.preventDefault(); submissions++; } },
          createElement(CropCategoryCombobox, { id: 'crop-test', value: 0, required: true, disabled,
            categories: [{ id: 1, categoryName: 'Melon' }, { id: 2, categoryName: 'Tomato' }],
            onChange: (id, name) => selections.push([id, name]) }))));
    }
    await act(async () => root.render(createElement(CropDialog)));
    const input = document.querySelector('[role="combobox"]');
    await act(async () => input.focus());
    await key(input, 'ArrowDown');
    assert.equal(input.getAttribute('aria-activedescendant'), 'crop-test-option-1');
    await key(input, 'ArrowDown');
    await key(input, 'Enter');
    assert.deepEqual(selections.at(-1), [2, 'Tomato']);
    assert.equal(submissions, 0);
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, 'Custom crop');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    assert.deepEqual(selections.at(-1), [0, 'Custom crop']);
    await key(input, 'Escape');
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    assert.ok(document.querySelector('dialog'));
    await key(input, 'ArrowUp');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    await act(async () => document.querySelector('dialog button').focus());
    assert.equal(input.getAttribute('aria-expanded'), 'false');
    await act(async () => input.focus());
    await key(input, 'Escape');
    await key(input, 'Escape');
    assert.equal(document.querySelector('dialog'), null);
    await act(async () => root.render(null));
    await act(async () => root.render(createElement(CropDialog, { disabled: true })));
    assert.ok(document.querySelector('[role="combobox"]').disabled);
    assert.equal(document.querySelector('[aria-expanded="true"]'), null);
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test('profile and registration translate visible content while preserving entered data', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  dom.window.localStorage.setItem('mcd_lang', 'vi');
  const oldAdapter = axios.defaults.adapter;
  let writes = 0;
  axios.defaults.adapter = async config => {
    if (config.method !== 'get') writes++;
    return { config, headers: {}, status: 200, data: JSON.stringify({ success: true,
      data: { userId: 1, fullName: 'Nguyễn Văn An', email: 'an@example.test', phone: '0912345678' } }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { LanguageSwitch } = await server.ssrLoadModule('/src/shared/components/LanguageSwitch.tsx');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const storage = await server.ssrLoadModule('/src/features/auth/authStorage.ts');
    const { UserProfilePanel } = await server.ssrLoadModule('/src/features/auth/UserProfilePanel.tsx');
    storage.saveAccessToken('fixture', { userId: 1, fullName: 'Nguyễn Văn An', email: 'an@example.test', systemRole: 'USER' });
    root = createRoot(document.getElementById('root'));
    const wrap = child => createElement(LanguageProvider, null, createElement(MemoryRouter, null,
      createElement(AuthProvider, null, child, createElement(LanguageSwitch))));
    await act(async () => root.render(wrap(createElement(UserProfilePanel))));
    assert.equal(document.querySelector('.profile-details h2').textContent, 'Thông tin tài khoản');
    await act(async () => document.querySelector('[aria-label="Chỉnh sửa hồ sơ"]').click());
    assert.match(document.querySelector('.profile-details').textContent, /Tải ảnh lên/);
    const name = document.querySelector('.profile-details input[required]');
    assert.equal(name.value, 'Nguyễn Văn An');
    await act(async () => document.querySelector('[aria-label="Chuyển sang Tiếng Anh"]').click());
    assert.equal(document.querySelector('.profile-details h2').textContent, 'Account Information');
    assert.equal(name.value, 'Nguyễn Văn An');
    assert.match(document.querySelector('.profile-details').textContent, /Upload Photo/);
    await act(async () => root.render(null));
    storage.clearAccessToken();
    dom.window.localStorage.setItem('mcd_lang', 'vi');
    const { RegisterPage } = await server.ssrLoadModule('/src/pages/RegisterPage.tsx');
    await act(async () => root.render(wrap(createElement(RegisterPage))));
    assert.equal(document.querySelector('.auth-card-header h2').textContent, 'Tạo tài khoản mới');
    assert.equal(document.querySelector('.step-label').textContent, 'Thông tin');
    assert.match(document.querySelector('.feature-body p').textContent, /Tạo tài khoản miễn phí/);
    await act(async () => document.querySelector('.auth-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.match(document.querySelector('#fullName-error').textContent, /Vui lòng nhập họ và tên/);
    assert.equal(writes, 0, 'Validation and language switching never submit account changes');
  } finally {
    if (root) await act(async () => root.unmount());
    axios.defaults.adapter = oldAdapter;
    await server.close(); dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
