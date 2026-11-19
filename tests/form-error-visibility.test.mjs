import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {JSDOM} from 'jsdom';

const flush = () => new Promise(resolve => setTimeout(resolve, 20));
test('shared error handling reveals asynchronous and repeated errors in the active form scope', async () => {
  const server = await createServer({configFile: false, optimizeDeps: {noDiscovery: true, include: []}, server: {middlewareMode: true, watch: null, ws: false}, appType: 'custom'});
  const dom = new JSDOM('<form id="page"><input value="Keep me"><button>Save</button></form><p id="background" role="alert">Background load error</p><dialog role="dialog"><p role="alert">Closed dialog error</p></dialog>');
  const doc = dom.window.document;
  const scrolls = [];
  dom.window.HTMLElement.prototype.scrollIntoView = function(options) { scrolls.push([this, options]); };
  let cleanup;
  try {
    const {installFormErrorVisibility} = await server.ssrLoadModule('/src/shared/components/FormErrorVisibility.tsx');
    cleanup = installFormErrorVisibility(doc);
    const background = doc.getElementById('background');
    background.remove();
    const form = doc.querySelector('form');
    form.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    await flush();
    const error = doc.createElement('p');
    error.className = 'form-error-banner';
    error.textContent = 'Server rejected this save';
    form.prepend(error);
    await flush();
    assert.equal(doc.activeElement, error);
    assert.equal(scrolls.at(-1)[0], error);
    assert.equal(form.querySelector('input').value, 'Keep me');
    form.querySelector('input').focus();
    form.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    await flush();
    assert.equal(doc.activeElement, error, 'an unchanged error is revealed again after another submit');
    assert.equal(scrolls.length, 2);

    doc.body.append(background);
    const modal = doc.createElement('dialog');
    modal.setAttribute('open', '');
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = '<form><input value="Modal value"><button>Save</button><p role="alert" hidden>Hidden error</p><div class="ui-delete-error-toast" role="alert">Delete toast</div></form>';
    doc.body.append(modal);
    const modalForm = modal.querySelector('form');
    modalForm.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    await flush();
    assert.equal(scrolls.length, 2, 'background, hidden and delete-toast errors do not receive focus');
    const modalError = doc.createElement('p');
    modalError.setAttribute('role', 'alert');
    modalError.textContent = 'Modal validation failed';
    modalForm.prepend(modalError);
    await flush();
    assert.equal(doc.activeElement, modalError);
    assert.equal(scrolls.length, 3);

    modalError.remove();
    modalForm.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    const input = modalForm.querySelector('input');
    input.focus();
    input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
    modalForm.prepend(modalError);
    await flush();
    assert.equal(doc.activeElement, input, 'an async response does not steal focus after the user resumes typing');
    assert.equal(scrolls.length, 3);
    cleanup();
    cleanup = null;
    modalForm.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    await flush();
    assert.equal(scrolls.length, 3, 'listeners are removed on cleanup');
  } finally {
    cleanup?.();
    await server.close();
    dom.window.close();
  }
});
