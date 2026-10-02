import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createContext, SourceTextModule } from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

// Execute the actual TypeScript modules with browser globals and a controlled transport.
async function client(fetch) {
  const stored = new Map();
  const events = new EventTarget();
  const context = createContext({ fetch, Headers, FormData, TextEncoder, btoa, atob, Event,
    window: events, localStorage: { removeItem: (key) => stored.delete(key), setItem: (key, value) => stored.set(key, value) } });
  const modules = new Map();
  async function load(file) {
    if (modules.has(file)) return modules.get(file);
    const source = await readFile(file, 'utf8');
    const js = stripTypeScriptTypes(source, { mode: 'transform' });
    const mod = new SourceTextModule(js, { context, identifier: file, initializeImportMeta(meta) { meta.env = {}; } });
    modules.set(file, mod);
    await mod.link((name, parent) => load(resolve(dirname(parent.identifier), `${name}.ts`)));
    return mod;
  }
  const auth = await load(resolve('src/features/auth/authApi.ts'));
  await auth.evaluate();
  const farms = await load(resolve('src/features/farm-management/api.ts'));
  await farms.evaluate();
  return {
    auth: auth.namespace,
    http: modules.get(resolve('src/shared/api/httpClient.ts')).namespace,
    storage: modules.get(resolve('src/features/auth/authStorage.ts')).namespace,
    farms: farms.namespace,
    stored,
  };
}

const ok = (data) => Response.json({ success: true, message: 'OK', data, timestamp: new Date().toISOString() });

test('login and OTP preserve account identity and clear it when the session ends', async () => {
  for (const method of ['authenticate', 'verifyOtp']) {
    let unauthorized = false;
    const user = { userId: 12, fullName: 'Nguyễn Thanh Trân', email: 'tran@example.com', systemRole: 'USER' };
    const app = await client(async () => unauthorized ? new Response(null, { status: 401 }) : ok({
      ...user, accessToken: 'account.jwt.token', tokenType: 'Bearer', refreshToken: 'private-refresh-token',
    }));
    const session = await app.auth[method](user.email, '123456');
    assert.deepEqual(JSON.parse(JSON.stringify(session.user)), user);
    assert.equal('refreshToken' in session, false);
    app.storage.saveAccessToken(session.accessToken, session.user);
    assert.equal(app.storage.getAuthUser().fullName, user.fullName);
    assert.equal(app.stored.size, 0);
    app.storage.clearAccessToken();
    assert.equal(app.storage.getAuthUser(), null);
    app.storage.saveAccessToken(session.accessToken, session.user);
    unauthorized = true;
    await assert.rejects(app.farms.getFarms(), error => error.status === 401);
    assert.equal(app.storage.getAuthUser(), null);
    app.storage.saveAccessToken('another.jwt.token');
    assert.equal(app.storage.getAuthUser(), null);
  }
});

test('registration sends backend DTO without authenticating the pending account', async () => {
  const app = await client(async (url, init) => {
    assert.equal(url, 'http://localhost:8080/api/v1/auth/register');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.has('Authorization'), false);
    assert.deepEqual(JSON.parse(init.body), { fullName: 'Farmer', email: 'farmer@example.com', phoneNumber: null, password: 'password123' });
    return ok({ email: 'farmer@example.com' });
  });
  await app.auth.registerAccount({ fullName: ' Farmer ', email: 'farmer@example.com ', password: 'password123' });
  assert.equal(app.storage.getAccessToken(), null);
});

test('OTP verification preserves leading zero and returns the access token', async () => {
  const app = await client(async (url, init) => {
    assert.equal(url, 'http://localhost:8080/api/v1/auth/verify-otp');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.has('Authorization'), false);
    assert.deepEqual(JSON.parse(init.body), { email: 'farmer@example.com', otp: '012345' });
    return ok({ accessToken: 'verified.jwt.token', tokenType: 'Bearer' });
  });
  assert.equal((await app.auth.verifyOtp('farmer@example.com', '012345')).accessToken, 'verified.jwt.token');
});

test('resend OTP uses encoded query parameter with POST', async () => {
  const app = await client(async (url, init) => {
    assert.equal(url, 'http://localhost:8080/api/v1/auth/resend-otp?email=farmer%2Btest%40example.com');
    assert.equal(init.method, 'POST');
    assert.equal(init.body, undefined);
    return ok({ email: 'farmer+test@example.com' });
  });
  await app.auth.resendOtp('farmer+test@example.com');
});

test('registration and OTP errors propagate without creating a session', async () => {
  const app = await client(async () => Response.json({ success: false, message: 'Email trùng hoặc OTP không hợp lệ.' }, { status: 400 }));
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
  const app = await client(async (url, init) => {
    assert.equal(init.headers.has('Authorization'), false);
    return Response.json({ success: false, message: 'Tài khoản chưa được kích hoạt.' }, { status: 403 });
  });
  app.storage.saveAccessToken('old.jwt.token');
  await assert.rejects(app.auth.authenticate('farmer@example.com', 'password'), /chưa được kích hoạt/);
});

test('login posts email/password and farms use Bearer JWT with pagination', async () => {
  const calls = [];
  const app = await client(async (url, init) => { calls.push({ url, init }); return ok(url.endsWith('/auth/login') ? { accessToken: 'test.jwt.token', tokenType: 'Bearer' } : { items: [{ id: 1, farmCode: 'F1', farmName: 'Farm', status: 'ACTIVE' }], page: 0, size: 12, totalElements: 1, totalPages: 1, last: true }); });
  const session = await app.auth.authenticate('farmer@example.com', 'test-password');
  const credential = session.accessToken;
  assert.equal(credential, 'test.jwt.token');
  assert.equal(app.storage.getAccessToken(), null);
  app.storage.saveAccessToken(credential);
  assert.equal((await app.farms.getFarms()).items[0].farmCode, 'F1');
  assert.equal(calls[0].url, 'http://localhost:8080/api/v1/auth/login');
  assert.equal(calls[1].init.headers.get('Authorization'), 'Bearer ' + credential);
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { email: 'farmer@example.com', password: 'test-password' });
  assert.equal(calls[0].init.headers.get('Content-Type'), 'application/json');
  assert.equal(calls[0].init.headers.has('Authorization'), false);
  assert.equal(calls[1].url, 'http://localhost:8080/api/v1/farms?page=0&size=12');
  assert.equal(app.stored.size, 0);
  app.storage.clearAccessToken();
  assert.equal(app.storage.getAccessToken(), null);
});

test('invalid login is rejected and never creates a session', async () => {
  const app = await client(async () => new Response(null, { status: 401 }));
  await assert.rejects(app.auth.authenticate('farmer@example.com', 'wrong'), (error) => error.status === 401);
  assert.equal(app.storage.getAccessToken(), null);
});

test('expired credentials clear the session, forbidden requests do not', async () => {
  let status = 403;
  const app = await client(async () => new Response(null, { status }));
  app.storage.saveAccessToken('test.jwt.token');
  await assert.rejects(app.farms.getFarms(), (error) => error.status === 403);
  assert.equal(app.storage.getAccessToken(), 'test.jwt.token');
  status = 401;
  await assert.rejects(app.farms.getFarms(), (error) => error.status === 401);
  assert.equal(app.storage.getAccessToken(), null);
});

test('network errors and malformed responses produce readable errors', async () => {
  const offline = await client(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(offline.farms.getFarms(), (error) => error.status === 0);
  const malformed = await client(async () => new Response('<html>Not JSON</html>'));
  await assert.rejects(malformed.farms.getFarms(), /không hợp lệ/);
  const skeleton = await client(async () => ok(null));
  await assert.rejects(skeleton.auth.authenticate('farmer@example.com', 'password'), /Không xác minh/);
});

test('empty farms are valid and aborted requests remain abort errors', async () => {
  const app = await client(async () => ok({ items: [], page: 0, size: 12, totalElements: 0, totalPages: 0, last: true }));
  assert.equal((await app.farms.getFarms()).items.length, 0);
  const controller = new AbortController();
  controller.abort();
  const cancelled = await client(async () => { throw controller.signal.reason; });
  await assert.rejects(cancelled.farms.getFarms(controller.signal), { name: 'AbortError' });
});
