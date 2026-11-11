import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createCoachHandler } from '../server/coach.mjs';

const origin = 'http://127.0.0.1:4173';
const env = { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' };
const sessions = [{ sport: 'running', duration: 27.5, effort: 4, daysAgo: 2 }];
const input = { primarySport: 'running', secondarySports: ['cycling'], sessions };
const analysis = {
  routine: 'یک جلسه دویدن ثبت شده است.',
  primaryPattern: 'دویدن ورزش اصلی است.',
  secondaryPattern: 'داده‌ای از دوچرخه‌سواری ثبت نشده است.',
  uncertainty: 'برای بررسی روند به جلسه‌های بیشتری نیاز است.',
};
const coach = {
  summary: analysis.routine,
  primaryFocus: 'در دویدن به یکنواختی ریتم توجه کن.',
  secondaryFocus: 'در دوچرخه‌سواری روی رکاب زدن روان تمرکز کن.',
};

function modelResponse(value, type = 'output_text') {
  return Response.json({
    status: 'completed',
    output: [
      { type: 'reasoning' },
      { type: 'message', content: [{ type, text: JSON.stringify(value) }] },
    ],
  });
}

async function request(handler, { path = '/api/coach', method = 'POST', headers, body = input } = {}) {
  const chunks = Array.isArray(body) ? body : [Buffer.from(JSON.stringify(body))];
  const req = Readable.from(chunks);
  req.method = method;
  req.headers = { host: '127.0.0.1:4173', origin, 'content-type': 'application/json', ...headers };
  const res = new EventEmitter();
  res.writeHead = (code, responseHeaders) => {
    res.status = code;
    res.headers = responseHeaders;
  };
  res.end = value => { res.data = JSON.parse(value); };
  const handled = await handler(req, res, new URL(path, origin));
  return { handled, status: res.status, headers: res.headers, data: res.data };
}

test('status requires an API key and model without exposing either', async () => {
  const path = '/api/coach/status';
  const disabled = createCoachHandler({ env: { OPENAI_API_KEY: 'test-key' } });
  const enabled = createCoachHandler({ env });
  assert.deepEqual((await request(disabled, { path, method: 'GET' })).data, { enabled: false });
  assert.deepEqual((await request(enabled, { path, method: 'GET' })).data, { enabled: true });
  assert.equal((await request(disabled)).status, 503);
  assert.equal((await request(enabled, { path: '/another-path' })).handled, false);
});

test('sends only allowed session fields to the analyst and only analysis to the coach', async () => {
  const calls = [];
  const handler = createCoachHandler({ env, fetchImpl: async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return modelResponse(calls.length === 1 ? analysis : coach);
  } });
  const body = {
    ...input,
    name: 'private name',
    sessions: [{ ...sessions[0], id: 'private id', source: 'manual', notes: 'private notes', distance: 4.5 }],
  };
  const response = await request(handler, { body });
  assert.equal(response.status, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.deepEqual(response.data, coach);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.url, 'https://api.openai.com/v1/responses');
    assert.equal(call.options.headers.Authorization, 'Bearer test-key');
    assert.equal(call.body.model, 'test-model');
    assert.equal(call.body.store, false);
    assert.equal(call.body.text.format.strict, true);
    assert.equal(call.body.text.format.schema.additionalProperties, false);
  }
  assert.deepEqual(JSON.parse(calls[0].body.input), input);
  assert.deepEqual(JSON.parse(calls[1].body.input), { primarySport: 'running', secondarySports: ['cycling'], analysis });
});

test('blocks cross-origin, malformed and oversized requests before any model calls', async () => {
  const handler = createCoachHandler({ env, fetchImpl: () => assert.fail('unexpected API request') });
  assert.equal((await request(handler, { headers: { origin: 'https://example.com' } })).status, 403);
  assert.equal((await request(handler, { headers: { host: 'example.com', origin: 'http://example.com' } })).status, 403);
  assert.equal((await request(handler, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await request(handler, { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await request(handler, { body: [Buffer.from('{')] })).status, 400);
  assert.equal((await request(handler, { body: [Buffer.alloc(8000), Buffer.alloc(4000)] })).status, 413);
  assert.equal((await request(handler, { body: { ...input, sessions: [{ ...sessions[0], source: 'strava' }] } })).status, 400);
  assert.equal((await request(handler, { body: { ...input, sessions: [{ ...sessions[0], daysAgo: 30 }] } })).status, 400);
});

test('model refusal stops the pipeline and releases the in-flight slot for a retry', async () => {
  let count = 0;
  const handler = createCoachHandler({ env, fetchImpl: async () => {
    count += 1;
    if (count === 1) return modelResponse({}, 'refusal');
    return modelResponse(count === 2 ? analysis : coach);
  } });
  assert.equal((await request(handler)).status, 502);
  assert.equal(count, 1);
  assert.deepEqual((await request(handler)).data, coach);
  assert.equal(count, 3);
});
