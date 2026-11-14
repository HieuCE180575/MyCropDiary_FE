import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createServer } from 'vite';

test('fileUploadService: uploadFileToCloudinary successfully uploads file via FormData to backend', async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  });

  const oldAdapter = axios.defaults.adapter;
  const recordedCalls = [];

  axios.defaults.adapter = async (config) => {
    recordedCalls.push(config);
    if (config.url === '/files/upload' && config.method === 'post') {
      return {
        config,
        status: 200,
        headers: {},
        data: JSON.stringify({
          success: true,
          message: 'Tải lên tập tin thành công.',
          data: {
            url: 'https://res.cloudinary.com/drajm922/image/upload/v123456/mycropdiary/evidence/vietgap.pdf',
            publicId: 'mycropdiary/evidence/vietgap',
            originalFilename: 'vietgap.pdf',
            resourceType: 'image',
            format: 'pdf',
            bytes: 2048,
            uploadedAt: '2026-11-13T23:00:00Z',
          },
        }),
      };
    }
    return { config, status: 404, headers: {}, data: JSON.stringify({ success: false }) };
  };

  try {
    const { uploadFileToCloudinary } = await server.ssrLoadModule('/src/shared/api/fileUploadService.ts');

    const fakeBlob = new Blob(['Test file data'], { type: 'application/pdf' });
    const fakeFile = new File([fakeBlob], 'vietgap.pdf', { type: 'application/pdf' });

    const result = await uploadFileToCloudinary(fakeFile, 'mycropdiary/evidence');

    assert.equal(recordedCalls.length, 1);
    assert.equal(recordedCalls[0].url, '/files/upload');
    assert.equal(recordedCalls[0].method, 'post');
    assert.equal(result.url, 'https://res.cloudinary.com/drajm922/image/upload/v123456/mycropdiary/evidence/vietgap.pdf');
    assert.equal(result.publicId, 'mycropdiary/evidence/vietgap');
    assert.equal(result.format, 'pdf');
  } finally {
    axios.defaults.adapter = oldAdapter;
    await server.close();
  }
});

test('fileUploadService: deleteUploadedFile successfully calls delete API', async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  });

  const oldAdapter = axios.defaults.adapter;
  const recordedCalls = [];

  axios.defaults.adapter = async (config) => {
    recordedCalls.push(config);
    if (config.method === 'delete') {
      return {
        config,
        status: 200,
        headers: {},
        data: JSON.stringify({
          success: true,
          message: 'Xóa tập tin thành công.',
          data: true,
        }),
      };
    }
    return { config, status: 404, headers: {}, data: JSON.stringify({ success: false }) };
  };

  try {
    const { deleteUploadedFile } = await server.ssrLoadModule('/src/shared/api/fileUploadService.ts');
    const deleted = await deleteUploadedFile('mycropdiary/evidence/sample123');
    assert.equal(deleted, true);
    assert.equal(recordedCalls.length, 1);
    assert.equal(recordedCalls[0].method, 'delete');
    assert.ok(recordedCalls[0].url.includes('mycropdiary%2Fevidence%2Fsample123'));
  } finally {
    axios.defaults.adapter = oldAdapter;
    await server.close();
  }
});

test('fileUploadService: parseEvidenceFiles parses JSON, comma-separated and single URL', async () => {
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  });

  try {
    const { parseEvidenceFiles, getWebPreviewUrl } = await server.ssrLoadModule('/src/shared/api/fileUploadService.ts');

    // 1. Empty or null
    assert.deepEqual(parseEvidenceFiles(''), []);
    assert.deepEqual(parseEvidenceFiles(null), []);

    // 2. JSON array
    const jsonStr = JSON.stringify([
      { name: 'GiayPhep.pdf', url: 'https://res.cloudinary.com/drajm922/image/upload/v1/test.pdf', size: 102400 },
      { name: 'HinhAnh.png', url: 'https://res.cloudinary.com/drajm922/image/upload/v1/photo.png', size: 204800 },
    ]);
    const parsedJson = parseEvidenceFiles(jsonStr);
    assert.equal(parsedJson.length, 2);
    assert.equal(parsedJson[0].name, 'GiayPhep.pdf');
    assert.equal(parsedJson[1].name, 'HinhAnh.png');

    // 3. Single URL
    const single = parseEvidenceFiles('https://res.cloudinary.com/drajm922/image/upload/v1/farm_cert.pdf');
    assert.equal(single.length, 1);
    assert.equal(single[0].name, 'farm_cert.pdf');
    assert.equal(single[0].url, 'https://res.cloudinary.com/drajm922/image/upload/v1/farm_cert.pdf');

    // 4. getWebPreviewUrl converts Cloudinary PDF to jpg preview to bypass 401 ACL deny
    const pdfPreview = getWebPreviewUrl('https://res.cloudinary.com/drajm922/image/upload/v1794589254/mycropdiary/evidence/file_gpnzfc.pdf');
    assert.equal(pdfPreview.isConvertedPdf, true);
    assert.equal(pdfPreview.isImage, true);
    assert.equal(pdfPreview.previewUrl, 'https://res.cloudinary.com/drajm922/image/upload/v1794589254/mycropdiary/evidence/file_gpnzfc.jpg');

    // 5. Normal image stays unchanged
    const imgPreview = getWebPreviewUrl('https://res.cloudinary.com/drajm922/image/upload/v1/photo.png');
    assert.equal(imgPreview.isConvertedPdf, false);
    assert.equal(imgPreview.isImage, true);
    assert.equal(imgPreview.previewUrl, 'https://res.cloudinary.com/drajm922/image/upload/v1/photo.png');
  } finally {
    await server.close();
  }
});
