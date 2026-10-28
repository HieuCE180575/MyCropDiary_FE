import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import axios, { AxiosHeaders } from 'axios';

// Execute the actual TypeScript modules with browser globals and a controlled transport.
async function client(transport) {
  const stored = new Map();
  const events = new EventTarget();
  const context = createContext({ FormData, TextEncoder, URLSearchParams, btoa, atob, Event,
    window: events, localStorage: { removeItem: (key) => stored.delete(key), setItem: (key, value) => stored.set(key, value) } });
  const modules = new Map();
  // Keep Axios serialization, headers and cancellation; replace only network I/O.
  const axiosModule = new SyntheticModule(['default', 'AxiosHeaders'], function () {
    this.setExport('default', {
      create: (defaults) => axios.create({
        ...defaults,
        adapter: async (config) => ({
          ...await transport({ ...config, url: axios.getUri(config) }),
          config,
          headers: new AxiosHeaders(),
          statusText: '',
        }),
      }),
      isCancel: axios.isCancel,
      CanceledError: axios.CanceledError,
    });
    this.setExport('AxiosHeaders', AxiosHeaders);
  }, { context });
  async function load(file) {
    if (modules.has(file)) return modules.get(file);
    const source = await readFile(file, 'utf8');
    const js = stripTypeScriptTypes(source, { mode: 'transform' });
    const mod = new SourceTextModule(js, { context, identifier: file,
      initializeImportMeta(meta) { meta.env = {}; },
      importModuleDynamically: (name, parent) => load(resolve(dirname(parent.identifier), `${name}.ts`)),
    });
    modules.set(file, mod);
    return mod;
  }
  const link = (name, parent) => name === 'axios'
    ? axiosModule
    : load(resolve(dirname(parent.identifier), `${name}.ts`));
  const auth = await load(resolve('src/features/auth/authApi.ts'));
  await auth.link(link);
  await auth.evaluate();
  const farms = await load(resolve('src/features/farm-management/api.ts'));
  await farms.link(link);
  await farms.evaluate();
  const registrations = await load(resolve('src/features/farm-management/registrationService.ts'));
  await registrations.link(link);
  await registrations.evaluate();
  const production = await load(resolve('src/features/production/zoneBlockService.ts'));
  await production.link(link);
  await production.evaluate();
  return {
    production: production.namespace,
    registrations: registrations.namespace,
    auth: auth.namespace,
    http: modules.get(resolve('src/shared/api/httpClient.ts')).namespace,
    storage: modules.get(resolve('src/features/auth/authStorage.ts')).namespace,
    farms: farms.namespace,
    stored,
  };
}

const reply = (body, status = 200) => ({ status, data: JSON.stringify(body) });
const ok = (data) => reply({ success: true, message: 'OK', data, timestamp: new Date().toISOString() });

test('production reads preserve empty results and propagate API failures instead of demo data', async () => {
  const lists = ['fetchZonesByFarm', 'fetchAssignedZones', 'fetchBlocks', 'fetchBlockConditions', 'fetchZoneAssignments'];
  const empty = await client(async () => ok([]));
  for (const name of lists) assert.equal((await empty.production[name](1)).length, 0);
  for (const status of [403, 500, 200, 0]) {
    const failed = await client(async () => {
      if (status === 0) throw new Error('offline');
      return reply({ success: false, message: 'Không thể tải dữ liệu thật.' }, status);
    });
    for (const name of [...lists, 'fetchZoneById']) {
      await assert.rejects(failed.production[name](1), status === 0 ? /Không kết nối được/ : /Không thể tải dữ liệu thật/);
    }
  }
});

const refreshedAuth = {
  accessToken: 'renewed.jwt.token', refreshToken: 'rotated-refresh-token', tokenType: 'Bearer',
  userId: 12, email: 'farmer@example.com', fullName: 'Farmer', systemRole: 'USER',
};
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

test('expired JWT refreshes before sending the protected request and stores rotated tokens in memory', async () => {
  const calls = [];
  const app = await client(async config => {
    calls.push(config);
    return config.url.endsWith('/auth/refresh-token') ? ok(refreshedAuth) : ok({ items: [] });
  });
  app.storage.saveAccessToken(`header.${btoa(JSON.stringify({ exp: 1 }))}.signature`,
    { ...refreshedAuth, avatarUrl: 'profile.png' }, 'original-refresh-token');
  await app.farms.getFarms();
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.endsWith('/auth/refresh-token'));
  assert.equal(calls[0].method, 'post');
  assert.equal(calls[0].headers.has('Authorization'), false);
  assert.deepEqual(JSON.parse(calls[0].data), { refreshToken: 'original-refresh-token' });
  assert.equal(calls[1].headers.get('Authorization'), 'Bearer renewed.jwt.token');
  assert.equal(app.storage.getRefreshToken(), 'rotated-refresh-token');
  assert.equal(app.storage.getAuthUser().avatarUrl, 'profile.png');
  assert.equal(app.stored.size, 0);
});

test('concurrent 401s share one refresh and replay the original method, body and headers', async () => {
  const started = deferred();
  const release = deferred();
  let refreshes = 0;
  const retries = [];
  const app = await client(async config => {
    if (config.url.endsWith('/auth/refresh-token')) {
      refreshes++;
      started.resolve();
      await release.promise;
      return ok(refreshedAuth);
    }
    if (config.headers.get('Authorization') === 'Bearer old.jwt') return reply({}, 401);
    retries.push(config);
    return ok({ saved: true });
  });
  app.storage.saveAccessToken('old.jwt', null, 'refresh-token');
  const requests = [1, 2, 3].map(id => app.http.apiRequest(`/records/${id}`, {
    method: 'PUT', data: { id }, headers: { 'X-Request-ID': String(id) },
  }));
  await started.promise;
  release.resolve();
  await Promise.all(requests);
  assert.equal(refreshes, 1);
  assert.equal(retries.length, 3);
  retries.forEach(config => {
    const id = Number(config.url.split('/').at(-1));
    assert.equal(config.method, 'put');
    assert.equal(config.headers.get('X-Request-ID'), String(id));
    assert.deepEqual(JSON.parse(config.data), { id });
  });
});

test('refresh rejection clears both tokens and a retried 401 cannot loop', async () => {
  for (const refreshStatus of [400, 401, 403, 200]) {
    let calls = 0;
    const app = await client(async config => {
      calls++;
      return config.url.endsWith('/auth/refresh-token')
        ? refreshStatus === 200 ? ok(refreshedAuth) : reply({ message: 'Refresh hết hạn' }, refreshStatus)
        : reply({}, 401);
    });
    app.storage.saveAccessToken('old.jwt', null, 'refresh-token');
    await assert.rejects(app.farms.getFarms());
    assert.equal(calls, refreshStatus === 200 ? 3 : 2);
    assert.equal(app.storage.getAccessToken(), null);
    assert.equal(app.storage.getRefreshToken(), null);
  }
});

test('temporary refresh failures keep the session and allow a later attempt', async () => {
  for (const failure of [0, 503]) {
    let retry = false;
    const app = await client(async config => {
      if (!config.url.endsWith('/auth/refresh-token')) {
        return config.headers.get('Authorization') === 'Bearer old.jwt' ? reply({}, 401) : ok({ items: [] });
      }
      if (retry) return ok(refreshedAuth);
      if (failure === 0) throw new Error('offline');
      return reply({}, failure);
    });
    app.storage.saveAccessToken('old.jwt', null, 'refresh-token');
    await assert.rejects(app.farms.getFarms(), error => error.status === failure);
    assert.equal(app.storage.getAccessToken(), 'old.jwt');
    retry = true;
    await app.farms.getFarms();
    assert.equal(app.storage.getAccessToken(), refreshedAuth.accessToken);
  }
});

test('late refresh cannot resurrect logout or overwrite a newer login', async () => {
  for (const newLogin of [false, true]) {
    const started = deferred();
    const release = deferred();
    const app = await client(async config => {
      if (!config.url.endsWith('/auth/refresh-token')) return reply({}, 401);
      started.resolve();
      await release.promise;
      return ok(refreshedAuth);
    });
    app.storage.saveAccessToken('old.jwt', null, 'refresh-token');
    const request = app.farms.getFarms();
    const rejected = assert.rejects(request, error => error.status === 401);
    await started.promise;
    app.storage.clearAccessToken();
    if (newLogin) app.storage.saveAccessToken('other.jwt', null, 'other-refresh');
    release.resolve();
    await rejected;
    assert.equal(app.storage.getAccessToken(), newLogin ? 'other.jwt' : null);
    assert.equal(app.storage.getRefreshToken(), newLogin ? 'other-refresh' : null);
  }
});

test('403 and anonymous 401 do not refresh; cancellation does not replay a waiting request', async () => {
  const calls = [];
  const app = await client(async config => { calls.push(config); return reply({}, config.url.endsWith('/public') ? 401 : 403); });
  app.storage.saveAccessToken('old.jwt', null, 'refresh-token');
  await assert.rejects(app.http.apiRequest('/forbidden'), error => error.status === 403);
  await assert.rejects(app.http.apiRequest('/public', { anonymous: true }), error => error.status === 401);
  assert.equal(calls.length, 2);
  assert.equal(app.storage.getAccessToken(), 'old.jwt');

  const started = deferred();
  const release = deferred();
  let protectedCalls = 0;
  const waiting = await client(async config => {
    if (!config.url.endsWith('/auth/refresh-token')) { protectedCalls++; return reply({}, 401); }
    started.resolve();
    await release.promise;
    return ok(refreshedAuth);
  });
  waiting.storage.saveAccessToken('old.jwt', null, 'refresh-token');
  const controller = new AbortController();
  const request = waiting.http.apiRequest('/protected', { signal: controller.signal });
  const cancelled = assert.rejects(request, axios.isCancel);
  await started.promise;
  controller.abort();
  release.resolve();
  await cancelled;
  assert.equal(protectedCalls, 1);
  assert.equal(waiting.storage.getAccessToken(), refreshedAuth.accessToken);
});

test('password recovery sends backend DTOs anonymously without changing the session', async () => {
  const calls = [];
  const app = await client(async config => { calls.push(config); return ok(null); });
  app.storage.saveAccessToken('existing.jwt.token');
  await app.auth.forgotPassword(' farmer@example.com ');
  await app.auth.resetPassword(' farmer@example.com ', ' 012345 ', ' password123 ');
  assert.equal(calls[0].url, 'http://localhost:8080/api/v1/auth/forgot-password');
  assert.deepEqual(JSON.parse(calls[0].data), { email: 'farmer@example.com' });
  assert.equal(calls[1].url, 'http://localhost:8080/api/v1/auth/reset-password');
  assert.deepEqual(JSON.parse(calls[1].data), {
    email: 'farmer@example.com', otp: '012345', newPassword: ' password123 ',
  });
  for (const call of calls) {
    assert.equal(call.method, 'post');
    assert.equal(call.headers.has('Authorization'), false);
  }
  assert.equal(app.storage.getAccessToken(), 'existing.jwt.token');
});

test('password recovery propagates backend errors without authenticating', async () => {
  const app = await client(async () => reply({ success: false, message: 'Mã OTP đã hết hạn.' }, 400));
  await assert.rejects(app.auth.resetPassword('farmer@example.com', '012345', 'password123'), /Mã OTP đã hết hạn/);
  await assert.rejects(app.auth.forgotPassword('farmer@example.com'), /Mã OTP đã hết hạn/);
  assert.equal(app.storage.getAccessToken(), null);
  const failed = await client(async () => reply({ success: false, message: 'Không gửi được email.' }));
  await assert.rejects(failed.auth.forgotPassword('farmer@example.com'), /Không gửi được email/);
  await assert.rejects(failed.auth.resetPassword('farmer@example.com', '012345', 'password123'), /Không gửi được email/);
});

test('login and OTP preserve account identity and clear it when the session ends', async () => {
  for (const method of ['authenticate', 'verifyOtp']) {
    let unauthorized = false;
    const user = { userId: 12, fullName: 'Nguyễn Thanh Trân', email: 'tran@example.com', systemRole: 'USER' };
    const app = await client(async () => unauthorized ? { status: 401, data: '' } : ok({
      ...user, accessToken: 'account.jwt.token', tokenType: 'Bearer', refreshToken: 'private-refresh-token',
    }));
    const session = await app.auth[method](user.email, '123456');
    assert.deepEqual(JSON.parse(JSON.stringify(session.user)), user);
    assert.equal(session.refreshToken, 'private-refresh-token');
    app.storage.saveAccessToken(session.accessToken, session.user, session.refreshToken);
    assert.equal(app.storage.getRefreshToken(), 'private-refresh-token');
    assert.equal(app.storage.getAuthUser().fullName, user.fullName);
    assert.equal(app.stored.size, 0);
    app.storage.clearAccessToken();
    assert.equal(app.storage.getAuthUser(), null);
    assert.equal(app.storage.getRefreshToken(), null);
    app.storage.saveAccessToken(session.accessToken, session.user);
    unauthorized = true;
    await assert.rejects(app.farms.getFarms(), error => error.status === 401);
    assert.equal(app.storage.getAuthUser(), null);
    app.storage.saveAccessToken('another.jwt.token');
    assert.equal(app.storage.getAuthUser(), null);
  }
});

test('registration sends backend DTO without authenticating the pending account', async () => {
  const app = await client(async (config) => {
    assert.equal(config.url, 'http://localhost:8080/api/v1/auth/register');
    assert.equal(config.method, 'post');
    assert.equal(config.headers.has('Authorization'), false);
    assert.deepEqual(JSON.parse(config.data), { fullName: 'Farmer', email: 'farmer@example.com', phoneNumber: null, password: 'password123' });
    return ok({ email: 'farmer@example.com' });
  });
  await app.auth.registerAccount({ fullName: ' Farmer ', email: 'farmer@example.com ', password: 'password123' });
  assert.equal(app.storage.getAccessToken(), null);
});

test('OTP verification preserves leading zero and returns the access token', async () => {
  const app = await client(async (config) => {
    assert.equal(config.url, 'http://localhost:8080/api/v1/auth/verify-otp');
    assert.equal(config.method, 'post');
    assert.equal(config.headers.has('Authorization'), false);
    assert.deepEqual(JSON.parse(config.data), { email: 'farmer@example.com', otp: '012345' });
    return ok({ accessToken: 'verified.jwt.token', tokenType: 'Bearer' });
  });
  assert.equal((await app.auth.verifyOtp('farmer@example.com', '012345')).accessToken, 'verified.jwt.token');
});

test('resend OTP uses encoded query parameter with POST', async () => {
  const app = await client(async (config) => {
    assert.equal(config.url, 'http://localhost:8080/api/v1/auth/resend-otp?email=farmer%2Btest%40example.com');
    assert.equal(config.method, 'post');
    assert.equal(config.data, undefined);
    return ok({ email: 'farmer+test@example.com' });
  });
  await app.auth.resendOtp('farmer+test@example.com');
});

test('registration and OTP errors propagate without creating a session', async () => {
  const app = await client(async () => reply({ success: false, message: 'Email trùng hoặc OTP không hợp lệ.' }, 400));
  await assert.rejects(app.auth.registerAccount({ fullName: 'Farmer', email: 'farmer@example.com', password: 'password123' }), /Email trùng/);
  await assert.rejects(app.auth.verifyOtp('farmer@example.com', '000000'), /OTP không hợp lệ/);
  assert.equal(app.storage.getAccessToken(), null);
  const malformed = await client(async () => ok(null));
  await assert.rejects(malformed.auth.verifyOtp('farmer@example.com', '000000'), /access token hợp lệ/);
});

test('expired JWT clears session before a protected request', async () => {
  let called = false;
  const app = await client(async () => { called = true; return ok([]); });
  app.storage.saveAccessToken(`header.${btoa(JSON.stringify({ exp: 1 }))}.signature`);
  await assert.rejects(app.farms.getFarms(), (error) => error.status === 401);
  assert.equal(app.storage.getAccessToken(), null);
  assert.equal(called, false);
});

test('login omits stale tokens and preserves backend activation errors', async () => {
  const app = await client(async (config) => {
    assert.equal(config.headers.has('Authorization'), false);
    return reply({ success: false, message: 'Tài khoản chưa được kích hoạt.' }, 403);
  });
  app.storage.saveAccessToken('old.jwt.token');
  await assert.rejects(app.auth.authenticate('farmer@example.com', 'password'), /chưa được kích hoạt/);
});

test('login posts email/password and farms use Bearer JWT with pagination', async () => {
  const calls = [];
  const app = await client(async (config) => { calls.push(config); return ok(config.url.endsWith('/auth/login') ? { accessToken: 'test.jwt.token', tokenType: 'Bearer' } : { items: [{ id: 1, farmCode: 'F1', farmName: 'Farm', status: 'ACTIVE' }], page: 0, size: 12, totalElements: 1, totalPages: 1, last: true }); });
  const session = await app.auth.authenticate('farmer@example.com', 'test-password');
  const credential = session.accessToken;
  assert.equal(credential, 'test.jwt.token');
  assert.equal(app.storage.getAccessToken(), null);
  app.storage.saveAccessToken(credential);
  assert.equal((await app.farms.getFarms()).items[0].farmCode, 'F1');
  assert.equal(calls[0].url, 'http://localhost:8080/api/v1/auth/login');
  assert.equal(calls[1].headers.get('Authorization'), 'Bearer ' + credential);
  assert.equal(calls[0].method, 'post');
  assert.deepEqual(JSON.parse(calls[0].data), { email: 'farmer@example.com', password: 'test-password' });
  assert.equal(calls[0].headers.get('Content-Type'), 'application/json');
  assert.equal(calls[0].headers.has('Authorization'), false);
  assert.equal(calls[1].url, 'http://localhost:8080/api/v1/farms?page=0&size=12');
  assert.equal(app.stored.size, 0);
  app.storage.clearAccessToken();
  assert.equal(app.storage.getAccessToken(), null);
});

test('invalid login is rejected and never creates a session', async () => {
  const app = await client(async () => ({ status: 401, data: '' }));
  await assert.rejects(app.auth.authenticate('farmer@example.com', 'wrong'), (error) => error.status === 401);
  assert.equal(app.storage.getAccessToken(), null);
});

test('expired credentials clear the session, forbidden requests do not', async () => {
  let status = 403;
  const app = await client(async () => ({ status, data: '' }));
  app.storage.saveAccessToken('test.jwt.token');
  await assert.rejects(app.farms.getFarms(), (error) => error.status === 403);
  assert.equal(app.storage.getAccessToken(), 'test.jwt.token');
  status = 401;
  await assert.rejects(app.farms.getFarms(), (error) => error.status === 401);
  assert.equal(app.storage.getAccessToken(), null);
});

test('network errors and malformed responses produce readable errors', async () => {
  const offline = await client(async () => { throw new Error('Network Error'); });
  await assert.rejects(offline.farms.getFarms(), (error) => error.status === 0);
  const malformed = await client(async () => ({ status: 200, data: '<html>Not JSON</html>' }));
  await assert.rejects(malformed.farms.getFarms(), /không hợp lệ/);
  const skeleton = await client(async () => ok(null));
  await assert.rejects(skeleton.auth.authenticate('farmer@example.com', 'password'), /Không xác minh/);
});

test('empty farms are valid and aborted requests remain Axios cancellation errors', async () => {
  const app = await client(async () => ok({ items: [], page: 0, size: 12, totalElements: 0, totalPages: 0, last: true }));
  assert.equal((await app.farms.getFarms()).items.length, 0);
  const controller = new AbortController();
  controller.abort();
  let called = false;
  const cancelled = await client(async () => { called = true; return ok(null); });
  await assert.rejects(cancelled.farms.getFarms(controller.signal), axios.isCancel);
  assert.equal(called, false);
});

test('farm registration uses authenticated backend DTOs and reloads the saved detail', async () => {
  const calls = [];
  const record = { registrationId: 17, farmName: 'Vườn Xanh', addressLine: 'Cần Thơ', description: 'Rau sạch', status: 'PENDING', submittedAt: '2026-10-20T10:00:00', handledAt: null, rejectionReason: 'Rau sạch' };
  const app = await client(async config => {
    calls.push(config);
    if (config.url.includes('?')) return ok({ items: [{ registrationId: 17 }], last: true, totalPages: 1 });
    return ok(config.url.endsWith('/cancel') ? { ...record, status: 'CANCELLED' } : record);
  });
  app.storage.saveAccessToken('user.jwt');
  const created = await app.registrations.submitFarmRegistration({ proposedFarmName: ' Vườn Xanh ', address: ' Cần Thơ ', description: ' Rau sạch ' });
  assert.deepEqual(JSON.parse(calls[0].data), { farmName: 'Vườn Xanh', addressLine: 'Cần Thơ', description: 'Rau sạch', province: null, district: null, ward: null, documentUrl: null });
  assert.equal(created.farmRegistrationId, '17');
  assert.equal(created.status, 'pending');
  assert.equal(created.reviewComment, undefined, 'Backend aliases description as rejectionReason for pending applications');
  assert.equal((await app.registrations.fetchMyLatestRegistration()).description, 'Rau sạch');
  assert.ok(calls[1].url.includes('sort=createdAt,desc'));
  assert.ok(calls[2].url.endsWith('/farm-registrations/17'));
  assert.equal((await app.registrations.cancelFarmRegistration('17')).status, 'cancelled');
  assert.equal(calls[3].method, 'patch');
  for (const call of calls) assert.equal(call.headers.get('Authorization'), 'Bearer user.jwt');
});

test('admin registration API reads every page and submits backend review actions', async () => {
  const calls = [];
  const record = { registrationId: 18, farmName: 'Vườn', status: 'APPROVED' };
  const app = await client(async config => {
    calls.push(config);
    if (config.method === 'put') return ok(record);
    const last = config.url.includes('page=1');
    return ok({ items: [record], last, totalPages: 2 });
  });
  app.storage.saveAccessToken('admin.jwt');
  assert.equal((await app.registrations.getAdminRegistrations()).length, 2);
  assert.ok(calls[0].url.includes('/admin/farm-registrations?page=0'));
  assert.ok(calls[1].url.includes('page=1'));
  assert.throws(() => app.registrations.handleFarmRegistration('18', 'REJECTED', '  '), /lý do từ chối/);
  assert.equal(calls.length, 2);
  await app.registrations.handleFarmRegistration('18', 'APPROVED', '');
  assert.equal(calls[2].method, 'put');
  assert.ok(calls[2].url.endsWith('/18/handle'));
  assert.deepEqual(JSON.parse(calls[2].data), { action: 'APPROVED', rejectionReason: null });
  await app.registrations.handleFarmRegistration('18', 'REJECTED', ' Thiếu thông tin ');
  assert.deepEqual(JSON.parse(calls[3].data), { action: 'REJECTED', rejectionReason: 'Thiếu thông tin' });
});

test('registration APIs distinguish empty results from failures and propagate conflicts', async () => {
  const empty = await client(async () => ok({ items: [], last: true, totalPages: 0 }));
  assert.equal(await empty.registrations.fetchMyLatestRegistration(), null);
  const failed = await client(async () => reply({ success: false, message: 'Hồ sơ đã được xử lý.' }, 409));
  await assert.rejects(failed.registrations.fetchMyLatestRegistration(), /Hồ sơ đã được xử lý/);
  await assert.rejects(failed.registrations.handleFarmRegistration('18', 'APPROVED', ''), /Hồ sơ đã được xử lý/);
  const unsuccessful = await client(async () => reply({ success: false, message: 'Không lưu được hồ sơ.' }));
  await assert.rejects(unsuccessful.registrations.submitFarmRegistration({ proposedFarmName: 'Vườn', address: 'Cần Thơ', description: '' }), /Không lưu được hồ sơ/);
});
