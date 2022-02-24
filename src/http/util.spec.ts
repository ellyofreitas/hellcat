import assert from 'assert';
import { parseHeaders } from './util';

test('must parse headers', () => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
    'x-api-key': 'ApiKey',
  };
  const parsedHeaders = parseHeaders(headers);
  assert.deepStrictEqual(
    parsedHeaders,
    new Map([
      ['accept', 'application/json'],
      ['content-type', 'application/json; charset=utf-8'],
      ['x-api-key', 'ApiKey'],
    ])
  );
});
