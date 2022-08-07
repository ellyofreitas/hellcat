import assert from 'assert';
import { HttpRequest } from './http-request';
import { makeEvent } from '../spec/utils/make-event';

describe('http-request', () => {
  it('must create a request', async () => {
    const event = makeEvent();
    const request = new HttpRequest(event);
    assert(request);
  });

  it('must create a request with json body', async () => {
    const event = makeEvent({
      body: JSON.stringify({ ok: true }),
      headers: { 'content-type': 'application/json' },
    });
    const request = new HttpRequest(event);
    assert(request.isJSON);
    assert.deepStrictEqual(request.body, { ok: true });
  });
});
