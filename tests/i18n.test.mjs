import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import axios from 'axios';
import { readFileSync } from 'node:fs';

test('translation resources, parameterized feedback and enum labels preserve locale and original data', async () => {
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  try {
    const { translations } = await server.ssrLoadModule('/src/shared/i18n/translations.ts');
    const { translateMessage: t, message } = await server.ssrLoadModule('/src/shared/i18n/translate.ts');
    const { displayValue } = await server.ssrLoadModule('/src/features/admin/adminConfig.ts');
    const { adminConfigs } = await server.ssrLoadModule('/src/features/admin/adminConfig.ts');
    const { moduleDefinitions } = await server.ssrLoadModule('/src/app/routes/moduleDefinitions.ts');
    const { isolationEnd } = await server.ssrLoadModule('/src/features/operations/materialUsagePresentation.ts');
    const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    for (const language of ['vi', 'en']) for (const [key, value] of Object.entries(translations[language])) {
      assert.ok(value.trim(), `Empty ${language} translation: ${key}`);
      if (/^[a-z]+\.[a-z][\w.]*$/i.test(key)) assert.ok(Object.hasOwn(translations[language === 'en' ? 'vi' : 'en'], key), `Missing paired key: ${key}`);
      if (translations.en[key] && translations.vi[key]) assert.deepEqual(placeholders(translations.en[key]), placeholders(translations.vi[key]), key);
    }
    const name = 'Lưu {value2} "Tiếng Việt" & <tag>';
    const notice = message('Added supplier "{value1}" successfully!', { value1: name });
    assert.equal(t(notice, 'en'), `Added supplier "${name}" successfully!`);
    assert.equal(t(notice, 'vi'), `Đã thêm nhà cung cấp "${name}" thành công!`);
    assert.equal(t(notice, 'en'), `Added supplier "${name}" successfully!`);
    assert.match(t(message('Season status changed to: {value1}.', { value1: message('Đã hoàn thành') }), 'en'), /Completed/i);
    for (const [code, label] of [['ACTIVE', 'Đang hoạt động'], ['APPROVED', 'Đã duyệt'], ['OUT_OF_STOCK', 'Hết hàng']]) assert.equal(t(code, 'vi'), label);
    assert.equal(displayValue('role', 'ADMIN', 'en'), 'Administrator');
    assert.equal(displayValue('role', 'ADMIN', 'vi'), 'Quản trị viên');
    assert.equal(displayValue('name', 'Save', 'vi'), 'Save', 'User-controlled names must not be translated');
    assert.equal(displayValue('description', name, 'en'), name);
    assert.equal(t('Unknown backend message containing a farm name', 'vi'), 'Unknown backend message containing a farm name');
    assert.equal(t('Toll-Free 24/7', 'vi'), 'Miễn cước 24/7');
    for (const module of moduleDefinitions) for (const text of [module.title, module.description].filter(Boolean)) {
      assert.notEqual(t(text, 'vi'), text, `Missing module translation: ${text}`);
    }
    for (const config of Object.values(adminConfigs)) for (const field of [...config.columns, ...config.fields, ...(config.details ?? [])]) {
      if (/[À-ỹ]/u.test(field.label)) assert.notEqual(t(field.label, 'en'), field.label, `Missing admin label: ${field.label}`);
    }
    assert.notEqual(t('ai.localFallback', 'en'), t('ai.localFallback', 'vi'));
    assert.equal(isolationEnd('2028-02-28T08:30', 2, 'vi'), '01/03/2028 08:30');
    assert.match(isolationEnd('2028-02-28T08:30', 2, 'en'), /Mar 1, 2028.*8:30 AM/);
    // Native date/time inputs keep ISO payloads; translation must not introduce remounts by language.
    assert.doesNotMatch(readFileSync('src/pages/FarmRegistrationPage.tsx', 'utf8'), /\[user\?\.userId, lang\]/);
  } finally { await server.close(); }
});

test('language changes update authentication screens and existing errors without resetting inputs or repeating requests', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    Event: dom.window.Event, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const oldAdapter = axios.defaults.adapter;
  let requests = 0;
  axios.defaults.adapter = async config => {
    requests++;
    return { config, status: 200, statusText: 'OK', headers: {}, data: JSON.stringify({ success: true, data: null }) };
  };
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom' });
  let root;
  try {
    const { createRoot } = await import('react-dom/client');
    const { LanguageProvider } = await server.ssrLoadModule('/src/shared/i18n/LanguageContext.tsx');
    const { LanguageSwitch } = await server.ssrLoadModule('/src/shared/components/LanguageSwitch.tsx');
    const { translateMessage } = await server.ssrLoadModule('/src/shared/i18n/translate.ts');
    const { AuthProvider } = await server.ssrLoadModule('/src/features/auth/AuthProvider.tsx');
    const { LoginPage } = await server.ssrLoadModule('/src/pages/LoginPage.tsx');
    const { ForgotPasswordPage } = await server.ssrLoadModule('/src/pages/ForgotPasswordPage.tsx');
    assert.equal(translateMessage('Please enter both email and password.', 'vi'), 'Vui lòng nhập email và mật khẩu.');
    assert.equal(translateMessage('Vui lòng nhập email và mật khẩu.', 'en'), 'Enter your email and password.');
    assert.equal(translateMessage('Tài khoản người dùng', 'en'), 'User Accounts');
    assert.equal(translateMessage('unknown.key', 'vi', ''), '');
    assert.equal(translateMessage('Trang trại của Nguyễn Văn An', 'en'), 'Trang trại của Nguyễn Văn An');
    const wrap = Page => createElement(MemoryRouter, null, createElement(LanguageProvider, null,
      createElement(AuthProvider, null, createElement(LanguageSwitch), createElement(Page))));
    const setValue = async (selector, value) => {
      const input = document.querySelector(selector);
      await act(async () => {
        Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
    };
    const switchLanguage = async () => { await act(async () => document.querySelector('.header-translate-btn').click()); };
    const submit = async () => { await act(async () => document.querySelector('.auth-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))); };
    localStorage.setItem('mcd_lang', 'vi');
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(wrap(LoginPage)));
    assert.equal(document.querySelector('.auth-card-header h2').textContent, 'Chào mừng bạn trở lại!');
    await setValue('#login-email', 'owner@example.test');
    await submit();
    assert.equal(document.querySelector('[role="alert"]').textContent, 'Vui lòng nhập email và mật khẩu.');
    await switchLanguage();
    assert.equal(document.querySelector('.auth-card-header h2').textContent, 'Welcome Back!');
    assert.equal(document.querySelector('[role="alert"]').textContent, 'Please enter both email and password.');
    assert.equal(document.querySelector('#login-email').value, 'owner@example.test');
    assert.equal(localStorage.getItem('mcd_lang'), 'en');
    await switchLanguage();
    assert.equal(document.querySelector('[role="alert"]').textContent, 'Vui lòng nhập email và mật khẩu.');
    assert.equal(requests, 0);
    await act(async () => root.render(null));
    await act(async () => root.render(wrap(ForgotPasswordPage)));
    assert.equal(document.querySelector('#forgot-password-title').textContent, 'Quên mật khẩu');
    await setValue('input[type="email"]', 'owner@example.test');
    await submit();
    assert.equal(requests, 1);
    assert.match(document.querySelector('[role="status"]').textContent, /Nếu email thuộc tài khoản đã kích hoạt/);
    await setValue('input[name="otp"]', '001234');
    await switchLanguage();
    assert.equal(document.querySelector('#forgot-password-title').textContent, 'Set New Password');
    assert.match(document.querySelector('[role="status"]').textContent, /If the email belongs to an activated account/);
    assert.match(document.querySelector('.auth-card-header p').textContent, /owner@example.test/);
    assert.equal(document.querySelector('input[name="otp"]').value, '001234');
    await switchLanguage();
    assert.equal(document.querySelector('#forgot-password-title').textContent, 'Đặt mật khẩu mới');
    assert.match(document.querySelector('.auth-card-header p').textContent, /Nhập mã OTP.*owner@example.test/);
    assert.equal(document.querySelector('input[name="otp"]').value, '001234');
    assert.equal(requests, 1, 'Switching languages never resends OTP or submits the form');
    await act(async () => root.render(null));
    await act(async () => root.render(wrap(LoginPage)));
    assert.equal(document.documentElement.lang, 'vi');
    assert.equal(document.querySelector('.auth-card-header h2').textContent, 'Chào mừng bạn trở lại!');
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close(); axios.defaults.adapter = oldAdapter; dom.window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
