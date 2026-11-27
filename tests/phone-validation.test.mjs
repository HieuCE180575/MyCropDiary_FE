import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

async function loadTypescript(path) {
  const source = stripTypeScriptTypes(await readFile(path, 'utf8'), { mode: 'transform' });
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

const { validateVietnamPhone } = await loadTypescript('src/shared/validation/phoneValidation.ts');

test('Blank or whitespace-only phone number is treated as optional and valid', () => {
  assert.equal(validateVietnamPhone('', 'vi'), null);
  assert.equal(validateVietnamPhone('   ', 'en'), null);
});

test('Valid 10-digit Vietnam phone numbers starting with 0 pass in both vi and en', () => {
  assert.equal(validateVietnamPhone('0901234567', 'vi'), null);
  assert.equal(validateVietnamPhone(' 0389998888 ', 'en'), null);
  assert.equal(validateVietnamPhone('0292123456', 'vi'), null);
});

test('Rejects letters, spaces, hyphens, or international +84 prefix with localized non-digit message', () => {
  for (const invalid of ['09012345ab', '090-123-4567', '+84901234567', '090 1234567']) {
    const enMsg = validateVietnamPhone(invalid, 'en');
    const viMsg = validateVietnamPhone(invalid, 'vi');
    assert.ok(enMsg && enMsg.includes('digits only'), `EN failed for ${invalid}: ${enMsg}`);
    assert.ok(viMsg && viMsg.includes('chữ số'), `VI failed for ${invalid}: ${viMsg}`);
  }
});

test('Rejects digits-only phone numbers not starting with 0', () => {
  assert.match(validateVietnamPhone('1234567890', 'en') ?? '', /start with 0/);
  assert.match(validateVietnamPhone('8490123456', 'vi') ?? '', /bắt đầu bằng số 0/);
});

test('Rejects 9-digit and 11-digit boundary phone numbers starting with 0', () => {
  assert.match(validateVietnamPhone('090123456', 'en') ?? '', /exactly 10 digits/);
  assert.match(validateVietnamPhone('09012345678', 'en') ?? '', /exactly 10 digits/);
  assert.match(validateVietnamPhone('090123456', 'vi') ?? '', /đúng 10 chữ số/);
  assert.match(validateVietnamPhone('09012345678', 'vi') ?? '', /đúng 10 chữ số/);
});
