import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement, act } from 'react';
import { usePageSelection } from '../src/shared/hooks/usePageSelection.ts';

test('page checkboxes select all, track partial selection and reset across scopes', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const originals = new Map();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  function Table({ ids, scope }) {
    const selection = usePageSelection(ids, scope);
    return createElement('div', null,
      createElement('input', { type: 'checkbox', 'aria-label': 'all', ...selection.allProps }),
      ...ids.map(id => createElement('input', { key: id, type: 'checkbox', 'aria-label': String(id), ...selection.rowProps(id) })));
  }
  const render = (ids, scope) => act(async () => root.render(createElement(Table, { ids, scope })));
  const boxes = () => [...document.querySelectorAll('input')];
  const click = index => act(async () => boxes()[index].click());
  try {
    await render([1, 2], 'page1');
    await click(0);
    assert.ok(boxes().every(input => input.checked));
    await click(1);
    assert.equal(boxes()[0].checked, false);
    assert.equal(boxes()[0].indeterminate, true);
    await click(1);
    assert.equal(boxes()[0].checked, true);
    assert.equal(boxes()[0].indeterminate, false);
    await click(0);
    assert.ok(boxes().every(input => !input.checked));
    await click(0);
    await render([3], 'page2');
    assert.ok(boxes().every(input => !input.checked));
    await render([1, 2], 'page1');
    assert.ok(boxes().every(input => !input.checked));
    await click(0);
    await render([1, 2], 'different-filter');
    assert.ok(boxes().every(input => !input.checked));
    await render([], 'empty');
    assert.equal(boxes()[0].disabled, true);
    assert.equal(boxes()[0].checked, false);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
