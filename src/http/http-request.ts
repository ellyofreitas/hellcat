import { HttpHeaders } from './types';
import { parseHeaders } from './util';

export class HttpRequest {
  path: string;

  method: string;

  params = {};

  body: any;

  headers: HttpHeaders;

  constructor({ path, method, headers, body, params }: any) {
    this.path = path;
    this.method = method.toLowerCase();
    this.headers = parseHeaders(headers);
    this.body = body;
    this.params = params;
  }

  get isJSON() {
    return (
      this.getHeader('content-type')?.includes('application/json') ?? false
    );
  }

  getHeader(name: string) {
    return this.headers.get(name?.toLowerCase());
  }

  setPathParams(params = {}) {
    this.params = { ...(this.params ?? {}), ...params };
    return this;
  }
}
