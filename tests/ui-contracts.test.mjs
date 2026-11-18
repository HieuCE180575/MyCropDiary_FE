import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);

test('all tables use the shared contract and table actions have one CSS owner', () => {
  let count = 0;
  for (const file of files('src').filter(file => file.endsWith('.tsx'))) {
    for (const table of readFileSync(file, 'utf8').matchAll(/<table\b[^>]*>/g)) {
      count++;
      assert.match(table[0], /\bui-data-table\b/, file);
      assert.doesNotMatch(table[0], /minWidth: 0/, file);
    }
  }
  assert.equal(count, 37);
  const owners = files('src/styles').filter(file => file.endsWith('.css'))
    .filter(file => /(?:^|\n)\.table-icon-btn\s*\{/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(owners, [join('src/styles', 'shared-ui.css')]);
  const global = readFileSync('src/styles/global.css', 'utf8');
  assert.doesNotMatch(global, /\.table-action-btns\s*\{[^}]*!important/);
  assert.doesNotMatch(global, /\.filter-chip\.active\s*\{/);
});

test('semantic foreground/background pairs remain readable in both themes', () => {
  const source = readFileSync('src/styles/tokens.css', 'utf8');
  const [lightSource, darkSource] = source.split("[data-theme='dark']");
  const colors = text => Object.fromEntries([...text.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6})/gi)].map(match => [match[1], match[2]]));
  const light = colors(lightSource), dark = { ...light, ...colors(darkSource) };
  const luminance = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
  const pairs = [['text', 'surface'], ['body', 'surface'], ['muted', 'page'], ['muted', 'subtle'],
    ...['success', 'warning', 'danger', 'info', 'accent', 'rose', 'teal'].map(role => [role, `${role}-bg`]),
    ...['primary', 'danger-solid', 'info-solid', 'warning-solid', 'accent-solid'].map(role => ['on-primary', role])];
  for (const [theme, values] of Object.entries({ light, dark })) for (const [foreground, background] of pairs) {
    const a = luminance(values[foreground]), b = luminance(values[background]);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    assert.ok(ratio >= 4.5, `${theme}: ${foreground}/${background}: ${ratio.toFixed(2)}:1`);
  }
});
