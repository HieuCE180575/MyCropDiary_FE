import assert from 'node:assert/strict';

export function assertAccessibleControls(scope) {
  for (const control of scope.querySelectorAll('input, select, textarea')) {
    if (control.type === 'hidden' || control.style.display === 'none' || control.closest('[hidden], [inert]')) continue;
    const labelledBy = (control.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const name = control.getAttribute('aria-label') || labelledBy.map(id => control.ownerDocument.getElementById(id)?.textContent || '').join(' ')
      || [...(control.labels || [])].map(label => label.textContent).join(' ');
    assert.ok(name.trim(), `Missing accessible name: ${control.outerHTML.slice(0, 220)}`);
  }
  assert.ok(!scope.querySelector('label label'), 'Labels must not nest');
  const ids = [...scope.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(new Set(ids).size, ids.length, 'Rendered IDs must be unique');
  for (const label of scope.querySelectorAll('label[for]')) {
    assert.ok(label.control, `Missing labelled control: ${label.htmlFor}`);
  }
}
