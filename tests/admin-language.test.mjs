import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('admin labels, options and validation support both languages without redundant terminology', async () => {
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, ws: false } });
  try {
    const { adminConfigs, displayValue, translateAdminError } = await server.ssrLoadModule('/src/features/admin/adminConfig.ts');
    const { translateMessage } = await server.ssrLoadModule('/src/shared/i18n/translate.ts');
    for (const config of Object.values(adminConfigs)) {
      const labels = [config.title, config.description, config.singular, config.createLabel, ...Object.values(config.statuses)];
      for (const field of [...config.columns, ...config.fields, ...(config.details ?? [])]) {
        labels.push(field.label, ...Object.values(field.options ?? {}));
      }
      for (const label of labels.filter(Boolean)) {
        assert.doesNotMatch(label, /\((?:Block|Zone|Của ai)\)/);
        assert.doesNotMatch(translateMessage(label, 'en'), /[À-ỹ]/u, `Missing English translation: ${label}`);
        assert.equal(translateMessage(label, 'vi'), label, `Vietnamese label changed: ${label}`);
      }
      for (const field of config.fields) {
        const error = `Vui lòng nhập ${field.label.toLocaleLowerCase('vi-VN')}.`;
        assert.doesNotMatch(translateAdminError(error, 'en'), /[À-ỹ]/u);
        assert.equal(translateAdminError(error, 'vi'), error);
      }
    }
    assert.equal(displayValue('scaleSummary', '2 phân khu · 3 lô đất', 'en'), '2 zones · 3 blocks');
    assert.equal(displayValue('assignedStaff', 'Chưa phân công nhân sự', 'en'), 'No staff assigned');
    assert.equal(displayValue('name', 'Block 1A', 'vi'), 'Block 1A');
    assert.equal(displayValue('description', 'Nội dung người dùng nhập', 'en'), 'Nội dung người dùng nhập');
  } finally {
    await server.close();
  }
});
