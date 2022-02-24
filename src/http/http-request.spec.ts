import assert from 'assert';
import zlib from 'zlib';
import { HttpRequest } from './http-request';
import { makeEvent } from '../spec/utils/make-event';
import { HttpResponse } from './http-response';

describe('http-request', () => {
  test('must create a request', async () => {
    const event = makeEvent();
    const request = new HttpRequest(event);
    assert(request);
  });

  test('must create a request with binary body', async () => {
    const event = makeEvent({
      body: zlib.gzipSync('test').toString('base64'),
      headers: { 'content-type': 'text/plain', 'content-encoding': 'gzip' },
      isBase64Encoded: true,
    });
    const request = new HttpRequest(event);
    assert.deepStrictEqual(request.body.toString('utf-8'), 'test');
  });

  test('must create a request with no body', async () => {
    const event = makeEvent({
      body: null,
      headers: {},
    });
    const request = new HttpRequest(event);
    assert.deepStrictEqual(request.payload, null);
  });

  test('must create a request with json body', async () => {
    const event = makeEvent({
      body: JSON.stringify({ ok: true }),
      headers: { 'content-type': 'application/json' },
    });
    const request = new HttpRequest(event);
    assert(request.isJSON);
    assert.deepStrictEqual(request.payload, { ok: true });
  });

  test('must create a request with json body gziped', async () => {
    const event = makeEvent({
      body: zlib.gzipSync(JSON.stringify({ ok: true })).toString('base64'),
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
      },
      isBase64Encoded: true,
    });
    const request = new HttpRequest(event);
    assert.deepStrictEqual(request.payload, { ok: true });
  });

  test('must not create a request with json body  badly formatted', async () => {
    const event = makeEvent({
      body: JSON.stringify({ ok: true }).concat('invalid'),
      headers: { 'content-type': 'application/json' },
    });
    assert.throws(
      () => new HttpRequest(event),
      HttpResponse.badRequest('json badly formatted')
    );
  });

  test('must get a header', async () => {
    const event = makeEvent({
      headers: { 'Any-Header': 'any-value' },
    });
    const request = new HttpRequest(event);
    assert.strictEqual(request.getHeader('any-header'), 'any-value');
  });

  test('must set path parameters', async () => {
    const event = makeEvent();
    const request = new HttpRequest(event);
    request.setPathParams({
      id: '1',
    });

    assert.strictEqual(request.params.id, '1');
  });
});
